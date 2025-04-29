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


# def update_document_status(document_id: str, status: str) -> bool:
#     """
#     Updates the status of an existing document record in the Supabase documents table.

#     Args:
#         document_id (str): The ID of the existing document record.
#         status (str): The new status to set.

#     Returns:
#         bool: True if update was successful, False otherwise.
#     """
#     supabase = get_supabase_client()
#     if not supabase:
#         logger.error("Supabase client not available. Cannot update document status.")
#         return False

#     try:
#         logger.info(f"Updating document status for ID {document_id} to {status}")
        
#         # Update document status
#         response = (
#             supabase.schema("esg_data")
#             .table(DOCUMENTS_TABLE)
#             .update({"status": status})
#             .eq("id", document_id)
#             .execute()
#         )

#         if hasattr(response, "error") and response.error:
#             logger.error(f"Error updating document status: {response.error}")
#             return False

#         logger.info(f"Successfully updated status for document ID: {document_id}")
#         return True

#     except Exception as e:
#         logger.exception(f"Exception updating document status: {e}")
#         return False


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
        chunk_type = chunk.get("source_type", "text")

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
