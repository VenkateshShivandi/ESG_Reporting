# This file is not implemented yet

from supabase import create_client, ClientOptions
import uuid
import os
from typing import Dict, List, Any
from dotenv import load_dotenv
import sys

# Add the parent directory of the current directory to the system path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env.local'))

# Get Supabase configuration from environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Use full path including schema name
DOCUMENTS_TABLE = "documents"  # Full table name
CHUNKS_TABLE = "document_chunks"  # Full table name

# Ensure environment variables are loaded
if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in the .env.local file")
    sys.exit(1)

supabase_client = create_client(
    SUPABASE_URL,
    SUPABASE_KEY,
    ClientOptions(
        schema="esg_data",
        headers={"Content-Type": "application/json"}
    )
)

def load_to_supabase(result: Dict[str, Any], chunks: List[Dict]):
    """
    Store parsed DOCX results in the Supabase database.
    
    Args:
        result (dict): Document result from ETL parsing
        chunks (list): Data processed through chunking
    """
    try:
        # Print more information for debugging
        print(f"Connecting to Supabase: {SUPABASE_URL}")
        print(f"Using SERVICE_ROLE_KEY (first 10 chars): {SUPABASE_KEY[:10]}...")
        print(f"Using full table names: {DOCUMENTS_TABLE} and {CHUNKS_TABLE}")
        
        # Step 1: Insert into documents table
        document_id = str(uuid.uuid4())
        document_data = {
            "id": document_id,
            "filename": result["metadata"].get("filename", "unknown"),
            "filesize": result["metadata"].get("filesize", 0),
            "content_type": "docx",
            "created_at": "now()"
        }

        print(f"Inserting into {DOCUMENTS_TABLE} table: {document_data}")
        
        # Use full table name
        response = supabase_client.from_(DOCUMENTS_TABLE).insert(document_data).execute()
        print(f"documents insert response: {response}")

        # Step 2: Insert into document_chunks table
        chunk_records = []
        for idx, chunk in enumerate(chunks):
            chunk_records.append({
                "id": str(uuid.uuid4()),
                "document_id": document_id,
                "text": chunk["text"],
                "chunk_index": idx,
                "created_at": "now()"
            })

        if chunk_records:
            print(f"Inserting into {CHUNKS_TABLE} table, total {len(chunk_records)} records")
            # Use full table name
            response = supabase_client.from_(CHUNKS_TABLE).insert(chunk_records).execute()
            print(f"document_chunks insert response: {response}")
        
        print(f"Document {result['metadata']['filename']} successfully stored in Supabase")

    except Exception as e:
        print(f"Failed to store in Supabase: {str(e)}")
        # Print more detailed error information
        import traceback
        traceback.print_exc()