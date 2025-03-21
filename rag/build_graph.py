import json
import re
import os
from pathlib import Path
from main import Neo4jConnector
import time
import argparse
from openai import OpenAI
from typing import List, Dict, Any, Optional, Tuple, Set

# Set your OpenAI API key
OpenAI.api_key = os.getenv("OPENAI_API_KEY")

def sanitize_relation(relation):
    """Convert relation string to valid Neo4j relationship type"""
    # Replace spaces and special chars with underscores
    relation = re.sub(r'[^a-zA-Z0-9]', '_', relation)
    # Ensure it starts with a letter
    if not relation[0].isalpha():
        relation = 'REL_' + relation
    return relation.upper()

def build_knowledge_graph():
    """Build knowledge graph from entities and relationships JSON files"""
    with Neo4jConnector() as connector:
        # Optional: Clear existing data
        print("Clearing existing data...")
        connector.executeQuery("MATCH (n) DETACH DELETE n")
        
        # Create constraints for unique entities
        print("Creating constraints...")
        try:
            connector.executeQuery("CREATE CONSTRAINT entity_name IF NOT EXISTS FOR (e:Entity) REQUIRE e.name IS UNIQUE")
        except Exception as e:
            print(f"Constraint creation failed (may already exist): {e}")
            
        # Load entities from JSON
        entities_path = Path('./output/entities.json')
        with open(entities_path, 'r', encoding='utf-8') as f:
            entities = json.load(f)
        
        # Create entity nodes
        print(f"Creating {len(entities)} entity nodes...")
        for i, entity in enumerate(entities):
            if i % 20 == 0:
                print(f"Processing entity {i}/{len(entities)}")
            
            query = """
            MERGE (e:Entity {name: $name})
            ON CREATE SET 
                e.type = $type,
                e.description = $description,
                e.chunk_id = $chunk_id
            """
            connector.executeQuery(query, {
                "name": entity["name"],
                "type": entity["type"],
                "description": entity["description"],
                "chunk_id": entity.get("chunk_id", "")
            })
        
        # Create type-based indices for faster querying
        print("Creating type-based indices...")
        connector.executeQuery("CREATE INDEX ON :Entity(type)")
        
        # Load relationships from JSON
        relationships_path = Path('./output/relationships.json')
        with open(relationships_path, 'r', encoding='utf-8') as f:
            relationships = json.load(f)
        
        # Create relationships
        print(f"Creating {len(relationships)} relationships...")
        relationship_types = set()
        failed_relationships = 0
        
        for i, rel in enumerate(relationships):
            if i % 20 == 0:
                print(f"Processing relationship {i}/{len(relationships)}")
                
            # Sanitize the relation for use as a relationship type
            rel_type = sanitize_relation(rel["relation"])
            relationship_types.add(rel_type)
            
            query = """
            MATCH (source:Entity {name: $source}), (target:Entity {name: $target})
            MERGE (source)-[r:%s]->(target)
            ON CREATE SET 
                r.original_relation = $relation,
                r.description = $description,
                r.chunk_id = $chunk_id
            """ % rel_type
            
            try:
                connector.executeQuery(query, {
                    "source": rel["source"],
                    "target": rel["target"],
                    "relation": rel["relation"],
                    "description": rel["description"],
                    "chunk_id": rel.get("chunk_id", "")
                })
            except Exception as e:
                print(f"Failed to create relationship: {rel['source']} -[{rel['relation']}]-> {rel['target']}")
                print(f"Error: {e}")
                failed_relationships += 1
        
        # Report statistics
        entity_count = connector.executeQuery("MATCH (n:Entity) RETURN count(n) as count")[0]["count"]
        relationship_count = connector.executeQuery("MATCH ()-[r]->() RETURN count(r) as count")[0]["count"]
        
        print(f"\nKnowledge Graph Created:")
        print(f"- Entities: {entity_count}/{len(entities)}")
        print(f"- Relationships: {relationship_count}/{len(relationships)}")
        print(f"- Relationship types: {len(relationship_types)}")
        print(f"- Failed relationships: {failed_relationships}")
        
        # Create sample queries for exploration
        print("\nSample Query Results:")
        
        # Query 1: Get Entity Types
        print("\nEntity Types:")
        types = connector.executeQuery("MATCH (e:Entity) RETURN e.type, count(*) AS count ORDER BY count DESC LIMIT 5")
        for t in types:
            print(f"- {t['e.type']}: {t['count']} entities")
        
        # Query 2: Get a sample subgraph
        print("\nSample Subgraph:")
        sample = connector.executeQuery("""
        MATCH (e:Entity)-[r]->(related)
        WHERE e.type = 'Organization'
        RETURN e.name, type(r), related.name
        LIMIT 5
        """)
        for s in sample:
            print(f"- {s['e.name']} -[{s['type(r)']}]-> {s['related.name']}")
        
        return {
            "entities": entity_count,
            "relationships": relationship_count,
            "relationship_types": list(relationship_types)
        }

