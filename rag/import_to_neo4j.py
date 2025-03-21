#!/usr/bin/env python3
"""
Import ESG knowledge graph files into Neo4j database.
This script uses the Neo4jGraphStore class to import entity, relationship,
and claim data from JSON files into a Neo4j database.

Requirements:
- Neo4j database with GDS (Graph Data Science) library installed for community detection
- If GDS is not available, use --skip-communities flag
"""

import argparse
import os
import sys
from graph_store import Neo4jGraphStore

def main():
    """Import knowledge graph files into Neo4j"""
    parser = argparse.ArgumentParser(
        description="Import ESG knowledge graph into Neo4j",
        epilog="""Note: Community detection requires Neo4j Graph Data Science (GDS) library. 
        If you encounter errors, use --skip-communities flag. APOC extension is recommended but not required."""
    )
    
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
    parser.add_argument("--skip-communities", action="store_true",
                        help="Skip community detection step")
    parser.add_argument("--algorithm", default="louvain",
                        choices=["louvain", "leiden", "label_propagation"],
                        help="Community detection algorithm to use")
    
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
        
        # Detect communities if not skipped
        if not args.skip_communities:
            try:
                print(f"\nAttempting community detection using {args.algorithm} algorithm...")
                community_result = graph_store.detect_communities(
                    algorithm=args.algorithm, 
                    min_community_size=5,
                    resolution=1.0,
                    max_levels=5,
                    verbose=args.verbose
                )
                
                if "error" in community_result:
                    print(f"Community detection error: {community_result['error']}")
                    print("Run with --skip-communities to skip this step or install Neo4j GDS library.")
                elif "communities" in community_result and community_result["communities"]:
                    print("Community detection completed successfully!")
                    if isinstance(community_result["communities"], dict):
                        community_count = community_result["communities"].get("communityCount", 0)
                        print(f"Detected {community_count} communities")
                        
                        # Try to access level information if available
                        if "levels" in community_result:
                            print(f"Detected {len(community_result['levels'])} hierarchical levels")
                        
                        for key in community_result["communities"]:
                            if key.startswith("level_") and isinstance(community_result["communities"][key], dict):
                                print(f"{key}: {community_result['communities'][key].get('count', 0)} communities")
                else:
                    print("Community detection completed but no detailed information is available.")
            except Exception as e:
                print(f"Community detection failed: {str(e)}")
                print("Consider running with --skip-communities next time.")
        else:
            print("\nSkipping community detection as requested.")
        
    finally:
        # Close the connection
        graph_store.close()

if __name__ == "__main__":
    main() 