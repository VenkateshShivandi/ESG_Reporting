"""
PDF Parser Module

This module provides functionality to parse PDF files using multiple libraries:
- PyPDF2: Basic text and metadata extraction
- pdfminer.six: Detailed text extraction with layout preservation
- Camelot: Table extraction from PDFs
- PyMuPDF (fitz): Fast processing for large PDFs
- Tesseract-OCR: OCR for scanned PDFs

The main function is parse_pdf(), which tries different methods
to extract as much information as possible from a PDF file.
"""

import os
import io
import logging
from typing import Dict, List, Any, Tuple, Optional, Union

# Import utility functions
from .utils import safe_parse, create_result_dict

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to import the required libraries
try:
    import PyPDF2
    PYPDF2_AVAILABLE = True
except ImportError:
    PYPDF2_AVAILABLE = False
    logger.warning("PyPDF2 not available. Basic PDF parsing will be limited.")

try:
    from pdfminer.high_level import extract_text as pdfminer_extract_text
    from pdfminer.pdfpage import PDFPage
    from pdfminer.pdfinterp import PDFResourceManager, PDFPageInterpreter
    from pdfminer.converter import TextConverter
    from pdfminer.layout import LAParams
    PDFMINER_AVAILABLE = True
except ImportError:
    PDFMINER_AVAILABLE = False
    logger.warning("pdfminer.six not available. Detailed text extraction will be limited.")

try:
    import fitz  # PyMuPDF
    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False
    logger.warning("PyMuPDF not available. Fast processing for large PDFs will be limited.")

try:
    import camelot
    CAMELOT_AVAILABLE = True
except ImportError:
    CAMELOT_AVAILABLE = False
    logger.warning("Camelot not available. Table extraction from PDFs will be limited.")

try:
    import pytesseract
    from PIL import Image
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    logger.warning("Tesseract-OCR not available. OCR for scanned PDFs will be limited.")

