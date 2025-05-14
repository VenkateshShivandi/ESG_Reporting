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
        data (Dict[str, Any]): Dictionary with data extracted from CSV
        
    Returns:
        Dict[str, Any]: Cleaned and transformed data
    """
    if not PANDAS_AVAILABLE:
        logger.warning("Pandas not available. Skipping data cleaning and transformation.")
        return data
    
    # Skip if no data or columns
    if not data.get("data") or not data.get("columns"):
        return data
    
    try:
        columns = data["columns"]
        rows = data["data"]
        
        # Convert to DataFrame for easier processing
        df = pd.DataFrame(rows, columns=columns)
        
        # 1. Standardize column names
        # Convert to lowercase, replace spaces with underscores, remove special characters
        df.columns = [str(col).lower().strip()
                      .replace(' ', '_')
                      .replace('-', '_')
                      .translate({ord(c): None for c in '!@#$%^&*()[]{};:,./<>?\\|`~=+'})  # Remove all special chars
                      for col in df.columns]
        
        standardized_columns = df.columns.tolist()
        
        # 2. Handle missing values
        # Replace empty strings with NaN for consistent handling
        df = df.replace('', np.nan)
        
        # Drop rows where all values are NaN
        df = df.dropna(how='all')
        
        # 3. Remove columns that are entirely NA
        df = df.dropna(axis=1, how='all')
        
        # Update columns after column removal
        standardized_columns = df.columns.tolist()
        
        # 4. Handle duplicates
        # Remove duplicate rows
        initial_row_count = len(df)
        df = df.drop_duplicates()
        if len(df) < initial_row_count:
            logger.info(f"Removed {initial_row_count - len(df)} duplicate rows from CSV")
        
        # 5. Handle outliers for numerical columns
        numerical_cols = df.select_dtypes(include=['number']).columns
        for col in numerical_cols:
            try:
                # Check if we have enough non-null values to calculate statistics
                if df[col].count() > 10:  # Arbitrary threshold, adjust as needed
                    # Calculate Q1, Q3 and IQR
                    Q1 = df[col].quantile(0.25)
                    Q3 = df[col].quantile(0.75)
                    IQR = Q3 - Q1
                    
                    # Define bounds for outliers
                    lower_bound = Q1 - 1.5 * IQR
                    upper_bound = Q3 + 1.5 * IQR
                    
                    # Count outliers
                    outliers_count = df[(df[col] < lower_bound) | (df[col] > upper_bound)][col].count()
                    
                    # Replace outliers with NaN
                    if outliers_count > 0:
                        df.loc[(df[col] < lower_bound) | (df[col] > upper_bound), col] = np.nan
                        logger.info(f"Handled {outliers_count} outliers in column '{col}'")
            except Exception as e:
                logger.warning(f"Failed to handle outliers in column '{col}': {str(e)}")
        
        # Store the cleaned data
        cleaned_data = {
            "columns": standardized_columns,
            "data": df.values.tolist(),
            "dataframe": df,  # Store DataFrame for further processing
            "shape": df.shape,
            "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
        }
        
        return cleaned_data
    except Exception as e:
        logger.error(f"Error in clean_and_transform_data: {str(e)}")
        return data

def transform_numerical_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Transform numerical data in the extracted data to appropriate numeric types.
    
    Args:
        data (Dict[str, Any]): Dictionary with data extracted from CSV
        
    Returns:
        Dict[str, Any]: Transformed data with proper numeric types
    """
    if not PANDAS_AVAILABLE:
        logger.warning("Pandas not available. Skipping numerical data transformation.")
        return data
    
    # Skip if no data or columns
    if not data.get("data") or not data.get("columns"):
        return data
    
    try:
        # If a DataFrame is already available, use it
        if "dataframe" in data:
            df = data["dataframe"]
        else:
            # Convert to DataFrame
            df = pd.DataFrame(data["data"], columns=data["columns"])
        
        # Identify numerical columns
        numerical_columns = []
        for col in df.columns:
            # Check if column contains numerical data
            if df[col].dropna().apply(lambda x: isinstance(x, (int, float))).all():
                numerical_columns.append(col)
        
        # Transform numerical columns
        for col in numerical_columns:
            try:
                # Check if values are integers or floats
                if df[col].dropna().apply(lambda x: float(x) == int(float(x))).all():
                    # All values are integers
                    df[col] = pd.to_numeric(df[col], errors='coerce').astype('Int64')
                else:
                    # Some values are floats
                    df[col] = pd.to_numeric(df[col], errors='coerce').astype('float')
                
                logger.info(f"Transformed column '{col}' to numeric type")
            except Exception as e:
                logger.warning(f"Failed to transform column '{col}': {str(e)}")
        
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
        
        # Prepare transformed data
        transformed_data = {
            "columns": df.columns.tolist(),
            "data": df.astype(object).where(pd.notnull(df), None).values.tolist(),
            "shape": df.shape,
            "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
        }
        
        if stats:
            transformed_data["statistics"] = stats
        
        return transformed_data
    except Exception as e:
        logger.error(f"Error in transform_numerical_data: {str(e)}")
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
        
        # Extract data
        extracted_data = extract_data_with_pandas(file_path, encoding, delimiter)
        
        # Add metadata
        metadata = {
            "filename": os.path.basename(file_path),
            "filesize": os.path.getsize(file_path),
            "encoding": encoding,
            "delimiter": delimiter
        }
        
        # If error occurred in data extraction
        if "error" in extracted_data:
            return extracted_data
        
        # Clean and transform the data
        cleaned_data = clean_and_transform_data(extracted_data)
        
        # Transform numerical data
        transformed_data = transform_numerical_data(cleaned_data)
        
        # Remove the DataFrame object before returning
        if "dataframe" in transformed_data:
            del transformed_data["dataframe"]
        
        # Prepare result
        result = {
            "metadata": {
                **metadata,
                "columns": transformed_data["columns"]
            },
            **transformed_data
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