# firebase_operations.py
import os
import firebase_admin
from firebase_admin import credentials, firestore, auth
from dotenv import load_dotenv

load_dotenv()

# Initialize Firebase using environment variables
cred = credentials.Certificate({
    "type": "service_account",
    "project_id": os.getenv('FIREBASE_PROJECT_ID'),
    "private_key_id": os.getenv('FIREBASE_PRIVATE_KEY_ID'),
    "private_key": os.getenv('FIREBASE_PRIVATE_KEY'),
    "client_email": os.getenv('FIREBASE_CLIENT_EMAIL'),
    "client_id": os.getenv('FIREBASE_CLIENT_ID'),
    "auth_uri": os.getenv('FIREBASE_AUTH_URI'),
    "token_uri": os.getenv('FIREBASE_TOKEN_URI'),
    "auth_provider_x509_cert_url": os.getenv('FIREBASE_AUTH_PROVIDER_X509_CERT_URL'),
    "client_x509_cert_url": os.getenv('FIREBASE_CLIENT_X509_CERT_URL')
})

if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

def store_user_auth(user_data):
    try:
        user = auth.create_user(
            email=user_data['email'],
            password=user_data['password'],
            display_name=user_data.get('display_name', '')
        )
        print(f"User created successfully: {user.uid}")
        return {"status": "success", "message": "User created successfully", "user_id": user.uid}
    except Exception as e:
        print(f"Error creating user: {str(e)}")
        return {"status": "error", "message": str(e)}

def get_user_profile(user_id):
    try:
        user = auth.get_user(user_id)
        profile_data = {
            "display_name": user.display_name,
            "email": user.email,
            "photo_url": user.photo_url
        }
        print(f"User profile retrieved for: {user_id}")
        return {"status": "success", "data": profile_data}
    except Exception as e:
        print(f"Error retrieving user profile: {str(e)}")
        return {"status": "error", "message": str(e)}

def update_user_profile(user_id, profile_data):
    try:
        auth.update_user(
            user_id,
            display_name=profile_data.get('display_name'),
            photo_url=profile_data.get('photo_url')
        )
        print(f"User profile updated for: {user_id}")
        return {"status": "success", "message": "Profile updated successfully"}
    except Exception as e:
        print(f"Error updating user profile: {str(e)}")
        return {"status": "error", "message": str(e)}

# Function configurations
store_user_auth_config = {
    "name": "store_user_auth",
    "description": "Stores a new user's authentication information in Firebase.",
    "parameters": {
        "type": "object",
        "properties": {
            "email": {"type": "string", "description": "User's email address"},
            "password": {"type": "string", "description": "User's password"},
            "display_name": {"type": "string", "description": "User's display name (optional)"}
        },
        "required": ["email", "password"]
    }
}

get_user_profile_config = {
    "name": "get_user_profile",
    "description": "Retrieves a user's profile information from Firebase.",
    "parameters": {
        "type": "object",
        "properties": {
            "user_id": {"type": "string", "description": "User's unique identifier"}
        },
        "required": ["user_id"]
    }
}

update_user_profile_config = {
    "name": "update_user_profile",
    "description": "Updates a user's profile information in Firebase.",
    "parameters": {
        "type": "object",
        "properties": {
            "user_id": {"type": "string", "description": "User's unique identifier"},
            "display_name": {"type": "string", "description": "User's new display name"},
            "photo_url": {"type": "string", "description": "URL of the user's new profile photo"}
        },
        "required": ["user_id"]
    }
}