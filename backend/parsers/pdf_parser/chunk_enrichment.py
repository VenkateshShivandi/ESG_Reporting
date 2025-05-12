"""
Chunk enrichment module for the ESG PDF ETL Pipeline.

This module handles enhancing chunks with additional metadata and context.
"""

import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

def enrich_chunks_with_metadata(chunks: List[Dict[str, Any]], document_metadata: Dict[str, Any], section_hierarchy: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Add standardized metadata to each chunk."""
    for chunk in chunks:
        # Find the most relevant section for this chunk
        chunk_position = chunk.get("span", [0, 0])[0] if "span" in chunk else 0
        
        # Find the closest section header before this chunk
        relevant_headers = [h for h in section_hierarchy if h["position"] <= chunk_position]
        closest_header = relevant_headers[-1] if relevant_headers else None
        
        if closest_header:
            chunk["section"] = closest_header["text"]
            chunk["section_level"] = closest_header["level"]
            chunk["section_path"] = closest_header.get("path", [])
            chunk["section_full_path"] = closest_header.get("full_path_text", "")
        
        # Add document-level metadata
        chunk["document"] = {
            "title": document_metadata.get("title", "Unknown"),
            "author": document_metadata.get("author", "Unknown"),
            "subject": document_metadata.get("subject", ""),
            "language": document_metadata.get("primary_language", "")
        }
        
        # Add content type metadata if not present
        if "type" not in chunk:
            chunk["type"] = "text"
            
        # Calculate reading time estimate (200 words per minute)
        words = chunk.get("word_count", 0)
        chunk["reading_time_seconds"] = (words / 200) * 60
    
    logger.info(f"Enriched {len(chunks)} chunks with document metadata and section hierarchy")
    return chunks 