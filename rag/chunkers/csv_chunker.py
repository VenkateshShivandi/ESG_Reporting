# -*- coding: utf-8 -*-
"""Chunking logic specific to parsed CSV data."""

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
DEFAULT_CSV_CHUNK_CONFIG = {
    'rows_per_chunk': 150, # Max rows per chunk before splitting
    'include_header': True, # Include header row in each chunk's text representation
    'max_chunk_chars': 3000 # Max characters for the text representation of a chunk before splitting
}

def chunk_csv_data(parsed_data: Dict[str, Any], config: Dict = None) -> List[Dict]:
    """
    Chunks data parsed from a CSV file.
    
    Args:
        parsed_data (Dict[str, Any]): The output from csv_parser.parse_csv.
                                      Expected structure: {"metadata": {...}, "data": [[row], ...], "columns": [...]}
        config (Dict, optional): Configuration for chunking. Defaults to DEFAULT_CSV_CHUNK_CONFIG.
        
    Returns:
        List[Dict]: List of chunk dictionaries.
    """
    if "error" in parsed_data:
        logger.error(f"Cannot chunk data due to parsing error: {parsed_data['error']}")
        return []
        
    # Validate structure needed for chunking
    if not isinstance(parsed_data.get("metadata"), dict) or \
       not isinstance(parsed_data.get("data"), list) or \
       not isinstance(parsed_data["metadata"].get("columns"), list):
        logger.error(f"Invalid input structure for csv chunking: {parsed_data.keys()}")
        return []

    cfg = {**DEFAULT_CSV_CHUNK_CONFIG, **(config or {})} # Merge configs
    chunks = []
    metadata = parsed_data["metadata"]
    rows = parsed_data["data"]
    headers = metadata["columns"] # Get headers from metadata
    
    if not rows:
         logger.warning(f"No data rows found in CSV: {metadata.get('filename')}")
         return []
         
    doc_filename = metadata.get("filename", "unknown_csv")

    # Base metadata for all chunks from this file
    base_chunk_meta = {
        "source_filename": doc_filename,
        "source_type": "csv",
        "delimiter": metadata.get("delimiter", ","),
        "encoding": metadata.get("encoding", "utf-8"),
        # Potentially add other doc metadata here
    }

    current_chunk_rows = []
    current_chunk_chars = 0
    start_row_index = 0 # 0-based index of the first row in the current chunk

    for i, row in enumerate(rows):
        # Estimate character count for the row
        row_text = ", ".join(map(str, row))
        row_chars = len(row_text)
        header_text = ", ".join(map(str, headers)) if cfg['include_header'] else ""
        header_chars = len(header_text) + 2 if cfg['include_header'] else 0 # +2 for potential newline

        # Check if adding this row exceeds limits
        if current_chunk_rows and \
           (len(current_chunk_rows) >= cfg['rows_per_chunk'] or \
            (current_chunk_chars + row_chars + header_chars) > cfg['max_chunk_chars']):
            
            # Finalize the previous chunk
            chunk_text = format_csv_chunk_text(current_chunk_rows, headers, cfg['include_header'])
            chunks.append({
                **base_chunk_meta,
                "chunk_id": str(uuid.uuid4()),
                "text": chunk_text,
                "row_start": start_row_index + 1, # 1-based for user display
                "row_end": start_row_index + len(current_chunk_rows),
            })
            
            # Start a new chunk
            current_chunk_rows = [row]
            current_chunk_chars = row_chars
            start_row_index = i
        else:
            # Add row to the current chunk
            current_chunk_rows.append(row)
            current_chunk_chars += row_chars

    # Add the last remaining chunk
    if current_chunk_rows:
        chunk_text = format_csv_chunk_text(current_chunk_rows, headers, cfg['include_header'])
        chunks.append({
            **base_chunk_meta,
            "chunk_id": str(uuid.uuid4()),
            "text": chunk_text,
            "row_start": start_row_index + 1,
            "row_end": start_row_index + len(current_chunk_rows),
        })

    logger.info(f"Generated {len(chunks)} chunks for CSV file '{doc_filename}'.")
    return chunks

def format_csv_chunk_text(rows: List[List[Any]], headers: List[str], include_header: bool) -> str:
    """Formats a list of rows (and optionally headers) into a single text string for CSV."""
    # Similar to Excel, but might represent slightly differently if needed
    text_parts = []
    if include_header and headers:
        text_parts.append("Headers: " + ", ".join(map(str, headers)))
        
    for i, row in enumerate(rows):
        row_text = ", ".join(map(str, row))
        text_parts.append(f"Row {i+1}: {row_text}")
        
    return "\n".join(text_parts)

# --- Potential inclusion of more complex splitting logic --- 
# The logic from etl_csv/chunking.py involving horizontal/vertical splits 
# based on token counts could be added here if the simple row/char limit isn't sufficient.

# Example usage if run directly (for testing)
if __name__ == '__main__':
    import json
    # Mock parsed data
    mock_parsed_data = {
        "metadata": {
            "filename": "sample.csv",
            "filesize": 500,
            "encoding": "utf-8",
            "delimiter": ",",
            "columns": ["ID", "Name", "Value"],
            "shape": (150, 3),
            "dtypes": {"ID": "int64", "Name": "object", "Value": "float64"}
        },
        "data": [[i, f"Name_{i}", float(i) * 10.5] for i in range(1, 151)] # Simulate 150 rows
    }
    
    chunks = chunk_csv_data(mock_parsed_data)
    print(f"Generated {len(chunks)} chunks.")
    if chunks:
        print("\n--- First Chunk ---:")
        print(json.dumps(chunks[0], indent=2))
        print("\n--- Last Chunk ---:")
        print(json.dumps(chunks[-1], indent=2)) 