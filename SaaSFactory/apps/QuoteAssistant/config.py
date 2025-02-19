import os
import logging
from dotenv import load_dotenv, find_dotenv
import time

# Set up logging
log_filename = time.strftime("logfile_%Y-%m-%d_%H-%M-%S.log")

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Determine the environment
is_replit = 'REPL_ID' in os.environ
environment = 'replit' if is_replit else 'local'
logger.info(f"Detected environment: {environment}")

# Load environment variables
if environment == 'local':
    # Attempt to load the .env file
    dotenv_path = find_dotenv()
    if dotenv_path:
        logger.info(f"Found .env file at {dotenv_path}")
        load_dotenv(dotenv_path)
        logger.info("Loaded .env file")
    else:
        logger.warning("No .env file found. Ensure environment variables are set manually.")
else:
    logger.info("Running on Replit, using secrets for environment variables")

# Load API keys based on the environment
if environment == 'local':
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
    AIRTABLE_API_KEY = os.getenv('AIRTABLE_API_KEY')
    AIRTABLE_BASE_ID = os.getenv('AIRTABLE_BASE_ID')
else:
    # In Replit, environment variables (secrets) are directly accessible
    OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
    AIRTABLE_API_KEY = os.environ.get('AIRTABLE_API_KEY')
    AIRTABLE_BASE_ID = os.environ.get('AIRTABLE_BASE_ID')

# Add debug logging
logger.debug(f"Environment variables: {dict(os.environ)}")
logger.debug(f"AIRTABLE_API_KEY from env: {os.environ.get('AIRTABLE_API_KEY')}")
logger.debug(f"AIRTABLE_API_KEY after assignment: {AIRTABLE_API_KEY}")

# Validate that all required environment variables are loaded
missing_keys = []
if not OPENAI_API_KEY:
    missing_keys.append('OPENAI_API_KEY')
if not AIRTABLE_API_KEY:
    missing_keys.append('AIRTABLE_API_KEY')
if not AIRTABLE_BASE_ID:
    missing_keys.append('AIRTABLE_BASE_ID')

if missing_keys:
    logger.error(f"The following environment variables are missing: {', '.join(missing_keys)}")
    raise ValueError(f"Missing environment variables: {', '.join(missing_keys)}")

# Log (part of) the loaded values for debugging
logger.info(f"OpenAI API Key: {OPENAI_API_KEY[:5]}...{OPENAI_API_KEY[-5:] if OPENAI_API_KEY else ''}")
logger.info(f"Airtable API Key: {AIRTABLE_API_KEY[:5]}...{AIRTABLE_API_KEY[-5:] if AIRTABLE_API_KEY else ''}")
logger.info(f"Airtable Base ID: {AIRTABLE_BASE_ID}")

# Replace the existing debug logs with these:
logger.info(f"Full Airtable API Key: {AIRTABLE_API_KEY}")
logger.info(f"Full Airtable Base ID: {AIRTABLE_BASE_ID}")

# Add this after loading the environment variables
logger.info(f"Loaded Airtable API Key: {AIRTABLE_API_KEY}")

# Load Firebase configuration
FIREBASE_CONFIG = {
    "type": "service_account",
    "project_id": os.getenv('FIREBASE_PROJECT_ID'),
    "private_key_id": os.getenv('FIREBASE_PRIVATE_KEY_ID'),
    "private_key": os.getenv('FIREBASE_PRIVATE_KEY').replace('\\n', '\n'),
    "client_email": os.getenv('FIREBASE_CLIENT_EMAIL'),
    "client_id": os.getenv('FIREBASE_CLIENT_ID'),
    "auth_uri": os.getenv('FIREBASE_AUTH_URI'),
    "token_uri": os.getenv('FIREBASE_TOKEN_URI'),
    "auth_provider_x509_cert_url": os.getenv('FIREBASE_AUTH_PROVIDER_X509_CERT_URL'),
    "client_x509_cert_url": os.getenv('FIREBASE_CLIENT_X509_CERT_URL')
}