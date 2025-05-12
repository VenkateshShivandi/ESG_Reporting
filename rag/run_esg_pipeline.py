#!/usr/bin/env python3
"""
ESG Document Processing Pipeline

This script orchestrates the complete pipeline for processing ESG documents:
1. Document chunking (PDF → text chunks)
2. Knowledge graph construction (chunks → entities/relationships)
3. Neo4j database import and analysis

The pipeline handles:
- PDF text extraction and chunking
- Entity and relationship extraction using GPT-4
- Graph database import and community detection
- Community analysis and summarization
"""

import os
import sys
import json
import argparse
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client
# Get the absolute path to the project root directory
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Check multiple locations for .env.local
env_locations = [
    os.path.join(PROJECT_ROOT, 'rag', '.env.local'),  # rag/.env.local
    os.path.join(PROJECT_ROOT, '.env.local'),         # ./.env.local
    os.path.join(PROJECT_ROOT, 'backend', '.env.local'),  # backend/.env.local
    os.path.join(PROJECT_ROOT, 'frontend', '.env.local')  # frontend/.env.local
]

# Try to load from any available .env.local
env_file = None
for loc in env_locations:
    if os.path.exists(loc):
        env_file = loc
        break

if env_file:
    print(f"Loading environment from: {env_file}")
    load_dotenv(env_file)
else:
    print("No .env.local file found in any of the expected locations")
    sys.exit(1)

# Debug: Print loaded environment variables
print(f"Loaded NEO4J_URI: {os.getenv('NEO4J_URI')}")
print(f"Loaded NEO4J_USERNAME: {os.getenv('NEO4J_USERNAME')}")
print(f"Loaded NEO4J_PASSWORD: {'[set]' if os.getenv('NEO4J_PASSWORD') else '[not set]'}")

# Add project root to Python path to fix imports
sys.path.insert(0, PROJECT_ROOT)

# Import our pipeline components
from rag.chunking import PDFChunker, process_document
from rag.build_esg_graph import ESGGraphBuilder
from rag.graph_store import Neo4jGraphStore

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

logging.getLogger('rag.graph_store').setLevel(logging.DEBUG)

