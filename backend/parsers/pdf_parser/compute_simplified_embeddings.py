"""
Simplified embedding computation for the ESG PDF ETL Pipeline.
"""

import logging
import numpy as np
from typing import List

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

def compute_simplified_embeddings(sentences: List[str]) -> np.ndarray:
    """Compute simplified embeddings using TF-IDF and SVD."""
    if not sentences:
        logger.warning("No sentences provided for embedding")
        return np.array([])
    try:
        logger.info(f"Computing simplified embeddings for {len(sentences)} sentences")
        non_empty_sentences = [s for s in sentences if s.strip()]
        original_to_filtered = {i: j for j, i in enumerate([i for i, s in enumerate(sentences) if s.strip()])}
        if not non_empty_sentences:
            logger.warning("All sentences are empty, returning random embeddings")
            return np.random.random((len(sentences), 20))
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.decomposition import TruncatedSVD
        tfidf = TfidfVectorizer(
            min_df=1, stop_words="english", lowercase=True, use_idf=True, norm="l2", max_features=10000
        )
        tfidf_matrix = tfidf.fit_transform(non_empty_sentences)
        n_components = min(50, tfidf_matrix.shape[0], tfidf_matrix.shape[1])
        svd = TruncatedSVD(n_components=n_components, random_state=42)
        normalized_embeddings = svd.fit_transform(tfidf_matrix)
        embeddings = np.zeros((len(sentences), n_components))
        for orig_idx, filt_idx in original_to_filtered.items():
            embeddings[orig_idx] = normalized_embeddings[filt_idx]
        logger.info(f"Created {embeddings.shape[1]}-dimensional simplified embeddings")
        return embeddings
    except Exception as e:
        logger.warning(f"Error computing simplified embeddings: {str(e)}")
        logger.warning("Falling back to random embeddings")
        return np.random.random((len(sentences), 20))