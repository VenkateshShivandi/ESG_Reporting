# -*- coding: utf-8 -*-
"""Functions for storing document and chunk data in Supabase."""

import logging
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

# Import the Supabase client utility
from .supabase_client import get_supabase_client

logger = logging.getLogger(__name__)

# --- Constants for Table Names (Matching DB Schema) ---
DOCUMENTS_TABLE = "documents"  # Updated table name
CHUNKS_TABLE = "document_chunks"  # Updated table name

# --- Document Storage ---


def store_document_record(
    filename: str, source_type: str, status: str = "processed"
) -> Optional[str]:
    """
    Stores a record for a processed document in the Supabase documents table (esg_data.documents).
    NOTE: The 'status' parameter is kept for potential future use but is NOT stored
          as the column doesn't exist in the current DB schema.

    Args:
        filename (str): The original name of the uploaded file.
        source_type (str): The detected type of the file (e.g., 'pdf', 'csv', 'docx').
        status (str): Processing status (Not stored currently).

    Returns:
        Optional[str]: The UUID of the newly created document record, or None if storage fails.
    """
    supabase = get_supabase_client()
    if not supabase:
        logger.error("Supabase client not available. Cannot store document record.")
        return None

    document_uuid = str(uuid.uuid4())
    # Remove timezone info and convert to ISO format
    upload_timestamp = datetime.now().replace(tzinfo=None).isoformat()

    document_data = {
        "id": document_uuid,  # Map to DB column 'id'
        "file_name": filename,
        "uploaded_at": upload_timestamp,  # Map to DB column 'uploaded_at' (without timezone)
        "file_type": source_type,  # Map to DB column 'file_type'
        # DB columns user_id, size, file_path are not populated here
    }

    try:
        logger.info(
            f"Storing document record for: {filename} (ID: {document_uuid}) in schema 'esg_data'"
        )
        # Specify schema using .schema() method before .table()
        response = (
            supabase.schema("esg_data")
            .table(DOCUMENTS_TABLE)
            .insert(document_data)
            .execute()
        )

        # Check for errors in the response
        if hasattr(response, "error") and response.error:
            logger.error(
                f"Error storing document record for {filename}: {response.error}"
            )
            return None
        # Check if data was actually returned (indicates success)
        if not response.data:
            logger.warning(
                f"Supabase insert for document {filename} returned no data, though no explicit error."
            )
            # Continue assuming success if no error, but log warning.

        logger.info(
            f"Successfully stored document record for {filename}. Document ID: {document_uuid}"
        )
        return document_uuid  # Return the UUID used for the 'id' column

    except Exception as e:
        logger.exception(f"Exception storing document record for {filename}: {e}")
        return None


# --- Chunk Storage ---


def store_chunks(
    document_id: str, chunks: List[Dict[str, Any]], embeddings: List[List[float]]
) -> bool:
    """
    Stores processed chunks and their embeddings in the Supabase chunks table (esg_data.document_chunks).

    Args:
        document_id (str): The UUID of the parent document (maps to documents.id).
        chunks (List[Dict[str, Any]]): The list of standardized chunks from the processor.
        embeddings (List[List[float]]): The list of corresponding embedding vectors.

    Returns:
        bool: True if all chunks were stored successfully, False otherwise.
    """
    supabase = get_supabase_client()
    if not supabase:
        logger.error("Supabase client not available. Cannot store chunks.")
        return False

    if len(chunks) != len(embeddings):
        logger.error("Mismatch between number of chunks and embeddings. Cannot store.")
        return False

    if not chunks:
        logger.info(
            f"No chunks provided for document ID {document_id}. Nothing to store."
        )
        return True

    records_to_insert = []
    for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        # Default chunk_type, maybe enhance later if chunk metadata provides it
        chunk_type = chunk.get("metadata", {}).get("type", "text")

        record = {
            "document_id": document_id,  # FK to documents.id
            "chunk_text": chunk.get("text"),
            "embedding": embedding,  # Map to DB column 'embedding'
            # "metadata": chunk.get("metadata", {}), # Column does not exist
            "chunk_id": i,  # Map chunk_index to DB column 'chunk_id'
            "chunk_type": chunk_type,  # Populate the existing chunk_type column
            # DB columns id (PK) and created_at are auto-populated
        }
        records_to_insert.append(record)

    try:
        logger.info(
            f"Storing {len(records_to_insert)} chunks for document ID: {document_id} in schema 'esg_data'"
        )
        # Specify schema using .schema() method before .table()
        response = (
            supabase.schema("esg_data")
            .table(CHUNKS_TABLE)
            .insert(records_to_insert)
            .execute()
        )

        # Basic check for errors
        if hasattr(response, "error") and response.error:
            logger.error(
                f"Error storing chunks for document {document_id}: {response.error}"
            )
            return False
        if not response.data:
            logger.warning(
                f"Supabase insert for chunks of document {document_id} returned no data, though no explicit error."
            )
            # Continue assuming success if no error.

        logger.info(
            f"Successfully stored {len(records_to_insert)} chunks for document ID: {document_id}"
        )
        return True

    except Exception as e:
        logger.exception(f"Exception storing chunks for document {document_id}: {e}")
        return False
