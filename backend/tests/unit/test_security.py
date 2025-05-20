import pytest
import os
import jwt
from unittest.mock import patch, MagicMock
from flask import Flask, jsonify, request
import sys
from pathlib import Path

# Add the backend directory to the system path for imports
backend_dir = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(backend_dir))

# Import the security module
import security

# Create a test Flask app
app = Flask(__name__)
app.logger = MagicMock()  # Mock the logger to avoid actual logging during tests

# Sample JWT token components for testing
TOKEN_HEADER = {
    "alg": "HS256",
    "typ": "JWT"
}

TOKEN_PAYLOAD = {
    "sub": "user123",
    "email": "test@example.com",
    "role": "user",
    "app_metadata": {
        "role": "editor"
    },
    "exp": 9999999999  # Far future expiration
}

# Create a signed token for testing
def create_test_token(payload=None):
    """Create a JWT token for testing."""
    if payload is None:
        payload = TOKEN_PAYLOAD
    return jwt.encode(payload, "test_secret", algorithm="HS256")

# Set up test endpoints
@app.route('/api/protected')
@security.require_auth
def protected_endpoint():
    """Test endpoint requiring authentication."""
    return jsonify({
        'message': 'You accessed a protected endpoint',
        'user_id': request.user['id']
    })

@app.route('/api/admin-only')
@security.require_auth
@security.require_role(['admin'])
def admin_endpoint():
    """Test endpoint requiring admin role."""
    return jsonify({
        'message': 'You accessed an admin endpoint'
    })

@app.route('/api/editor-or-admin')
@security.require_auth
@security.require_role(['editor', 'admin'])
def editor_or_admin_endpoint():
    """Test endpoint requiring editor or admin role."""
    return jsonify({
        'message': 'You accessed an editor/admin endpoint'
    })

@pytest.fixture
def client():
    """Create a test client for the Flask app."""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

@pytest.fixture
def test_token():
    """Fixture to provide a test JWT token."""
    return create_test_token()

class TestJWTVerification:
    """Tests for JWT token verification functionality."""

    def test_verify_jwt_token_valid(self):
        """Test that a valid JWT token is correctly verified."""
        token = create_test_token()
        
        with app.app_context():
            with patch('jwt.decode', return_value=TOKEN_PAYLOAD):
                decoded = security.verify_jwt_token(token)
                assert decoded['sub'] == 'user123'
                assert decoded['email'] == 'test@example.com'

    def test_verify_jwt_token_missing_sub(self):
        """Test that a token without a 'sub' claim is rejected."""
        payload = TOKEN_PAYLOAD.copy()
        del payload['sub']
        token = create_test_token(payload)
        
        with app.app_context():
            with pytest.raises(jwt.InvalidTokenError):
                with patch('jwt.decode', return_value=payload):
                    security.verify_jwt_token(token)

    def test_verify_jwt_token_malformed(self):
        """Test that a malformed token raises an exception."""
        with app.app_context():
            with pytest.raises(Exception):
                security.verify_jwt_token("malformed.token.string")

class TestAuthDecorator:
    """Tests for the require_auth decorator."""
    
    def test_require_auth_missing_header(self, client):
        """Test that requests without auth header are rejected."""
        response = client.get('/api/protected')
        assert response.status_code == 401
        assert 'error' in response.json
        assert 'Missing authorization header' in response.json['error']

    def test_require_auth_valid_token(self, client, test_token):
        """Test that requests with valid tokens are processed."""
        with patch('security.verify_jwt_token', return_value=TOKEN_PAYLOAD):
            response = client.get('/api/protected', headers={'Authorization': f'Bearer {test_token}'})
            assert response.status_code == 200
            assert 'message' in response.json
            assert 'You accessed a protected endpoint' in response.json['message']

    def test_require_auth_invalid_token(self, client):
        """Test that requests with invalid tokens are rejected."""
        with patch('security.verify_jwt_token', side_effect=Exception("Invalid token")):
            response = client.get('/api/protected', headers={'Authorization': 'Bearer invalid.token'})
            assert response.status_code == 401
            assert 'error' in response.json
            assert 'Invalid token' in response.json['error']

