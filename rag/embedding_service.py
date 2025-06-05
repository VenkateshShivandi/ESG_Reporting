# -*- coding: utf-8 -*-
"""Handles text embedding generation using OpenAI API."""

import os
import logging
from typing import List
from openai import OpenAI, APIError, RateLimitError # Updated import
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# --- OpenAI Client Initialization ---

# Load environment variables from .env file (assuming it's in rag/ or project root)
dotenv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '.env'))
if not os.path.exists(dotenv_path):
    dotenv_path_parent = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '.env'))
    if os.path.exists(dotenv_path_parent):
        dotenv_path = dotenv_path_parent
    else:
        dotenv_path = None

if dotenv_path:
    #load_dotenv(dotenv_path=dotenv_path)
    if os.getenv("ZEA_ENV") != "production":
        load_dotenv(".env.local")
    logger.info(f"Loaded environment variables from: {dotenv_path}")
else:
    logger.warning(".env file not found. Relying on system environment variables.")


# OpenAI model configuration
OPENAI_EMBEDDING_MODEL = "text-embedding-ada-002" # Standard 1536 dimension model
EXPECTED_DIMENSION = 1536

_openai_client = None

def _initialize_openai_client():
    """Initializes the OpenAI client lazily using API key from environment."""
    global _openai_client
    if _openai_client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            logger.error("OPENAI_API_KEY not found in environment variables. Cannot initialize OpenAI client.")
            return False # Indicate failure
        try:
            _openai_client = OpenAI(api_key=api_key)
            logger.info("OpenAI client initialized successfully.")
            # Optional: Add a simple test call here?
            # e.g., _openai_client.models.list()
            return True # Indicate success
        except Exception as e:
            logger.exception(f"Failed to initialize OpenAI client: {e}")
            return False
    return True # Already initialized

# --- Embedding Function ---

def generate_embeddings(texts: List[str]) -> List[List[float]]:
    """
    Generates embeddings for a list of text strings using OpenAI API.

    Args:
        texts (List[str]): A list of text strings to embed.
                          OpenAI recommends replacing newlines with spaces.

    Returns:
        List[List[float]]: A list of embedding vectors (1536 dimensions), 
                         or an empty list if embedding fails.
    """
    if not _initialize_openai_client():
        logger.error("OpenAI client not initialized. Cannot generate embeddings.")
        return []
        
    if not texts:
        logger.warning("Received empty list of texts for embedding.")
        return []

    # OpenAI recommendation: Replace newlines with spaces for best results
    prepared_texts = [text.replace("\n", " ") for text in texts]

    try:
        logger.info(f"Generating OpenAI embeddings for {len(prepared_texts)} texts using model {OPENAI_EMBEDDING_MODEL}...")
        
        # Use the v1 embeddings endpoint syntax
        response = _openai_client.embeddings.create(
            input=prepared_texts,
            model=OPENAI_EMBEDDING_MODEL
        )
        
        # Extract embeddings from the response object
        embeddings = [item.embedding for item in response.data]
        
        logger.info(f"Successfully generated {len(embeddings)} embeddings.")
        
        # Verification (optional but recommended)
        if embeddings and len(embeddings[0]) != EXPECTED_DIMENSION:
            logger.error(f"Generated embedding dimension mismatch! Expected {EXPECTED_DIMENSION}, Got {len(embeddings[0])}")
            # Decide how to handle - return empty or raise error?
            return [] 
            
        return embeddings
        
    except APIError as e:
        logger.exception(f"OpenAI API Error during embedding generation: {e.status_code} - {e.message}")
        return []
    except RateLimitError as e:
        logger.exception(f"OpenAI Rate Limit Error during embedding generation: {e.message}")
        # Consider adding retry logic here if needed
        return []
    except Exception as e:
        logger.exception(f"Unexpected error during OpenAI embedding generation: {e}")
        return []

def get_embedding_dimension() -> int:
    """Returns the expected dimension of the OpenAI embedding model."""
    # No need to load the model object here, return the known dimension
    return EXPECTED_DIMENSION

# Example Usage
if __name__ == '__main__':
    test_texts = [
        "This is the first test sentence.",
        "Aquí está la segunda frase de prueba.",
        "Dies ist der dritte Testsatz."
    ]
    
    print(f"Expected Model Dimension: {get_embedding_dimension()}")
    
    embeddings = generate_embeddings(test_texts)
    
    if embeddings:
        print(f"Generated {len(embeddings)} embeddings.")
        for i, emb in enumerate(embeddings):
            print(f"Embedding {i+1} (length: {len(emb)}, first 5 dims): {emb[:5]}...")
    else:
        print("Failed to generate embeddings (Check API Key and OpenAI status). Ensure .env is loaded.") 