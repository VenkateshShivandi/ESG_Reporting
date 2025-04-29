# This file is used to initialize the Neo4j database and also setup organization and user nodes to build dynamic subgraphs to perform RAG on them.

from neo4j import GraphDatabase
from dotenv import load_dotenv
import os
import subprocess
from typing import Optional
from neo4j import Driver, Session

load_dotenv('.env.local')

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
    def __init__(self, containerName: str = "esg-neo4j", image: str = "neo4j:latest", gdsVersion: str = "2.5.0", port: int = 7687, uri: str = "bolt://localhost:7687"):
        self.containerName = containerName
        self.image = image
        self.gdsVersion = gdsVersion
        self.port = port
        self.uri = uri
        self.driver = None

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
    def startNeo4jDockerContainer(containerName: str = "esg-neo4j-test",
                                  image: str = "neo4j:latest",
                                  gdsVersion: str = "2.5.0",
                                  port: int = 7687) -> bool:
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
        running = subprocess.run([
            "docker", "ps", "-q", "-f", f"name={containerName}"
        ], capture_output=True, text=True)
        
        if running.stdout.strip():
            print(f"Neo4j Docker container '{containerName}' is already running.")
            return Neo4jGraphInitializer.wait_for_neo4j(port)

        # Check if container exists but not running
        exists = subprocess.run([
            "docker", "ps", "-aq", "-f", f"name={containerName}"
        ], capture_output=True, text=True)
        
        if exists.stdout.strip():
            print(f"Removing existing stopped container '{containerName}'")
            subprocess.run([
                "docker", "rm", "-f", containerName
            ], check=True)

        container_started = False
        try:
            subprocess.run([
                "docker", "run", "-d",
                "--name", containerName,
                "-p", f"{port}:7687",
                "-p", "7474:7474",
                "-e", "NEO4J_AUTH=none",
                "-e", f"NEO4JLABS_PLUGINS=[\"graph-data-science\"]",
                "-e", f"NEO4J_PLUGINS=\"[\"apoc\",\"graph-data-science\"]\"",
                "-e", "NEO4J_dbms_memory_pagecache_size=1G",
                "-e", "NEO4J_dbms_memory_heap_initial__size=1G",
                "-e", "NEO4J_dbms_memory_heap_max__size=1G",
                image
            ], check=True)
            container_started = True
            print(f"Started Neo4j Docker container '{containerName}' on port {port}.")
        except subprocess.CalledProcessError as e:
            print(f"Error starting Neo4j container: {str(e)}")
            # If container creation fails, try with a random suffix
            import uuid
            new_container_name = f"{containerName}-{str(uuid.uuid4())[:8]}"
            print(f"Retrying with random container name: {new_container_name}")
            try:
                subprocess.run([
                    "docker", "run", "-d",
                    "--name", new_container_name,
                    "-p", f"{port}:7687",
                    "-p", "7474:7474",
                    "-e", "NEO4J_AUTH=none",
                    "-e", f"NEO4JLABS_PLUGINS=[\"graph-data-science\"]",
                    "-e", f"NEO4J_PLUGINS=\"[\"apoc\",\"graph-data-science\"]\"",
                    "-e", "NEO4J_dbms_memory_pagecache_size=1G",
                    "-e", "NEO4J_dbms_memory_heap_initial__size=1G",
                    "-e", "NEO4J_dbms_memory_heap_max__size=1G",
                    image
                ], check=True)
                container_started = True
                print(f"Started Neo4j Docker container '{new_container_name}' on port {port}.")
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

    def getNeo4jDriver(self) -> 'Driver':
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
            session.run(f"""
                MATCH (r:{rootLabel} {{name: 'root'}})
                MERGE (o:Org {{org_id: $orgId}})
                MERGE (r)-[:HAS_ORG]->(o)
            """, {"orgId": orgId})

    def createUserNode(self, userId: str, orgId: Optional[str] = None, rootLabel: str = "Root") -> None:
        """
        Create a user node, optionally connect to an org, else to root.
        Args:
            userId: Unique user ID
            orgId: Optional organization ID
            rootLabel: Label for the root node
        """
        with self.driver.session() as session:
            if orgId:
                session.run(f"""
                    MATCH (o:Org {{org_id: $orgId}})
                    MERGE (u:User {{user_id: $userId}})
                    MERGE (o)-[:HAS_USER]->(u)
                """, {"orgId": orgId, "userId": userId})
            else:
                session.run(f"""
                    MATCH (r:{rootLabel} {{name: 'root'}})
                    MERGE (u:User {{user_id: $userId}})
                    MERGE (r)-[:HAS_USER]->(u)
                """, {"userId": userId})


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
        initializer.initializeGraphWithRoot()
        
        # Create test data
        orgIds = ["org1", "org2", "org3"]
        userIds = ["user1", "user2", "user3", "user4", "user5", "user6"]
        
        for orgId in orgIds:
            initializer.createOrgNode(orgId)
            
        initializer.createUserNode("user1", orgId="org1")
        initializer.createUserNode("user2", orgId="org2")
        for uid in userIds[2:]:
            initializer.createUserNode(uid)
            
        print("Graph initialized and test users/orgs created.")
    except Exception as e:
        print(f"Error during graph initialization: {str(e)}")
        raise
    finally:
        if driver:
            driver.close()


if __name__ == "__main__":
    run();

