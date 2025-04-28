# This file is used to initialize the Neo4j database and also setup organization and user nodes to build dynamic subgraphs to perform RAG on them.

from neo4j import GraphDatabase
from dotenv import load_dotenv
import os
import subprocess
from typing import Optional
from neo4j import Driver, Session

load_dotenv()

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
    def __init__(self, containerName: str = "esg-neo4j-test", image: str = "neo4j:latest", gdsVersion: str = "2.5.0", port: int = 7687, uri: str = "bolt://localhost:7687"):
        self.containerName = containerName
        self.image = image
        self.gdsVersion = gdsVersion
        self.port = port
        self.uri = uri
        self.driver = None

    @staticmethod
    def startNeo4jDockerContainer(containerName: str = "esg-neo4j-test",
                                  image: str = "neo4j:latest",
                                  gdsVersion: str = "2.5.0",
                                  port: int = 7687) -> None:
        """
        Start a Neo4j Docker container with GDS and no authentication.
        If already running, does nothing.
        Args:
            containerName: Name for the Docker container
            image: Neo4j Docker image
            gdsVersion: Version of GDS plugin to use
            port: Host port to map to Neo4j's Bolt port
        """
        result = subprocess.run([
            "docker", "ps", "-q", "-f", f"name={containerName}"
        ], capture_output=True, text=True)
        if result.stdout.strip():
            print(f"Neo4j Docker container '{containerName}' is already running.")
            return
        subprocess.run([
            "docker", "run", "-d",
            "--name", containerName,
            "-p", f"{port}:7687",
            "-p", "7474:7474",
            "-e", "NEO4J_AUTH=none",
            "-e", f"NEO4JLABS_PLUGINS=[\"graph-data-science\"]",
            "-e", f"NEO4J_PLUGINS=\"[\"apoc\",\"graph-data-science\"]\"",
            image
        ], check=True)
        print(f"Started Neo4j Docker container '{containerName}' on port {port}.")

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
    Neo4jGraphInitializer.startNeo4jDockerContainer()
    driver = initializer.getNeo4jDriver()
    initializer.initializeGraphWithRoot()
    orgIds = ["org1", "org2", "org3"]
    userIds = ["user1", "user2", "user3", "user4", "user5", "user6"]
    for orgId in orgIds:
        initializer.createOrgNode(orgId)
    initializer.createUserNode("user1", orgId="org1")
    initializer.createUserNode("user2", orgId="org2")
    for uid in userIds[2:]:
        initializer.createUserNode(uid)
    print("Graph initialized and test users/orgs created.")
    driver.close()




