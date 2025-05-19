import pytest
import json
from flask import Flask, jsonify, request
from unittest.mock import patch, MagicMock
from functools import wraps

# Create a test Flask app
app = Flask(__name__)

# Mock authentication decorator
def mock_require_auth(f):
    """Mock authentication decorator for testing."""
    @wraps(f)
    def decorated(*args, **kwargs):
        # Simulating what the auth decorator would do
        request.user = {
            'id': 'test-user-id',
            'email': 'test@example.com',
            'role': 'user',
            'app_metadata': {'provider': 'email'}
        }
        return f(*args, **kwargs)
    return decorated

# Add document processing endpoints
@app.route('/api/process-file', methods=['POST'])
@mock_require_auth
def process_file():
    """Endpoint to process a document already in storage."""
    data = request.get_json()
    storage_path = data.get('storage_path')
    
    if not storage_path:
        return jsonify({'error': 'Missing storage_path in request body'}), 400
    
    # Mock successful processing response
    return jsonify({
        'success': True,
        'message': 'Processing completed.',
        'chunk_count': 10,
        'filename': storage_path.split('/')[-1] if '/' in storage_path else storage_path
    }), 200

@app.route('/api/search-files', methods=['GET'])
@mock_require_auth
def search_files():
    """Search for files based on query."""
    query = request.args.get('query', '')
    file_type = request.args.get('type')
    path = request.args.get('path', '')
    
    if not query:
        return jsonify([]), 200
    
    # Mock search results
    results = [
        {
            'id': 'file1',
            'name': f'document-{query}.pdf',
            'type': 'file',
            'size': 1024,
            'modified': '2023-01-01T00:00:00Z',
            'path': path.split('/') if path else [],
            'metadata': {
                'mimetype': 'application/pdf',
                'lastModified': '2023-01-01T00:00:00Z',
                'contentLength': 1024
            }
        },
        {
            'id': 'file2',
            'name': f'report-with-{query}.xlsx',
            'type': 'file',
            'size': 2048,
            'modified': '2023-01-02T00:00:00Z',
            'path': path.split('/') if path else [],
            'metadata': {
                'mimetype': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'lastModified': '2023-01-02T00:00:00Z',
                'contentLength': 2048
            }
        }
    ]
    
    # If file_type is specified, filter results
    if file_type:
        results = [r for r in results if file_type in r.get('metadata', {}).get('mimetype', '')]
    
    return jsonify(results), 200

@app.route('/api/chunked-files', methods=['GET'])
@mock_require_auth
def get_chunked_files():
    """Get a list of files that have been chunked."""
    # Mock chunked files response
    chunked_files = [
        {
            'id': 'doc1',
            'name': 'document1.pdf',
            'chunk_count': 15,
            'chunked_at': '2023-01-05T10:30:00Z'
        },
        {
            'id': 'doc2',
            'name': 'document2.pdf',
            'chunk_count': 8,
            'chunked_at': '2023-01-06T14:20:00Z'
        }
    ]
    
    return jsonify({'chunked_files': chunked_files}), 200

@app.route('/api/create-graph', methods=['POST'])
@mock_require_auth
def create_graph():
    """Create a subgraph in neo4j for a specific user."""
    data = request.get_json()
    document_ids = data.get('document_ids')
    user_id = data.get('user_id')
    
    if not document_ids or not user_id:
        return jsonify({'error': 'Missing required parameters'}), 400
    
    # Mock successful graph creation
    return jsonify({'subgraph_id': '123'}), 200

@pytest.fixture
def client():
    """Create a test client for the Flask app."""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_process_file_endpoint(client):
    """Test the process-file endpoint with valid data."""
    data = {
        'storage_path': 'documents/test.pdf'
    }
    
    response = client.post(
        '/api/process-file',
        json=data,
        content_type='application/json'
    )
    
    assert response.status_code == 200
    data = response.json
    assert data['success'] is True
    assert data['chunk_count'] > 0
    assert data['filename'] == 'test.pdf'

def test_process_file_missing_path(client):
    """Test the process-file endpoint with missing path."""
    data = {}  # Missing storage_path
    
    response = client.post(
        '/api/process-file',
        json=data,
        content_type='application/json'
    )
    
    assert response.status_code == 400
    data = response.json
    assert 'error' in data
    assert 'Missing storage_path' in data['error']

def test_search_files_endpoint(client):
    """Test the search-files endpoint with a query."""
    query = 'test'
    response = client.get(f'/api/search-files?query={query}')
    
    assert response.status_code == 200
    data = response.json
    assert len(data) > 0
    
    # Check that the query is reflected in the results
    for item in data:
        assert query in item['name'].lower()

def test_search_files_empty_query(client):
    """Test the search-files endpoint with an empty query."""
    response = client.get('/api/search-files?query=')
    
    assert response.status_code == 200
    data = response.json
    assert len(data) == 0  # Should return an empty list for empty query

def test_search_files_with_type(client):
    """Test the search-files endpoint with a file type filter."""
    query = 'test'
    file_type = 'pdf'
    response = client.get(f'/api/search-files?query={query}&type={file_type}')
    
    assert response.status_code == 200
    data = response.json
    
    # Check that all results have the specified file type
    for item in data:
        assert file_type in item.get('metadata', {}).get('mimetype', '').lower()

def test_chunked_files_endpoint(client):
    """Test the chunked-files endpoint."""
    response = client.get('/api/chunked-files')
    
    assert response.status_code == 200
    data = response.json
    assert 'chunked_files' in data
    assert len(data['chunked_files']) > 0
    
    # Check structure of chunked files
    for file in data['chunked_files']:
        assert 'id' in file
        assert 'name' in file
        assert 'chunk_count' in file
        assert 'chunked_at' in file
        assert file['chunk_count'] > 0

def test_create_graph_endpoint(client):
    """Test the create-graph endpoint with valid data."""
    data = {
        'document_ids': ['doc1', 'doc2'],
        'user_id': 'test-user-id'
    }
    
    response = client.post(
        '/api/create-graph',
        json=data,
        content_type='application/json'
    )
    
    assert response.status_code == 200
    data = response.json
    assert 'subgraph_id' in data

def test_create_graph_missing_params(client):
    """Test the create-graph endpoint with missing parameters."""
    data = {
        'document_ids': ['doc1', 'doc2']
        # Missing user_id
    }
    
    response = client.post(
        '/api/create-graph',
        json=data,
        content_type='application/json'
    )
    
    assert response.status_code == 400
    data = response.json
    assert 'error' in data
    assert 'Missing required parameters' in data['error']

if __name__ == "__main__":
    pytest.main(["-v", __file__]) 