"""
ESG Reporting File Parsers

This package contains modules for parsing various file types:
- PDF files (pdf_parser.py)
- Excel files (excel_parser.py)
- Word documents (docx_parser.py)
- PowerPoint presentations (pptx_parser.py)
- CSV files (csv_parser.py)
- Images (image_parser.py)
- XML files (xml_parser.py)

Each module provides a parse_* function that takes a file path
and returns the extracted content.
"""

# Import all parsing functions for easy access
from .pdf_parser import parse_pdf
from .excel_parser import parse_excel
from .docx_parser import parse_docx
from .pptx_parser import parse_pptx
from .csv_parser import parse_csv
from .image_parser import parse_image
from .xml_parser import parse_xml

# Main function to parse any file based on extension
def parse_file(file_path):
    """
    Parse a file based on its extension and return the extracted content.
    
    Args:
        file_path (str): Path to the file to parse
        
    Returns:
        dict: Parsed content and metadata
        
    Raises:
        ValueError: If the file type is not supported
    """
    import os
    
    # Get file extension
    _, ext = os.path.splitext(file_path)
    ext = ext.lower()[1:]  # Remove the dot and convert to lowercase
    
    # Parse based on file extension
    if ext == 'pdf':
        return parse_pdf(file_path)
    elif ext in ['xlsx', 'xls']:
        return parse_excel(file_path)
    elif ext == 'docx':
        return parse_docx(file_path)
    elif ext == 'pptx':
        return parse_pptx(file_path)
    elif ext == 'csv':
        return parse_csv(file_path)
    elif ext in ['jpg', 'jpeg', 'png']:
        return parse_image(file_path)
    elif ext in ['xml', 'xhtml', 'svg', 'rss']:
        return parse_xml(file_path)
    else:
        raise ValueError(f"Unsupported file type: {ext}") 