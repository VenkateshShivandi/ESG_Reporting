# This file is used to initialize the Neo4j database and also setup organization and user nodes to build dynamic subgraphs to perform RAG on them.

from neo4j import GraphDatabase
from dotenv import load_dotenv
import os
import subprocess
from typing import Optional
from neo4j import Driver, Session

load_dotenv(".env.local")

# Initialize Neo4j client
neo4j_uri = os.getenv("NEO4J_URI")
neo4j_username = os.getenv("NEO4J_USERNAME")
neo4j_password = os.getenv("NEO4J_PASSWORD")

# Initialize Neo4j client
driver = GraphDatabase.driver(neo4j_uri, auth=(neo4j_username, neo4j_password))


class Neo4jGraphInitializer:
    """
    Class to manage Neo4j Docker initialization and graph setup for org/user nodes.
    """

    def __init__(
        self,
        containerName: str = "esg-neo4j",
        image: str = "neo4j:latest",
        gdsVersion: str = "2.5.0",
        port: int = 7687,
        uri: str = "bolt://localhost:7687",
    ):
        self.containerName = containerName
        self.image = image
        self.gdsVersion = gdsVersion
        self.port = port
        self.uri = uri
        self.driver = None
        self.entities = None
        self.relationships = None

    @staticmethod
    def wait_for_neo4j(port: int = 7687, max_attempts: int = 30) -> bool:
        """
        Wait for Neo4j to be ready to accept connections.
        Args:
            port: The port Neo4j is running on
            max_attempts: Maximum number of attempts to connect
        Returns:
            bool: True if Neo4j is ready, False otherwise
        """
        import time
        import socket

        print(f"Waiting for Neo4j to be ready on port {port}...")
        for attempt in range(max_attempts):
            try:
                # Try to establish a TCP connection
                with socket.create_connection(("localhost", port), timeout=1.0):
                    # If we get here, the connection was successful
                    # Wait a bit more to ensure Neo4j is fully initialized
                    time.sleep(2)
                    print(f"Neo4j is ready on port {port}")
                    return True
            except (socket.timeout, ConnectionRefusedError):
                if attempt < max_attempts - 1:  # Don't sleep on the last attempt
                    time.sleep(1)
                continue
            except Exception as e:
                print(f"Unexpected error while waiting for Neo4j: {e}")
                return False

        print(f"Neo4j did not become ready after {max_attempts} attempts")
        return False

    @staticmethod
    def startNeo4jDockerContainer(
        containerName: str = "esg-neo4j-test",
        image: str = "neo4j:latest",
        gdsVersion: str = "2.5.0",
        port: int = 7687,
    ) -> bool:
        """
        Start a Neo4j Docker container with GDS and no authentication.
        If container exists but not running, removes it and creates new.
        If running, uses existing container.

        Args:
            containerName: Name for the Docker container
            image: Neo4j Docker image
            gdsVersion: Version of GDS plugin to use
            port: Host port to map to Neo4j's Bolt port

        Returns:
            bool: True if container started and Neo4j is ready, False otherwise
        """
        # Check if container is running
        running = subprocess.run(
            ["docker", "ps", "-q", "-f", f"name={containerName}"],
            capture_output=True,
            text=True,
        )

        if running.stdout.strip():
            print(f"Neo4j Docker container '{containerName}' is already running.")
            return Neo4jGraphInitializer.wait_for_neo4j(port)

        # Check if container exists but not running
        exists = subprocess.run(
            ["docker", "ps", "-aq", "-f", f"name={containerName}"],
            capture_output=True,
            text=True,
        )

        if exists.stdout.strip():
            print(f"Removing existing stopped container '{containerName}'")
            subprocess.run(["docker", "rm", "-f", containerName], check=True)

        container_started = False
        try:
            subprocess.run(
                [
                    "docker",
                    "run",
                    "-d",
                    "--name",
                    containerName,
                    "-p",
                    f"{port}:7687",
                    "-p",
                    "7474:7474",
                    "-e",
                    "NEO4J_AUTH=none",
                    "-e",
                    f'NEO4J_PLUGINS="["graph-data-science"]"',
                    "-e",
                    "NEO4J_dbms_memory_pagecache_size=1G",
                    "-e",
                    "NEO4J_dbms_memory_heap_initial__size=1G",
                    "-e",
                    "NEO4J_dbms_memory_heap_max__size=1G",
                    image,
                ],
                check=True,
            )
            container_started = True
            print(f"Started Neo4j Docker container '{containerName}' on port {port}.")
        except subprocess.CalledProcessError as e:
            print(f"Error starting Neo4j container: {str(e)}")
            # If container creation fails, try with a random suffix
            import uuid

            new_container_name = f"{containerName}-{str(uuid.uuid4())[:8]}"
            print(f"Retrying with random container name: {new_container_name}")
            try:
                subprocess.run(
                    [
                        "docker",
                        "run",
                        "-d",
                        "--name",
                        new_container_name,
                        "-p",
                        f"{port}:7687",
                        "-p",
                        "7474:7474",
                        "-e",
                        "NEO4J_AUTH=none",
                        "-e",
                        f'NEO4JLABS_PLUGINS=["graph-data-science"]',
                        "-e",
                        f'NEO4J_PLUGINS="["apoc","graph-data-science"]"',
                        "-e",
                        "NEO4J_dbms_memory_pagecache_size=1G",
                        "-e",
                        "NEO4J_dbms_memory_heap_initial__size=1G",
                        "-e",
                        "NEO4J_dbms_memory_heap_max__size=1G",
                        image,
                    ],
                    check=True,
                )
                container_started = True
                print(
                    f"Started Neo4j Docker container '{new_container_name}' on port {port}."
                )
            except subprocess.CalledProcessError as e2:
                print(f"Error starting Neo4j container with random name: {str(e2)}")
                return False

        # Wait for Neo4j to be ready if container started successfully
        if container_started:
            return Neo4jGraphInitializer.wait_for_neo4j(port)
        return False

    @staticmethod
    def stopNeo4jContainer(containerName: str = "esg-neo4j-test") -> None:
        """
        Stop and remove a Neo4j Docker container.
        Args:
            containerName: Name of the container to stop and remove
        """
        try:
            subprocess.run(["docker", "stop", containerName], check=True)
            subprocess.run(["docker", "rm", containerName], check=True)
            print(f"Successfully stopped and removed container '{containerName}'")
        except subprocess.CalledProcessError as e:
            print(f"Error stopping container: {str(e)}")

    def getNeo4jDriver(self) -> "Driver":
        """
        Get a Neo4j driver instance (no authentication).
        Returns:
            Neo4j Driver instance
        """
        self.driver = GraphDatabase.driver(self.uri)
        return self.driver

    def initializeGraphWithRoot(self, rootLabel: str = "Root") -> None:
        """
        Initialize the graph with a root node if not present.
        Args:
            rootLabel: Label for the root node
        """
        with self.driver.session() as session:
            session.run(f"MERGE (r:{rootLabel} {{name: 'root'}})")

    def createOrgNode(self, orgId: str, rootLabel: str = "Root") -> None:
        """
        Create an organization node and connect to root.
        Args:
            orgId: Unique organization ID
            rootLabel: Label for the root node
        """
        with self.driver.session() as session:
            session.run(
                f"""
                MATCH (r:{rootLabel} {{name: 'root'}})
                MERGE (o:Org {{org_id: $orgId}})
                MERGE (r)-[:HAS_ORG]->(o)
            """,
                {"orgId": orgId},
            )

    def userExists(self, userId: str, rootLabel: str = "Root") -> bool:
        """
        Check if a user node exists.
        """
        with self.driver.session() as session:
            result = session.run(
                f"MATCH (u:User {{user_id: $userId}}) RETURN u", {"userId": userId}
            )
            return result.single() is not None

    def createUserNode(
        self,
        userId: str,
        email: str,
        orgId: Optional[str] = None,
        rootLabel: str = "Root",
    ) -> None:
        """
        Create a user node, optionally connect to an org, else to root.
        Args:
            userId: Unique user ID
            orgId: Optional organization ID
            rootLabel: Label for the root node
        """
        with self.driver.session() as session:
            if orgId:
                session.run(
                    f"""
                    MATCH (o:Org {{org_id: $orgId}})
                    MERGE (u:User {{user_id: $userId, email: $email}})
                    MERGE (o)-[:HAS_USER]->(u)
                """,
                    {"orgId": orgId, "userId": userId, "email": email},
                )
            else:
                session.run(
                    f"""
                    MATCH (r:{rootLabel} {{name: 'root'}})
                    MERGE (u:User {{user_id: $userId, email: $email}})
                    MERGE (r)-[:HAS_USER]->(u)
                """,
                    {"userId": userId, "email": email},
                )

    def deleteUserNode(self, userId: str, rootLabel: str = "Root") -> None:
        """
        Delete a user node.
        Args:
            userId: Unique user ID
            rootLabel: Label for the root node
        """
        with self.driver.session() as session:
            session.run(
                f"""
                MATCH (u:User {{user_id: $userId}})
                DETACH DELETE u
            """,
                {"userId": userId},
            )

    def deleteOrgNode(self, orgId: str, rootLabel: str = "Root") -> None:
        """
        Delete an organization node.
        Args:
            orgId: Unique organization ID
            rootLabel: Label for the root node
        """
        with self.driver.session() as session:
            session.run(
                f"""
                MATCH (o:Org {{org_id: $orgId}})
                DETACH DELETE o
            """,
                {"orgId": orgId},
            )

    def subgraphExists(self, userId: str, rootLabel: str = "Root") -> bool:
        """
        Check if a subgraph exists for a user by verifying the SubgraphRoot node is connected to the user and has the correct userId property.
        """
        with self.driver.session() as session:
            # Check if the SubgraphRoot node is connected to the user and has userId property
            result = session.run(
                f"MATCH (u:User {{user_id: $userId}})-[:HAS_SUBGRAPH]->(s:SubgraphRoot {{user_id: $userId}}) RETURN s",
                {"userId": userId},
            )
            return result.single() is not None

    def deleteSubgraph(self, userId: str, rootLabel: str = "Root") -> None:
        """
        Delete a subgraph for a user by:
        1. Deleting the graph projection
        2. Deleting and detaching entity nodes related to the user
        3. Deleting the subgraph root node

        Args:
            userId: Unique user ID
            rootLabel: Label for the root node
        """
        try:
            with self.driver.session() as session:
                # 1. Delete the graph projection if it exists
                exists_result = session.run(
                    "CALL gds.graph.exists($graphName) YIELD exists RETURN exists",
                    {"graphName": f"subgraph_{userId}"},
                )
                exists = exists_result.single()["exists"] if exists_result else False
                if exists:
                    session.run(f"CALL gds.graph.drop('subgraph_{userId}')")
                    print(f"Deleted graph projection 'subgraph_{userId}'")

                # 2. Delete and detach all entity nodes connected to the subgraph
                session.run(
                    """
                    MATCH (s:SubgraphRoot {user_id: $userId})-[:HAS_ENTITY]->(e:Entity)
                    DETACH DELETE e
                    """,
                    {"userId": userId},
                )
                print(f"Deleted entity nodes for user {userId}")

                # 3. Delete the subgraph root node
                session.run(
                    """
                    MATCH (s:SubgraphRoot {user_id: $userId})
                    DETACH DELETE s
                    """,
                    {"userId": userId},
                )
                print(f"Deleted subgraph root for user {userId}")

        except Exception as e:
            print(f"Error deleting subgraph: {str(e)}")
            raise

    def createSubgraph(
        self, entities: list, relationships: list, userId: str, rootLabel: str = "Root"
    ) -> None:
        """
        Create a subgraph for a user in neo4j database using the entities and relationships
        Args:
            entities: list of entities (each must have an 'entity_name' property)
            relationships: list of relationships (each must have 'source_entity_name' and 'target_entity_name' properties)
            userId: unique user id
            rootLabel: label for the root node
        Returns:
            None
        """
        try:
            self.entities = entities
            self.relationships = relationships
            with self.driver.session() as session:
                # create a subgraph root node with user_id property
                session.run(
                    f"MATCH (u:User {{user_id: $userId}}) CREATE (u)-[:HAS_SUBGRAPH]->(s:SubgraphRoot {{user_id: $userId}})",
                    {"userId": userId},
                )

                # Drop existing projection if it exists
                exists_result = session.run(
                    "CALL gds.graph.exists($graphName) YIELD exists RETURN exists",
                    {"graphName": f"subgraph_{userId}"},
                )
                exists = exists_result.single()["exists"] if exists_result else False
                if exists:
                    session.run(f"CALL gds.graph.drop('subgraph_{userId}')")

                # Ensure all required entity nodes exist before projection
                if entities:
                    create_nodes_cypher = (
                        "UNWIND $entities AS entity "
                        "MERGE (n:Entity {entity_name: entity.entity_name}) "
                        "SET n.description = entity.description, "
                        "    n.user_id = $userId, "
                        "    n.chunk_id = entity.chunk_id, "
                        "    n.document_id = entity.document_id"
                    )
                    session.run(
                        create_nodes_cypher, {"entities": entities, "userId": userId}
                    )

                    # Connect entities to the SubgraphRoot node
                    connect_entities_cypher = (
                        "MATCH (s:SubgraphRoot {user_id: $userId}), "
                        "      (e:Entity {user_id: $userId}) "
                        "WHERE NOT (s)-[:HAS_ENTITY]->(e) "
                        "CREATE (s)-[:HAS_ENTITY]->(e)"
                    )
                    session.run(connect_entities_cypher, {"userId": userId})

                if relationships:
                    # Create relationships with escaped names
                    create_rels_cypher = (
                        "UNWIND $rels AS rel "
                        "MATCH (src:Entity {entity_name: rel.source_entity_name}) "
                        "MATCH (tgt:Entity {entity_name: rel.target_entity_name}) "
                        "MERGE (src)-[:RELATED_TO]->(tgt)"
                    )
                    session.run(create_rels_cypher, {"rels": relationships})

                # Build Cypher queries for GDS projection using entity_name
                # Use parameterized query to avoid syntax issues with special characters
                node_query = (
                    "MATCH (n:Entity) "
                    "WHERE n.entity_name IN $entity_names "
                    "RETURN id(n) AS id"
                )

                # Build relationship query using parameters
                rel_query = (
                    "MATCH (n:Entity)-[r:RELATED_TO]->(m:Entity) "
                    "WHERE n.entity_name IN $entity_names AND m.entity_name IN $entity_names "
                    "RETURN id(n) AS source, id(m) AS target, type(r) AS type"
                )

                # Create the graph projection using parameters
                projection_cypher = (
                    f"CALL gds.graph.project.cypher("
                    f"'subgraph_{userId}', "
                    f"$node_query, "
                    f"$rel_query, "
                    f"{{parameters: {{entity_names: $entity_names}}}}"
                    f") YIELD graphName, nodeCount, relationshipCount"
                )

                session.run(
                    projection_cypher,
                    {
                        "node_query": node_query,
                        "rel_query": rel_query,
                        "entity_names": [e["entity_name"] for e in entities],
                    },
                )

                # Verify the projection was created
                exists_result = session.run(
                    "CALL gds.graph.exists($graphName) YIELD exists RETURN exists",
                    {"graphName": f"subgraph_{userId}"},
                )
                exists = exists_result.single()["exists"] if exists_result else False
                if not exists:
                    print(f"Failed to create graph projection 'subgraph_{userId}'")
                    return None

                print(
                    f"Subgraph created for user {userId} using {len(entities)} entities and {len(relationships)} relationships through GDS"
                )
                print(f"Subgraph Projection name: {f'subgraph_{userId}'}")
                return f"subgraph_{userId}"
        except Exception as e:
            print(f"Error creating subgraph: {str(e)}")
            return None

    def buildGraphProjection(self, graphName: str, rootLabel: str = "Root") -> None:
        """
        Build a graph projection for a subgraph.
        """
        try:
            with self.driver.session() as session:
                session.run(
                    f"CALL gds.graph.project.cypher($graphName, $entities, $relationships)",
                    {
                        "graphName": graphName,
                        "entities": self.entities,
                        "relationships": self.relationships,
                    },
                )
        except Exception as e:
            print(f"Error building graph projection: {str(e)}")

    def getSubgraphId(self, userId: str, rootLabel: str = "Root") -> str:
        """
        Get the subgraph id for a user.
        """
        try:
            with self.driver.session() as session:
                result = session.run(
                    f"MATCH (u:User {{user_id: $userId}}) RETURN u.subgraph_id",
                    {"userId": userId},
                )
                return result.single()[0]
        except Exception as e:
            print(f"Error getting subgraph id: {str(e)}")
            return None  # if no subgraph id is found, return None

    def runCommunityDetection(
        self,
        projection_name: str,
        algorithm: str = "louvain",
        min_community_size: int = 3,
    ) -> dict:
        """
        Detect communities in the graph using the specified algorithm.
        Args:
            projection_name: Name of the graph projection to use (must exist)
            algorithm: Community detection algorithm (louvain, leiden, or label_propagation)
            min_community_size: Minimum number of nodes for a community
        Returns:
            Dict with community detection results
        """
        if not self.driver:
            print("Not connected to Neo4j")
            return None
        try:
            with self.driver.session() as session:
                algo = algorithm.lower()
                if algo == "louvain":
                    query = f"""
                    CALL gds.louvain.stream('{projection_name}')
                    YIELD nodeId, communityId
                    WITH communityId, collect(gds.util.asNode(nodeId)) AS nodes
                    WHERE size(nodes) >= $min_community_size
                    RETURN communityId, size(nodes) AS size,
                           [n IN nodes | n.entity_name] AS entity_names,
                           [n IN nodes | labels(n)[0]] AS entity_types
                    ORDER BY size DESC
                    """
                elif algo == "leiden":
                    query = f"""
                    CALL gds.leiden.stream('{projection_name}')
                    YIELD nodeId, communityId
                    WITH communityId, collect(gds.util.asNode(nodeId)) AS nodes
                    WHERE size(nodes) >= $min_community_size
                    RETURN communityId, size(nodes) AS size,
                           [n IN nodes | n.entity_name] AS entity_names,
                           [n IN nodes | labels(n)[0]] AS entity_types
                    ORDER BY size DESC
                    """
                elif algo == "label_propagation":
                    query = f"""
                    CALL gds.labelPropagation.stream('{projection_name}')
                    YIELD nodeId, communityId
                    WITH communityId, collect(gds.util.asNode(nodeId)) AS nodes
                    WHERE size(nodes) >= $min_community_size
                    RETURN communityId, size(nodes) AS size,
                           [n IN nodes | n.entity_name] AS entity_names,
                           [n IN nodes | labels(n)[0]] AS entity_types
                    ORDER BY size DESC
                    """
                else:
                    print(f"Unsupported algorithm: {algorithm}")
                    return None
                result = session.run(query, {"min_community_size": min_community_size})
                communities = []
                for record in result:
                    community = {
                        "id": record["communityId"],
                        "size": record["size"],
                        "entity_names": record["entity_names"],
                        "entity_types": record["entity_types"],
                    }
                    communities.append(community)
                # Optionally write community IDs to nodes
                write_query = f"""
                CALL gds.louvain.write('{projection_name}', {{writeProperty: 'community'}})
                YIELD communityCount, modularity, modularities
                RETURN communityCount, modularity, modularities
                """
                try:
                    write_result = session.run(write_query)
                    write_record = write_result.single()
                    if write_record:
                        print(
                            f"Wrote community IDs to nodes. Total communities: {write_record['communityCount']}"
                        )
                except Exception as e:
                    print(f"Could not write community IDs to nodes: {str(e)}")
                print(
                    f"Detected {len(communities)} communities using {algorithm} algorithm"
                )
                return {"communities": communities}
        except Exception as e:
            print(f"Error detecting communities: {str(e)}")
            return None

    def summarizeCommunities(
        self, max_communities: int = 10, max_entities_per_community: int = 10
    ) -> list:
        """
        Generate summaries for detected communities.
        Args:
            max_communities: Maximum number of communities to summarize
            max_entities_per_community: Maximum entities to include per community
        Returns:
            List of community summaries
        """
        if not self.driver:
            print("Not connected to Neo4j")
            return None
        try:
            with self.driver.session() as session:
                query = """
                MATCH (n) WHERE n.community IS NOT NULL
                WITH n.community AS communityId, count(n) AS communitySize
                ORDER BY communitySize DESC
                LIMIT $max_communities
                MATCH (e {community: communityId})
                WITH communityId, communitySize, collect(e) AS entities
                RETURN communityId, communitySize,
                       [e IN entities | {name: e.entity_name, type: labels(e)[0]}] AS entityDetails
                ORDER BY communitySize DESC
                """
                result = session.run(query, {"max_communities": max_communities})
                summaries = []
                for record in result:
                    community_id = record["communityId"]
                    community_size = record["communitySize"]
                    entities = record["entityDetails"]
                    # Limit entities per community
                    if len(entities) > max_entities_per_community:
                        entities = entities[:max_entities_per_community]
                    # Get types distribution
                    type_counts = {}
                    for entity in entities:
                        entity_type = entity.get("type", "Unknown")
                        if entity_type in type_counts:
                            type_counts[entity_type] += 1
                        else:
                            type_counts[entity_type] = 1
                    # Create summary
                    summary = {
                        "community_id": community_id,
                        "size": community_size,
                        "type_distribution": type_counts,
                        "key_entities": [e["name"] for e in entities],
                        "entities": entities,
                    }
                    summaries.append(summary)
                print(f"Generated summaries for {len(summaries)} communities")
                return summaries
        except Exception as e:
            print(f"Error summarizing communities: {str(e)}")
            return None


