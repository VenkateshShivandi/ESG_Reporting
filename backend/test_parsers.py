"""
Test script for the document parsers

This script demonstrates how to use the file parsers.
It takes a file path as input and parses it using the appropriate parser.

Usage:
    python test_parsers.py <file_path>
"""

import os
import sys
import json
import logging
from datetime import datetime

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Try to import the parsers module
try:
    from parsers import parse_file, parse_pdf, parse_excel, parse_docx, parse_pptx, parse_csv, parse_image, parse_xml
    PARSERS_AVAILABLE = True
except ImportError as e:
    PARSERS_AVAILABLE = False
    logger.error(f"Error importing parsers: {str(e)}")

def get_parser_for_file(file_path):
    """
    Get the appropriate parser for a file based on its extension.
    
    Args:
        file_path (str): Path to the file
        
    Returns:
        callable: The parser function for the file type
    """
    # Check if parsers module is available
    if not all([parse_pdf, parse_excel, parse_docx, parse_pptx, parse_csv, parse_image, parse_xml]):
        logger.error("Parser modules not available")
        return None
    
    # Get file extension
    _, ext = os.path.splitext(file_path)
    ext = ext.lower()[1:]  # Remove the dot
    
    # Select parser based on file extension
    if ext == 'pdf':
        return parse_pdf
    elif ext in ['xlsx', 'xls']:
        return parse_excel
    elif ext == 'docx':
        return parse_docx
    elif ext == 'pptx':
        return parse_pptx
    elif ext == 'csv':
        return parse_csv
    elif ext in ['jpg', 'jpeg', 'png']:
        return parse_image
    elif ext in ['xml', 'xhtml', 'svg', 'rss']:
        return parse_xml
    else:
        # Try the generic parser
        try:
            return parse_file
        except:
            logger.error(f"No parser available for file type: {ext}")
            return None

def save_result_to_file(result, output_path):
    """
    Save the parsing result to a JSON file.
    
    Args:
        result (dict): The parsing result
        output_path (str): Path to save the result to
    """
    try:
        # Replace deprecated pandas.io.json.dumps with standard json.dumps
        try:
            import pandas as pd
            # Updated to use pandas.json.dumps instead of pd.io.json.dumps (API change in newer pandas)
            try:
                result = json.loads(pd.json.dumps(result))
            except AttributeError:
                # Fallback for older pandas versions
                try:
                    result = json.loads(pd.io.json.dumps(result))
                except AttributeError:
                    # Handle numpy arrays or other non-standard types as strings
                    class CustomEncoder(json.JSONEncoder):
                        def default(self, obj):
                            return str(obj)
                    result = json.loads(json.dumps(result, cls=CustomEncoder))
        except ImportError:
            pass
            
        # Use standard JSON serialization with custom encoder
        class CustomEncoder(json.JSONEncoder):
            def default(self, obj):
                return str(obj)
                
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, cls=CustomEncoder, indent=2, ensure_ascii=False)
            
        logger.info(f"Result saved to {output_path}")
    except Exception as e:
        logger.error(f"Error saving result: {str(e)}")

def main():
    """
    Main function to parse a file and display the result.
    """
    if not PARSERS_AVAILABLE:
        logger.error("Parsers are not available. Please check your installation.")
        sys.exit(1)
    
    if len(sys.argv) < 2:
        print(f"Usage: python {os.path.basename(__file__)} <file_path>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    if not os.path.isfile(file_path):
        logger.error(f"File not found: {file_path}")
        sys.exit(1)
    
    # Get the appropriate parser
    parser = get_parser_for_file(file_path)
    
    # Parse the file
    logger.info(f"Parsing {file_path}...")
    try:
        result = parser(file_path)
    except Exception as e:
        logger.error(f"Error parsing file: {str(e)}", exc_info=True)
        sys.exit(1)
    
    # Display result information
    if "error" in result:
        logger.error(f"Error: {result['error']}")
    else:
        logger.info(f"Successfully parsed {file_path}")
        
        # Display basic information based on file type
        metadata = result.get("metadata", {})
        
        # Print basic metadata
        print("\nFile Information:")
        print(f"Filename: {metadata.get('filename', os.path.basename(file_path))}")
        print(f"Filesize: {metadata.get('filesize', os.path.getsize(file_path))} bytes")
        
        # Print content information based on file type
        if "text" in result:
            text_preview = result["text"][:500] + "..." if len(result["text"]) > 500 else result["text"]
            print(f"\nText Preview:\n{text_preview}")
        
        if "sheets" in result:
            print(f"\nSheets: {', '.join(result['sheets'].keys())}")
            
        if "tables" in result:
            print(f"\nTables found: {len(result['tables'])}")
            
        if "slides" in result:
            print(f"\nSlides: {len(result['slides'])}")
    
    # Save the result to a JSON file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_path = f"{file_path}_{timestamp}.json"
    save_result_to_file(result, output_path)

if __name__ == "__main__":
    main() 