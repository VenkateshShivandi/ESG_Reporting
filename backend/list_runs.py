#!/usr/bin/env python
"""
Script to list all ETL runs.

This script provides a convenient way to view information about
all ETL runs and their output files.
"""

import os
import sys
import json
import argparse
from datetime import datetime
from pathlib import Path

def list_documents(chunks_dir):
    """List all documents that have been processed."""
    chunks_path = Path(chunks_dir)
    if not chunks_path.exists():
        print(f"Chunks directory not found: {chunks_dir}")
        return []
    
    docs = []
    for item in chunks_path.iterdir():
        if item.is_dir():
            docs.append(item.name)
    
    return sorted(docs)

def list_runs(document_dir):
    """List all runs for a specific document."""
    doc_path = Path(document_dir)
    if not doc_path.exists():
        print(f"Document directory not found: {document_dir}")
        return []
    
    # Check if there's a manifest file
    manifest_path = doc_path / f"{doc_path.name}_manifest.json"
    if manifest_path.exists():
        try:
            with open(manifest_path, 'r', encoding='utf-8') as f:
                manifest = json.load(f)
            
            print(f"\nManifest found for document: {doc_path.name}")
            print(f"Total runs: {manifest.get('total_runs', 0)}")
            print(f"Last updated: {manifest.get('last_updated', 'Unknown')}")
            
            if 'runs' in manifest and manifest['runs']:
                print("\nRuns:")
                for i, run in enumerate(manifest['runs']):
                    timestamp = run.get('readable_timestamp', 'Unknown')
                    chunks = run.get('total_chunks', 0)
                    output_path = run.get('output_path', 'Unknown')
                    print(f"  {i+1}. {timestamp} - {chunks} chunks")
                    print(f"     Output: {output_path}")
                
                return manifest['runs']
        except Exception as e:
            print(f"Error reading manifest: {e}")
    
    # If no manifest, try to find runs directly
    runs = []
    for item in doc_path.iterdir():
        if item.is_dir() and not item.name.startswith('.'):
            # Check if this is a run directory (should have timestamps in name)
            if '-' in item.name and item.name.count('-') >= 5:  # Date format has at least 5 dashes
                runs.append({
                    'readable_timestamp': item.name,
                    'path': str(item)
                })
    
    if runs:
        print("\nRuns found (no manifest):")
        for i, run in enumerate(runs):
            print(f"  {i+1}. {run['readable_timestamp']}")
            print(f"     Path: {run['path']}")
    
    return runs

def main():
    parser = argparse.ArgumentParser(description="List ETL runs")
    parser.add_argument("--chunks-dir", default="output/chunks", help="Directory containing chunk outputs")
    parser.add_argument("--document", help="Specific document to view runs for")
    args = parser.parse_args()
    
    # Get absolute path to chunks directory
    if not os.path.isabs(args.chunks_dir):
        chunks_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), args.chunks_dir)
    else:
        chunks_dir = args.chunks_dir
    
    if args.document:
        document_dir = os.path.join(chunks_dir, args.document)
        runs = list_runs(document_dir)
        
        # Check if there's a LATEST_RUN.txt file
        latest_marker = os.path.join(document_dir, "LATEST_RUN.txt")
        if os.path.exists(latest_marker):
            print("\nLatest run marker found:")
            with open(latest_marker, 'r') as f:
                marker_content = f.read()
            print(marker_content)
    else:
        # List all documents
        docs = list_documents(chunks_dir)
        if docs:
            print("\nAvailable documents:")
            for i, doc in enumerate(docs):
                print(f"  {i+1}. {doc}")
            
            print("\nTo view runs for a specific document:")
            print(f"  python {sys.argv[0]} --document DOCUMENT_NAME")
        else:
            print("No documents found.")

if __name__ == "__main__":
    main() 