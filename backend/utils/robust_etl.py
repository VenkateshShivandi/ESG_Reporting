"""
robust_etl.py  ·  v1.3  (April-30-2025)
========================================
Direct-file ETL helper for spreadsheet analytics (Excel/CSV).

• Header-row heuristic never returns NaN → avoids positional-index errors
• Duplicate-column names deduped (col, col_1, col_2 …)
• Faster object-column numeric coercion (skip pure-text cols)
• Donut payload keys fixed (name/value)
• Encoding + delimiter sniff detects mis-labelled TSVs
• Adds isTruncated flag when tableData hits MAX_JSON_ROWS
• Handles NaN values properly for JSON serialization
"""

from __future__ import annotations
import io, os, mimetypes, re
import pandas as pd
from chardet.universaldetector import UniversalDetector
import math
import numpy as np
import time
import hashlib
import json
from pathlib import Path
from flask import current_app # Import current_app to access logger
import logging
import csv # <<< Add import for csv module
from scipy.ndimage import label, find_objects # <<< Add scipy imports
import string # <<< Add import for string

# Set up a default logger for use outside of Flask context
default_logger = logging.getLogger('robust_etl')
handler = logging.StreamHandler()
handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
default_logger.addHandler(handler)
default_logger.setLevel(logging.INFO)

def get_logger():
    """Get the appropriate logger based on context"""
    try:
        return current_app.logger
    except RuntimeError:
        return default_logger

# Try to import polars for large files
try:
    import polars as pl
    HAS_POLARS = True
    get_logger().info("Polars is available for large file processing")
except ImportError:
    HAS_POLARS = False
    get_logger().info("Polars is not available, falling back to pandas for all file sizes")

# ─────────────────────────────────────────────────────────────────────────────
# CONSTANTS
# ─────────────────────────────────────────────────────────────────────────────
MEM_STREAM_THRESHOLD = 50 * 1024 * 1024  # 50 MB
POLARS_THRESHOLD = 500 * 1024 * 1024  # 500 MB
NUMERIC_UNIQUE_RATIO = 0.9
CATEGORICAL_MAX_UNIQUE = 50
MAX_JSON_ROWS = 1000  # Maximum rows to include in JSON response
ENABLE_CACHE = False  # Global toggle for caching
CACHE_DIR = "cache/etl"  # Relative to current directory
CACHE_EXPIRY = 60 * 60 * 24  # Cache expiry in seconds (24 hours)
FILE_SIZE_THRESHOLD = 100 * 1024 * 1024  # 100MB threshold for using polars

# --- Block Filtering Constants (NEW) ---
# Document rationale during tuning phase
MIN_BLOCK_ROWS = 2      # Minimum rows for a block to be considered a table
MIN_BLOCK_COLS = 2      # Minimum columns for a block to be considered a table
MIN_BLOCK_DENSITY = 0.3 # Minimum ratio of non-empty cells within block bounds

# ─────────────────────────────────────────────────────────────────────────────
# CACHING FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────

def _generate_cache_key(fp, original_filename, sample_nrows):
    """
    Generate a unique key for caching based on file content and parameters.
    
    Args:
        fp: File path or file-like object
        original_filename: Original filename
        sample_nrows: Number of rows to sample
        
    Returns:
        A string hash key for the cache
    """
    # For paths, use file path + mtime
    if isinstance(fp, str):
        try:
            stat = os.stat(fp)
            mtime = stat.st_mtime
            size = stat.st_size
            key_input = f"{fp}:{mtime}:{size}:{sample_nrows}:{original_filename}"
            return hashlib.md5(key_input.encode('utf-8')).hexdigest()
        except Exception as e:
            get_logger().warning(f"Failed to generate cache key from file path: {str(e)}")
            return None
            
    # For BytesIO, we can't reliably cache without reading the entire content
    # Only hash the first 16KB to get a reasonable approximation
    elif isinstance(fp, io.BytesIO):
        try:
            # Remember current position
            current_pos = fp.tell()
            # Seek to beginning and read up to 16KB for hash
            fp.seek(0)
            content_sample = fp.read(16 * 1024)
            # Restore position
            fp.seek(current_pos)
            
            # Use content hash + original filename + sample size
            key_input = f"{hashlib.md5(content_sample).hexdigest()}:{original_filename}:{sample_nrows}"
            return hashlib.md5(key_input.encode('utf-8')).hexdigest()
        except Exception as e:
            get_logger().warning(f"Failed to generate cache key from BytesIO: {str(e)}")
            return None
            
    return None

def _get_cached_result(cache_key):
    """
    Retrieve a cached ETL result if available and not expired.
    
    Args:
        cache_key: The cache key to look up
        
    Returns:
        The cached payload or None if not found or expired
    """
    if not ENABLE_CACHE or not cache_key:
        return None
        
    try:
        # Ensure cache directory exists
        cache_path = Path(CACHE_DIR)
        cache_file = cache_path / f"{cache_key}.json"
        
        if not cache_file.exists():
            return None
            
        # Check if cache is expired
        stat = os.stat(cache_file)
        if time.time() - stat.st_mtime > CACHE_EXPIRY:
            get_logger().info(f"Cache expired for key {cache_key}")
            return None
            
        # Load the cached result
        with open(cache_file, 'r', encoding='utf-8') as f:
            cached_data = json.load(f)
            get_logger().info(f"Loaded cached ETL result for key {cache_key}")
            return cached_data
    except Exception as e:
        get_logger().warning(f"Failed to load from cache: {str(e)}")
        return None

def _cache_result(cache_key, payload):
    """
    Save an ETL result to the cache.
    
    Args:
        cache_key: The cache key
        payload: The ETL result payload to cache
        
    Returns:
        Boolean indicating success or failure
    """
    if not ENABLE_CACHE or not cache_key:
        return False
        
    try:
        # Ensure cache directory exists
        cache_path = Path(CACHE_DIR)
        cache_path.mkdir(parents=True, exist_ok=True)
        
        cache_file = cache_path / f"{cache_key}.json"
        
        # Add timestamp to the cached data
        payload_with_meta = {
            **payload,
            "_cache_meta": {
                "timestamp": time.time(),
                "cache_key": cache_key
            }
        }
        
        # Write to the cache file
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump(payload_with_meta, f)
            
        get_logger().info(f"Cached ETL result with key {cache_key}")
        return True
    except Exception as e:
        get_logger().warning(f"Failed to write to cache: {str(e)}")
        return False

