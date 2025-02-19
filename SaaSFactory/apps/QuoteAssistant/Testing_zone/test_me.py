from Helpers.booking_helper_function import fetch_agent, fetch_agent_details
from Helpers.Google_Helper import create
#print(fetch_agent_details(1))
#print(fetch_agent('p1'))
import openai


OPEN_API_KEY = "sk-proj-0Y3xrPeMqRWRUUqdcpmBT3BlbkFJqOt0FrR9zJ0qIvx7cIMG"
client = openai.OpenAI(api_key=OPEN_API_KEY,
                       default_headers={"OpenAI-Beta": "assistants=v2"})
calendar_data = {
    "start": '2024-08-08T15:00:00',
    "end": '2024-08-08T16:00:00',
    "client_name": "atharva_calendar_test",
    "agent": "Jorge",
    "client_email": 'atharva@easybee.ai',
    "agent_email": 'atharva@easybee.ai',
    "location": "boston",
    "property": f'clubhouse at boston',
}
#print(create(calendar_data))

from Helpers.assistants_helper_functions import create_assistants, create_vector_files, fetch_files_db

print(fetch_files_db())
#vector = "vs_nhd6KmVJdffJylhIWTZKl6SD"
client_meta = {
    'organisation_id': 'Real_Estate',
    'assistant_id': 'Property_booking',
    'tools': ['property_functions']
}
# vector = client.beta.vector_stores.create(name="test")
# print(vector)
# create_vector_files('./Assistants/Real_Estate/Knowledge_base/Property_booking',
#                     client=client,
#                     names="Property_booking",
#                     vector=vector.id)
create_assistants(client, client_meta)
