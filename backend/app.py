from flask import Flask, render_template, request, jsonify, send_from_directory
import os
from dotenv import load_dotenv
from security import require_auth, require_role
from flask_cors import CORS, cross_origin
import uuid
from werkzeug.utils import secure_filename
from datetime import datetime
from supabase import create_client, Client
from openai import OpenAI
import time
import redis
# Load environment variables
load_dotenv('.env.local')

# Get Supabase credentials
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
OPENAI_ASSISTANT_ID = os.getenv('OPENAI_ASSISTANT_ID')
REDIS_URL = os.getenv('REDIS_URL')
# Initialize OpenAI client
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# Verify they exist
if not SUPABASE_URL or not SUPABASE_ANON_KEY or not SUPABASE_SERVICE_ROLE_KEY:
    raise ValueError("Missing Supabase credentials. Please check your .env file.")

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Configure logging
if not app.debug:
    import logging
    from logging.handlers import RotatingFileHandler
    
    # Ensure log directory exists
    os.makedirs('logs', exist_ok=True)
    
    # Set up file logging
    file_handler = RotatingFileHandler('logs/app.log', maxBytes=10240, backupCount=10)
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    ))
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)
    app.logger.setLevel(logging.INFO)
    app.logger.info('ESG Reporting API startup')

# Configure upload folder
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
    app.logger.info(f"Upload folder: {UPLOAD_FOLDER}")
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Initialize Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

@app.route('/')
def home():
    """Render the home page."""
    return render_template('index.html')


@app.route('/api/status')
def status():
    """Public endpoint to check API status."""
    return jsonify({
        "status": "operational",
        "api_version": "1.0.0"
    })


@app.route('/api/profile')
@require_auth
def user_profile():
    """Get the authenticated user's profile information."""
    # User data is added to request by the require_auth decorator
    return jsonify({
        "id": request.user['id'],
        "email": request.user['email'],
        "role": request.user['role'],
        "provider": request.user.get('app_metadata', {}).get('provider', 'email')
    })


@app.route('/api/esg-data')
@require_auth
def get_esg_data():
    """Get ESG data for the authenticated user's organization."""
    # In a real implementation, you would query your Supabase database here
    # Supabase RLS will automatically filter data based on the user's permissions
    
    # Mocked response for demonstration
    return jsonify({
        "esg_metrics": [
            {
                "id": "1",
                "category": "Environment",
                "name": "Carbon Emissions",
                "value": 25.4,
                "unit": "tons",
                "year": 2023,
                "quarter": "Q1"
            },
            {
                "id": "2",
                "category": "Social",
                "name": "Employee Diversity",
                "value": 78.3,
                "unit": "percent",
                "year": 2023,
                "quarter": "Q1"
            }
        ]
    })


@app.route('/api/admin/users')
@require_auth
@require_role(['admin'])
def get_all_users():
    """Admin endpoint to get all users (requires admin role)."""
    # In a real implementation, you would query your Supabase database
    # This is protected by the require_role decorator to ensure only admins can access
    
    return jsonify({
        "message": "This endpoint is protected and only accessible to admins"
    })

