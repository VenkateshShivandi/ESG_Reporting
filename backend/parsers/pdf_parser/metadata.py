"""
Metadata extraction module for the ESG PDF ETL Pipeline.

This module handles extracting advanced metadata from PDF documents.
"""

import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

def extract_document_metadata(pdf_path: str) -> Dict[str, Any]:
    """Extract comprehensive document metadata from PDF."""
    metadata = {}
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(pdf_path)
        # Basic metadata
        metadata = doc.metadata
        
        # Add document structure metadata
        metadata["toc"] = doc.get_toc()
        metadata["page_count"] = doc.page_count
        
        # Extract document language if available
        if "language" in metadata:
            metadata["primary_language"] = metadata["language"]
            
        # Add document statistics
        word_count = 0
        for page in doc:
            word_count += len(page.get_text("words"))
        metadata["word_count"] = word_count
        
        # Extract top keywords using basic frequency analysis
        if word_count > 0:
            try:
                text = ""
                for page_num in range(doc.page_count):
                    page = doc[page_num]
                    text += page.get_text()
                
                from collections import Counter
                import re
                words = re.findall(r'\b[a-zA-Z]{3,15}\b', text.lower())
                word_counts = Counter(words).most_common(20)
                metadata["keywords"] = [word for word, count in word_counts]
            except Exception as e:
                logger.warning(f"Failed to extract keywords: {str(e)}")
        
        doc.close()
        logger.info(f"Extracted {len(metadata)} metadata fields from document")
    except Exception as e:
        logger.warning(f"Failed to extract document metadata: {str(e)}")
    
    return metadata 