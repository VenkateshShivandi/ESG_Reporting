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

# Import utility functions (Adjusted for new location)
from .utils import safe_parse, create_result_dict

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to import the required library
try:
    import pandas as pd
    import numpy as np
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
            result = chardet.detect(f.read(10000)) # Read up to 10KB
            encoding = result['encoding']
            # Validate encoding, fallback to utf-8 if invalid or None
            if not encoding or not hasattr(bytes(), 'decode'):
                logger.warning(f"Detected invalid encoding '{encoding}' or None for {os.path.basename(file_path)}. Falling back to utf-8.")
                return 'utf-8'
            try:
                # Test decoding a small sample
                bytes().decode(encoding)
                logger.info(f"Detected encoding: {encoding} for {os.path.basename(file_path)}")
                return encoding
            except LookupError:
                logger.warning(f"Detected unsupported encoding '{encoding}' for {os.path.basename(file_path)}. Falling back to utf-8.")
                return 'utf-8'
    except FileNotFoundError:
         logger.error(f"File not found during encoding detection: {file_path}")
         return 'utf-8' # Fallback if file disappears
    except Exception as e:
        logger.warning(f"Error detecting encoding for {os.path.basename(file_path)}: {str(e)}. Falling back to utf-8.")
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
            # Read a few lines to get a better sample
            sample_lines = [f.readline() for _ in range(5)] 
            sample = "".join(line for line in sample_lines if line) # Join lines with content
            
            if not sample:
                logger.warning(f"File {os.path.basename(file_path)} seems empty. Defaulting to ','.")
                return ','

            # Count potential delimiters
            delimiters = [',', ';', '\t', '|']
            counts = {d: sample.count(d) for d in delimiters}
            
            # Get the delimiter with the most occurrences (and more than 0)
            delimiter = ','
            max_count = 0
            for d, count in counts.items():
                if count > max_count:
                    max_count = count
                    delimiter = d
            
            if max_count == 0:
                logger.warning(f"Could not detect a common delimiter in {os.path.basename(file_path)}. Defaulting to ','.")
                return ','
                
            logger.info(f"Detected delimiter: '{delimiter}' for {os.path.basename(file_path)}")
            return delimiter
            
    except Exception as e:
        logger.warning(f"Error detecting delimiter: {str(e)}. Defaulting to ','.")
        return ','

def extract_data_with_pandas(file_path: str, encoding: str = 'utf-8', delimiter: str = ',') -> Dict[str, Any]:
    """
    Extract data from a CSV file using pandas.
    
    Args:
        file_path (str): Path to the CSV file
        encoding (str): File encoding
        delimiter (str): CSV delimiter
        
    Returns:
        Dict[str, Any]: Extracted data and metadata, or error dict
    """
    if not PANDAS_AVAILABLE:
        return create_result_dict(error="pandas is not available for CSV parsing.")
    
    try:
        # Read CSV file into DataFrame
        # Add options to handle potential issues like bad lines or quoting
        df = pd.read_csv(
             file_path, 
             encoding=encoding, 
             sep=delimiter, 
             na_filter=True, # Detect NA values
             low_memory=False, # Avoid mixed type warnings on large files
             on_bad_lines='warn' # Warn about bad lines instead of erroring out
         )
        
        # Extract column names
        columns = df.columns.tolist()
        
        # Extract data
        # Convert potential pandas specific types (like Timestamp) to standard types
        data = df.astype(object).where(pd.notnull(df), None).values.tolist()

        # Generate statistics for numerical columns
        stats = {}
        for column in df.select_dtypes(include=np.number).columns:
            col_data = df[column].dropna()
            if not col_data.empty:
                stats[str(column)] = {
                    "min": float(col_data.min()),
                    "max": float(col_data.max()),
                    "mean": float(col_data.mean()),
                    "median": float(col_data.median()),
                    "std": float(col_data.std())
                }
        
        result = {
            "columns": [str(c) for c in columns], # Ensure columns are strings
            "data": data,
            "shape": df.shape,
            "dtypes": {str(col): str(dtype) for col, dtype in df.dtypes.items()},
            "dataframe": df # Include DataFrame for cleaning step
        }
        
        if stats:
            result["statistics"] = stats
            
        return result
    except Exception as e:
        logger.error(f"Error extracting data with pandas from {os.path.basename(file_path)}: {str(e)}")
        return create_result_dict(error=f"Error parsing CSV file: {str(e)}")

