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
    try:
         return os.path.getsize(file_path) == 0
    except FileNotFoundError:
         logger.warning(f"File not found when checking size: {file_path}")
         return True # Treat non-existent file as empty for parsing purposes
    except Exception as e:
         logger.error(f"Error getting file size for {file_path}: {e}")
         return True # Treat errors as potentially empty

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
             logger.error(f"File not found: {file_path}")
             return {"error": "File not found."}
        
        # Check if file is empty
        if is_file_empty(file_path):
             logger.warning(f"File is empty: {file_path}")
             return {"error": "File is empty."}
        
        # Parse the file
        logger.info(f"Attempting to parse: {os.path.basename(file_path)}")
        result = parse_func(file_path, *args, **kwargs)
        if isinstance(result, dict) and "error" in result:
            logger.error(f"Parsing function returned error for {os.path.basename(file_path)}: {result['error']}")
        else:
             logger.info(f"Successfully parsed (internally): {os.path.basename(file_path)}")
        return result

    except PermissionError:
        logger.error(f"Permission denied to access file: {file_path}")
        return {"error": "Permission denied to access file."}
    except FileNotFoundError:
         # Should be caught by check_file_exists, but handle defensively
         logger.error(f"File not found during parsing attempt: {file_path}")
         return {"error": "File not found during parsing."}
    except Exception as e:
        logger.exception(f"Unhandled error parsing file {file_path}: {str(e)}")
        return {"error": f"Unhandled error parsing file: {str(e)}"}
        
def create_result_dict(metadata=None, data=None, error=None, **kwargs):
    """
    Create a standardized result dictionary for parsing output.
    Allows arbitrary key-value pairs.
    
    Args:
        metadata (dict, optional): Metadata about the file. Defaults to None.
        data (any, optional): Extracted data (format depends on parser). Defaults to None.
        error (str, optional): Error message if parsing failed. Defaults to None.
        **kwargs: Additional key-value pairs to include.

    Returns:
        dict: Standardized result dictionary
    """
    result = {}
    
    if metadata is not None:
        result["metadata"] = metadata
    
    if data is not None:
        result["data"] = data
    
    if error is not None:
        result["error"] = error
        
    result.update(kwargs) # Add any other provided key-value pairs
    
    return result 