# ─────────────────────────────────────────────────────────────────────────────
# PUBLIC API - REFACTORED FOR MULTI-TABLE PROCESSING
# ─────────────────────────────────────────────────────────────────────────────
def etl_to_chart_payload(fp: str | io.BytesIO, *, original_filename: str | None = None) -> dict:
    """
    ETL pipeline converts various file types to a standardized payload,
    detecting and processing multiple tables within a single sheet/file.
    
    Args:
        fp: Path to the input file or BytesIO object.
        original_filename: Original filename with extension (for accurate type detection).
        
    Returns:
        Dict containing results for potentially multiple tables:
        {
            "tables": [ { "id": int, "range": str, "data": list, "meta": dict,
                          "stats": dict, "chartData": dict }, ... ],
            "tableCount": int,
            "fileMetadata": { "filename": str, "duration": float },
            "error": bool,
            "errorType": str | None,
            "message": str | None
        }
    """
    start_time = time.time()
    logger = get_logger()
    logger.info(f"Starting multi-table ETL process for: {original_filename or 'memory stream'}")

    # --- Caching Logic (Adapted) ---
    cache_key = _generate_cache_key(fp, original_filename, None)
    cached_result = _get_cached_result(cache_key)
    if cached_result:
        logger.info("Returning cached multi-table result.")
        cached_result.setdefault('fileMetadata', {}).setdefault('duration', time.time() - start_time)
        return cached_result
    # --- End Caching Logic ---

    # --- Prepare Response Structure ---
    final_result = {
        "tables": [],
        "tableCount": 0,
        "fileMetadata": {"filename": original_filename},
        "error": False,
        "errorType": None,
        "message": None
    }

    # Nested helper for cleaner error structure
    def create_error_payload(message: str, error_type: str = "general", details: str | dict = None) -> dict:
        duration = time.time() - start_time
        logger.error(f"ETL Error: Type={error_type}, Msg={message}, Details={details}")
        return {
            "tables": [],
            "tableCount": 0,
            "fileMetadata": {"filename": original_filename, "duration": duration},
            "error": True,
            "errorType": error_type,
            "message": message,
            "errorDetails": details
        }

    try:
        # 1. Load Raw Data
        logger.debug("Step 1: Loading raw dataframe...")
        df_raw = _load_dataframe(fp, original_filename)
        if df_raw is None:
             return create_error_payload("Failed to load raw data.", "load_error")
        logger.debug(f"Raw data loaded, shape: {df_raw.shape}")

        # 2. Find Potential Data Blocks
        logger.debug("Step 2: Finding data blocks...")
        initial_blocks = _find_data_blocks(df_raw)
        if not initial_blocks:
            logger.warning("No potential data blocks found in the raw data.")
            final_result['fileMetadata']['duration'] = time.time() - start_time
            final_result['message'] = "No data tables found after initial block detection."
            _cache_result(cache_key, final_result) # Cache even if no tables found
            return final_result

        # 3. Filter and Refine Blocks
        logger.debug("Step 3: Filtering and refining blocks...")
        validated_blocks = _filter_and_refine_blocks(initial_blocks)
        if not validated_blocks:
            logger.warning("No blocks remained after filtering and refinement.")
            final_result['fileMetadata']['duration'] = time.time() - start_time
            final_result['message'] = "No valid data tables found after filtering noise/irrelevant blocks."
            _cache_result(cache_key, final_result) # Cache even if no tables found
            return final_result

        # 4. Process Each Validated Block
        logger.debug(f"Step 4: Processing {len(validated_blocks)} validated blocks...")
        processed_tables_payload = []
        for i, block in enumerate(validated_blocks):
            table_id = i
            block_start_time = time.time()
            excel_range = "N/A" # Default range
            try:
                slice_obj = block['slice']
                excel_range = _slice_to_excel_range(slice_obj)
                logger.info(f"--- Processing Table Block {table_id} (Label: {block['label']}, Range: {excel_range}) ---")

                block_data = block['data']
                header_idx = block['header_idx']
                logger.debug(f"Block {table_id}: Header Index Relative to Block = {header_idx}")

                # 4a. Construct Final DataFrame
                logger.debug(f"Block {table_id}: Constructing table DataFrame...")
                if header_idx >= len(block_data):
                    raise ValueError(f"Header index {header_idx} is out of bounds for block data with length {len(block_data)}")
                
                header_row = block_data.iloc[header_idx]
                data_values = block_data.values[header_idx+1:]
                if data_values.size == 0: 
                     table_df = pd.DataFrame(columns=header_row)
                elif data_values.ndim == 1:
                     table_df = pd.DataFrame(data_values.reshape(1, -1), columns=header_row)
                else:
                     table_df = pd.DataFrame(data_values, columns=header_row)
                     
                table_df = table_df.reset_index(drop=True)

                # Check emptiness *after* DataFrame creation
                if table_df.empty and header_idx == len(block_data) - 1:
                    logger.warning(f"Block {table_id}: Constructed DataFrame is empty (only header row found). Skipping.")
                    continue
                logger.debug(f"Block {table_id}: Constructed shape: {table_df.shape}")

                # 4b. Clean Table DataFrame
                logger.debug(f"Block {table_id}: Cleaning...")
                table_df = _clean_dataframe(table_df)
                if table_df.empty:
                    logger.warning(f"Block {table_id}: DataFrame became empty after cleaning. Skipping.")
                    continue
                logger.debug(f"Block {table_id}: Cleaned shape: {table_df.shape}")

                # 4c. Classify Columns
                logger.debug(f"Block {table_id}: Classifying columns...")
                column_types = _classify_columns(table_df)

                # 4d. Build Chart Payloads
                logger.debug(f"Block {table_id}: Building chart payloads...")
                chart_data = _build_chart_payloads(table_df, column_types)

                # 4e. Calculate Stats
                logger.debug(f"Block {table_id}: Calculating stats...")
                is_truncated = len(table_df) > MAX_JSON_ROWS
                table_data_json = table_df.head(MAX_JSON_ROWS).to_dict(orient="records")
                stats = {
                    "rowCount": len(table_df),
                    "columnCount": len(table_df.columns),
                    "processingTime": time.time() - block_start_time,
                    "isTruncated": is_truncated,
                    "displayedRows": len(table_data_json)
                }

                # 4f. Assemble Payload
                table_payload = {
                    "id": table_id,
                    "range": excel_range,
                    "data": _nan_to_none(table_data_json), 
                    "meta": {
                        "columns": table_df.columns.tolist(),
                        "numericalColumns": column_types.get("numericalColumns", []),
                        "categoricalColumns": column_types.get("categoricalColumns", []),
                        "dateColumns": column_types.get("dateColumns", []),
                        "yearColumns": column_types.get("yearColumns", []),
                        "excelRange": excel_range
                    },
                    "stats": stats,
                    "chartData": chart_data,
                    "tableData": {
                        "headers": table_df.columns.tolist(),
                        "rows": _nan_to_none(table_df.head(MAX_JSON_ROWS).to_dict(orient='records'))
                    },
                    "processingStatus": "success"
                }
                processed_tables_payload.append(table_payload)
                logger.info(f"--- Finished Processing Table Block {table_id} --- Success --- Duration: {stats['processingTime']:.2f}s")

            # THIS except block needs to be aligned with the try block above
            except Exception as block_error: 
                logger.error(
                    f"--- Error Processing Table Block {table_id} (Label: {block.get('label', 'N/A')}, Range: {excel_range}) ---",
                    exc_info=True
                )
                continue  # Continue to next block

        # 5. Finalize Response
        logger.debug("Step 5: Finalizing response...")
        final_result["tables"] = processed_tables_payload
        final_result["tableCount"] = len(processed_tables_payload)
        if not processed_tables_payload and validated_blocks: # Check if we had blocks but they all failed
            final_result["message"] = "Found potential tables, but errors occurred during processing for all of them."
            logger.warning(final_result["message"])
        elif not processed_tables_payload: # No blocks passed validation
             final_result["message"] = "No valid data tables found."
             logger.warning(final_result["message"])
        else:
             final_result["message"] = f"Successfully processed {final_result['tableCount']} table(s)."
             logger.info(final_result["message"])

        final_result["fileMetadata"]["duration"] = time.time() - start_time

        # Cache the successful result (even if no tables were processed)
        _cache_result(cache_key, final_result)

        return final_result
        
    except Exception as e:
        # Catch-all for unexpected errors in the main orchestration
        return create_error_payload("ETL pipeline failed unexpectedly.", "pipeline_error", details=f"{type(e).__name__}: {str(e)}")

# ─────────────────────────────────────────────────────────────────────────────
# 1  EXTRACT
# ─────────────────────────────────────────────────────────────────────────────
def _load_dataframe(fp: str | io.BytesIO, original_filename: str | None = None) -> pd.DataFrame | None:
    """
    Load a DataFrame from various file types. Reads raw data first for potential
    multi-block detection before applying header detection.
    
    Args:
        fp: File path or BytesIO object
        original_filename: Original filename with extension (for type detection)
        
    Returns:
        pandas DataFrame with header correctly applied, or None if loading fails.
        NOTE: This function is now intended to return a SINGLE processed DataFrame,
              assuming the calling context (etl_to_chart_payload) will handle
              block detection using the raw data *before* calling this refinement.
              This function's primary role is now header application.
              HOWEVER, for now, let's make it return the *raw* df for block detection.
              *** TEMPORARY CHANGE: Will return df_raw for now ***
        
    Raises:
        FileNotFoundError: If file path does not exist
        pd.errors.EmptyDataError: If file is empty
        pd.errors.ParserError: If file format is invalid or cannot be parsed
    """
    logger = get_logger()
    file_type = 'unknown'
    ext = ''
    # MAX_ROWS_FOR_HEURISTIC = 25 # No longer needed here as we read full raw data first

    try:
        # Determine file type and extension
        if isinstance(fp, io.BytesIO):
            ext = _infer_extension(fp, original_filename)
            if ext == '.xlsx': file_type = 'excel'
            elif ext in ['.csv', '.txt']: file_type = 'csv'
            else: file_type = 'unknown'
            fp.seek(0)
        elif isinstance(fp, str):
            if not os.path.exists(fp):
                raise FileNotFoundError(f"File not found: {fp}")
            if os.path.getsize(fp) == 0:
                raise pd.errors.EmptyDataError("File is empty")
            ext = os.path.splitext(fp)[1].lower()
            if ext == '.xlsx': file_type = 'excel'
            elif ext in ['.csv', '.txt']: file_type = 'csv'
            else: file_type = 'unknown'

        logger.info(f"Loading dataframe (raw). Type: {file_type}, Ext: {ext}")

        # --- Load RAW data first (header=None) --- 
        df_raw = None
        if file_type == 'excel':
            excel_file = None
            try:
                excel_file = pd.ExcelFile(fp)
                sheet_names = excel_file.sheet_names
                logger.debug(f"Excel file opened. Sheets: {sheet_names}")
                
                target_sheet_name = None
                # Find the first sheet with *any* potential content for raw read
                for sheet_name in sheet_names:
                    try:
                        # Quick check if sheet has *any* data before full raw read
                        df_peek = excel_file.parse(sheet_name=sheet_name, header=None, nrows=5)
                        if not df_peek.empty and not df_peek.isna().all().all():
                            target_sheet_name = sheet_name
                            logger.info(f"Selected sheet '{target_sheet_name}' for raw processing.")
                            break 
                        else:
                            logger.debug(f"Skipping empty/all-NaN sheet for raw read: '{sheet_name}'")
                    except Exception as sheet_err:
                        logger.warning(f"Could not peek sheet '{sheet_name}': {sheet_err}")
                        continue
                        
                if not target_sheet_name:
                    logger.error("No suitable sheet found for raw data extraction.")
                    raise pd.errors.ParserError("Excel file contains no sheets with data.")

                # Read the full selected sheet RAW
                logger.debug(f"Reading full sheet '{target_sheet_name}' raw (header=None)")
                df_raw = excel_file.parse(
                    sheet_name=target_sheet_name, 
                    header=None, 
                    keep_default_na=False, 
                    na_values=['']
                )
                
            # Correctly placed finally block
            finally:
                if excel_file: 
                    try:
                        excel_file.close()
                    except Exception:
                        logger.warning("Exception ignored during excel_file.close()")
                        pass # Ignore errors during close
                        
        elif file_type == 'csv':
            if isinstance(fp, io.BytesIO): fp.seek(0)
            encoding = _detect_encoding(fp)
            delimiter = _detect_delimiter(fp, encoding)
            logger.debug(f"CSV Params: encoding='{encoding}', delimiter='{repr(delimiter)}'")
            
            # Read full file RAW
            logger.debug("Reading full CSV raw (header=None)")
            if isinstance(fp, io.BytesIO): fp.seek(0)
            # Use _read_csv for consistency checks, but force header=None initially
            df_raw = _read_csv(
                fp, 
                encoding=encoding, 
                sep=delimiter, 
                header=None, 
                keep_default_na=False, 
                na_values=['']
            )
            
        else:
            logger.error(f"Cannot load raw data: Unsupported type '{ext}'")
            raise pd.errors.ParserError(f"Unsupported file type: {ext}")

        # --- Basic Validation of Raw Data ---
        if df_raw is None or df_raw.empty:
             logger.error("Raw data loading resulted in None or empty DataFrame.")
             raise pd.errors.ParserError("Failed to load raw data from file.")
        
        logger.info(f"Successfully loaded raw data, shape: {df_raw.shape}")

        # *** TEMPORARY RETURN FOR BLOCK PROCESSING ***
        # The main ETL function will now use this df_raw to find blocks.
        # A separate function will later apply header detection to individual blocks.
        return df_raw
        # *** END TEMPORARY RETURN ***

        # --- OLD LOGIC (Commented out for now) ---
        # # Find the header index using the heuristic on the raw data head
        # header_idx = _find_real_header_index(df_raw.head(MAX_ROWS_FOR_HEURISTIC)) # Run heuristic on raw head
        # logger.debug(f"Applying header index {header_idx} based on raw data heuristic.")
        
        # # Construct final DataFrame with header applied
        # final_df = pd.DataFrame(df_raw.values[header_idx+1:], columns=df_raw.iloc[header_idx])
        # final_df = final_df.reset_index(drop=True)
        # logger.info(f"Applied header, final DataFrame shape for this block: {final_df.shape}")
        # return final_df
        # --- END OLD LOGIC ---

    except (FileNotFoundError, pd.errors.EmptyDataError, pd.errors.ParserError) as e:
        logger.error(f"Caught known error in _load_dataframe: {type(e).__name__}: {str(e)}")
        raise # Re-raise specific known errors
    except Exception as e:
        logger.error(f"Unexpected error in _load_dataframe: {type(e).__name__}: {str(e)}", exc_info=True)
        raise pd.errors.ParserError(f"Failed to load dataframe due to unexpected error: {str(e)}")

