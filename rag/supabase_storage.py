# -*- coding: utf-8 -*-
"""Functions for storing document and chunk data in Supabase."""

import logging
import uuid
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timezone

# Import the Supabase client utility
from .supabase_client import get_supabase_client

logger = logging.getLogger(__name__)

# --- Constants for Table Names (Matching DB Schema) ---
DOCUMENTS_TABLE = "documents"  # Updated table name
CHUNKS_TABLE = "document_chunks"  # Updated table name

# --- Validation Functions ---

def validate_chunk_storage_request(
    supabase: Any,
    document_id: str,
    chunks: List[Dict[str, Any]],
    embeddings: List[List[float]]
) -> Tuple[bool, str, List[Dict[str, Any]]]:
    """
    Validates the request to store chunks and their embeddings.
    
    Args:
        supabase: The Supabase client instance
        document_id (str): The UUID of the parent document
        chunks (List[Dict[str, Any]]): The list of chunks to store
        embeddings (List[List[float]]): The list of embedding vectors

    Returns:
        Tuple[bool, str, List[Dict[str, Any]]]: A tuple containing:
            - bool: True if validation passed, False otherwise
            - str: Error message if validation failed, empty string if passed
            - List[Dict[str, Any]]: Processed records to insert if validation passed, empty list if failed
    """
    logger.info(f"Starting validation for chunk storage request - Document ID: {document_id}")
    
    # Check Supabase client
    if not supabase:
        msg = "Supabase client not available"
        logger.error(f"Validation failed: {msg}")
        return False, msg, []

    # Check document_id
    if not document_id or not isinstance(document_id, str):
        msg = f"Invalid document_id: {document_id}"
        logger.error(f"Validation failed: {msg}")
        return False, msg, []

    # Check chunks and embeddings existence
    if not chunks or not embeddings:
        msg = "Empty chunks or embeddings list provided"
        logger.error(f"Validation failed: {msg}")
        return False, msg, []

    # Check length match between chunks and embeddings
    if len(chunks) != len(embeddings):
        msg = f"Mismatch between chunks ({len(chunks)}) and embeddings ({len(embeddings)})"
        logger.error(f"Validation failed: {msg}")
        return False, msg, []

    # Validate individual chunks and prepare records
    records_to_insert = []
    for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        # Validate chunk structure
        if not isinstance(chunk, dict) or 'text' not in chunk:
            msg = f"Invalid chunk structure at index {i}"
            logger.error(f"Validation failed: {msg}")
            return False, msg, []

        # Validate embedding format
        if not isinstance(embedding, list) or not all(isinstance(x, (int, float)) for x in embedding):
            msg = f"Invalid embedding format at index {i}"
            logger.error(f"Validation failed: {msg}")
            return False, msg, []

        # Default chunk_type, maybe enhance later if chunk metadata provides it
        chunk_type = chunk.get("metadata", {}).get("type", "text")

        record = {
            "document_id": document_id,
            "chunk_text": chunk.get("text"),
            "embedding": embedding,
            "chunk_id": i,
            "chunk_type": chunk_type,
        }
        records_to_insert.append(record)

    # Check total size of records (rough estimation)
    total_size = sum(len(str(record)) for record in records_to_insert)
    if total_size > 200 * 1024 * 1024:  # 200MB limit as an example
        msg = f"Total payload size ({total_size / 1024 / 1024:.2f}MB) exceeds limit"
        logger.error(f"Validation failed: {msg}")
        return False, msg, []

    logger.info(f"Validation passed successfully for {len(records_to_insert)} chunks")
    return True, "", records_to_insert


# --- Chunk Storage ---

def store_chunks(
    document_id: str, chunks: List[Dict[str, Any]], embeddings: List[List[float]]
) -> bool:
    """
    Stores processed chunks and their embeddings in the Supabase chunks table (esg_data.document_chunks) in batches to avoid exceeding payload size limits.

    Args:
        document_id (str): The UUID of the parent document (maps to documents.id).
        chunks (List[Dict[str, Any]]): The list of standardized chunks from the processor.
        embeddings (List[List[float]]): The list of corresponding embedding vectors.

    Returns:
        bool: True if all chunks were stored successfully, False otherwise.

    Edge Cases:
        - Handles large files by batching inserts to avoid payload size errors.
        - Logs and returns False if any batch fails to insert.
    """
    supabase = get_supabase_client()
    
    # Validate request (skip size check here, do it per batch below)
    is_valid, error_msg, records_to_insert = validate_chunk_storage_request(
        supabase, document_id, chunks, embeddings
    )
    
    if not is_valid:
        logger.info(f"File is too large to store in Supabase, performing chunking and storing in batches.")
        return False

    BATCH_SIZE = 50  # Number of records per batch insert
    MAX_BATCH_SIZE_BYTES = 8 * 1024 * 1024  # 8MB per batch (conservative)
    total_records = len(records_to_insert)
    success = True
    logger.info(f"Storing {total_records} chunks for document ID: {document_id} in batches of {BATCH_SIZE}, total batches: {total_records//BATCH_SIZE}")
    i = 0
    while i < total_records:
        batch = records_to_insert[i:i+BATCH_SIZE]
        # Check batch size in bytes
        batch_size_bytes = sum(len(str(record)) for record in batch)
        # If batch is too large, reduce batch size
        while batch_size_bytes > MAX_BATCH_SIZE_BYTES and len(batch) > 1:
            logger.info(f"Batch is too large, reducing batch size to {len(batch)//2}")
            batch = batch[:len(batch)//2]
            batch_size_bytes = sum(len(str(record)) for record in batch)
        logger.info(f"Inserting batch {i//BATCH_SIZE+1}: {len(batch)} records, ~{batch_size_bytes/1024/1024:.2f}MB")
        try:
            response = (
                supabase.postgrest.schema("esg_data")
                .table(CHUNKS_TABLE)
                .insert(batch)
                .execute()
            )
            if hasattr(response, "error") and response.error:
                logger.error(
                    f"Error storing batch {i//BATCH_SIZE+1} for document {document_id}: {response.error}"
                )
                success = False
                break
            if not response.data:
                logger.warning(
                    f"Supabase insert for batch {i//BATCH_SIZE+1} of document {document_id} returned no data, though no explicit error."
                )
        except Exception as e:
            logger.exception(f"Exception storing batch {i//BATCH_SIZE+1} for document {document_id}: {e}")
            success = False
            break
        i += len(batch)
    if success:
        logger.info(
            f"Successfully stored {total_records} chunks for document ID: {document_id} in batches."
        )
    return success
