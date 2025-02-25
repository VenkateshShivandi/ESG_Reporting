import os
import pytest
from unittest.mock import MagicMock, patch
import json

# Set test environment variables
os.environ["OPENAI_API_KEY"] = "test_openai_key"
os.environ["HELICONE_API_KEY"] = "test_helicone_key"

# Load test data
@pytest.fixture
def sample_documents():
    """Provide sample documents for testing"""
    return [
        {"id": "doc1", "text": "This is a document about environmental impact."},
        {"id": "doc2", "text": "Social responsibility in corporate governance."},
        {"id": "doc3", "text": "Greenhouse gas emissions and climate change."}
    ]

@pytest.fixture
def sample_query():
    """Provide sample query for testing"""
    return "What are the environmental impacts?"

@pytest.fixture
def sample_embeddings():
    """Provide pre-calculated embeddings"""
    return {
        "doc1": [0.1, 0.2, 0.3, 0.4],
        "doc2": [0.2, 0.3, 0.4, 0.5],
        "doc3": [0.3, 0.4, 0.5, 0.6],
        "query": [0.2, 0.3, 0.5, 0.6]
    }

@pytest.fixture
def mock_openai():
    """Mock OpenAI API responses"""
    with patch("openai.Embedding.create") as mock_embedding:
        # Set embedding response
        mock_embedding.return_value = {
            "data": [{"embedding": [0.1, 0.2, 0.3, 0.4]}],
            "usage": {"total_tokens": 10}
        }
        
        with patch("openai.ChatCompletion.create") as mock_chat:
            # Set chat response
            mock_chat.return_value = {
                "choices": [{"message": {"content": "This is a test response"}}],
                "usage": {"total_tokens": 20}
            }
            
            yield {
                "embedding": mock_embedding,
                "chat": mock_chat
            }

@pytest.fixture
def mock_document_processor():
    """Mock document processor"""
    processor = MagicMock()
    processor.process.return_value = [
        {"id": "chunk1", "text": "Environmental impact section.", "metadata": {"source": "doc1"}},
        {"id": "chunk2", "text": "Climate change considerations.", "metadata": {"source": "doc3"}}
    ]
    return processor

@pytest.fixture
def mock_vector_store():
    """Mock vector database"""
    store = MagicMock()
    store.similarity_search.return_value = [
        {"id": "chunk1", "text": "Environmental impact section.", "metadata": {"source": "doc1"}, "score": 0.92},
        {"id": "chunk2", "text": "Climate change considerations.", "metadata": {"source": "doc3"}, "score": 0.85}
    ]
    return store 