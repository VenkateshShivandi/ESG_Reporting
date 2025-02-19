import requests
import json
from config import AIRTABLE_API_KEY, AIRTABLE_BASE_ID, logger
import traceback

AIRTABLE_QUOTES_TABLE_NAME = "Quotes"
AIRTABLE_LEADS_TABLE_NAME = "Leads"

def airtable_request(method, table_name, data=None, record_id=None, params=None):
    base_url = f"https://api.airtable.com/v0/{AIRTABLE_BASE_ID}/{table_name}"
    url = f"{base_url}/{record_id}" if record_id else base_url
    headers = {
        "Authorization": f"Bearer {AIRTABLE_API_KEY}",
        "Content-Type": "application/json"
    }

    try:
        response = getattr(requests, method)(url, json=data, headers=headers, params=params)
        response.raise_for_status()
        logger.info(f"Airtable request successful: {response.status_code}, URL: {url}")
        return response.json()

    except requests.exceptions.HTTPError as http_err:
        # Log full response details to help diagnose 422 errors
        logger.error(f"HTTP error occurred: {http_err}")
        logger.error(f"Response content: {response.content}")
        raise

    except Exception as e:
        logger.error(f"Airtable request error: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise


def store_lead(full_name, phone, email, business):
    logger.info(f"Storing lead: {full_name}, {phone}, {email}, {business}")
    data = {
        "fields": {
            "Full Name": full_name,
            "Phone": phone,
            "Email": email,
            "Business": business
        }
    }
    try:
        response = airtable_request("post", AIRTABLE_LEADS_TABLE_NAME, data={"records": [data]})
        lead_id = response['records'][0]['id']
        logger.info(f"Lead stored with ID: {lead_id}")
        return lead_id
    except Exception as e:
        logger.error(f"Error storing lead: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise

def get_price_list():
    try:
        response = airtable_request("get", AIRTABLE_QUOTES_TABLE_NAME)
        logger.info("Price list retrieved successfully")
        return response
    except Exception as e:
        logger.error(f"Error retrieving price list: {str(e)}")
        raise

'''def update_lead_quote(lead_id, quote_data):
    data = {"fields": {"Quote": json.dumps(quote_data)}}
    try:
        logger.info(f"Updating quote for lead_id: {lead_id}")
        logger.info(f"Quote data: {json.dumps(quote_data, indent=2)}")
        
        data = {
            "fields": {
                "Quote": json.dumps(quote_data)
            }
        }
        
        response = airtable_request("patch", AIRTABLE_LEADS_TABLE_NAME, data=data, record_id=lead_id)
        logger.info(f"Quote updated successfully for lead ID: {lead_id}")
        return response
    except Exception as e:
        logger.error(f"Error updating lead quote: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise
'''

def update_lead_quote(lead_id, quote_data):
    """
    Updates the quote for a specific lead in Airtable and logs the quote data.
    """
    data = {"fields": {"Quotes": json.dumps(quote_data)}}
    try:
        # Log the quote data before sending the request
        logger.info(
            f"Attempting to update lead with ID: {lead_id} with the following quote data: {json.dumps(quote_data, indent=2)}"
        )

        # Perform the Airtable update request
        airtable_request("patch",
                         AIRTABLE_LEADS_TABLE_NAME,
                         data=data,
                         record_id=lead_id)

        # Log success and the provided quote data
        logger.info(f"Lead quote updated successfully for lead ID: {lead_id}")
        logger.info(f"Updated Quote Data: {json.dumps(quote_data, indent=2)}")
    except Exception as e:
        logger.error(f"Error updating lead quote: {e}")
        raise


def get_lead_quote(lead_id):
    try:
        response = airtable_request("get", AIRTABLE_LEADS_TABLE_NAME, record_id=lead_id)
        return response['fields'].get('Quote')
    except Exception as e:
        logger.error(f"Error getting lead quote: {str(e)}")
        raise

# Tool configurations for OpenAI function calling
tool_config = [
    {
        "type": "function",
        "function": {
            "name": "store_lead",
            "description": "Store a lead's information in Airtable",
            "parameters": {
                "type": "object",
                "properties": {
                    "full_name": {
                        "type": "string", 
                        "description": "Full name of the lead"
                        },
                    "phone": {
                        "type": "string", 
                        "description": "Phone number of the lead"
                        },
                    "email": {
                        "type": "string", 
                        "description": "Email address of the lead"
                        },
                    "business": {
                        "type": "string", 
                        "description": "Business name of the lead"
                    }
                },
                "required": ["full_name", "phone", "email", "business"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_price_list",
            "description": "Retrieves the price list from the Quotes table in Airtable.",
            "parameters": {}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_lead_quote",
            "description": "Updates the quote for a specific lead in Airtable.",
            "parameters": {
                "type": "object",
                "properties": {
                    "lead_id": {
                        "type": "string", 
                        "description": "The Airtable record ID of the lead"
                        },
                    "quote_data": {
                    "type":
                    "object",
                    "properties": {
                        "customer_name": {
                            "type": "string"
                        },
                        "company": {
                            "type": "string"
                        },
                        "items": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "name": {
                                        "type": "string"
                                    },
                                    "quantity": {
                                        "type": "number"
                                    },
                                    "unit_price": {
                                        "type": "number"
                                    },
                                    "total": {
                                        "type": "number"
                                    }
                                }
                            }
                        },
                        "total": {
                            "type": "number"
                        },
                        "summary": {
                            "type": "string"
                        }
                    },
                    "required":
                    ["customer_name", "company", "items", "total", "summary"]
                }
            },
            "required": ["lead_id", "quote_data"]
            }
        }
    }
]