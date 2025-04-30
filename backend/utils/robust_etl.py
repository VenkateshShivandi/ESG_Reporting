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
from flask import current_app # Import current_app to access logger

# ─────────────────────────────────────────────────────────────────────────────
# CONSTANTS
# ─────────────────────────────────────────────────────────────────────────────
MEM_STREAM_THRESHOLD = 50 * 1024 * 1024  # 50 MB
NUMERIC_UNIQUE_RATIO = 0.9
CATEGORICAL_MAX_UNIQUE = 50
MAX_JSON_ROWS = 10_000

# ─────────────────────────────────────────────────────────────────────────────
# PUBLIC API
# ─────────────────────────────────────────────────────────────────────────────
def _nan_to_none(obj):
    """
    Recursively replace all NaN values with None in a nested dictionary/list structure
    for proper JSON serialization. Also converts NumPy types to standard Python types.
    
    Args:
        obj: Any Python object that might contain NaN values or NumPy types
        
    Returns:
        The same object with all NaN values replaced with None and NumPy types converted
    """
    if isinstance(obj, dict):
        return {k: _nan_to_none(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_nan_to_none(item) for item in obj]
    elif isinstance(obj, (float, np.float64, np.float32, np.float16)) and (pd.isna(obj) or math.isnan(obj) or np.isnan(obj)):
        return None
    # Handle NumPy integer types
    elif isinstance(obj, (np.int_, np.intc, np.intp, np.int8, np.int16, np.int32, np.int64, np.uint8, np.uint16, np.uint32, np.uint64)):
        return int(obj)
    # Handle NumPy float types (non-NaN)
    elif isinstance(obj, (np.float_, np.float16, np.float32, np.float64)):
        # Check for NaN again to be safe
        try:
            if np.isnan(obj) or math.isnan(float(obj)):
                return None
            return float(obj)
        except (TypeError, ValueError):
            return float(obj)
    # Handle NumPy bool
    elif isinstance(obj, np.bool_):
        return bool(obj)
    # Handle string-like objects
    elif isinstance(obj, (np.str_, np.string_)):
        return str(obj)
    # Handle NaT (Not a Time) and other datetime objects
    elif isinstance(obj, (np.datetime64, pd.Timestamp)):
        try:
            return obj.isoformat()
        except:
            return str(obj)
    # Handle more generic cases of pd.NA, numpy masked arrays, or any other NA type
    elif pd.api.types.is_scalar(obj) and pd.isna(obj):
        return None
    return obj


def etl_to_chart_payload(
    fp: str | io.BytesIO, *, original_filename: str | None = None, sample_nrows=None
) -> dict:
    """
    ETL pipeline that converts various file types to a standardized chart payload.
    
    Args:
        fp: Path to the input file or BytesIO object
        original_filename: Original filename with extension (for accurate type detection)
        sample_nrows: Number of rows to sample (None = all rows)
        
    Returns:
        A dictionary containing chart data and metadata suitable for JSON serialization
    """
    current_app.logger.info(f"Starting ETL process for file: {original_filename}")
    try:
        df = _load_dataframe(fp, original_filename)
        current_app.logger.info(f"DataFrame loaded with shape: {df.shape}")
        current_app.logger.debug(f"Initial DataFrame: {df.head().to_string()}")
        
        # Apply row sampling if requested
        if sample_nrows is not None and len(df) > sample_nrows:
            df = df.head(sample_nrows)
            
        df = _clean_dataframe(df)
        current_app.logger.info(f"DataFrame cleaned, new shape: {df.shape}")
        current_app.logger.debug(f"Cleaned DataFrame: {df.head().to_string()}")
        
        column_types = _classify_columns(df)
        current_app.logger.info(f"Columns classified: {column_types}")
        
        df = _coerce_numeric_columns(df)
        current_app.logger.info(f"Numeric coercion applied to DataFrame")
        current_app.logger.debug(f"DataFrame after numeric coercion: {df.head().to_string()}")
        
        payload = _build_chart_payloads(df, column_types)
        current_app.logger.info(f"Chart payload built successfully")
        current_app.logger.debug(f"Final payload: {payload}")
        
        # Create final payload structure
        final_payload = {
            "data": df.replace({np.nan: None}).to_dict("records"),  # First level NaN replacement
            "stats": {
                "rowCount": len(df),
                "columnCount": len(df.columns),
                "isTruncated": sample_nrows is not None and len(df) > sample_nrows,
            },
            "meta": {
                "columns": list(df.columns),
                "numericalColumns": column_types["numericalColumns"],
                "categoricalColumns": column_types["categoricalColumns"],
                "timeColumns": [],
                "yearColumns": [],
            },
            "chartData": payload,
        }
        
        # Final recursive NaN replacement for deep nested structures
        final_payload = _nan_to_none(final_payload)
        current_app.logger.info(f"Successfully built payload. Returning.")
        return final_payload
    except Exception as e:
        current_app.logger.error(f"Error in ETL process for {original_filename}: {str(e)}", exc_info=True)
        # Return a structured error response that the frontend can handle
        import traceback
        error_payload = {
            "error": True,
            "message": str(e),
            "traceback": traceback.format_exc(),
            "data": [],
            "stats": {
                "rowCount": 0,
                "columnCount": 0,
                "isTruncated": False,
            },
            "meta": {
                "columns": [],
                "numericalColumns": [],
                "categoricalColumns": [],
                "timeColumns": [],
                "yearColumns": [],
            },
            "chartData": {
                "barChart": [],
                "lineChart": [],
                "donutChart": []
            },
        }
        return error_payload

# ─────────────────────────────────────────────────────────────────────────────
# 1  EXTRACT
# ─────────────────────────────────────────────────────────────────────────────
def _load_dataframe(fp, original_filename):
    ext = _infer_extension(fp, original_filename)
    size = _get_size(fp)

    if ext in {".csv", ".tsv"}:
        return _read_csv(fp, size, ext)
    if ext in {".xlsx", ".xlsm", ".xls"}:
        return pd.read_excel(fp, sheet_name=0, header=None)
    if ext == ".xlsb":
        return pd.read_excel(fp, sheet_name=0, header=None, engine="pyxlsb")
    raise ValueError(f"Unsupported file extension {ext}")


def _read_csv(fp, size, ext):
    sample = (
        fp.read(2_000_000)
        if isinstance(fp, io.BytesIO)
        else open(fp, "rb").read(2_000_000)
    )
    if isinstance(fp, io.BytesIO):
        fp.seek(0)

    encoding = _detect_encoding(sample)
    sep = "\t" if ext == ".csv" and b"\t" in sample[:512] else None
    read_kw = dict(encoding=encoding, engine="python", sep=sep, low_memory=False)

    if size > MEM_STREAM_THRESHOLD:
        reader = pd.read_csv(
            fp, chunksize=100_000, dtype_backend="pyarrow", iterator=True, **read_kw
        )
        return pd.concat(reader, ignore_index=True)
    return pd.read_csv(fp, dtype_backend="pyarrow", **read_kw)

# ─────────────────────────────────────────────────────────────────────────────
# 2  TRANSFORM
# ─────────────────────────────────────────────────────────────────────────────
def _clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Clean DataFrame by removing empty rows/columns and deduplicating column names.
    """
    current_app.logger.info(f"Starting DataFrame cleaning, initial shape: {df.shape}")
    df = df.dropna(how='all', axis=0)
    current_app.logger.debug(f"DataFrame after dropping empty rows: {df.shape}")
    df = df.dropna(how='all', axis=1)
    current_app.logger.debug(f"DataFrame after dropping empty columns: {df.shape}")
    df.columns = _dedup_columns(df.columns)
    current_app.logger.info(f"Column names deduplicated")
    current_app.logger.debug(f"Final cleaned DataFrame shape: {df.shape}")
    return df

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
        current_app.logger.debug(f"Improved header guess: Row index {header_idx} with score {best_score:.2f}")
        return int(header_idx)
    else:
        current_app.logger.debug("Improved header guess failed to find suitable row, falling back.")
        return None

# ─────────────────────────────────────────────────────────────────────────────
# 3  LOAD (chart payloads)
# ─────────────────────────────────────────────────────────────────────────────
def _classify_columns(df):
    cat, num = [], []
    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            unique_ratio = df[col].nunique(dropna=True) / max(len(df), 1)
            (num if unique_ratio < NUMERIC_UNIQUE_RATIO else cat).append(col)
        elif df[col].nunique(dropna=True) <= CATEGORICAL_MAX_UNIQUE:
            cat.append(col)
    result = {
        "columns": df.columns.tolist(),
        "categoricalColumns": cat,
        "numericalColumns": num,
    }

    # Log the classification result
    current_app.logger.debug(f"Column classification result: Categorical={cat}, Numerical={num}")
    return result


def _build_chart_payloads(df, meta):
    """
    Build standardized chart payload data structures from the dataframe.
    
    Args:
        df: The cleaned pandas DataFrame
        meta: Dictionary with column classification metadata
        
    Returns:
        Dictionary with chart data for bar, line and donut charts
    """
    cat, num = meta["categoricalColumns"], meta["numericalColumns"]
    
    # Initialize with empty arrays to ensure consistent structure
    bar_data = []
    line_data = []
    donut_data = []
    
    current_app.logger.debug(f"Building chart payloads with: Categorical={cat}, Numerical={num}")

    # Generate bar chart data if we have both categorical and numerical columns
    if cat and num:
        current_app.logger.debug(f"Attempting to build Bar Chart using cat='{cat[0]}' and num='{num[0]}'")
        try:
            grouped = df.groupby(cat[0])[num[0]].sum()
            current_app.logger.debug(f"Bar Chart - Grouped data:\n{grouped.head().to_string()}")
            bar_data = (
                grouped
                .reset_index()
                .rename(columns={cat[0]: "name", num[0]: "value"})
                .replace({np.nan: None})
                .to_dict("records")
            )
            # Ensure bar chart data has valid name and value fields
            bar_data = [
                {
                    "name": str(item.get("name", "Unknown")), 
                    "value": float(item.get("value", 0)) if item.get("value") is not None else 0
                } 
                for item in bar_data
            ]
        except Exception as e:
            current_app.logger.error(f"Error generating bar chart data: {str(e)}")
            # Fallback to empty array on error
            bar_data = []
    else:
        current_app.logger.debug("Skipping Bar Chart: Insufficient categorical or numerical columns.")

    # Generate line chart data if we have Year column and numerical columns
    if "Year" in df.columns and num:
        current_app.logger.debug(f"Attempting to build Line Chart using col='Year' and num='{num[0]}'")
        try:
            grouped = df[["Year", num[0]]].groupby("Year")[num[0]].sum()
            current_app.logger.debug(f"Line Chart - Grouped data:\n{grouped.head().to_string()}")
            line_data = (
                grouped
                .reset_index()
                .rename(columns={"Year": "name", num[0]: "value"})
                .replace({np.nan: None})
                .to_dict("records")
            )
            # Ensure line chart data has valid name and value fields
            line_data = [
                {
                    "name": str(item.get("name", "")), 
                    "value": float(item.get("value", 0)) if item.get("value") is not None else 0
                }
                for item in line_data
            ]
        except Exception as e:
            current_app.logger.error(f"Error generating line chart data: {str(e)}")
            # Fallback to empty array on error
            line_data = []
    else:
        current_app.logger.debug(f"Skipping Line Chart: 'Year' column not found or no numerical columns. Columns: {df.columns.tolist()}")

    # Generate donut chart data from categorical column 
    if cat:
        current_app.logger.debug(f"Attempting to build Donut Chart using cat='{cat[0]}'")
        try:
            counts = df[cat[0]].value_counts().head(10)
            current_app.logger.debug(f"Donut Chart - Value counts:\n{counts.to_string()}")
            donut_data = (
                counts
                .reset_index(name="value")
                .rename(columns={"index": "name"})
                .replace({np.nan: None})
                .to_dict("records")
            )
            # Ensure donut chart data has valid name and value fields
            donut_data = [
                {
                    "name": str(item.get("name", "Unknown")), 
                    "value": float(item.get("value", 0)) if item.get("value") is not None else 0
                }
                for item in donut_data
            ]
        except Exception as e:
            current_app.logger.error(f"Error generating donut chart data: {str(e)}")
            # Fallback to empty array on error
            donut_data = []
    else:
        current_app.logger.debug("Skipping Donut Chart: No categorical columns found.")

    # Log final chart data arrays
    current_app.logger.debug(f"Final chart payloads: bar={len(bar_data)}, line={len(line_data)}, donut={len(donut_data)}")
    
    return {
        "barChart": bar_data,
        "lineChart": line_data, 
        "donutChart": donut_data
    }

# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────
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


def _detect_encoding(sample: bytes):
    det = UniversalDetector()
    det.feed(sample)
    det.close()
    return det.result["encoding"] or "utf-8"


def _dedup_columns(cols):
    """
    Give every column a unique, string-safe name.
    • Blank/NaN headers become 'Unnamed'
    • Subsequent duplicates get _1, _2 … suffixes
    """
    out, seen = [], {}
    for col in cols:
        # normalise: NaN → 'Unnamed', everything else → string
        if isinstance(col, float) and pd.isna(col):
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


def _split_on_nan_columns(df):
    nan_cols = df.columns[df.isna().all()]
    edges = [-1] + nan_cols.tolist() + [df.shape[1]]
    return [df.iloc[:, l + 1 : r] for l, r in zip(edges, edges[1:]) if isinstance(l, int) and isinstance(r, int)]


def _separate_id_value_cols(block):
    num_cols = block.select_dtypes(include="number").columns.tolist() or [
        block.columns[-1]
    ]
    id_cols = [c for c in block.columns if c not in num_cols]
    return id_cols, num_cols


def _looks_like_year_cols(cols):
    year_re = re.compile(r"(19|20)\d{2}")
    return bool(cols) and all(
        year_re.search(str(c)) or str(c).isdigit() for c in list(cols)[:3]
    )


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
