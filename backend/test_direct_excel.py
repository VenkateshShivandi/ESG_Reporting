#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Test script for the new direct Excel processing endpoint.

This script tests the functionality of the whole-file ETL approach for Excel/CSV files.
"""

import os
import sys
import requests
import json
import time
import argparse
from typing import Dict, Any, Optional


def get_token(email: str, password: str) -> Optional[str]:
    """Get an auth token from Supabase."""
    import os
    from dotenv import load_dotenv
    from supabase import create_client

    # Load environment variables
    load_dotenv()
    
    # Get Supabase credentials
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_ANON_KEY")
    
    if not supabase_url or not supabase_key:
        print("Error: Supabase URL or key not found in environment variables.")
        return None
    
    # Create Supabase client
    supabase = create_client(supabase_url, supabase_key)
    
    try:
        # Sign in with email and password
        response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
        
        # Extract and return the token
        token = response.session.access_token
        print(f"✅ Successfully obtained auth token")
        return token
    except Exception as e:
        print(f"❌ Error getting auth token: {str(e)}")
        return None


def test_list_files(backend_url: str, token: str) -> None:
    """Test the Excel files listing endpoint."""
    url = f"{backend_url}/api/analytics/excel-files"
    
    # Make the request
    response = requests.get(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    )
    
    # Check response
    if response.status_code == 200:
        data = response.json()
        excel_count = len(data.get("excel", []))
        csv_count = len(data.get("csv", []))
        
        print(f"✅ Successfully listed files:")
        print(f"   - Excel files: {excel_count}")
        print(f"   - CSV files: {csv_count}")
        
        # Print file names
        if excel_count > 0:
            print("\nExcel files:")
            for file in data.get("excel", []):
                print(f"   - {file['name']}")
        
        if csv_count > 0:
            print("\nCSV files:")
            for file in data.get("csv", []):
                print(f"   - {file['name']}")
        
        return data
    else:
        print(f"❌ Error listing files: {response.status_code}")
        try:
            print(response.json())
        except:
            print(response.text)
        return None


def test_process_excel(backend_url: str, token: str, file_name: str) -> None:
    """Test the Excel processing endpoint."""
    url = f"{backend_url}/api/analytics/excel-data?file_name={file_name}"
    
    start_time = time.time()
    
    # Make the request
    response = requests.get(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    )
    
    end_time = time.time()
    elapsed_time = end_time - start_time
    
    # Check response
    if response.status_code == 200:
        data = response.json()
        
        # Calculate response size
        response_size = len(json.dumps(data).encode('utf-8')) / 1024  # Size in KB
        
        print(f"✅ Successfully processed file: {file_name}")
        print(f"   - Processing time: {elapsed_time:.2f} seconds")
        print(f"   - Response size: {response_size:.2f} KB")
        
        # Print metadata
        if "metadata" in data:
            metadata = data["metadata"]
            print(f"\nMetadata:")
            print(f"   - Row count: {metadata.get('rowCount', 'N/A')}")
            print(f"   - Column count: {metadata.get('columnCount', 'N/A')}")
            print(f"   - Categorical columns: {len(metadata.get('categoricalColumns', []))}")
            print(f"   - Numerical columns: {len(metadata.get('numericalColumns', []))}")
        
        # Print data counts
        print(f"\nData:")
        print(f"   - Bar chart data points: {len(data.get('barChart', []))}")
        print(f"   - Line chart data points: {len(data.get('lineChart', []))}")
        print(f"   - Donut chart data points: {len(data.get('donutChart', []))}")
        print(f"   - Table rows: {len(data.get('tableData', []))}")
        
        # Print a few sample points if available
        if data.get('barChart'):
            print(f"\nSample bar chart data:")
            for i, point in enumerate(data['barChart'][:3]):
                print(f"   - {point}")
                if i >= 2:
                    break
    else:
        print(f"❌ Error processing file: {response.status_code}")
        try:
            print(response.json())
        except:
            print(response.text)


def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Test the direct Excel processing endpoint")
    parser.add_argument("--email", help="Email for authentication")
    parser.add_argument("--password", help="Password for authentication")
    parser.add_argument("--backend", default="http://localhost:5050", help="Backend URL")
    parser.add_argument("--file", help="Specific file name to process (optional)")
    
    args = parser.parse_args()
    
    # Get auth token
    if not args.email or not args.password:
        print("Error: Email and password are required.")
        return
    
    token = get_token(args.email, args.password)
    if not token:
        print("Authentication failed. Exiting.")
        return
    
    # List files
    print("\n=== Testing File Listing ===")
    files_data = test_list_files(args.backend, token)
    
    if not files_data:
        print("File listing failed. Exiting.")
        return
    
    # Process a specific file if provided
    if args.file:
        file_to_process = args.file
        print(f"\n=== Testing Processing for {file_to_process} ===")
        test_process_excel(args.backend, token, file_to_process)
    else:
        # Process the first Excel file if available
        excel_files = files_data.get("excel", [])
        if excel_files:
            file_to_process = excel_files[0]['name']
            print(f"\n=== Testing Processing for {file_to_process} ===")
            test_process_excel(args.backend, token, file_to_process)
        else:
            print("No Excel files found to process.")
            
            # Try a CSV file if available
            csv_files = files_data.get("csv", [])
            if csv_files:
                file_to_process = csv_files[0]['name']
                print(f"\n=== Testing Processing for {file_to_process} ===")
                test_process_excel(args.backend, token, file_to_process)
            else:
                print("No CSV files found to process either.")


if __name__ == "__main__":
    main() 