@app.route('/api/upload-file', methods=['POST'])
@cross_origin(origins=[os.getenv('FRONTEND_URL')])
def upload_file_to_supabase():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
            
        # Create a unique filename
        unique_filename = f"{uuid.uuid4()}_{secure_filename(file.filename)}"
        
        # Save file temporarily
        temp_path = os.path.join('/tmp', unique_filename)
        file.save(temp_path)
        
        # Upload to Supabase from the temp file
        with open(temp_path, 'rb') as f:
            response = supabase.storage.from_('documents').upload(unique_filename, f)
        
        # Clean up temp file
        os.remove(temp_path)
        
        return jsonify({'success': True, 'filename': unique_filename}), 200
    except Exception as e:
        app.logger.error(f"Error uploading file: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/files', methods=['GET'])
@require_auth
def get_files():
    """Get all files from Supabase storage."""
    try:
        response = supabase.storage.from_('documents').list()
        files = [{'id': item.name, 'name': item.name, 'size': item.metadata.size} for item in response]
        return jsonify(files), 200
    except Exception as e:
        app.logger.error(f"Error getting files: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/create-folder', methods=['POST'])
@require_auth
def create_folder():
    """Create a new folder in Supabase storage."""
    try:
        folder_name = request.json.get('folder_name')
        response = supabase.storage.from_('documents').create_folder(folder_name)
        return jsonify({'success': True}), 200
    except Exception as e:
        app.logger.error(f"Error creating folder: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/delete-folder', methods=['DELETE'])
@require_auth
def delete_folder():
    """Delete a folder from Supabase storage."""
    try:
        folder_name = request.json.get('folder_name')
        response = supabase.storage.from_('documents').remove([folder_name])
        return jsonify({'success': True}), 200
    except Exception as e:
        app.logger.error(f"Error deleting folder: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/files/<file_id>', methods=['DELETE'])
@require_auth
def delete_file(file_id):
    """Delete a file from Supabase storage."""
    try:
        response = supabase.storage.from_('documents').remove([file_id])
        return jsonify({'success': True}), 200
    except Exception as e:
        app.logger.error(f"Error deleting file: {str(e)}")
        return jsonify({'error': str(e)}), 500

def initialize_assistant():
    """Initialize the assistant."""
    try:
        # Initialize the assistant
        if(OPENAI_ASSISTANT_ID):
            return OPENAI_ASSISTANT_ID
        else:
            response = client.beta.assistants.create(
                name="ESG Reporting Assistant",
                instructions="You are a helpful assistant that can answer questions about the ESG data.",
            )
            return response.id
    except Exception as e:
        app.logger.error(f"Error initializing assistant: {str(e)}")
        return None

@app.route('/api/chat', methods=['POST'])
def chat():
    """Chat with the AI."""
    try:
        if(OPENAI_ASSISTANT_ID):
            assistant_id = OPENAI_ASSISTANT_ID
        else:
            assistant_id = initialize_assistant()
            if not assistant_id:
                return jsonify({'error': 'Failed to initialize assistant'}), 500
                
        # Get the user's message
        message = request.json.get('data', {}).get('content','')
        # Create or retrieve thread
        if(REDIS_URL):
            redis_client = redis.from_url(REDIS_URL)
            thread_id = redis_client.get('thread_id')
            if not thread_id:
                thread = client.beta.threads.create()
                thread_id = thread.id
                redis_client.set('thread_id', thread_id)
            else:
                # Convert bytes to string if needed
                thread_id = thread_id.decode('utf-8') if isinstance(thread_id, bytes) else thread_id
        else:
            thread = client.beta.threads.create()
            thread_id = thread.id
            
        # Add the user's message to the thread
        client.beta.threads.messages.create(
            thread_id=thread_id,  # Use thread_id instead of thread.id
            role="user", 
            content=message
        )
        
        # Run the assistant
        run = client.beta.threads.runs.create(
            thread_id=thread_id,  # Use thread_id instead of thread.id
            assistant_id=assistant_id
        )
        
        # Wait for the run to complete
        while run.status not in ["completed", "failed"]:
            time.sleep(0.5)
            run = client.beta.threads.runs.retrieve(
                thread_id=thread_id,  # Use thread_id instead of thread.id
                run_id=run.id
            )
            
        if run.status == "failed":
            return jsonify({'error': 'Assistant run failed'}), 500
            
        # Get the assistant's response
        messages = client.beta.threads.messages.list(thread_id=thread_id)
        
        # Get the latest assistant message (messages are returned in reverse chronological order)
        assistant_response = None
        for msg in messages.data:
            if msg.role == "assistant":
                for content_part in msg.content:
                    if content_part.type == 'text':
                        assistant_response = content_part.text.value
                        break
                if assistant_response:
                    break
        
        # Return the assistant's message
        if assistant_response:
            print("assistant_response: ", assistant_response)
            return jsonify({
                'id': str(uuid.uuid4()),
                'role': 'assistant',
                'content': assistant_response
            }), 200
        else:
            return jsonify({'error': 'No response from assistant'}), 500
            
    except Exception as e:
        app.logger.error(f"Error in chat endpoint: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5050)
