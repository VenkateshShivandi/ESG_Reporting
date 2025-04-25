"""
Core RAG service logic including embedding generation and vector search.

Uses SentenceTransformer for embeddings and FAISS for efficient similarity search.
Maintains an in-memory FAISS index and a metadata store mapping index positions
to original chunk data.
"""

import os
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

# Load or define the embedding model (e.g., from Hugging Face)
EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "paraphrase-multilingual-MiniLM-L12-v2")
# Initialize the SentenceTransformer model
model = SentenceTransformer(EMBEDDING_MODEL_NAME)

# Determine the dimension of the embeddings produced by the model
DIM = model.get_sentence_embedding_dimension()

# Create a FAISS index for fast approximate nearest neighbor search.
# IndexFlatIP uses Inner Product (cosine similarity after normalization).
index = faiss.IndexFlatIP(DIM)

# Simple dictionary to store chunk metadata (like text, source, chunk_id)
# keyed by the FAISS index position (integer).
metadata_store = {}


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed a list of text strings using the initialized SentenceTransformer model.

    Args:
        texts: A list of strings to embed.

    Returns:
        A list of embedding vectors (each vector is a list of floats).
    """
    embeddings = model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
    return embeddings.tolist()


def add_embeddings(chunks: list[dict], embeddings: list[list[float]]):
    """Add chunk metadata and their corresponding embeddings to the FAISS index
    and the metadata store.

    Embeddings are L2 normalized before adding to the index for cosine similarity.

    Args:
        chunks: A list of chunk dictionaries (containing text, chunk_id, etc.).
        embeddings: A list of embedding vectors corresponding to the chunks.
    """
    for chunk, vector in zip(chunks, embeddings):
        # Convert embedding list to a numpy array of float32
        vec = np.array(vector, dtype='float32').reshape(1, -1)
        # Normalize the vector for cosine similarity search using IndexFlatIP
        faiss.normalize_L2(vec)
        # Add the normalized vector to the FAISS index
        index.add(vec)
        # Get the index position of the added vector (it's always the last one)
        idx = index.ntotal - 1
        # Store the original chunk metadata at this index position
        metadata_store[idx] = chunk


def query(text: str, top_k: int = 5) -> list[dict]:
    """Query the FAISS index with input text and return top_k matching chunks.

    Args:
        text: The query text string.
        top_k: The maximum number of results to return (default: 5).

    Returns:
        A list of dictionaries, each containing a matching chunk's information
        (chunk_id, text) and its similarity score.
        Returns an empty list if no vectors are in the index or no matches are found.
    """
    if index.ntotal == 0:
        return [] # Return empty list if index is empty
        
    # Encode the query text into an embedding vector
    vec = model.encode([text], convert_to_numpy=True)
    # Normalize the query vector for cosine similarity search
    faiss.normalize_L2(vec)
    # Search the FAISS index for the top_k nearest neighbors
    distances, indices = index.search(vec, top_k)
    
    results = []
    # Process the search results
    for dist, idx in zip(distances[0], indices[0]):
        # FAISS returns -1 for indices if fewer than top_k results are found
        if idx < 0:
            continue
        # Retrieve the corresponding chunk metadata from our store
        chunk = metadata_store.get(idx)
        if chunk is None:
            # Should not happen if index and metadata_store are in sync
            continue
        # Append result with metadata and score
        results.append({
            "chunk_id": chunk.get("chunk_id"),
            "text": chunk.get("text"),
            "score": float(dist) # Cosine similarity score
        })
    return results 