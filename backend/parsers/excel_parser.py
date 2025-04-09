"""
Excel Parser Module

This module provides functionality to parse Excel files using multiple libraries:
- pandas: Efficient data reading, returning a DataFrame
- openpyxl: Fine control for complex cases

The main function is parse_excel(), which extracts data from Excel files
and returns it in a structured format.
"""

import os
import logging
from typing import Dict, List, Any, Union

# Import utility functions
from .utils import safe_parse, create_result_dict

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to import the required libraries
try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False
    logger.warning("pandas not available. Excel parsing will be limited.")

try:
    import openpyxl
    OPENPYXL_AVAILABLE = True
except ImportError:
    OPENPYXL_AVAILABLE = False
    logger.warning("openpyxl not available. Complex Excel parsing will be limited.")

def extract_data_with_pandas(file_path: str) -> Dict[str, Any]:
    """
    Extract data from an Excel file using pandas.
    
    Args:
        file_path (str): Path to the Excel file
        
    Returns:
        Dict[str, Any]: Dictionary with sheet names as keys and DataFrames as values
    """
    if not PANDAS_AVAILABLE:
        return {}
    
    try:
        # Read all sheets
        excel_file = pd.ExcelFile(file_path)
        sheet_names = excel_file.sheet_names
        
        result = {}
        for sheet_name in sheet_names:
            # Read sheet into DataFrame
            df = excel_file.parse(sheet_name)
            
            # Convert DataFrame to dict
            sheet_data = {
                "headers": df.columns.tolist(),
                "data": df.values.tolist()
            }
            
            result[sheet_name] = sheet_data
            
        return result
    except Exception as e:
        logger.error(f"Error extracting data with pandas: {str(e)}")
        return {}

def extract_data_with_openpyxl(file_path: str) -> Dict[str, Any]:
    """
    Extract data from an Excel file using openpyxl.
    
    Args:
        file_path (str): Path to the Excel file
        
    Returns:
        Dict[str, Any]: Dictionary with sheet names as keys and sheet data as values
    """
    if not OPENPYXL_AVAILABLE:
        return {}
    
    try:
        workbook = openpyxl.load_workbook(file_path, data_only=True)
        sheet_names = workbook.sheetnames
        
        result = {}
        for sheet_name in sheet_names:
            sheet = workbook[sheet_name]
            
            # Get header row (assume first row is header)
            headers = []
            for cell in sheet[1]:
                headers.append(str(cell.value) if cell.value is not None else "")
            
            # Get data rows
            data = []
            for row in sheet.iter_rows(min_row=2, values_only=True):
                data.append(list(row))
            
            result[sheet_name] = {
                "headers": headers,
                "data": data
            }
        
        return result
    except Exception as e:
        logger.error(f"Error extracting data with openpyxl: {str(e)}")
        return {}

def extract_metadata(file_path: str) -> Dict[str, Any]:
    """
    Extract metadata from an Excel file.
    
    Args:
        file_path (str): Path to the Excel file
        
    Returns:
        Dict[str, Any]: Metadata dictionary
    """
    metadata = {
        "filename": os.path.basename(file_path),
        "filesize": os.path.getsize(file_path)
    }
    
    # Try to get sheet names
    sheet_names = []
    
    if PANDAS_AVAILABLE:
        try:
            excel_file = pd.ExcelFile(file_path)
            sheet_names = excel_file.sheet_names
        except Exception:
            pass
    
    if not sheet_names and OPENPYXL_AVAILABLE:
        try:
            workbook = openpyxl.load_workbook(file_path, read_only=True)
            sheet_names = workbook.sheetnames
        except Exception:
            pass
    
    if sheet_names:
        metadata["sheet_names"] = sheet_names
        metadata["sheet_count"] = len(sheet_names)
    
    return metadata

def _parse_excel_internal(file_path: str) -> Dict[str, Any]:
    """
    Internal function to parse an Excel file.
    
    Args:
        file_path (str): Path to the Excel file
        
    Returns:
        Dict[str, Any]: Parsed content
    """
    # Extract metadata
    metadata = extract_metadata(file_path)
    
    # Try pandas first
    sheets_data = {}
    if PANDAS_AVAILABLE:
        try:
            sheets_data = extract_data_with_pandas(file_path)
        except Exception as e:
            logger.warning(f"Failed to parse Excel with pandas: {str(e)}")
    
    # If pandas failed or is not available, try openpyxl
    if not sheets_data and OPENPYXL_AVAILABLE:
        try:
            sheets_data = extract_data_with_openpyxl(file_path)
        except Exception as e:
            logger.warning(f"Failed to parse Excel with openpyxl: {str(e)}")
    
    # If both methods failed
    if not sheets_data:
        return create_result_dict(error="Failed to parse Excel file with available libraries.")
    
    # Prepare result
    result = {
        "metadata": metadata,
        "sheets": sheets_data
    }
    
    return result

def parse_excel(file_path: str) -> Dict[str, Any]:
    """
    Parse an Excel file and extract data and metadata.
    
    Args:
        file_path (str): Path to the Excel file
        
    Returns:
        Dict[str, Any]: A dictionary containing:
            - metadata (Dict[str, Any]): File metadata
            - sheets (Dict[str, Dict]): Sheet data
            - error (str): Error message (if any)
    """
    return safe_parse(_parse_excel_internal, file_path)

# Example usage
if __name__ == "__main__":
    import sys
    import json
    
    if len(sys.argv) < 2:
        print("Usage: python excel_parser.py <excel_file_path>")
        sys.exit(1)
        
    file_path = sys.argv[1]
    result = parse_excel(file_path)
    
    if "error" in result:
        print(f"Error: {result['error']}")
    else:
        print(f"Metadata: {result['metadata']}")
        print(f"Sheets: {', '.join(result['sheets'].keys())}")
        print(f"Full result saved to {file_path}.json")
        
        # Save full result to JSON file
        with open(f"{file_path}.json", "w") as f:
            json.dump(result, f, indent=2) 