import sys
import json
import os
from parsers.docx_parser import parse_docx
from etl_docx.chunking import semantic_chunk_text

# Commenting out the Supabase loader as we won't be using it right now
# from etl_docx.supabase_loader import load_to_supabase

def save_locally(result, chunks, output_dir="output"):
    """
    Save parsed and chunked data to the local file system.
    
    Args:
        result (dict): Parsed document result
        chunks (list): Data processed through chunking
        output_dir (str): Output directory
    """
    # Create output directory (if it doesn't exist)
    os.makedirs(output_dir, exist_ok=True)
    
    # Generate filename (using original filename as base)
    filename_base = os.path.basename(result["metadata"].get("filename", "document"))
    filename_without_ext = os.path.splitext(filename_base)[0]
    
    # Save document data
    doc_output_path = os.path.join(output_dir, f"{filename_without_ext}_document.json")
    with open(doc_output_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    # Save chunked data
    chunks_output_path = os.path.join(output_dir, f"{filename_without_ext}_chunks.json")
    with open(chunks_output_path, 'w', encoding='utf-8') as f:
        json.dump(chunks, f, ensure_ascii=False, indent=2)
    
    print(f"Document saved to: {doc_output_path}")
    print(f"Chunk data saved to: {chunks_output_path}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python main.py <docx_file_path>")
        sys.exit(1)
        
    file_path = sys.argv[1]
    
    # Check if file exists
    if not os.path.exists(file_path):
        print(f"Error: File '{file_path}' not found")
        sys.exit(1)

    # 1️ Parse DOCX
    result = parse_docx(file_path)
    if "error" in result:
        print(f"Parsing failed: {result['error']}")
        sys.exit(1)

    # 2️ Perform Chunking
    chunks = semantic_chunk_text(result["sections"])

    # 3️ Save to local files, not to Supabase
    save_locally(result, chunks)
