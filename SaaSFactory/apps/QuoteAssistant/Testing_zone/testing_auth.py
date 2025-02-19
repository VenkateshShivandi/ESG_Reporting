*import datetime
import os.path
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# if modifying these scops, delete the file token.json 
SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"]

creds = None
"""
The file token.json stores the user's access and refresh tokens, and os created automatically when the authorization flow completes for the first time 
"""

if os.path.exists("token.json"):
    creds = Credentials.from_authorized_user_file("token.json",SCOPES)

# If no token.json exists 
if not creds or not creds.valid:
    if creds and creds.expired and creds.refresh_tokes:
        creds.refresh(Request())
    else:
        flow = InstalledAppFlow.from_client_secrets_file("credentails.json", SCOPES)
        creds = flow.run_local_server(port=0)
    with open("token.json", "w") as token:
        token.write(creds.to_json())


try:
    service = build("calendar", "v3", credentials = creds)

    # Call to the calendar api 
    now = datetime.datetime.utcnow().isoformat() + "Z"
    print("Getting upcoming 10 events ")
    events_result = (service.events().list(calendarId = "primary", timeMin = now, maxResults = 10, singleEvents = True, orderBy="startTime").execute())
    events = events_result.get("items", [])

    if not events:
        print("No Upcoming Events found.")
    
    # Prints the start and name of the next 10 events 
    for event in events:
        start = event["start"].get("dateTime", event["start"].get("date"))
        print(start, event["summary"])
    
except HttpError as error:
    print(f'An error occurred: {error}')