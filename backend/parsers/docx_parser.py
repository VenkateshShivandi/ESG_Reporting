"""
DOCX Parser Module

This module provides functionality to parse DOCX (Microsoft Word) files using:
- python-docx: Extract text and tables from Word documents

The main function is parse_docx(), which extracts text, tables, and metadata
from DOCX files and returns them in a structured format.
"""

import os
import logging
from typing import Dict, List, Any, Union

# Import utility functions
from .utils import safe_parse, create_result_dict

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to import the required libraries
try:
    import docx
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False
    logger.warning("python-docx not available. DOCX parsing will not work.")

def extract_text_from_docx(file_path: str) -> str:
    """
    Extract text from a DOCX file.
    
    Args:
        file_path (str): Path to the DOCX file
        
    Returns:
        str: Extracted text
    """
    if not DOCX_AVAILABLE:
        return ""
    
    try:
        # Load the DOCX file
        doc = docx.Document(file_path)
        
        # Extract text from paragraphs
        full_text = []
        for para in doc.paragraphs:
            if para.text:
                full_text.append(para.text)
        
        return "\n".join(full_text)
    except Exception as e:
        logger.error(f"Error extracting text from DOCX: {str(e)}")
        return ""

def extract_tables_from_docx(file_path: str) -> List[List[List[str]]]:
    """
    Extract tables from a DOCX file.
    
    Args:
        file_path (str): Path to the DOCX file
        
    Returns:
        List[List[List[str]]]: List of tables, where each table is a list of rows,
                              and each row is a list of cell values
    """
    if not DOCX_AVAILABLE:
        return []
    
    try:
        # Load the DOCX file
        doc = docx.Document(file_path)
        
        # Extract tables
        tables_data = []
        for table in doc.tables:
            table_data = []
            for row in table.rows:
                row_data = []
                for cell in row.cells:
                    # Extract text from the cell
                    cell_text = cell.text.strip()
                    row_data.append(cell_text)
                table_data.append(row_data)
            tables_data.append(table_data)
        
        return tables_data
    except Exception as e:
        logger.error(f"Error extracting tables from DOCX: {str(e)}")
        return []

def extract_metadata_from_docx(file_path: str) -> Dict[str, Any]:
    """
    Extract metadata from a DOCX file.
    
    Args:
        file_path (str): Path to the DOCX file
        
    Returns:
        Dict[str, Any]: Metadata dictionary
    """
    if not DOCX_AVAILABLE:
        return {}
    
    try:
        # Load the DOCX file
        doc = docx.Document(file_path)
        
        # Extract core properties
        metadata = {
            "filename": os.path.basename(file_path),
            "filesize": os.path.getsize(file_path)
        }
        
        # Try to extract document properties
        try:
            core_props = doc.core_properties
            if core_props.author:
                metadata["author"] = core_props.author
            if core_props.title:
                metadata["title"] = core_props.title
            if core_props.created:
                metadata["created"] = core_props.created.isoformat()
            if core_props.modified:
                metadata["modified"] = core_props.modified.isoformat()
            if core_props.last_modified_by:
                metadata["last_modified_by"] = core_props.last_modified_by
            if core_props.revision:
                metadata["revision"] = core_props.revision
        except Exception as e:
            logger.warning(f"Error extracting core properties: {str(e)}")
        
        # Add document statistics
        metadata["paragraphs"] = len(doc.paragraphs)
        metadata["tables"] = len(doc.tables)
        
        return metadata
    except Exception as e:
        logger.error(f"Error extracting metadata from DOCX: {str(e)}")
        return {
            "filename": os.path.basename(file_path),
            "filesize": os.path.getsize(file_path)
        }

def extract_sections_from_docx(file_path: str) -> List[Dict[str, Any]]:
    """
    Extract sections (headings and content) from a DOCX file.
    
    Args:
        file_path (str): Path to the DOCX file
        
    Returns:
        List[Dict[str, Any]]: List of sections with their heading level and content
    """
    if not DOCX_AVAILABLE:
        return []
    
    try:
        # Load the DOCX file
        doc = docx.Document(file_path)
        
        # Extract sections
        sections = []
        current_section = None
        current_content = []
        
        for para in doc.paragraphs:
            # Check if paragraph is a heading
            if para.style.name.startswith('Heading'):
                # If we were building a section, save it
                if current_section is not None and current_content:
                    sections.append({
                        "heading": current_section,
                        "content": "\n".join(current_content)
                    })
                    current_content = []
                
                # Start a new section
                current_section = {
                    "text": para.text,
                    "level": int(para.style.name.replace('Heading ', '')) if para.style.name != 'Heading' else 1
                }
            elif current_section is not None:
                # Add to current section content
                if para.text:
                    current_content.append(para.text)
            elif para.text:
                # Text before any heading
                current_content.append(para.text)
        
        # Add the last section if there is one
        if current_section is not None and current_content:
            sections.append({
                "heading": current_section,
                "content": "\n".join(current_content)
            })
        # Or add content without a heading if there is any
        elif current_content:
            sections.append({
                "heading": None,
                "content": "\n".join(current_content)
            })
        
        return sections
    except Exception as e:
        logger.error(f"Error extracting sections from DOCX: {str(e)}")
        return []

def _parse_docx_internal(file_path: str) -> Dict[str, Any]:
    """
    Internal function to parse a DOCX file.
    
    Args:
        file_path (str): Path to the DOCX file
        
    Returns:
        Dict[str, Any]: Parsed content
    """
    if not DOCX_AVAILABLE:
        return create_result_dict(error="python-docx is not available for DOCX parsing.")
    
    try:
        # Extract text
        text = extract_text_from_docx(file_path)
        
        # Extract tables
        tables = extract_tables_from_docx(file_path)
        
        # Extract metadata
        metadata = extract_metadata_from_docx(file_path)
        
        # Extract sections
        sections = extract_sections_from_docx(file_path)
        
        # Prepare result
        result = {
            "text": text,
            "metadata": metadata
        }
        
        if tables:
            result["tables"] = tables
            
        if sections:
            result["sections"] = sections
            
        return result
    except Exception as e:
        return create_result_dict(error=f"Error parsing DOCX file: {str(e)}")

def parse_docx(file_path: str) -> Dict[str, Any]:
    """
    Parse a DOCX file and extract text, tables, and metadata.
    
    Args:
        file_path (str): Path to the DOCX file
        
    Returns:
        Dict[str, Any]: A dictionary containing:
            - text (str): Extracted text
            - tables (List[List[List[str]]]): Extracted tables (if any)
            - sections (List[Dict]): Document sections (if any)
            - metadata (Dict[str, Any]): File metadata
            - error (str): Error message (if any)
    """
    return safe_parse(_parse_docx_internal, file_path)

# Example usage
if __name__ == "__main__":
    import sys
    import json
    
    if len(sys.argv) < 2:
        print("Usage: python docx_parser.py <docx_file_path>")
        sys.exit(1)
        
    file_path = sys.argv[1]
    result = parse_docx(file_path)
    
    if "error" in result:
        print(f"Error: {result['error']}")
    else:
        print(f"Text (excerpt): {result['text'][:500]}...")
        print(f"Metadata: {result['metadata']}")
        if "tables" in result:
            print(f"Tables found: {len(result['tables'])}")
        if "sections" in result:
            print(f"Sections found: {len(result['sections'])}")
        print(f"Full result saved to {file_path}.json")
        
        # Save full result to JSON file
        with open(f"{file_path}.json", "w") as f:
            json.dump(result, f, indent=2) 