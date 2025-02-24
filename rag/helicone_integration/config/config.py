import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Helicone Configuration
HELICONE_API_KEY = os.getenv("HELICONE_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# OpenAI Configuration
EMBEDDING_MODEL = "text-embedding-ada-002"
CHAT_MODEL = "gpt-3.5-turbo"

# Helicone Headers
HELICONE_AUTH_HEADER = {"Helicone-Auth": f"Bearer {HELICONE_API_KEY}"} 