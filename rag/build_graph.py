import json
import re
import os
from pathlib import Path
from main import Neo4jConnector

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

if __name__ == "__main__":
    build_knowledge_graph() 