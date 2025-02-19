import json
import logging
import os
import re
import time
import base64
from io import BytesIO
from dotenv import load_dotenv

import openai
import requests
from flask import Flask, jsonify, render_template, request, send_file, url_for, session, send_from_directory, redirect
from flask_cors import CORS
from flask_session import Session

from Helpers.assistants_helper_functions import create_assistants
from Helpers.generate_pdf import generate_quote_pdf
from Helpers.openai_helper_functions import (
    check_openai_version,
    create_thread,
    generate_text,
)
from Helpers.tools_helper_function import load_tools_from_directory
from tools.firebase_operations import (
    store_user_auth,
    get_user_profile,
    update_user_profile
)

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(filename=f'logs/Single_run_{int(time.time())}.log',
                    level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__, static_folder='templates', static_url_path='/')
CORS(app, supports_credentials=True, origins=["http://localhost:5174"], methods=["GET", "POST", "OPTIONS"], allow_headers=["Content-Type", "Authorization"])
app.config['SECRET_KEY'] = os.urandom(24)
app.config['SESSION_TYPE'] = 'filesystem'
Session(app)

# Check OpenAI version
logger.info("Checking OpenAI version")
check_openai_version()

# OpenAI API key
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    logger.error("OPENAI_API_KEY is not set in the environment variables")
    raise ValueError("OPENAI_API_KEY is not set in the environment variables")
openai.api_key = OPENAI_API_KEY
logger.info("OpenAI API key is set")

# Client metadata
client_meta = {
    'organisation_id': 'Process_Agent',
    'assistant_id': 'Quote Generator',
    'tools': ['airtable_operations']
}

# Load tools and create assistants
tools = load_tools_from_directory("./tools", client_meta['tools'])
assistant_id = create_assistants(openai, client_meta)
logger.info(f"Assistant created with ID: {assistant_id}")

# Airtable configuration
AIRTABLE_API_KEY = os.getenv("AIRTABLE_API_KEY")
AIRTABLE_BASE_ID = os.getenv("AIRTABLE_BASE_ID")
AIRTABLE_LEADS_TABLE_NAME = "Leads"  # You might want to add this to .env as well

def get_quote_data_from_airtable(lead_id):
    """
    Fetches the quote data from Airtable for a specific lead ID.
    """
    try:
        url = f"https://api.airtable.com/v0/{AIRTABLE_BASE_ID}/{AIRTABLE_LEADS_TABLE_NAME}/{lead_id}"
        headers = {
            "Authorization": f"Bearer {AIRTABLE_API_KEY}"
        }
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        record = response.json()
        quote_data = record['fields'].get('Quotes')

        if not quote_data:
            raise ValueError(f"No quote data found for lead ID {lead_id}")

        return json.loads(quote_data)
    except Exception as e:
        logger.error(f"Error fetching quote data: {e}")
        raise

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    result = store_user_auth(data)
    if result['status'] == 'success':
        session['user_id'] = result['user_id']
        return jsonify(result), 200
    else:
        return jsonify(result), 400

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        # Check if the request is sending JSON (for API logins)
        if request.is_json:
            data = request.get_json()  # Get JSON data
        else:
            # If it's not JSON, assume it's a form submission
            data = request.form

        # Get the user_id from the form or JSON
        user_id = data.get('user_id')

        # Assuming the user profile is retrieved successfully
        result = get_user_profile(user_id)

        # If the user profile exists, assume the login is successful
        if result['status'] == 'success':
            # Set the user_id in the session
            session['user_id'] = user_id
            return jsonify(result), 200  # Send success response
        else:
            # Send a 401 Unauthorized response if login fails
            return jsonify({"status": "error", "message": "Login failed"}), 401

    else:
        # Handle GET request, e.g., render a login form
        return render_template('login.html')



