#!/usr/bin/env python
"""
Test script to compare different chunking methods on a sample PDF
"""

import argparse
import logging
import os
import json
import time
from pathlib import Path

from config.etl_settings import CHUNK_TYPE
from parsers.esg_pdf_etl import run_etl_pipeline

def main():
    parser = argparse.ArgumentParser(description="Test different chunking methods")
    parser.add_argument("pdf_path", help="Path to PDF file")
    parser.add_argument("--output-dir", default="output/chunking_test", help="Directory to save output files")
    parser.add_argument("--chunking-methods", default="semantic,mixed,basic", help="Comma-separated list of chunking methods to test")
    
    args = parser.parse_args()
    
    # Configure logging
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)
    
    chunking_methods = args.chunking_methods.split(",")
    results = {}
    
    for method in chunking_methods:
        logger.info(f"Testing {method} chunking method...")
        
        # Temporarily override the chunking type in the module
        import config.etl_settings
        original_type = config.etl_settings.CHUNK_TYPE
        config.etl_settings.CHUNK_TYPE = method
        
        method_output_dir = os.path.join(args.output_dir, method)
        os.makedirs(method_output_dir, exist_ok=True)
        
        # Run the ETL pipeline with this chunking method
        start_time = time.time()
        result = run_etl_pipeline(args.pdf_path, method_output_dir)
        processing_time = time.time() - start_time
        
        # Restore original chunking type
        config.etl_settings.CHUNK_TYPE = original_type
        
        # Record results
        results[method] = {
            "status": result["status"],
            "num_chunks": result.get("num_chunks", 0),
            "processing_time": processing_time,
            "output_path": result.get("output_path", "")
        }
        
        logger.info(f"✅ {method.capitalize()} chunking completed in {processing_time:.2f} seconds")
        logger.info(f"   Created {result.get('num_chunks', 0)} chunks")
    
    # Write comparison summary
    summary_path = os.path.join(args.output_dir, "chunking_comparison.json")
    with open(summary_path, "w") as f:
        json.dump(results, f, indent=2)
    
    # Print comparison table
    logger.info("\n===== Chunking Methods Comparison =====")
    logger.info(f"{'Method':<10} | {'Chunks':<8} | {'Time (s)':<10}")
    logger.info("-" * 35)
    for method, data in results.items():
        logger.info(f"{method:<10} | {data['num_chunks']:<8} | {data['processing_time']:.2f}")
    
    logger.info(f"\nDetailed comparison saved to {summary_path}")

if __name__ == "__main__":
    main() 