def _read_csv(fp, encoding='utf-8', **kwargs) -> pd.DataFrame:
    """
    Read a CSV file with robust error handling, including checks for inconsistent columns.
    
    Args:
        fp: File path or BytesIO object
        encoding: File encoding to use
        **kwargs: Additional arguments for pd.read_csv
        
    Returns:
        pandas DataFrame
        
    Raises:
        pd.errors.EmptyDataError: If file is empty
        pd.errors.ParserError: If file format is invalid or contains bad lines
    """
    logger = get_logger()
    logger.info(f"Attempting to read CSV with encoding: {encoding}")
    
    delimiter = kwargs.get('sep', ',') # Get delimiter, default to comma
    
    try:
        # First check if the file content is empty
        lines_for_check = []
        if isinstance(fp, io.BytesIO):
            original_pos = fp.tell()
            fp.seek(0)
            # Read first few lines for consistency check
            for _ in range(5):
                line = fp.readline()
                if not line: break
                lines_for_check.append(line.decode(encoding, errors='ignore'))
            fp.seek(original_pos)
            
            if not lines_for_check or all(not line.strip() for line in lines_for_check):
                logger.warning("Empty content detected in BytesIO")
                raise pd.errors.EmptyDataError("CSV file is empty")
        else: # File path
             with open(fp, 'r', encoding=encoding, errors='ignore') as f_check:
                 for _ in range(5):
                     line = f_check.readline()
                     if not line: break
                     lines_for_check.append(line)
             if not lines_for_check or all(not line.strip() for line in lines_for_check):
                logger.warning(f"Empty content detected in file: {fp}")
                raise pd.errors.EmptyDataError("CSV file is empty")

        # Attempt to read CSV
        try:
            logger.debug("Attempting to read CSV with strict error checking")
            if isinstance(fp, io.BytesIO):
                fp.seek(0)  # Reset position
            df = pd.read_csv(fp, encoding=encoding, on_bad_lines='error', sep=delimiter, **kwargs)
        except Exception as e:
            logger.warning(f"Initial CSV read failed: {type(e).__name__}: {str(e)}")
            if isinstance(fp, io.BytesIO):
                fp.seek(0)
            if "inconsistent" in str(e).lower() or "expected" in str(e).lower() or "bad line" in str(e).lower():
                logger.error(f"Detected inconsistent CSV structure during initial read: {str(e)}")
                raise pd.errors.ParserError(f"Inconsistent columns in CSV: {str(e)}")
            raise # Re-raise other errors
            
        # Check if the dataframe is empty but the content wasn't
        if df.empty:
             logger.warning("CSV resulted in empty DataFrame despite having content")
             raise pd.errors.ParserError("CSV resulted in an empty DataFrame, possibly due to format issues.")
                
        # *** Explicit check for column consistency ***
        if lines_for_check:
            # Find the expected number of columns based on the first data line (heuristic)
            # Assumes first line might be header, check second line if possible
            check_line_index = 1 if len(lines_for_check) > 1 else 0
            if check_line_index < len(lines_for_check):
                expected_cols = lines_for_check[check_line_index].count(delimiter) + 1
                actual_cols = df.shape[1]
                logger.debug(f"Consistency Check: Expected cols (line {check_line_index+1}) = {expected_cols}, Actual cols (pandas) = {actual_cols}")
                # Allow some flexibility if pandas inferred fewer columns than header might suggest
                # But raise error if pandas found MORE columns than expected, or if data lines are inconsistent
                if actual_cols != expected_cols:
                     # Double check against another line if available
                     if len(lines_for_check) > 2 and check_line_index + 1 < len(lines_for_check):
                         next_expected_cols = lines_for_check[check_line_index + 1].count(delimiter) + 1
                         if next_expected_cols != expected_cols:
                             logger.error(f"Detected inconsistent column count between data lines ({expected_cols} vs {next_expected_cols})")
                             raise pd.errors.ParserError("Inconsistent number of columns found in CSV data lines.")
                     # If lines are consistent but pandas differs, raise error
                     logger.error(f"Pandas column count ({actual_cols}) differs from expected count ({expected_cols}) based on delimiter.")
                     raise pd.errors.ParserError("Inconsistent column count between header/data and parsed result.")

        logger.info(f"Successfully read CSV, shape: {df.shape}")
        return df
        
    except pd.errors.EmptyDataError as e:
        logger.warning(f"EmptyDataError reading CSV: {str(e)}")
        raise  # Re-raise specific error
    except pd.errors.ParserError as e:
        logger.error(f"ParserError reading CSV: {str(e)}")
        raise pd.errors.ParserError(f"Failed to parse CSV: {str(e)}")
    except ValueError as e:
        logger.error(f"ValueError reading CSV: {str(e)}")
        raise pd.errors.ParserError(f"Invalid value found during CSV parsing: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error reading CSV: {type(e).__name__}: {str(e)}", exc_info=True)
        raise pd.errors.ParserError(f"Unexpected error reading CSV file: {str(e)}")

def _read_excel_with_polars(fp, ext):
    """
    Read Excel file using Polars for better performance with large files.
    """
    try:
        # Handle BytesIO by writing to temp file first
        if isinstance(fp, io.BytesIO):
            temp = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
            temp.write(fp.read())
            temp.close()
            get_logger().debug(f"Wrote temporary file for Polars Excel reading: {temp.name}")
            
            # Get sheet names first
            sheet_names = pl.read_excel_schema(temp.name)
            get_logger().debug(f"Polars detected sheets: {sheet_names}")
            
            # Read each sheet
            dfs = []
            for sheet_name in sheet_names:
                sheet_df = pl.read_excel(temp.name, sheet_name=sheet_name).to_pandas()
                sheet_df['sheetName'] = sheet_name
                dfs.append(sheet_df)
            get_logger().info(f"Loaded and concatenated {len(dfs)} Excel sheets with Polars")
            return pd.concat(dfs, ignore_index=True)
    except Exception as e:
        get_logger().error(f"Error reading Excel with Polars: {str(e)}")
        raise
    finally:
        # Clean up temp file if it was created
        if 'temp' in locals() and os.path.exists(temp.name):
            os.unlink(temp.name)

