from typing import Dict, List, Any
from sentence_transformers import SentenceTransformer, util
import numpy as np
import logging

# Shared model with docx chunking
model = SentenceTransformer('all-MiniLM-L6-v2')

logger = logging.getLogger(__name__)

def chunk_excel_data(full_result: Dict[str, Any], config: Dict = None) -> List[Dict]:
    """
    Modified to work with optimized structure
    """
    # Validate structure
    required_keys = {"metadata", "data"}
    if not required_keys.issubset(full_result.keys()):
        logger.error("Invalid input structure")
        return []
    
    if not isinstance(full_result.get("metadata", {}).get("columns"), dict):
        logger.error("Missing header metadata")
        return []
    
    chunks = []
    metadata = full_result["metadata"]
    sheet_data = full_result["data"]
    
    for sheet_name, rows in sheet_data.items():
        # Get headers from metadata
        headers = metadata["columns"].get(sheet_name, [])
        
        # Rest of existing chunking logic
        row_texts = [' '.join(map(str, row)) for row in rows]
        embeddings = model.encode(row_texts, convert_to_tensor=True)
        
        sheet_meta = {
            "sheet_name": sheet_name,
            "columns": headers,
            "total_rows": len(rows),
            "data_types": infer_data_types(rows[0]) if rows else {}
        }
        
        # Existing chunking logic continues...
        
    return chunks

def create_chunk(rows, headers, meta, start_idx, cfg):
    """Helper to create standardized chunk structure"""
    chunk = {
        **meta,
        "start_row": start_idx + 1,
        "end_row": start_idx + len(rows),
        "rows": [headers] + rows if cfg['include_header'] else rows,
        "token_count": estimate_token_count(rows)
    }
    return chunk

def infer_data_types(row: List) -> Dict:
    """Infer data types from a sample row"""
    # Implementation would look like:
    types = {}
    for i, value in enumerate(row):
        if isinstance(value, bool):
            types[f"col_{i}"] = "boolean"
        elif isinstance(value, (int, float)):
            types[f"col_{i}"] = "number"
        elif isinstance(value, str):
            types[f"col_{i}"] = "string"
        else:
            types[f"col_{i}"] = "unknown"
    return types

def estimate_token_count(data: List) -> int:
    """Estimate token count for tabular data"""
    # Implementation would be:
    text = ' '.join(str(item) for row in data for item in row)
    return len(text.split())  # Simple whitespace-based token count

def split_oversized_chunk(chunk: Dict, config: Dict) -> List[Dict]:
    """Handle chunks that exceed token limits"""
    split_chunks = []
    
    # 1. Try horizontal split first
    max_rows = max(1, config['max_rows'] // 2)
    for i in range(0, len(chunk['rows']), max_rows):
        sub_rows = chunk['rows'][i:i+max_rows]
        new_chunk = create_chunk(
            sub_rows,
            chunk['columns'],
            chunk,
            chunk['start_row'] + i - 1,  # Adjust start row
            config
        )
        split_chunks.append(new_chunk)
    
    # 2. If still too big, try vertical split
    if any(c['token_count'] > config['max_tokens'] for c in split_chunks):
        new_split = []
        for c in split_chunks:
            col_groups = np.array_split(c['columns'], 2)
            for group in col_groups:
                vertical_chunk = {
                    **c,
                    "columns": group.tolist(),
                    "rows": [row[:len(group)] for row in c['rows']]
                }
                new_split.append(vertical_chunk)
        split_chunks = new_split
    
    return split_chunks

def validate_structure(data):
    required_keys = {"metadata", "data"}
    assert required_keys.issubset(data.keys()), "Missing required top-level keys"