@app.route('/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    return jsonify({"status": "success", "message": "Logged out successfully"}), 200

@app.route('/profile', methods=['GET', 'PUT'])
def profile():
    if 'user_id' not in session:
        return jsonify({"status": "error", "message": "Not authenticated"}), 401

    if request.method == 'GET':
        result = get_user_profile(session['user_id'])
        return jsonify(result), 200 if result['status'] == 'success' else 400
    elif request.method == 'PUT':
        data = request.json
        result = update_user_profile(session['user_id'], data)
        return jsonify(result), 200 if result['status'] == 'success' else 400


@app.route('/start', methods=['GET'])
def start_conversation():
    logger.info(f"Session: {session}")
    if 'user_id' not in session:
        session['user_id'] = "test_user"
        logger.info("Temporary user set for testing")
        logger.error("User not authenticated")
        return jsonify({"error": "Not authenticated"}), 401
    
    logger.info(f"Starting a new conversation for user_id: {session['user_id']}")
    try:
        thread = create_thread(openai)
        logger.info(f"New thread created with ID: {thread.id}")
        return jsonify({"thread_id": thread.id})
    except Exception as e:
        logger.error(f"Error creating thread: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route('/chat', methods=['POST'])
def chat():
    logger.info("Entered chat function")

    data = request.json
    thread_id = data.get('thread_id')
    user_input = data.get('message', '')

    if not thread_id:
        logger.error("Error: Missing thread_id")
        return jsonify({"error": "Missing thread_id"}), 400

    messages = generate_text(openai, thread_id, user_input, assistant_id, tools)
    response = messages.data[0].content[0].text.value
    logger.info(f"Raw response from assistant: {response}")
    responses = {"response": response}

    # Check if the quote is ready for download
    if "QUOTE_READY_FOR_DOWNLOAD" in response:
        logger.info("Quote is ready for download")
        responses['quote_ready'] = True

        # Retrieve the latest quote data from the thread
        quote_data = get_latest_quote_data(thread_id)
        
        if quote_data:
            responses['quote_data'] = quote_data
            logger.info("Quote data included in response")
        else:
            logger.error("No quote data found for PDF generation")
            responses['quote_error'] = "No quote data found"

    logger.info(f"Final response being sent: {responses}")
    return jsonify(responses)

def get_latest_quote_data(thread_id):
    logger.info(f"Retrieving quote data for thread: {thread_id}")
    # Retrieve the last few messages from the thread
    messages = openai.beta.threads.messages.list(thread_id=thread_id, limit=10)
    
    for message in reversed(messages.data):
        content = message.content[0].text.value
        logger.info(f"Checking message: {content[:100]}...")  # Log first 100 chars of each message
        quote_match = re.search(r'QUOTE_DATA_START\s*(.*?)\s*QUOTE_DATA_END', content, re.DOTALL)
        if quote_match:
            try:
                quote_data = json.loads(quote_match.group(1))
                logger.info(f"Found quote data: {quote_data}")
                return quote_data
            except json.JSONDecodeError as e:
                logger.error(f"Error parsing quote data: {e}")
    
    logger.warning("No quote data found in thread history")
    return None

def format_quote_data(quote_data):
    items_html = "".join([
        f"<tr><td>{item['name']}</td><td>{item['quantity']}</td><td>${item['unit_price']}</td><td>${item['total']}</td></tr>"
        for item in quote_data.get('items', [])
    ])
    total = f"${quote_data.get('total', 0)}"
    summary = quote_data.get('summary', '')

    return f"""
    <div class="quote-container">
        <h2>Quote Details</h2>
        <h2>Customer Name: {quote_data.get('customer_name', '')}</h2>
        <h2>Company: {quote_data.get('company', '')}</h2>
        <table>
            <thead>
                <tr>
                    <th>Item Description</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                {items_html}
                <tr class="total-row">
                    <td colspan="3"><strong>Total</strong></td>
                    <td><strong>{total}</strong></td>
                </tr>
            </tbody>
        </table>
        <div class="summary">
            <p><strong>Summary:</strong> {summary}</p>
        </div>
    </div>
    """

@app.route('/generate-quote-pdf', methods=['POST'])
def handle_generate_quote_pdf():
    if 'user_id' not in session:
        return jsonify({"error": "Not authenticated"}), 401
    
    try:
        data = request.json
        quote_data = data.get('quote_data')
        if not quote_data:
            return jsonify({"error": "No quote data provided"}), 400

        # Generate PDF here
        pdf_data = generate_quote_pdf(quote_data)
        
        # Encode PDF data for transmission
        pdf_base64 = base64.b64encode(pdf_data).decode('utf-8')
        
        return jsonify({"pdf_data": pdf_base64})
    except Exception as e:
        logger.error(f"Error generating PDF: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/')
def serve():
    return send_from_directory(app.static_folder, 'index.html')

@app.errorhandler(404)
def not_found(e):
    return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)
