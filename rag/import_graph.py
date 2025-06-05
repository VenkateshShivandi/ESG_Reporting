import os
import json
import argparse
import re
from neo4j import GraphDatabase
from typing import Dict, Any, List

class Neo4jGraphImporter:
    """Import extracted entities, relationships, and claims into Neo4j"""

    def __init__(self, 
                 uri: str,
                 entities_file: str,
                 relationships_file: str,
                 claims_file: str = None):
        """
        Initialize the Neo4j graph importer

        Args:
            uri: Neo4j URI
            entities_file: Path to the entities JSON file
            relationships_file: Path to the relationships JSON file
            claims_file: Path to the claims JSON file (optional)
        """
        self.uri = uri
        self.entities_file = entities_file
        self.relationships_file = relationships_file
        self.claims_file = claims_file
        self.driver = None

    def connect(self):
        """Connect to Neo4j database"""
        print(f"Connecting to Neo4j at {self.uri}...")

        try:
            self.driver = GraphDatabase.driver(self.uri)
            self._test_connection()
            print("Connection successful")
        except Exception as e:
            print(f"Connection failed: {str(e)}")
            raise

    def _test_connection(self):
        """Test the Neo4j connection"""
        with self.driver.session() as session:
            result = session.run("RETURN 1 AS num")
            assert result.single()["num"] == 1

    def close(self):
        """Close the Neo4j connection"""
        if self.driver:
            self.driver.close()

    def import_entities(self) -> int:
        """Import entities into Neo4j"""
        print(f"Importing entities from {self.entities_file}...")

        with open(self.entities_file, 'r', encoding='utf-8') as f:
            entities = json.load(f)

        with self.driver.session() as session:
            try:
                session.run("CREATE CONSTRAINT entity_name IF NOT EXISTS FOR (e:Entity) REQUIRE e.name IS UNIQUE")
            except:
                print("Note: Constraint may already exist")

            count = 0
            for entity in entities:
                props = {
                    "name": entity["name"],
                    "type": entity["type"],
                    "description": entity.get("description", ""),
                    "chunk_id": entity.get("chunk_id", "")
                }
                query = """
                MERGE (e:Entity {name: $name})
                ON CREATE SET 
                    e.type = $type,
                    e.description = $description,
                    e.chunk_id = $chunk_id
                ON MATCH SET
                    e.type = $type,
                    e.description = $description
                RETURN e
                """
                result = session.run(query, props)
                count += result.consume().counters.nodes_created

        print(f"Imported {count} entities")
        return count

    def import_relationships(self) -> int:
        """Import relationships into Neo4j"""
        print(f"Importing relationships from {self.relationships_file}...")

        with open(self.relationships_file, 'r', encoding='utf-8') as f:
            relationships = json.load(f)

        count = 0
        with self.driver.session() as session:
            for rel in relationships:
                rel_type = self._sanitize_relationship_type(rel.get("relation", "RELATED_TO"))
                props = {
                    "source": rel["source"],
                    "target": rel["target"],
                    "description": rel.get("description", ""),
                    "strength": int(rel.get("strength", 1)),
                    "chunk_id": rel.get("chunk_id", "")
                }
                query = f"""
                MATCH (source:Entity {{name: $source}}), (target:Entity {{name: $target}})
                MERGE (source)-[r:{rel_type}]->(target)
                ON CREATE SET 
                    r.description = $description,
                    r.strength = $strength,
                    r.chunk_id = $chunk_id
                RETURN r
                """
                try:
                    result = session.run(query, props)
                    count += result.consume().counters.relationships_created
                except Exception as e:
                    print(f"Error creating relationship: {str(e)}")
                    print(f"Source: {props['source']}, Target: {props['target']}, Type: {rel_type}")

        print(f"Imported {count} relationships")
        return count

    def import_claims(self) -> int:
        """Import claims into Neo4j"""
        if not self.claims_file:
            print("No claims file provided. Skipping claims import.")
            return 0

        print(f"Importing claims from {self.claims_file}...")
        with open(self.claims_file, 'r', encoding='utf-8') as f:
            claims = json.load(f)

        count = 0
        with self.driver.session() as session:
            for claim in claims:
                if not claim.get("subject"):
                    continue

                claim_props = {
                    "subject": claim["subject"],
                    "object": claim.get("object"),
                    "type": claim.get("type", "GENERAL"),
                    "status": claim.get("status", "UNKNOWN"),
                    "description": claim.get("description", ""),
                    "source_text": claim.get("source_text", ""),
                    "start_date": claim.get("start_date"),
                    "end_date": claim.get("end_date"),
                    "chunk_id": claim.get("chunk_id", "")
                }
                claim_id = f"{claim['subject']}_{claim.get('type', 'CLAIM')}_{claim.get('chunk_id', '')}"
                claim_props["id"] = claim_id

                query = """
                MATCH (subject:Entity {name: $subject})
                MERGE (c:Claim {id: $id})
                ON CREATE SET 
                    c.type = $type,
                    c.status = $status,
                    c.description = $description,
                    c.source_text = $source_text,
                    c.start_date = $start_date,
                    c.end_date = $end_date,
                    c.chunk_id = $chunk_id
                MERGE (subject)-[r:HAS_CLAIM]->(c)
                """
                if claim.get("object"):
                    query += """
                    WITH c
                    MATCH (object:Entity {name: $object})
                    MERGE (c)-[r2:REFERS_TO]->(object)
                    """
                query += "RETURN c"

                try:
                    result = session.run(query, claim_props)
                    count += result.consume().counters.nodes_created
                except Exception as e:
                    print(f"Error creating claim: {str(e)}")

        print(f"Imported {count} claims")
        return count

    def _sanitize_relationship_type(self, rel_type: str) -> str:
        rel_type = rel_type.upper()
        rel_type = re.sub(r'[^A-Z0-9_]', '_', rel_type)
        if not rel_type[0].isalpha():
            rel_type = 'REL_' + rel_type
        return rel_type

    def import_graph(self) -> Dict[str, int]:
        try:
            self.connect()
            entity_count = self.import_entities()
            relationship_count = self.import_relationships()
            claim_count = self.import_claims()
            print("\nImport complete!")
            print(f"- Entities: {entity_count}")
            print(f"- Relationships: {relationship_count}")
            print(f"- Claims: {claim_count}")
            return {
                "entities": entity_count,
                "relationships": relationship_count,
                "claims": claim_count
            }
        finally:
            self.close()

def main():
    parser = argparse.ArgumentParser(description="Import ESG knowledge graph into Neo4j")
    parser.add_argument("--uri", required=True, help="Neo4j URI (e.g., bolt://localhost:7687)")
    parser.add_argument("--entities", required=True, help="Path to entities JSON file")
    parser.add_argument("--relationships", required=True, help="Path to relationships JSON file")
    parser.add_argument("--claims", help="Path to claims JSON file (optional)")
    args = parser.parse_args()

    importer = Neo4jGraphImporter(
        uri=args.uri,
        entities_file=args.entities,
        relationships_file=args.relationships,
        claims_file=args.claims
    )

    importer.import_graph()

if __name__ == "__main__":
    main()
