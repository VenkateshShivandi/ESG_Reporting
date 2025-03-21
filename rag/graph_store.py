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

    def detect_communities(
        self, 
        algorithm: str = "louvain",
        store_results: bool = True,
        min_community_size: int = 3,
        resolution: float = 1.0,
        max_levels: int = 10,
        weight_property: str = "strength",
        verbose: bool = True
    ) -> Dict[str, Any]:
        """
        Detect communities in the graph using Neo4j Graph Data Science library.
        
        Args:
            algorithm: Community detection algorithm ("louvain", "leiden", or "label_propagation")
            store_results: Whether to store community assignments in Neo4j
            min_community_size: Minimum number of nodes for a community to be considered
            resolution: Resolution parameter for Louvain/Leiden algorithm (higher values = smaller communities)
            max_levels: Maximum number of iterations for the algorithm
            weight_property: Relationship property to use as edge weight
            verbose: Whether to print detailed statistics during detection
            
        Returns:
            Dict containing community structure and statistics
        """
        if not self.driver:
            self.logger.error("Not connected to Neo4j")
            return {"error": "Not connected to Neo4j"}
        
        # Configure logging
        log_header = f"\n{'='*20} COMMUNITY DETECTION {'='*20}"
        self.logger.info(log_header)
        self.logger.info(f"Algorithm: {algorithm}")
        self.logger.info(f"Resolution: {resolution}")
        self.logger.info(f"Min community size: {min_community_size}")
        self.logger.info(f"Max levels: {max_levels}")
        if verbose:
            print(log_header)
            print(f"Algorithm: {algorithm}")
            print(f"Resolution: {resolution}")
            print(f"Min community size: {min_community_size}")
            print(f"Max levels: {max_levels}")
        
        try:
            with self.driver.session(database=self.database) as session:
                # Check if GDS is available
                gds_available = self._check_gds_available(session)
                if not gds_available:
                    error_msg = "Neo4j Graph Data Science library is not available. Please install it in your Neo4j instance."
                    self.logger.error(error_msg)
                    return {"error": error_msg}
                
                # Get graph statistics before community detection
                graph_stats = self._get_graph_statistics(session)
                
                # Create in-memory graph projection for GDS
                graph_name = "community_detection_graph"
                projection_result = self._create_graph_projection(
                    session, 
                    graph_name, 
                    weight_property
                )
                
                if "error" in projection_result:
                    return projection_result
                
                # Run community detection algorithm
                community_result = self._run_community_detection(
                    session,
                    graph_name,
                    algorithm,
                    resolution,
                    max_levels,
                    min_community_size,
                    weight_property,
                    store_results,
                    verbose
                )
                
                # Clean up the projected graph
                self._drop_graph_projection(session, graph_name)
                
                # Combine all results
                result = {
                    "algorithm": algorithm,
                    "resolution": resolution,
                    "min_community_size": min_community_size,
                    "max_levels": max_levels,
                    "graph": graph_stats,
                    "communities": community_result
                }
                
                # Log completion
                self.logger.info(f"Community detection complete using GDS {algorithm} algorithm")
                self.logger.info(f"{'='*60}")
                
                return result
        
        except Exception as e:
            self.logger.error(f"Error in GDS community detection: {str(e)}")
            import traceback
            self.logger.error(traceback.format_exc())
            return {"error": str(e)}

    def _check_gds_available(self, session) -> bool:
        """
        Check if Neo4j Graph Data Science library is available
        
        Args:
            session: Neo4j session
            
        Returns:
            bool: True if GDS is available, False otherwise
        """
        try:
            result = session.run("CALL gds.list() YIELD name RETURN count(*) AS count")
            record = result.single()
            return record is not None
        except Exception:
            return False

    def _get_graph_statistics(self, session) -> Dict[str, Any]:
        """
        Get basic statistics about the graph
        
        Args:
            session: Neo4j session
            
        Returns:
            Dict with graph statistics
        """
        try:
            # Count nodes
            node_result = session.run("MATCH (n:Entity) RETURN count(n) AS nodeCount")
            node_count = node_result.single()["nodeCount"]
            
            # Count relationships
            rel_result = session.run("MATCH ()-[r]->() RETURN count(r) AS relCount")
            rel_count = rel_result.single()["relCount"]
            
            # Count entity types
            type_result = session.run("""
                MATCH (n:Entity)
                RETURN n.type AS type, count(*) AS count
                ORDER BY count DESC
            """)
            node_types = {record["type"]: record["count"] for record in type_result}
            
            # Calculate density (approximation)
            density = 0
            if node_count > 1:
                density = (2 * rel_count) / (node_count * (node_count - 1))
            
            # Get average degree without requiring APOC
            try:
                # First try with APOC if available
                deg_result = session.run("""
                    MATCH (n)
                    RETURN avg(apoc.node.degree(n)) AS avgDegree
                """)
                record = deg_result.single()
                avg_degree = record["avgDegree"] if record else 0
            except Exception as e:
                self.logger.info(f"APOC not available for degree calculation, using alternative: {str(e)}")
                # Use COUNT instead of size() with a pattern expression (neo4j 4.x+ compatible)
                deg_result = session.run("""
                    MATCH (n)
                    OPTIONAL MATCH (n)-[r]-()
                    WITH n, COUNT(r) AS degree
                    RETURN avg(degree) AS avgDegree
                """)
                record = deg_result.single()
                avg_degree = record["avgDegree"] if record else 0
            
            return {
                "nodes": node_count,
                "edges": rel_count,
                "density": density,
                "avg_degree": avg_degree,
                "node_types": node_types
            }
        except Exception as e:
            self.logger.warning(f"Error getting graph statistics: {str(e)}")
            return {
                "nodes": 0,
                "edges": 0,
                "density": 0,
                "avg_degree": 0,
                "node_types": {}
            }

    def _create_graph_projection(
        self, 
        session, 
        graph_name: str, 
        weight_property: str = "strength"
    ) -> Dict[str, Any]:
        """
        Create a named graph projection for GDS algorithms
        
        Args:
            session: Neo4j session
            graph_name: Name for the projected graph
            weight_property: Relationship property to use as weight
            
        Returns:
            Dict with projection results or error
        """
        try:
            # First, check if graph already exists and drop it
            self._drop_graph_projection(session, graph_name)
            
            # Create native projection including all relevant node labels and relationship types
            query = f"""
            CALL gds.graph.project(
                '{graph_name}',
                'Entity',
                '*',
                {{
                    relationshipProperties: {{
                        {weight_property}: {{
                            property: '{weight_property}',
                            defaultValue: 1.0
                        }}
                    }}
                }}
            ) YIELD nodeCount, relationshipCount, projectMillis
            """
            
            result = session.run(query)
            record = result.single()
            
            self.logger.info(f"Created graph projection '{graph_name}' with {record['nodeCount']} nodes and {record['relationshipCount']} relationships in {record['projectMillis']}ms")
            
            return {
                "name": graph_name,
                "nodes": record["nodeCount"],
                "relationships": record["relationshipCount"],
                "creation_time_ms": record["projectMillis"]
            }
            
        except Exception as e:
            error_msg = f"Error creating graph projection: {str(e)}"
            self.logger.error(error_msg)
            return {"error": error_msg}

    def _drop_graph_projection(self, session, graph_name: str) -> None:
        """
        Drop a named graph projection if it exists
        
        Args:
            session: Neo4j session
            graph_name: Name of the projected graph
        """
        try:
            # Check if graph exists first
            check_query = f"""
            CALL gds.graph.exists('{graph_name}') 
            YIELD exists
            RETURN exists
            """
            result = session.run(check_query)
            record = result.single()
            
            if record and record["exists"]:
                # Use the newer syntax to avoid the deprecation warning about 'schema' field
                # Explicitly YIELD only the fields we need
                session.run(f"""
                CALL gds.graph.drop('{graph_name}', false) 
                YIELD graphName
                """)
                self.logger.info(f"Dropped graph projection '{graph_name}'")
            else:
                self.logger.info(f"Graph projection '{graph_name}' does not exist, no need to drop")
                
        except Exception as e:
            self.logger.warning(f"Error dropping graph projection: {str(e)}")

    def _run_community_detection(
        self, 
        session,
        graph_name: str,
        algorithm: str = "louvain",
        resolution: float = 1.0,
        max_levels: int = 10,
        min_community_size: int = 3,
        weight_property: str = "strength",
        store_results: bool = True,
        verbose: bool = True
    ) -> Dict[str, Any]:
        """
        Run community detection algorithm using GDS
        
        Args:
            session: Neo4j session
            graph_name: Name of the projected graph
            algorithm: Community detection algorithm
            resolution: Resolution parameter
            max_levels: Maximum iterations/levels
            min_community_size: Minimum community size
            weight_property: Relationship weight property
            store_results: Whether to store results in Neo4j
            verbose: Whether to print detailed outputs
            
        Returns:
            Dict with community detection results
        """
        algorithm = algorithm.lower()
        
        try:
            # Choose algorithm and parameters
            if algorithm == "louvain":
                return self._run_louvain(
                    session, 
                    graph_name, 
                    resolution, 
                    max_levels, 
                    min_community_size,
                    weight_property,
                    store_results,
                    verbose
                )
            elif algorithm == "leiden":
                return self._run_leiden(
                    session, 
                    graph_name, 
                    resolution, 
                    max_levels, 
                    min_community_size,
                    weight_property,
                    store_results,
                    verbose
                )
            elif algorithm == "label_propagation":
                return self._run_label_propagation(
                    session, 
                    graph_name, 
                    max_levels, 
                    min_community_size,
                    weight_property,
                    store_results,
                    verbose
                )
            else:
                error_msg = f"Unsupported algorithm: {algorithm}. Use 'louvain', 'leiden', or 'label_propagation'"
                self.logger.error(error_msg)
                return {"error": error_msg}
        
        except Exception as e:
            error_msg = f"Error running community detection: {str(e)}"
            self.logger.error(error_msg)
            return {"error": error_msg}

    def _run_louvain(
        self, 
        session,
        graph_name: str,
        resolution: float = 1.0,
        max_levels: int = 10,
        min_community_size: int = 3,
        weight_property: str = "strength",
        store_results: bool = True,
        verbose: bool = True
    ) -> Dict[str, Any]:
        """
        Run Louvain community detection using GDS
        """
        self.logger.info(f"Running Louvain community detection (resolution={resolution}, maxLevels={max_levels})")
        if verbose:
            print(f"\nRunning Louvain community detection algorithm...")
        
        # Determine which mode to use based on whether storage is requested
        mode = "write" if store_results else "stats"
        
        # Build the query with more version compatibility
        if mode == "write":
            # For write mode, we need to specify writeProperty (required in newer GDS versions)
            base_query = f"""
            CALL gds.louvain.{mode}(
                '{graph_name}',
                {{
                    relationshipWeightProperty: '{weight_property}',
                    maxLevels: {max_levels},
                    minCommunitySize: {min_community_size},
                    gamma: {resolution},
                    tolerance: 0.0001,
                    includeIntermediateCommunities: true,
                    writeProperty: 'community'
                }}
            )
            """
        else:
            # For stats mode, no writeProperty needed
            base_query = f"""
            CALL gds.louvain.{mode}(
                '{graph_name}',
                {{
                    relationshipWeightProperty: '{weight_property}',
                    maxLevels: {max_levels},
                    minCommunitySize: {min_community_size},
                    gamma: {resolution},
                    tolerance: 0.0001,
                    includeIntermediateCommunities: true
                }}
            )
            """
        
        # Try different yield fields to handle different GDS versions
        versions_to_try = []
        
        if mode == "write":
            # First try newer version output fields
            versions_to_try.append({
                "suffix": """
                YIELD communityCount, modularity, modularities, ranLevels, 
                nodePropertiesWritten, computeMillis
                """,
                "time_field": "computeMillis"
            })
            # Then try older version
            versions_to_try.append({
                "suffix": """
                YIELD communityCount, modularity, modularities, ranLevels, 
                nodePropertiesWritten
                """,
                "time_field": None  # No time field in this version
            })
        else:
            # Stats mode versions
            versions_to_try.append({
                "suffix": """
                YIELD communityCount, modularity, modularities, ranLevels, computeMillis
                """,
                "time_field": "computeMillis"
            })
            versions_to_try.append({
                "suffix": """
                YIELD communityCount, modularity, modularities, ranLevels
                """,
                "time_field": None
            })
        
        record = None
        execution_time = 0
        error_messages = []
        
        # Try all version combinations
        for version in versions_to_try:
            try:
                query = base_query + version["suffix"]
                
                if verbose:
                    print(f"Trying query: {query}")
                
                result = session.run(query)
                record = result.single()
                
                # Get execution time if available
                if version["time_field"] and version["time_field"] in record:
                    execution_time = record[version["time_field"]]
                
                # If we get here, query was successful
                break
                
            except Exception as e:
                error_messages.append(str(e))
                self.logger.warning(f"Query attempt failed: {str(e)}")
                continue
        
        # If all attempts failed
        if record is None:
            error_details = "\n".join(error_messages)
            self.logger.error(f"All Louvain query attempts failed:\n{error_details}")
            return {"error": f"Louvain algorithm failed with multiple attempts. Latest error: {error_messages[-1] if error_messages else 'Unknown error'}"}
        
        # Get community distribution after running the algorithm
        if store_results:
            community_sizes = self._get_community_distribution(session)
            community_nodes = self._get_top_community_nodes(session, 5)
        else:
            community_sizes = {"not_stored": True}
            community_nodes = {"not_stored": True}
        
        levels_info = {}
        if "modularities" in record and record["modularities"]:
            for level in range(len(record["modularities"])):
                levels_info[f"level_{level}"] = {
                    "modularity": record["modularities"][level]
                }
        
        result_data = {
            "communityCount": record["communityCount"],
            "modularity": record["modularity"],
            "ranLevels": record["ranLevels"] if "ranLevels" in record else 0,
            "executionTimeMs": execution_time,
            "levels": levels_info,
            "communitySizes": community_sizes,
            "topCommunities": community_nodes
        }
        
        if verbose:
            print(f"Louvain completed: {record['communityCount']} communities detected")
            print(f"Modularity: {record['modularity']:.4f}")
            print(f"Levels computed: {result_data['ranLevels']}")
            if "nodePropertiesWritten" in record:
                print(f"Properties written to {record['nodePropertiesWritten']} nodes")
        
        return result_data

    def _run_leiden(
        self,
        session,
        graph_name: str,
        resolution: float = 1.0,
        max_iterations: int = 10,
        min_community_size: int = 3,
        weight_property: str = "strength",
        store_results: bool = True,
        verbose: bool = True
    ) -> Dict[str, Any]:
        """
        Run Leiden community detection using GDS
        
        Args:
            session: Neo4j session
            graph_name: Name of the projected graph
            resolution: Resolution parameter
            max_iterations: Maximum iterations
            min_community_size: Minimum community size
            weight_property: Relationship weight property
            store_results: Whether to store results in Neo4j
            verbose: Whether to print detailed outputs
            
        Returns:
            Dict with Leiden results
        """
        self.logger.info(f"Running Leiden community detection (resolution={resolution}, maxIterations={max_iterations})")
        if verbose:
            print(f"\nRunning Leiden community detection algorithm...")
        
        # Check if Leiden is available (only in GDS 2.0+)
        try:
            session.run("CALL gds.leiden.list()")
        except Exception:
            error_msg = "Leiden algorithm not available in this Neo4j GDS version. Please use Louvain instead or upgrade GDS."
            self.logger.error(error_msg)
            return {"error": error_msg}
        
        # Determine which mode to use based on whether storage is requested
        mode = "write" if store_results else "stats"
        
        # Build the query with more version compatibility
        if mode == "write":
            # For write mode, we need to specify writeProperty
            base_query = f"""
            CALL gds.leiden.{mode}(
                '{graph_name}',
                {{
                    relationshipWeightProperty: '{weight_property}',
                    maxIterations: {max_iterations},
                    minCommunitySize: {min_community_size},
                    gamma: {resolution},
                    theta: 0.01,
                    writeProperty: 'community'
                }}
            )
            """
        else:
            # For stats mode, no writeProperty needed
            base_query = f"""
            CALL gds.leiden.{mode}(
                '{graph_name}',
                {{
                    relationshipWeightProperty: '{weight_property}',
                    maxIterations: {max_iterations},
                    minCommunitySize: {min_community_size},
                    gamma: {resolution},
                    theta: 0.01
                }}
            )
            """
        
        # Try different yield fields to handle different GDS versions
        versions_to_try = []
        
        if mode == "write":
            # Try different combinations of output fields
            versions_to_try.append({
                "suffix": """
                YIELD communityCount, modularity, ranIterations, didConverge,
                nodePropertiesWritten, computeMillis
                """,
                "time_field": "computeMillis"
            })
            versions_to_try.append({
                "suffix": """
                YIELD communityCount, modularity, ranIterations, didConverge,
                nodePropertiesWritten
                """,
                "time_field": None
            })
        else:
            # Stats mode versions
            versions_to_try.append({
                "suffix": """
                YIELD communityCount, modularity, ranIterations, didConverge, computeMillis
                """,
                "time_field": "computeMillis"
            })
            versions_to_try.append({
                "suffix": """
                YIELD communityCount, modularity, ranIterations, didConverge
                """,
                "time_field": None
            })
        
        record = None
        execution_time = 0
        error_messages = []
        
        # Try all version combinations
        for version in versions_to_try:
            try:
                query = base_query + version["suffix"]
                
                if verbose:
                    print(f"Trying query: {query}")
                
                result = session.run(query)
                record = result.single()
                
                # Get execution time if available
                if version["time_field"] and version["time_field"] in record:
                    execution_time = record[version["time_field"]]
                
                # If we get here, query was successful
                break
                
            except Exception as e:
                error_messages.append(str(e))
                self.logger.warning(f"Query attempt failed: {str(e)}")
                continue
        
        # If all attempts failed
        if record is None:
            error_details = "\n".join(error_messages)
            self.logger.error(f"All Leiden query attempts failed:\n{error_details}")
            return {"error": f"Leiden algorithm failed with multiple attempts. Latest error: {error_messages[-1] if error_messages else 'Unknown error'}"}
        
        # Get community distribution after running the algorithm
        if store_results:
            community_sizes = self._get_community_distribution(session)
            community_nodes = self._get_top_community_nodes(session, 5)
        else:
            community_sizes = {"not_stored": True}
            community_nodes = {"not_stored": True}
        
        result_data = {
            "communityCount": record["communityCount"],
            "modularity": record["modularity"],
            "ranIterations": record["ranIterations"] if "ranIterations" in record else 0,
            "didConverge": record["didConverge"] if "didConverge" in record else False,
            "executionTimeMs": execution_time,
            "communitySizes": community_sizes,
            "topCommunities": community_nodes
        }
        
        if verbose:
            print(f"Leiden completed: {record['communityCount']} communities detected")
            print(f"Modularity: {record['modularity']:.4f}")
            print(f"Iterations: {result_data['ranIterations']} (converged: {result_data['didConverge']})")
            if "nodePropertiesWritten" in record:
                print(f"Properties written to {record['nodePropertiesWritten']} nodes")
        
        return result_data

    def _run_label_propagation(
        self,
        session,
        graph_name: str,
        max_iterations: int = 10,
        min_community_size: int = 3,
        weight_property: str = "strength",
        store_results: bool = True,
        verbose: bool = True
    ) -> Dict[str, Any]:
        """
        Run Label Propagation community detection using GDS
        
        Args:
            session: Neo4j session
            graph_name: Name of the projected graph
            max_iterations: Maximum iterations
            min_community_size: Minimum community size
            weight_property: Relationship weight property
            store_results: Whether to store results in Neo4j
            verbose: Whether to print detailed outputs
            
        Returns:
            Dict with Label Propagation results
        """
        self.logger.info(f"Running Label Propagation community detection (maxIterations={max_iterations})")
        if verbose:
            print(f"\nRunning Label Propagation community detection algorithm...")
        
        # Determine which mode to use based on whether storage is requested
        mode = "write" if store_results else "stats"
        
        # Build the query with more version compatibility
        if mode == "write":
            # For write mode, we need to specify writeProperty
            base_query = f"""
            CALL gds.labelPropagation.{mode}(
                '{graph_name}',
                {{
                    relationshipWeightProperty: '{weight_property}',
                    maxIterations: {max_iterations},
                    writeProperty: 'community'
                }}
            )
            """
        else:
            # For stats mode, no writeProperty needed
            base_query = f"""
            CALL gds.labelPropagation.{mode}(
                '{graph_name}',
                {{
                    relationshipWeightProperty: '{weight_property}',
                    maxIterations: {max_iterations}
                }}
            )
            """
        
        # Try different yield fields to handle different GDS versions
        versions_to_try = []
        
        if mode == "write":
            # Try different combinations of output fields
            versions_to_try.append({
                "suffix": """
                YIELD communityCount, didConverge, ranIterations,
                nodePropertiesWritten, computeMillis
                """,
                "time_field": "computeMillis"
            })
            versions_to_try.append({
                "suffix": """
                YIELD communityCount, didConverge, ranIterations,
                nodePropertiesWritten
                """,
                "time_field": None
            })
        else:
            versions_to_try.append({
                "suffix": """
                YIELD communityCount, didConverge, ranIterations, computeMillis
                """,
                "time_field": "computeMillis"
            })
            versions_to_try.append({
                "suffix": """
                YIELD communityCount, didConverge, ranIterations
                """,
                "time_field": None
            })
        
        record = None
        execution_time = 0
        error_messages = []
        
        # Try all version combinations
        for version in versions_to_try:
            try:
                query = base_query + version["suffix"]
                
                if verbose:
                    print(f"Trying query: {query}")
                
                result = session.run(query)
                record = result.single()
                
                # Get execution time if available
                if version["time_field"] and version["time_field"] in record:
                    execution_time = record[version["time_field"]]
                
                # If we get here, query was successful
                break
                
            except Exception as e:
                error_messages.append(str(e))
                self.logger.warning(f"Query attempt failed: {str(e)}")
                continue
        
        # If all attempts failed
        if record is None:
            error_details = "\n".join(error_messages)
            self.logger.error(f"All Label Propagation query attempts failed:\n{error_details}")
            return {"error": f"Label Propagation algorithm failed with multiple attempts. Latest error: {error_messages[-1] if error_messages else 'Unknown error'}"}
        
        # Get community distribution after running the algorithm
        if store_results:
            community_sizes = self._get_community_distribution(session)
            community_nodes = self._get_top_community_nodes(session, 5)
        else:
            community_sizes = {"not_stored": True}
            community_nodes = {"not_stored": True}
        
        result_data = {
            "communityCount": record["communityCount"],
            "ranIterations": record["ranIterations"] if "ranIterations" in record else 0,
            "didConverge": record["didConverge"] if "didConverge" in record else False,
            "executionTimeMs": execution_time, 
            "communitySizes": community_sizes,
            "topCommunities": community_nodes
        }
        
        if verbose:
            print(f"Label Propagation completed: {record['communityCount']} communities detected")
            print(f"Iterations: {result_data['ranIterations']} (converged: {result_data['didConverge']})")
            if "nodePropertiesWritten" in record:
                print(f"Properties written to {record['nodePropertiesWritten']} nodes")
        
        return result_data

    def _get_community_distribution(self, session) -> Dict[str, Any]:
        """
        Get distribution of community sizes after running community detection
        
        Args:
            session: Neo4j session
            
        Returns:
            Dict with community size statistics
        """
        try:
            # Query community sizes
            query = """
            MATCH (n:Entity)
            WHERE n.community IS NOT NULL
            RETURN n.community AS community, count(*) AS size
            ORDER BY size DESC
            """
            
            result = session.run(query)
            community_sizes = {str(record["community"]): record["size"] for record in result}
            
            # Calculate size distribution
            sizes = list(community_sizes.values())
            if not sizes:
                return {"no_communities_found": True}
            
            size_ranges = {
                "1": 0,
                "2-5": 0,
                "6-10": 0,
                "11-20": 0,
                "21-50": 0,
                "51-100": 0,
                "101+": 0
            }
            
            for size in sizes:
                if size == 1:
                    size_ranges["1"] += 1
                elif size <= 5:
                    size_ranges["2-5"] += 1
                elif size <= 10:
                    size_ranges["6-10"] += 1
                elif size <= 20:
                    size_ranges["11-20"] += 1
                elif size <= 50:
                    size_ranges["21-50"] += 1
                elif size <= 100:
                    size_ranges["51-100"] += 1
                else:
                    size_ranges["101+"] += 1
            
            return {
                "total_communities": len(community_sizes),
                "largest_size": max(sizes) if sizes else 0,
                "smallest_size": min(sizes) if sizes else 0,
                "average_size": sum(sizes) / len(sizes) if sizes else 0,
                "size_distribution": size_ranges,
                "community_sizes": community_sizes
            }
            
        except Exception as e:
            self.logger.warning(f"Error getting community distribution: {str(e)}")
            return {"error": str(e)}

    def _get_top_community_nodes(self, session, num_communities: int = 5) -> Dict[str, Any]:
        """
        Get sample nodes from top communities
        
        Args:
            session: Neo4j session
            num_communities: Number of top communities to analyze
            
        Returns:
            Dict with community nodes information
        """
        try:
            # Get top communities by size
            query = """
            MATCH (n:Entity)
            WHERE n.community IS NOT NULL
            WITH n.community AS community, count(*) AS size
            ORDER BY size DESC
            LIMIT $num_communities
            RETURN community, size
            """
            
            result = session.run(query, {"num_communities": num_communities})
            top_communities = [(record["community"], record["size"]) for record in result]
            
            community_nodes = {}
            for comm_id, size in top_communities:
                # Get node types in this community
                type_query = """
                MATCH (n:Entity {community: $community})
                RETURN n.type AS type, count(*) AS count
                ORDER BY count DESC
                """
                
                type_result = session.run(type_query, {"community": comm_id})
                type_counts = {record["type"]: record["count"] for record in type_result}
                
                # Get sample nodes
                sample_query = """
                MATCH (n:Entity {community: $community})
                RETURN n.name AS name, n.type AS type
                LIMIT 5
                """
                
                sample_result = session.run(sample_query, {"community": comm_id})
                sample_nodes = [{"name": record["name"], "type": record["type"]} for record in sample_result]
                
                community_nodes[str(comm_id)] = {
                    "size": size,
                    "type_distribution": type_counts,
                    "sample_nodes": sample_nodes
                }
            
            return community_nodes
            
        except Exception as e:
            self.logger.warning(f"Error getting top community nodes: {str(e)}")
            return {"error": str(e)}
