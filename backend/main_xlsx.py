import sys
import json
import os
import pandas as pd
from parsers.excel_parser import parse_excel    
from etl_xlsx.chunking import chunk_excel_data
def save_locally(result, chunks, output_dir="output"):
    """
    Save parsed and chunked data to the local file system.
    """
    def json_serializer(obj):
        if pd.isna(obj):
            return None
        raise TypeError(f"Type {type(obj)} not serializable")
    # Create output directory (if it doesn't exist)
    os.makedirs(output_dir, exist_ok=True)
    
    # Generate filename (using original filename as base)
    filename_base = os.path.basename(result["metadata"].get("filename", "spreadsheet"))
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
        print("Usage: python excel_parser.py <excel_file_path>")
        sys.exit(1)

    file_path = sys.argv[1]

    # Check if file exists
    if not os.path.exists(file_path):
        print(f"Error: File '{file_path}' not found")
        sys.exit(1)

    # 1️ Parse Excel
    result = parse_excel(file_path)
    if "error" in result:
        print(f"Parsing failed: {result['error']}")
        sys.exit(1)
    
    # After parsing, before chunking
    print(f"Parsed sheet count: {len(result['data'])}")
    for sheet_name, content in result['data'].items():
        print(f"Sheet {sheet_name} row count: {len(content)}")
        if len(content) > 0:
            print(f"First row sample: {content[0]}")
    
    # 2️ Chunk Excel - pass the full result instead of just sheets
    chunks = chunk_excel_data(result)

    # 3️ Save to local files, not to Supabase
    save_locally(result, chunks)
