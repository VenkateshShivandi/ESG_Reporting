# -*- coding: utf-8 -*-
"""Chunking logic specific to parsed Excel data."""

from typing import Dict, List, Any
from sentence_transformers import SentenceTransformer # Keep for potential future use or consistency
import numpy as np
import logging
import uuid
import os

# Consider making the model configurable or loading it only if needed
# model = SentenceTransformer('all-MiniLM-L6-v2') 

logger = logging.getLogger(__name__)

# Default configuration (can be overridden)
DEFAULT_EXCEL_CHUNK_CONFIG = {
    'rows_per_chunk': 100, # Max rows per chunk before splitting
    'include_header': True, # Include header row in each chunk's text representation
    'max_chunk_chars': 3000 # Max characters for the text representation of a chunk before splitting
}

def chunk_excel_data(parsed_data: Dict[str, Any], config: Dict = None) -> List[Dict]:
    """
    Chunks data parsed from an Excel file.
    Iterates through sheets, then chunks rows within each sheet.
    
    Args:
        parsed_data (Dict[str, Any]): The output from excel_parser.parse_excel.
                                      Expected structure: {"metadata": {...}, "data": {sheet_name: [[row], ...]}}
        config (Dict, optional): Configuration for chunking. Defaults to DEFAULT_EXCEL_CHUNK_CONFIG.
        
    Returns:
        List[Dict]: List of chunk dictionaries.
    """
    if "error" in parsed_data:
        logger.error(f"Cannot chunk data due to parsing error: {parsed_data['error']}")
        return []
        
    # Validate structure needed for chunking
    if not isinstance(parsed_data.get("metadata"), dict) or \
       not isinstance(parsed_data.get("data"), dict) or \
       not isinstance(parsed_data["metadata"].get("columns"), dict):
        logger.error(f"Invalid input structure for excel chunking: {parsed_data.keys()}")
        return []
        
    cfg = {**DEFAULT_EXCEL_CHUNK_CONFIG, **(config or {})} # Merge configs
    chunks = []
    metadata = parsed_data["metadata"]
    sheet_data = parsed_data["data"]
    sheet_headers = metadata["columns"]
    
    doc_filename = metadata.get("filename", "unknown_excel")

    for sheet_name, rows in sheet_data.items():
        headers = sheet_headers.get(sheet_name, [])
        if not headers and rows: # Try to infer headers if missing
             logger.warning(f"Headers missing for sheet '{sheet_name}', attempting to use first row.")
             headers = [str(h) for h in rows[0]]
             rows = rows[1:] # Assume first row was header
             
        if not rows: # Skip empty sheets
             continue
             
        # Base metadata for chunks from this sheet
        base_chunk_meta = {
            "source_filename": doc_filename,
            "source_type": "excel",
            "sheet_name": sheet_name,
            # Potentially add other doc metadata here
        }
        
        current_chunk_rows = []
        current_chunk_chars = 0
        start_row_index = 0 # 0-based index of the first row in the current chunk

        for i, row in enumerate(rows):
            # Estimate character count for the row (simple join)
            # Consider a more sophisticated token count if needed later
            row_text = ", ".join(map(str, row)) 
            row_chars = len(row_text)
            header_text = ", ".join(map(str, headers)) if cfg['include_header'] else ""
            header_chars = len(header_text) + 2 if cfg['include_header'] else 0 # +2 for potential newline

            # Check if adding this row exceeds limits
            if current_chunk_rows and \
               (len(current_chunk_rows) >= cfg['rows_per_chunk'] or \
                (current_chunk_chars + row_chars + header_chars) > cfg['max_chunk_chars']): 
                
                # Finalize the previous chunk
                chunk_text = format_excel_chunk_text(current_chunk_rows, headers, cfg['include_header'])
                chunks.append({
                    **base_chunk_meta,
                    "chunk_id": str(uuid.uuid4()),
                    "text": chunk_text,
                    "row_start": start_row_index + 1, # 1-based for user display
                    "row_end": start_row_index + len(current_chunk_rows),
                    # Add other relevant metadata like columns included, row count, etc.
                })
                
                # Start a new chunk with the current row
                current_chunk_rows = [row]
                current_chunk_chars = row_chars
                start_row_index = i 
            else:
                # Add row to the current chunk
                current_chunk_rows.append(row)
                current_chunk_chars += row_chars

        # Add the last remaining chunk
        if current_chunk_rows:
            chunk_text = format_excel_chunk_text(current_chunk_rows, headers, cfg['include_header'])
            chunks.append({
                **base_chunk_meta,
                "chunk_id": str(uuid.uuid4()),
                "text": chunk_text,
                "row_start": start_row_index + 1,
                "row_end": start_row_index + len(current_chunk_rows),
            })
            
    logger.info(f"Generated {len(chunks)} chunks for Excel file '{doc_filename}'.")
    return chunks

def format_excel_chunk_text(rows: List[List[Any]], headers: List[str], include_header: bool) -> str:
    """Formats a list of rows (and optionally headers) into a single text string."""
    text_parts = []
    if include_header and headers:
        text_parts.append("Headers: " + ", ".join(map(str, headers)))
        
    for i, row in enumerate(rows):
        # Simple formatting: Join cells with commas
        row_text = ", ".join(map(str, row))
        text_parts.append(f"Row {i+1}: {row_text}") # Add row context
        
    return "\n".join(text_parts)

# --- Potentially add more sophisticated splitting logic from etl_xlsx/chunking.py if needed ---
# e.g., split_oversized_chunk, handling vertical splits, more accurate token counting
# For now, keeping it simpler based on row count and character limits.

# Example usage if run directly (for testing)
if __name__ == '__main__':
    import json
    # Mock parsed data (replace with actual parser output for testing)
    mock_parsed_data = {
        "metadata": {
            "filename": "test_data.xlsx",
            "filesize": 12345,
            "sheet_names": ["Sheet1", "Sheet2"],
            "sheet_count": 2,
            "columns": {"Sheet1": ["ColA", "ColB"], "Sheet2": ["ID", "Value", "Category"]}
        },
        "data": {
            "Sheet1": [
                ["A1", "B1"], ["A2", "B2"], ["A3", "B3"] * 50 # Simulate 150 rows
            ],
            "Sheet2": [
                [1, 100, "X"], [2, 200, "Y"], [3, 150, "X"], [4, 50, "Z"], [5, 120, "Y"]
            ]
        }
    }
    
    chunks = chunk_excel_data(mock_parsed_data)
    print(f"Generated {len(chunks)} chunks.")
    if chunks:
        print("\n--- First Chunk ---:")
        print(json.dumps(chunks[0], indent=2))
        print("\n--- Last Chunk ---:")
        print(json.dumps(chunks[-1], indent=2)) 