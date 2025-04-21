import requests
import os

# --- Configuration ---
# Replace with the file you want to test
FILE_TO_UPLOAD = os.path.abspath("backend/test_files/sample1.csv") 
API_ENDPOINT = "http://localhost:6050/api/v1/process_document"

# --- Script Logic ---
def test_upload_and_process():
    """Sends a file to the process_document endpoint and prints the response."""
    
    if not os.path.exists(FILE_TO_UPLOAD):
        print(f"Error: Test file not found at {FILE_TO_UPLOAD}")
        return

    print(f"Attempting to upload and process: {os.path.basename(FILE_TO_UPLOAD)}")
    print(f"Target endpoint: {API_ENDPOINT}")

    try:
        # Open the file in binary read mode ('rb')
        with open(FILE_TO_UPLOAD, 'rb') as f:
            # Prepare the files dictionary for the multipart/form-data request
            # The key 'file' must match the expected field name in the Flask app
            files = {'file': (os.path.basename(FILE_TO_UPLOAD), f)}
            
            # Send the POST request
            response = requests.post(API_ENDPOINT, files=files)

            # Print the results
            print(f"\nStatus Code: {response.status_code}")
            try:
                response_json = response.json()
                print("Response JSON:")
                import json
                print(json.dumps(response_json, indent=2))
            except requests.exceptions.JSONDecodeError:
                print("Response Content (Not JSON):")
                print(response.text)

    except requests.exceptions.ConnectionError as e:
        print(f"\nConnection Error: Could not connect to {API_ENDPOINT}.")
        print("Please ensure the Flask server (python rag/app.py) is running.")
        print(f"Details: {e}")
    except Exception as e:
        print(f"\nAn unexpected error occurred: {e}")

if __name__ == "__main__":
    test_upload_and_process() 