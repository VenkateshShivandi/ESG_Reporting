import pytest
import json
from flask import Flask, jsonify, request
from unittest.mock import patch, MagicMock
from functools import wraps
import io

# Create a test Flask app
app = Flask(__name__)

# Mock authentication decorator
def mock_require_auth(f):
    """Mock authentication decorator for testing."""
    @wraps(f)
    def decorated(*args, **kwargs):
        # Simulating what the auth decorator would do
        request.user = {
            'id': 'test-user-id',
            'email': 'test@example.com',
            'role': 'user',
            'app_metadata': {'provider': 'email'}
        }
        return f(*args, **kwargs)
    return decorated

# Add analytics endpoints
@app.route('/api/analytics/metrics', methods=['GET'])
@mock_require_auth
def get_metrics():
    """Endpoint to get ESG metrics and KPIs."""
    # Return mocked metrics
    metrics = {
        'environmental': {
            'carbon_emissions': {'value': 1250.5, 'unit': 'tons', 'trend': -5.2},
            'energy_consumption': {'value': 45000, 'unit': 'kWh', 'trend': -2.1},
            'waste_management': {'value': 85.5, 'unit': 'tons', 'trend': -10.0},
        },
        'social': {
            'employee_satisfaction': {'value': 4.2, 'unit': 'score', 'trend': 0.3},
            'diversity_ratio': {'value': 42, 'unit': 'percent', 'trend': 5.0},
            'training_hours': {'value': 1200, 'unit': 'hours', 'trend': 15.0},
        },
        'governance': {
            'board_diversity': {'value': 38, 'unit': 'percent', 'trend': 8.0},
            'compliance_rate': {'value': 98.5, 'unit': 'percent', 'trend': 1.5},
            'risk_assessment': {'value': 4.5, 'unit': 'score', 'trend': 0.2},
        },
    }
    return jsonify(metrics), 200

@app.route('/api/analytics/data-chunks', methods=['GET'])
@mock_require_auth
def get_data_chunks():
    """Endpoint to get available data chunks for chart generation."""
    # Return mocked data chunks
    chunks = [
        {
            'id': 'carbon_emissions_2023',
            'name': 'Carbon Emissions 2023',
            'description': 'Monthly carbon emissions data for 2023',
            'category': 'Environmental',
            'updated_at': '2023-01-01T00:00:00Z',
        },
        {
            'id': 'energy_consumption_quarterly',
            'name': 'Energy Consumption (Quarterly)',
            'description': 'Quarterly energy consumption over the past 3 years',
            'category': 'Environmental',
            'updated_at': '2023-01-01T00:00:00Z',
        },
        {
            'id': 'diversity_metrics_2023',
            'name': 'Diversity Metrics 2023',
            'description': 'Diversity statistics across departments',
            'category': 'Social',
            'updated_at': '2023-01-01T00:00:00Z',
        },
    ]
    return jsonify(chunks), 200

@app.route('/api/analytics/data-chunks/<chunk_id>', methods=['GET'])
@mock_require_auth
def get_data_chunk(chunk_id):
    """Endpoint to get chart data for a specific data chunk."""
    # Mock responses based on chunk_id
    if chunk_id == 'carbon_emissions_2023':
        chart_data = {
            'title': 'Carbon Emissions 2023',
            'type': 'bar',
            'labels': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            'series': [
                {
                    'name': 'Office Emissions',
                    'data': [42, 38, 35, 40, 36, 33, 34, 31, 35, 32, 29, 25],
                },
                {
                    'name': 'Manufacturing',
                    'data': [65, 59, 80, 81, 56, 55, 60, 58, 56, 52, 49, 48],
                },
            ],
        }
    elif chunk_id == 'energy_consumption_quarterly':
        chart_data = {
            'title': 'Energy Consumption (Quarterly)',
            'type': 'line',
            'labels': ['Q1 2021', 'Q2 2021', 'Q3 2021', 'Q4 2021', 'Q1 2022', 'Q2 2022', 'Q3 2022', 'Q4 2022'],
            'series': [
                {
                    'name': 'Electricity (kWh)',
                    'data': [48000, 46500, 47200, 45800, 44900, 43500, 42800, 41200],
                },
            ],
        }
    else:
        chart_data = {
            'title': 'Sample Data',
            'type': 'bar',
            'labels': ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
            'series': [
                {'name': 'Series 1', 'data': [40, 30, 20, 27, 18]},
                {'name': 'Series 2', 'data': [24, 13, 98, 39, 48]},
            ],
        }
    
    return jsonify(chart_data), 200

