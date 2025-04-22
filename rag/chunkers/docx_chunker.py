# -*- coding: utf-8 -*-
"""Chunking logic specific to parsed DOCX data."""

from sentence_transformers import SentenceTransformer, util
import nltk
# Ensure punkt is available (consider moving download elsewhere, e.g., Dockerfile or setup script)
# try:
#     nltk.data.find("tokenizers/punkt")
# except LookupError:
#     nltk.download('punkt', quiet=True)
from nltk.tokenize import sent_tokenize
from typing import List, Dict, Optional, Any
import spacy
import logging
import uuid
import os

logger = logging.getLogger(__name__)

# --- Model Loading --- 
# Load models lazily or make them configurable
# These models can be large and slow down service startup
_model_semantic = None
_nlp_spacy = None

def _load_models():
    global _model_semantic, _nlp_spacy
    if _model_semantic is None:
        logger.info("Loading SentenceTransformer model (all-mpnet-base-v2) for DOCX chunking...")
        _model_semantic = SentenceTransformer('all-mpnet-base-v2')
        logger.info("SentenceTransformer model loaded.")
    if _nlp_spacy is None:
        try:
            logger.info("Loading Spacy model (es_core_news_sm) for DOCX chunking...")
            _nlp_spacy = spacy.load("es_core_news_sm")
            logger.info("Spacy model loaded.")
        except OSError:
            logger.error("Spacy model 'es_core_news_sm' not found. Please run: python -m spacy download es_core_news_sm")
            # Decide on fallback - maybe use NLTK sent_tokenize? Or raise error?
            # Using NLTK as a fallback for now
            logger.warning("Falling back to NLTK sentence tokenizer for DOCX.")
            try:
                nltk.data.find("tokenizers/punkt")
            except LookupError:
                nltk.download('punkt', quiet=True)
            _nlp_spacy = "nltk_fallback" # Use a sentinel value

# Default configuration
DEFAULT_DOCX_CHUNK_CONFIG = {
    'similarity_threshold': 0.35, # Lower threshold allows slightly less related sentences in a chunk
    'max_chunk_chars': 2500,      # Max characters per chunk text
    'min_sentences_per_chunk': 3  # Minimum sentences to form a chunk before splitting by similarity
}

