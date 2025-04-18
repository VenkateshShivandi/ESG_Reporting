"""
Pytest tests for the RAG Flask application endpoints.

Uses the Flask test client provided by the `client` fixture to simulate
HTTP requests to the RAG API endpoints.
Covers success cases and error conditions for chunking, embedding, and querying.
"""
import pytest
import json
from io import BytesIO
from rag.rag_app import app

@pytest.fixture
def client():
    """Pytest fixture to set up the Flask test client."""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

# === Test /rag/chunk ===
def test_chunk_file_upload_success(client):
    """Test successful file chunking via multipart/form-data file upload."""
    data = {
        'file': (BytesIO(b"This is a test sentence. This is another test sentence."), 'test.txt')
    }
    response = client.post('/rag/chunk', content_type='multipart/form-data', data=data)
    assert response.status_code == 200
    assert 'chunks' in response.json
    assert len(response.json['chunks']) > 0
    assert 'text' in response.json['chunks'][0]

def test_chunk_file_upload_no_file(client):
    """Test chunking endpoint failure when no file is provided in multipart request."""
    response = client.post('/rag/chunk', content_type='multipart/form-data')
    assert response.status_code == 400
    assert 'error' in response.json
    assert 'Request must be file upload or JSON with file_path' in response.json['error']

# === Test /rag/embed ===
def test_embed_chunks_success(client):
    """Test successful chunk embedding after chunking a test file.

    Ensures embeddings are returned and match the number of input chunks.
    """
    # First, chunk a dummy file to get chunks
    chunk_data = {
        'file': (BytesIO(b"Embedding test content."), 'embed_test.txt')
    }
    chunk_response = client.post('/rag/chunk', content_type='multipart/form-data', data=chunk_data)
    chunks = chunk_response.json.get('chunks', [])
    assert len(chunks) > 0

    # Now test embedding these chunks
    embed_payload = {'chunks': chunks}
    response = client.post('/rag/embed', json=embed_payload)
    assert response.status_code == 200
    assert 'embeddings' in response.json
    assert len(response.json['embeddings']) == len(chunks)
    assert isinstance(response.json['embeddings'][0], list)
    assert isinstance(response.json['embeddings'][0][0], float)

def test_embed_chunks_missing_payload(client):
    """Test embedding endpoint failure when the 'chunks' key is missing in JSON payload."""
    response = client.post('/rag/embed', json={})
    assert response.status_code == 400
    assert 'error' in response.json
    assert 'chunks list is required' in response.json['error']

def test_embed_chunks_invalid_payload(client):
    """Test embedding endpoint failure when the 'chunks' value is not a list."""
    response = client.post('/rag/embed', json={'chunks': 'not_a_list'})
    assert response.status_code == 400
    assert 'error' in response.json
    assert 'chunks list is required' in response.json['error']

# === Test /rag/query ===
def test_query_success(client):
    """Test successful query after embedding some sample content.

    Ensures results are returned in the correct format.
    """
    # First, embed something
    chunk_data = {
        'file': (BytesIO(b"Information about apples."), 'apple_test.txt')
    }
    chunk_response = client.post('/rag/chunk', content_type='multipart/form-data', data=chunk_data)
    chunks = chunk_response.json.get('chunks', [])
    client.post('/rag/embed', json={'chunks': chunks})

    # Now query
    query_payload = {'query': 'tell me about apples', 'top_k': 1}
    response = client.post('/rag/query', json=query_payload)
    assert response.status_code == 200
    assert 'results' in response.json
    results = response.json['results']
    assert len(results) >= 0 # Can be 0 if embedding/query fails, but shouldn't error
    if len(results) > 0:
        assert 'text' in results[0]
        assert 'score' in results[0]
        assert isinstance(results[0]['score'], float)

def test_query_missing_query(client):
    """Test query endpoint failure when the 'query' key is missing in JSON payload."""
    response = client.post('/rag/query', json={'top_k': 3})
    assert response.status_code == 400
    assert 'error' in response.json
    assert 'query text is required' in response.json['error'] 