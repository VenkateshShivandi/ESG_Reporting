"""
ESG PDF ETL Pipeline

A streamlined Extract-Transform-Load pipeline for processing PDF documents 
to extract ESG-relevant content and prepare it for RAG (Retrieval Augmented Generation).

This module orchestrates:
1. Extraction - Extract text and tables from PDF documents
2. Transformation - Create semantic chunks and calculate ESG relevance
3. Loading - Save processed chunks for RAG integration
"""

import os
import sys
import logging
import time
from typing import Dict, Any
from datetime import datetime

# Import refactored modules
from parsers.pdf_parser.extraction import extract_from_pdf, check_file_exists, get_file_extension, is_supported_pdf
from parsers.pdf_parser.transformation import transform_content
from parsers.pdf_parser.loading import load_chunks
from parsers.pdf_parser.metadata import extract_document_metadata
from parsers.pdf_parser.section_hierarchy import build_section_hierarchy
from parsers.pdf_parser.chunk_enrichment import enrich_chunks_with_metadata
from parsers.utils.structure_utils import detect_headers

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

def run_etl_pipeline(pdf_path: str, output_dir: str, **kwargs) -> Dict[str, Any]:
    """Orchestrate ETL process using refactored modules."""
    if not is_supported_pdf(pdf_path):
        raise ValueError(f"Unsupported file format: {pdf_path}")
    
    # Create directory structure
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    filename = os.path.basename(pdf_path).split(".")[0]
    document_dir = os.path.join(output_dir, filename)
    os.makedirs(document_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    timestamped_dir = os.path.join(document_dir, timestamp)
    os.makedirs(timestamped_dir, exist_ok=True)
    images_dir = os.path.join(timestamped_dir, "images")
    os.makedirs(images_dir, exist_ok=True)
    
    # Initialize result structure
    result = {
        "file_path": pdf_path,
        "output_dir": output_dir,
        "status": "success",
        "messages": [],
    }
    
    # Extraction phase
    extraction_start = time.time()
    extracted_data = extract_from_pdf(pdf_path, images_dir)
    extraction_time = time.time() - extraction_start
    
    # Transformation phase
    transformation_start = time.time()
    transformed_data = transform_content(extracted_data)
    transformation_time = time.time() - transformation_start
    
    # Inside run_etl_pipeline function, after extraction
    # Add this line to detect headers if they're not already in transformed_data
    if "headers" not in transformed_data:
        text = extracted_data["text"][extracted_data["metadata"]["best_text_extractor"]]
        transformed_data["headers"] = detect_headers(
            "\n".join([text[i] for i in sorted(text.keys())]), 
            extracted_data["text"][extracted_data["metadata"]["best_text_extractor"]]
        )
    
    # Loading phase - Fix the parameter order here
    loading_start = time.time()
    output_result = load_chunks(extracted_data, transformed_data, timestamped_dir, pdf_path)
    loading_time = time.time() - loading_start
    
    # Calculate total processing time
    total_time = extraction_time + transformation_time + loading_time
    
    # Build result object
    result.update(output_result)  # Add output_result to our result
    result["extraction_time"] = extraction_time
    result["transformation_time"] = transformation_time
    result["loading_time"] = loading_time
    result["processing_time"] = total_time
    
    # Build section hierarchy
    section_hierarchy = build_section_hierarchy(transformed_data.get("headers", []))
    
    # Get extended document metadata
    doc_metadata = extract_document_metadata(pdf_path)
    
    # After chunks are created but before saving
    # Use the chunks from transformed_data since result might not have them yet
    if "chunks" in transformed_data:
        enriched_chunks = enrich_chunks_with_metadata(transformed_data["chunks"], doc_metadata, section_hierarchy)
        result["chunks"] = enriched_chunks  # Store enriched chunks in result
    
    return result

def process_directory(input_dir: str, output_dir: str) -> Dict[str, Any]:
    """Process all PDF files in a directory."""
    logger.info(f"Processing all PDFs in {input_dir}")
    os.makedirs(output_dir, exist_ok=True)
    results = {}
    pdf_files = [f for f in os.listdir(input_dir) if f.lower().endswith(".pdf")]
    for pdf_file in pdf_files:
        pdf_path = os.path.join(input_dir, pdf_file)
        result = run_etl_pipeline(pdf_path, output_dir)
        results[pdf_file] = result
    summary = {
        "total_files": len(pdf_files),
        "successful": sum(1 for r in results.values() if r["status"] == "success"),
        "failed": sum(1 for r in results.values() if r["status"] == "error"),
        "total_chunks": sum(r.get("chunk_count", 0) for r in results.values() if r["status"] == "success"),
        "results": results
    }
    logger.info(f"Completed processing {len(pdf_files)} files. Success: {summary['successful']}, Failed: {summary['failed']}")
    return summary

if __name__ == "__main__":
    if len(sys.argv) > 2:
        input_path = sys.argv[1]
        output_dir = sys.argv[2]
        if os.path.isdir(input_path):
            results = process_directory(input_path, output_dir)
            print(f"Processed {results['total_files']} files with {results['total_chunks']} total chunks")
        else:
            result = run_etl_pipeline(input_path, output_dir)
            if result["status"] == "success":
                print(f"Successfully processed {input_path} - Created {result['chunk_count']} chunks")
            else:
                print(f"Failed to process {input_path}: {result.get('error', 'Unknown error')}")
    elif len(sys.argv) > 1:
        input_path = sys.argv[1]
        output_dir = os.path.join(os.path.dirname(__file__), "output", "chunks")
        if os.path.isdir(input_path):
            results = process_directory(input_path, output_dir)
            print(f"Processed {results['total_files']} files with {results['total_chunks']} total chunks")
            print(f"Output saved to {output_dir}")
        else:
            result = run_etl_pipeline(input_path, output_dir)
            if result["status"] == "success":
                print(f"Successfully processed {input_path} - Created {result['chunk_count']} chunks")
                print(f"Output saved to {result['output_path']}")
            else:
                print(f"Failed to process {input_path}: {result.get('error', 'Unknown error')}")
    else:
        print("Usage: python esg_pdf_etl.py [input_path] [output_dir]")
        print("  input_path: Path to PDF file or directory containing PDF files")
        print("  output_dir: Directory to save output files (optional)") 