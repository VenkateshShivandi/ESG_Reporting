from typing import Dict, List, Any
from sentence_transformers import SentenceTransformer, util
import numpy as np
import logging

# Shared model with xlsx chunking
model = SentenceTransformer('all-MiniLM-L6-v2')

logger = logging.getLogger(__name__)

def chunk_csv_data(full_result: Dict[str, Any], config: Dict = None) -> List[Dict]:
    """
    Chunk CSV data into smaller, manageable pieces for processing.
    
    Args:
        full_result (Dict[str, Any]): The parsed CSV data
        config (Dict, optional): Configuration for chunking
        
    Returns:
        List[Dict]: List of chunks
    """
    # Validate structure
    required_keys = {"metadata", "data", "columns"}
    if not required_keys.issubset(full_result.keys()):
        logger.error("Invalid input structure")
        return []
    
    # Add default config with chunk size parameters
    cfg = config or {
        'chunk_size': 100, 
        'max_rows': 50, 
        'include_header': True,
        'max_tokens': 2000
    }
    
    # Add default values for missing config entries
    cfg.setdefault('include_header', True)
    cfg.setdefault('chunk_size', 100)
    cfg.setdefault('max_tokens', 2000)
    
    chunks = []
    metadata = full_result["metadata"]
    rows = full_result["data"]
    headers = full_result["columns"]
    
    # Create CSV-specific metadata
    csv_meta = {
        "filename": metadata["filename"],
        "total_rows": len(rows),
        "columns": headers,
        "encoding": metadata.get("encoding", "utf-8"),
        "delimiter": metadata.get("delimiter", ",")
    }
    
    # Create chunks in batches
    for chunk_idx in range(0, len(rows), cfg['chunk_size']):
        batch = rows[chunk_idx:chunk_idx + cfg['chunk_size']]
        
        # Create the actual chunk
        chunk = create_chunk(
            rows=batch,
            headers=headers,
            meta=csv_meta,
            start_idx=chunk_idx,
            cfg=cfg
        )
        
        # Handle oversized chunks
        if chunk['token_count'] > cfg['max_tokens']:
            chunks.extend(split_oversized_chunk(chunk, cfg))
        else:
            chunks.append(chunk)
    
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
    """More accurate token count estimation"""
    text = ' '.join(str(item) for row in data for item in row)
    # Use a better tokenization method (not just whitespace)
    # For example, len(model.tokenize(text).input_ids)
    # Or use a tiktoken-based estimator if available
    return int(len(text) / 3.5)  

def split_oversized_chunk(chunk: Dict, config: Dict) -> List[Dict]:
    """Handle chunks that exceed token limits with recursive splitting"""
    # Base case: if chunk is under token limit, return it
    if chunk['token_count'] <= config['max_tokens']:
        return [chunk]
    
    split_chunks = []
    
    # 1. Try horizontal split first
    max_rows = max(1, min(config.get('max_rows', 50) // 2, len(chunk['rows']) // 2))
    horizontal_chunks = []
    
    for i in range(0, len(chunk['rows']), max_rows):
        sub_rows = chunk['rows'][i:i+max_rows]
        new_chunk = create_chunk(
            sub_rows,
            chunk['columns'],
            {k: v for k, v in chunk.items() if k not in ['rows', 'start_row', 'end_row', 'token_count']},
            chunk['start_row'] + i - 1,  # Adjust start row
            config
        )
        horizontal_chunks.append(new_chunk)
    
    # 2. Check if horizontal splitting was sufficient
    if all(c['token_count'] <= config['max_tokens'] for c in horizontal_chunks):
        return horizontal_chunks
    
    # 3. Apply vertical splitting to any chunks still over limit
    for c in horizontal_chunks:
        if c['token_count'] <= config['max_tokens']:
            split_chunks.append(c)
            continue
            
        # Calculate text volume per column
        col_lengths = []
        for i, col_name in enumerate(c['columns']):
            # Sum text length across all rows for this column
            col_text_length = sum(len(str(row[i])) for row in c['rows'] if i < len(row))
            col_lengths.append((i, col_text_length, col_name))
        
        # Sort columns by text length (descending)
        sorted_cols = sorted(col_lengths, key=lambda x: -x[1])
        
        # For extreme cases, split into more than 2 groups
        num_groups = max(2, int(c['token_count'] / config['max_tokens']) + 1)
        
        # Distribute columns evenly by text volume using round-robin
        column_groups = [[] for _ in range(num_groups)]
        for idx, (col_idx, _, _) in enumerate(sorted_cols):
            group_idx = idx % num_groups
            column_groups[group_idx].append(col_idx)
        
        # Create balanced chunks for each column group
        for group_indices in column_groups:
            if not group_indices:  # Skip empty groups
                continue
                
            # Sort indices to maintain original column order
            group_indices.sort()
            
            # Extract columns and corresponding row data
            group_columns = [c['columns'][i] for i in group_indices]
            group_rows = [[row[i] for i in group_indices] for row in c['rows']]
            
            vertical_chunk = {
                **{k: v for k, v in c.items() if k not in ['columns', 'rows', 'token_count']},
                "columns": group_columns,
                "rows": group_rows,
                "token_count": estimate_token_count(group_rows)
            }
            
            # RECURSIVE SPLITTING: If still over limit, recursively split
            if vertical_chunk['token_count'] > config['max_tokens']:
                # Try more aggressive row splitting for this subset
                recursive_config = {**config, 'max_rows': max(1, config.get('max_rows', 50) // 2)}
                split_chunks.extend(split_oversized_chunk(vertical_chunk, recursive_config))
            else:
                split_chunks.append(vertical_chunk)
    
    return split_chunks

def validate_structure(data):
    """Validate the structure of the input data"""
    required_keys = {"metadata", "data", "columns"}
    assert required_keys.issubset(data.keys()), "Missing required top-level keys"
