from flask import Flask, render_template, request, jsonify, send_from_directory
from dotenv import load_dotenv
import os
from security import require_auth, require_role
from flask_cors import CORS, cross_origin
import uuid
from werkzeug.utils import secure_filename
from processors.pdf_processor import process_pdf
from processors.excel_processor import process_excel
from processors.docx_processor import process_docx
from processors.xml_processor import process_xml
from processors.csv_processor import process_csv
from datetime import datetime

# Load environment variables
load_dotenv()

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
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

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


@app.route('/api/process-file', methods=['POST'])
@cross_origin(origins=["http://localhost:3000"])
def process_file():
    app.logger.info(f"Request received: {request.method} {request.path}")
    app.logger.info(f"Request headers: {dict(request.headers)}")
    
    if 'file' not in request.files:
        app.logger.warning("No file part in request")
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    # Generate a unique filename
    original_filename = secure_filename(file.filename)
    file_extension = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else ''
    unique_filename = f"{uuid.uuid4().hex}.{file_extension}"
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
    
    # Save the file temporarily
    file.save(file_path)
    
    # Import parser modules dynamically to avoid circular imports
    from parsers import parse_file, parse_pdf, parse_excel, parse_docx, parse_pptx, parse_csv, parse_image, parse_xml
    
    # Process based on file type
    try:
        # Use the appropriate parser based on file extension
        if file_extension == 'pdf':
            result = parse_pdf(file_path)
        elif file_extension in ['xlsx', 'xls']:
            result = parse_excel(file_path)
        elif file_extension == 'docx':
            result = parse_docx(file_path)
        elif file_extension == 'pptx':
            result = parse_pptx(file_path)
        elif file_extension == 'csv':
            result = parse_csv(file_path)
        elif file_extension in ['jpg', 'jpeg', 'png']:
            result = parse_image(file_path)
        elif file_extension in ['xml', 'xhtml', 'svg', 'rss']:
            result = parse_xml(file_path)
        else:
            # Try the generic parser for other file types
            try:
                result = parse_file(file_path)
            except ValueError:
                return jsonify({'error': f'Unsupported file type: {file_extension}'}), 400
        
        # Check if there was an error during parsing
        if 'error' in result:
            return jsonify({'error': result['error']}), 400
            
        # Add file metadata to result if not already included
        if 'metadata' not in result:
            result['metadata'] = {}
            
        result['metadata']['filename'] = original_filename
        result['metadata']['size'] = os.path.getsize(file_path)
        
        return jsonify(result)
    except Exception as e:
        app.logger.error(f"Error processing file: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500
    finally:
        # Clean up the temporary file
        if os.path.exists(file_path):
            os.remove(file_path)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
