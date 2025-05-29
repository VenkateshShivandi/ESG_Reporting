import os
import json
from dotenv import load_dotenv
import openai
from neo4j import GraphDatabase
from neo4j import basic_auth

if os.getenv("ZEA_ENV") != "production":
    load_dotenv(".env.local")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USERNAME")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

class Neo4jConnector:
    """Secure Neo4j connection handler with query execution capabilities"""
    
    def __init__(self):
        self.driver = None
        self.uri = os.getenv("NEO4J_URI")
        self.user = os.getenv("NEO4J_USERNAME")
        self.password = os.getenv("NEO4J_PASSWORD")
        self.connect()

    def connect(self):
        """Establish connection with connection pooling and validation"""
        try:
            # Debug to ensure environment variables are actually loaded
            print(f"DEBUG - URI: {self.uri}")
            print(f"DEBUG - User: {self.user}")
            print(f"DEBUG - Password exists: {self.password is not None}")
            
            # Don't proceed if credentials are missing
            if not self.uri or not self.user or not self.password:
                raise ValueError("Missing Neo4j credentials in environment variables")
            
            self.driver = GraphDatabase.driver(
                self.uri,
                auth=basic_auth(self.user, self.password),
                max_connection_pool_size=20,
                connection_timeout=30
            )
            self.verifyConnection()
        except Exception as e:
            raise ConnectionError(f"Neo4j connection failed: {str(e)}")

    def verifyConnection(self):
        """Validate active connection with test query"""
        with self.driver.session() as session:
            result = session.run("RETURN 1 AS test")
            if result.single()["test"] != 1:
                raise ConnectionAbortedError("Neo4j connection verification failed")

    def executeQuery(self, cypher: str, parameters: dict = None):
        """Safe parameterized query execution with automatic session handling"""
        with self.driver.session() as session:
            try:
                result = session.run(cypher, parameters=parameters or {})
                return [dict(record) for record in result]
            except Exception as e:
                print(f"Query error: {str(e)}")
                return None

    def close(self):
        """Proper connection teardown"""
        if self.driver:
            self.driver.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

# Example usage:
if __name__ == "__main__":
    # Uncomment one of the following:
    
    # Option 1: Run a simple test query
    # with Neo4jConnector() as connector:
    #     query = """
    #     MATCH (e:Entity {name: $entityName})
    #     RETURN e
    #     """
    #     result = connector.executeQuery(query, {"entityName": "Driscoll"})
    #     print(json.dumps(result, indent=2))
    
    # Option 2: Build the knowledge graph
    from build_graph import build_knowledge_graph
    build_knowledge_graph()









