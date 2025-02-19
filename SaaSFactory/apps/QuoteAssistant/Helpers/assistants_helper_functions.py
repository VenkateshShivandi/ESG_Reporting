"""
This will be a bit complicated.
So the way we want to do it is we will have a folder named assistants.
Inside the assistants folder we will have multiple folders for organisations.
Organisations can have a bunch of assistants provided to them, given thier api key.
We will use their api key to access their organisation details for the folder selection.
This will help us make a robust system and will work for the betterment of the system.
"""

import hashlib
import json
import logging
import os
import openai
from Helpers.tools_helper_function import (
    compare_assistant_data_hashes,
    load_tools_from_directory,
)

logger = logging.getLogger(__name__)


# Get the instructions for the assistant
def get_assistant_instructions(path):

  # Open the file and read its contents
  with open(path, 'r') as file:
    return file.read()


def fetch_files_db():
  """
  This function is used to load the meta data of all the files we have created so far.
  """
  with open('./Assistants/files_meta/meta.json', 'r') as file:
    return json.load(file)
  return False


def hash_file(file_path, hash_algorithm='sha256'):
  """
  Generate a hash for a file.

  :param file_path: Path to the file to hash.
  :param hash_algorithm: Hash algorithm to use (default: 'sha256').
  :return: Hexadecimal hash of the file.
  """
  hash_func = hashlib.new(hash_algorithm)

  with open(file_path, 'rb') as file:
    while chunk := file.read(8192):
      hash_func.update(chunk)

  return hash_func.hexdigest()


def create_vector_files(dir_path, client, names, vector):

  # Creating Vector store will be removed in future versions and fetchin it from the function call
  #vector = client.beta.vector_stores.create(name=f'Vector Store for {names}')
  exist = fetch_files_db()
  ids_hash = []
  for file_name in os.listdir(dir_path):
    name = file_name.split('.')[0]
    if exist.get(name, 0):
      print("Is there in the meta")
      check = hash_file(f'{dir_path}/{file_name}')
      if check == exist[name]["hash"]:
        # This should not exist, remove
        # vector_store_file = client.beta.vector_stores.files.create(
        #     vector_store_id=vector.id, file_id=exist[name]["id"])
        print("hash is same")
        ids_hash.append(check)
        continue
      else:
        print("Have to delete this file from open ai and add the new file")
        delete_vector_store = client.beta.vector_stores.files.delete(
            vector_store_id=vector, file_id=exist[name]["id"])
        if delete_vector_store.deleted == True:
          client.files.delete(exist[name]["id"])
          file = client.files.create(file=open(f'{dir_path}/{file_name}',
                                               'rb'),
                                     purpose='assistants')
          vector_store_file = client.beta.vector_stores.files.create(
              vector_store_id=vector, file_id=file.id)
          ids_hash.append(check)
          exist[name]["id"] = file.id  # add file id
          exist[name]["hash"] = check
        # Delete file and update assistant
    else:
      fileobj = client.files.create(file=open(f'{dir_path}/{file_name}', 'rb'),
                                    purpose='assistants')
      print(fileobj)
      hash = hash_file(f'{dir_path}/{file_name}')
      ids_hash.append(hash)
      client.beta.vector_stores.files.create(vector_store_id=vector,
                                             file_id=fileobj.id)
      exist[name] = {"hash": hash, "id": fileobj.id}
    #print(str(open(f'{dir_path}/{file_name}', 'rb').read()))
  with open('./Assistants/files_meta/meta.json', 'w') as file:
    json.dump(exist, file, indent=3)
  return ids_hash


def compare_assistant_file_hashes(file_ids_old, file_ids_new):
  for id in file_ids_old:
    if id not in file_ids_new:
      return False
  return True


