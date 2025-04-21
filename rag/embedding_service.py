# -*- coding: utf-8 -*-
"""Handles text embedding generation using Sentence Transformers."""

import os
import logging
from sentence_transformers import SentenceTransformer
from typing import List
import numpy as np

logger = logging.getLogger(__name__)

# --- Model Initialization ---

# Load the model name from environment variable or use a default
# This allows flexibility in choosing the embedding model
# Match the default used in the old rag_service.py for consistency for now
EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "paraphrase-multilingual-MiniLM-L12-v2")

_model = None
_model_dim = None

def _load_embedding_model():
    """Loads the Sentence Transformer model lazily."""
    global _model, _model_dim
    if _model is None:
        try:
            logger.info(f"Loading embedding model: {EMBEDDING_MODEL_NAME}")
            _model = SentenceTransformer(EMBEDDING_MODEL_NAME)
            _model_dim = _model.get_sentence_embedding_dimension()
            logger.info(f"Embedding model loaded successfully. Dimension: {_model_dim}")
        except Exception as e:
            logger.exception(f"Failed to load embedding model '{EMBEDDING_MODEL_NAME}': {e}")
            # Handle failure appropriately - perhaps raise an error or return None
            # For now, _model remains None

# --- Embedding Function ---

def generate_embeddings(texts: List[str], batch_size: int = 32) -> List[List[float]]:
    """
    Generates embeddings for a list of text strings.

    Args:
        texts (List[str]): A list of text strings to embed.
        batch_size (int): The batch size to use for encoding.

    Returns:
        List[List[float]]: A list of embedding vectors, or an empty list if embedding fails.
    """
    _load_embedding_model() # Ensure model is loaded
    
    if _model is None:
        logger.error("Embedding model is not loaded. Cannot generate embeddings.")
        return []
        
    if not texts:
        logger.warning("Received empty list of texts for embedding.")
        return []

    try:
        logger.info(f"Generating embeddings for {len(texts)} texts with batch size {batch_size}...")
        # show_progress_bar can be True for long processes
        embeddings = _model.encode(texts, batch_size=batch_size, convert_to_numpy=True, show_progress_bar=False)
        logger.info(f"Successfully generated {len(embeddings)} embeddings.")
        return embeddings.tolist() # Convert numpy array to list of lists
    except Exception as e:
        logger.exception(f"Error during embedding generation: {e}")
        return []

def get_embedding_dimension() -> int:
    """Returns the dimension of the loaded embedding model."""
    _load_embedding_model() # Ensure model is loaded
    return _model_dim if _model else 0

# Example Usage
if __name__ == '__main__':
    test_texts = [
        "This is the first test sentence.",
        "Aquí está la segunda frase de prueba.",
        "Dies ist der dritte Testsatz."
    ]
    
    print(f"Model Dimension: {get_embedding_dimension()}")
    
    embeddings = generate_embeddings(test_texts)
    
    if embeddings:
        print(f"Generated {len(embeddings)} embeddings.")
        for i, emb in enumerate(embeddings):
            print(f"Embedding {i+1} (first 5 dims): {emb[:5]}...")
    else:
        print("Failed to generate embeddings.") 