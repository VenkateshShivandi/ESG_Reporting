# bring in our LLAMA_CLOUD_API_KEY
import os
from dotenv import load_dotenv

load_dotenv('.env.local')

# bring in deps
from llama_cloud_services import LlamaParse
from llama_index.core import SimpleDirectoryReader
from llama_index.core import VectorStoreIndex

# Get API key from environment
api_key = os.getenv("LLAMA_API_KEY")
if not api_key:
    raise ValueError("LLAMA_API_KEY not found in .env.local file")

# Verify OPENAI_API_KEY is available
openai_api_key = os.getenv("OPENAI_API_KEY")
if not openai_api_key:
    raise ValueError("OPENAI_API_KEY not found in .env.local file")

# set up parser with API key
parser = LlamaParse(
    api_key=api_key,  # Add the API key here
    result_type="markdown"  # "markdown" and "text" are available
)

# use SimpleDirectoryReader to parse our file
file_extractor = {".pdf": parser}
documents = SimpleDirectoryReader(input_files=['test_files/esg1.pdf'], file_extractor=file_extractor).load_data()
print(documents)

# create index
index = VectorStoreIndex.from_documents(documents)

# query index
query_engine = index.as_query_engine()

# query the engine
query = "What is the document about?"
response = query_engine.query(query)
print(response)