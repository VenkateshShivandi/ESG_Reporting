import os
from typing import Dict, List, Any, Optional, Tuple, Union
from neo4j import GraphDatabase
import logging
import json
import re

class Neo4jGraphStore:
    """
    Class for storing and retrieving knowledge graph data in Neo4j.
    
    This connector handles:
    - Connection management for Neo4j
    - Creating and updating entity nodes
    - Creating and updating relationships
    - Creating and updating claim nodes
    - Graph queries and traversals
    - Cleanup operations
    """
    
    def __init__(
        self,
        uri: str = None,
        username: str = None,
        password: str = None,
        database: str = "neo4j",
        max_connection_pool_size: int = 50,
        connection_timeout: int = 30,
    ):
        """
        Initialize the Neo4j graph store.
        
        Args:
            uri: Neo4j URI (e.g., bolt://localhost:7687)
            username: Neo4j username
            password: Neo4j password
            database: Neo4j database name
            max_connection_pool_size: Maximum number of connections in the pool
            connection_timeout: Connection timeout in seconds
        """
        # Use environment variables if parameters are not provided
        self.uri = uri or os.getenv("NEO4J_URI", "bolt://localhost:7687")
        self.username = username or os.getenv("NEO4J_USERNAME")
        self.password = password or os.getenv("NEO4J_PASSWORD")
        self.database = database
        
        self.driver = None
        self.max_connection_pool_size = max_connection_pool_size
        self.connection_timeout = connection_timeout
        
        # Configure logging
        self.logger = logging.getLogger(__name__)
        
    def connect(self) -> bool:
        """
        Establish connection to Neo4j database.
        
        Returns:
            bool: True if connection successful, False otherwise
        """
        try:
            self.driver = GraphDatabase.driver(
                self.uri,
                auth=(self.username, self.password),
                max_connection_pool_size=self.max_connection_pool_size,
                connection_timeout=self.connection_timeout
            )
            
            # Verify connection with a simple query
            with self.driver.session(database=self.database) as session:
                result = session.run("RETURN 1 AS test")
                record = result.single()
                if record and record["test"] == 1:
                    self.logger.info(f"Connected to Neo4j at {self.uri}")
                    return True
                else:
                    self.logger.error("Failed to verify Neo4j connection")
                    return False
                
        except Exception as e:
            self.logger.error(f"Error connecting to Neo4j: {str(e)}")
            self.driver = None
            return False
    
    def close(self):
        """Close the Neo4j connection"""
        if self.driver:
            self.driver.close()
            self.driver = None
            self.logger.info("Neo4j connection closed")
    
    def __enter__(self):
        """Context manager entry"""
        self.connect()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        self.close()
    
    def _sanitize_relationship_type(self, rel_type: str) -> str:
        """
        Sanitize a relationship type to conform to Neo4j requirements
        
        Args:
            rel_type: Raw relationship type/description
            
        Returns:
            str: Valid Neo4j relationship type
        """
        # Convert to uppercase and replace spaces with underscores
        rel_type = rel_type.upper()
        # Replace invalid characters with underscores
        rel_type = re.sub(r'[^A-Z0-9_]', '_', rel_type)
        # Ensure it starts with a letter or underscore
        if rel_type and not rel_type[0].isalpha() and rel_type[0] != '_':
            rel_type = 'REL_' + rel_type
        # Handle empty relationship type
        if not rel_type:
            rel_type = "RELATED_TO"
        return rel_type

    def clear_graph(self) -> bool:
        """
        Clear all nodes and relationships from the graph
        
        Returns:
            bool: True if successful, False otherwise
        """
        if not self.driver:
            self.logger.error("Not connected to Neo4j")
            return False
            
        try:
            with self.driver.session(database=self.database) as session:
                session.run("MATCH (n) DETACH DELETE n")
                self.logger.info("Graph cleared successfully")
                return True
        except Exception as e:
            self.logger.error(f"Error clearing graph: {str(e)}")
            return False
    
    def create_constraints(self) -> bool:
        """
        Create constraints for the knowledge graph
        
        Returns:
            bool: True if successful, False otherwise
        """
        if not self.driver:
            self.logger.error("Not connected to Neo4j")
            return False
            
        try:
            with self.driver.session(database=self.database) as session:
                # Entity name constraint
                try:
                    session.run("""
                    CREATE CONSTRAINT entity_name_unique IF NOT EXISTS 
                    FOR (e:Entity) REQUIRE e.name IS UNIQUE
                    """)
                except Exception as e:
                    self.logger.warning(f"Warning creating entity constraint: {str(e)}")
                
                # Claim ID constraint
                try:
                    session.run("""
                    CREATE CONSTRAINT claim_id_unique IF NOT EXISTS 
                    FOR (c:Claim) REQUIRE c.id IS UNIQUE
                    """)
                except Exception as e:
                    self.logger.warning(f"Warning creating claim constraint: {str(e)}")
                
                # Create indexes for common properties
                try:
                    session.run("CREATE INDEX entity_type_index IF NOT EXISTS FOR (e:Entity) ON (e.type)")
                    session.run("CREATE INDEX claim_type_index IF NOT EXISTS FOR (c:Claim) ON (c.type)")
                except Exception as e:
                    self.logger.warning(f"Warning creating indexes: {str(e)}")
                
                self.logger.info("Constraints and indexes created successfully")
                return True
        except Exception as e:
            self.logger.error(f"Error creating constraints: {str(e)}")
            return False
    
    def import_entities(self, entities: List[Dict[str, Any]]) -> int:
        """
        Import entity nodes into Neo4j
        
        Args:
            entities: List of entity dictionaries
            
        Returns:
            int: Number of entities successfully imported
        """
        if not self.driver:
            self.logger.error("Not connected to Neo4j")
            return 0
            
        count = 0
        with self.driver.session(database=self.database) as session:
            for entity in entities:
                try:
                    # Clean up entities for Neo4j
                    props = {
                        "name": entity["name"],
                        "type": entity["type"],
                        "description": entity.get("description", ""),
                    }
                    
                    # Add any chunk IDs as a property
                    if "chunk_ids" in entity and entity["chunk_ids"]:
                        if isinstance(entity["chunk_ids"], list):
                            props["chunk_ids"] = entity["chunk_ids"]
                        else:
                            props["chunk_ids"] = [entity["chunk_ids"]]
                    
                    # Add alternate names if available
                    if "alternate_names" in entity and entity["alternate_names"]:
                        props["alternate_names"] = entity["alternate_names"]
                        
                    query = """
                    MERGE (e:Entity {name: $name})
                    ON CREATE SET
                        e.type = $type,
                        e.description = $description,
                        e.created_at = timestamp()
                    ON MATCH SET
                        e.type = $type,
                        e.description = $description,
                        e.updated_at = timestamp()
                    """
                    
                    # Add optional properties
                    if "chunk_ids" in props:
                        query += ", e.chunk_ids = $chunk_ids"
                    if "alternate_names" in props:
                        query += ", e.alternate_names = $alternate_names"
                        
                    query += " RETURN e"
                    
                    result = session.run(query, props)
                    summary = result.consume()
                    count += summary.counters.nodes_created
                    
                except Exception as e:
                    self.logger.error(f"Error importing entity {entity.get('name')}: {str(e)}")
            
        self.logger.info(f"Imported {count} entities successfully")
        return count
    
    def import_relationships(self, relationships: List[Dict[str, Any]]) -> int:
        """
        Import relationships into Neo4j using a single consistent relationship type
        
        Args:
            relationships: List of relationship dictionaries
            
        Returns:
            int: Number of relationships successfully imported
        """
        if not self.driver:
            self.logger.error("Not connected to Neo4j")
            return 0
            
        count = 0
        with self.driver.session(database=self.database) as session:
            for rel in relationships:
                try:
                    # Extract relationship properties
                    source = rel["source"]
                    target = rel["target"]
                    description = rel.get("description", "")
                    
                    # Use a single consistent relationship type
                    rel_type = "RELATES_TO"
                    
                    # Prepare properties
                    props = {
                        "source": source,
                        "target": target,
                        "description": description,
                        "rel_type": description.upper(),  # Store original relationship type as property
                        "strength": rel.get("strength", 1)
                    }
                    
                    # Add chunk IDs if available
                    if "chunk_ids" in rel and rel["chunk_ids"]:
                        props["chunk_ids"] = rel["chunk_ids"]
                        
                    # Create relationship
                    query = f"""
                    MATCH (source:Entity {{name: $source}}), (target:Entity {{name: $target}})
                    MERGE (source)-[r:{rel_type}]->(target)
                    ON CREATE SET
                        r.description = $description,
                        r.rel_type = $rel_type,
                        r.strength = $strength,
                        r.created_at = timestamp()
                    ON MATCH SET
                        r.description = $description,
                        r.rel_type = $rel_type,
                        r.strength = $strength,
                        r.updated_at = timestamp()
                    """
                    
                    # Add optional properties
                    if "chunk_ids" in props:
                        query += ", r.chunk_ids = $chunk_ids"
                        
                    query += " RETURN r"
                    
                    result = session.run(query, props)
                    summary = result.consume()
                    count += summary.counters.relationships_created
                    
                except Exception as e:
                    self.logger.error(f"Error importing relationship {rel.get('source')} -> {rel.get('target')}: {str(e)}")
            
        self.logger.info(f"Imported {count} relationships successfully")
        return count
    
    def import_claims(self, claims: List[Dict[str, Any]]) -> int:
        """
        Import claims into Neo4j
        
        Args:
            claims: List of claim dictionaries
            
        Returns:
            int: Number of claims successfully imported
        """
        if not self.driver:
            self.logger.error("Not connected to Neo4j")
            return 0
            
        count = 0
        with self.driver.session(database=self.database) as session:
            for claim in claims:
                try:
                    # Generate a unique ID for the claim
                    claim_id = f"{claim['subject']}_{claim.get('type', 'CLAIM')}_{hash(claim.get('description', ''))}"
                    
                    # Prepare properties
                    props = {
                        "id": claim_id,
                        "subject": claim["subject"],
                        "type": claim.get("type", "GENERAL"),
                        "status": claim.get("status", "UNKNOWN"),
                        "description": claim.get("description", ""),
                        "confidence": claim.get("confidence", 0.5)
                    }
                    
                    # Add optional properties
                    if "source_text" in claim and claim["source_text"]:
                        props["source_text"] = claim["source_text"]
                        
                    if "start_date" in claim and claim["start_date"]:
                        props["start_date"] = claim["start_date"]
                        
                    if "end_date" in claim and claim["end_date"]:
                        props["end_date"] = claim["end_date"]
                        
                    if "chunk_ids" in claim and claim["chunk_ids"]:
                        props["chunk_ids"] = claim["chunk_ids"]
                    
                    # Create the claim node and connect to subject entity
                    query = """
                    MATCH (subject:Entity {name: $subject})
                    MERGE (c:Claim {id: $id})
                    ON CREATE SET
                        c.type = $type,
                        c.status = $status,
                        c.description = $description,
                        c.confidence = $confidence,
                        c.created_at = timestamp()
                    ON MATCH SET
                        c.type = $type,
                        c.status = $status,
                        c.description = $description,
                        c.confidence = $confidence,
                        c.updated_at = timestamp()
                    """
                    
                    # Add optional properties
                    optional_props = ["source_text", "start_date", "end_date", "chunk_ids"]
                    for prop in optional_props:
                        if prop in props:
                            query += f", c.{prop} = ${prop}"
                    
                    # Create relationship from subject to claim
                    query += """
                    MERGE (subject)-[r:HAS_CLAIM]->(c)
                    """
                    
                    # If there's an object entity, connect the claim to it
                    if claim.get("object"):
                        props["object"] = claim["object"]
                        query += """
                        WITH c
                        MATCH (object:Entity {name: $object})
                        MERGE (c)-[r2:REFERS_TO]->(object)
                        """
                    
                    query += " RETURN c"
                    
                    result = session.run(query, props)
                    summary = result.consume()
                    count += summary.counters.nodes_created
                    
                except Exception as e:
                    self.logger.error(f"Error importing claim about {claim.get('subject')}: {str(e)}")
            
        self.logger.info(f"Imported {count} claims successfully")
        return count
    
    def import_knowledge_graph(self, entities_file: str, relationships_file: str, claims_file: str = None) -> Dict[str, int]:
        """
        Import a complete knowledge graph from files
        
        Args:
            entities_file: Path to entities JSON file
            relationships_file: Path to relationships JSON file
            claims_file: Path to claims JSON file (optional)
            
        Returns:
            Dict containing counts of imported elements
        """
        # Create constraints first
        self.create_constraints()
        
        # Load and import entities
        with open(entities_file, 'r', encoding='utf-8') as f:
            entities = json.load(f)
        entity_count = self.import_entities(entities)
        
        # Load and import relationships
        with open(relationships_file, 'r', encoding='utf-8') as f:
            relationships = json.load(f)
        relationship_count = self.import_relationships(relationships)
        
        # Load and import claims if provided
        claim_count = 0
        if claims_file:
            with open(claims_file, 'r', encoding='utf-8') as f:
                claims = json.load(f)
            claim_count = self.import_claims(claims)
        
        return {
            "entities": entity_count,
            "relationships": relationship_count,
            "claims": claim_count
        }
    
    def get_entity_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve an entity by name
        
        Args:
            name: Entity name
            
        Returns:
            Entity dictionary or None if not found
        """
        if not self.driver:
            self.logger.error("Not connected to Neo4j")
            return None
            
        try:
            with self.driver.session(database=self.database) as session:
                result = session.run(
                    "MATCH (e:Entity {name: $name}) RETURN e",
                    {"name": name}
                )
                record = result.single()
                if record:
                    return dict(record["e"])
                return None
        except Exception as e:
            self.logger.error(f"Error retrieving entity {name}: {str(e)}")
            return None
    
    def get_related_entities(self, entity_name: str, max_distance: int = 2) -> List[Dict[str, Any]]:
        """
        Get entities related to a given entity
        
        Args:
            entity_name: Name of the entity
            max_distance: Maximum relationship distance (default: 2)
            
        Returns:
            List of related entity dictionaries
        """
        if not self.driver:
            self.logger.error("Not connected to Neo4j")
            return []
            
        try:
            with self.driver.session(database=self.database) as session:
                query = f"""
                MATCH (e:Entity {{name: $name}})-[*1..{max_distance}]-(related:Entity)
                RETURN DISTINCT related, count(*) as connection_strength
                ORDER BY connection_strength DESC
                """
                result = session.run(query, {"name": entity_name})
                
                related_entities = []
                for record in result:
                    entity_data = dict(record["related"])
                    entity_data["connection_strength"] = record["connection_strength"]
                    related_entities.append(entity_data)
                
                return related_entities
        except Exception as e:
            self.logger.error(f"Error retrieving related entities for {entity_name}: {str(e)}")
            return []
    
    def get_entities_by_type(self, entity_type: str) -> List[Dict[str, Any]]:
        """
        Get all entities of a specific type
        
        Args:
            entity_type: The entity type to filter by
            
        Returns:
            List of entity dictionaries
        """
        if not self.driver:
            self.logger.error("Not connected to Neo4j")
            return []
            
        try:
            with self.driver.session(database=self.database) as session:
                result = session.run(
                    "MATCH (e:Entity {type: $type}) RETURN e",
                    {"type": entity_type}
                )
                
                entities = []
                for record in result:
                    entities.append(dict(record["e"]))
                
                return entities
        except Exception as e:
            self.logger.error(f"Error retrieving entities of type {entity_type}: {str(e)}")
            return []
    
    def get_entity_claims(self, entity_name: str) -> List[Dict[str, Any]]:
        """
        Get all claims related to an entity
        
        Args:
            entity_name: Name of the entity
            
        Returns:
            List of claim dictionaries
        """
        if not self.driver:
            self.logger.error("Not connected to Neo4j")
            return []
            
        try:
            with self.driver.session(database=self.database) as session:
                query = """
                MATCH (e:Entity {name: $name})-[:HAS_CLAIM]->(c:Claim)
                RETURN c
                UNION
                MATCH (c:Claim)-[:REFERS_TO]->(e:Entity {name: $name})
                RETURN c
                """
                result = session.run(query, {"name": entity_name})
                
                claims = []
                for record in result:
                    claims.append(dict(record["c"]))
                
                return claims
        except Exception as e:
            self.logger.error(f"Error retrieving claims for entity {entity_name}: {str(e)}")
            return []
    
    def run_custom_query(self, query: str, params: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """
        Run a custom Cypher query
        
        Args:
            query: Cypher query string
            params: Query parameters
            
        Returns:
            List of result dictionaries
        """
        if not self.driver:
            self.logger.error("Not connected to Neo4j")
            return []
            
        try:
            with self.driver.session(database=self.database) as session:
                result = session.run(query, params or {})
                return [dict(record) for record in result]
        except Exception as e:
            self.logger.error(f"Error running custom query: {str(e)}")
            return []
