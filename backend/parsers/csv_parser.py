"""
CSV Parser Module

This module provides functionality to parse CSV files using:
- pandas: Fast reading into a DataFrame

The main function is parse_csv(), which extracts data from CSV files
and returns it in a structured format.
"""

import os
import logging
import chardet
from typing import Dict, List, Any, Union

# Import utility functions
from .utils import safe_parse, create_result_dict

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to import the required library
try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False
    logger.warning("pandas not available. CSV parsing will be limited.")

def detect_encoding(file_path: str) -> str:
    """
    Detect the encoding of a CSV file.
    
    Args:
        file_path (str): Path to the CSV file
        
    Returns:
        str: Detected encoding or 'utf-8' as default
    """
    try:
        with open(file_path, 'rb') as f:
            result = chardet.detect(f.read(10000))
            return result['encoding'] or 'utf-8'
    except Exception as e:
        logger.warning(f"Error detecting encoding: {str(e)}")
        return 'utf-8'

def detect_delimiter(file_path: str, encoding: str) -> str:
    """
    Detect the delimiter used in a CSV file.
    
    Args:
        file_path (str): Path to the CSV file
        encoding (str): File encoding
        
    Returns:
        str: Detected delimiter or ',' as default
    """
    try:
        with open(file_path, 'r', encoding=encoding, errors='replace') as f:
            first_line = f.readline()
            
            # Count potential delimiters
            delimiters = [',', ';', '\t', '|']
            counts = {d: first_line.count(d) for d in delimiters}
            
            # Get the delimiter with the most occurrences
            max_count = 0
            delimiter = ','
            
            for d, count in counts.items():
                if count > max_count:
                    max_count = count
                    delimiter = d
            
            return delimiter
    except Exception as e:
        logger.warning(f"Error detecting delimiter: {str(e)}")
        return ','

def extract_data_with_pandas(file_path: str, encoding: str = 'utf-8', delimiter: str = ',') -> Dict[str, Any]:
    """
    Extract data from a CSV file using pandas.
    
    Args:
        file_path (str): Path to the CSV file
        encoding (str): File encoding
        delimiter (str): CSV delimiter
        
    Returns:
        Dict[str, Any]: Extracted data and metadata
    """
    if not PANDAS_AVAILABLE:
        return create_result_dict(error="pandas is not available for CSV parsing.")
    
    try:
        # Read CSV file into DataFrame
        df = pd.read_csv(file_path, encoding=encoding, sep=delimiter, na_filter=True)
        
        # Extract column names
        columns = df.columns.tolist()
        
        # Extract data
        data = df.values.tolist()
        
        # Generate statistics for numerical columns
        stats = {}
        for column in df.select_dtypes(include=['number']).columns:
            stats[column] = {
                "min": df[column].min(),
                "max": df[column].max(),
                "mean": df[column].mean(),
                "median": df[column].median(),
                "std": df[column].std()
            }
        
        result = {
            "columns": columns,
            "data": data,
            "shape": df.shape,
            "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
        }
        
        if stats:
            result["statistics"] = stats
            
        return result
    except Exception as e:
        logger.error(f"Error extracting data with pandas: {str(e)}")
        return create_result_dict(error=f"Error parsing CSV file: {str(e)}")

def _parse_csv_internal(file_path: str) -> Dict[str, Any]:
    """
    Internal function to parse a CSV file.
    
    Args:
        file_path (str): Path to the CSV file
        
    Returns:
        Dict[str, Any]: Parsed content
    """
    if not PANDAS_AVAILABLE:
        return create_result_dict(error="pandas is not available for CSV parsing.")
    
    try:
        # Detect encoding and delimiter
        encoding = detect_encoding(file_path)
        delimiter = detect_delimiter(file_path, encoding)
        
        # Extract data
        data = extract_data_with_pandas(file_path, encoding, delimiter)
        
        # Add metadata
        metadata = {
            "filename": os.path.basename(file_path),
            "filesize": os.path.getsize(file_path),
            "encoding": encoding,
            "delimiter": delimiter
        }
        
        # If error occurred in data extraction
        if "error" in data:
            return data
        
        # Prepare result
        result = {
            "metadata": metadata,
            **data
        }
        
        return result
    except Exception as e:
        return create_result_dict(error=f"Error parsing CSV file: {str(e)}")

def parse_csv(file_path: str) -> Dict[str, Any]:
    """
    Parse a CSV file and extract data and metadata.
    
    Args:
        file_path (str): Path to the CSV file
        
    Returns:
        Dict[str, Any]: A dictionary containing:
            - metadata (Dict[str, Any]): File metadata
            - columns (List[str]): Column names
            - data (List[List]): Row data
            - shape (Tuple[int, int]): DataFrame shape
            - dtypes (Dict[str, str]): Data types of columns
            - statistics (Dict): Statistics for numerical columns (if any)
            - error (str): Error message (if any)
    """
    return safe_parse(_parse_csv_internal, file_path)

# Example usage
if __name__ == "__main__":
    import sys
    import json
    
    if len(sys.argv) < 2:
        print("Usage: python csv_parser.py <csv_file_path>")
        sys.exit(1)
        
    file_path = sys.argv[1]
    result = parse_csv(file_path)
    
    if "error" in result:
        print(f"Error: {result['error']}")
    else:
        print(f"File: {result['metadata']['filename']}")
        print(f"Encoding: {result['metadata']['encoding']}")
        print(f"Delimiter: {result['metadata']['delimiter']}")
        print(f"Columns: {', '.join(result['columns'])}")
        print(f"Shape: {result['shape'][0]} rows x {result['shape'][1]} columns")
        
        if "statistics" in result:
            print("Statistics available for numerical columns")
            
        # Show a preview of the data (first 5 rows)
        preview_length = min(5, len(result["data"]))
        print(f"\nData Preview ({preview_length} rows):")
        for i in range(preview_length):
            print(result["data"][i])
            
        print(f"\nFull result saved to {file_path}.json")
        
        # Save full result to JSON file
        with open(f"{file_path}.json", "w") as f:
            # Convert any non-serializable objects to strings
            serializable_result = json.loads(
                pd.io.json.dumps(result)
            )
            json.dump(serializable_result, f, indent=2) 