class TestRoleBasedAccess:
    """Tests for the require_role decorator."""

    def test_require_role_no_auth(self, client):
        """Test that role-based endpoints require authentication first."""
        response = client.get('/api/admin-only')
        assert response.status_code == 401

    def test_require_role_insufficient_permissions(self, client, test_token):
        """Test that users without required role are rejected."""
        user_payload = TOKEN_PAYLOAD.copy()
        user_payload['app_metadata'] = {'role': 'user'}
        
        with patch('security.verify_jwt_token', return_value=user_payload):
            response = client.get('/api/admin-only', headers={'Authorization': f'Bearer {test_token}'})
            assert response.status_code == 403
            assert 'error' in response.json
            assert 'Insufficient permissions' in response.json['error']

    def test_require_role_with_correct_role(self, client, test_token):
        """Test that users with required role can access endpoints."""
        admin_payload = TOKEN_PAYLOAD.copy()
        admin_payload['app_metadata'] = {'role': 'admin'}
        
        with patch('security.verify_jwt_token', return_value=admin_payload):
            response = client.get('/api/admin-only', headers={'Authorization': f'Bearer {test_token}'})
            assert response.status_code == 200
            assert 'message' in response.json

    def test_require_role_with_alternative_role(self, client, test_token):
        """Test that endpoints accepting multiple roles work correctly."""
        editor_payload = TOKEN_PAYLOAD.copy()
        editor_payload['app_metadata'] = {'role': 'editor'}
        
        with patch('security.verify_jwt_token', return_value=editor_payload):
            response = client.get('/api/editor-or-admin', headers={'Authorization': f'Bearer {test_token}'})
            assert response.status_code == 200
            assert 'message' in response.json

class TestRLSPolicies:
    """Tests for Row Level Security policy generation."""

    def test_generate_rls_policy_select(self):
        """Test generating a SELECT RLS policy."""
        sql = security.generate_rls_policy_sql(
            "esg_reports",
            "Users can view their reports", 
            "SELECT", 
            "organization_id IN (SELECT org_id FROM user_organizations WHERE user_id = auth.uid())"
        )
        
        assert 'CREATE POLICY "Users can view their reports"' in sql
        assert 'ON esg_reports' in sql
        assert 'FOR SELECT' in sql
        assert 'USING (' in sql
        assert 'organization_id IN' in sql
        assert ');' in sql

    def test_generate_rls_policy_insert(self):
        """Test generating an INSERT RLS policy."""
        sql = security.generate_rls_policy_sql(
            "esg_reports",
            "Editors can insert reports", 
            "INSERT", 
            None,  # No USING clause for INSERT
            "organization_id IN (SELECT org_id FROM user_organizations WHERE user_id = auth.uid() AND role = 'editor')"
        )
        
        assert 'CREATE POLICY "Editors can insert reports"' in sql
        assert 'ON esg_reports' in sql
        assert 'FOR INSERT' in sql
        assert 'WITH CHECK (' in sql
        assert 'organization_id IN' in sql
        assert 'role = \'editor\'' in sql

    def test_generate_rls_policy_update(self):
        """Test generating an UPDATE RLS policy."""
        using_clause = "organization_id IN (SELECT org_id FROM user_organizations WHERE user_id = auth.uid())"
        check_clause = "NEW.organization_id IN (SELECT org_id FROM user_organizations WHERE user_id = auth.uid())"
        
        sql = security.generate_rls_policy_sql(
            "esg_reports",
            "Users can update their reports", 
            "UPDATE", 
            using_clause,
            check_clause
        )
        
        assert 'CREATE POLICY "Users can update their reports"' in sql
        assert 'ON esg_reports' in sql
        assert 'FOR UPDATE' in sql
        assert 'USING (' in sql
        assert 'WITH CHECK (' in sql
        assert 'NEW.organization_id' in sql

    def test_generate_rls_policy_delete(self):
        """Test generating a DELETE RLS policy."""
        sql = security.generate_rls_policy_sql(
            "esg_reports",
            "Admins can delete reports", 
            "DELETE", 
            "organization_id IN (SELECT org_id FROM user_organizations WHERE user_id = auth.uid() AND role = 'admin')"
        )
        
        assert 'CREATE POLICY "Admins can delete reports"' in sql
        assert 'ON esg_reports' in sql
        assert 'FOR DELETE' in sql
        assert 'USING (' in sql
        assert 'role = \'admin\'' in sql
        assert ');' in sql

if __name__ == "__main__":
    pytest.main(["-v", __file__]) 