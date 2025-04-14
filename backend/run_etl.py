#!/usr/bin/env python
"""
Simple script to run the ETL pipeline on a test file
"""

import argparse
import logging
import os
import sys
from pathlib import Path

# Silence PyPDF warnings before imports
logging.getLogger("pypdf").setLevel(logging.ERROR)

from parsers.esg_pdf_etl import run_etl_pipeline

def main():
    parser = argparse.ArgumentParser(description="Run ETL pipeline on ESG PDF document")
    parser.add_argument("pdf_path", help="Path to PDF file")
    parser.add_argument("output_dir", help="Directory to save output files")
    parser.add_argument("--log-level", default="INFO", 
                       choices=["DEBUG", "INFO", "WARNING", "ERROR"],
                       help="Set logging level")
    
    args = parser.parse_args()
    
    # Configure logging
    numeric_level = getattr(logging, args.log_level.upper(), None)
    logging.basicConfig(level=numeric_level)
    
    # Silence specific loggers
    logging.getLogger("pypdf").setLevel(logging.ERROR)
    
    logger = logging.getLogger(__name__)
    logger.info(f"Running ETL pipeline on {args.pdf_path}")
    
    result = run_etl_pipeline(args.pdf_path, args.output_dir)
    
    if result["status"] == "success":
        logger.info(f"Output saved to: {result['output_path']}")
        
        # Use the actual counts from the result
        num_chunks = result.get('num_chunks', 0)  # Text chunks
        num_ocr = len(result.get('ocr_chunks', []))
        num_tables = len(result.get('tables', []))
        total_chunks = result.get('total_chunks', 0)  # Total chunks (text + OCR)
        
        logger.info(f"Created {total_chunks} total chunks")
        logger.info(f"- Text chunks: {num_chunks}")
        logger.info(f"- OCR chunks: {num_ocr}")
        logger.info(f"- Tables: {num_tables}")
        logger.info(f"✅ ETL pipeline completed in {result.get('processing_time', 0):.2f} seconds")
    else:
        logger.error(f"ETL failed: {result.get('error', 'Unknown error')}")
        sys.exit(1)

if __name__ == "__main__":
    main()