@app.route('/api/analytics/trends', methods=['GET'])
@mock_require_auth
def get_trends():
    """Endpoint to get ESG metric trends over time."""
    period = request.args.get('period', 'yearly')
    metric = request.args.get('metric', 'all')
    
    # Mock response
    trends = {
        'timeline': ['2023-Q1', '2023-Q2', '2023-Q3', '2023-Q4'],
        'metrics': {
            'carbon_emissions': [1300, 1280, 1265, 1250.5],
            'energy_consumption': [48000, 47000, 46000, 45000],
            'waste_management': [95, 92, 88, 85.5],
        },
        'benchmarks': {
            'industry_average': {
                'carbon_emissions': 1400,
                'energy_consumption': 50000,
                'waste_management': 100,
            }
        },
    }
    return jsonify(trends), 200

@app.route('/api/analytics/reports', methods=['GET'])
@mock_require_auth
def get_reports():
    """Endpoint to get generated ESG reports."""
    # Mock response
    recent_reports = [
        {
            'id': 'rep_001',
            'name': 'Q4 2023 ESG Report',
            'type': 'GRI',
            'generated_at': '2023-12-15T10:30:00Z',
            'status': 'completed',
            'files': ['file1', 'file2', 'file3'],
            'metrics': {
                'environmental_score': 82,
                'social_score': 78,
                'governance_score': 91,
            },
        },
        {
            'id': 'rep_002',
            'name': 'Annual Sustainability Report 2023',
            'type': 'SASB',
            'generated_at': '2023-12-01T14:45:00Z',
            'status': 'completed',
            'files': ['file1', 'file4'],
            'metrics': {
                'environmental_score': 79,
                'social_score': 85,
                'governance_score': 88,
            },
        },
    ]
    
    scheduled_reports = [
        {
            'id': 'rep_003',
            'name': 'Q1 2024 ESG Report',
            'type': 'GRI',
            'scheduled_for': '2024-04-15T10:00:00Z',
            'status': 'scheduled',
            'template': 'quarterly_report_template',
            'files': [],
        },
    ]
    
    reports = {
        'recent_reports': recent_reports,
        'scheduled_reports': scheduled_reports,
    }
    
    return jsonify(reports), 200

@app.route('/api/analytics/excel-files', methods=['GET'])
@mock_require_auth
def get_excel_files():
    """Endpoint to get list of Excel and CSV files."""
    # Return mocked file list
    return jsonify({
        "excel": [
            {
                "name": "financial_data.xlsx",
                "path": "financial_data.xlsx",
                "size": 10240,
                "modified": "2023-01-01T12:00:00Z",
            },
            {
                "name": "sustainability_metrics.xlsx",
                "path": "sustainability_metrics.xlsx",
                "size": 8192,
                "modified": "2023-01-02T12:00:00Z",
            }
        ],
        "csv": [
            {
                "name": "carbon_emissions.csv",
                "path": "carbon_emissions.csv",
                "size": 5120,
                "modified": "2023-01-03T12:00:00Z",
            }
        ]
    })

@app.route('/api/analyze-sheet', methods=['POST'])
@mock_require_auth
def analyze_sheet():
    """Endpoint to analyze an Excel/CSV file."""
    # Check if file is in request
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    # Return mocked analysis
    return jsonify({
        "tables": [
            {
                "id": "table1",
                "title": "Carbon Emissions by Department",
                "headers": ["Department", "Q1", "Q2", "Q3", "Q4", "Total"],
                "rows": [
                    ["Engineering", 25.4, 24.8, 23.9, 22.5, 96.6],
                    ["Marketing", 18.2, 17.9, 17.5, 16.8, 70.4],
                    ["Operations", 42.1, 40.5, 39.2, 37.8, 159.6]
                ],
                "chartType": "bar"
            }
        ],
        "tableCount": 1,
        "fileMetadata": {
            "filename": file.filename,
            "duration": 0.85
        }
    })

# Add chat endpoint
@app.route('/api/chat', methods=['POST'])
def chat():
    """Endpoint for chatbot interaction."""
    data = request.get_json()
    message = data.get('data', {}).get('content', '')
    
    if not message:
        return jsonify({'error': 'No message content provided'}), 400
    
    # Mock assistant response
    assistant_response = f"This is a response to your query about: '{message}'. Let me provide some ESG insights related to this topic..."
    
    return jsonify({
        'id': 'msg_123',
        'role': 'assistant',
        'content': assistant_response,
    }), 200

@pytest.fixture
def client():
    """Create a test client for the Flask app."""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

# Analytics tests
def test_get_metrics_endpoint(client):
    """Test the metrics endpoint returns ESG metrics."""
    response = client.get('/api/analytics/metrics')
    
    assert response.status_code == 200
    data = response.json
    
    # Check top-level categories
    assert 'environmental' in data
    assert 'social' in data
    assert 'governance' in data
    
    # Check specific metrics
    assert 'carbon_emissions' in data['environmental']
    assert 'employee_satisfaction' in data['social']
    assert 'board_diversity' in data['governance']
    
    # Check metric structure
    metric = data['environmental']['carbon_emissions']
    assert 'value' in metric
    assert 'unit' in metric
    assert 'trend' in metric