def create_assistants(client, api_key):
  """
  This function will be used to create an assistant on openai.
  If there already exists an assistat for the organisation, it will be used.
  If not, it will be created.

  For Development purpose we will have a hashsum to check if the assistant data has been changed.
  Once we are ready to deploy Changing the assistant data will be a bit more complicated.
  It should be done by calling api's for update and then the updated parts should be replaced.
  """
  org = api_key['organisation_id']
  assistant_name = api_key['assistant_id']
  assistant_filepath = f'./Assistants/{org}/{assistant_name}'
  assistant_tools = api_key['tools']
  assistant_knowledge = f'./Assistants/{org}/Knowledge_base'

  # We will first Create sha 256 hashsums for all the key elements
  current_id = api_key['assistant_id']
  # We will get tools data and convert that into a hashsum
  current_tools = hashlib.sha256(
      str(
          load_tools_from_directory(
              './tools',
              assistant_tools)['tool_configs']).encode()).hexdigest()
  current_instructions = ""
  # We will get the instructions and convert that into a hashsum
  with open(assistant_filepath + '/instructions.txt', 'r') as file:
    current_instructions = hashlib.sha256(file.read().encode()).hexdigest()
  # We will load the tools data if any
  current_tools_data = load_tools_from_directory('tools', assistant_tools)
  #logger.info(f" /t current_tools_data: {current_tools_data['tool_configs']}")
  if os.path.exists(assistant_filepath + f'/{assistant_name}.json'):

    # We will load the assistant and check if the assistant data has been changed.
    assistant_data = ""
    with open(assistant_filepath + f'/{assistant_name}.json', 'r') as file:
      assistant_data = json.load(file)
    logger.info(f" /t Assistant data loaded for \t\n{assistant_name}  \n\n")
    assistant_id = assistant_data['assistant_id']
    current_assistant_data = {
        'tools': current_tools,
        'instructions': current_instructions,
        'id': current_id,
        'assistant_id': assistant_id
    }
    vector_id = assistant_data['vector_id']
    file_ids = assistant_data['file_ids']
    #print(current_assistant_data)
    #print(assistant_data)
    # Checking if the assistant data has been changed
    # Note you cannot have tools in the checking faze, address to the tool is dynamically alloted so it will change always.
    stored_file_ids = create_vector_files(
        f'{assistant_knowledge}/{assistant_name}', client, assistant_name,
        vector_id)

    file_id_check = compare_assistant_file_hashes(file_ids, stored_file_ids)
    print(file_id_check)
    if compare_assistant_data_hashes(current_assistant_data,
                                     assistant_data) and file_id_check:

      return assistant_id
    else:
      logger.info(
          " /t Assistant data has been changed, Updating Assistant \n\n")
      file_ids = []
      #logger.info(current_tools)
      try:
        #Updating the Assistant
        """
        tools=[{
          "type": "function"
        }] + load_tools_from_directory('./tools',
                                     assistant_tools)["tool_configs"]
        """
        tools_final = current_tools_data['tool_configs']
        tools_final.append({'type': 'file_search'})
        assistant = client.beta.assistants.update(
            assistant_id=assistant_id,
            name=assistant_name,
            model='gpt-4o-mini',
            instructions=get_assistant_instructions(assistant_filepath +
                                                    '/instructions.txt'),
            tools=tools_final,
            temperature=0.2,
            tool_resources={"file_search": {
                "vector_store_ids": [vector_id]
            }})

        # Saving the assistant data
        assistant_data = {
            'tools': current_tools,
            'instructions': current_instructions,
            'id': current_id,
            'assistant_id': assistant_id,
            'vector_id': vector_id,
            'file_ids': stored_file_ids
        }

        try:
          with open(assistant_filepath + f'/{assistant_name}.json',
                    'w') as file:
            json.dump(assistant_data, file)
        except Exception as e:
          logger.error(f"Error saving the assistant data {e} \n\n")
          return None
      except Exception as e:
        logger.error(f"Error updating the assistant {e} \n\n")
        return None
      return assistant_id
  else:
    # Creating the assistant
    file_ids_hash = []
    """
    We have to create a vector database for the assistant.
    This will be the knowledge base inside the organisation 
    
    """
    # Creating a vector
    #print(client.beta.vector_stores.create(name="test_ main"))
    vector = None
    c = 1
    vector = client.beta.vector_stores.create(
          name=f'Vector Store for {assistant_name}')
    # name=f'Vector Store for {assistant_name}')
    if os.path.exists(f'{assistant_knowledge}/{assistant_name}'):
      file_ids_hash = create_vector_files(
          f'{assistant_knowledge}/{assistant_name}', client, assistant_name,
          vector.id)
      c -= 1
    """
    Tool Calls before, needs to change, cannot be added 
    
    tools=[{
        "type": "function"
    }] +
    load_tools_from_directory('./tools', assistant_tools)["tool_configs"],"""
    # Creating tools config with file search
    assistant = None
    tools_final = current_tools_data['tool_configs']
    """if not c:
      tools_final.append({'type': "file_search"})
      assistant = client.beta.assistants.create(
          name=assistant_name,
          instructions=get_assistant_instructions(assistant_filepath +
                                                  '/instructions.txt'),
          model='gpt-4o-mini',
          tools=tools_final,
          temperature=0.2,
          tool_resources={"file_search": {
              "vector_store_ids": [vector.id]
          }})
      print(tools_final)
else:"""
    tools_final.append({'type': "file_search"})
    print(tools_final)
    assistant = client.beta.assistants.create(
        name=assistant_name,
        instructions=get_assistant_instructions(assistant_filepath +
                                                '/instructions.txt'),
        model='gpt-4o-mini',
        tools=tools_final,
        temperature=0.2,
      tool_resources={"file_search": {
          "vector_store_ids": [vector.id]
      }})

    logger.info(f"Assistant created with id {assistant.id}")
    assistant_data = {
        'tools': current_tools,
        'instructions': current_instructions,
        'id': current_id,
        'assistant_id': assistant.id,
        'file_ids': file_ids_hash,
        'vector_id': vector.id
    }
    try:
      with open(assistant_filepath + f'/{assistant_name}.json', 'w') as file:
        json.dump(assistant_data, file)
    except Exception as e:
      logger.error(f"Error saving the assistant data {e}")
    # We will have to add resources to the assistant
    return assistant.id