class ESGGraphBuilder:
    """Build entity-relationship graph from ESG document chunks using LLM extraction"""
    
    def __init__(self, 
                 chunks_file: str,
                 output_dir: str = "output",
                 entity_types: str = "ORGANIZATION,PERSON,LOCATION,PROJECT,POLICY,STANDARD,METRIC"):
        """
        Initialize the graph builder with document chunks and extraction parameters
        
        Args:
            chunks_file: Path to the JSON file containing document chunks
            output_dir: Directory to save extracted entities and relationships
            entity_types: Comma-separated list of entity types to extract
        """
        self.chunks_file = chunks_file
        self.output_dir = output_dir
        self.entity_types = entity_types
        
        # Initialize OpenAI client
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        # Load prompts from files
        from entity_extraction import GRAPH_EXTRACTION_PROMPT, CONTINUE_PROMPT as ENTITY_CONTINUE
        from claim_extraction import CLAIM_EXTRACTION_PROMPT, CONTINUE_PROMPT as CLAIM_CONTINUE
        
        self.entity_prompt_template = GRAPH_EXTRACTION_PROMPT
        self.entity_continue_prompt = ENTITY_CONTINUE
        self.claim_prompt_template = CLAIM_EXTRACTION_PROMPT
        self.claim_continue_prompt = CLAIM_CONTINUE
        
        # Format markers for prompt templates
        self.tuple_delimiter = "|"
        self.record_delimiter = "\n"
        self.completion_delimiter = "END_OF_EXTRACTION"
        
        # Storage for extracted data
        self.chunks = []
        self.entities = {}  # Map of entity name to entity info
        self.relationships = []
        self.claims = []
        
        # Create output directory
        os.makedirs(output_dir, exist_ok=True)
    
    def load_chunks(self) -> List[Dict[str, Any]]:
        """Load text chunks from JSON file"""
        print(f"Loading chunks from {self.chunks_file}...")
        
        with open(self.chunks_file, 'r', encoding='utf-8') as f:
            self.chunks = json.load(f)
        
        print(f"Loaded {len(self.chunks)} chunks")
        return self.chunks
    
    def extract_entities_and_relationships(self) -> Tuple[Dict[str, Dict], List[Dict]]:
        """Extract entities and relationships from all chunks"""
        print("\n" + "="*70)
        print(f"Extracting entities and relationships from {len(self.chunks)} chunks...")
        print("="*70)
        
        entities = {}
        relationships = []
        
        for i, chunk in enumerate(self.chunks):
            print(f"\nProcessing chunk {i+1}/{len(self.chunks)} (ID: {chunk['chunk_id']})")
            
            # Prepare the extraction prompt
            prompt = self.entity_prompt_template.format(
                entity_types=self.entity_types,
                input_text=chunk["text"][:8000],  # Limit text length for API
                tuple_delimiter=self.tuple_delimiter,
                record_delimiter=self.record_delimiter,
                completion_delimiter=self.completion_delimiter
            )
            
            try:
                # Call LLM to extract entities and relationships - UPDATED API CALL
                response = self.client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "You are an expert at extracting entities and relationships from text."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.2,  # Lower temperature for more focused extraction
                    max_tokens=4000
                )
                
                # Parse the response - UPDATED RESPONSE HANDLING
                result = response.choices[0].message.content
                chunk_entities, chunk_relationships = self._parse_extraction_result(result, chunk['chunk_id'])
                
                # Add to our collections
                for entity_name, entity_info in chunk_entities.items():
                    if entity_name in entities:
                        # Merge descriptions if entity already exists
                        entities[entity_name]["descriptions"].append(entity_info["description"])
                        entities[entity_name]["chunk_ids"].add(entity_info["chunk_id"])
                    else:
                        entities[entity_name] = {
                            "name": entity_name,
                            "type": entity_info["type"],
                            "descriptions": [entity_info["description"]],
                            "chunk_ids": {entity_info["chunk_id"]}
                        }
                
                relationships.extend(chunk_relationships)
                
                print(f"  - Extracted {len(chunk_entities)} entities and {len(chunk_relationships)} relationships")
                
                # Avoid rate limiting
                time.sleep(1)
                
            except Exception as e:
                print(f"Error processing chunk {i+1}: {str(e)}")
        
        # Convert sets to lists for JSON serialization
        for entity_name in entities:
            entities[entity_name]["chunk_ids"] = list(entities[entity_name]["chunk_ids"])
        
        # Save results
        self.entities = entities
        self.relationships = relationships
        
        print(f"\nExtracted a total of {len(entities)} unique entities and {len(relationships)} relationships")
        
        return entities, relationships
    
    def extract_claims(self) -> List[Dict]:
        """Extract claims from all chunks about extracted entities"""
        if not self.entities:
            print("No entities found. Cannot extract claims.")
            return []
        
        print("\n" + "="*70)
        print(f"Extracting claims about {len(self.entities)} entities...")
        print("="*70)
        
        claims = []
        entity_specs = ",".join(self.entities.keys())
        
        # Process in batches if there are too many entities
        if len(entity_specs) > 1000:
            # Create smaller batches of entities
            entity_batches = []
            current_batch = []
            current_length = 0
            
            for entity in self.entities.keys():
                if current_length + len(entity) > 1000:
                    entity_batches.append(",".join(current_batch))
                    current_batch = [entity]
                    current_length = len(entity)
                else:
                    current_batch.append(entity)
                    current_length += len(entity) + 1  # +1 for the comma
            
            if current_batch:
                entity_batches.append(",".join(current_batch))
            
            print(f"Split {len(self.entities)} entities into {len(entity_batches)} batches")
            
            # Process each batch
            for batch_idx, batch_entities in enumerate(entity_batches):
                print(f"\nProcessing entity batch {batch_idx+1}/{len(entity_batches)}")
                batch_claims = self._extract_claims_for_entities(batch_entities)
                claims.extend(batch_claims)
        else:
            claims = self._extract_claims_for_entities(entity_specs)
        
        self.claims = claims
        print(f"\nExtracted a total of {len(claims)} claims about entities")
        
        return claims
    
    def _extract_claims_for_entities(self, entity_specs: str) -> List[Dict]:
        """Extract claims for a specific set of entities"""
        claims = []
        
        for i, chunk in enumerate(self.chunks):
            print(f"Processing chunk {i+1}/{len(self.chunks)} for claims (ID: {chunk['chunk_id']})")
            
            # Prepare the extraction prompt
            prompt = self.claim_prompt_template.format(
                entity_specs=entity_specs,
                claim_description="environmental, social, and governance claims or activities",
                input_text=chunk["text"][:8000],  # Limit text length for API
                tuple_delimiter=self.tuple_delimiter,
                record_delimiter=self.record_delimiter,
                completion_delimiter=self.completion_delimiter
            )
            
            try:
                # Call LLM to extract claims - UPDATED API CALL
                response = self.client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "You are an expert at extracting claims about entities from text."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.2,  # Lower temperature for more focused extraction
                    max_tokens=4000
                )
                
                # Parse the response - UPDATED RESPONSE HANDLING
                result = response.choices[0].message.content
                chunk_claims = self._parse_claims_result(result, chunk['chunk_id'])
                
                claims.extend(chunk_claims)
                print(f"  - Extracted {len(chunk_claims)} claims")
                
                # Avoid rate limiting
                time.sleep(1)
                
            except Exception as e:
                print(f"Error processing chunk {i+1} for claims: {str(e)}")
        
        return claims
    
    def _parse_extraction_result(self, result: str, chunk_id: str) -> Tuple[Dict[str, Dict], List[Dict]]:
        """Parse the LLM extraction result into entities and relationships"""
        entities = {}
        relationships = []
        
        # Clean up the result
        result = result.strip()
        if self.completion_delimiter in result:
            result = result.split(self.completion_delimiter)[0].strip()
        
        # Split into records
        records = result.split(self.record_delimiter)
        
        for record in records:
            record = record.strip()
            if not record:
                continue
            
            # Extract record type and content
            match = re.match(r'\("(\w+)"\s*\|(.+)', record)
            if not match:
                continue
            
            record_type, content = match.groups()
            
            if record_type.lower() == "entity":
                # Parse entity
                parts = content.split(self.tuple_delimiter)
                if len(parts) >= 3:
                    name = parts[0].strip()
                    entity_type = parts[1].strip()
                    description = parts[2].strip().rstrip(")")
                    
                    entities[name] = {
                        "name": name,
                        "type": entity_type,
                        "description": description,
                        "chunk_id": chunk_id
                    }
            
            elif record_type.lower() == "relationship":
                # Parse relationship
                parts = content.split(self.tuple_delimiter)
                if len(parts) >= 4:
                    source = parts[0].strip()
                    target = parts[1].strip()
                    description = parts[2].strip()
                    strength = parts[3].strip().rstrip(")")
                    
                    try:
                        strength_val = int(strength)
                    except:
                        strength_val = 1
                    
                    relationships.append({
                        "source": source,
                        "target": target,
                        "description": description,
                        "strength": strength_val,
                        "chunk_id": chunk_id
                    })
        
        return entities, relationships
    
    def _parse_claims_result(self, result: str, chunk_id: str) -> List[Dict]:
        """Parse the LLM claims extraction result"""
        claims = []
        
        # Clean up the result
        result = result.strip()
        if self.completion_delimiter in result:
            result = result.split(self.completion_delimiter)[0].strip()
        
        # Split into records
        records = result.split(self.record_delimiter)
        
        for record in records:
            record = record.strip()
            if not record or "NO" in record:  # Skip "NO" responses from the loop prompt
                continue
            
            # Extract claim content (format: (subject|object|type|status|start_date|end_date|description|source))
            match = re.match(r'\((.+)', record)
            if not match:
                continue
            
            content = match.group(1)
            parts = content.split(self.tuple_delimiter)
            
            if len(parts) >= 7:
                subject = parts[0].strip()
                object_entity = parts[1].strip()
                claim_type = parts[2].strip()
                claim_status = parts[3].strip()
                
                # Handle dates
                start_date = parts[4].strip() if parts[4].strip() != "NONE" else None
                end_date = parts[5].strip() if parts[5].strip() != "NONE" else None
                
                description = parts[6].strip()
                source_text = parts[7].strip().rstrip(")") if len(parts) > 7 else ""
                
                claims.append({
                    "subject": subject,
                    "object": object_entity if object_entity != "NONE" else None,
                    "type": claim_type,
                    "status": claim_status,
                    "start_date": start_date,
                    "end_date": end_date,
                    "description": description,
                    "source_text": source_text,
                    "chunk_id": chunk_id
                })
        
        return claims
    
    def save_results(self) -> Tuple[str, str, str]:
        """Save entities, relationships, and claims to JSON files"""
        # Prepare entities for output
        entity_output = []
        for entity_name, entity_info in self.entities.items():
            entity_output.append({
                "name": entity_name,
                "type": entity_info["type"],
                "description": " ".join(entity_info["descriptions"][:3]),  # Combine top descriptions
                "chunk_id": entity_info["chunk_ids"][0] if entity_info["chunk_ids"] else None
            })
        
        # Save entities
        entities_file = os.path.join(self.output_dir, "entities.json")
        with open(entities_file, 'w', encoding='utf-8') as f:
            json.dump(entity_output, f, ensure_ascii=False, indent=2)
        
        # Save relationships
        relationships_file = os.path.join(self.output_dir, "relationships.json")
        with open(relationships_file, 'w', encoding='utf-8') as f:
            json.dump(self.relationships, f, ensure_ascii=False, indent=2)
        
        # Save claims
        claims_file = os.path.join(self.output_dir, "claims.json")
        with open(claims_file, 'w', encoding='utf-8') as f:
            json.dump(self.claims, f, ensure_ascii=False, indent=2)
        
        print("\n" + "="*70)
        print(f"Results saved to:")
        print(f"  - Entities: {entities_file} ({len(entity_output)} entities)")
        print(f"  - Relationships: {relationships_file} ({len(self.relationships)} relationships)")
        print(f"  - Claims: {claims_file} ({len(self.claims)} claims)")
        print("="*70)
        
        return entities_file, relationships_file, claims_file
    
    def build_graph(self) -> Dict[str, Any]:
        """Build the knowledge graph from document chunks"""
        # Step 1: Load chunks
        self.load_chunks()
        
        # Step 2: Extract entities and relationships
        self.extract_entities_and_relationships()
        
        # Step 3: Extract claims
        self.extract_claims()
        
        # Step 4: Save results
        entities_file, relationships_file, claims_file = self.save_results()
        
        return {
            "entities": len(self.entities),
            "relationships": len(self.relationships),
            "claims": len(self.claims),
            "files": {
                "entities": entities_file,
                "relationships": relationships_file,
                "claims": claims_file
            }
        }

def main():
    """Main function for extracting entities from ESG documents"""
    parser = argparse.ArgumentParser(description="Extract entities and build knowledge graph from ESG document chunks")
    
    parser.add_argument("chunks_file", help="Path to the JSON file containing document chunks")
    parser.add_argument("--output-dir", "-o", default="output", 
                        help="Directory to save extracted entities and relationships")
    parser.add_argument("--entity-types", "-t", 
                        default="ORGANIZATION,PERSON,LOCATION,PROJECT,POLICY,STANDARD,METRIC",
                        help="Comma-separated list of entity types to extract")
    
    args = parser.parse_args()
    
    builder = ESGGraphBuilder(
        chunks_file=args.chunks_file,
        output_dir=args.output_dir,
        entity_types=args.entity_types
    )
    
    result = builder.build_graph()
    print("\nKnowledge graph built successfully!")
    print(f"Extracted {result['entities']} entities, {result['relationships']} relationships, and {result['claims']} claims")

if __name__ == "__main__":
    main() 