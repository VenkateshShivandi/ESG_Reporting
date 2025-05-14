# Excel/CSV Direct Processing Endpoint

This document describes the direct whole-file ETL (Extract, Transform, Load) approach for processing Excel and CSV files.

## Overview

We've removed the previous chunking workflow in favor of a more streamlined direct processing approach. This new implementation:

1. Downloads Excel/CSV files directly from Supabase Storage
2. Processes them entirely in memory using pandas
3. Returns the processed data directly to the frontend as a JSON payload
4. Eliminates database reads/writes for individual chunks

## New Backend Endpoints

### 1. `GET /api/analytics/excel-data`

Processes an Excel or CSV file directly from Supabase storage and returns the processed data.

**Parameters:**
- `file_name` (required): The name of the file to process

**Response:**
```json
{
  "barChart": [...],
  "lineChart": [...],
  "donutChart": [...],
  "tableData": [...],
  "metadata": {
    "filename": "example.xlsx",
    "rowCount": 100,
    "columnCount": 5,
    "categoricalColumns": ["category", "region"],
    "numericalColumns": ["value", "count", "amount"],
    "columns": ["category", "region", "value", "count", "amount"]
  }
}
```

### 2. `GET /api/analytics/excel-files`

Lists available Excel and CSV files from Supabase storage.

**Response:**
```json
{
  "excel": [
    {"name": "data.xlsx", "path": "data.xlsx", "size": 12345, "modified": "2023-05-01T12:00:00Z"},
    {"name": "report.xlsx", "path": "report.xlsx", "size": 67890, "modified": "2023-06-15T09:30:00Z"}
  ],
  "csv": [
    {"name": "data.csv", "path": "data.csv", "size": 5678, "modified": "2023-07-01T14:45:00Z"}
  ]
}
```

## Frontend Implementation

The frontend has been updated to:

1. Keep its existing client-side Excel processing logic (using SheetJS)
2. Add a fallback to the new backend API if client-side processing fails
3. Use the new direct endpoints for better performance and reliability

## Data Flow

### Previous Flow:
1. Upload to Supabase Storage
2. Download file to frontend
3. Chunk data
4. Store chunks in database
5. Read chunks from database
6. Reassemble data for visualization

### New Flow:
1. Upload to Supabase Storage
2. **Option A** (Client-side):
   - Download file to frontend
   - Process directly in the browser using SheetJS
   - Visualize the data
3. **Option B** (Server-side fallback):
   - Backend downloads file from Supabase Storage
   - Processes with pandas
   - Returns processed data to frontend
   - Frontend visualizes the data

## Benefits

1. **Simplified architecture:** Removed unnecessary database operations
2. **Improved performance:** Faster processing without chunking overhead
3. **Reduced storage requirements:** No duplicate data in chunks table
4. **Better error handling:** Clearer error messages from direct processing
5. **More consistent data:** No risk of partial chunk loading or reassembly errors

## Testing

A test script is provided in `backend/test_direct_excel.py` to validate the functionality:

```bash
python test_direct_excel.py --email your@email.com --password yourpassword --backend http://localhost:5050 --file example.xlsx
```

This script:
1. Authenticates with Supabase
2. Lists available Excel/CSV files
3. Processes a specified file (or the first available one)
4. Reports processing time and response size

## Important Notes

- The maximum file size is limited by the available memory on the server
- The JSON response is limited to ~100KB for optimal performance
- Authentication and ACLs remain unchanged from the previous implementation
- This approach is optimized for analytics visualization, not for full-text search 