def chunk_docx_data(parsed_data: Dict[str, Any], config: Dict = None) -> List[Dict]:
    """
    Chunks data parsed from a DOCX file using semantic splitting based on sections.
    
    Args:
        parsed_data (Dict[str, Any]): The output from docx_parser.parse_docx.
                                     Expected structure: {"metadata": {...}, "sections": [{ "heading": ..., "content": ...}]}
        config (Dict, optional): Configuration for chunking. Defaults to DEFAULT_DOCX_CHUNK_CONFIG.
        
    Returns:
        List[Dict]: List of chunk dictionaries.
    """
    _load_models() # Ensure models are loaded
    
    if "error" in parsed_data:
        logger.error(f"Cannot chunk data due to parsing error: {parsed_data['error']}")
        return []
        
    # Validate structure needed for chunking
    if not isinstance(parsed_data.get("metadata"), dict) or \
       not isinstance(parsed_data.get("sections"), list):
        logger.error(f"Invalid input structure for docx chunking: {parsed_data.keys()}")
        return []
        
    cfg = {**DEFAULT_DOCX_CHUNK_CONFIG, **(config or {})} # Merge configs
    chunks = []
    metadata = parsed_data["metadata"]
    sections = parsed_data["sections"]
    doc_filename = metadata.get("filename", "unknown_docx")

    if not sections:
        logger.warning(f"No sections found in DOCX: {doc_filename}")
        # Optionally chunk the raw text if available
        if parsed_data.get("text"):
            sections = [{"heading": "Full Document", "content": parsed_data["text"]}]
        else:
            return []

    # Base metadata for all chunks from this file
    base_chunk_meta = {
        "source_filename": doc_filename,
        "source_type": "docx",
        # Potentially add other doc metadata here
    }
    
    last_chunk_title = None # Track title of the last added chunk

    for section in sections:
        section_title = section.get("heading", "Unknown Section")
        section_content = section.get("content", "")
        
        if not section_content.strip():
            continue
            
        # Tokenize into sentences using Spacy or NLTK fallback
        if _nlp_spacy == "nltk_fallback":
            sentences = nltk.sent_tokenize(section_content)
            sentences = [s.strip() for s in sentences if s.strip()]
        elif _nlp_spacy:
            sentences = [sent.text.strip() for sent in _nlp_spacy(section_content).sents if sent.text.strip()]
        else:
            logger.error("No sentence tokenizer available for DOCX. Skipping section.")
            continue
             
        if not sentences:
            continue

        current_chunk_sentences = []
        current_chunk_chars = 0
        
        # Encode all sentences in the section at once for efficiency
        try:
            embeddings = _model_semantic.encode([s.replace("\n", " ") for s in sentences], convert_to_tensor=True)
        except Exception as e:
            logger.error(f"Failed to encode sentences for section '{section_title}': {e}")
            continue # Skip this section if encoding fails

        for i in range(len(sentences)):
            sentence = sentences[i].replace("\n", " ") # Use cleaned sentence
            sentence_len = len(sentence)
            
            # --- Chunking Logic --- 
            should_split = False
            # 1. Check similarity with the next sentence (if one exists)
            if i < len(sentences) - 1:
                try:
                    # Using pre-calculated embeddings
                    similarity = util.pytorch_cos_sim(embeddings[i], embeddings[i+1]).item()
                    if similarity < cfg['similarity_threshold'] and len(current_chunk_sentences) >= cfg['min_sentences_per_chunk']:
                        should_split = True
                        logger.debug(f"Splitting chunk due to low similarity ({similarity:.2f}) after sentence {i}")
                except Exception as e:
                    logger.warning(f"Could not calculate similarity at sentence {i}: {e}")
            
            # 2. Check if adding the current sentence exceeds max character length
            if not should_split and (current_chunk_chars + sentence_len + 1) >= cfg['max_chunk_chars']:
                # Allow adding if chunk is currently empty, otherwise split
                if current_chunk_sentences:
                    should_split = True
                    logger.debug(f"Splitting chunk due to max chars ({cfg['max_chunk_chars']}) before sentence {i}")
                else: 
                    # If the single sentence itself is too long, log warning but add it
                    logger.warning(f"Single sentence exceeds max_chunk_chars ({sentence_len} > {cfg['max_chunk_chars']}). Adding as its own chunk.")

            # --- Decide whether to finalize previous chunk --- 
            if should_split and current_chunk_sentences:
                # Finalize the previous chunk
                chunk_text = " ".join(current_chunk_sentences)
                chunk_meta = {
                    **base_chunk_meta,
                    "chunk_id": str(uuid.uuid4()),
                    "text": chunk_text,
                    "metadata": { 
                        "section_heading": section_title, 
                    }
                }
                # Check if this chunk can be merged with the previous one
                if chunks and chunks[-1].get("metadata", {}).get("section_heading") == section_title:
                    logger.debug("Merging chunk with previous chunk under the same title.")
                    chunks[-1]["text"] += " " + chunk_text 
                else:
                    chunks.append(chunk_meta)
                    last_chunk_title = chunk_meta.get("metadata", {}).get("section_heading")
                      
                # Start new chunk with current sentence
                current_chunk_sentences = [sentence]
                current_chunk_chars = sentence_len
            else:
                # Add current sentence to the ongoing chunk
                current_chunk_sentences.append(sentence)
                current_chunk_chars += sentence_len + 1 # +1 for space

        # Add the last remaining chunk for the section
        if current_chunk_sentences:
            chunk_text = " ".join(current_chunk_sentences)
            chunk_meta = {
                **base_chunk_meta,
                "chunk_id": str(uuid.uuid4()),
                "text": chunk_text,
                "metadata": {
                    "section_heading": section_title,
                }
            }
            # Check for merging with the previous chunk
            if chunks and chunks[-1].get("metadata", {}).get("section_heading") == section_title:
                logger.debug("Merging final chunk with previous chunk under the same title.")
                chunks[-1]["text"] += " " + chunk_text
            else:
                chunks.append(chunk_meta)

    # Final pass: handle potential isolated short chunks (optional)
    # This logic might merge unrelated short chunks if not careful
    # Consider removing or making it section-aware
    # if len(chunks) > 1 and len(chunks[-1]["text"]) < 50:
    #     logger.debug("Merging last short chunk with the preceding one.")
    #     chunks[-2]["text"] += " " + chunks[-1]["text"]
    #     chunks.pop()
    
    logger.info(f"Generated {len(chunks)} chunks for DOCX file '{doc_filename}'.")
    return chunks

# Example usage if run directly (for testing)
if __name__ == '__main__':
    import json
    # Mock parsed data (requires a docx parser run first)
    mock_parsed_data = {
        "metadata": {"filename": "test.docx"},
        "sections": [
            {"heading": "Introduction", "content": "This is the first sentence. This is the second sentence which is related. This third sentence talks about something else slightly."}, 
            {"heading": "Methods", "content": "We used several methods. First, method A was applied. Then method B followed."},
            {"heading": "Methods", "content": "Finally, method C provided insights. This section continues the methods description."}, # Test merging
            {"heading": "Results", "content": "The results were clear. Significance was found (p < 0.05). Further analysis is needed."*50}, # Test long section
            {"heading": "Short Section", "content": "Very short."} # Test short section
        ]
    }

    # Make sure models are loaded (in real app, this might happen at startup)
    _load_models()
    
    if _nlp_spacy: # Only run if spacy model loaded successfully
        chunks = chunk_docx_data(mock_parsed_data)
        print(f"Generated {len(chunks)} chunks.")
        if chunks:
            print("\n--- Chunks ---:")
            for i, chunk in enumerate(chunks):
                print(f"Chunk {i+1} (Section: {chunk.get('section_heading')})")
                print(json.dumps(chunk, indent=2, ensure_ascii=False))
                print("---")
    else:
        print("Spacy model not available. Cannot run example.") 