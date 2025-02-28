import PyPDF2
from datetime import datetime
import re
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def process_pdf(file_path):
    """
    Process PDF file to extract metadata and content.
    
    Args:
        file_path (str): Path to the PDF file
    
    Returns:
        dict: Dictionary containing processing results
    
    Raises:
        Exception: If any error occurs during processing
    """
    try:
        # Open PDF file in read-binary mode
        with open(file_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            num_pages = len(reader.pages)
            logging.info(f"Successfully loaded PDF with {num_pages} pages")

            # Extract preview text from first page (first 500 characters)
            first_page_text = reader.pages[0].extract_text()[:500] + "..." if num_pages > 0 else ""
            logging.info("Extracted preview text from first page")

            # Get PDF metadata
            metadata = reader.metadata
            creation_date = None

            # Handle creation date parsing
            if metadata and '/CreationDate' in metadata:
                raw_date = metadata['/CreationDate']
                logging.info(f"Raw creation date found: {raw_date}")
                try:
                    # Remove 'D:' prefix if present
                    date_str = raw_date[2:] if raw_date.startswith('D:') else raw_date

                    # Extract date components using regex
                    match = re.search(r'(\d{14})', date_str)
                    if match:
                        # Parse standard format (YYYYMMDDHHMMSS)
                        date_part = match.group(1)
                        creation_date = datetime.strptime(date_part, "%Y%m%d%H%M%S")
                        logging.info(f"Parsed creation date: {creation_date}")
                    else:
                        # Handle alternative formats (with or without timezone)
                        clean_date = date_str.strip("'")
                        try:
                            # Try parsing with timezone first
                            creation_date = datetime.strptime(clean_date, "%Y%m%d%H%M%S%z")
                            logging.info(f"Parsed creation date with timezone: {creation_date}")
                        except ValueError:
                            # Fallback to without timezone
                            creation_date = datetime.strptime(clean_date, "%Y%m%d%H%M%S")
                            logging.info(f"Parsed creation date without timezone: {creation_date}")
                except ValueError as e:
                    logging.error(f"Failed to parse creation date: {e}")
                    creation_date = None
                except Exception as e:
                    logging.error(f"Unexpected error parsing creation date: {e}")
                    creation_date = None
            else:
                logging.warning("No creation date found in metadata")

            # Prepare result dictionary
            result = {
                'type': 'pdf',
                'pages': num_pages,
                'preview': first_page_text,
                'metadata': {
                    'title': metadata.get('/Title', None) if metadata else None,
                    'author': metadata.get('/Author', None) if metadata else None,
                    'creation_date': creation_date.strftime('%Y-%m-%d') if creation_date else None
                },
                'processed_at': datetime.now().isoformat()
            }
            logging.info("PDF processing completed successfully")
            return result

    except Exception as e:
        logging.error(f"Error processing PDF: {e}")
        raise