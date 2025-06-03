import pytest
import os
import json
from flask import Flask, jsonify, request
from unittest.mock import patch, MagicMock
from werkzeug.datastructures import FileStorage
from io import BytesIO
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

# Mock Supabase client
mock_supabase = MagicMock()

# Add file management endpoints
@app.route('/api/upload-file', methods=['POST'])
@mock_require_auth
def upload_file():
    """Endpoint to upload files."""
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    path = request.form.get('path', '')
    
    # Simulate successful upload
    return jsonify({
        "fileId": f"{path}/{file.filename}" if path else file.filename,
        "name": file.filename,
        "path": path.split("/") if path else [],
    })

@app.route('/api/list-tree', methods=['GET'])
@mock_require_auth
def list_tree():
    """Endpoint to list uploaded files and folders."""
    path = request.args.get('path', '')
    
    # Return mocked file list
    files = [
        {
            "id": "file1",
            "name": "example.pdf",
            "type": "application/pdf",
            "size": 1024,
            "modified": "2023-01-01T00:00:00Z",
            "path": path.split("/") if path else [],
            "chunked": True
        },
        {
            "id": None,  # Folders have id=None
            "name": "reports",
            "type": "folder",
            "size": 0,
            "path": path.split("/") if path else [],
            "chunked": False
        },
        {
            "id": "file2",
            "name": "data.xlsx",
            "type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "size": 2048,
            "modified": "2023-01-02T00:00:00Z",
            "path": path.split("/") if path else [],
            "chunked": False
        }
    ]
    
    return jsonify(files)

@app.route('/api/create-folder', methods=['POST'])
@mock_require_auth
def create_folder():
    """Endpoint to create a folder."""
    data = request.json
    name = data.get('name')
    path = data.get('path', '')
    
    if not name:
        return jsonify({"error": "Folder name is required"}), 400
    
    folder_path = f"{path}/{name}" if path else name
    
    return jsonify({
        "folderId": folder_path,
        "name": name,
        "path": path.split("/") if path else [],
        "type": "folder"
    })

@app.route('/api/delete', methods=['DELETE'])
@mock_require_auth
def delete_item():
    """Endpoint to delete a file or folder."""
    path = request.args.get('path')
    if not path:
        return jsonify({"error": "No path provided"}), 400
    
    # Simulate successful deletion
    return jsonify({
        "success": True,
        "path": path
    })

@app.route('/api/rename', methods=['POST'])
@mock_require_auth
def rename_item():
    """Endpoint to rename a file or folder."""
    data = request.json
    old_path = data.get('oldPath')
    new_name = data.get('newName')
    
    if not old_path or not new_name:
        return jsonify({"error": "Missing required parameters"}), 400
    
    # Get parent directory
    if '/' in old_path:
        parent_dir = old_path.rsplit('/', 1)[0]
        new_path = f"{parent_dir}/{new_name}"
    else:
        new_path = new_name
    
    return jsonify({
        "success": True,
        "oldPath": old_path,
        "newPath": new_path
    })

@app.route('/api/search-files', methods=['GET'])
@mock_require_auth
def search_files():
    """Endpoint to search for files."""
    query = request.args.get('query', '')
    file_type = request.args.get('type')
    
    if not query:
        return jsonify([]), 200
    
    # Return mock search results
    results = [
        {
            "id": "file1",
            "name": "example.pdf",
            "type": "file",
            "size": 1024,
            "path": [],
            "metadata": {
                "mimetype": "application/pdf"
            }
        }
    ]
    
    return jsonify(results)

@pytest.fixture
def client():
    """Create a test client for the Flask app."""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_upload_file_endpoint(client):
    """Test file upload functionality."""
    # Create a mock file
    data = BytesIO(b'This is a test file content')
    file = FileStorage(
        stream=data,
        filename='test.pdf',
        content_type='application/pdf',
    )
    
    # Send the file in a POST request
    response = client.post(
        '/api/upload-file',
        data={
            'file': file,
            'path': 'test_folder'
        },
        content_type='multipart/form-data'
    )
    
    # Check the response
    assert response.status_code == 200
    data = response.json
    assert 'fileId' in data
    assert data['name'] == 'test.pdf'
    assert data['path'] == ['test_folder']

def test_upload_file_no_file(client):
    """Test upload endpoint with no file."""
    response = client.post('/api/upload-file')
    assert response.status_code == 400
    assert 'error' in response.json

def test_list_tree_endpoint(client):
    """Test listing files and folders."""
    response = client.get('/api/list-tree')
    
    assert response.status_code == 200
    data = response.json
    assert isinstance(data, list)
    assert len(data) > 0
    
    # Check that we have files and folders
    file_types = [item['type'] for item in data]
    assert 'folder' in file_types
    assert 'application/pdf' in file_types

def test_list_tree_with_path(client):
    """Test listing files in a specific folder."""
    response = client.get('/api/list-tree?path=reports')
    
    assert response.status_code == 200
    data = response.json
    assert isinstance(data, list)
    
    # Check path is respected
    for item in data:
        assert item['path'] == ['reports']

def test_create_folder_endpoint(client):
    """Test folder creation."""
    response = client.post(
        '/api/create-folder',
        data=json.dumps({'name': 'new_folder', 'path': 'parent_folder'}),
        content_type='application/json'
    )
    
    assert response.status_code == 200
    data = response.json
    assert data['name'] == 'new_folder'
    assert data['path'] == ['parent_folder']
    assert data['type'] == 'folder'

def test_create_folder_no_name(client):
    """Test folder creation with no name."""
    response = client.post(
        '/api/create-folder',
        data=json.dumps({'path': 'parent_folder'}),
        content_type='application/json'
    )
    
    assert response.status_code == 400
    assert 'error' in response.json

def test_delete_item_endpoint(client):
    """Test item deletion."""
    response = client.delete('/api/delete?path=test_folder/test.pdf')
    
    assert response.status_code == 200
    data = response.json
    assert data['success'] is True
    assert data['path'] == 'test_folder/test.pdf'

def test_delete_item_no_path(client):
    """Test deletion with no path."""
    response = client.delete('/api/delete')
    
    assert response.status_code == 400
    assert 'error' in response.json

def test_rename_item_endpoint(client):
    """Test item renaming."""
    response = client.post(
        '/api/rename',
        data=json.dumps({
            'oldPath': 'test_folder/old.pdf',
            'newName': 'new.pdf'
        }),
        content_type='application/json'
    )
    
    assert response.status_code == 200
    data = response.json
    assert data['success'] is True
    assert data['oldPath'] == 'test_folder/old.pdf'
    assert data['newPath'] == 'test_folder/new.pdf'

def test_rename_item_missing_params(client):
    """Test renaming with missing parameters."""
    response = client.post(
        '/api/rename',
        data=json.dumps({'oldPath': 'test.pdf'}),
        content_type='application/json'
    )
    
    assert response.status_code == 400
    assert 'error' in response.json

def test_search_files_endpoint(client):
    """Test file search functionality."""
    response = client.get('/api/search-files?query=example')
    
    assert response.status_code == 200
    data = response.json
    assert isinstance(data, list)
    assert len(data) > 0
    
    # Check search results structure
    item = data[0]
    assert 'id' in item
    assert 'name' in item
    assert 'type' in item
    assert 'path' in item

def test_search_files_empty_query(client):
    """Test search with empty query."""
    response = client.get('/api/search-files?query=')
    
    assert response.status_code == 200
    data = response.json
    assert isinstance(data, list)
    assert len(data) == 0

if __name__ == "__main__":
    pytest.main(["-v", __file__]) 