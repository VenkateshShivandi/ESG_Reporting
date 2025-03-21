import os
import json
import time
import argparse
import re
import concurrent.futures
from typing import List, Dict, Any, Tuple, Set
from openai import OpenAI
from pathlib import Path
from tqdm import tqdm  # For progress bars

# Import the exact prompts from the provided files
from entity_extraction import (
    GRAPH_EXTRACTION_PROMPT,
    CONTINUE_PROMPT as ENTITY_CONTINUE_PROMPT,
    LOOP_PROMPT as ENTITY_LOOP_PROMPT
)

from claim_extraction import (
    CLAIM_EXTRACTION_PROMPT,
    CONTINUE_PROMPT as CLAIM_CONTINUE_PROMPT,
    LOOP_PROMPT as CLAIM_LOOP_PROMPT
)

class ESGGraphBuilder:
    """Build entity-relationship graph from ESG document chunks using LLM extraction"""
    
    def __init__(self, 
                 chunks_file: str,
                 output_dir: str = "output",
                 entity_types: str = "ORGANIZATION,PERSON,LOCATION,PROJECT,POLICY,STANDARD,METRIC",
                 max_chunks: int = 100,
                 max_workers: int = 5):
        """
        Initialize the graph builder with document chunks and extraction parameters
        
        Args:
            chunks_file: Path to the JSON file containing document chunks
            output_dir: Directory to save extracted entities and relationships
            entity_types: Comma-separated list of entity types to extract
            max_chunks: Maximum number of chunks to process (default: 100)
            max_workers: Maximum number of parallel workers (default: 5)
        """
        self.chunks_file = chunks_file
        self.output_dir = output_dir
        self.entity_types = entity_types
        self.max_chunks = max_chunks
        self.max_workers = max_workers
        
        # Initialize OpenAI client
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        # Format delimiters used in the prompt templates
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
        """Load text chunks from JSON file with limit"""
        print(f"Loading chunks from {self.chunks_file}...")
        
        with open(self.chunks_file, 'r', encoding='utf-8') as f:
            all_chunks = json.load(f)
        
        # Apply max_chunks limit (0 means process all chunks)
        if self.max_chunks == 0:
            self.chunks = all_chunks
        else:
            self.chunks = all_chunks[:self.max_chunks]
        
        print(f"Loaded {len(self.chunks)} chunks (from total of {len(all_chunks)})")
        return self.chunks
    
    def _process_chunk_for_entities(self, chunk_index_and_data) -> Tuple[Dict[str, Dict], List[Dict]]:
        """Process a single chunk for entities and relationships (for parallel execution)"""
        i, chunk = chunk_index_and_data
        chunk_entities = {}
        chunk_relationships = []
        
        # Prepare the extraction prompt using the imported template
        prompt = GRAPH_EXTRACTION_PROMPT.format(
            entity_types=self.entity_types,
            input_text=chunk["text"][:8000],
            tuple_delimiter=self.tuple_delimiter,
            record_delimiter=self.record_delimiter,
            completion_delimiter=self.completion_delimiter
        )
        
        try:
            # Call LLM to extract entities and relationships
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are an expert at extracting entities and relationships from text."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
                max_tokens=4000
            )
            
            # Parse the response
            result = response.choices[0].message.content
            chunk_entities, chunk_relationships = self._parse_extraction_result(result, chunk['chunk_id'])
            
            # Optional: Check if more entities can be extracted using the LOOP_PROMPT
            if len(chunk_entities) > 0 and ENTITY_LOOP_PROMPT:
                loop_response = self.client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "You are an expert at extracting entities and relationships from text."},
                        {"role": "user", "content": prompt},
                        {"role": "assistant", "content": result},
                        {"role": "user", "content": ENTITY_LOOP_PROMPT}
                    ],
                    temperature=0.1,
                    max_tokens=100
                )
                
                loop_result = loop_response.choices[0].message.content
                if "YES" in loop_result:
                    continue_prompt = ENTITY_CONTINUE_PROMPT
                    
                    continue_response = self.client.chat.completions.create(
                        model="gpt-4o-mini",
                        messages=[
                            {"role": "system", "content": "You are an expert at extracting entities and relationships from text."},
                            {"role": "user", "content": prompt},
                            {"role": "assistant", "content": result},
                            {"role": "user", "content": continue_prompt}
                        ],
                        temperature=0.2,
                        max_tokens=4000
                    )
                    
                    continue_result = continue_response.choices[0].message.content
                    more_entities, more_relationships = self._parse_extraction_result(continue_result, chunk['chunk_id'])
                    
                    # Add more entities and relationships
                    chunk_entities.update(more_entities)
                    chunk_relationships.extend(more_relationships)
            
        except Exception as e:
            print(f"Error processing chunk {i+1}: {str(e)}")
        
        return i, chunk_entities, chunk_relationships
    
    def extract_entities_and_relationships(self) -> Tuple[Dict[str, Dict], List[Dict]]:
        """Extract entities and relationships from all chunks using parallel processing"""
        print("\n" + "="*70)
        print(f"Extracting entities and relationships from {len(self.chunks)} chunks using {self.max_workers} workers...")
        print("="*70)
        
        entities = {}
        relationships = []
        
        # Prepare the chunks with their indices for parallel processing
        chunk_data = list(enumerate(self.chunks))
        
        # Process chunks in parallel
        with concurrent.futures.ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Submit all tasks
            future_to_chunk = {
                executor.submit(self._process_chunk_for_entities, chunk_item): chunk_item[0] 
                for chunk_item in chunk_data
            }
            
            # Process results as they complete, with progress bar
            with tqdm(total=len(chunk_data), desc="Processing chunks") as pbar:
                for future in concurrent.futures.as_completed(future_to_chunk):
                    chunk_idx = future_to_chunk[future]
                    try:
                        i, chunk_entities, chunk_relationships = future.result()
                        
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
                        
                        print(f"Chunk {i+1}: Extracted {len(chunk_entities)} entities and {len(chunk_relationships)} relationships")
                        pbar.update(1)
                        
                    except Exception as e:
                        print(f"Error processing chunk {chunk_idx+1}: {str(e)}")
                        pbar.update(1)
        
        # Convert sets to lists for JSON serialization
        for entity_name in entities:
            entities[entity_name]["chunk_ids"] = list(entities[entity_name]["chunk_ids"])
        
        # Save results
        self.entities = entities
        self.relationships = relationships
        
        print(f"\nExtracted a total of {len(entities)} unique entities and {len(relationships)} relationships")
        
        return entities, relationships
    
    def _process_chunk_for_claims(self, chunk_index_and_data) -> List[Dict]:
        """Process a single chunk for claims (for parallel execution)"""
        i, chunk, entity_specs = chunk_index_and_data
        chunk_claims = []
        
        # Prepare the extraction prompt using the imported claim template
        prompt = CLAIM_EXTRACTION_PROMPT.format(
            entity_specs=entity_specs,
            claim_description="environmental, social, and governance claims or activities",
            input_text=chunk["text"][:8000],
            tuple_delimiter=self.tuple_delimiter,
            record_delimiter=self.record_delimiter,
            completion_delimiter=self.completion_delimiter
        )
        
        try:
            # Call LLM to extract claims
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are an expert at extracting claims about entities from text."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
                max_tokens=4000
            )
            
            # Parse the response
            result = response.choices[0].message.content
            chunk_claims = self._parse_claims_result(result, chunk['chunk_id'])
            
            # Optional: Check if more claims can be extracted using LOOP_PROMPT
            if len(chunk_claims) > 0 and CLAIM_LOOP_PROMPT:
                loop_response = self.client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "You are an expert at extracting claims about entities from text."},
                        {"role": "user", "content": prompt},
                        {"role": "assistant", "content": result},
                        {"role": "user", "content": CLAIM_LOOP_PROMPT}
                    ],
                    temperature=0.1,
                    max_tokens=100
                )
                
                loop_result = loop_response.choices[0].message.content
                if "YES" in loop_result:
                    continue_prompt = CLAIM_CONTINUE_PROMPT
                    
                    continue_response = self.client.chat.completions.create(
                        model="gpt-4o-mini",
                        messages=[
                            {"role": "system", "content": "You are an expert at extracting claims about entities from text."},
                            {"role": "user", "content": prompt},
                            {"role": "assistant", "content": result},
                            {"role": "user", "content": continue_prompt}
                        ],
                        temperature=0.2,
                        max_tokens=4000
                    )
                    
                    continue_result = continue_response.choices[0].message.content
                    more_claims = self._parse_claims_result(continue_result, chunk['chunk_id'])
                    chunk_claims.extend(more_claims)
            
        except Exception as e:
            print(f"Error processing chunk {i+1} for claims: {str(e)}")
        
        return i, chunk_claims
    
    def extract_claims(self) -> List[Dict]:
        """Extract claims from all chunks about extracted entities using the imported prompt"""
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
        """Extract claims for a specific set of entities using parallel processing"""
        claims = []
        
        # Prepare the data for parallel processing
        chunk_data = [(i, chunk, entity_specs) for i, chunk in enumerate(self.chunks)]
        
        # Process chunks in parallel
        with concurrent.futures.ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Submit all tasks
            future_to_chunk = {
                executor.submit(self._process_chunk_for_claims, chunk_item): chunk_item[0] 
                for chunk_item in chunk_data
            }
            
            # Process results as they complete, with progress bar
            with tqdm(total=len(chunk_data), desc="Processing chunks for claims") as pbar:
                for future in concurrent.futures.as_completed(future_to_chunk):
                    chunk_idx = future_to_chunk[future]
                    try:
                        i, chunk_claims = future.result()
                        claims.extend(chunk_claims)
                        print(f"Chunk {i+1}: Extracted {len(chunk_claims)} claims")
                        pbar.update(1)
                        
                    except Exception as e:
                        print(f"Error processing chunk {chunk_idx+1} for claims: {str(e)}")
                        pbar.update(1)
        
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
        """Parse the LLM claims extraction result according to the claim format"""
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
        """Save entities, relationships, and claims to JSON files with proper aggregation"""
        print("\nAggregating and summarizing extracted data...")
        
        # 1. ENTITY AGGREGATION
        # Prepare entities for output with improved description summarization
        entity_output = []
        for entity_name, entity_info in self.entities.items():
            # Combine descriptions - in a real implementation, you might use an LLM to generate a concise summary
            if len(entity_info["descriptions"]) > 1:
                # Simple concatenation of unique descriptions (removing duplicates)
                unique_descriptions = list(set(entity_info["descriptions"]))
                combined_description = " ".join(unique_descriptions[:3])
            else:
                combined_description = entity_info["descriptions"][0] if entity_info["descriptions"] else ""
            
            entity_output.append({
                "name": entity_name,
                "type": entity_info["type"],
                "description": combined_description,
                "chunk_ids": entity_info["chunk_ids"]  # Keep all chunk IDs
            })
        
        # 2. RELATIONSHIP AGGREGATION
        # Group and aggregate relationships by source, target, and description
        relationship_map = {}
        for rel in self.relationships:
            # Create a unique key for each relationship
            key = f"{rel['source']}|{rel['target']}|{rel['description']}"
            
            if key in relationship_map:
                # Increment strength for duplicate relationships
                relationship_map[key]["strength"] += rel["strength"]
                # Track all chunk IDs where this relationship was found
                if "chunk_ids" not in relationship_map[key]:
                    relationship_map[key]["chunk_ids"] = [rel["chunk_id"]]
                else:
                    relationship_map[key]["chunk_ids"].append(rel["chunk_id"])
            else:
                # Create new entry with initial strength
                relationship_map[key] = {
                    "source": rel["source"],
                    "target": rel["target"],
                    "description": rel["description"],
                    "strength": rel["strength"],
                    "chunk_ids": [rel["chunk_id"]]
                }
        
        # Convert relationship map to list
        aggregated_relationships = list(relationship_map.values())
        
        # 3. CLAIM AGGREGATION
        # Group and aggregate claims by subject, object, and type
        claim_map = {}
        for claim in self.claims:
            # Create a unique key for each claim
            key = f"{claim['subject']}|{claim.get('object', 'NONE')}|{claim['type']}|{claim['status']}"
            
            if key in claim_map:
                # For duplicate claims, we'll keep all descriptions and source texts
                if claim["description"] not in claim_map[key]["descriptions"]:
                    claim_map[key]["descriptions"].append(claim["description"])
                
                if claim["source_text"] and claim["source_text"] not in claim_map[key]["source_texts"]:
                    claim_map[key]["source_texts"].append(claim["source_text"])
                
                # Track all chunk IDs
                claim_map[key]["chunk_ids"].append(claim["chunk_id"])
                
                # Keep the most specific date range
                if claim["start_date"]:
                    if not claim_map[key]["start_date"] or claim["start_date"] < claim_map[key]["start_date"]:
                        claim_map[key]["start_date"] = claim["start_date"]
                
                if claim["end_date"]:
                    if not claim_map[key]["end_date"] or claim["end_date"] > claim_map[key]["end_date"]:
                        claim_map[key]["end_date"] = claim["end_date"]
                
                # Increment occurrence count
                claim_map[key]["occurrence_count"] += 1
            else:
                # Create new entry
                claim_map[key] = {
                    "subject": claim["subject"],
                    "object": claim.get("object"),
                    "type": claim["type"],
                    "status": claim["status"],
                    "descriptions": [claim["description"]],
                    "source_texts": [claim["source_text"]] if claim["source_text"] else [],
                    "start_date": claim.get("start_date"),
                    "end_date": claim.get("end_date"),
                    "chunk_ids": [claim["chunk_id"]],
                    "occurrence_count": 1
                }
        
        # Combine descriptions for each claim
        aggregated_claims = []
        for claim_info in claim_map.values():
            # Combine all descriptions (in a real implementation, you might use an LLM to generate a summary)
            combined_description = "; ".join(claim_info["descriptions"])
            combined_source = "; ".join(claim_info["source_texts"])
            
            aggregated_claims.append({
                "subject": claim_info["subject"],
                "object": claim_info["object"],
                "type": claim_info["type"],
                "status": claim_info["status"],
                "description": combined_description,
                "source_text": combined_source,
                "start_date": claim_info["start_date"],
                "end_date": claim_info["end_date"],
                "chunk_ids": claim_info["chunk_ids"],
                "confidence": min(1.0, claim_info["occurrence_count"] / 5.0)  # Simple confidence calculation
            })
        
        # Save entities
        entities_file = os.path.join(self.output_dir, "entities.json")
        with open(entities_file, 'w', encoding='utf-8') as f:
            json.dump(entity_output, f, ensure_ascii=False, indent=2)
        
        # Save relationships
        relationships_file = os.path.join(self.output_dir, "relationships.json")
        with open(relationships_file, 'w', encoding='utf-8') as f:
            json.dump(aggregated_relationships, f, ensure_ascii=False, indent=2)
        
        # Save claims
        claims_file = os.path.join(self.output_dir, "claims.json")
        with open(claims_file, 'w', encoding='utf-8') as f:
            json.dump(aggregated_claims, f, ensure_ascii=False, indent=2)
        
        print("\n" + "="*70)
        print(f"Results saved with aggregation:")
        print(f"  - Entities: {entities_file} ({len(entity_output)} unique entities from {len(self.entities)} extractions)")
        print(f"  - Relationships: {relationships_file} ({len(aggregated_relationships)} unique relationships from {len(self.relationships)} extractions)")
        print(f"  - Claims: {claims_file} ({len(aggregated_claims)} unique claims from {len(self.claims)} extractions)")
        print("="*70)
        
        return entities_file, relationships_file, claims_file
    
    def _fuzzy_match_entities(self, name1: str, name2: str, threshold: float = 0.85) -> Tuple[bool, float]:
        """
        Determines if two entity names should be considered the same entity using fuzzy matching.
        
        Args:
            name1: First entity name
            name2: Second entity name
            threshold: Similarity threshold (0.0 to 1.0) for considering entities as matching
            
        Returns:
            Tuple of (is_match, similarity_score)
        """
        # Skip comparison if names are identical (exact match)
        if name1 == name2:
            return True, 1.0
        
        # Normalize names: convert to lowercase, remove punctuation and extra spaces
        def normalize(text):
            # Convert to lowercase
            text = text.lower()
            # Remove punctuation
            text = re.sub(r'[^\w\s]', ' ', text)
            # Replace multiple spaces with a single space
            text = re.sub(r'\s+', ' ', text).strip()
            return text
        
        norm1 = normalize(name1)
        norm2 = normalize(name2)
        
        # Skip if either name is empty after normalization
        if not norm1 or not norm2:
            return False, 0.0
        
        # Basic exact matching after normalization
        if norm1 == norm2:
            return True, 1.0
        
        # Check for contained strings (e.g., "IBM" vs "IBM Corporation")
        if norm1 in norm2 or norm2 in norm1:
            # Calculate containment score based on length ratio
            longer = max(len(norm1), len(norm2))
            shorter = min(len(norm1), len(norm2))
            containment_score = shorter / longer
            
            # If one string is fully contained in the other and relatively significant in length
            if containment_score > 0.5:
                return True, containment_score
        
        # Calculate Levenshtein distance-based similarity
        def levenshtein_similarity(s1, s2):
            # Simple implementation of Levenshtein distance
            if len(s1) < len(s2):
                return levenshtein_similarity(s2, s1)
            
            if len(s2) == 0:
                return len(s1)
            
            previous_row = range(len(s2) + 1)
            for i, c1 in enumerate(s1):
                current_row = [i + 1]
                for j, c2 in enumerate(s2):
                    # Calculate insertions, deletions, and substitutions
                    insertions = previous_row[j + 1] + 1 
                    deletions = current_row[j] + 1
                    substitutions = previous_row[j] + (c1 != c2)
                    current_row.append(min(insertions, deletions, substitutions))
                previous_row = current_row
            
            # Convert distance to similarity score (0 to 1)
            max_len = max(len(s1), len(s2))
            if max_len == 0:
                return 0.0
            return 1.0 - (previous_row[-1] / max_len)
        
        # Get token sets (words) from each name
        tokens1 = set(norm1.split())
        tokens2 = set(norm2.split())
        
        # Calculate token set similarity (Jaccard similarity)
        def token_set_similarity(t1, t2):
            if not t1 or not t2:
                return 0.0
            intersection = len(t1.intersection(t2))
            union = len(t1.union(t2))
            return intersection / union if union > 0 else 0.0
        
        # Calculate various similarity metrics
        levenshtein_sim = levenshtein_similarity(norm1, norm2)
        token_sim = token_set_similarity(tokens1, tokens2)
        
        # Combine similarity scores (weighted average)
        similarity = (0.6 * levenshtein_sim) + (0.4 * token_sim)
        
        # Return result based on threshold
        return similarity >= threshold, similarity

    def _apply_fuzzy_matching_to_entities(self, threshold: float = 0.85) -> Dict[str, Dict]:
        """
        Apply fuzzy matching to merge similar entities.
        This function demonstrates how the _fuzzy_match_entities method could be used.
        
        Args:
            threshold: Similarity threshold for entity matching
            
        Returns:
            Dictionary of merged entities
        """
        print("\nApplying fuzzy matching to entities...")
        
        # Create a copy of the original entities
        original_entities = self.entities.copy()
        merged_entities = {}
        processed_names = set()
        
        # Sort entities by name length (typically, longer names are more specific)
        entity_names = sorted(original_entities.keys(), key=lambda x: (-len(x), x))
        
        # Create clusters of similar entities
        entity_clusters = []
        
        for name in entity_names:
            if name in processed_names:
                continue
            
            # Start a new cluster with this entity
            cluster = [name]
            processed_names.add(name)
            
            # Compare with all other unprocessed entities
            for other_name in entity_names:
                if other_name in processed_names:
                    continue
                
                # Only compare entities of the same type
                if original_entities[name]["type"] == original_entities[other_name]["type"]:
                    is_match, score = self._fuzzy_match_entities(name, other_name, threshold)
                    
                    if is_match:
                        cluster.append(other_name)
                        processed_names.add(other_name)
            
            entity_clusters.append(cluster)
        
        # Process each cluster to create merged entities
        for cluster in entity_clusters:
            if not cluster:
                continue
            
            # Use the longest name as the canonical name
            canonical_name = max(cluster, key=len)
            merged_entity = {
                "name": canonical_name,
                "type": original_entities[canonical_name]["type"],
                "descriptions": [],
                "alternate_names": [],
                "chunk_ids": set()
            }
            
            # Merge information from all entities in the cluster
            for name in cluster:
                if name != canonical_name:
                    merged_entity["alternate_names"].append(name)
                    
                entity = original_entities[name]
                merged_entity["descriptions"].extend(entity["descriptions"])
                
                # Add chunk IDs
                if isinstance(entity["chunk_ids"], list):
                    merged_entity["chunk_ids"].update(entity["chunk_ids"])
                else:
                    merged_entity["chunk_ids"].add(entity["chunk_ids"])
            
            # Convert sets to lists for JSON serialization
            merged_entity["chunk_ids"] = list(merged_entity["chunk_ids"])
            
            # Add to merged entities
            merged_entities[canonical_name] = merged_entity
        
        print(f"Reduced {len(original_entities)} entities to {len(merged_entities)} through fuzzy matching")
        return merged_entities
    
    def build_graph(self) -> Dict[str, Any]:
        """Build the knowledge graph from document chunks"""
        # Step 1: Load chunks (with limit)
        self.load_chunks()
        
        # Step 2: Extract entities and relationships (in parallel)
        self.extract_entities_and_relationships()
        
        # Step 3: Extract claims (in parallel)
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
    parser.add_argument("--max-chunks", "-m", type=int, default=100,
                        help="Maximum number of chunks to process (default: 100)")
    parser.add_argument("--workers", "-w", type=int, default=5,
                        help="Number of parallel workers (default: 5)")
    
    args = parser.parse_args()
    
    builder = ESGGraphBuilder(
        chunks_file=args.chunks_file,
        output_dir=args.output_dir,
        entity_types=args.entity_types,
        max_chunks=args.max_chunks,
        max_workers=args.workers
    )
    
    result = builder.build_graph()
    print("\nKnowledge graph built successfully!")
    print(f"Extracted {result['entities']} entities, {result['relationships']} relationships, and {result['claims']} claims")

if __name__ == "__main__":
    main() 