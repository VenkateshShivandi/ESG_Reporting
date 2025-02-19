import os
import hashlib
import json
from openai import OpenAI
from dotenv import load_dotenv
from config import OPENAI_API_KEY
from backend.logger import get_logger
import tempfile
import time

# Load environment variables from .env file
load_dotenv()

# Get OpenAI API key from environment variable
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

logger = get_logger(__name__)

def hash_file(file_content, hash_algorithm='sha256'):
    hash_func = hashlib.new(hash_algorithm)
    hash_func.update(file_content.encode())
    return hash_func.hexdigest()

def read_instructions():
    try:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        root_dir = os.path.dirname(script_dir)
        instructions_path = os.path.join(root_dir, "instructions.txt")
        with open(instructions_path, "r") as file:
            return file.read()
    except FileNotFoundError:
        logger.warning(f"instructions.txt file not found at {instructions_path}. Using default instructions.")
        return "You are an AI career consultant. Provide personalized career advice based on user information."

def create_assistant(processed_files):
    logger.info("Creating assistant")
    try:
        assistant_name = "Career Consultant"
        assistant_filepath = f'./Assistants/{assistant_name}'
        os.makedirs(assistant_filepath, exist_ok=True)

        max_retries = 3
        retry_count = 0
        
        while retry_count < max_retries:
            try:
                # Check if assistant already exists
                if os.path.exists(f'{assistant_filepath}/{assistant_name}.json'):
                    with open(f'{assistant_filepath}/{assistant_name}.json', 'r') as file:
                        assistant_data = json.load(file)
                    
                    # Delete existing assistant and its files
                    try:
                        client.beta.assistants.delete(assistant_data['assistant_id'])
                        client.beta.vector_stores.delete(assistant_data['vector_id'])
                        for file_id in assistant_data['file_ids']:
                            client.files.delete(file_id)
                    except Exception as e:
                        logger.warning(f"Error cleaning up old assistant: {str(e)}")

                # Create new vector store and upload new files
                instructions = read_instructions()
                vector_store = client.beta.vector_stores.create(
                    name=f'Vector Store for {assistant_name}'
                )
                
                file_ids = []
                for file in processed_files:
                    # Create a temporary file with .pdf extension
                    with tempfile.NamedTemporaryFile(mode='w+b', suffix='.pdf', delete=False) as temp_file:
                        temp_file.write(file['content'].encode('utf-8'))
                        temp_file.flush()
                        
                        # Upload the temporary file
                        with open(temp_file.name, 'rb') as file_data:
                            openai_file = client.files.create(
                                file=file_data,
                                purpose='assistants'
                            )
                        file_ids.append(openai_file.id)
                        
                        # Add file to vector store
                        client.beta.vector_stores.files.create(
                            vector_store_id=vector_store.id,
                            file_id=openai_file.id
                        )
                    
                    # Remove the temporary file
                    os.unlink(temp_file.name)

                assistant = client.beta.assistants.create(
                    name=assistant_name,
                    instructions=instructions,
                    model="gpt-4o-mini",  # Updated model
                    tools=[{"type": "file_search"}],
                    tool_resources={"file_search": {"vector_store_ids": [vector_store.id]}}
                )
                
                # Save assistant data
                assistant_data = {
                    'assistant_id': assistant.id,
                    'vector_id': vector_store.id,
                    'file_ids': file_ids
                }
                with open(f'{assistant_filepath}/{assistant_name}.json', 'w') as file:
                    json.dump(assistant_data, file)

                logger.info(f"Assistant created successfully with ID: {assistant.id}")
                return assistant

            except Exception as e:
                logger.error(f"Attempt {retry_count + 1} failed: {str(e)}")
                retry_count += 1
                if retry_count < max_retries:
                    time.sleep(1)
                    continue
                raise
                
    except Exception as e:
        logger.error(f"Error creating assistant: {str(e)}")
        raise

def chat_with_assistant(assistant, user_input, generate_summary=False):
    logger.info(f"Generating AI response for input: {user_input}")
    try:
        thread = client.beta.threads.create()
        
        if generate_summary:
            client.beta.threads.messages.create(
                thread_id=thread.id,
                role="user",
                content=user_input  # This will be the summary_prompt
            )
        else:
            client.beta.threads.messages.create(
                thread_id=thread.id,
                role="user",
                content=user_input
            )
        
        run = client.beta.threads.runs.create(
            thread_id=thread.id,
            assistant_id=assistant.id
        )
        
        while run.status not in ["completed", "failed"]:
            run = client.beta.threads.runs.retrieve(thread_id=thread.id, run_id=run.id)
        
        if run.status == "failed":
            raise Exception(f"Run failed with error: {run.last_error}")
        
        messages = client.beta.threads.messages.list(thread_id=thread.id)
        response = messages.data[0].content[0].text.value
        
        logger.info("AI response generated successfully")
        return response
    except Exception as e:
        logger.error(f"OpenAI API error: {str(e)}")
        return f"Sorry, there was an issue generating the response: {str(e)}"

# This function can be called at the start of your main application
def initialize_assistant(processed_files):
    return create_assistant(processed_files)
