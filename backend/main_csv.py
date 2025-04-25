import sys
import json
import os
import pandas as pd
import numpy as np
from parsers.csv_parser import parse_csv
from etl_csv.chunking import chunk_csv_data

def save_locally(result, chunks, output_dir="output"):
    """
    Save parsed and chunked data to the local file system.
    """
    def json_serializer(obj):
        # Handle pandas NA/NaN values
        if pd.isna(obj):
            return None
        # Handle NumPy integer types
        elif isinstance(obj, (np.integer, np.int64, np.int32, np.int16, np.int8)):
            return int(obj)
        # Handle NumPy floating types
        elif isinstance(obj, (np.floating, np.float64, np.float32, np.float16)):
            return float(obj)
        # Handle NumPy boolean type
        elif isinstance(obj, (np.bool_, bool)):
            return bool(obj)
        # Handle NumPy arrays
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        # Handle other NumPy types by converting to Python native types
        elif isinstance(obj, np.generic):
            return obj.item()
        # Raise error for other non-serializable types
        raise TypeError(f"Type {type(obj)} not serializable")
    
    # Create output directory (if it doesn't exist)
    os.makedirs(output_dir, exist_ok=True)
    
    # Generate filename (using original filename as base)
    filename_base = os.path.basename(result["metadata"].get("filename", "csv_file"))
    filename_without_ext = os.path.splitext(filename_base)[0]
    
    # Save document data
    doc_output_path = os.path.join(output_dir, f"{filename_without_ext}_document.json")
    with open(doc_output_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, default=json_serializer, ensure_ascii=False, indent=2)
    
    # Save chunked data
    chunks_output_path = os.path.join(output_dir, f"{filename_without_ext}_chunks.json")
    with open(chunks_output_path, 'w', encoding='utf-8') as f:
        json.dump(chunks, f, default=json_serializer, ensure_ascii=False, indent=2)
    
    print(f"Document saved to: {doc_output_path}")
    print(f"Chunk data saved to: {chunks_output_path}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python main_csv.py <csv_file_path>")
        sys.exit(1)

    file_path = sys.argv[1]

    # Check if file exists
    if not os.path.exists(file_path):
        print(f"Error: File '{file_path}' not found")
        sys.exit(1)

    # 1️⃣ Parse CSV
    result = parse_csv(file_path)
    if "error" in result:
        print(f"Parsing failed: {result['error']}")
        sys.exit(1)
    
    # After parsing, before chunking
    print(f"Parsed CSV file: {result['metadata']['filename']}")
    print(f"Row count: {result['shape'][0]}")
    print(f"Column count: {result['shape'][1]}")
    print(f"Columns: {', '.join(result['columns'])}")
    
    if len(result['data']) > 0:
        print(f"First row sample: {result['data'][0]}")
    
    # 2️⃣ Chunk CSV data
    chunks = chunk_csv_data(result)
    print(f"Created {len(chunks)} chunks")
    
    # 3️⃣ Save to local files
    save_locally(result, chunks)