# ─────────────────────────────────────────────────────────────────────────────
# BLOCK DETECTION (NEW)
# ─────────────────────────────────────────────────────────────────────────────
def _find_data_blocks(df_raw: pd.DataFrame) -> list[dict]:
    """
    Identifies contiguous blocks of non-empty cells in a raw DataFrame.

    Args:
        df_raw: DataFrame loaded with header=None and keep_default_na=False.

    Returns:
        List of dictionaries, each representing a potential data block:
        [{'label': int, 'slice': tuple[slice, slice], 'data': pd.DataFrame}, ...]
    """
    logger = get_logger()
    if df_raw.empty:
        logger.warning("_find_data_blocks received an empty DataFrame.")
        return []

    # Create a boolean mask where True indicates a cell with content
    non_empty_mask = df_raw.notna() & (df_raw != '')
    logger.debug(f"Created non-empty mask with shape {non_empty_mask.shape}")

    # Label connected components (islands) of non-empty cells
    # Structure defines connectivity (adjacent cells, including diagonals if needed)
    # Default structure considers orthogonal neighbors (connectivity=1)
    labeled_array, num_features = label(non_empty_mask)
    logger.info(f"Found {num_features} potential data blocks using connected components.")

    if num_features == 0:
        return []

    # Find the bounding boxes (slices) for each labeled feature
    slices = find_objects(labeled_array)
    
    blocks = []
    for i, slice_obj in enumerate(slices):
        if slice_obj is None: # Should not happen if num_features > 0, but check anyway
            continue
        
        label_id = i + 1 # find_objects returns slices indexed by label_id - 1
        # Extract the data for this block using the slice
        block_data = df_raw.iloc[slice_obj].copy() # Use .copy()!
        
        # Basic check: ensure extracted block isn't unexpectedly empty
        if block_data.empty:
             logger.warning(f"Skipping empty block extracted for label {label_id} at slice {slice_obj}")
             continue

        blocks.append({
            'label': label_id,
            'slice': slice_obj, # tuple of slice objects (rows, columns)
            'data': block_data
        })
        logger.debug(f"Extracted block {label_id} with shape {block_data.shape} at slice {slice_obj}")

    logger.info(f"Extracted {len(blocks)} raw data blocks.")
    return blocks

# ─────────────────────────────────────────────────────────────────────────────
# BLOCK FILTERING & REFINEMENT (NEW)
# ─────────────────────────────────────────────────────────────────────────────
def _filter_and_refine_blocks(blocks: list[dict]) -> list[dict]:
    """
    Filters raw blocks based on size, density, and header quality.
    Adds the detected header index to valid blocks.

    Args:
        blocks: List of block dictionaries from _find_data_blocks.

    Returns:
        List of validated block dictionaries, including 'header_idx'.
    """
    logger = get_logger()
    validated_blocks = []

    # Define MIN constants here if not global, or ensure they are accessible
    MIN_BLOCK_ROWS = 2
    MIN_BLOCK_COLS = 2
    MIN_BLOCK_DENSITY = 0.3

    for block in blocks:
        label = block['label']
        slice_obj = block['slice']
        block_data = block['data']
        rows, cols = block_data.shape
        # Create a user-friendly slice representation for logging
        slice_repr = f"rows {slice_obj[0].start}:{slice_obj[0].stop}, cols {slice_obj[1].start}:{slice_obj[1].stop}"

        # 1. Filter by Size
        if rows < MIN_BLOCK_ROWS or cols < MIN_BLOCK_COLS:
            logger.info(
                f"Block {label} discarded: Size ({rows}x{cols}) below threshold "
                f"({MIN_BLOCK_ROWS}x{MIN_BLOCK_COLS}). Slice: {slice_repr}"
            )
            continue

        # 2. Filter by Density
        # Use notna() as we load with keep_default_na=False, na_values=['']
        # Empty strings are considered content, only actual NaNs are counted as empty
        non_empty_count = block_data.notna().sum().sum()
        total_cells = rows * cols
        density = non_empty_count / total_cells if total_cells > 0 else 0
        if density < MIN_BLOCK_DENSITY:
            logger.info(
                f"Block {label} discarded: Density ({density:.2f}) below threshold "
                f"({MIN_BLOCK_DENSITY}). Slice: {slice_repr}"
            )
            continue

        # 3. Header Detection & Quality Check
        try:
            # Note: _find_real_header_index works on relative row indices within the block_data
            header_idx = _find_real_header_index(block_data)

            # Basic Quality Check: Ensure header is found within the block's rows
            if header_idx < 0 or header_idx >= rows:
                 logger.info(
                    f"Block {label} discarded: Invalid header index ({header_idx}) found " 
                    f"relative to block shape ({rows}x{cols}). Slice: {slice_repr}"
                 )
                 continue
            
            # Additional Quality Check: Ensure header row isn't the *last* row (needs data below)
            if header_idx == rows - 1:
                 logger.info(
                     f"Block {label} discarded: Header index ({header_idx}) is the last row. "
                     f"No data found below header. Slice: {slice_repr}"
                 )
                 continue
                 
            # Optional: Add more checks here based on header score if needed later

        except Exception as e:
            logger.warning(
                f"Block {label} discarded: Error during header detection: {e}. Slice: {slice_repr}",
                exc_info=True # Log traceback for header detection errors
            )
            continue
        
        # If all checks passed, add header_idx and keep the block
        block['header_idx'] = header_idx 
        validated_blocks.append(block)
        logger.debug(f"Block {label} validated. Shape: {rows}x{cols}, Density: {density:.2f}, Header Index: {header_idx}. Slice: {slice_repr}")

    logger.info(f"Validated {len(validated_blocks)} out of {len(blocks)} initial blocks.")
    return validated_blocks

