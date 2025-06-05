import logging
from .supabase_client import supabase, DB_SCHEMA
from typing import List, Dict, Optional
import uuid
from datetime import datetime, timezone
import os

logger = logging.getLogger(__name__)
DOCUMENTS_TABLE = "documents"
CHUNKS_TABLE = "document_chunks"

def store_document_record(filename: str, file_type: str, status: str = "processing") -> Optional[str]:
    """Stores or updates a document record in the Supabase documents table."""
    if not supabase:
        logger.error("Supabase client not initialized in store_document_record.")
        return None

    doc_id = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).isoformat()
    
    data_to_insert = {
        "id": doc_id,
        "file_name": filename,
        "file_type": file_type,
        "uploaded_at": timestamp,
        # user_id field removed
    }
    
    # No need to check for None user_id anymore

    try:
        logger.info(f"Attempting to insert document record: {data_to_insert}")
        response = supabase.postgrest.schema(DB_SCHEMA).table(DOCUMENTS_TABLE).insert(data_to_insert).execute()
        logger.info(f"Successfully inserted document record. ID: {doc_id}")
        return doc_id
    except Exception as e:
        logger.exception(f"Failed to insert document record for {filename}: {e}") 
        return None 

def store_chunks(document_id: str, chunks: List[Dict], embeddings: List[List[float]]) -> bool:
    """Stores chunks and their embeddings in the Supabase chunks table."""
    if not supabase:
        logger.error("Supabase client not initialized in store_chunks.")
        return False
        
    if not chunks:
        logger.warning(f"No chunks provided to store for document ID: {document_id}")
        return True # Nothing to store, technically not an error
        
    if len(chunks) != len(embeddings):
        logger.error(f"Mismatch between chunk count ({len(chunks)}) and embedding count ({len(embeddings)}) for document {document_id}")
        return False
        
    records_to_insert = []
    for i, chunk in enumerate(chunks):
        records_to_insert.append({
            "document_id": document_id,
            "chunk_id": chunk.get("chunk_id", str(uuid.uuid4())), # Use provided or generate
            "chunk_text": chunk.get("text", ""),
            "chunk_type": chunk.get("metadata", {}).get("type", "text"), # Example: get type from metadata if available
            "embedding": embeddings[i],
            # Add created_at? Supabase might handle this automatically if default is set
        })

    try:
        logger.info(f"Attempting to insert {len(records_to_insert)} chunks for document ID: {document_id}")
        # Ensure insertion happens within the correct schema
        response = supabase.postgrest.schema(DB_SCHEMA).table(CHUNKS_TABLE).insert(records_to_insert).execute()
        # Check response? Supabase client might raise exception on failure
        logger.info(f"Successfully inserted {len(records_to_insert)} chunks for document ID: {document_id}")
        return True
    except Exception as e:
        # Log the full exception for debugging
        logger.exception(f"Exception storing chunks for document {document_id}: {e}") 
        return False 