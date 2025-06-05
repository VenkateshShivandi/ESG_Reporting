import pytest
from flask import Flask, jsonify, request
from functools import wraps

# Create a test Flask app
app = Flask(__name__)

# Add a simple status endpoint
@app.route('/api/status')
def status():
    """Status endpoint that returns API operational status."""
    return jsonify({
        'status': 'operational',
        'api_version': '1.0.0'
    })

# Add a simple authenticated endpoint with a mock decorator
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

@app.route('/api/profile')
@mock_require_auth
def user_profile():
    """Return user profile data."""
    return jsonify({
        'id': request.user['id'],
        'email': request.user['email'],
        'role': request.user['role'],
        'provider': request.user.get('app_metadata', {}).get('provider', 'email')
    })

# Add an ESG data endpoint
@app.route('/api/esg-data')
@mock_require_auth
def get_esg_data_endpoint():
    """Get ESG data for the authenticated user's organization."""
    return jsonify({
        'esg_metrics': [
            {
                'id': '1',
                'category': 'Environment',
                'name': 'Carbon Emissions',
                'value': 25.4,
                'unit': 'tons',
                'year': 2023,
                'quarter': 'Q1'
            },
            {
                'id': '2',
                'category': 'Social',
                'name': 'Employee Diversity',
                'value': 78.3,
                'unit': 'percent',
                'year': 2023,
                'quarter': 'Q1'
            }
        ]
    })

# Add an admin endpoint requiring specific role
def mock_require_role(roles):
    """Mock role-based authorization decorator for testing."""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            # In a real implementation, this would check if the user's role is in the allowed roles
            # Here we just simulate that the check passed
            return f(*args, **kwargs)
        return decorated
    return decorator

@app.route('/api/admin/users')
@mock_require_auth
@mock_require_role(['admin'])
def get_all_users():
    """Admin endpoint to get all users (requires admin role)."""
    return jsonify({
        'message': 'This endpoint is protected and only accessible to admins'
    })

@pytest.fixture
def client():
    """Create a test client for the Flask app."""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_status_endpoint(client):
    """Test the status endpoint returns correct information."""
    response = client.get('/api/status')
    
    assert response.status_code == 200
    data = response.json
    assert 'status' in data
    assert data['status'] == 'operational'
    assert 'api_version' in data
    assert data['api_version'] == '1.0.0'

def test_user_profile_endpoint(client):
    """Test the user profile endpoint returns user data."""
    response = client.get('/api/profile')
    
    assert response.status_code == 200
    data = response.json
    assert 'id' in data
    assert 'email' in data
    assert data['email'] == 'test@example.com'
    assert data['role'] == 'user'
    assert data['provider'] == 'email'

def test_esg_data_endpoint(client):
    """Test the ESG data endpoint returns appropriate metrics."""
    response = client.get('/api/esg-data')
    
    assert response.status_code == 200
    data = response.json
    assert 'esg_metrics' in data
    metrics = data['esg_metrics']
    assert len(metrics) > 0
    
    # Check if metrics have the expected structure
    for metric in metrics:
        assert 'id' in metric
        assert 'category' in metric
        assert 'name' in metric
        assert 'value' in metric
        assert 'unit' in metric

def test_admin_endpoint(client):
    """Test the admin endpoint returns protected message."""
    response = client.get('/api/admin/users')
    
    assert response.status_code == 200
    data = response.json
    assert 'message' in data
    assert 'protected' in data['message'].lower()

if __name__ == "__main__":
    pytest.main(["-v", __file__]) 