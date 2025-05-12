# -*- coding: utf-8 -*-
"""Initializes and provides a Supabase client instance for the RAG service."""

import os
import logging
from supabase import create_client, Client
from dotenv import load_dotenv
from typing import Optional

logger = logging.getLogger(__name__)

# Load environment variables from .env file located in the RAG directory
# Assumes .env is in the same directory as this file or its parent (rag/)
dotenv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '.env.local')) # Look in rag/ first
if not os.path.exists(dotenv_path):
    # If not in rag/, check the parent directory (project root, where rag/ lives)
    # This provides flexibility if .env is placed at project root OR inside rag/
    dotenv_path_parent = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '.env'))
    if os.path.exists(dotenv_path_parent):
        dotenv_path = dotenv_path_parent
    else:
        # If neither exists, set path to None or default to trigger warning later
        dotenv_path = None 

# Check if .env exists before trying to load
if dotenv_path and os.path.exists(dotenv_path):
    load_dotenv(dotenv_path=dotenv_path)
    logger.info(f".env file loaded from: {dotenv_path}")
else:
    logger.warning(f".env file not found in rag/ or project root. Relying on system environment variables.")

# Get Supabase credentials from environment variables
supabase_url: str = os.environ.get("SUPABASE_URL")
supabase_key: str = os.environ.get("SUPABASE_ANON_KEY") # Using ANON key initially, consider SERVICE_ROLE key

# Initialize Supabase client variable
supabase: Client = None

try:
    if not supabase_url or not supabase_key:
        logger.error("Supabase URL or Key not found in environment variables. Cannot initialize client.")
        raise ValueError("Missing SUPABASE_URL or SUPABASE_KEY environment variables")
    else:
        # Initialize client without headers or options (schema will be specified per call)
        supabase = create_client(supabase_url, supabase_key)
        logger.info("Supabase client initialized successfully.") # Schema target will be logged per call
except Exception as e:
    logger.exception(f"Failed to initialize Supabase client: {e}")
    # Depending on the application's needs, you might want to exit or handle this differently.
    # For now, supabase will remain None if initialization fails.

def get_supabase_client() -> Optional[Client]:
    """Returns the initialized Supabase client instance."""
    if supabase is None:
        logger.error("Supabase client is not initialized. Check logs for initialization errors.")
    return supabase

# Example of how to use the client (can be removed later)
if __name__ == '__main__':
    client = get_supabase_client()
    if client:
        print("Successfully retrieved Supabase client instance.")
        # Example: Fetch tables (requires appropriate permissions)
        # try:
        #     res = client.table('documents').select('*', count='exact').limit(1).execute()
        #     print("Connection test successful. Fetched data (or empty list) from 'documents':")
        #     print(res)
        # except Exception as e:
        #     print(f"Error during connection test: {e}")
    else:
        print("Failed to retrieve Supabase client instance.") 