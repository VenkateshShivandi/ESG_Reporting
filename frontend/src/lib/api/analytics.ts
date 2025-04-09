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