# ─────────────────────────────────────────────────────────────────────────────
# HEADER DETECTION HELPER (Existing)
# ─────────────────────────────────────────────────────────────────────────────
def _find_real_header_index(df_head: pd.DataFrame, max_rows_to_check=20) -> int:
    """Analyze first rows of a given DataFrame snippet to find the best candidate for the header row index. Returns the 0-based relative index."""
    logger = get_logger()
    # <<< Explicitly set level to DEBUG for this function >>>
    original_level = logger.level
    logger.setLevel(logging.DEBUG)
    # <<< END explicit level setting >>>
    
    logger.debug(f"Running refined header detection heuristic on dataframe snippet with shape: {df_head.shape}")
    best_score = -float('inf') # Use -inf for proper comparison
    second_best_score = -float('inf')
    # Default to relative index 0
    relative_header_idx = 0
    second_relative_header_idx = 0

    # Ensure we don't check more rows than available
    rows_to_analyze = min(len(df_head), max_rows_to_check)
    if rows_to_analyze == 0:
        logger.warning("Header detection received empty DataFrame snippet, defaulting to 0.")
        return 0
        
    # --- Compile patterns and define keywords --- ADDED BACK
    header_keywords = {'id', 'name', 'date', 'value', 'total', 'sum', 'category', 'type', 'status', 'descripción', 'fecha', 'nombre', 'código'}
    summary_keywords = {'total', 'sum', 'subtotal', 'sub total', 'grand total'}
    # Regex for typical header patterns (allows single words, CamelCase, snake_case, UPPER_CASE, avoids pure numbers/long text)
    header_pattern = re.compile(r'^([A-Za-z_][A-Za-z0-9_]*|[A-Z][A-Z0-9_]*)$') 
    short_len_threshold = 25 # Allow slightly longer headers
    # --- END ADDED BACK ---

    # --- Reset index for relative iteration ---
    df_head_relative = df_head.head(rows_to_analyze).reset_index(drop=True)
    logger.debug(f"Refined header detection analyzing first {len(df_head_relative)} relative rows:")

    # Store scores for ambiguity check later
    row_scores = {}

    # Iterate using relative index (idx)
    for idx, row in df_head_relative.iterrows():
        logger.debug("Inside header detection loop, relative row %s", idx)
        if row.isnull().all(): 
            row_scores[idx] = -100 # Heavily penalize fully empty rows
            continue 

        # --- Initialize Scores & Metrics ---
        score = 0.0
        components = {
            "non_null": 0.0, "string": 0.0, "numeric_penalty": 0.0, 
            "transition": 0.0, "summary_penalty": 0.0, 
            "positional": 0.0, "keyword": 0.0, "pattern": 0.0
        }
        num_cells = len(row)
        non_null_count = row.notna().sum()
        string_count = sum(isinstance(x, str) for x in row if pd.notna(x))
        numeric_count = sum(isinstance(x, (int, float, np.number)) for x in row if pd.notna(x))
        
        # Avoid division by zero
        if non_null_count == 0: 
            row_scores[idx] = -50 # Penalize rows with no non-null content slightly less than fully empty
            continue 

        # --- Scoring Heuristics --- 
        
        # 1. Non-null ratio
        non_null_ratio = non_null_count / max(1, num_cells)
        if non_null_ratio > 0.7:
            components["non_null"] = non_null_ratio * 1.5 # Increased bonus for being mostly full
        elif non_null_ratio < 0.4 and num_cells > 3: 
            # --- ADJUSTMENT 1: Reduce penalty if *any* strings exist --- 
            # Original check: string_ratio_for_penalty_check < 0.6
            if string_count > 0: # If at least one string exists, reduce penalty
                 logger.debug(f"Applying reduced non_null penalty (-1) to relative row {idx} (ratio={non_null_ratio:.2f}, strings>0)")
                 components["non_null"] = -1 # Reduced penalty
            else: # If sparse AND no strings, apply original penalty
                 logger.debug(f"Applying full non_null penalty (-3) to relative row {idx} (ratio={non_null_ratio:.2f}, no strings)")
                 components["non_null"] = -3 # Original penalty
            # --- END ADJUSTMENT 1 ---

        # 2. String ratio (Higher weight)
        string_ratio = string_count / non_null_count
        if string_ratio > 0.8: components["string"] = string_ratio * 5 # Strong bonus for mostly strings
        elif string_ratio > 0.6: components["string"] = string_ratio * 3
        elif string_ratio < 0.3 and num_cells > 3: components["numeric_penalty"] -= 4 # Penalize if few strings (likely data)

        # 3. Purely numeric penalty
        if numeric_count / non_null_count > 0.8:
             components["numeric_penalty"] -= 5 # Increased penalty

        # 4. Heterogeneity/Transition Score (Compare with next row)
        if idx + 1 < len(df_head_relative): # Use relative index check
            next_row = df_head_relative.iloc[idx+1]
            if not next_row.isnull().all():
                next_non_null = next_row.notna().sum()
                if next_non_null > 0:
                    next_numeric_count = sum(isinstance(x, (int, float, np.number)) for x in next_row if pd.notna(x))
                    next_numeric_frac = next_numeric_count / next_non_null
                    # Bonus if current row looks like text header and next looks like data
                    if string_ratio > 0.7 and next_numeric_frac > 0.6: 
                        components["transition"] = 3 # Increased bonus
                    # Penalty if current row looks like data and next looks like text (unlikely header)
                    elif numeric_count / non_null_count > 0.7 and (next_non_null - next_numeric_count) / next_non_null > 0.6:
                         components["transition"] = -2
        
        # 5. Summary word penalty
        try:
            first_cell_value = str(row.iloc[0]).strip().lower()
            if first_cell_value in summary_keywords:
               components["summary_penalty"] = -6 # Increased penalty
        except IndexError: pass 

        # 6. Positional Bias (Reduced) - Use relative idx
        components["positional"] = max(0, 1.0 - idx * 0.4)
        
        # 7. Keyword Hints Bonus
        row_str_lower = ' '.join(str(x).lower() for x in row if isinstance(x, str))
        if any(keyword in row_str_lower for keyword in header_keywords):
            # --- ADJUSTMENT 2: Increase Keyword Bonus --- 
            components["keyword"] = 1.0 # Increased from 0.5
            # --- END ADJUSTMENT 2 ---
            
        # 8. Header Pattern Bonus
        pattern_bonus_count = 0
        for cell in row.dropna():
             cell_str = str(cell).strip()
             if header_pattern.match(cell_str) and len(cell_str) < short_len_threshold:
                 pattern_bonus_count += 1
        if num_cells > 0:
             # --- ADJUSTMENT 3: Increase Pattern Bonus Multiplier --- 
             components["pattern"] = (pattern_bonus_count / num_cells) * 3 # Increased from 2
             # --- END ADJUSTMENT 3 ---

        # Calculate final score for the row
        score = sum(components.values())
        row_scores[idx] = score # Store score against relative index

        # --- Log Per-Row Details ---
        log_content = row.iloc[:5].apply(lambda x: str(x)[:20]).to_dict() # Truncate cell content for logs
        logger.debug(
            f"Relative Row {idx}: Score={score:.2f} | Components: { {k: f'{v:.2f}' for k, v in components.items()} } | Content: {log_content}"
        )

        # Update best and second best scores using relative index
        if score > best_score:
            second_best_score = best_score
            second_relative_header_idx = relative_header_idx # Store previous best relative index
            best_score = score
            relative_header_idx = idx # Store current best relative index
        elif score > second_best_score:
            second_best_score = score
            second_relative_header_idx = idx # Store current second best relative index

    # --- Final Decision & Ambiguity Check (using relative indices) ---
    final_relative_idx = relative_header_idx # Start with the best scoring relative index

    # Check for ambiguity only if we have a valid second best score and the best score isn't strongly negative
    if second_relative_header_idx != relative_header_idx and best_score > -5 and second_best_score > -float('inf'):
        # Use relative difference if best_score is positive, absolute difference otherwise
        score_diff = best_score - second_best_score
        ambiguity_threshold_relative = 0.10 # 10% relative threshold
        ambiguity_threshold_absolute = 1.0 # Absolute threshold for scores near zero
        
        is_ambiguous = False
        if best_score > 0:
            is_ambiguous = (score_diff / best_score) < ambiguity_threshold_relative
        else: # Handle cases where best_score might be negative or zero
            is_ambiguous = score_diff < ambiguity_threshold_absolute

        if is_ambiguous:
            logger.warning(
                f"Header detection ambiguity: Relative Row {relative_header_idx} (Score: {best_score:.2f}) vs "
                f"Relative Row {second_relative_header_idx} (Score: {second_best_score:.2f}). Scores are close."
            )
            # Default to the *earlier* relative row index in case of ambiguity
            final_relative_idx = min(relative_header_idx, second_relative_header_idx)
            logger.warning(f"Defaulting to earlier ambiguous relative row index: {final_relative_idx}")
        else:
             logger.debug("Scores sufficiently distinct, choosing best score.")

    # Log the final relative index
    logger.info(f"Refined Header Detection Result: Chose relative index={final_relative_idx} (Best Score: {row_scores.get(final_relative_idx, 'N/A'):.2f})")
    # <<< Restore original level >>>
    logger.setLevel(original_level)
    # <<< END restore original level >>>
    return int(final_relative_idx) # Return the relative 0-based index

# ─────────────────────────────────────────────────────────────────────────────
# 2  TRANSFORM
# ─────────────────────────────────────────────────────────────────────────────
def _clean_dataframe(df):
    """
    Clean DataFrame by removing empty rows, filtering summary rows, 
    and deduplicating column names. Empty columns are preserved.
    
    Args:
        df: pandas DataFrame to clean
        
    Returns:
        Cleaned DataFrame
    """
    logger = get_logger()
    logger.info(f"Starting DataFrame cleaning, initial shape: {df.shape}")
    
    # --- Filter out summary rows --- 
    if not df.empty and df.shape[1] > 0:
        summary_keywords = ['total', 'sum', 'subtotal', 'sub total', 'grand total']
        # Check the first column for summary keywords (case-insensitive)
        try:
            # Ensure the first column exists and convert to lowercase string
            first_col_str = df.iloc[:, 0].astype(str).str.lower().str.strip()
            is_summary_row = first_col_str.isin(summary_keywords)
            
            # Keep rows that are NOT summary rows
            original_row_count = len(df)
            df = df[~is_summary_row]
            rows_removed = original_row_count - len(df)
            if rows_removed > 0:
                logger.info(f"Removed {rows_removed} summary row(s) based on keywords in the first column.")
        except IndexError:
            logger.warning("Could not access first column for summary row filtering (IndexError).")
        except Exception as e:
            logger.warning(f"Error during summary row filtering: {type(e).__name__} - {str(e)}")
    # ----------------------------- 

    # Store original column order and count (after potential filtering)
    original_columns = df.columns.tolist()
    original_column_count = len(original_columns)
    logger.debug(f"DataFrame shape after potential summary row filtering: {df.shape}")
    if not df.empty and df.shape[1] > 0:
        logger.debug(f"First few values of first column after filtering: {df.iloc[:3, 0].tolist()}")
    
    # Drop rows that are completely empty (all values are NaN)
    df = df.dropna(how='all', axis=0)
    logger.debug(f"DataFrame after dropping empty rows: {df.shape}")
    
    # Deduplicate column names 
    # Ensure column names are strings before deduplication
    df.columns = [str(col) for col in df.columns]
    new_columns = _dedup_columns(df.columns) # Use current columns after potential filtering
    df.columns = new_columns
    
    # Log column count changes
    if len(df.columns) < original_column_count:
        logger.warning(f"Column count decreased after cleaning/deduplication. Original: {original_column_count}, Final: {len(df.columns)}")
            
    logger.info(f"Column names deduplicated.")

    # --- Drop 'No.' column if exists (case-insensitive) ---
    # cols_to_drop = [col for col in df.columns if str(col).strip().lower() == 'no.']
    # if cols_to_drop:
    #     df = df.drop(columns=cols_to_drop)
    #     logger.info(f"Dropped columns identified as row numbers: {cols_to_drop}")
    #     logger.debug(f"DataFrame shape after dropping 'No.' column(s): {df.shape}")

    # --- Drop fully empty columns ---
    
    # Convert any datetime-like columns to datetime
    for col in df.columns:
        try:
            if col in df and df[col].dtype == 'object':
                # --- PRESERVE YYYY-MM FORMAT --- 
                # Check if the column looks like YYYY-MM before attempting full date conversion
                sample_str = df[col].dropna().astype(str)
                is_yyyy_mm = sample_str.str.match(r'^\d{4}[-/]\d{2}$').mean() > 0.8
                if is_yyyy_mm:
                    logger.debug(f"Column '{col}' resembles YYYY-MM format, preserving as object.")
                    continue # Skip datetime conversion for this column
                # --- END PRESERVE --- 
                
                # Skip if column looks purely numeric or is completely empty
                if df[col].isna().all() or pd.api.types.is_numeric_dtype(df[col].dropna()):
                    continue 
                    
                # Check if a reasonable portion resembles *full* dates before attempting conversion
                # Adjusted regex to avoid matching YYYY-MM here
                if sample_str.str.match(r'\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$').mean() > 0.5:
                    # Attempt conversion, coercing errors
                    original_dtype = df[col].dtype
                    df[col] = pd.to_datetime(df[col], errors='coerce')
                    # Log only if dtype actually changed to datetime
                    if pd.api.types.is_datetime64_any_dtype(df[col].dtype) and original_dtype == 'object':
                        logger.debug(f"Converted column '{col}' to datetime")
        except Exception as e:
            logger.debug(f"Could not process column '{col}' for date conversion during cleaning: {type(e).__name__}")
            continue
    
    logger.debug(f"Final cleaned DataFrame shape: {df.shape}")
    return df

