import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client if needed, or ensure it's configured elsewhere
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Define interfaces for the expected API response structure
export interface TableMetadata {
  columns: string[];
  numericalColumns: string[];
  categoricalColumns: string[];
  dateColumns?: string[]; // Optional based on backend logic
  yearColumns?: string[];  // Optional based on backend logic
  detectedHeaders?: string[]; // Headers detected by ETL
  excelRange?: string;      // Excel range like 'A1:F10'
  startRow?: number;
  endRow?: number;
  startCol?: number;
  endCol?: number;
}

export interface ChartPayload {
  barChart?: { name: string; value: number }[];
  lineChart?: { name: string; value: number }[];
  donutChart?: { name: string; value: number }[];
  scatterPlot?: { x: number; y: number; name?: string }[]; // Added scatter plot
}

export interface TableData {
  headers: string[];
  rows: Record<string, any>[]; // Array of row objects
}

export interface ProcessedTable {
  id: number; // Index or unique ID for the table
  meta: TableMetadata;
  chartData: ChartPayload;
  tableData: TableData; // Changed from array of objects to { headers, rows }
  stats?: Record<string, any>; // Optional stats
  processingStatus: 'success' | 'partial' | 'failed';
  processingMessage?: string;
}

export interface FileMetadata {
  filename: string;
  duration: number;
}

// Updated interface for the structured response from /api/analytics/excel-data
export interface ExcelAnalyticsResponse {
  tables: ProcessedTable[];
  tableCount: number;
  fileMetadata: FileMetadata;
  error?: boolean;
  errorType?: string;
  message?: string;
  errorDetails?: string;
}

/**
 * Fetches and processes Excel/CSV data from the backend.
 * Calls the /api/analytics/excel-data endpoint which now uses robust multi-table ETL.
 *
 * @param {string} fileName - The name of the file in Supabase storage to process.
 * @returns {Promise<ExcelAnalyticsResponse>} - A promise that resolves with the structured analytics data.
 * @throws {Error} - Throws an error if the API call fails or returns an error status.
 */
export const fetchExcelData = async (fileName: string): Promise<ExcelAnalyticsResponse> => {
  console.log(`[API Lib] Calling fetchExcelData for: ${fileName}`);
  const endpoint = `/api/analytics/excel-data?file_name=${encodeURIComponent(fileName)}`;
  
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Include Authorization header if required by your backend
        // 'Authorization': `Bearer ${your_auth_token}` 
      },
    });

    console.log(`[API Lib] Response status for ${fileName}: ${response.status}`);

    if (!response.ok) {
      let errorBody: any = null; // Use 'any' to handle unknown error structures
      try {
        errorBody = await response.json();
        console.error(`[API Lib] Error response body for ${fileName}:`, errorBody);
      } catch (e) {
        console.error(`[API Lib] Failed to parse error response body for ${fileName}. Status text: ${response.statusText}`);
      }
      // Safely access potential error properties
      const errorMessage = errorBody?.error ?? errorBody?.message ?? `API request failed with status ${response.status}: ${response.statusText}`;
      console.error(`[API Lib] Error fetching data for ${fileName}: ${errorMessage}`);
      // Throw an error that includes the structured error if available
      const error = new Error(errorMessage) as any;
      error.response = errorBody; // Attach the full error response if available
      error.status = response.status;
      throw error;
    }

    const result: ExcelAnalyticsResponse = await response.json();
    console.log(`[API Lib] Successfully fetched and parsed data for ${fileName}. Table count: ${result.tableCount}`);
    console.log('[API Lib] Full parsed result:', JSON.stringify(result, null, 2)); // Log the full structured result

    // Perform basic validation on the response structure
    if (!result || !Array.isArray(result.tables) || typeof result.tableCount !== 'number') {
      console.error('[API Lib] Invalid response structure received:', result);
      throw new Error('Invalid API response structure received from /api/analytics/excel-data');
    }

    // Log details about each processed table
    result.tables.forEach((table, index) => {
      console.log(`[API Lib] Table ${index + 1} details:`, {
        id: table.id,
        status: table.processingStatus,
        range: table.meta.excelRange,
        headers: table.tableData?.headers?.length ?? 0, // Add nullish coalescing
        rows: table.tableData?.rows?.length ?? 0,    // Add nullish coalescing
        charts: Object.keys(table.chartData ?? {}).filter(key => {
          const chartKey = key as keyof ChartPayload;
          // Ensure table.chartData exists before accessing its properties
          return (table.chartData?.[chartKey]?.length ?? 0) > 0;
        }),
      });
    });

    return result;

  } catch (error) {
    console.error(`[API Lib] Network or parsing error in fetchExcelData for ${fileName}:`, error);
    // Re-throw the error so the calling component can handle it
    // If it's an error thrown from the !response.ok block, it might already have status/response attached
    throw error instanceof Error ? error : new Error('An unknown error occurred during the API call.');
  }
};

// Keep fetchExcelFiles as is, assuming it's still needed
export const fetchExcelFiles = async (): Promise<{ excel: any[], csv: any[] }> => {
  console.log('[API Lib] Calling fetchExcelFiles');
  const endpoint = '/api/analytics/excel-files';

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add Authorization if needed
      },
    });

    console.log(`[API Lib] Response status for fetchExcelFiles: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API Lib] Error fetching file list: ${errorText}`);
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log(`[API Lib] Successfully fetched file list. Excel: ${result?.excel?.length || 0}, CSV: ${result?.csv?.length || 0}`);
    return result;

  } catch (error) {
    console.error('[API Lib] Network or parsing error in fetchExcelFiles:', error);
    throw error instanceof Error ? error : new Error('An unknown error occurred while fetching file list.');
  }
}; 