def test_get_data_chunks_endpoint(client):
    """Test the data-chunks endpoint returns available chunks."""
    response = client.get('/api/analytics/data-chunks')
    
    assert response.status_code == 200
    data = response.json
    assert len(data) > 0
    
    # Check chunk structure
    chunk = data[0]
    assert 'id' in chunk
    assert 'name' in chunk
    assert 'description' in chunk
    assert 'category' in chunk
    assert 'updated_at' in chunk

def test_get_data_chunk_endpoint(client):
    """Test the data-chunk endpoint returns chart data for a specific chunk."""
    chunk_id = 'carbon_emissions_2023'
    response = client.get(f'/api/analytics/data-chunks/{chunk_id}')
    
    assert response.status_code == 200
    data = response.json
    
    # Check chart data structure
    assert 'title' in data
    assert 'type' in data
    assert 'labels' in data
    assert 'series' in data
    
    # Check series structure
    series = data['series'][0]
    assert 'name' in series
    assert 'data' in series
    assert len(series['data']) == len(data['labels'])

def test_get_trends_endpoint(client):
    """Test the trends endpoint returns ESG metric trends."""
    response = client.get('/api/analytics/trends')
    
    assert response.status_code == 200
    data = response.json
    
    # Check trends structure
    assert 'timeline' in data
    assert 'metrics' in data
    assert 'benchmarks' in data
    
    # Check metrics
    metrics = data['metrics']
    assert 'carbon_emissions' in metrics
    assert 'energy_consumption' in metrics
    assert len(metrics['carbon_emissions']) == len(data['timeline'])

def test_get_reports_endpoint(client):
    """Test the reports endpoint returns recent and scheduled reports."""
    response = client.get('/api/analytics/reports')
    
    assert response.status_code == 200
    data = response.json
    
    # Check reports structure
    assert 'recent_reports' in data
    assert 'scheduled_reports' in data
    
    # Check recent report structure
    if data['recent_reports']:
        report = data['recent_reports'][0]
        assert 'id' in report
        assert 'name' in report
        assert 'type' in report
        assert 'generated_at' in report
        assert 'status' in report
        assert 'files' in report
        assert 'metrics' in report

def test_get_excel_files_endpoint(client):
    """Test getting Excel and CSV files."""
    response = client.get('/api/analytics/excel-files')
    
    assert response.status_code == 200
    data = response.json
    assert 'excel' in data
    assert 'csv' in data
    assert len(data['excel']) > 0
    assert len(data['csv']) > 0
    
    # Check file structure
    excel_file = data['excel'][0]
    assert 'name' in excel_file
    assert 'path' in excel_file
    assert 'size' in excel_file
    assert 'modified' in excel_file

def test_analyze_sheet_endpoint(client):
    """Test analyzing Excel/CSV file."""
    # Create a mock file
    file_content = b'mock,excel,content'
    response = client.post(
        '/api/analyze-sheet',
        data={
            'file': (io.BytesIO(file_content), 'test.xlsx')
        },
        content_type='multipart/form-data'
    )
    
    assert response.status_code == 200
    data = response.json
    assert 'tables' in data
    assert 'tableCount' in data
    assert 'fileMetadata' in data
    assert len(data['tables']) > 0
    
    # Check table structure
    table = data['tables'][0]
    assert 'id' in table
    assert 'title' in table
    assert 'headers' in table
    assert 'rows' in table

def test_analyze_sheet_no_file(client):
    """Test analyzing without a file."""
    response = client.post('/api/analyze-sheet')
    
    assert response.status_code == 400
    assert 'error' in response.json

# Chat tests
def test_chat_endpoint(client):
    """Test the chat endpoint returns assistant responses."""
    message = 'Tell me about ESG reporting requirements'
    data = {
        'data': {
            'content': message
        }
    }
    
    response = client.post(
        '/api/chat',
        json=data,
        content_type='application/json'
    )
    
    assert response.status_code == 200
    data = response.json
    assert 'id' in data
    assert 'role' in data
    assert data['role'] == 'assistant'
    assert 'content' in data
    assert message in data['content']

def test_chat_endpoint_no_message(client):
    """Test the chat endpoint with no message content."""
    data = {
        'data': {}  # Missing content
    }
    
    response = client.post(
        '/api/chat',
        json=data,
        content_type='application/json'
    )
    
    assert response.status_code == 400
    data = response.json
    assert 'error' in data

if __name__ == "__main__":
    pytest.main(["-v", __file__]) 