def _is_pdf_encrypted(file_path: str) -> bool:
    """
    Check if a PDF file is encrypted/password-protected.
    
    Args:
        file_path (str): Path to the PDF file
        
    Returns:
        bool: True if the PDF is encrypted, False otherwise
    """
    try:
        if PYPDF2_AVAILABLE:
            with open(file_path, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                return reader.is_encrypted
        elif PYMUPDF_AVAILABLE:
            doc = fitz.open(file_path)
            is_encrypted = doc.is_encrypted
            doc.close()
            return is_encrypted
        return False
    except Exception as e:
        logger.error(f"Error checking if PDF is encrypted: {str(e)}")
        return False

def _is_scanned_pdf(file_path: str) -> bool:
    """
    Attempt to determine if a PDF is scanned (image-based) or has text content.
    
    Args:
        file_path (str): Path to the PDF file
        
    Returns:
        bool: True if the PDF appears to be scanned, False otherwise
    """
    try:
        # Try PyPDF2 first
        if PYPDF2_AVAILABLE:
            with open(file_path, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                # Check first 5 pages (or all if fewer)
                num_pages = min(5, len(reader.pages))
                text_count = 0
                
                for i in range(num_pages):
                    text = reader.pages[i].extract_text().strip()
                    if text:
                        text_count += 1
                
                # If less than half the pages have text, consider it scanned
                return text_count < num_pages / 2
        
        # Try PyMuPDF as a backup
        elif PYMUPDF_AVAILABLE:
            doc = fitz.open(file_path)
            # Check first 5 pages (or all if fewer)
            num_pages = min(5, doc.page_count)
            text_count = 0
            
            for i in range(num_pages):
                text = doc[i].get_text().strip()
                if text:
                    text_count += 1
            
            doc.close()
            # If less than half the pages have text, consider it scanned
            return text_count < num_pages / 2
        
        return True  # Assume it's scanned if we can't check
    
    except Exception as e:
        logger.error(f"Error checking if PDF is scanned: {str(e)}")
        return True  # Assume it's scanned if there's an error

def extract_text_with_pypdf2(file_path: str) -> str:
    """
    Extract text from a PDF file using PyPDF2.
    
    Args:
        file_path (str): Path to the PDF file
        
    Returns:
        str: Extracted text
    """
    if not PYPDF2_AVAILABLE:
        return ""
    
    try:
        text = ""
        with open(file_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            
            # Extract text from each page
            for page in reader.pages:
                text += page.extract_text() + "\n\n"
                
        return text.strip()
    except Exception as e:
        logger.error(f"Error extracting text with PyPDF2: {str(e)}")
        return ""

def extract_text_with_pdfminer(file_path: str) -> str:
    """
    Extract text from a PDF file using pdfminer.six.
    
    Args:
        file_path (str): Path to the PDF file
        
    Returns:
        str: Extracted text
    """
    if not PDFMINER_AVAILABLE:
        return ""
    
    try:
        return pdfminer_extract_text(file_path)
    except Exception as e:
        logger.error(f"Error extracting text with pdfminer: {str(e)}")
        return ""

def extract_text_with_pymupdf(file_path: str) -> str:
    """
    Extract text from a PDF file using PyMuPDF (fitz).
    
    Args:
        file_path (str): Path to the PDF file
        
    Returns:
        str: Extracted text
    """
    if not PYMUPDF_AVAILABLE:
        return ""
    
    try:
        text = ""
        doc = fitz.open(file_path)
        
        # Extract text from each page
        for page in doc:
            text += page.get_text() + "\n\n"
            
        doc.close()
        return text.strip()
    except Exception as e:
        logger.error(f"Error extracting text with PyMuPDF: {str(e)}")
        return ""

def extract_tables_with_camelot(file_path: str) -> List[List[List[str]]]:
    """
    Extract tables from a PDF file using Camelot.
    
    Args:
        file_path (str): Path to the PDF file
        
    Returns:
        List[List[List[str]]]: List of tables, where each table is a list of rows,
                              and each row is a list of cell values
    """
    if not CAMELOT_AVAILABLE:
        return []
    
    try:
        tables = camelot.read_pdf(file_path, pages='all', flavor='stream')
        result = []
        
        for table in tables:
            result.append(table.data)
            
        return result
    except Exception as e:
        logger.error(f"Error extracting tables with Camelot: {str(e)}")
        return []

def extract_text_with_ocr(file_path: str) -> str:
    """
    Extract text from a PDF file using OCR (Tesseract).
    
    Args:
        file_path (str): Path to the PDF file
        
    Returns:
        str: Extracted text
    """
    if not (TESSERACT_AVAILABLE and PYMUPDF_AVAILABLE):
        return ""
    
    try:
        text = ""
        doc = fitz.open(file_path)
        
        # Process each page
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            pix = page.get_pixmap(matrix=fitz.Matrix(300/72, 300/72))
            
            # Convert to PIL Image
            img = Image.open(io.BytesIO(pix.tobytes()))
            
            # Perform OCR
            page_text = pytesseract.image_to_string(img)
            text += page_text + "\n\n"
            
        doc.close()
        return text.strip()
    except Exception as e:
        logger.error(f"Error extracting text with OCR: {str(e)}")
        return ""

def extract_metadata_with_pypdf2(file_path: str) -> Dict[str, Any]:
    """
    Extract metadata from a PDF file using PyPDF2.
    
    Args:
        file_path (str): Path to the PDF file
        
    Returns:
        Dict[str, Any]: Metadata dictionary
    """
    if not PYPDF2_AVAILABLE:
        return {}
    
    try:
        with open(file_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            metadata = reader.metadata
            
            result = {}
            if metadata:
                for key, value in metadata.items():
                    # Clean up the key (remove leading '/')
                    clean_key = key[1:] if key.startswith('/') else key
                    result[clean_key] = value
                    
            # Add page count
            result['PageCount'] = len(reader.pages)
            
            return result
    except Exception as e:
        logger.error(f"Error extracting metadata with PyPDF2: {str(e)}")
        return {}

def extract_metadata_with_pymupdf(file_path: str) -> Dict[str, Any]:
    """
    Extract metadata from a PDF file using PyMuPDF.
    
    Args:
        file_path (str): Path to the PDF file
        
    Returns:
        Dict[str, Any]: Metadata dictionary
    """
    if not PYMUPDF_AVAILABLE:
        return {}
    
    try:
        doc = fitz.open(file_path)
        metadata = doc.metadata
        
        # Add page count
        metadata['PageCount'] = doc.page_count
        
        doc.close()
        return metadata
    except Exception as e:
        logger.error(f"Error extracting metadata with PyMuPDF: {str(e)}")
        return {}

def _parse_pdf_internal(file_path: str) -> Dict[str, Any]:
    """
    Internal function to parse a PDF file.
    
    Args:
        file_path (str): Path to the PDF file
        
    Returns:
        Dict[str, Any]: Parsed content
    """
    # Check if PDF is encrypted
    if _is_pdf_encrypted(file_path):
        return create_result_dict(error="File is password-protected.")
    
    # Check if PDF is scanned
    is_scanned = _is_scanned_pdf(file_path)
    
    # Extract text
    text = ""
    
    if not is_scanned:
        # For text PDFs, try different libraries in order of preference
        if PYPDF2_AVAILABLE:
            text = extract_text_with_pypdf2(file_path)
        
        # If PyPDF2 didn't get much text, try pdfminer
        if not text and PDFMINER_AVAILABLE:
            text = extract_text_with_pdfminer(file_path)
            
        # If still no text, try PyMuPDF
        if not text and PYMUPDF_AVAILABLE:
            text = extract_text_with_pymupdf(file_path)
    else:
        # For scanned PDFs, use OCR
        if TESSERACT_AVAILABLE and PYMUPDF_AVAILABLE:
            text = extract_text_with_ocr(file_path)
        else:
            return create_result_dict(
                error="File appears to be scanned, but OCR libraries are not available."
            )
    
    # Extract tables
    tables = []
    if CAMELOT_AVAILABLE and not is_scanned:
        tables = extract_tables_with_camelot(file_path)
    
    # Extract metadata
    metadata = {}
    if PYPDF2_AVAILABLE:
        metadata = extract_metadata_with_pypdf2(file_path)
    elif PYMUPDF_AVAILABLE:
        metadata = extract_metadata_with_pymupdf(file_path)
    
    # Prepare result
    result = {
        "text": text,
        "metadata": metadata
    }
    
    if tables:
        result["tables"] = tables
    
    if is_scanned:
        result["is_scanned"] = True
        
    return result

def parse_pdf(file_path: str) -> Dict[str, Any]:
    """
    Parse a PDF file and extract text, tables, and metadata.
    
    Args:
        file_path (str): Path to the PDF file
        
    Returns:
        Dict[str, Any]: A dictionary containing:
            - text (str): Extracted text
            - tables (List[List[List[str]]]): Extracted tables (if any)
            - metadata (Dict[str, Any]): File metadata
            - error (str): Error message (if any)
    """
    return safe_parse(_parse_pdf_internal, file_path)

# Example usage
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python pdf_parser.py <pdf_file_path>")
        sys.exit(1)
        
    file_path = sys.argv[1]
    result = parse_pdf(file_path)
    
    if "error" in result:
        print(f"Error: {result['error']}")
    else:
        print(f"Text (excerpt): {result['text'][:500]}...")
        print(f"Metadata: {result['metadata']}")
        if "tables" in result:
            print(f"Tables found: {len(result['tables'])}")
        print(f"Full result saved to {file_path}.json")
        
        # Save full result to JSON file
        import json
        with open(f"{file_path}.json", "w") as f:
            json.dump(result, f, indent=2) 