import importlib.util
import logging
import os
import requests

logger = logging.getLogger(__name__)


# Function to load tools from a file
def load_tools_from_directory(directory, tools_name=None):
  """
  This function will be used to load tools dynmically from a directory.
  Directory is the path to the directory containing the tools.
  tools_name is an array, this will be used to load all the tools that are available to a organisation
  """
  tool_data = {"tool_configs": [], "function_map": {}}
  """
  For now we will have the following structure
  If no tools_name is provided, it will load all the tools from the directory
  But we dont want that, if no tools_name is provided we will either given an error or will give an empty tools_data
  """
  if tools_name is not None:
    logger.info(f" /t We have selected tools_name \n {tools_name}")
    for name in tools_name:
      module_path = os.path.join(directory, name + '.py')
      spec = importlib.util.spec_from_file_location(name, module_path)
      module = importlib.util.module_from_spec(spec)
      spec.loader.exec_module(module)

      # Get the function from the module
      if hasattr(module, 'tool_config'):
        tool_data["tool_configs"].extend(module.tool_config)

      #Map Functions
      for attr in dir(module):
        attribute = getattr(module, attr)
        if callable(attribute) and not attr.startswith('__'):
          tool_data["function_map"][attr] = attribute

    return tool_data
  logger.info(' \t ALL TOOLS ARE BEING LOADED, tools_name was not given')
  for filename in os.listdir(directory):
    if filename.endswith('.py'):
      module_name = filename[:-3]
      module_path = os.path.join(directory, filename)
      spec = importlib.util.spec_from_file_location(module_name, module_path)
      module = importlib.util.module_from_spec(spec)
      spec.loader.exec_module(module)

      # Load tool configuration
      if hasattr(module, 'tool_config'):
        tool_data["tool_configs"].append(module.tool_config)

      # Map functions
      for attr in dir(module):
        attribute = getattr(module, attr)
        if callable(attribute) and not attr.startswith("__"):
          tool_data["function_map"][attr] = attribute

  return tool_data


# Checks if the Assistant JSON has all required fields
def is_valid_assistant_data(assistant_data):
  """
  Check if the assistant data contains valid values for all required keys.

  :param assistant_data: Dictionary containing assistant's data.
  :return: Boolean indicating whether the data is valid.
  """
  required_keys = ['tools', 'instructions', 'id', 'assistant_id', 'tools']
  return all(key in assistant_data and assistant_data[key]
             for key in required_keys)


def compare_assistant_data_hashes(current_data, saved_data):
  """
  Compare current assistant data with saved data.

  :param current_data: Current assistant data.
  :param saved_data: Saved assistant data from JSON file.
  :return: Boolean indicating whether the data matches.
  """
  if not is_valid_assistant_data(saved_data):
    return False

  return (current_data['instructions'] == saved_data['instructions']
          and current_data['id'] == saved_data['id']
          and current_data['assistant_id'] == saved_data['assistant_id']
          and current_data['tools'] == saved_data['tools'])
