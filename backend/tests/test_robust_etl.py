import pytest
import pandas as pd
import numpy as np
import io
from flask import Flask
from ..utils.robust_etl import (
    _looks_like_year_cols,
    _classify_columns,
    etl_to_chart_payload,
    _nan_to_none,
    _clean_dataframe,
    _build_chart_payloads
)

# Create a test Flask app
@pytest.fixture
def app():
    app = Flask(__name__)
    app.config['TESTING'] = True
    return app

@pytest.fixture
def app_context(app):
    with app.app_context():
        yield

# Test data fixtures
@pytest.fixture
def sample_df():
    return pd.DataFrame({
        'Year': ['2020', '2021', '2022'],
        'Value': [100, 200, 300],
        'Category': ['A', 'B', 'A'],
        'Date': pd.date_range(start='2020-01-01', periods=3),
        'Mixed': ['100', '200', 'text'],
        'Empty': [np.nan, np.nan, np.nan]
    })

@pytest.fixture
def year_columns_df():
    return pd.DataFrame({
        'ID': ['A', 'B', 'C'],
        '2020': [1, 2, 3],
        '2021': [4, 5, 6],
        '2022': [7, 8, 9]
    })

@pytest.fixture
def problematic_df():
    return pd.DataFrame({
        'Mixed Types': ['1', 2, 'three'],
        'With NaN': [1.0, np.nan, 3.0],
        'Boolean': [True, False, True],
        'Empty': [None, None, None],
        '2023': [10, 20, 30]
    })

# Test _looks_like_year_cols function
def test_looks_like_year_cols():
    # Test valid year columns
    assert _looks_like_year_cols(['2020', '2021', '2022']) == True
    assert _looks_like_year_cols(['Year2020', 'Year2021']) == True
    
    # Test invalid year columns
    assert _looks_like_year_cols(['NotYear', 'AlsoNotYear']) == False
    assert _looks_like_year_cols([]) == False
    assert _looks_like_year_cols(None) == False
    
    # Test mixed columns
    assert _looks_like_year_cols(['2020', 'NotYear']) == False
    
    # Test with numeric values
    assert _looks_like_year_cols([2020, 2021, 2022]) == True  # Should handle numeric inputs
    
    # Test with pandas Index
    df = pd.DataFrame(columns=['2020', '2021', '2022'])
    assert _looks_like_year_cols(df.columns) == True

# Test column classification
def test_classify_columns(app_context, sample_df):
    result = _classify_columns(sample_df)
    
    assert 'Value' in result['numericalColumns']
    assert 'Category' in result['categoricalColumns']
    assert 'Date' in result['dateColumns']
    assert 'Year' in result['yearColumns']
    assert 'Empty' not in result['numericalColumns']
    assert 'Empty' not in result['categoricalColumns']
    
    # Check metrics
    assert result['metrics']['numeric_detected'] >= 1
    assert result['metrics']['categorical_detected'] >= 1
    assert result['metrics']['date_detected'] >= 1
    assert result['metrics']['year_detected'] >= 1

def test_classify_columns_edge_cases(app_context, problematic_df):
    result = _classify_columns(problematic_df)
    
    # Mixed type column should be classified as categorical
    assert 'Mixed Types' in result['categoricalColumns']
    
    # Column with NaN should still be classified if it has valid values
    assert 'With NaN' in result['numericalColumns']
    
    # Boolean column should be categorical
    assert 'Boolean' in result['categoricalColumns']
    
    # Empty column should not be in any classification
    assert 'Empty' not in result['numericalColumns']
    assert 'Empty' not in result['categoricalColumns']
    
    # Year column should be detected
    assert '2023' in result['yearColumns']

# Test chart payload generation
def test_build_chart_payloads(app_context, sample_df):
    meta = _classify_columns(sample_df)
    result = _build_chart_payloads(sample_df, meta)
    
    # Check structure
    assert 'barChart' in result
    assert 'lineChart' in result
    assert 'donutChart' in result
    
    # Check bar chart data
    if len(meta['categoricalColumns']) > 0 and len(meta['numericalColumns']) > 0:
        assert len(result['barChart']) > 0
        assert all(isinstance(item['value'], (int, float)) for item in result['barChart'])
    
    # Check line chart data
    if len(meta['dateColumns']) > 0 or len(meta['yearColumns']) > 0:
        assert len(result['lineChart']) > 0
        assert all(isinstance(item['value'], (int, float)) for item in result['lineChart'])
    
    # Check donut chart data
    if len(meta['categoricalColumns']) > 0:
        assert len(result['donutChart']) > 0
        assert all(isinstance(item['value'], (int, float)) for item in result['donutChart'])

