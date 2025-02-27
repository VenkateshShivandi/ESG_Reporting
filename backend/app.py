from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
import os
from security import require_auth, require_role

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

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


if __name__ == '__main__':
    app.run(debug=True)
