"""
Environment-specific settings for the ESG Reporting application.

This module loads environment variables and configures the application
for different environments (development, testing, production).
"""

import os
import logging
from pathlib import Path

# Environment detection
ENV = os.getenv("ESG_ENVIRONMENT", "development").lower()
IS_PRODUCTION = ENV == "production"
IS_TESTING = ENV == "testing"
IS_DEVELOPMENT = ENV == "development"

# Directories
BASE_DIR = Path(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.getenv("ESG_DATA_DIR", str(BASE_DIR / "data"))
OUTPUT_DIR = os.getenv("ESG_OUTPUT_DIR", str(BASE_DIR / "output"))
TEMP_DIR = os.getenv("ESG_TEMP_DIR", str(BASE_DIR / "tmp"))
MODEL_DIR = os.getenv("ESG_MODEL_DIR", str(BASE_DIR / "models"))

# Create directories if they don't exist
for directory in [DATA_DIR, OUTPUT_DIR, TEMP_DIR, MODEL_DIR]:
    os.makedirs(directory, exist_ok=True)

# API Settings
API_HOST = os.getenv("ESG_API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("ESG_API_PORT", "8000"))
API_DEBUG = not IS_PRODUCTION
API_RELOAD = not IS_PRODUCTION
API_WORKERS = int(os.getenv("ESG_API_WORKERS", "4"))
API_TIMEOUT = int(os.getenv("ESG_API_TIMEOUT", "300"))
API_BASE_URL = os.getenv("ESG_API_BASE_URL", f"http://localhost:{API_PORT}")

# Logging settings
LOG_LEVEL = os.getenv("ESG_LOG_LEVEL", "INFO" if IS_PRODUCTION else "DEBUG")
LOG_FILE = os.getenv("ESG_LOG_FILE", str(BASE_DIR / "logs" / "app.log"))
LOG_FORMAT = os.getenv("ESG_LOG_FORMAT", "%(asctime)s - %(name)s - %(levelname)s - %(message)s")

# Create log directory if it doesn't exist
os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format=LOG_FORMAT,
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler()
    ]
)

# Processing settings
MAX_CONCURRENT_PROCESSES = int(os.getenv("ESG_MAX_CONCURRENT_PROCESSES", "4"))
PROCESS_TIMEOUT = int(os.getenv("ESG_PROCESS_TIMEOUT", "600"))
USE_CUDA = os.getenv("ESG_USE_CUDA", "0").lower() in ["1", "true", "yes"]

# Storage settings
STORAGE_PROVIDER = os.getenv("ESG_STORAGE_PROVIDER", "local")  # Options: local, s3, supabase
S3_BUCKET = os.getenv("ESG_S3_BUCKET", "esg-reporting")
S3_REGION = os.getenv("ESG_S3_REGION", "us-east-1")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
SUPABASE_BUCKET = os.getenv("ESG_SUPABASE_BUCKET", "esg-documents")

# ML model settings
DEFAULT_EMBEDDING_MODEL = os.getenv("ESG_DEFAULT_EMBEDDING_MODEL", "all-MiniLM-L6-v2")
DEFAULT_LLM_MODEL = os.getenv("ESG_DEFAULT_LLM_MODEL", "gpt-3.5-turbo")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
HF_TOKEN = os.getenv("HUGGINGFACE_TOKEN", "")

# RAG settings
VECTOR_DB_PROVIDER = os.getenv("ESG_VECTOR_DB_PROVIDER", "chroma")  # Options: chroma, weaviate, pinecone
VECTOR_DB_PATH = os.getenv("ESG_VECTOR_DB_PATH", str(BASE_DIR / "vectorstore"))
RETRIEVAL_TOP_K = int(os.getenv("ESG_RETRIEVAL_TOP_K", "5"))
SIMILARITY_THRESHOLD = float(os.getenv("ESG_SIMILARITY_THRESHOLD", "0.6"))

# Security settings
SECRET_KEY = os.getenv("ESG_SECRET_KEY", "dev-secret-key" if not IS_PRODUCTION else None)
if IS_PRODUCTION and not SECRET_KEY:
    raise ValueError("SECRET_KEY environment variable must be set in production")

JWT_ALGORITHM = os.getenv("ESG_JWT_ALGORITHM", "HS256")
JWT_EXPIRATION_SECONDS = int(os.getenv("ESG_JWT_EXPIRATION_SECONDS", "86400"))  # 24 hours

# Load environment-specific overrides
if IS_PRODUCTION:
    try:
        from .settings_prod import *  # noqa
    except ImportError:
        pass
elif IS_TESTING:
    try:
        from .settings_test import *  # noqa
    except ImportError:
        pass
else:  # development
    try:
        from .settings_dev import *  # noqa
    except ImportError:
        pass 