def run() -> None:
    """
    Test function to initialize the graph and create users/orgs as described.
    - 6 unique users
    - 3 unique orgs
    - 2 users in orgs, 4 users independent (connected to root)
    """
    initializer = Neo4jGraphInitializer()

    # Start Neo4j and ensure it's ready
    if not Neo4jGraphInitializer.startNeo4jDockerContainer():
        print("Failed to start Neo4j container. Exiting.")
        return

    try:
        driver = initializer.getNeo4jDriver()
        print("Neo4j driver initialized")
        # Wait for Neo4j to be ready
        Neo4jGraphInitializer.wait_for_neo4j()
        initializer.initializeGraphWithRoot()

        # Create test data
        orgIds = ["org1", "org2", "org3"]
        userIds = ["user1", "user2", "user3", "user4", "user5", "user6"]

        for orgId in orgIds:
            initializer.createOrgNode(orgId)

        initializer.createUserNode("user1", "user1@example.com", orgId="org1")
        initializer.createUserNode("user2", "user2@example.com", orgId="org2")
        for uid in userIds[2:]:
            initializer.createUserNode(uid, f"{uid}@example.com")

        print("Graph initialized and test users/orgs created.")
    except Exception as e:
        print(f"Error during graph initialization: {str(e)}")
        raise
    finally:
        if driver:
            driver.close()
            initializer.stopNeo4jContainer()

    def query(self, query: str, params: dict = {}) -> list:
        """
        Query the Neo4j database using a Cypher query.
        """
        with self.driver.session() as session:
            result = session.run(query, params)
            return result.to_list()

if __name__ == "__main__":
    run()
