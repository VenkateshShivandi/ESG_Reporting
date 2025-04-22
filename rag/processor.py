# -*- coding: utf-8 -*-
"""Handles the processing of different file types by routing to appropriate parsers and chunkers."""

import os
import logging
import uuid
from typing import List, Dict, Any, Optional

# Import the newly moved parsers
from .parsers.excel_parser import parse_excel
from .parsers.csv_parser import parse_csv
from .parsers.docx_parser import parse_docx
# Import the original PDF chunker (which includes basic parsing)
from .chunking import process_document as process_pdf_and_text 
# Import the new chunkers
from .chunkers.excel_chunker import chunk_excel_data
from .chunkers.csv_chunker import chunk_csv_data
from .chunkers.docx_chunker import chunk_docx_data

logger = logging.getLogger(__name__)

# --- Standard Chunk Format --- 
# Define the target structure for all chunks produced by this processor
# Keys: chunk_id, text, source_filename, source_type, metadata (dict for specifics like sheet, rows, section)

def standardize_chunk(chunk_data: Dict, source_filename: str, source_type: str) -> Dict:
    """Converts output from different chunkers into a standard format."""
    
    # Get the raw text and clean it
    raw_text = chunk_data.get("text", "")
    cleaned_text = raw_text.replace("\x00", "") # Correctly remove NULL bytes/chars
    
    standard_chunk = {
        "chunk_id": chunk_data.get("chunk_id", str(uuid.uuid4())), # Generate if missing
        "text": cleaned_text, # Use cleaned text
        "source_filename": source_filename,
        "source_type": source_type,
        "metadata": {}
    }
    
    # Add type-specific metadata
    if source_type in ["pdf", "text", "text_fallback"]:
        standard_chunk["metadata"] = {
            "start_char": chunk_data.get("start_char"),
            "end_char": chunk_data.get("end_char")
        }
    elif source_type == "excel":
        standard_chunk["metadata"] = {
            "sheet_name": chunk_data.get("sheet_name"),
            "row_start": chunk_data.get("row_start"),
            "row_end": chunk_data.get("row_end")
            # Add column info if needed
        }
    elif source_type == "csv":
         standard_chunk["metadata"] = {
            "row_start": chunk_data.get("row_start"),
            "row_end": chunk_data.get("row_end"),
            "delimiter": chunk_data.get("delimiter")
        }
    elif source_type == "docx":
         # Get the nested metadata dictionary first
         incoming_metadata = chunk_data.get("metadata", {}) 
         standard_chunk["metadata"] = {
             # Look for section_heading within the nested metadata
             "section_heading": incoming_metadata.get("section_heading")
         }
         
    # Remove None values from metadata for cleanliness
    standard_chunk["metadata"] = {k: v for k, v in standard_chunk["metadata"].items() if v is not None}
    
    return standard_chunk

def process_uploaded_file(file_path: str, chunking_config: Optional[Dict] = None) -> List[Dict]:
    """
    Processes a file by parsing and chunking based on its type.

    Args:
        file_path (str): The path to the temporarily saved uploaded file.
        chunking_config (Optional[Dict]): Configuration options passed to chunkers.

    Returns:
        List[Dict]: A list of chunks in the standardized format, or empty list if processing fails.
    """
    if not os.path.exists(file_path):
        logger.error(f"File not found for processing: {file_path}")
        return []
        
    _, ext = os.path.splitext(file_path)
    file_ext = ext.lower().strip('.')
    filename = os.path.basename(file_path)
    logger.info(f"Processing file: {filename}, type determined as: {file_ext}")

    parsed_data = None
    chunks = []
    source_type = file_ext # Default source type

    try:
        if file_ext in ['xlsx', 'xls']:
            source_type = "excel"
            parsed_data = parse_excel(file_path)
            if parsed_data and "error" not in parsed_data:
                chunks = chunk_excel_data(parsed_data, config=chunking_config)
            else:
                 logger.error(f"Excel parsing failed for {filename}: {parsed_data.get('error')}")
                 return [] # Stop if parsing fails
                 
        elif file_ext == 'csv':
            source_type = "csv"
            parsed_data = parse_csv(file_path)
            if parsed_data and "error" not in parsed_data:
                 chunks = chunk_csv_data(parsed_data, config=chunking_config)
            else:
                 logger.error(f"CSV parsing failed for {filename}: {parsed_data.get('error')}")
                 return []
                 
        elif file_ext in ['docx', 'doc']:
            source_type = "docx"
            parsed_data = parse_docx(file_path)
            if parsed_data and "error" not in parsed_data:
                 chunks = chunk_docx_data(parsed_data, config=chunking_config)
            else:
                 logger.error(f"DOCX parsing failed for {filename}: {parsed_data.get('error')}")
                 return []
                 
        elif file_ext == 'pdf':
            source_type = "pdf"
            # The original function handles both basic parsing and chunking
            # It already produces chunks with keys: text, chunk_id, start_char, end_char, source, source_path
            # TODO: Review if this chunker needs update for standardization or config
            chunks = process_pdf_and_text(file_path, chunk_size=600, chunk_overlap=200) # Using default size/overlap for now
            
        elif file_ext == 'txt': # Handle plain text using the same logic as PDF fallback
             source_type = "text"
             # TODO: Review if this chunker needs update for standardization or config
             chunks = process_pdf_and_text(file_path, chunk_size=600, chunk_overlap=200)
             
        else:
            logger.warning(f"Unsupported file type: '{file_ext}' for file {filename}. Attempting plain text chunking.")
            # Attempt plain text processing as a fallback
            source_type = "text_fallback"
            # TODO: Review if this chunker needs update for standardization or config
            chunks = process_pdf_and_text(file_path, chunk_size=600, chunk_overlap=200)
            if not chunks:
                 logger.error(f"Failed to process file {filename} as plain text fallback.")
                 return []
                 
        # Standardize the output chunks
        standardized_chunks = [
            standardize_chunk(chunk, filename, source_type)
            for chunk in chunks
        ]
        
        logger.info(f"Successfully processed and standardized {len(standardized_chunks)} chunks for {filename}.")
        return standardized_chunks

    except Exception as e:
        logger.exception(f"Critical error during processing file {filename}: {e}")
        return [] 