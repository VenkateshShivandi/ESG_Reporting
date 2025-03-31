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
from typing import Dict, Any, Optional
from datetime import datetime
from dotenv import load_dotenv

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

class ESGPipeline:
    """
    Orchestrates the complete ESG document processing pipeline from PDF to Neo4j graph.
    """
    
    def __init__(self,
                 input_path: str,
                 output_dir: str,
                 neo4j_uri: str,
                 neo4j_username: str,
                 neo4j_password: str,
                 neo4j_database: str = "neo4j",
                 chunk_size: int = 600,
                 chunk_overlap: int = 200,
                 max_chunks: int = 0,
                 max_workers: int = 5,
                 clear_existing: bool = False,
                 skip_communities: bool = False,
                 community_algorithm: str = "louvain",
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
            clear_existing: Whether to clear existing Neo4j data
            skip_communities: Whether to skip community detection
            community_algorithm: Algorithm for community detection
            openai_api_key: OpenAI API key for GPT-4 processing
        """
        self.input_path = input_path
        self.output_dir = output_dir
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.max_chunks = max_chunks
        self.max_workers = max_workers
        self.clear_existing = clear_existing
        self.skip_communities = skip_communities
        self.community_algorithm = community_algorithm
        
        # Set up OpenAI API key
        if openai_api_key:
            os.environ["OPENAI_API_KEY"] = openai_api_key
        
        # Create Neo4j connection
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
    
    def process_single_file(self, pdf_path: str) -> Dict[str, Any]:
        """
        Process a single PDF file through the complete pipeline.
        
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
            
            # Get paths to the generated files
            entities_file = os.path.join(self.graph_dir, "entities.json")
            relationships_file = os.path.join(self.graph_dir, "relationships.json")
            
            # Step 3: Import to Neo4j
            logger.info("Importing to Neo4j database")
            import_result = self.graph_store.import_knowledge_graph(
                entities_file=entities_file,
                relationships_file=relationships_file
            )
            
            # Run community detection if not skipped
            if not self.skip_communities:
                logger.info("Running community detection")
                community_result = self.graph_store.detect_communities(
                    algorithm=self.community_algorithm,
                    min_community_size=5
                )
                file_result["communities"] = community_result
            
            # Compile results
            file_result.update({
                "status": "success",
                "chunks": len(chunks),
                "entities": graph_result["entities"],
                "relationships": graph_result["relationships"],
                "neo4j_import": import_result,
                "end_time": datetime.now().isoformat()
            })
            
        except Exception as e:
            logger.error(f"Error processing {pdf_path}: {str(e)}")
            file_result.update({
                "status": "error",
                "error": str(e),
                "end_time": datetime.now().isoformat()
            })
        
        return file_result
    
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
            # Connect to Neo4j
            if not self.graph_store.connect():
                raise Exception("Failed to connect to Neo4j database")
            
            # Clear existing data if requested
            if self.clear_existing:
                logger.info("Clearing existing Neo4j data")
                self.graph_store.clear_graph()
            
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
            # Always close Neo4j connection
            self.graph_store.close()

def main():
    """Command-line interface for the ESG pipeline"""
    parser = argparse.ArgumentParser(
        description="Run the complete ESG document processing pipeline"
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
    
    # Neo4j options
    parser.add_argument("--neo4j-uri",
                        default=os.getenv("NEO4J_URI"),
                        help="Neo4j URI")
    parser.add_argument("--neo4j-username",
                        default=os.getenv("NEO4J_USERNAME"),
                        help="Neo4j username")
    parser.add_argument("--neo4j-password",
                        default=os.getenv("NEO4J_PASSWORD"),
                        help="Neo4j password")
    parser.add_argument("--neo4j-database",
                        default="neo4j",
                        help="Neo4j database name")
    parser.add_argument("--clear-existing",
                        action="store_true",
                        help="Clear existing Neo4j data")
    
    # Community detection options
    parser.add_argument("--skip-communities",
                        action="store_true",
                        help="Skip community detection")
    parser.add_argument("--community-algorithm",
                        default="louvain",
                        choices=["louvain", "leiden", "label_propagation"],
                        help="Community detection algorithm")
    
    # OpenAI options
    parser.add_argument("--openai-api-key",
                        default=os.getenv("OPENAI_API_KEY"),
                        help="OpenAI API key")
    
    args = parser.parse_args()
    
    # Validate Neo4j connection parameters
    if not all([args.neo4j_uri, args.neo4j_username, args.neo4j_password]):
        parser.error(
            "Neo4j connection parameters are required. "
            "Use arguments or environment variables: "
            "NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD"
        )
    
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
        clear_existing=args.clear_existing,
        skip_communities=args.skip_communities,
        community_algorithm=args.community_algorithm,
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
        print(f"Total entities: {results['total_entities']}")
        print(f"Total relationships: {results['total_relationships']}")
        print(f"\nResults saved to: {os.path.join(args.output_dir, 'pipeline_results.json')}")

if __name__ == "__main__":
    # Load environment variables
    load_dotenv()
    main() 