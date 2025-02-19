import logging
import time
import json
import openai
from packaging import version

# Set up logging
logger = logging.getLogger(__name__)

prompt_log = logging.getLogger("Prompt_Tokens")
#prompt_log_handler = logging.FileHandler(f'prompt_tokens/{time.time()}.log')
#prompt_log.addHandler(prompt_log_handler)


def check_openai_version():
  """
  This function will be used to check the version of the openai library.
  Since we will be using v2 of assistants. we will need 1.35.0 or higher.
  Please Keep in mind all codes are made with keeping V2 of the library in mind.
  """
  requiered_version = version.parse("1.35.0")
  current_version = version.parse(openai.__version__)
  if current_version < requiered_version:
    raise ValueError(
        f'OpenAI version {current_version} is not supported. Please upgrade to {requiered_version}'
    )
  else:
    logger.info(f'OpenAI version {current_version} is supported \n\n')


def create_thread(client):
  """
  This function is used to create simplicity in code structure and remove cluters.
  """
  return client.beta.threads.create()


def generate_text(client, thread_id, user_input, assistant_id, tool_data):
  """
  This function is used to generate text using the openai library.
  """
  logger.info(f'Generating Text for  Assistant ID: {assistant_id} \n\n')
  # Lets start by creating a message in our thread
  message = client.beta.threads.messages.create(thread_id=thread_id,
                                                role="user",
                                                content=user_input)

  # Now we will create a run object

  run = client.beta.threads.runs.create_and_poll(thread_id=thread_id,
                                                 assistant_id=assistant_id)
  #logger.info(f'RUnnionfn \n\n\n\n {run}')

  status = ""
  # Now we wait for the response to be completed
  if run.status == "completed":
    logger.info(f'Run completed with status: {run.status} \n\n')
    return client.beta.threads.messages.list(thread_id=thread_id)

  if run.status == 'requires_action':
    while run.status == 'requires_action':
      tool_outputs = []

      logger.info(f'Run required_action with status: {run.status} \n')

      for tool in run.required_action.submit_tool_outputs.tool_calls:
        logger.info(
            f'Tool: {tool.function.name} \t arguments: {tool.function.arguments} \n'
        )
        arguments = json.loads(tool.function.arguments)
        if tool_data["function_map"].get(tool.function.name, 0):
          result = str(tool_data["function_map"][tool.function.name](**arguments))
          logger.info(f'Result: {result} \n\n')
          tool_outputs.append({"tool_call_id": tool.id, "output": result})
      if tool_outputs:
        try:
          run = client.beta.threads.runs.submit_tool_outputs_and_poll(
              thread_id=thread_id, run_id=run.id, tool_outputs=tool_outputs)
          logger.info(
              f'Run submitted_tools_outputs_and_pool with status: {run.status}'
          )
        except Exception as e:
          logger.error(f'Error submitting tools outputs: {e} \n\n')

    if run.status == 'completed':
      messages = client.beta.threads.messages.list(thread_id=thread_id)
      logger.info(f'Run completed with status: {run.status} \n\n')
      return messages
  #Assuming the status has changed to completed.
  messages = client.beta.threads.messages.list(thread_id=thread_id)
  logger.info(f"Run completed with status {run.status} \n\n")
  return messages
