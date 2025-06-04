"""
Test script for the PDF ETL pipeline

This script demonstrates how to use the PDF ETL pipeline to:
1. Extract content from PDF files
2. Transform the content into semantic chunks
3. Load the chunks into JSON files

Usage:
    python test_etl.py [pdf_path]
"""

import os
import sys
import json
import logging
from pathlib import Path

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Add the parent directory to sys.path to import parsers module
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Try to import the ETL module
ETL_AVAILABLE = False
try:
    # First try the direct import when running from backend
    try:
        from parsers.esg_pdf_etl import run_etl_pipeline, extract_from_pdf, transform_content, load_chunks
        ETL_AVAILABLE = True
        logger.info("Successfully imported ETL module from parsers package")
    except ImportError as e1:
        # Try importing as a top-level module
        try:
            import parsers.esg_pdf_etl
            run_etl_pipeline = parsers.esg_pdf_etl.run_etl_pipeline
            extract_from_pdf = parsers.esg_pdf_etl.extract_from_pdf
            transform_content = parsers.esg_pdf_etl.transform_content
            load_chunks = parsers.esg_pdf_etl.load_chunks
            ETL_AVAILABLE = True
            logger.info("Successfully imported ETL module as top-level package")
        except ImportError as e2:
            logger.error(f"Error importing ETL module: {str(e2)}")
except Exception as e:
    logger.error(f"Unexpected error importing ETL module: {str(e)}")

def test_etl_pipeline(pdf_path=None):
    """
    Test the ETL pipeline on a PDF file.
    
    Args:
        pdf_path (str, optional): Path to the PDF file. If None, use a test PDF.
    """
    if not ETL_AVAILABLE:
        logger.error("ETL module not available. Please check your installation.")
        return
    
    # Use default PDF path if not provided
    if pdf_path is None:
        # Use the test_files directory that already contains PDFs
        test_files_dir = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(__file__)), 'test_files'))
        logger.info(f"Looking for test PDFs in: {test_files_dir}")
        
        # Check if the directory exists
        if not os.path.exists(test_files_dir):
            logger.error(f"Test files directory not found: {test_files_dir}")
            return
        
        # Check if we have any PDFs in the test_files directory
        test_pdfs = [f for f in os.listdir(test_files_dir) if f.lower().endswith('.pdf')]
        
        if test_pdfs:
            # Use the Invoice.pdf file if available, otherwise use the first PDF
            invoice_pdf = next((f for f in test_pdfs if f.lower() == 'invoice.pdf'), None)
            
            if invoice_pdf:
                pdf_path = os.path.join(test_files_dir, invoice_pdf)
                logger.info(f"Using Invoice PDF: {invoice_pdf}")
            else:
                pdf_path = os.path.join(test_files_dir, test_pdfs[0])
                logger.info(f"Invoice.pdf not found. Using test PDF: {test_pdfs[0]}")
        else:
            # No test PDFs found
            logger.error("No test PDFs found in the test_files directory.")
            return
    else:
        # Make sure the provided path is absolute
        pdf_path = os.path.abspath(pdf_path)
        
        # Check if the file exists
        if not os.path.exists(pdf_path):
            logger.error(f"PDF file not found at path: {pdf_path}")
            return
    
    # Create output directory if it doesn't exist
    output_dir = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(__file__)), 'output', 'chunks'))
    os.makedirs(output_dir, exist_ok=True)
    
    logger.info(f"Testing ETL pipeline on {pdf_path}")
    logger.info(f"Output directory: {output_dir}")
    
    # Run the ETL pipeline
    result = run_etl_pipeline(pdf_path, output_dir)
    
    # Print the result
    if result['status'] == 'success':  # Match the actual API
        logger.info(f"ETL pipeline completed successfully!")
        logger.info(f"PDF path: {pdf_path}")
        logger.info(f"Output path: {result['output_path']}")
        logger.info(f"Number of chunks: {result.get('num_chunks', 0)}")
        
        # Load the output file to get the chunks for a sample
        try:
            with open(result['output_path'], 'r', encoding='utf-8') as f:
                output_data = json.load(f)
                
            # Check if we have chunks in the output file
            chunk_key = 'chunks'  # Updated to match the new output format
            if chunk_key in output_data and output_data[chunk_key]:
                # Print sample from first chunk
                sample_chunk = output_data[chunk_key][0]
                logger.info(f"Sample chunk:")
                
                if 'text' in sample_chunk:
                    # Print only the first 100 characters of the text
                    text = sample_chunk['text']
                    logger.info(f"  Text: {text[:100]}..." if len(text) > 100 else f"  Text: {text}")
                
                if 'esg_relevance' in sample_chunk:
                    logger.info(f"  ESG relevance: {sample_chunk['esg_relevance']}")
                    
                logger.info(f"Total chunks: {len(output_data[chunk_key])}")
        except Exception as e:
            logger.warning(f"Could not read chunks from output file: {str(e)}")
            import traceback
            logger.warning(traceback.format_exc())
    else:
        logger.error(f"ETL pipeline failed: {result.get('error', 'Unknown error')}")

def test_individual_components(pdf_path=None):
    """
    Test each component of the ETL pipeline separately.
    
    Args:
        pdf_path (str, optional): Path to the PDF file. If None, use a test PDF.
    """
    if not ETL_AVAILABLE:
        logger.error("ETL module not available. Please check your installation.")
        return
    
    # Use default PDF path if not provided (same logic as in test_etl_pipeline)
    if pdf_path is None:
        test_files_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'test_files')
        
        if not os.path.exists(test_files_dir):
            logger.error(f"Test files directory not found: {test_files_dir}")
            return
        
        test_pdfs = [f for f in os.listdir(test_files_dir) if f.lower().endswith('.pdf')]
        
        if test_pdfs:
            pdf_path = os.path.join(test_files_dir, test_pdfs[0])
            logger.info(f"Using test PDF: {test_pdfs[0]}")
        else:
            logger.error("No test PDFs found in the test_files directory.")
            return
    
    logger.info(f"Testing individual ETL components on {pdf_path}")
    
    # Test extraction
    logger.info("Testing extraction...")
    extraction_result = extract_from_pdf(pdf_path)
    
    if extraction_result['status'] == 'success':
        num_pages_extracted = sum(len(pages) for pages in extraction_result['content'].values())
        logger.info(f"Extraction successful - extracted content from {num_pages_extracted} pages")
        
        # Test transformation
        logger.info("Testing transformation...")
        transformation_result = transform_content(extraction_result)
        
        if transformation_result['status'] == 'success':
            logger.info(f"Transformation successful - created {transformation_result.get('total_chunks', 0)} chunks")
            
            # Test loading
            logger.info("Testing loading...")
            output_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'output', 'chunks')
            os.makedirs(output_dir, exist_ok=True)
            
            output_path = load_chunks(transformation_result, output_dir)
            
            if output_path:
                logger.info(f"Loading successful - saved chunks to {output_path}")
            else:
                logger.error("Loading failed")
        else:
            logger.error(f"Transformation failed: {transformation_result.get('error', 'Unknown error')}")
    else:
        logger.error(f"Extraction failed: {extraction_result.get('error', 'Unknown error')}")

def main():
    """
    Main function to run the tests.
    """
    # Get PDF path from command line argument if provided
    pdf_path = sys.argv[1] if len(sys.argv) > 1 else None
    
    # Test the full ETL pipeline
    test_etl_pipeline(pdf_path)
    
    # Test individual components
    # test_individual_components(pdf_path)

if __name__ == "__main__":
    main() 