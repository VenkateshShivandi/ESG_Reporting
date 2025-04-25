"""
ESG Reporting PDF Parsers

This package provides functionality for parsing various document types,
with a focus on PDF files for ESG reporting.

Main components:
- ETL pipeline for creating semantically coherent chunks
"""

import os
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import core functionality
try:
    from .esg_pdf_etl import run_etl_pipeline, extract_from_pdf, transform_content, load_chunks
    # Updated imports from the utils package
    from .utils.text_utils import clean_text, detect_language
    from .utils.file_utils import create_directory
    
    # Define parse_pdf to use extract_from_pdf for compatibility
    def parse_pdf(file_path):
        """
        Parse a PDF file using the extract_from_pdf function from esg_pdf_etl.
        
        Args:
            file_path (str): Path to the PDF file
            
        Returns:
            dict: Extracted content and metadata
        """
        return extract_from_pdf(file_path)
    
    # Only import other parsers if explicitly requested (avoids warnings)
    _SUPPRESS_PARSER_WARNINGS = True
    parse_excel = None
    parse_docx = None
    parse_pptx = None
    parse_csv = None
    parse_image = None
    parse_xml = None
    
    def parse_file(file_path):
        """
        Parse a file based on its extension.
        
        Args:
            file_path (str): Path to the file
            
        Returns:
            dict: Parsed data
        """
        if not os.path.exists(file_path):
            return {"error": f"File not found: {file_path}"}
        
        _, ext = os.path.splitext(file_path)
        ext = ext.lower()[1:]  # Remove the dot
        
        # For PDF ETL, we only care about PDF files
        if ext in ['pdf']:
            return parse_pdf(file_path)
        else:
            return {"error": f"Only PDF files are supported in ETL mode"}
    
except ImportError as e:
    logger.error(f"Error importing parsers: {str(e)}")
    
    # Define empty functions as placeholders
    def parse_file(file_path):
        return {"error": "Parsers not available"}
    
    def parse_pdf(file_path):
        return {"error": "PDF parser not available"}
    
    run_etl_pipeline = None
    extract_from_pdf = None
    transform_content = None
    load_chunks = None

# Empty file to mark as package 