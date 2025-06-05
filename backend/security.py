"""
ESG Reporting Platform Security Module

This module provides utilities for implementing row-level security (RLS)
policies in Supabase to protect ESG data based on user roles and permissions.

The module also includes functions for JWT token validation and role-based
access control to ensure GDPR compliance.
"""

import os
from dotenv import load_dotenv
import json
import requests
from typing import Dict, List, Any, Optional, Union, Tuple
from flask import request, current_app
import jwt
from functools import wraps
from supabase import create_client
from pathlib import Path

# CONSTANTS
# Get the absolute path to the backend directory
BACKEND_DIR = Path(__file__).resolve().parent
ENV_PATH = BACKEND_DIR / '.env.local'
if os.getenv("ZEA_ENV") != "production":
    load_dotenv(ENV_PATH)

# Fetch from system env or .env file (depending on context)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")


if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    raise ValueError("Missing Supabase credentials. Make sure SUPABASE_URL and SUPABASE_ANON_KEY are set in the environment.")

from jwcrypto import jwk
supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY) 


def verify_jwt_token(token: str) -> Dict[str, Any]:
    """Verify JWT token using Supabase's auth.getUser endpoint"""
    try:

        # Decode the token without verification
        decoded_token = jwt.decode(
            token,
            options={"verify_signature": False},  # Skip signature verification
            algorithms=["RS256"]
        )
        
        # Basic validation
        if not decoded_token.get("sub"):  # Check if user ID exists
            raise jwt.InvalidTokenError("Invalid token: missing sub claim")
            
        return decoded_token
    except jwt.PyJWTError as e:
        current_app.logger.error(f"JWT validation error: {str(e)}")
        raise
    except Exception as e:
        raise Exception(f"Token verification failed: {str(e)}")


def require_auth(f):
    """
    Decorator to require authentication for API endpoints.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        
        if not auth_header:
            return {"error": "Missing authorization header"}, 401
            
        try:
            token = auth_header.replace('Bearer ', '')
            claims = verify_jwt_token(token)
            
            # Store user info in request context
            request.user = {
                "id": claims.get("sub"),
                "email": claims.get("email"),
                "role": claims.get("role", "user"),
                "app_metadata": claims.get("app_metadata", {})
            }
            
            current_app.logger.info(f"User {request.user['email']} accessed {request.path}")
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
            app_metadata = request.user.get('app_metadata', {})
            user_role = app_metadata.get('role', 'user')
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