def clean_and_transform_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Clean and transform the extracted data by handling missing values, duplicates, outliers,
    standardizing headers, and removing NA fields.
    
    This function performs the following transformations:
    1. Standardizes column names (lowercase, spaces to underscores)
    2. Handles missing values by dropping rows that are entirely empty
    3. Removes columns that are entirely NA
    4. Removes duplicate rows
    5. Handles outliers in numerical columns using IQR method
    
    Args:
        data (Dict[str, Any]): Dictionary with data extracted from CSV (must include 'dataframe')
        
    Returns:
        Dict[str, Any]: Cleaned and transformed data
    """
    if not PANDAS_AVAILABLE:
        logger.warning("Pandas not available. Skipping data cleaning and transformation.")
        return data
    
    # Expecting DataFrame from extraction step
    if "dataframe" not in data or not isinstance(data["dataframe"], pd.DataFrame):
         logger.warning("DataFrame not found in input data for cleaning. Skipping.")
         if "dataframe" in data: del data["dataframe"] # Remove if it's not a DataFrame
         return data

    df = data["dataframe"]
    
    try:
        # 1. Standardize column names
        df.columns = [str(col).lower().strip()
                      .replace(' ', '_')
                      .replace('-', '_')
                      .translate({ord(c): None for c in '!@#$%^&*()[]{};:,./<>?\\|`~=+'})  
                      for col in df.columns]
        standardized_columns = df.columns.tolist()
        
        # 2. Handle missing values
        df = df.replace('', np.nan).dropna(how='all')
        
        # 3. Remove columns that are entirely NA
        df = df.dropna(axis=1, how='all')
        standardized_columns = df.columns.tolist() # Update columns after potential removal

        # 4. Handle duplicates
        initial_row_count = len(df)
        df = df.drop_duplicates()
        if len(df) < initial_row_count:
            logger.info(f"Removed {initial_row_count - len(df)} duplicate rows from CSV")
        
        # 5. Handle outliers for numerical columns
        numerical_cols = df.select_dtypes(include=np.number).columns
        for col in numerical_cols:
            if df[col].count() > 10: # Check for sufficient data points
                 Q1 = df[col].quantile(0.25)
                 Q3 = df[col].quantile(0.75)
                 IQR = Q3 - Q1
                 lower_bound = Q1 - 1.5 * IQR
                 upper_bound = Q3 + 1.5 * IQR
                 outliers = df[(df[col] < lower_bound) | (df[col] > upper_bound)]
                 if not outliers.empty:
                     df.loc[outliers.index, col] = np.nan # Replace outliers with NaN
                     logger.info(f"Handled {len(outliers)} outliers in column '{col}'")
            
        # Store the cleaned data
        cleaned_data = {
            "columns": standardized_columns,
            "data": df.astype(object).where(pd.notnull(df), None).values.tolist(), # Convert back to list of lists
            # "dataframe": df, # Keep DataFrame ONLY if needed for further steps
            "shape": df.shape,
            "dtypes": {str(col): str(dtype) for col, dtype in df.dtypes.items()},
        }
        
        # Add back statistics if they existed
        if "statistics" in data:
             cleaned_data["statistics"] = data["statistics"] # Carry over original stats for now

        return cleaned_data
    except Exception as e:
        logger.error(f"Error in clean_and_transform_data: {str(e)}")
        if "dataframe" in data: del data["dataframe"] # Remove DataFrame before returning original data
        return data # Return original data if cleaning fails

def transform_numerical_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Transform numerical data in the extracted data to appropriate numeric types.
    This step is often integrated into cleaning or done after chunking.
    Here, we ensure the final 'data' list has standard python types.
    
    Args:
        data (Dict[str, Any]): Dictionary with data extracted from CSV
        
    Returns:
        Dict[str, Any]: Transformed data with standard types in the 'data' list
    """
    if not PANDAS_AVAILABLE or "data" not in data or not isinstance(data["data"], list):
        return data

    # Create a DataFrame temporarily to leverage pandas type conversion
    try:
        df = pd.DataFrame(data["data"], columns=data.get("columns"))
        for col in df.select_dtypes(include=np.number).columns:
             # Convert to numeric, coercing errors
             numeric_col = pd.to_numeric(df[col], errors='coerce')
             # Check if all are integers (ignoring NaN)
             is_integer = numeric_col.dropna().apply(lambda x: float(x).is_integer()).all()
             if is_integer:
                 df[col] = numeric_col.astype('Int64') # Use nullable integer
             else:
                 df[col] = numeric_col.astype('float') # Use float
                 
        # Convert DataFrame back to list of lists with standard types
        data["data"] = df.astype(object).where(pd.notnull(df), None).values.tolist()
        data["dtypes"] = {str(col): str(dtype) for col, dtype in df.dtypes.items()} # Update dtypes

    except Exception as e:
        logger.warning(f"Could not perform final numerical transformation: {e}")

    return data

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
        
        # Extract data using pandas
        extracted_data = extract_data_with_pandas(file_path, encoding, delimiter)
        
        # Check for extraction errors
        if "error" in extracted_data:
            return extracted_data
        
        # Add metadata
        metadata = {
            "filename": os.path.basename(file_path),
            "filesize": os.path.getsize(file_path),
            "encoding": encoding,
            "delimiter": delimiter
        }
        
        # Clean and transform the data
        cleaned_data = clean_and_transform_data(extracted_data) # Requires 'dataframe' key from extraction
        
        # Final numerical type transformation (optional, ensures standard types in final list)
        transformed_data = transform_numerical_data(cleaned_data)
        
        # Remove the DataFrame object before returning final result
        if "dataframe" in transformed_data:
            del transformed_data["dataframe"]
        
        # Prepare result
        result = {
            "metadata": {
                 **metadata,
                 "columns": transformed_data.get("columns", []), # Get columns from transformed data
                 "shape": transformed_data.get("shape"),
                 "dtypes": transformed_data.get("dtypes"),
                 "statistics": transformed_data.get("statistics")
             },
            "data": transformed_data.get("data", []) # Get data rows from transformed data
        }
        
        return result
    except Exception as e:
         logger.error(f"Unhandled error in _parse_csv_internal for {os.path.basename(file_path)}: {str(e)}")
         return create_result_dict(error=f"Error parsing CSV file: {str(e)}")

def parse_csv(file_path: str) -> Dict[str, Any]:
    """
    Parse a CSV file and extract data and metadata.
    
    Args:
        file_path (str): Path to the CSV file
        
    Returns:
        Dict[str, Any]: A dictionary containing:
            - metadata (Dict[str, Any]): File metadata (filename, size, encoding, delimiter, columns, shape, dtypes, stats)
            - data (List[List]): List of data rows
            - error (str): Error message (if any)
    """
    # Use safe_parse from utils to handle file existence, permissions, etc.
    return safe_parse(_parse_csv_internal, file_path)

# Example usage
if __name__ == "__main__":
    import sys
    import json # Import json for printing
        
    if len(sys.argv) < 2:
        print("Usage: python csv_parser.py <csv_file_path>")
        sys.exit(1)
        
    file_path = sys.argv[1]
    result = parse_csv(file_path)

    if "error" in result:
         print(f"Error: {result['error']}")
    else:
         # Pretty print the result
         print(json.dumps(result, indent=2, ensure_ascii=False)) 