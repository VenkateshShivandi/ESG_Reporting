#!/usr/bin/env python3
"""
Import ESG knowledge graph files into Neo4j database.
This script uses the Neo4jGraphStore class to import entity, relationship,
and claim data from JSON files into a Neo4j database.
"""

import argparse
import os
import sys
from graph_store import Neo4jGraphStore

def main():
    """Import knowledge graph files into Neo4j"""
    parser = argparse.ArgumentParser(description="Import ESG knowledge graph into Neo4j")
    
    # Input file arguments
    parser.add_argument("--entities", "-e", required=True,
                        help="Path to entities JSON file")
    parser.add_argument("--relationships", "-r", required=True,
                        help="Path to relationships JSON file")
    parser.add_argument("--claims", "-c", 
                        help="Path to claims JSON file (optional)")
    
    # Neo4j connection arguments
    parser.add_argument("--uri", default=os.getenv("NEO4J_URI"),
                        help="Neo4j URI (e.g., bolt://localhost:7687)")
    parser.add_argument("--username", default=os.getenv("NEO4J_USERNAME"),
                        help="Neo4j username")
    parser.add_argument("--password", default=os.getenv("NEO4J_PASSWORD"),
                        help="Neo4j password")
    parser.add_argument("--database", default="neo4j",
                        help="Neo4j database name (default: neo4j)")
    
    # Additional options
    parser.add_argument("--clear", action="store_true",
                        help="Clear existing data in Neo4j before importing")
    parser.add_argument("--verbose", "-v", action="store_true",
                        help="Enable verbose output")
    
    args = parser.parse_args()
    
    # Validate connection parameters
    if not args.uri:
        print("Error: Neo4j URI is required. Use --uri or set NEO4J_URI environment variable.")
        sys.exit(1)
    
    if not args.username:
        print("Error: Neo4j username is required. Use --username or set NEO4J_USERNAME environment variable.")
        sys.exit(1)
    
    if not args.password:
        print("Error: Neo4j password is required. Use --password or set NEO4J_PASSWORD environment variable.")
        sys.exit(1)
    
    # Initialize the graph store
    graph_store = Neo4jGraphStore(
        uri=args.uri,
        username=args.username,
        password=args.password,
        database=args.database
    )
    
    # Connect to Neo4j
    if not graph_store.connect():
        print("Failed to connect to Neo4j database. Please check connection parameters.")
        sys.exit(1)
    
    try:
        # Clear existing data if requested
        if args.clear:
            print("Clearing existing data from Neo4j...")
            graph_store.clear_graph()
        
        # Import the knowledge graph
        print(f"Importing knowledge graph from:")
        print(f"  - Entities: {args.entities}")
        print(f"  - Relationships: {args.relationships}")
        print(f"  - Claims: {args.claims if args.claims else 'None'}")
        
        result = graph_store.import_knowledge_graph(
            entities_file=args.entities,
            relationships_file=args.relationships,
            claims_file=args.claims
        )
        
        # Print results
        print("\nImport complete:")
        print(f"  - Entities: {result['entities']}")
        print(f"  - Relationships: {result['relationships']}")
        print(f"  - Claims: {result['claims']}")
        
    finally:
        # Close the connection
        graph_store.close()

if __name__ == "__main__":
    main() 