class ESGPipeline:
    """
    Orchestrates the complete ESG document processing pipeline from PDF to JSON files.
    """
    
    def __init__(self,
                 input_path: str,
                 output_dir: str,
                 neo4j_uri: Optional[str] = None,
                 neo4j_username: Optional[str] = None,
                 neo4j_password: Optional[str] = None,
                 neo4j_database: str = "neo4j",
                 chunk_size: int = 600,
                 chunk_overlap: int = 200,
                 max_chunks: int = 0,
                 max_workers: int = 5,
                 openai_api_key: Optional[str] = None):
        """
        Initialize the ESG pipeline with configuration parameters.
        
        Args:
            input_path: Path to PDF file or directory of PDF files
            output_dir: Directory to save intermediate and final outputs
            neo4j_uri: URI for Neo4j database connection
            neo4j_username: Neo4j username
            neo4j_password: Neo4j password
            neo4j_database: Neo4j database name
            chunk_size: Size of text chunks in characters
            chunk_overlap: Overlap between chunks in characters
            max_chunks: Maximum number of chunks to process (0 for all)
            max_workers: Maximum number of parallel workers
            openai_api_key: OpenAI API key for GPT-4 processing
        """
        self.input_path = input_path
        self.output_dir = output_dir
        self.neo4j_uri = neo4j_uri
        self.neo4j_username = neo4j_username
        self.neo4j_password = neo4j_password
        self.neo4j_database = neo4j_database
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.max_chunks = max_chunks
        self.max_workers = max_workers
        
        # Set up OpenAI API key
        if openai_api_key:
            os.environ["OPENAI_API_KEY"] = openai_api_key
            
        # Create Neo4j connection if parameters provided
        self.graph_store = None
        if all([neo4j_uri, neo4j_username, neo4j_password]):
            self.graph_store = Neo4jGraphStore(
                uri=neo4j_uri,
                username=neo4j_username,
                password=neo4j_password,
                database=neo4j_database
            )
        
        # Create output directories
        self.chunks_dir = os.path.join(output_dir, "chunks")
        self.graph_dir = os.path.join(output_dir, "graph")
        os.makedirs(self.chunks_dir, exist_ok=True)
        os.makedirs(self.graph_dir, exist_ok=True)
        
        # Initialize results storage
        self.results = {
            "start_time": datetime.now().isoformat(),
            "input_path": input_path,
            "output_dir": output_dir,
            "files_processed": [],
            "errors": []
        }
    
    def check_neo4j_connection(self) -> bool:
        """
        Check if Neo4j connection is active and working.
        
        Returns:
            bool: True if connection is active, False otherwise
        """
        if not self.graph_store:
            logger.error("Neo4j connection parameters not provided.")
            return False
            
        try:
            if not self.graph_store.connect():
                logger.error("Failed to connect to Neo4j database. Check that the Neo4j server is running.")
                return False
            
            # Verify connection with a ping
            if not self.graph_store.ping():
                logger.error("Neo4j server connection failed health check.")
                return False
                
            logger.info("Successfully connected to Neo4j server.")
            return True
        except Exception as e:
            logger.error(f"Error connecting to Neo4j: {str(e)}")
            return False
    
    def upload_entities_and_relationships(self, entities: List[Dict[str, Any]], relationships: List[Dict[str, Any]]) -> bool:
        """
        Upload entities and relationships to Supabase Tables.
        """
        try:
            # Initialize Supabase client
            supabase = create_client(
                os.getenv("SUPABASE_URL"),
                os.getenv("SUPABASE_ANON_KEY")
            )
            # Upload entities
            entities_array = self.normalize_entities(entities)
            relationships_array = self.normalize_relationships(relationships)

            # Upload entities
            supabase.postgrest.schema("esg_data").table("entities").insert(entities_array).execute()
            supabase.postgrest.schema("esg_data").table("relationships").insert(relationships_array).execute()
            logger.info("Entities and relationships uploaded to Supabase")
            return True
        except Exception as e:
            logger.error(f"Error uploading entities and relationships to Supabase: {str(e)}")
            return False
                
    def normalize_entities(self, entities: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Normalize entities for Supabase upload.
        """
        return entities
    
    def normalize_relationships(self, relationships: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Normalize relationships for Supabase upload.
        """
        return relationships

    def process_single_file(self, pdf_path: str) -> Dict[str, Any]:
        """
        Process a single PDF file through the pipeline.
        
        Args:
            pdf_path: Path to the PDF file
            
        Returns:
            Dict containing processing results and metrics
        """
        file_result = {
            "file": pdf_path,
            "start_time": datetime.now().isoformat()
        }
        
        try:
            # Step 1: Chunk the PDF
            logger.info(f"Chunking PDF: {pdf_path}")
            chunks = process_document(
                pdf_path,
                chunk_size=self.chunk_size,
                chunk_overlap=self.chunk_overlap,
                output_dir=self.chunks_dir
            )
            
            if not chunks:
                raise Exception("No chunks were created from the PDF")
            
            # Save chunks to JSON
            chunks_file = os.path.join(
                self.chunks_dir,
                f"{Path(pdf_path).stem}_chunks.json"
            )
            
            # Step 2: Build knowledge graph
            logger.info("Building knowledge graph from chunks")
            graph_builder = ESGGraphBuilder(
                chunks_file=chunks_file,
                output_dir=self.graph_dir,
                max_chunks=self.max_chunks,
                max_workers=self.max_workers
            )
            
            graph_result = graph_builder.build_graph()
            # Upload entities and relationships to Supabase
            self.upload_entities_and_relationships(graph_result["entities"], graph_result["relationships"])
            # Get paths to the generated files
            entities_file = os.path.join(self.graph_dir, "entities.json")
            relationships_file = os.path.join(self.graph_dir, "relationships.json")
            
            # Compile results of file processing
            file_result.update({
                "status": "success",
                "chunks": len(chunks),
                "entities": graph_result["entities"],
                "relationships": graph_result["relationships"],
                "entities_file": entities_file,
                "relationships_file": relationships_file
            })
            
            # Step 3: Check Neo4j connection after generating entity-relationships
            neo4j_status = {
                "checked": False,
                "connected": False,
                "error": None,
                "graph_cleared": False,
                "projections_dropped": 0,
                "entities_imported": 0,
                "relationships_imported": 0,
                "communities_detected": 0
            }
            
            if self.graph_store:
                logger.info("Checking Neo4j connection")
                neo4j_status["checked"] = True
                try:
                    connection_successful = self.check_neo4j_connection()
                    neo4j_status["connected"] = connection_successful
                    
                    if connection_successful:
                        logger.info("Neo4j connection successful")
                        
                        # Step 4: Clear existing graph data and projections
                        logger.info("Clearing existing Neo4j graph data and projections")
                        
                        # First, try to drop any existing graph projections
                        try:
                            projections_dropped = self.drop_graph_projections()
                            neo4j_status["projections_dropped"] = projections_dropped
                            logger.info(f"Dropped {projections_dropped} graph projections")
                        except Exception as e:
                            logger.warning(f"Error dropping graph projections: {str(e)}")
                            neo4j_status["projection_error"] = str(e)
                        
                        # Then clear the graph data
                        try:
                            graph_cleared = self.graph_store.clear_graph()
                            neo4j_status["graph_cleared"] = graph_cleared
                            if graph_cleared:
                                logger.info("Successfully cleared Neo4j graph data")
                            else:
                                logger.warning("Failed to clear Neo4j graph data")
                        except Exception as e:
                            logger.warning(f"Error clearing graph data: {str(e)}")
                            neo4j_status["graph_clear_error"] = str(e)
                            
                        # Step 5: Import entities and relationships to Neo4j
                        if graph_cleared:
                            logger.info("Importing knowledge graph to Neo4j")
                            
                            # Create constraints for better performance
                            try:
                                self.graph_store.create_constraints()
                            except Exception as e:
                                logger.warning(f"Error creating constraints: {str(e)}")
                            
                            try:
                                # Load entities and relationships from JSON
                                with open(entities_file, 'r', encoding='utf-8') as f:
                                    entities = json.load(f)
                                
                                with open(relationships_file, 'r', encoding='utf-8') as f:
                                    relationships = json.load(f)
                                
                                # Import entities
                                entities_imported = self.graph_store.import_entities(entities)
                                neo4j_status["entities_imported"] = entities_imported
                                logger.info(f"Imported {entities_imported} entities to Neo4j")
                                
                                # Import relationships
                                relationships_imported = self.graph_store.import_relationships(relationships)
                                neo4j_status["relationships_imported"] = relationships_imported
                                logger.info(f"Imported {relationships_imported} relationships to Neo4j")
                                
                                # Step 6: Perform community detection
                                try:
                                    logger.info("Creating graph projection for community detection")
                                    projection_name = f"esg_graph_{Path(pdf_path).stem}"
                                    projection_result = self.graph_store.create_graph_projection(
                                        projection_name=projection_name,
                                        node_projection=["Entity"],
                                        relationship_projection="*",
                                        configuration={"relationshipProperties": "strength"}
                                    )
                                    
                                    if projection_result:
                                        logger.info("Running community detection with Louvain algorithm")
                                        community_result = self.graph_store.detect_communities(
                                            algorithm="louvain",
                                            min_community_size=3,
                                            projection_name=projection_name
                                        )
                                        
                                        if community_result and "communities" in community_result:
                                            neo4j_status["communities_detected"] = len(community_result["communities"])
                                            neo4j_status["communities"] = community_result["communities"]
                                            logger.info(f"Detected {len(community_result['communities'])} communities")
                                            
                                            # Step 7: Generate community summaries
                                            logger.info("Generating community summaries")
                                            community_summaries = self.graph_store.summarize_communities(
                                                max_communities=10,
                                                max_entities_per_community=10
                                            )
                                            
                                            if community_summaries:
                                                # Step 8: Generate LLM-based community insights
                                                logger.info("Generating LLM-based community insights")
                                                llm_summaries = self.generate_llm_community_insights(community_summaries)
                                                
                                                if llm_summaries:
                                                    neo4j_status["llm_community_insights"] = llm_summaries
                                                    
                                                    # Save insights to file
                                                    insights_file = os.path.join(self.graph_dir, "community_insights.json")
                                                    with open(insights_file, 'w', encoding='utf-8') as f:
                                                        json.dump(llm_summaries, f, indent=2)
                                                        
                                                    logger.info(f"Saved LLM community insights to {insights_file}")
                                                    file_result["community_insights_file"] = insights_file
                                                    
                                                    # Step 9: Store community insights in Neo4j
                                                    logger.info("Storing community insights in Neo4j")
                                                    insights_stored = self.graph_store.store_community_insights(llm_summaries)
                                                    if insights_stored:
                                                        logger.info("Successfully stored community insights in Neo4j")
                                                        neo4j_status["insights_stored_in_neo4j"] = True
                                                    else:
                                                        logger.warning("Failed to store community insights in Neo4j")
                                                        neo4j_status["insights_stored_in_neo4j"] = False
                                                
                                                neo4j_status["community_summaries"] = community_summaries
                                                
                                                # Save summaries to file
                                                summaries_file = os.path.join(self.graph_dir, "community_summaries.json")
                                                with open(summaries_file, 'w', encoding='utf-8') as f:
                                                    json.dump(community_summaries, f, indent=2)
                                                    
                                                logger.info(f"Saved community summaries to {summaries_file}")
                                                file_result["community_summaries_file"] = summaries_file
                                        else:
                                            logger.warning("No communities were detected")
                                    else:
                                        logger.warning("Failed to create graph projection")
                                except Exception as e:
                                    logger.warning(f"Error in community detection: {str(e)}")
                                    neo4j_status["community_error"] = str(e)
                                    
                            except Exception as e:
                                logger.error(f"Error importing to Neo4j: {str(e)}")
                                neo4j_status["import_error"] = str(e)
                    else:
                        logger.warning("Neo4j connection failed")
                        neo4j_status["error"] = "Failed to connect to Neo4j server"
                except Exception as e:
                    logger.error(f"Error during Neo4j connection check: {str(e)}")
                    neo4j_status["error"] = str(e)
            else:
                logger.info("Neo4j connection check skipped - no connection parameters provided")
                
            # Add Neo4j connection status to results
            file_result["neo4j_status"] = neo4j_status
            
            # Complete the process
            file_result["end_time"] = datetime.now().isoformat()
            
            # Show the file_result
            print(f"\nProcessing complete for {pdf_path}:")
            print(f"  - Generated {len(chunks)} chunks")
            print(f"  - Extracted {graph_result['entities']} entities")
            print(f"  - Identified {graph_result['relationships']} relationships")
            print(f"  - Files saved to {self.graph_dir}/")
            
            if neo4j_status["checked"]:
                if neo4j_status["connected"]:
                    print(f"  - ✅ Neo4j connection successful")
                    if neo4j_status["graph_cleared"]:
                        print(f"  - ✅ Neo4j graph data cleared successfully")
                    else:
                        print(f"  - ❌ Failed to clear Neo4j graph data: {neo4j_status.get('graph_clear_error', 'Unknown error')}")
                    
                    print(f"  - ✅ Dropped {neo4j_status['projections_dropped']} graph projections")
                    
                    if "entities_imported" in neo4j_status:
                        print(f"  - ✅ Imported {neo4j_status['entities_imported']} entities to Neo4j")
                    
                    if "relationships_imported" in neo4j_status:
                        print(f"  - ✅ Imported {neo4j_status['relationships_imported']} relationships to Neo4j")
                    
                    if "communities_detected" in neo4j_status and neo4j_status["communities_detected"] > 0:
                        print(f"  - ✅ Detected {neo4j_status['communities_detected']} communities")
                        if "community_summaries" in neo4j_status:
                            print(f"  - ✅ Generated community summaries and saved to {self.graph_dir}/community_summaries.json")
                            
                            if "llm_community_insights" in neo4j_status:
                                print(f"  - ✅ Generated LLM-based community insights and saved to {self.graph_dir}/community_insights.json")
                                
                                if "insights_stored_in_neo4j" in neo4j_status:
                                    if neo4j_status["insights_stored_in_neo4j"]:
                                        print(f"  - ✅ Stored community insights in Neo4j database")
                                    else:
                                        print(f"  - ⚠️ Failed to store community insights in Neo4j database")
                                
                                # Show a sample insight
                                if len(neo4j_status["llm_community_insights"]) > 0:
                                    sample = neo4j_status["llm_community_insights"][0]["llm_insight"]
                                    print(f"\nSample community insight:")
                                    print(f"  Community name: {sample.get('community_name', 'N/A')}")
                                    print(f"  ESG pillar: {sample.get('esg_pillar', 'N/A')}")
                                    print(f"  Importance: {sample.get('importance', 'N/A')}")
                                    print(f"  Summary: {sample.get('summary', 'N/A')}")
                            else:
                                print(f"  - ⚠️ LLM-based community insights were not generated")
                    elif "community_error" in neo4j_status:
                        print(f"  - ❌ Community detection failed: {neo4j_status['community_error']}")
                else:
                    print(f"  - ❌ Neo4j connection failed: {neo4j_status.get('error', 'Unknown error')}")
            
        except Exception as e:
            logger.error(f"Error processing {pdf_path}: {str(e)}")
            file_result.update({
                "status": "error",
                "error": str(e),
                "end_time": datetime.now().isoformat()
            })
        
        return file_result
    
    def drop_graph_projections(self) -> int:
        """
        Drop all existing graph projections in Neo4j.
        
        Returns:
            int: Number of projections dropped
        """
        if not self.graph_store or not self.graph_store.driver:
            logger.error("Not connected to Neo4j")
            return 0
            
        try:
            projections_dropped = 0
            with self.graph_store.driver.session(database=self.graph_store.database) as session:
                # List all projections
                result = session.run("CALL gds.graph.list() YIELD graphName RETURN graphName")
                projections = [record["graphName"] for record in result]
                
                # Drop each projection
                for projection in projections:
                    logger.info(f"Dropping graph projection: {projection}")
                    session.run(f"CALL gds.graph.drop('{projection}') YIELD graphName")
                    projections_dropped += 1
                
            return projections_dropped
        except Exception as e:
            logger.warning(f"Error dropping graph projections: {str(e)}")
            # The error might be because GDS is not available, which is okay
            return 0
    
    def process_directory(self) -> Dict[str, Any]:
        """
        Process all PDF files in the input directory.
        
        Returns:
            Dict containing processing results and metrics
        """
        if os.path.isfile(self.input_path):
            # Single file processing
            result = self.process_single_file(self.input_path)
            self.results["files_processed"].append(result)
        else:
            # Directory processing
            pdf_files = [
                f for f in os.listdir(self.input_path)
                if f.lower().endswith('.pdf')
            ]
            
            for pdf_file in pdf_files:
                pdf_path = os.path.join(self.input_path, pdf_file)
                result = self.process_single_file(pdf_path)
                self.results["files_processed"].append(result)
        
        # Calculate summary metrics
        successful = [f for f in self.results["files_processed"] if f["status"] == "success"]
        failed = [f for f in self.results["files_processed"] if f["status"] == "error"]
        
        self.results.update({
            "end_time": datetime.now().isoformat(),
            "total_files": len(self.results["files_processed"]),
            "successful_files": len(successful),
            "failed_files": len(failed),
            "total_entities": sum(f.get("entities", 0) for f in successful),
            "total_relationships": sum(f.get("relationships", 0) for f in successful)
        })
        
        return self.results
    
    def run(self) -> Dict[str, Any]:
        """
        Run the complete pipeline.
        
        Returns:
            Dict containing all processing results and metrics
        """
        logger.info(f"Starting ESG pipeline processing for: {self.input_path}")
        
        try:
            # Process all files
            results = self.process_directory()
            
            # Save results to JSON
            results_file = os.path.join(self.output_dir, "pipeline_results.json")
            with open(results_file, 'w', encoding='utf-8') as f:
                json.dump(results, f, indent=2)
            
            logger.info(f"Pipeline complete. Results saved to: {results_file}")
            return results
            
        except Exception as e:
            logger.error(f"Pipeline error: {str(e)}")
            self.results["status"] = "error"
            self.results["error"] = str(e)
            return self.results
        finally:
            # Always close Neo4j connection if it was opened
            if self.graph_store:
                self.graph_store.close()

    def generate_llm_community_insights(self, community_summaries: List[Dict]) -> List[Dict]:
        """
        Generate insightful summaries of communities using LLM.
        
        Args:
            community_summaries: List of community summary dictionaries
            
        Returns:
            List of community insights with LLM-generated summaries
        """
        if not community_summaries:
            logger.warning("No community summaries provided for LLM insights")
            return None
            
        try:
            # Check for required packages
            missing_packages = []
            try:
                import langchain
                logger.info(f"LangChain version: {langchain.__version__}")
            except ImportError:
                missing_packages.append("langchain")
            
            try:
                import openai
                logger.info(f"OpenAI version: {openai.__version__}")
            except ImportError:
                missing_packages.append("openai")
                
            if missing_packages:
                package_list = ", ".join(missing_packages)
                logger.warning(f"Required packages not installed: {package_list}")
                logger.warning(f"Please install with: pip install {package_list}")
                return None
                
            # Import specific LangChain modules
            try:
                from langchain_openai import ChatOpenAI
                from langchain_core.prompts import ChatPromptTemplate
            except ImportError as e:
                logger.error(f"Error importing LangChain modules: {str(e)}")
                logger.warning("Try reinstalling with: pip install langchain-openai langchain-community langchain-core")
                return None
            
            # Check if OpenAI API key is set
            if "OPENAI_API_KEY" not in os.environ or not os.environ["OPENAI_API_KEY"]:
                logger.warning("OpenAI API key not set. Skipping LLM community insights.")
                logger.warning("Set OPENAI_API_KEY environment variable to enable LLM insights.")
                return None
                
            # Initialize LLM
            try:
                llm = ChatOpenAI(model="gpt-4-turbo", temperature=0)
                logger.info("Successfully initialized ChatOpenAI model")
            except Exception as e:
                logger.error(f"Error initializing ChatOpenAI: {str(e)}")
                return None
            
            community_insights = []
            
            prompt_template = ChatPromptTemplate.from_template("""
            You are an expert in analyzing ESG (Environmental, Social, and Governance) data and knowledge graphs.
            
            Below is information about a community of connected entities extracted from an ESG document:
            
            Community ID: {community_id}
            Size: {size} entities
            
            Entity Types Distribution:
            {type_distribution}
            
            Key Entities:
            {key_entities}
            
            Please provide:
            1. A concise name for this community (2-5 words)
            2. A summary of what this community represents in the context of ESG reporting (2-3 sentences)
            3. The likely ESG theme or pillar (E, S, or G) this community belongs to
            4. Potential importance of this community in ESG analysis
            
            Format your response as valid JSON with the following structure:
            {{
                "community_name": "Name of the Community",
                "summary": "Your summary of what this community represents...",
                "esg_pillar": "Environmental/Social/Governance",
                "importance": "High/Medium/Low",
                "analysis": "Brief analysis of the significance..."
            }}
            
            Provide ONLY the JSON, with no additional text before or after.
            """)
            
            # Process each community
            for community in community_summaries:
                try:
                    community_id = community["community_id"]
                    size = community["size"]
                    
                    # Format type distribution
                    type_dist_str = "\n".join([f"- {entity_type}: {count}" 
                                            for entity_type, count in community["type_distribution"].items()])
                    
                    # Format key entities
                    key_entities_str = "\n".join([f"- {entity}" for entity in community["key_entities"]])
                    
                    # Generate the prompt
                    messages = prompt_template.format_messages(
                        community_id=community_id,
                        size=size,
                        type_distribution=type_dist_str,
                        key_entities=key_entities_str
                    )
                    
                    # Get response from LLM
                    logger.info(f"Calling LLM for community {community_id}")
                    response = llm.invoke(messages)
                    
                    # Parse JSON response
                    try:
                        import json
                        llm_insight = json.loads(response.content)
                        
                        # Combine with community data
                        insight = {
                            "community_id": community_id,
                            "size": size,
                            "llm_insight": llm_insight,
                            "entity_types": community["type_distribution"],
                            "key_entities": community["key_entities"]
                        }
                        
                        community_insights.append(insight)
                        logger.info(f"Generated LLM insight for community {community_id}")
                        
                    except json.JSONDecodeError:
                        logger.warning(f"Could not parse LLM response as JSON for community {community_id}")
                        logger.debug(f"Raw response: {response.content}")
                        
                except Exception as e:
                    logger.warning(f"Error generating insight for community {community['community_id']}: {str(e)}")
            
            logger.info(f"Generated LLM insights for {len(community_insights)} communities")
            return community_insights
            
        except Exception as e:
            import traceback
            logger.error(f"Error generating LLM community insights: {str(e)}")
            logger.error(traceback.format_exc())
            return None

def main():
    """Command-line interface for the ESG pipeline"""
    parser = argparse.ArgumentParser(
        description="Run the ESG document processing pipeline for file generation"
    )
    
    # Input and output
    parser.add_argument("input_path",
                        help="Path to PDF file or directory of PDF files")
    parser.add_argument("--output-dir", "-o",
                        default="pipeline_output",
                        help="Directory for pipeline outputs")
    
    # Chunking options
    parser.add_argument("--chunk-size",
                        type=int, default=600,
                        help="Size of text chunks in characters")
    parser.add_argument("--chunk-overlap",
                        type=int, default=200,
                        help="Overlap between chunks in characters")
    
    # Processing options
    parser.add_argument("--max-chunks",
                        type=int, default=0,
                        help="Maximum chunks to process (0 for all)")
    parser.add_argument("--max-workers",
                        type=int, default=5,
                        help="Maximum number of parallel workers")
    
    # Neo4j options - use environment variables as defaults
    parser.add_argument("--neo4j-uri",
                        default=os.getenv("NEO4J_URI"),
                        help="Neo4j URI (default: from environment)")
    parser.add_argument("--neo4j-username",
                        default=os.getenv("NEO4J_USERNAME"),
                        help="Neo4j username (default: from environment)")
    parser.add_argument("--neo4j-password",
                        default=os.getenv("NEO4J_PASSWORD"),
                        help="Neo4j password (default: from environment)")
    parser.add_argument("--neo4j-database",
                        default="neo4j",
                        help="Neo4j database name")
    
    # OpenAI options
    parser.add_argument("--openai-api-key",
                        default=os.getenv("OPENAI_API_KEY"),
                        help="OpenAI API key (default: from environment)")
    
    args = parser.parse_args()
    
    # Create and run the pipeline
    pipeline = ESGPipeline(
        input_path=args.input_path,
        output_dir=args.output_dir,
        neo4j_uri=args.neo4j_uri,
        neo4j_username=args.neo4j_username,
        neo4j_password=args.neo4j_password,
        neo4j_database=args.neo4j_database,
        chunk_size=args.chunk_size,
        chunk_overlap=args.chunk_overlap,
        max_chunks=args.max_chunks,
        max_workers=args.max_workers,
        openai_api_key=args.openai_api_key
    )
    
    results = pipeline.run()
    
    # Print summary
    if results.get("status") == "error":
        print(f"\nPipeline failed: {results.get('error')}")
        sys.exit(1)
    else:
        print("\nPipeline completed successfully!")
        print(f"Files processed: {results['total_files']}")
        print(f"Successful: {results['successful_files']}")
        print(f"Failed: {results['failed_files']}")
        print(f"Total entities: {results.get('total_entities', 0)}")
        print(f"Total relationships: {results.get('total_relationships', 0)}")
        print(f"\nResults saved to: {os.path.join(args.output_dir, 'pipeline_results.json')}")
        print(f"\nEntity and relationship files generated in: {args.output_dir}/graph/")

if __name__ == "__main__":
    main() 