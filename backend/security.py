"""
ESG Reporting Platform Security Module

This module provides utilities for implementing row-level security (RLS)
policies in Supabase to protect ESG data based on user roles and permissions.

The module also includes functions for JWT token validation and role-based
access control to ensure GDPR compliance.
"""

import os
import json
import requests
from typing import Dict, List, Any, Optional, Union, Tuple
from flask import request, current_app
import jwt
from functools import wraps

# CONSTANTS
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')


def get_supabase_jwt_secrets() -> Dict[str, str]:
    """
    Fetch the Supabase JWT verification configuration.
    
    Returns:
        Dict[str, str]: The JWT configuration including jwk_url and public keys.
    """
    try:
        # Get Supabase JWT configuration
        response = requests.get(f"{SUPABASE_URL}/auth/v1/jwt/keys")
        response.raise_for_status()
        return response.json()
    except Exception as e:
        current_app.logger.error(f"Failed to get Supabase JWT secrets: {str(e)}")
        raise


def verify_jwt_token(token: str) -> Dict[str, Any]:
    """
    Verify a JWT token from Supabase and extract claims.
    
    Args:
        token (str): The JWT token to verify.
        
    Returns:
        Dict[str, Any]: The decoded JWT claims.
        
    Raises:
        Exception: If token verification fails.
    """
    try:
        # Get the JWT keys from Supabase
        jwt_secrets = get_supabase_jwt_secrets()
        
        # Decode and verify the token
        decoded_token = jwt.decode(
            token,
            options={"verify_signature": True},
            algorithms=["RS256"],
            audience=SUPABASE_URL
        )
        
        return decoded_token
    except jwt.PyJWTError as e:
        current_app.logger.error(f"JWT validation error: {str(e)}")
        raise
    except Exception as e:
        current_app.logger.error(f"Token verification error: {str(e)}")
        raise


def require_auth(f):
    """
    Decorator to require authentication for API endpoints.
    Validates the JWT token and adds user information to the request context.
    
    Usage:
        @app.route('/api/secure-endpoint')
        @require_auth
        def secure_endpoint():
            # Access current user with request.user
            return jsonify({"message": f"Hello, {request.user['email']}"})
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return {"error": "Missing or invalid authorization token"}, 401
        
        token = auth_header.split(' ')[1]
        try:
            # Verify and decode the token
            claims = verify_jwt_token(token)
            
            # Store user info in request context
            request.user = {
                "id": claims.get("sub"),
                "email": claims.get("email"),
                "role": claims.get("role", "user"),
                "app_metadata": claims.get("app_metadata", {})
            }
            
            # Log access for audit purposes (GDPR compliance)
            current_app.logger.info(
                f"User {request.user['email']} accessed {request.path}"
            )
            
            return f(*args, **kwargs)
        except Exception as e:
            current_app.logger.error(f"Authentication error: {str(e)}")
            return {"error": "Invalid token"}, 401
    
    return decorated


def require_role(required_roles: List[str]):
    """
    Decorator to require specific roles for accessing endpoints.
    Must be used after @require_auth.
    
    Args:
        required_roles (List[str]): List of roles that can access the endpoint.
        
    Usage:
        @app.route('/api/admin-only')
        @require_auth
        @require_role(['admin'])
        def admin_endpoint():
            return jsonify({"message": "Admin only content"})
    """
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not hasattr(request, 'user'):
                return {"error": "Authentication required"}, 401
            
            user_role = request.user.get('role', 'user')
            if user_role not in required_roles:
                return {"error": "Insufficient permissions"}, 403
            
            return f(*args, **kwargs)
        return decorated
    return decorator


# Sample SQL for creating Row Level Security policies in Supabase
# These would be applied directly in the Supabase dashboard or via migrations

"""
-- Enable Row Level Security on ESG data tables
ALTER TABLE esg_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE esg_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_uploads ENABLE ROW LEVEL SECURITY;

-- Create policies for esg_reports
-- 1. Allow users to view only their organization's reports
CREATE POLICY "Users can view their organization's reports" 
ON esg_reports FOR SELECT
USING (
  organization_id IN (
    SELECT org_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

-- 2. Allow users with editor role to insert reports for their organization
CREATE POLICY "Editors can insert reports" 
ON esg_reports FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT org_id FROM user_organizations 
    WHERE user_id = auth.uid() AND role IN ('editor', 'admin')
  )
);

-- 3. Allow users with editor role to update their organization's reports
CREATE POLICY "Editors can update reports" 
ON esg_reports FOR UPDATE
USING (
  organization_id IN (
    SELECT org_id FROM user_organizations 
    WHERE user_id = auth.uid() AND role IN ('editor', 'admin')
  )
);

-- 4. Only admins can delete reports
CREATE POLICY "Admins can delete reports" 
ON esg_reports FOR DELETE
USING (
  organization_id IN (
    SELECT org_id FROM user_organizations 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Similar policies would be created for esg_metrics and document_uploads tables
"""


# Example of how to create SQL for dynamic RLS policies from Python
def generate_rls_policy_sql(table_name: str, policy_name: str, 
                           operation: str, using_clause: str, 
                           with_check_clause: Optional[str] = None) -> str:
    """
    Generate SQL for creating a Row Level Security policy.
    
    Args:
        table_name (str): The table to apply the policy to.
        policy_name (str): The name of the policy.
        operation (str): The operation (SELECT, INSERT, UPDATE, DELETE, ALL).
        using_clause (str): The USING clause SQL.
        with_check_clause (Optional[str]): The WITH CHECK clause SQL for INSERT/UPDATE.
        
    Returns:
        str: The SQL statement for creating the policy.
    """
    sql = f"CREATE POLICY \"{policy_name}\" ON {table_name} FOR {operation} "
    
    if operation in ('INSERT', 'UPDATE', 'ALL') and with_check_clause:
        if operation != 'INSERT':
            sql += f"USING ({using_clause}) "
        
        if operation != 'SELECT':
            sql += f"WITH CHECK ({with_check_clause or using_clause})"
    else:
        sql += f"USING ({using_clause})"
    
    return sql + ";"


# Example usage:
"""
policies = [
    {
        "table": "esg_reports",
        "name": "Users can view their organization's reports",
        "operation": "SELECT",
        "using": "organization_id IN (SELECT org_id FROM user_organizations WHERE user_id = auth.uid())"
    },
    {
        "table": "esg_metrics",
        "name": "Editors can update metrics",
        "operation": "UPDATE",
        "using": "organization_id IN (SELECT org_id FROM user_organizations WHERE user_id = auth.uid() AND role IN ('editor', 'admin'))",
        "with_check": "organization_id IN (SELECT org_id FROM user_organizations WHERE user_id = auth.uid() AND role IN ('editor', 'admin'))"
    }
]

for policy in policies:
    sql = generate_rls_policy_sql(
        policy["table"], 
        policy["name"], 
        policy["operation"], 
        policy["using"],
        policy.get("with_check")
    )
    print(sql)
""" 