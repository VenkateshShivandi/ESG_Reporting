from flask import Flask, render_template, request, jsonify, send_from_directory, send_file
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
    
    # Remove existing log file if it exists
    log_file = 'logs/app.log'
    if os.path.exists(log_file):
        os.remove(log_file)
    
    # Set up file logging
    file_handler = logging.FileHandler(log_file)
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

@app.route('/api/list-tree', methods=['GET'])
@require_auth
def list_tree():
    """List files and folders in a directory."""
    try:
        path = request.args.get('path', '')
        app.logger.info(f"📞 API Call - list_tree: {path}")
        
        # Get files from Supabase storage for the given path
        response = supabase.storage.from_('documents').list(path=path)
        
        # Filter out .emptyFolderPlaceholder files and transform the response
        files = []
        for item in response:
            if not item['name'].endswith('.emptyFolderPlaceholder'):
                metadata = item.get('metadata', {}) or {}  # Handle None metadata
                files.append({
                    'id': item.get('id', ''),
                    'name': os.path.basename(item['name']),
                    'type': 'folder' if metadata.get('mimetype') == 'folder' else 'file',
                    'size': metadata.get('size', 0),
                    'modified': item.get('last_accessed_at'),
                    'path': path.split('/') if path else [],
                    'metadata': {
                        'mimetype': metadata.get('mimetype', 'application/octet-stream'),
                        'lastModified': metadata.get('lastModified'),
                        'contentLength': metadata.get('contentLength'),
                    },
                    'created_at': item.get('created_at'),
                    'updated_at': item.get('updated_at')
                })
        
        app.logger.info(f"📥 API Response: {files}")
        return jsonify(files), 200
    except Exception as e:
        app.logger.error(f"❌ API Error in list_tree: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/upload-file', methods=['POST'])
@require_auth
def upload_file():
    """Upload a file to a specific path."""
    try:
        app.logger.info("📞 API Call - upload_file")
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400
            
        file = request.files['file']
        path = request.form.get('path', '')
        
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
            
        # Use the original filename, just make it secure
        filename = secure_filename(file.filename)
        
        # Read the file data
        file_data = file.read()
        
        # Upload to Supabase with original filename
        file_path = os.path.join(path, filename) if path else filename
        response = supabase.storage.from_('documents').upload(
            file_path,
            file_data,
            file_options={"contentType": file.content_type}
        )
        
        app.logger.info(f"📥 API Response: {response}")
        
        # Return the file path as the ID since Supabase storage doesn't return an ID
        return jsonify({
            'fileId': file_path,
            'name': filename,
            'path': path.split('/') if path else []
        }), 200
    except Exception as e:
        app.logger.error(f"❌ API Error in upload_file: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/process-file', methods=['POST'])
@require_auth
def process_file():
    """Process a file and extract metadata."""
    try:
        app.logger.info("📞 API Call - process_file")
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400
            
        file = request.files['file']
        file_type = file.filename.split('.')[-1].lower()
        
        # Mock processing result based on file type
        result = {
            'type': file_type,
            'filename': file.filename,
            'size': file.content_length,
            'processed_at': datetime.now().isoformat()
        }
        
        # Add type-specific metadata
        if file_type == 'pdf':
            result.update({
                'pages': 10,  # You would actually count pages
                'metadata': {
                    'title': 'Sample PDF',
                    'author': 'ESG Reporter',
                    'creation_date': datetime.now().isoformat()
                }
            })
        elif file_type in ['xlsx', 'csv']:
            result.update({
                'rows': 100,  # You would actually count rows
                'columns': 5,  # You would actually count columns
                'column_names': ['Date', 'Metric', 'Value', 'Unit']
            })
            
        app.logger.info(f"📥 API Response: {result}")
        return jsonify(result)
    except Exception as e:
        app.logger.error(f"❌ API Error in process_file: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/create-folder', methods=['POST'])
@require_auth
def create_folder():
    """Create a new folder."""
    try:
        data = request.json
        name = data.get('name')
        path = data.get('path', '')
        
        app.logger.info(f"📞 API Call - create_folder: {name} in {path}")
        
        # Construct the folder path
        folder_path = os.path.join(path, name) if path else name
        # Create a placeholder file path
        placeholder_path = os.path.join(folder_path, '.folder')
            
        # Create a placeholder file with minimal content
        response = supabase.storage.from_('documents').upload(
            placeholder_path,
            'folder'.encode(),  # Convert string to bytes
            {"contentType": "application/x-directory"}
        )
        
        app.logger.info(f"📥 API Response: {response}")
        return jsonify({
            'folderId': folder_path,
            'name': name,
            'path': path.split('/') if path else [],
            'type': 'folder'
        }), 200
    except Exception as e:
        app.logger.error(f"❌ API Error in create_folder: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/files/<file_id>/download', methods=['GET'])
@require_auth
def get_download_url(file_id):
    """Get a download URL for a file."""
    try:
        app.logger.info(f"📞 API Call - get_download_url: {file_id}")
        
        # Generate signed URL from Supabase
        response = supabase.storage.from_('documents').create_signed_url(file_id, 3600)
        
        app.logger.info(f"📥 API Response: {response}")
        return jsonify({'url': response['signedURL']})
    except Exception as e:
        app.logger.error(f"❌ API Error in get_download_url: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/search-files', methods=['GET'])
@require_auth
def search_files():
    """Search for files."""
    try:
        query = request.args.get('query', '')
        file_type = request.args.get('type')
        path = request.args.get('path', '')
        
        app.logger.info(f"📞 API Call - search_files: {query}")
        
        # Implement search logic here using Supabase
        # This is a placeholder implementation
        response = supabase.storage.from_('documents').list(path=path)
        files = [file for file in response if query.lower() in file.name.lower()]
        
        app.logger.info(f"📥 API Response: {files}")
        return jsonify(files)
    except Exception as e:
        app.logger.error(f"❌ API Error in search_files: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/storage-quota', methods=['GET'])
@require_auth
def get_storage_quota():
    """Get storage quota information."""
    try:
        app.logger.info("📞 API Call - get_storage_quota")
        
        # Implement actual storage calculation here
        # This is a placeholder implementation
        quota = {
            'used': 1024 * 1024 * 500,  # 500MB
            'total': 1024 * 1024 * 1000,  # 1GB
            'percentage': 50
        }
        
        app.logger.info(f"📥 API Response: {quota}")
        return jsonify(quota)
    except Exception as e:
        app.logger.error(f"❌ API Error in get_storage_quota: {str(e)}")
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

@app.route('/api/delete', methods=['DELETE'])
@require_auth
def delete_item():
    """Delete a file or folder."""
    try:
        path = request.args.get('path', '')
        app.logger.info(f"📞 API Call - delete_item: {path}")
        
        if not path:
            return jsonify({'error': 'No path provided'}), 400
            
        # Check if path ends with a file extension to determine if it's a file
        if '.' in os.path.basename(path):
            # It's a file
            app.logger.info(f"🔺 Attempting to delete file: {path}")
            supabase.storage.from_('documents').remove([path])
            app.logger.info(f"🔺 Successfully deleted file: {path}")
        else:
            # It's a folder
            app.logger.info(f"🔺 Attempting to delete folder: {path}")
            try:
                contents = supabase.storage.from_('documents').list(path=path)
                # Delete all contents first
                for item in contents:
                    item_path = os.path.join(path, item['name'])
                    app.logger.info(f"🔺 Deleting folder content: {item_path}")
                    supabase.storage.from_('documents').remove([item_path])
                
                # Delete the folder placeholder
                folder_placeholder = os.path.join(path, '.folder')
                app.logger.info(f"🔺 Deleting folder placeholder: {folder_placeholder}")
                supabase.storage.from_('documents').remove([folder_placeholder])
            except Exception as folder_error:
                app.logger.error(f"❌ Failed to delete folder contents: {str(folder_error)}")
                raise folder_error
        
        app.logger.info(f"📥 API Response: Successfully deleted {path}")
        return jsonify({
            'success': True,
            'path': path
        }), 200
    except Exception as e:
        app.logger.error(f"❌ API Error in delete_item: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5050)
