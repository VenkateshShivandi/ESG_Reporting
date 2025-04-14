import { getAuthToken } from '../auth';

const API_BASE_URL = 'http://localhost:5050';

// Get available data chunks list
export async function fetchDataChunks() {
  try {
    const token = await getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/api/analytics/data-chunks`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error fetching data chunks: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in fetchDataChunks:', error);
    throw error;
  }
}

// Get detailed information for a specific data chunk
export async function fetchChunkData(chunkId: string) {
  if (!chunkId) {
    throw new Error('No chunk ID provided');
  }
  
  try {
    const token = await getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/api/analytics/data-chunks/${chunkId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error fetching chunk data: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in fetchChunkData:', error);
    throw error;
  }
}

// Get analytics metrics
export async function fetchMetrics() {
  try {
    const token = await getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/api/analytics/metrics`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error fetching metrics: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in fetchMetrics:', error);
    throw error;
  }
}

// Get reports list
export async function fetchReports() {
  try {
    const token = await getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/api/analytics/reports`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error fetching reports: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in fetchReports:', error);
    throw error;
  }
}

// Get trend data
export async function fetchTrends(period: string = 'yearly', metric: string = 'all') {
  try {
    const token = await getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/api/analytics/trends?period=${period}&metric=${metric}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error fetching trends: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in fetchTrends:', error);
    throw error;
  }
}

// Get benchmark data
export async function fetchBenchmarks(industry: string = 'technology') {
  try {
    const token = await getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/api/analytics/benchmarks?industry=${industry}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error fetching benchmarks: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in fetchBenchmarks:', error);
    throw error;
  }
}

// Generate report
export async function generateReport(reportConfig: {
  type: string;
  [key: string]: any;
}) {
  try {
    const token = await getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/api/analytics/generate-report`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(reportConfig)
    });
    
    if (!response.ok) {
      throw new Error(`Error generating report: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in generateReport:', error);
    throw error;
  }
}

// Get Excel data for analytics visualization
export async function fetchExcelData(fileName?: string) {
  try {
    const token = await getAuthToken();
    
    const url = fileName 
      ? `${API_BASE_URL}/api/analytics/excel-data?file_name=${encodeURIComponent(fileName)}`
      : `${API_BASE_URL}/api/analytics/excel-data`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error fetching Excel data: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in fetchExcelData:', error);
    // Return mock data for development/testing if the API fails
    return getMockExcelData();
  }
}

// Get available Excel files
export async function fetchExcelFiles() {
  try {
    const token = await getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/api/analytics/excel-files`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error fetching Excel files: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in fetchExcelFiles:', error);
    // Return mock data for development/testing if the API fails
    return {
      excel: [
        { name: 'filtered_age.xlsx', path: 'test_files/filtered_age.xlsx' },
        { name: '2. Relación de evidencias.xlsx', path: 'test_files/2. Relación de evidencias.xlsx' }
      ],
      csv: [
        { name: 'sample1.csv', path: 'test_files/sample1.csv' }
      ]
    };
  }
}

// Get evidence Excel data
export async function fetchEvidenceData() {
  try {
    const token = await getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/api/analytics/evidence-data`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error fetching evidence data: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in fetchEvidenceData:', error);
    // Return empty data for now
    return { data: [] };
  }
}

// Mock data in case the API is not available during development
function getMockExcelData() {
  return {
    "barChart": [
      { "name": "18", "value": 5 },
      { "name": "25", "value": 12 },
      { "name": "30", "value": 18 },
      { "name": "35", "value": 10 },
      { "name": "40", "value": 7 },
      { "name": "45", "value": 3 }
    ],
    "lineChart": [
      { "name": "18", "score": 75, "satisfaction": 3.5 },
      { "name": "25", "score": 82, "satisfaction": 4.0 },
      { "name": "30", "score": 88, "satisfaction": 4.2 },
      { "name": "35", "score": 85, "satisfaction": 4.1 },
      { "name": "40", "score": 79, "satisfaction": 3.8 },
      { "name": "45", "score": 76, "satisfaction": 3.6 }
    ],
    "donutChart": [
      { "name": "Very Satisfied", "value": 42 },
      { "name": "Satisfied", "value": 28 },
      { "name": "Neutral", "value": 16 },
      { "name": "Dissatisfied", "value": 10 },
      { "name": "Very Dissatisfied", "value": 4 }
    ],
    "tableData": [
      { "id": 1, "age": 30, "score": 85, "satisfaction": 4.2 },
      { "id": 2, "age": 25, "score": 78, "satisfaction": 3.9 },
      { "id": 3, "age": 40, "score": 82, "satisfaction": 4.0 },
      { "id": 4, "age": 35, "score": 88, "satisfaction": 4.5 },
      { "id": 5, "age": 28, "score": 79, "satisfaction": 3.8 }
    ]
  };
} 