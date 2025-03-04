"""
Utility functions for file parsing
"""
import os
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_file_exists(file_path):
    """
    Check if a file exists and is accessible.
    
    Args:
        file_path (str): Path to the file
        
    Returns:
        bool: True if the file exists, False otherwise
    """
    return os.path.isfile(file_path) and os.access(file_path, os.R_OK)

def get_file_extension(file_path):
    """
    Get the extension of a file.
    
    Args:
        file_path (str): Path to the file
        
    Returns:
        str: File extension without the dot, in lowercase
    """
    _, ext = os.path.splitext(file_path)
    return ext.lower()[1:]  # Remove the dot and convert to lowercase

def is_file_empty(file_path):
    """
    Check if a file is empty.
    
    Args:
        file_path (str): Path to the file
        
    Returns:
        bool: True if the file is empty, False otherwise
    """
    return os.path.getsize(file_path) == 0

def safe_parse(parse_func, file_path, *args, **kwargs):
    """
    Safely parse a file, handling common errors.
    
    Args:
        parse_func (callable): Function to parse the file
        file_path (str): Path to the file
        *args, **kwargs: Additional arguments to pass to parse_func
        
    Returns:
        dict: Parsing result or error message
    """
    try:
        # Check if file exists
        if not check_file_exists(file_path):
            return {"error": "File not found."}
        
        # Check if file is empty
        if is_file_empty(file_path):
            return {"error": "File is empty."}
        
        # Parse the file
        return parse_func(file_path, *args, **kwargs)
    
    except PermissionError:
        return {"error": "Permission denied to access file."}
    except Exception as e:
        logger.exception(f"Error parsing file {file_path}: {str(e)}")
        return {"error": f"Error parsing file: {str(e)}"}
        
def create_result_dict(content_type="text", content=None, metadata=None, error=None):
    """
    Create a standardized result dictionary.
    
    Args:
        content_type (str): Type of content ('text', 'tables', etc.)
        content: The actual content
        metadata (dict): Additional metadata
        error (str): Error message, if any
        
    Returns:
        dict: Standardized result dictionary
    """
    result = {}
    
    if error:
        result["error"] = error
    else:
        if content is not None:
            result[content_type] = content
        if metadata:
            result["metadata"] = metadata
    
    return result 