# Test full ETL pipeline
def test_etl_to_chart_payload_success(app_context, sample_df):
    # Convert DataFrame to CSV bytes
    csv_buffer = io.BytesIO()
    sample_df.to_csv(csv_buffer, index=False)
    csv_buffer.seek(0)
    
    # Process the data
    result = etl_to_chart_payload(csv_buffer, original_filename='test.csv')
    
    # Check structure
    assert 'data' in result
    assert 'meta' in result
    assert 'stats' in result
    assert 'chartData' in result
    assert not result.get('error', False)
    
    # Check data content
    assert len(result['data']) > 0
    assert not any('nan' in str(x).lower() for x in result['data'])
    
    # Check stats
    assert result['stats']['rowCount'] == len(sample_df)
    assert result['stats']['columnCount'] == len(sample_df.columns)

def test_etl_to_chart_payload_year_columns(app_context, year_columns_df):
    # Convert DataFrame to CSV bytes
    csv_buffer = io.BytesIO()
    year_columns_df.to_csv(csv_buffer, index=False)
    csv_buffer.seek(0)
    
    # Process the data
    result = etl_to_chart_payload(csv_buffer, original_filename='test.csv')
    
    # Check that year columns were properly detected AFTER potential melting
    # The melt function converts columns like '2020' into rows under a 'Year' column
    assert 'Year' in result['meta']['yearColumns'] 
    assert len(result['meta']['yearColumns']) == 1 # Expecting only the 'Year' column now
    
    # Check that line chart was generated for the melted year data
    assert len(result['chartData']['lineChart']) > 0
    # Check that the names in the line chart correspond to the original year columns
    line_chart_names = {item['name'] for item in result['chartData']['lineChart']}
    assert '2020' in line_chart_names
    assert '2021' in line_chart_names
    assert '2022' in line_chart_names

# Test error handling
def test_etl_error_handling(app_context):
    # Test with empty file
    empty_buffer = io.BytesIO(b'')
    result = etl_to_chart_payload(empty_buffer, original_filename='empty.csv')
    assert result['error'] == True
    assert result['errorType'] == 'empty_file'
    assert 'message' in result
    
    # Test with corrupted data (which pandas might interpret as EmptyDataError)
    bad_buffer = io.BytesIO(b'corrupted,data\n1,2,3\n4,5')  # Inconsistent columns
    print("\nTesting with corrupted data:", bad_buffer.getvalue())
    result = etl_to_chart_payload(bad_buffer, original_filename='bad.csv')
    print("\nResult from corrupted data test:", result)
    assert result['error'] == True
    # Check for either invalid_format (ideal) or empty_file (what pandas seems to raise here)
    assert result['errorType'] in ['invalid_format', 'load_error'] 
    assert 'message' in result
    
    # Test with unsupported file type
    text_buffer = io.BytesIO(b'This is not a CSV file')
    result = etl_to_chart_payload(text_buffer, original_filename='file.txt')
    assert result['error'] == True
    assert 'message' in result
    assert 'errorDetails' in result

def test_nan_handling():
    # Test NaN to None conversion
    data = [
        {'a': np.nan, 'b': 1.0},
        {'a': 2.0, 'b': np.nan},
        {'a': np.inf, 'b': -np.inf}
    ]
    result = _nan_to_none(data)
    
    assert result[0]['a'] is None
    assert result[1]['b'] is None
    assert result[2]['a'] is None  # inf should be converted to None
    assert result[2]['b'] is None  # -inf should be converted to None

def test_clean_dataframe(app_context, problematic_df):
    cleaned_df = _clean_dataframe(problematic_df)
    
    # Check that NaN values are handled
    assert cleaned_df['With NaN'].isna().sum() > 0
    
    # Check that mixed types are preserved
    assert 'Mixed Types' in cleaned_df.columns
    
    # Check that empty columns are preserved
    assert 'Empty' in cleaned_df.columns
    
    # Check that boolean values are preserved
    assert cleaned_df['Boolean'].dtype == bool 