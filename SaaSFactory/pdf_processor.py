try:
    import PyPDF2
except ImportError:
    print("PyPDF2 is not installed. Please add it to your requirements.txt file.")
    raise

from backend.logger import get_logger

logger = get_logger(__name__)

def process_pdfs(uploaded_files):
    processed_files = []
    for uploaded_file in uploaded_files:
        logger.info(f"Processing uploaded PDF file: {uploaded_file.name}")
        try:
            pdf_reader = PyPDF2.PdfReader(uploaded_file)
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text()
            processed_files.append({"name": uploaded_file.name, "content": text})
            logger.info(f"PDF {uploaded_file.name} processed successfully")
        except Exception as e:
            logger.error(f"Error processing PDF {uploaded_file.name}: {str(e)}")
    
    if not processed_files:
        logger.warning("No PDFs were successfully processed")
    
    return processed_files
