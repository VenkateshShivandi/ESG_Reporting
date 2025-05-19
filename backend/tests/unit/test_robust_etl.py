import os
import sys
import pytest
import pandas as pd
import numpy as np
import io
import json
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock

# Setup path to allow importing from project root
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

# Import the module for testing
from backend.utils.robust_etl import (
    etl_to_chart_payload,
    _clean_dataframe,
    _classify_columns,
    _find_data_blocks,
    _filter_and_refine_blocks,
    _build_chart_payloads,
    _detect_encoding,
    _detect_delimiter,
    _nan_to_none,
    _find_real_header_index,
    _slice_to_excel_range
)

# Fixtures

@pytest.fixture
def sample_csv_data():
    """Create a sample CSV file for testing."""
    csv_content = """Year,Revenue,Employees,Comments
2020,1200000,50,Initial year
2021,1500000,65,Growth phase
2022,1800000,72,Expansion
2023,2100000,80,Current"""
    
    return io.BytesIO(csv_content.encode('utf-8'))

@pytest.fixture
def sample_excel_data():
    """Create a sample Excel file for testing."""
    df = pd.DataFrame({
        'Year': [2020, 2021, 2022, 2023],
        'Revenue': [1200000, 1500000, 1800000, 2100000],
        'Employees': [50, 65, 72, 80],
        'Comments': ['Initial year', 'Growth phase', 'Expansion', 'Current']
    })
    
    excel_buffer = io.BytesIO()
    with pd.ExcelWriter(excel_buffer, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Sheet1', index=False)
        
        # Create a second sheet with ESG metrics
        esg_df = pd.DataFrame({
            'Category': ['Carbon Emissions', 'Water Usage', 'Waste'],
            '2020': [1000, 5000, 200],
            '2021': [950, 4800, 180],
            '2022': [900, 4600, 160],
            '2023': [800, 4400, 140]
        })
        esg_df.to_excel(writer, sheet_name='ESG_Data', index=False)
    
    excel_buffer.seek(0)
    return excel_buffer

@pytest.fixture
def raw_dataframe():
    """Create a raw DataFrame with headers and data for testing."""
    data = [
        ["", "", "COMPANY ESG REPORT", "", ""],
        ["", "", "", "", ""],
        ["No.", "Metric", "2020", "2021", "2022"],
        [1, "Carbon Emissions (tons)", 1000, 950, 900],
        [2, "Water Usage (m³)", 5000, 4800, 4600],
        [3, "Waste Generated (tons)", 200, 180, 160],
        ["", "", "", "", ""],
        ["", "", "SOCIAL METRICS", "", ""],
        ["", "Category", "Value", "Change", ""],
        ["", "Employees", 80, "+10%", ""],
        ["", "Training Hours", 1200, "+15%", ""]
    ]
    return pd.DataFrame(data)

@pytest.fixture
def problematic_csv():
    """Create a CSV with formatting issues for testing robustness."""
    csv_content = "Year,Revenue,Employees,Comments\n"
    csv_content += "2020,\"1,200,000\",50,\"Initial \"\"phase\"\"\"\n"
    csv_content += "2021,\"1,500,000\",,Growth phase\n"
    csv_content += "2022,N/A,72,\n"
    csv_content += "#This is a comment\n"
    csv_content += "2023,\"2,100,000\",80,Current"
    
    return io.BytesIO(csv_content.encode('utf-8'))

# Tests

def test_clean_dataframe():
    """Test the DataFrame cleaning functionality."""
    # Create a DataFrame with issues to clean
    df = pd.DataFrame({
        'Column1': ['Value1', 'Value2', 'Value3', 'Total'],
        'Column2': [10, 20, 30, 60],
        'Column2': [100, 200, 300, 600],  # Duplicate column
        'Empty': [None, None, None, None]  # Empty column
    })
    
    cleaned_df = _clean_dataframe(df)
    
    # Check column deduplication
    assert 'Column2' in cleaned_df.columns
    assert 'Column2_1' not in cleaned_df.columns
    
    # Check summary row filtering
    assert 'Total' not in cleaned_df['Column1'].values

def test_classify_columns():
    """Test column type classification."""
    df = pd.DataFrame({
        'ID': [1, 2, 3, 4],
        'Name': ['A', 'B', 'C', 'D'],
        'Value': [10.5, 20.5, 30.5, 40.5],
        'Date': pd.to_datetime(['2023-01-01', '2023-02-01', '2023-03-01', '2023-04-01']),
        'Year': [2020, 2021, 2022, 2023]
    })
    
    classification = _classify_columns(df)
    
    # Check classification results
    assert 'ID' in classification['numericalColumns']
    assert 'Value' in classification['numericalColumns']
    assert 'Name' in classification['categoricalColumns']
    assert 'Date' in classification['dateColumns']
    assert 'Year' in classification['yearColumns'] or 'Year' in classification['numericalColumns']

def test_find_data_blocks(raw_dataframe):
    """Test identification of data blocks in a raw DataFrame."""
    blocks = _find_data_blocks(raw_dataframe)
    
    # Should find at least 2 blocks in test data
    assert len(blocks) >= 2
    
    # Check block structure
    for block in blocks:
        assert 'label' in block
        assert 'slice' in block
        assert 'data' in block
        assert isinstance(block['data'], pd.DataFrame)

def test_filter_and_refine_blocks(raw_dataframe):
    """Test block filtering and refinement."""
    blocks = _find_data_blocks(raw_dataframe)
    refined_blocks = _filter_and_refine_blocks(raw_dataframe, blocks, 'csv')
    
    # Check for header detection
    for block in refined_blocks:
        assert 'header_idx' in block
        assert isinstance(block['header_idx'], int)
        
        # Header index should be valid
        assert 0 <= block['header_idx'] < len(block['data'])

def test_build_chart_payloads():
    """Test chart data generation."""
    df = pd.DataFrame({
        'Category': ['A', 'B', 'C', 'D'],
        'Value': [10, 20, 30, 40],
        'Date': pd.date_range(start='2023-01-01', periods=4, freq='M')
    })
    
    # Classify columns
    meta = {
        'categoricalColumns': ['Category'],
        'numericalColumns': ['Value'],
        'dateColumns': ['Date']
    }
    
    chart_data = _build_chart_payloads(df, meta)
    
    # Check chart types
    assert 'barChart' in chart_data
    assert 'lineChart' in chart_data
    assert 'donutChart' in chart_data
    
    # Check chart data
    assert len(chart_data['barChart']) > 0

def test_nan_to_none():
    """Test NaN to None conversion for JSON compatibility."""
    # Test with a dictionary
    test_dict = {
        'valid': 100,
        'nan': np.nan,
        'nested': {'nan_value': np.nan},
        'list': [1, 2, np.nan, 4]
    }
    
    result = _nan_to_none(test_dict)
    
    assert result['valid'] == 100
    assert result['nan'] is None
    assert result['nested']['nan_value'] is None
    assert result['list'] == [1, 2, None, 4]
    
    # Test with a list
    test_list = [1, np.nan, 3, {'nan': np.nan}]
    result_list = _nan_to_none(test_list)
    
    assert result_list == [1, None, 3, {'nan': None}]

def test_find_real_header_index():
    """Test header row detection."""
    # Create test data with a title and header row
    data = [
        ["", "", "REPORT TITLE", "", ""],
        ["", "", "", "", ""],
        ["ID", "Name", "Value", "Date", "Notes"],
        [1, "Item A", 100, "2023-01-01", "First item"],
        [2, "Item B", 200, "2023-02-01", "Second item"]
    ]
    df = pd.DataFrame(data)
    
    header_idx = _find_real_header_index(df)
    
    # Should identify row 2 (index) as the header
    assert header_idx == 2

def test_slice_to_excel_range():
    """Test conversion of slice objects to Excel range notation."""
    # Test a simple range (A1:C3)
    slice_obj = (slice(0, 3), slice(0, 3))
    excel_range = _slice_to_excel_range(slice_obj)
    assert excel_range == "A1:C3"
    
    # Test a larger range (B5:Z20)
    slice_obj = (slice(4, 20), slice(1, 26))
    excel_range = _slice_to_excel_range(slice_obj)
    assert excel_range == "B5:Z20"
    
    # Test multi-letter columns (AA1:AC10)
    slice_obj = (slice(0, 10), slice(26, 29))
    excel_range = _slice_to_excel_range(slice_obj)
    assert excel_range == "AA1:AC10"

@patch('backend.utils.robust_etl.get_logger')
def test_detect_encoding(mock_get_logger):
    """Test encoding detection."""
    # Setup mock logger
    mock_logger = MagicMock()
    mock_get_logger.return_value = mock_logger
    
    # Test with UTF-8 content
    content = "Hello, world!".encode('utf-8')
    file_obj = io.BytesIO(content)
    
    encoding = _detect_encoding(file_obj)
    
    # Should detect UTF-8 or ASCII (both are valid for this simple string)
    assert encoding.lower() in ['utf-8', 'ascii', 'utf8']
    
    # Check file position is reset
    assert file_obj.tell() == 0

@patch('backend.utils.robust_etl.get_logger')
def test_detect_delimiter(mock_get_logger):
    """Test delimiter detection."""
    # Setup mock logger
    mock_logger = MagicMock()
    mock_get_logger.return_value = mock_logger
    
    # Test CSV content
    csv_content = """column1,column2,column3
value1,value2,value3
"""
    file_obj = io.BytesIO(csv_content.encode('utf-8'))
    
    # First detect encoding
    encoding = _detect_encoding(file_obj)
    # Then detect delimiter
    delimiter = _detect_delimiter(file_obj, encoding)
    
    assert delimiter == ','
    
    # Test TSV content
    tsv_content = """column1\tcolumn2\tcolumn3
value1\tvalue2\tvalue3
"""
    file_obj = io.BytesIO(tsv_content.encode('utf-8'))
    
    # First detect encoding
    encoding = _detect_encoding(file_obj)
    # Then detect delimiter
    delimiter = _detect_delimiter(file_obj, encoding)
    
    assert delimiter == '\t'

@patch('backend.utils.robust_etl.get_logger')
def test_etl_to_chart_payload_basic(mock_get_logger, sample_csv_data):
    """Test the main ETL function with a simple CSV."""
    # Setup mock logger
    mock_logger = MagicMock()
    mock_get_logger.return_value = mock_logger
    
    # Run ETL
    result = etl_to_chart_payload(sample_csv_data, original_filename="test.csv")
    
    # Check structure
    assert not result["error"]
    assert "sheets" in result
    assert "Sheet1" in result["sheets"]
    assert "fileMetadata" in result
    assert "duration" in result["fileMetadata"]
    
    # Check data
    sheet_data = result["sheets"]["Sheet1"]
    assert sheet_data["tableCount"] > 0
    assert len(sheet_data["tables"]) > 0

@patch('backend.utils.robust_etl.get_logger')
def test_etl_with_empty_file(mock_get_logger):
    """Test ETL with an empty file."""
    # Setup mock logger
    mock_logger = MagicMock()
    mock_get_logger.return_value = mock_logger
    
    # Create empty file
    empty_data = io.BytesIO(b"")
    
    # Run ETL - should handle gracefully
    result = etl_to_chart_payload(empty_data, original_filename="empty.csv")
    
    # Should return error
    assert result["error"]
    assert "errorType" in result

if __name__ == "__main__":
    pytest.main(["-xvs", __file__]) 