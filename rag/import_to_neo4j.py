#!/usr/bin/env python3
"""
Import ESG knowledge graph files into Neo4j database.
This script uses the Neo4jGraphStore class to import entity, relationship,
and claim data from JSON files into a Neo4j database.

Requirements:
- Neo4j database with GDS (Graph Data Science) library installed for community detection
- If GDS is not available, use --skip-communities flag
- python-dotenv package for loading environment variables from .env.local
"""

import argparse
import os
import sys
import json
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI
from graph_store import Neo4jGraphStore

# Load environment variables from .env and .env.local
def load_environment_variables():
    """Load environment variables from .env.local files"""
    # Try to load from project root .env.local
    root_env = Path(__file__).parent.parent / '.env.local'
    if root_env.exists():
        load_dotenv(root_env)
        print(f"Loaded environment from {root_env}")
        
    # Also try to load from rag directory .env.local (which takes precedence)
    rag_env = Path(__file__).parent / '.env.local'
    if rag_env.exists():
        load_dotenv(rag_env, override=True)
        print(f"Loaded environment from {rag_env}")
    
    # Load any other potential env files
    load_dotenv()  # Load from .env if it exists

def summarize_community_with_openai(client, community_data):
    """
    Generate a summary for a community using OpenAI
    
    Args:
        client: OpenAI client
        community_data: Dict containing community information
    
    Returns:
        str: Generated summary
    """
    # Create a prompt with community information
    entities_info = "\n".join([
        f"- {entity['name']} (Type: {entity['type']}): {entity.get('description', 'No description')[:100]}..."
        for entity in community_data["entities"][:10]  # Limit to 10 entities to keep prompt size reasonable
    ])
    
    if len(community_data["entities"]) > 10:
        entities_info += f"\n- ...and {len(community_data['entities']) - 10} more entities"
    
    prompt = f"""Analyze this community of entities from a knowledge graph and provide a concise summary:

Community ID: {community_data['id']}
Size: {community_data['size']} entities
Entity Types: {', '.join(community_data['entity_types'])}

Sample Entities:
{entities_info}

Please provide:
1. A short name/label for this community (3-5 words)
2. A concise summary of what unites this community (2-3 sentences)
3. The central theme or focus of this community
"""

    # Call OpenAI API to generate summary
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Can be changed to gpt-4 for better results
            messages=[
                {"role": "system", "content": "You are a specialized assistant that analyzes and summarizes knowledge graph communities."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.5,
            max_tokens=300
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Error generating summary with OpenAI: {str(e)}")
        return f"Error generating summary: {str(e)}"

def get_community_data(graph_store, community_id) -> dict:
    """
    Retrieve data about entities in a specific community
    
    Args:
        graph_store: Neo4jGraphStore instance
        community_id: ID of the community to analyze
    
    Returns:
        dict: Community data including entities, types, and size
    """
    try:
        with graph_store.driver.session(database=graph_store.database) as session:
            # Get entities in the community
            query = """
            MATCH (e:Entity)
            WHERE e.communityId_strength = $community_id
            RETURN e.name AS name, e.type AS type, e.description AS description
            LIMIT 100
            """
            result = session.run(query, {"community_id": community_id})
            
            entities = []
            entity_types = set()
            
            for record in result:
                entity = {
                    "name": record["name"],
                    "type": record["type"],
                    "description": record.get("description", "")
                }
                entities.append(entity)
                entity_types.add(record["type"])
            
            # Get count (in case there are more than our limit)
            count_query = """
            MATCH (e:Entity)
            WHERE e.communityId_strength = $community_id
            RETURN count(e) AS count
            """
            count_result = session.run(count_query, {"community_id": community_id})
            count_record = count_result.single()
            size = count_record["count"] if count_record else len(entities)
            
            return {
                "id": community_id,
                "size": size,
                "entities": entities,
                "entity_types": list(entity_types)
            }
    except Exception as e:
        print(f"Error retrieving community data: {str(e)}")
        return {"error": str(e), "id": community_id, "size": 0, "entities": [], "entity_types": []}

def store_community_summary(graph_store, community_id, summary) -> bool:
    """
    Store a community summary back in Neo4j
    
    Args:
        graph_store: Neo4jGraphStore instance
        community_id: ID of the community
        summary: Generated summary text
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        with graph_store.driver.session(database=graph_store.database) as session:
            # Parse the summary to extract structured information
            lines = summary.strip().split('\n')
            name = ""
            theme = ""
            full_summary = summary
            
            # Attempt to extract structured info from the summary
            for line in lines:
                line = line.strip()
                if line.startswith("1.") or "name" in line.lower() or "label" in line.lower():
                    parts = line.split(":", 1)
                    if len(parts) > 1:
                        name = parts[1].strip()
                    else:
                        # Try to extract the first sentence
                        name = line.strip("1. ")
                elif line.startswith("3.") or "theme" in line.lower() or "focus" in line.lower():
                    parts = line.split(":", 1)
                    if len(parts) > 1:
                        theme = parts[1].strip()
                    else:
                        # Try to extract the first sentence
                        theme = line.strip("3. ")
            
            # Create a community node if it doesn't exist
            query = """
            MERGE (c:Community {id: $community_id})
            SET 
                c.name = $name,
                c.theme = $theme,
                c.summary = $summary,
                c.size = $size,
                c.updated = timestamp()
            WITH c
            
            // Connect community node to all entities in that community
            MATCH (e:Entity)
            WHERE e.communityId_strength = $community_id
            MERGE (e)-[:BELONGS_TO]->(c)
            
            RETURN c.id as id, count(e) as connected_entities
            """
            
            # Get community size
            size_query = """
            MATCH (e:Entity)
            WHERE e.communityId_strength = $community_id
            RETURN count(e) as size
            """
            size_result = session.run(size_query, {"community_id": community_id})
            size_record = size_result.single()
            size = size_record["size"] if size_record else 0
            
            # Run the query to create/update the community node
            result = session.run(
                query, 
                {
                    "community_id": community_id,
                    "name": name or f"Community {community_id}",
                    "theme": theme or "Not specified",
                    "summary": full_summary,
                    "size": size
                }
            )
            
            record = result.single()
            if record:
                print(f"✅ Stored summary for community {community_id} (connected to {record['connected_entities']} entities)")
                return True
            else:
                print(f"⚠️ No entities found for community {community_id}")
                return False
                
    except Exception as e:
        print(f"Error storing community summary: {str(e)}")
        return False

def summarize_communities(graph_store, openai_api_key, model_name="gpt-4o-mini", max_communities=None):
    """
    Generate and store summaries for all communities
    
    Args:
        graph_store: Neo4jGraphStore instance
        openai_api_key: OpenAI API key
        model_name: Model to use for summarization
        max_communities: Maximum number of communities to summarize (None for all)
    
    Returns:
        dict: Results of summarization
    """
    if not openai_api_key:
        print("OpenAI API key is required for community summarization")
        return {"error": "Missing OpenAI API key"}
    
    # Initialize OpenAI client
    client = OpenAI(api_key=openai_api_key)
    
    try:
        # Get all community IDs
        with graph_store.driver.session(database=graph_store.database) as session:
            query = """
            MATCH (e:Entity)
            WHERE e.communityId_strength IS NOT NULL
            RETURN DISTINCT e.communityId_strength AS community_id, count(*) AS size
            ORDER BY size DESC
            """
            
            if max_communities:
                query += f" LIMIT {max_communities}"
                
            result = session.run(query)
            communities = [(record["community_id"], record["size"]) for record in result]
        
        if not communities:
            print("No communities found. Run community detection first.")
            return {"error": "No communities found"}
        
        print(f"\n{'='*20} COMMUNITY SUMMARIZATION {'='*20}")
        print(f"Found {len(communities)} communities. Generating summaries...")
        
        results = {
            "total": len(communities),
            "successful": 0,
            "failed": 0,
            "details": []
        }
        
        # Process each community
        for i, (community_id, size) in enumerate(communities):
            print(f"\nProcessing community {community_id} ({i+1}/{len(communities)}, size: {size} entities)...")
            
            # Get community data
            community_data = get_community_data(graph_store, community_id)
            
            if "error" in community_data:
                print(f"⚠️ Error retrieving data for community {community_id}: {community_data['error']}")
                results["failed"] += 1
                results["details"].append({
                    "community_id": community_id, 
                    "success": False, 
                    "error": str(community_data["error"])
                })
                continue
            
            # Generate summary
            print(f"Generating summary using {model_name}...")
            summary = summarize_community_with_openai(client, community_data)
            
            # Store summary
            success = store_community_summary(graph_store, community_id, summary)
            
            if success:
                results["successful"] += 1
                results["details"].append({
                    "community_id": community_id, 
                    "success": True,
                    "summary": summary
                })
            else:
                results["failed"] += 1
                results["details"].append({
                    "community_id": community_id, 
                    "success": False, 
                    "error": "Failed to store summary"
                })
        
        print(f"\n{'='*20} SUMMARIZATION COMPLETE {'='*20}")
        print(f"Successfully summarized {results['successful']}/{results['total']} communities")
        
        return results
        
    except Exception as e:
        print(f"Error in community summarization: {str(e)}")
        return {"error": str(e)}

def verify_graph_projection(graph_store, graph_name="entityGraph") -> bool:
    """
    Verify that a graph projection exists in Neo4j GDS
    
    Args:
        graph_store: Neo4jGraphStore instance
        graph_name: Name of the graph projection to check
        
    Returns:
        bool: True if projection exists, False otherwise
    """
    print(f"\nVerifying graph projection '{graph_name}'...")
    try:
        with graph_store.driver.session(database=graph_store.database) as session:
            check_query = f"""
            CALL gds.graph.exists($name) 
            YIELD exists
            RETURN exists
            """
            result = session.run(check_query, parameters={"name": graph_name})
            record = result.single()
            
            if record and record["exists"]:
                print(f"✅ Graph projection '{graph_name}' exists and is ready for analysis")
                
                # Get projection stats
                stats_query = f"""
                CALL gds.graph.list($name)
                YIELD nodeCount, relationshipCount
                RETURN nodeCount, relationshipCount
                """
                stats = session.run(stats_query, parameters={"name": graph_name})
                stats_record = stats.single()
                if stats_record:
                    print(f"   - Nodes: {stats_record['nodeCount']}")
                    print(f"   - Relationships: {stats_record['relationshipCount']}")
                
                return True
            else:
                print(f"❌ Graph projection '{graph_name}' does not exist")
                print("   Run with --create-projection to create the graph projection first")
                return False
    except Exception as e:
        print(f"Error verifying graph projection: {str(e)}")
        return False

def main():
    """Import knowledge graph files into Neo4j"""
    # Load environment variables first
    load_environment_variables()
    
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
    parser.add_argument("--create-projection", action="store_true",
                        help="Create graph projection for community detection")
    parser.add_argument("--verify-projection", action="store_true",
                        help="Verify graph projection exists before community detection")
    parser.add_argument("--projection-name", default="entityGraph",
                        help="Name for the graph projection (default: entityGraph)")
    
    # New community summarization options
    parser.add_argument("--summarize-communities", action="store_true",
                        help="Generate summaries for communities using OpenAI")
    parser.add_argument("--openai-api-key", default=os.getenv("OPENAI_API_KEY"),
                        help="OpenAI API key for summarization")
    parser.add_argument("--openai-model", default="gpt-4o-mini",
                        help="OpenAI model to use for summarization (default: gpt-4o-mini)")
    parser.add_argument("--max-communities", type=int, default=None,
                        help="Maximum number of communities to summarize (default: all)")
    
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
    
    # Check for OpenAI API key if summarization is requested
    if args.summarize_communities:
        # Try to get API key from command line or environment
        openai_api_key = args.openai_api_key or os.getenv("OPENAI_API_KEY")
        if not openai_api_key:
            print("Error: OpenAI API key is required for community summarization.")
            print("Use --openai-api-key or set OPENAI_API_KEY environment variable.")
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
        
        # Create the graph projection if requested
        if args.create_projection:
            print(f"\nCreating graph projection '{args.projection_name}'...")
            with graph_store.driver.session(database=graph_store.database) as session:
                # First check if projection exists and drop it
                session.run(
                    "CALL gds.graph.exists($name) YIELD exists WHERE exists CALL gds.graph.drop($name) YIELD graphName RETURN count(*)",
                    parameters={'name': args.projection_name}
                )
                
                # Create undirected projection
                result = session.run(f"""
                CALL gds.graph.project(
                  '{args.projection_name}',
                  'Entity',
                  {{
                    RELATES_TO: {{
                      type: 'RELATES_TO',
                      orientation: 'UNDIRECTED',
                      properties: {{
                        strength: {{
                          property: 'strength'
                        }}
                      }}
                    }}
                  }}
                ) YIELD nodeCount, relationshipCount, projectMillis
                RETURN nodeCount, relationshipCount, projectMillis
                """)
                
                record = result.single()
                if record:
                    print(f"Graph projection created successfully:")
                    print(f"  - Nodes: {record['nodeCount']}")
                    print(f"  - Relationships: {record['relationshipCount']}")
                    print(f"  - Creation time: {record['projectMillis']}ms")
                else:
                    print("Failed to create graph projection.")
        
        # Verify projection exists if requested or before community detection
        if args.verify_projection or (not args.skip_communities and not args.create_projection):
            projection_exists = verify_graph_projection(graph_store, args.projection_name)
            if not projection_exists and not args.skip_communities:
                print(f"\nWARNING: Graph projection '{args.projection_name}' does not exist. Community detection will likely fail.")
                print("Run with --create-projection to create the graph projection first.")
        
        # Detect communities if not skipped
        if not args.skip_communities:
            try:
                print(f"\nAttempting community detection using {args.algorithm} algorithm...")
                
                # Run community detection using the specified projection name
                community_result = graph_store.detect_communities(
                    algorithm=args.algorithm, 
                    min_community_size=5,
                    resolution=1.0,
                    max_levels=5,
                    verbose=args.verbose,
                    projection_name=args.projection_name
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
                                
                        # Generate summaries if requested
                        if args.summarize_communities:
                            summarization_result = summarize_communities(
                                graph_store, 
                                openai_api_key,
                                model_name=args.openai_model,
                                max_communities=args.max_communities
                            )
                            
                            # Save summarization results to file
                            if not isinstance(summarization_result, dict) or "error" in summarization_result:
                                print(f"Error in community summarization: {summarization_result.get('error', 'Unknown error')}")
                            else:
                                output_file = "community_summaries.json"
                                with open(output_file, 'w', encoding='utf-8') as f:
                                    json.dump(summarization_result, f, indent=2)
                                print(f"Saved summarization results to {output_file}")
                else:
                    print("Community detection completed but no detailed information is available.")
            except Exception as e:
                print(f"Community detection failed: {str(e)}")
                print("Consider running with --skip-communities next time.")
        else:
            print("\nSkipping community detection as requested.")
            
            # If communities already exist, we can still summarize them
            if args.summarize_communities:
                print("\nSummarizing existing communities...")
                summarization_result = summarize_communities(
                    graph_store, 
                    openai_api_key,
                    model_name=args.openai_model,
                    max_communities=args.max_communities
                )
                
                # Save summarization results to file
                if not isinstance(summarization_result, dict) or "error" in summarization_result:
                    print(f"Error in community summarization: {summarization_result.get('error', 'Unknown error')}")
                else:
                    output_file = "community_summaries.json"
                    with open(output_file, 'w', encoding='utf-8') as f:
                        json.dump(summarization_result, f, indent=2)
                    print(f"Saved summarization results to {output_file}")
        
    finally:
        # Close the connection
        graph_store.close()

if __name__ == "__main__":
    main() 