import os
import logging

# Set up logging
logger = logging.getLogger(__name__)

def create_directory(path: str) -> None:
    """Create directory if it doesn't exist."""
    os.makedirs(path, exist_ok=True)

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
        
def create_result_dict(metadata=None, text=None, tables=None, error=None):
    """
    Create a standardized result dictionary for parsing output.
    
    Args:
        metadata (dict, optional): Metadata about the file. Defaults to None.
        text (str, optional): Extracted text content. Defaults to None.
        tables (list, optional): Extracted tables. Defaults to None.
        error (str, optional): Error message if parsing failed. Defaults to None.
    
    Returns:
        dict: Standardized result dictionary
    """
    result = {}
    
    if metadata is not None:
        result["metadata"] = metadata
    
    if text is not None:
        result["text"] = text
    
    if tables is not None:
        result["tables"] = tables
    
    if error is not None:
        result["error"] = error
    
    return result 