def _dedup_columns(cols):
    """
    Give every column a unique, string-safe name.
    • Blank/NaN headers become 'Unnamed'
    • Subsequent duplicates get _1, _2 … suffixes
    • Preserves original column order
    """
    out = []
    seen = {}
    
    for col in cols:
        # Normalize: NaN → 'Unnamed', everything else → string
        if pd.isna(col) or (isinstance(col, float) and pd.isna(col)):
            base = "Unnamed"
        else:
            base = str(col).strip() or "Unnamed"
            
        if base not in seen:
            seen[base] = 0
            out.append(base)
        else:
            seen[base] += 1
            out.append(f"{base}_{seen[base]}")
            
    return out

# New improved header guessing logic
def _guess_header_row_improved(df: pd.DataFrame, max_rows_to_check=10) -> int | None:
    """Try to find the most likely header row based on content type diversity."""
    best_score = -1
    header_idx = None

    for i, row in df.head(max_rows_to_check).iterrows():
        if row.isnull().all(): continue # Skip fully empty rows
        
        score = 0
        num_non_null = 0
        for item in row:
            if pd.notna(item):
                num_non_null += 1
                # Prefer rows with mostly strings, penalize pure numbers/dates heavily
                if isinstance(item, str):
                    score += 2 # High score for strings
                elif isinstance(item, (int, float, np.number)):
                    score -= 5 # Penalize numbers
                elif isinstance(item, (datetime, np.datetime64, pd.Timestamp)):
                     score -= 5 # Penalize dates/timestamps
                else:
                    score += 1 # Small score for other types
        
        # Normalize score by number of non-null items, favour rows with more content
        if num_non_null > 0:
            normalized_score = (score / num_non_null) * (num_non_null / max(1, df.shape[1]))
            if normalized_score > best_score and num_non_null >= max(1, df.shape[1] // 2): # Must have at least half non-null
                best_score = normalized_score
                header_idx = i
                
    if header_idx is not None:
        get_logger().debug(f"Improved header guess: Row index {header_idx} with score {best_score:.2f}")
        return int(header_idx)
    else:
        get_logger().debug("Improved header guess failed to find suitable row, falling back.")
        return None

# ─────────────────────────────────────────────────────────────────────────────
# 3  LOAD (chart payloads)
# ─────────────────────────────────────────────────────────────────────────────
def _classify_columns(df):
    """
    Classify DataFrame columns into types (numeric, categorical, date, year).
    
    Args:
        df: pandas DataFrame to analyze
        
    Returns:
        dict: Classification results with column lists by type
    """
    logger = get_logger()
    get_logger().info("Starting column classification")
    
    # Initialize classification containers
    numerical_cols = []
    categorical_cols = []
    date_cols = []
    year_cols = []
    classified_order_log = [] # Log the order of classification
    
    # Initialize metrics
    metrics = {
        "processed_columns": 0,
        "numeric_detected": 0,
        "categorical_detected": 0,
        "date_detected": 0,
        "year_detected": 0
    }
    
    # Compile year pattern once
    year_pattern = re.compile(r"^(19|20)\d{2}$")
    
    for col in df.columns:
        try:
            get_logger().debug(f"Analyzing column: {col}")
            metrics["processed_columns"] += 1
            
            # Skip empty columns
            if df[col].isna().all():
                get_logger().debug(f"Skipping empty column: {col}")
                continue
            
            # 1. Check for year columns first (either in column name or content)
            col_str = str(col)
            if year_pattern.match(col_str):
                year_cols.append(col)
                metrics["year_detected"] += 1
                get_logger().debug(f"Classified {col} as year column (from name)")
                continue
            elif col_str.lower() == 'year':
                # Check if values look like years
                values = df[col].dropna().astype(str)
                if values.str.match(r'^(19|20)\d{2}$').mean() > 0.8:
                    year_cols.append(col)
                    metrics["year_detected"] += 1
                    get_logger().debug(f"Classified {col} as year column (from values)")
                    continue
            
            # 2. Check for boolean columns
            if pd.api.types.is_bool_dtype(df[col]) or (
                df[col].dtype == 'object' and 
                df[col].dropna().isin([True, False, 'True', 'False']).all()
            ):
                categorical_cols.append(col)
                classified_order_log.append(f"{col} (Categorical)")
                metrics["categorical_detected"] += 1
                get_logger().debug(f"Classified {col} as categorical (boolean)")
                continue
            
            # 3. Check for numeric columns (attempt cleaning first)
            numeric_check_passed = False
            if pd.api.types.is_numeric_dtype(df[col]):
                numeric_check_passed = True # Already numeric
            else:
                # Try cleaning potential non-numeric chars before numeric check
                try:
                    # Convert to string, remove common noise like *, ,, $, spaces
                    # Keep decimal point and minus sign
                    cleaned_series = df[col].astype(str).str.replace(r'[^\d.\-]', '', regex=True)
                    # Attempt conversion to numeric on the cleaned series
                    converted_series = pd.to_numeric(cleaned_series, errors='coerce')
                    # Check if a significant portion could be converted
                    if converted_series.notna().mean() > 0.7: # Threshold for considering it numeric after cleaning
                        numeric_check_passed = True
                        logger.debug(f"Column '{col}' deemed numeric after cleaning non-numeric characters.")
                except Exception as clean_err:
                    logger.debug(f"Could not clean/check column '{col}' as numeric: {clean_err}")
            
            if numeric_check_passed:
                # Check if it genuinely contains numbers, not just IDs/codes
                # Heuristic: High unique ratio suggests ID, low suggests measurement
                # We already check unique ratio for categorical, let's reuse that logic implicitly
                # If it didn't get classified as categorical based on low unique ratio, 
                # and it passes numeric checks, treat as numerical.
                
                # Further check: Avoid classifying columns that are almost all integers as numeric 
                # if they look like typical ID columns (e.g., high unique ratio, few duplicates)
                # However, let's keep it simple for now and rely on the categorical unique check.
                
                success_ratio = df[col].notna().mean() # Check original column density
                if success_ratio > 0.5:
                    numerical_cols.append(col)
                    classified_order_log.append(f"{col} (Numeric)")
                    metrics["numeric_detected"] += 1
                    get_logger().debug(f"Classified {col} as numeric (density: {success_ratio:.2f})")
                    continue
            
            # 4. Check for date columns
            try:
                # Try parsing as datetime
                if pd.api.types.is_datetime64_any_dtype(df[col]):
                    date_cols.append(col)
                    metrics["date_detected"] += 1
                    get_logger().debug(f"Classified {col} as date (already datetime type)")
                    continue
                else:
                    # Try converting to datetime
                    success = pd.to_datetime(df[col], errors='coerce')
                    success_ratio = success.notna().mean()
                    if success_ratio > 0.8:  # More than 80% valid dates
                        date_cols.append(col)
                        metrics["date_detected"] += 1
                        get_logger().debug(f"Classified {col} as date (success ratio: {success_ratio:.2f})")
                        continue
            except Exception as e:
                get_logger().debug(f"Date parsing failed for {col}: {str(e)}")
            
            # 5. Default to categorical if:
            # - Column has low cardinality (few unique values)
            # - Or column has string/object dtype
            # - Or column has mixed types
            unique_ratio = df[col].nunique() / len(df[col].dropna())
            if (unique_ratio < 0.5 or 
                pd.api.types.is_string_dtype(df[col]) or 
                df[col].dtype == 'object'):
                categorical_cols.append(col)
                classified_order_log.append(f"{col} (Categorical)")
                metrics["categorical_detected"] += 1
                get_logger().debug(f"Classified {col} as categorical (unique ratio: {unique_ratio:.2f})")
                continue
            
            # If we get here, column couldn't be confidently classified
            get_logger().debug(f"Could not confidently classify column: {col}")
            
        except Exception as e:
            get_logger().warning(f"Error classifying column {col}: {str(e)}")
            continue
    
    # Log classification results
    logger.debug(f"Column classification order: {classified_order_log}") # Log the order
    logger.info(
        f"Column classification complete: "
        f"{metrics['numeric_detected']} numeric, "
        f"{metrics['categorical_detected']} categorical, "
        f"{metrics['date_detected']} date, "
        f"{metrics['year_detected']} year columns"
    )
    # <<< Log the final lists before returning >>>
    logger.debug(f"Final classified Numerical Cols: {numerical_cols}")
    logger.debug(f"Final classified Categorical Cols: {categorical_cols}")
    # <<< End log >>>
    
    return {
        "numericalColumns": numerical_cols,
        "categoricalColumns": categorical_cols,
        "dateColumns": date_cols,
        "yearColumns": year_cols,
        "metrics": metrics
    }


def _build_chart_payloads(df, meta):
    """
    Build standardized chart payload data structures from the unified dataframe.
    
    Args:
        df: The cleaned, unified pandas DataFrame
        meta: Dictionary with column classification metadata
        
    Returns:
        Dictionary with chart data for bar, line and donut charts
    """
    logger = get_logger()
    cat = meta.get("categoricalColumns", [])
    num = meta.get("numericalColumns", [])
    date = meta.get("dateColumns", [])
    year = meta.get("yearColumns", []) # Get year columns from meta
    
    # Initialize with empty arrays to ensure consistent structure
    bar_data = []
    line_data = []
    donut_data = []
    
    logger.debug(f"Building chart payloads with: Categorical={cat}, Numerical={num}, Date={date}, Year={year}")

    # --- Heuristic Column Selection ---
    def find_preferred_col(cols, preferences, default_index=0):
        if not cols: return None
        cols_lower = [str(c).lower() for c in cols]
        for pref in preferences:
            try:
                idx = cols_lower.index(pref.lower())
                return cols[idx]
            except ValueError:
                continue
        # Fallback
        if default_index < len(cols):
            return cols[default_index]
        return cols[0] # Absolute fallback

    cat_prefs = ['nom_loc', 'name', 'category', 'location', 'type', 'month', 'mes', 'description', 'descripción']
    num_prefs = ['pobtot', 'value', 'total', 'count', 'amount', 'consumo (kwh)', 'consumo']
    
    # Select columns using heuristic
    cat_col = find_preferred_col(cat, cat_prefs)
    num_col = find_preferred_col(num, num_prefs)
    time_col = find_preferred_col(date + year, []) # Prefer date, then year, then first if available

    logger.debug(f"Selected columns using heuristic: Category='{cat_col}', Numerical='{num_col}', Time='{time_col}'")
    # --- End Heuristic Column Selection ---

    # Generate bar chart data if we have selected categorical and numerical columns
    if cat_col and num_col:
        # logger.debug(f"Selected for Bar Chart: cat_col='{cat_col}', num_col='{num_col}'") # Redundant with log above
        logger.debug(f"Attempting to build Bar Chart using cat='{cat_col}' and num='{num_col}'")
        try:
            # Ensure the selected columns exist in the DataFrame
            if cat_col not in df.columns or num_col not in df.columns:
                 logger.error(f"Selected columns '{cat_col}' or '{num_col}' not found in DataFrame columns: {df.columns.tolist()}")
                 raise ValueError("Selected columns not found in DataFrame")
                 
            grouped = df.groupby(cat_col)[num_col].sum()
            logger.debug(f"Bar Chart - Grouped data:\n{grouped.head().to_string()}")
            bar_data = (
                grouped
                .reset_index() # Index is now 'cat_col' name
                .rename(columns={cat_col: "name", num_col: "value"}) # Rename for consistency
                .replace({np.nan: None})
                .to_dict("records")
            )
            bar_data = [
                {
                    "name": str(item.get("name", "Unknown")), 
                    "value": float(item.get("value", 0)) if item.get("value") is not None else 0
                } 
                for item in bar_data
            ]
            if len(bar_data) > 15:
                bar_data = sorted(bar_data, key=lambda x: x["value"], reverse=True)[:15]
                logger.debug(f"Limited bar chart to top 15 items (from {len(grouped)}) ")
        except Exception as e:
            logger.error(f"Error generating bar chart data: {str(e)}", exc_info=True) # Add exc_info
            bar_data = []
    else:
        logger.debug("Skipping Bar Chart: Insufficient categorical or numerical columns after heuristic selection.")

    # Generate line chart data using the heuristically selected time and numerical columns
    if time_col and num_col: 
        try:
            # Group and prepare data based on the time column
            if time_col not in df.columns or num_col not in df.columns:
                 logger.error(f"Selected columns '{time_col}' or '{num_col}' not found for Line Chart in DataFrame columns: {df.columns.tolist()}")
                 raise ValueError("Selected columns not found for Line Chart")
                 
            df_copy = df.copy()
            if time_col in date:
                df_copy[time_col] = pd.to_datetime(df_copy[time_col], errors='coerce')
                df_copy = df_copy.sort_values(time_col)
                # Format date for display if it's a date column
                df_copy["display_time"] = df_copy[time_col].dt.strftime('%Y-%m-%d') 
            else: # Assumed to be Year or other non-date time column
                df_copy[time_col] = df_copy[time_col].astype(str)
                # Use the column directly for display if not a date
                df_copy["display_time"] = df_copy[time_col]
                # Try sorting numerically if possible, otherwise string sort
                try:
                     df_copy = df_copy.sort_values(by=[pd.to_numeric(df_copy[time_col]), num_col], errors='ignore')
                except:
                     df_copy = df_copy.sort_values(by=[time_col, num_col])

            # Group by the original time column, aggregate the numerical column
            grouped = df_copy.groupby("display_time")[num_col].sum()
                
            logger.debug(f"Line Chart - Grouped data:\n{grouped.head().to_string()}")
            line_data = (
                grouped
                .reset_index() # Index is now 'display_time'
                .rename(columns={"display_time": "name", num_col: "value"}) # Rename for consistency
                .replace({np.nan: None})
                .to_dict("records")
            )
            line_data = [
                {
                    "name": str(item.get("name", "")),
                    "value": float(item.get("value", 0)) if item.get("value") is not None else 0
                }
                for item in line_data
            ]
            
            # Sorting is handled during grouping/preparation now
            
        except Exception as e:
            logger.error(f"Error generating line chart data: {str(e)}", exc_info=True) # Add exc_info
            line_data = []
    else:
        logger.debug(f"Skipping Line Chart: No suitable time or numerical column found after heuristic selection. Time: '{time_col}', Num: '{num_col}'")

    # Generate donut chart data using the heuristically selected categorical column
    if cat_col: 
        logger.debug(f"Building Donut Chart distribution using cat='{cat_col}'")
        try:
            if cat_col not in df.columns:
                 logger.error(f"Selected column '{cat_col}' not found for Donut Chart in DataFrame columns: {df.columns.tolist()}")
                 raise ValueError("Selected column not found for Donut Chart")
            
            # Ensure the numerical column exists for summing
            if not num_col or num_col not in df.columns:
                 logger.error(f"Numerical column '{num_col}' needed for donut sum not found.")
                 raise ValueError("Numerical column for donut sum not found")
                 
            # Sum the numerical column per category instead of counting rows
            grouped = df.groupby(cat_col)[num_col].sum()
            logger.debug(f"Donut Chart - Grouped Sum data:\n{grouped.head().to_string()}")
            donut_data = (
                grouped
                .reset_index() # Index is now 'cat_col' name
                .rename(columns={cat_col: "name", num_col: "value"}) # Rename grouped columns
                .replace({np.nan: None})
                .to_dict("records")
            )
            # Format to standard name/value list
            donut_data = [
                {"name": str(item.get("name", "Unknown")), "value": float(item.get("value", 0)) if item.get("value") is not None else 0}
                for item in donut_data
            ]
            # If more than top 10 categories, aggregate the rest into 'Other'
            if len(donut_data) > 10:
                # Sort by value before taking top 10 + Other
                donut_data = sorted(donut_data, key=lambda x: x['value'], reverse=True)
                others_value = sum(item["value"] for item in donut_data[10:])
                donut_data = donut_data[:10] + [{"name": "Other", "value": others_value}]
        except Exception as e:
            logger.error(f"Error generating donut chart data: {str(e)}", exc_info=True) # Add exc_info
            donut_data = []
    else:
        logger.debug("Skipping Donut Chart: No categorical column found after heuristic selection.")

    # Log final chart data arrays
    logger.debug(f"Final chart payloads: bar={len(bar_data)}, line={len(line_data)}, donut={len(donut_data)}")
    
    return {
        "barChart": bar_data,
        "lineChart": line_data, 
        "donutChart": donut_data
    }

# ─────────────────────────────────────────────────────────────────────────────
# HELPERS (Including new delimiter detection)
# ─────────────────────────────────────────────────────────────────────────────
def _detect_delimiter(fp: str | io.BytesIO, encoding: str) -> str:
    """Detect the delimiter of a CSV file using csv.Sniffer."""
    sample_bytes = b''
    try:
        if isinstance(fp, io.BytesIO):
            original_pos = fp.tell()
            fp.seek(0)
            # Read a decent amount for sniffing (e.g., 4KB)
            sample_bytes = fp.read(4096)
            fp.seek(original_pos) # Reset position
        else: # It's a file path
            with open(fp, 'rb') as f_sniff:
                sample_bytes = f_sniff.read(4096)
                
        if not sample_bytes:
             logger.warning("No content to sniff delimiter, defaulting to ','")
             return ','
             
        # Decode the sample using the detected encoding
        sample_text = sample_bytes.decode(encoding, errors='replace')
        
        # Use Sniffer
        sniffer = csv.Sniffer()
        dialect = sniffer.sniff(sample_text)
        logger.debug(f"Sniffer detected delimiter: {repr(dialect.delimiter)}")
        return dialect.delimiter
    except (csv.Error, UnicodeDecodeError, Exception) as e:
        logger.warning(f"Could not sniff delimiter: {type(e).__name__} - {str(e)}. Defaulting to ','.")
        # Ensure BytesIO position is reset even on error
        if isinstance(fp, io.BytesIO):
            try: fp.seek(original_pos)
            except NameError: fp.seek(0) # If original_pos wasn't set
        return ',' # Default to comma on any error
        
def _infer_extension(fp, original):
    if original:
        return os.path.splitext(original)[1].lower()
    if isinstance(fp, str):
        return os.path.splitext(fp)[1].lower()
    return mimetypes.guess_extension("application/octet-stream") or ".xlsx"


def _get_size(fp):
    if isinstance(fp, str):
        return os.path.getsize(fp)
    fp.seek(0, io.SEEK_END)
    size = fp.tell()
    fp.seek(0)
    return size


def _detect_encoding(fp: str | io.BytesIO) -> str:
    """
    Detect the encoding of a file.
    
    Args:
        fp: File path or BytesIO object
        
    Returns:
        str: Detected encoding (defaults to utf-8 if detection fails)
    """
    try:
        det = UniversalDetector()
        
        if isinstance(fp, io.BytesIO):
            # For BytesIO, read the content directly
            content = fp.getvalue()
            det.feed(content)
            det.close()
            # Reset the BytesIO position for subsequent reads
            fp.seek(0)
        else:
            # For file paths, read in chunks
            with open(fp, 'rb') as f:
                for chunk in iter(lambda: f.read(4096), b''):
                    det.feed(chunk)
                    if det.done:
                        break
                det.close()
        
        if det.result['encoding']:
            return det.result['encoding']
        else:
            get_logger().debug("No encoding detected, defaulting to utf-8")
            return 'utf-8'
    except Exception as e:
        get_logger().warning(f"Error detecting encoding: {str(e)}, defaulting to utf-8")
        return 'utf-8'


def _split_on_nan_columns(df):
    """
    Split a DataFrame into multiple blocks based on fully empty columns.
    This helps handle side-by-side tables separated by blank columns.
    
    Args:
        df: The pandas DataFrame to split
        
    Returns:
        List of DataFrames, each representing an independent data block
    """
    # Find columns that are entirely NaN
    nan_cols = df.columns[df.isna().all()]
    
    if len(nan_cols) == 0:
        # No empty columns, return the original DataFrame as a single block
        return [df]
        
    # Get indices of separator columns
    sep_indices = [df.columns.get_loc(col) for col in nan_cols]
    
    # Create a list of start/end indices for each block
    edges = [-1] + sorted(sep_indices) + [df.shape[1]]
    
    # Split the DataFrame into blocks
    blocks = []
    for l, r in zip(edges, edges[1:]):
        # Skip empty blocks or separator columns
        if r > l + 1:  # Ensure there's at least one data column
            block = df.iloc[:, l+1:r]
            if not block.empty and not block.isna().all().all():
                blocks.append(block)
                get_logger().debug(f"Split block: {l+1}:{r} with shape {block.shape}")
    
    get_logger().info(f"Split DataFrame into {len(blocks)} blocks based on empty columns")
    return blocks


def _separate_id_value_cols(block):
    num_cols = block.select_dtypes(include="number").columns.tolist() or [
        block.columns[-1]
    ]
    id_cols = [c for c in block.columns if c not in num_cols]
    return id_cols, num_cols


def _looks_like_year_cols(cols):
    """
    Check if the columns look like they contain years.
    
    Args:
        cols: List-like or pandas Index of column names
        
    Returns:
        bool: True if the columns appear to be years
    """
    # Ensure we're working with a sequence and handle empty input
    if cols is None or len(cols) == 0:
        return False
        
    # Convert to list of strings and handle pandas Index objects properly
    try:
        # Convert to strings and filter out any non-string/non-numeric values
        str_cols = [str(col).strip() for col in cols if pd.notna(col)]
        if not str_cols:
            return False
            
        # Take a sample to avoid checking huge lists
        sample = str_cols[:5]
        
        # Compile regex patterns once
        year_patterns = [
            re.compile(r"^(19|20)\d{2}$"),  # Exact year match (e.g., "2020")
            re.compile(r"^y(19|20)\d{2}$", re.I),  # y2020, Y2020, etc.
            re.compile(r"^year[_\s]?(19|20)\d{2}$", re.I),  # year_2020, Year 2020, etc.
            re.compile(r"^year$", re.I),  # Just "year" column
        ]
        
        # Track matches
        matches = 0
        total = len(sample)
        
        for col in sample:
            # Check if it's a year using any of our patterns
            is_year = any(pattern.match(col) for pattern in year_patterns)
            
            # If not matched by patterns, check if it's a 4-digit number in valid range
            if not is_year and col.isdigit() and len(col) == 4:
                year = int(col)
                is_year = 1900 <= year <= 2100  # Reasonable year range
                
            if is_year:
                matches += 1
                
        # Consider it a year column set if at least 2 columns match and >50% are years
        return matches >= 2 and matches / len(sample) > 0.5
        
    except (TypeError, ValueError) as e:
        get_logger().warning(f"Error in _looks_like_year_cols: {str(e)}")
        return False


def _melt_time_series(df):
    """
    Detect if a dataframe appears to be in 'wide' time-series format (with years/dates as columns)
    and melt it into a long format more suitable for visualization.
    
    Args:
        df: The pandas DataFrame to potentially melt
        
    Returns:
        Tuple of (melted_df, is_melted) - the dataframe (melted if appropriate) and a flag
    """
    # Check if column headers look like years
    if not _looks_like_year_cols(df.columns[1:]):
        get_logger().debug("DataFrame doesn't appear to be in wide time-series format")
        return df, False
    
    get_logger().info("Detected wide time-series format with year columns")
    
    try:
        # Identify potential ID columns (typically the first column(s))
        # Heuristic: Use first column as ID, rest as values
        id_cols = [df.columns[0]]
        value_cols = [col for col in df.columns if col not in id_cols]
        
        get_logger().debug(f"Melting with id_cols={id_cols}, value_cols={len(value_cols)} columns")
        
        # Melt the dataframe
        melted_df = pd.melt(
            df,
            id_vars=id_cols,
            value_vars=value_cols,
            var_name='Year',
            value_name='Value'
        )
        
        # Convert Year column to string to ensure consistency
        melted_df['Year'] = melted_df['Year'].astype(str)
        
        # Drop rows with NaN values that often appear in melted dataframes
        melted_df = melted_df.dropna()
        
        get_logger().info(f"Melted time-series data from shape {df.shape} to {melted_df.shape}")
        return melted_df, True
    except Exception as e:
        get_logger().error(f"Error melting time-series data: {str(e)}")
        return df, False


def _coerce_numeric_columns(df):
    digit_re = re.compile(r"\d")
    for c in df.columns:
        if df[c].dtype != "object":
            continue
        sample = df[c].astype(str).head(30).str.cat()
        if not digit_re.search(sample):
            continue
        cleaned = df[c].astype(str).str.replace(r"[^\d\.\-]", "", regex=True)
        # Use errors='coerce' to force numeric type, converting errors to NaN
        df[c] = pd.to_numeric(cleaned, errors="coerce")
    return df

# ─────────────────────────────────────────────────────────────────────────────
# UTILITY HELPERS (Existing and New)
# ─────────────────────────────────────────────────────────────────────────────

def _slice_to_excel_range(slice_obj: tuple[slice, slice]) -> str:
    """
    Converts a tuple of numpy slice objects to an Excel-style range string (e.g., \"A1:C10\").

    Args:
        slice_obj: Tuple containing row slice and column slice.

    Returns:
        Excel-style range string.
    """
    row_slice, col_slice = slice_obj
    
    # Convert 0-based column index to Excel column letter (A, B, ..., Z, AA, AB, ...)
    def col_to_excel(col_idx): # col_idx is 0-based
        col_num = col_idx + 1
        excel_col = "" # Ensure this and subsequent lines are indented correctly
        while col_num > 0:
            col_num, remainder = divmod(col_num - 1, 26)
            excel_col = string.ascii_uppercase[remainder] + excel_col
        return excel_col

    # Slice start/stop are 0-based, Excel rows/cols are 1-based
    start_col_excel = col_to_excel(col_slice.start)
    end_col_excel = col_to_excel(col_slice.stop - 1) # slice.stop is exclusive
    start_row_excel = row_slice.start + 1
    end_row_excel = row_slice.stop # slice.stop is exclusive, matches last row number

    # Simplified return statement
    return start_col_excel + str(start_row_excel) + ':' + end_col_excel + str(end_row_excel)

def _nan_to_none(data):
    """Recursively replace NaN values with None for JSON compatibility."""
    if isinstance(data, dict):
        return {k: _nan_to_none(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [_nan_to_none(item) for item in data]
    elif isinstance(data, float) and math.isnan(data):
        return None
    elif pd.isna(data): # Handle pandas NaT etc.
        return None
    return data
