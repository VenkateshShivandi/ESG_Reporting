"""
ETL settings for document processing in the ESG Reporting application.

This module contains configuration specific to the ETL (Extract, Transform, Load)
pipeline for processing documents, especially PDFs for ESG reporting.
"""

import os
from .constants import ESG_KEYWORDS, ALL_ESG_KEYWORDS
from .settings import MODEL_DIR, USE_CUDA

# ETL Pipeline settings
# --------------------

# Extraction settings
EXTRACTION_METHODS = ["PyMuPDF", "pdfminer", "PyPDF2", "camelot"]
FALLBACK_TO_OCR = True  # Whether to fall back to OCR if text extraction fails
OCR_ENABLED = True  # Whether OCR is enabled for the pipeline
OCR_LANGUAGE = "eng+spa"  # English and Spanish
OCR_CONFIG = r"--oem 3 --psm 6 -l eng+spa"  # Standard OCR config with English and Spanish
OCR_FALLBACK_CONFIG = r"--oem 3 --psm 6 -l eng"  # Fallback to English only if multilingual fails
OCR_LAST_RESORT_CONFIG = r"--oem 3 --psm 6"  # Last resort without language specification
MIN_EXTRACTION_METHODS = 1  # Minimum number of extraction methods to use
HANDLE_MULTILINGUAL = True  # Enable handling multiple languages

# Transformation settings - Using sentence transformers for quality embeddings
EMBEDDING_MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"
EMBEDDING_MODEL_PATH = None  # Set to a local path if available, or None for default
EMBEDDING_BATCH_SIZE = 64    # Increased batch size for better performance with large documents
EMBEDDING_MAX_LENGTH = 256   # Maximum sequence length
EMBED_TABLES = True  # Whether to embed tables as well as text

# Performance optimization settings
ENABLE_PERFORMANCE_OPTIMIZATIONS = True
LARGE_DOCUMENT_THRESHOLD = 100  # Pages
LARGE_DOCUMENT_BATCH_SIZE = 128  # Larger batches for big documents

# Chunking settings
MAX_CHUNK_SIZE = 8    # Optimal for focused chunks
MIN_CHUNK_SIZE = 2    # Prevent single-sentence fragments
CHUNK_SIMILARITY_THRESHOLD = 0.65  # Stricter similarity requirement
MAX_CHUNK_OVERLAP = 1  # Reduce overlap between chunks
CREATE_INDIVIDUAL_CHUNK_FILES = True  # Whether to create individual JSON files for each chunk
CHUNK_TYPE = "mixed"  # Options: "basic", "semantic", "mixed"
CHUNKING_CONFIG = {
    "type": CHUNK_TYPE,
    "max_size": MAX_CHUNK_SIZE,
    "min_size": MIN_CHUNK_SIZE,
    "similarity_threshold": CHUNK_SIMILARITY_THRESHOLD,
    "max_overlap": MAX_CHUNK_OVERLAP
}
LANGUAGE_DETECTION_CONFIG = {
    "sample_size": 1000,  # Number of characters to use for language detection
    "default_language": "en",  # Default language if detection fails
    "supported_languages": ["en", "es", "fr", "de", "pt"]  # Supported languages
}

# ESG relevance settings
ESG_RELEVANCE_THRESHOLD = 0.0  # Minimum ESG relevance score to keep a chunk (0.0 = keep all chunks)
ESG_RELEVANCE_SCORING_METHOD = "keyword"  # Options: "keyword", "ml_model"
KEYWORD_MATCH_WEIGHT = 1.0  # Weight for exact keyword matches
KEYWORD_FUZZY_MATCH_WEIGHT = 0.7  # Weight for fuzzy keyword matches
FUZZY_MATCH_THRESHOLD = 75  # Levenshtein ratio threshold for fuzzy matching (0-100)

# Extraction enhancements
EXTRACT_IMAGES = True
OCR_IMAGES = True
EXTRACT_ALL_TABLES = True  # Extract all tables regardless of size or content
PRESERVE_LAYOUT = True  # Try to preserve original document layout in extraction
EXTRACT_METADATA = True  # Extract all document metadata

# Output settings
OUTPUT_FORMAT = "json"  # Options: "json", "csv", "parquet"
OUTPUT_COMPRESSION = None  # Options: None, "gzip", "bz2", "zip", "xz"
TIMESTAMP_IN_FILENAME = True  # Whether to include a timestamp in output filenames
INCLUDE_METADATA_IN_OUTPUT = True  # Whether to include document metadata in output
SAVE_INTERMEDIATE_RESULTS = False  # Whether to save intermediate results during processing
METADATA_FIELDS = [
    "Title", "Author", "Subject", "Creator", "Producer", 
    "CreationDate", "ModDate", "Keywords", "PageCount"
]

# Advanced settings
PARALLEL_EXTRACTION = True  # Whether to use parallel processing for extraction
TABLE_EXTRACTION_THRESHOLD = 0.1  # Minimum table area ratio to extract
MAX_TABLE_ROWS = 1000  # Maximum number of rows to extract from a table
MAX_TABLE_SIZE_MB = 10  # Maximum size of a table in MB
USE_GPU_ACCELERATION = USE_CUDA  # Whether to use GPU acceleration when available

# Image extraction settings
IMAGE_MIN_WIDTH = 20  # pixels
IMAGE_MIN_HEIGHT = 20  # pixels
IMAGE_MAX_SIZE_RATIO = 0.5  # Max size relative to page (0.5 = 50% of page size)

# Add Spanish stopwords
SPANISH_STOPWORDS = ["el", "la", "los", "las", "de", "del", "y", "en", "por", "para"] 