"""
Extraction module for the ESG PDF ETL Pipeline.

This module handles extracting text, tables, and images from PDF documents.
"""

import os
import logging
import time
from typing import Dict, Any, List, Optional
import PyPDF2
from pdfminer.high_level import extract_pages
from pdfminer.layout import LTTextContainer
import fitz
import camelot
import pandas as pd
import io
from PIL import Image
import pytesseract
import json
from datetime import datetime
import re
import tempfile
import shutil
import sys
from concurrent.futures import ProcessPoolExecutor, as_completed
import multiprocessing

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Try importing PDF processing libraries
PDF_LIBRARIES = {
    "PyPDF2": False,
    "pdfminer": False,
    "PyMuPDF": False,
    "camelot": False
}
try:
    PDF_LIBRARIES["PyPDF2"] = True
except ImportError:
    pass
try:
    PDF_LIBRARIES["pdfminer"] = True
except ImportError:
    pass
try:
    PDF_LIBRARIES["PyMuPDF"] = True
except ImportError:
    pass
try:
    PDF_LIBRARIES["camelot"] = True
except ImportError:
    pass

# Import OCR libraries
try:
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False
    logging.warning("pytesseract or PIL not available. OCR functionality will be disabled.")

# Placeholder for ETL settings (to be replaced with actual config file)
try:
    from config.etl_settings import (
        EXTRACTION_METHODS,
        EXTRACT_IMAGES,
        OCR_IMAGES,
        OCR_LANGUAGE,
        LARGE_DOCUMENT_THRESHOLD,
        ENABLE_PERFORMANCE_OPTIMIZATIONS
    )
except ImportError:
    logging.warning("config.etl_settings not found. Using default values.")
    EXTRACTION_METHODS = ["pymupdf", "camelot", "pymupdf_images"]
    EXTRACT_IMAGES = True
    OCR_IMAGES = False
    OCR_LANGUAGE = "eng"
    LARGE_DOCUMENT_THRESHOLD = 50
    ENABLE_PERFORMANCE_OPTIMIZATIONS = True

if sys.platform == "win32":
    # Windows-specific temp file handling
    os.environ["TEMP"] = os.path.expanduser("~\\AppData\\Local\\Temp")
    tempfile.tempdir = os.environ["TEMP"]

def check_file_exists(file_path: str) -> bool:
    """Check if a file exists and is accessible."""
    return os.path.isfile(file_path) and os.access(file_path, os.R_OK)

def get_file_extension(file_path: str) -> str:
    """Get the extension of a file."""
    _, ext = os.path.splitext(file_path)
    return ext.lower()[1:]  # Remove the dot and convert to lowercase

def is_supported_pdf(file_path: str) -> bool:
    """Check if the file is a supported PDF."""
    if not check_file_exists(file_path):
        return False
    ext = get_file_extension(file_path)
    return ext == "pdf"

def extract_text_with_pypdf2(pdf_path: str) -> Dict[int, str]:
    """Extract text from PDF using PyPDF2 library."""
    if not PDF_LIBRARIES["PyPDF2"]:
        logger.warning("PyPDF2 not available for text extraction")
        return {}
    logger.info(f"Extracting text with PyPDF2 from {pdf_path}")
    text_by_page = {}
    try:
        with open(pdf_path, "rb") as file:
            reader = PyPDF2.PdfReader(file)
            for i, page in enumerate(reader.pages):
                text = page.extract_text()
                if text.strip():  # Only add non-empty pages
                    text_by_page[i] = text
        logger.info(f"Extracted text from {len(text_by_page)} pages with PyPDF2")
        return text_by_page
    except Exception as e:
        logger.error(f"Error extracting text with PyPDF2: {str(e)}")
        return {}

def extract_text_with_pdfminer(pdf_path: str) -> Dict[int, str]:
    """Extract text from PDF using pdfminer.six library."""
    if not PDF_LIBRARIES["pdfminer"]:
        logger.warning("pdfminer.six not available for text extraction")
        return {}
    logger.info(f"Extracting text with pdfminer.six from {pdf_path}")
    text_by_page = {}
    try:
        for i, page_layout in enumerate(extract_pages(pdf_path)):
            page_text = ""
            for element in page_layout:
                if isinstance(element, LTTextContainer):
                    page_text += element.get_text()
            if page_text.strip():  # Only add non-empty pages
                text_by_page[i] = page_text
        logger.info(f"Extracted text from {len(text_by_page)} pages with pdfminer.six")
        return text_by_page
    except Exception as e:
        logger.error(f"Error extracting text with pdfminer.six: {str(e)}")
        return {}

def extract_text_with_pymupdf(pdf_path: str) -> Dict[int, str]:
    """Extract text from PDF using PyMuPDF (fitz) with layout preservation."""
    if not PDF_LIBRARIES["PyMuPDF"]:
        return {}
    text_by_page = {}
    try:
        doc = fitz.open(pdf_path)
        for page_idx in range(doc.page_count):
            page = doc[page_idx]
            page_text = ""
            try:
                dict_text = page.get_text("dict")
                if dict_text and "blocks" in dict_text:
                    for block in dict_text["blocks"]:
                        if "lines" in block:
                            for line in block["lines"]:
                                if "spans" in line:
                                    for span in line["spans"]:
                                        if "text" in span and span["text"].strip():
                                            page_text += span["text"] + " "
                                    page_text += "\n"
            except Exception as e:
                logger.warning(f"Error extracting text in dict mode: {str(e)}")
            if len(page_text.strip()) < 100:
                page_text = page.get_text("text")
            if len(page_text.strip()) < 100:
                html_text = page.get_text("html")
                page_text = re.sub(r"<[^>]+>", " ", html_text.replace("<br>", "\n"))
            text_by_page[page_idx] = page_text
        doc.close()
    except Exception as e:
        logger.warning(f"Error in PyMuPDF extraction: {str(e)}")
    return text_by_page

# Move this function outside of any other function so it can be pickled
def _extract_tables_from_page(page_num, pdf_path):
    """Extract tables from a single page using both lattice and stream methods."""
    try:
        import camelot
        all_tables = []
        extraction_methods = []
        
        # Try lattice method first (grid-based tables) - highest quality
        lattice_tables = camelot.read_pdf(
            pdf_path, pages=str(page_num), flavor='lattice', 
            suppress_stdout=True
        )
        
        if len(lattice_tables) > 0:
            all_tables.extend(lattice_tables)
            extraction_methods.extend(['lattice'] * len(lattice_tables))
        
        # Only try stream method for pages 9-41 (or where we need forms/tables)
        # or if lattice found nothing and it's not in pages 1-8
        if page_num >= 9 or (len(lattice_tables) == 0 and page_num > 8):
            stream_tables = camelot.read_pdf(
                pdf_path, pages=str(page_num), flavor='stream',
                suppress_stdout=True, edge_tol=50
            )
            
            # Apply quality filters to stream tables to avoid false positives
            good_stream_tables = []
            for table in stream_tables:
                # Only keep tables with good accuracy scores and reasonable dimensions
                if (table.parsing_report['accuracy'] > 80 and 
                    len(table.data) >= 3 and  # At least 3 rows
                    len(table.data[0]) >= 2 and  # At least 2 columns
                    not all(cell == '' for row in table.data for cell in row)):  # Not empty
                    good_stream_tables.append(table)
            
            if good_stream_tables:
                all_tables.extend(good_stream_tables)
                extraction_methods.extend(['stream'] * len(good_stream_tables))
            
        # Create the table objects with metadata
        if len(all_tables) > 0:
            results = []
            for t, (table, method) in enumerate(zip(all_tables, extraction_methods)):
                results.append({
                    "id": f"table_{page_num}_{t+1}",
                    "page": page_num,
                    "data": table.data,
                    "rows": len(table.data),
                    "cols": len(table.data[0]) if table.data else 0,
                    "has_header": True if table.data else False,
                    "header": table.data[0] if table.data else [],
                    "extraction_method": method,
                    "confidence": table.parsing_report['accuracy'] if hasattr(table, 'parsing_report') else 100
                })
            return page_num, results
        
        return page_num, []  # No tables found with either method
    except Exception as e:
        logger.warning(f"Error extracting tables from page {page_num}: {str(e)}")
        return page_num, []

def extract_tables_from_pdf(pdf_path, **kwargs):
    """Extract tables from PDF with parallel processing for better performance."""
    try:
        import camelot
        tables_by_page = {}
        page_count = kwargs.get('page_count', 0)
        processed_pages = set()  # Track pages we've processed
        
        # Only use parallelism for documents with multiple pages
        if page_count <= 1:
            # Single-page document - just process directly
            for page in range(1, page_count + 1):
                page_num, tables = _extract_tables_from_page(page, pdf_path)
                if tables:
                    tables_by_page[page_num-1] = tables
            return tables_by_page
        
        # Determine optimal number of workers
        cpu_count = multiprocessing.cpu_count()
        # Use fewer workers to prevent overhead - 4 is often optimal
        num_workers = min(4, max(2, cpu_count - 2))
        logger.info(f"Using {num_workers} parallel workers for table extraction")
        
        # Process in parallel
        with ProcessPoolExecutor(max_workers=num_workers) as executor:
            futures = []
            for page in range(1, page_count + 1):
                futures.append(executor.submit(_extract_tables_from_page, page, pdf_path))
            
            for future in as_completed(futures):
                page_num, tables = future.result()
                processed_pages.add(page_num)  # Mark this page as processed
                
                if tables:
                    logger.info(f"Extracted {len(tables)} tables from page {page_num}")
                    tables_by_page[page_num-1] = tables
                else:
                    logger.debug(f"No tables found on page {page_num}")  # Lower level log for no tables
        
        total_tables = sum(len(tables) for tables in tables_by_page.values())
        logger.info(f"Extracted {total_tables} tables with Camelot using parallel processing")
        
        # If we extracted suspiciously few tables (less than 50% of what we'd expect)
        # and this is a large document (20+ pages), validate a sample of pages
        if total_tables == 0 and page_count > 20:
            logger.warning(f"No tables extracted despite document having {page_count} pages - validating extraction")
            validate_table_extraction(pdf_path, tables_by_page)
        elif total_tables < page_count * 0.25 and page_count > 30:
            # For large docs with few tables, validate to ensure we're not missing content
            logger.warning(f"Only {total_tables} tables found in {page_count} page document - validating extraction")
            validate_table_extraction(pdf_path, tables_by_page)
        
        # Check for missing pages
        missing_pages = set(range(1, page_count + 1)) - processed_pages
        if missing_pages:
            logger.warning(f"Pages potentially not processed: {sorted(missing_pages)}")
        else:
            logger.info(f"All {page_count} pages successfully processed")
        
        # Log pages with no tables found
        pages_with_no_tables = set(range(1, page_count + 1)) - set(p+1 for p in tables_by_page.keys())
        if pages_with_no_tables:
            logger.info(f"Pages with no tables detected: {sorted(pages_with_no_tables)}")
        
        return tables_by_page
    except ImportError:
        logger.warning("Camelot not installed, skipping table extraction")
        return {}
    except Exception as e:
        logger.error(f"Error extracting tables: {str(e)}")
        return {}

def extract_images_with_pymupdf(
    pdf_path: str,
    perform_ocr: bool = True,
    ocr_language: Optional[str] = None,
    min_height: int = 50,
    min_width: int = 50,
    save_images: bool = True,
    output_dir: Optional[str] = None
) -> Dict[int, List[Dict[str, Any]]]:
    """Extract images from PDF using PyMuPDF (fitz)."""
    temp_dir = None  # Initialize here
    try:
        temp_dir = tempfile.mkdtemp()
        if not PDF_LIBRARIES["PyMuPDF"]:
            return {}
        if not os.path.exists(pdf_path):
            return {}
        can_perform_ocr = perform_ocr and OCR_AVAILABLE
        ocr_status = "with OCR" if can_perform_ocr else "without OCR"
        logger.info(f"Extracting images with PyMuPDF {ocr_status}")
        if save_images:
            if output_dir is None:
                pdf_name = os.path.basename(pdf_path).replace(".pdf", "")
                base_dir = os.path.dirname(os.path.abspath(pdf_path))
                output_dir = os.path.join(base_dir, "..", "output", "images", pdf_name)
            image_dir = os.path.join(output_dir, datetime.now().strftime("%Y-%m-%d_%H-%M-%S"))
            os.makedirs(image_dir, exist_ok=True)
            logger.info(f"Saving images to {image_dir}")
        pdf_document = fitz.open(pdf_path)
        result = {}
        image_count = 0
        if can_perform_ocr and ocr_language is None:
            ocr_language = OCR_LANGUAGE
        for page_index in range(len(pdf_document)):
            page = pdf_document.load_page(page_index)
            page_images = []
            try:
                image_list = page.get_images(full=True)
                for img_index, img_info in enumerate(image_list):
                    try:
                        xref = img_info[0]
                        base_image = pdf_document.extract_image(xref)
                        if not base_image:
                            continue
                        image_data = base_image["image"]
                        image_ext = base_image["ext"]
                        image_stream = io.BytesIO(image_data)
                        pil_image = Image.open(image_stream)
                        width, height = pil_image.size
                        if width < min_width or height < min_height:
                            continue
                        img_id = f"p{page_index+1}_img{img_index+1}"
                        image_path = None
                        if save_images:
                            image_filename = f"{img_id}.{image_ext}"
                            image_path = os.path.join(image_dir, image_filename)
                            try:
                                with open(image_path, "wb") as img_file:
                                    img_file.write(image_data)
                            except Exception as img_save_err:
                                logger.warning(f"Error saving image {img_id}: {str(img_save_err)}")
                                image_path = None
                        ocr_text = None
                        if can_perform_ocr:
                            ocr_text = pytesseract.image_to_string(
                                pil_image, lang=ocr_language
                            )
                        image_entry = {
                            "id": img_id,
                            "page": page_index,
                            "width": width,
                            "height": height,
                            "format": image_ext,
                            "has_ocr": ocr_text is not None and len(ocr_text.strip()) > 0
                        }
                        if ocr_text:
                            image_entry["ocr_text"] = ocr_text
                        if image_path:
                            image_entry["image_path"] = image_path
                        page_images.append(image_entry)
                        image_count += 1
                    except Exception as xref_err:
                        logger.debug(f"Error extracting image {img_index} on page {page_index+1}: {str(xref_err)}")
                        continue
            except Exception as page_err:
                logger.debug(f"Error getting images from page {page_index+1}: {str(page_err)}")
                continue
            if page_images:
                result[page_index] = page_images
        pdf_document.close()
        logger.info(f"Extracted {image_count} images with PyMuPDF")
        if save_images and image_count > 0:
            metadata_path = os.path.join(image_dir, "image_metadata.json")
            try:
                with open(metadata_path, "w") as f:
                    json.dump({
                        "source_pdf": pdf_path,
                        "extraction_date": datetime.now().isoformat(),
                        "total_images": image_count,
                        "images_by_page": {str(k): len(v) for k, v in result.items()}
                    }, f, indent=2)
            except Exception as meta_err:
                logger.warning(f"Error saving image metadata: {str(meta_err)}")
        if temp_dir:
            # Windows-specific cleanup with more retries
            for _ in range(7):  # Increased retries
                try:
                    shutil.rmtree(temp_dir)
                    break
                except Exception as e:
                    logger.debug(f"Temp cleanup retry failed: {str(e)}")
                    time.sleep(1)  # Longer delay
        return result
    except Exception as e:
        logger.error(f"Error extracting images with PyMuPDF: {str(e)}")
        return {}

def validate_table_extraction(pdf_path, parallel_tables, sample_pages=5):
    """Validate parallel table extraction by comparing with sequential on sample pages."""
    import random
    import camelot
    
    # Get page count
    doc = fitz.open(pdf_path)
    page_count = len(doc)
    doc.close()
    
    # Select random pages to validate (or first/last few if small document)
    if page_count <= 10:
        validate_pages = list(range(1, page_count + 1))
    else:
        # Take first 2, last 2, and random middle pages
        validate_pages = [1, 2, page_count-1, page_count]
        middle_pages = random.sample(range(3, page_count-1), min(sample_pages-4, page_count-6))
        validate_pages.extend(middle_pages)
    
    logger.info(f"Validating table extraction on {len(validate_pages)} sample pages")
    
    # Extract tables sequentially for these pages
    sequential_tables = {}
    for page in validate_pages:
        try:
            tables = camelot.read_pdf(pdf_path, pages=str(page), flavor='lattice', suppress_stdout=True)
            if len(tables) > 0:
                sequential_tables[page] = len(tables)
                logger.info(f"Validation: Page {page} has {len(tables)} tables (sequential)")
        except Exception as e:
            logger.warning(f"Validation extraction error on page {page}: {str(e)}")
    
    # Compare with parallel results
    differences = 0
    for page in validate_pages:
        parallel_count = len(parallel_tables.get(page-1, []))
        sequential_count = sequential_tables.get(page, 0)
        
        if parallel_count != sequential_count:
            differences += 1
            logger.warning(f"Table count mismatch on page {page}: parallel={parallel_count}, sequential={sequential_count}")
    
    if differences:
        logger.warning(f"Found {differences} pages with table count differences out of {len(validate_pages)} validated")
    else:
        logger.info("Table extraction validation successful - counts match on all sample pages")
    
    return differences == 0

def extract_from_pdf(pdf_path: str, output_dir: Optional[str] = None) -> Dict[str, Any]:
    """Extract content from PDF file - text, tables, and images."""
    result = {
        "status": "success",
        "filename": os.path.basename(pdf_path),
        "metadata": {},
        "text": {},
        "tables": {},
        "images": {}
    }
    if not os.path.exists(pdf_path):
        return {"status": "error", "error": f"File not found: {pdf_path}", "filename": os.path.basename(pdf_path)}
    start_time = time.time()
    extraction_methods = EXTRACTION_METHODS
    if EXTRACT_IMAGES and "pymupdf_images" not in [method.lower() for method in extraction_methods]:
        extraction_methods.append("pymupdf_images")
        logger.info("Added 'pymupdf_images' to extraction methods for image extraction")
    if "pymupdf" in [method.lower() for method in extraction_methods]:
        try:
            result["text"]["pymupdf"] = extract_text_with_pymupdf(pdf_path)
            logger.info(f"Extracted {sum(len(text) for text in result['text']['pymupdf'].values())} characters with PyMuPDF from {len(result['text']['pymupdf'])} pages")
        except Exception as e:
            logger.error(f"Error extracting text with PyMuPDF: {str(e)}")
            result["text"]["pymupdf"] = {}
    if "pdfminer" in [method.lower() for method in extraction_methods]:
        try:
            result["text"]["pdfminer"] = extract_text_with_pdfminer(pdf_path)
            logger.info(f"Extracted text from {len(result['text']['pdfminer'])} pages with pdfminer.six")
            logger.info(f"Extracted {sum(len(text) for text in result['text']['pdfminer'].values())} characters with pdfminer.six")
        except Exception as e:
            logger.error(f"Error extracting text with pdfminer.six: {str(e)}")
            result["text"]["pdfminer"] = {}
    if "pypdf2" in [method.lower() for method in extraction_methods]:
        try:
            result["text"]["pypdf2"] = extract_text_with_pypdf2(pdf_path)
            logger.info(f"Extracted text from {len(result['text']['pypdf2'])} pages with PyPDF2")
            logger.info(f"Extracted {sum(len(text) for text in result['text']['pypdf2'].values())} characters with PyPDF2")
        except Exception as e:
            logger.error(f"Error extracting text with PyPDF2: {str(e)}")
            result["text"]["pypdf2"] = {}
    best_text_extractor = max(
        result["text"].items(), key=lambda x: len(x[1]), default=(None, {})
    )[0]
    result["metadata"]["page_count"] = len(result["text"].get(best_text_extractor, {}))
    result["metadata"]["best_text_extractor"] = best_text_extractor
    if "camelot" in [method.lower() for method in extraction_methods]:
        try:
            result["tables"] = extract_tables_from_pdf(pdf_path, page_count=len(result["text"].get(best_text_extractor, {})))
            table_count = sum(len(tables) for tables in result["tables"].values())
            result["metadata"]["table_count"] = table_count
            logger.info(f"Extracted {table_count} tables with Camelot")
        except Exception as e:
            logger.error(f"Error extracting tables with Camelot: {str(e)}")
            result["tables"] = {}
            result["metadata"]["table_count"] = 0
    if "pymupdf_images" in [method.lower() for method in extraction_methods] and EXTRACT_IMAGES:
        try:
            images_output_dir = output_dir if output_dir else None
            result["images"] = extract_images_with_pymupdf(
                pdf_path, perform_ocr=OCR_IMAGES, ocr_language=OCR_LANGUAGE, save_images=True, output_dir=images_output_dir
            )
            image_count = sum(len(images) for images in result["images"].values())
            result["metadata"]["image_count"] = image_count
            logger.info(f"Extracted {image_count} images with PyMuPDF")
        except Exception as e:
            logger.error(f"Error extracting images with PyMuPDF: {str(e)}")
            result["images"] = {}
            result["metadata"]["image_count"] = 0
    result["metadata"]["extraction_methods"] = extraction_methods
    result["metadata"]["processing_time"] = time.time() - start_time
    if ENABLE_PERFORMANCE_OPTIMIZATIONS and result["metadata"]["page_count"] > LARGE_DOCUMENT_THRESHOLD:
        logger.info(f"Applying performance optimizations for large document ({result['metadata']['page_count']} pages)")
    return result

def extract_document_metadata(pdf_path):
    """Extract comprehensive document metadata from PDF."""
    metadata = {}
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(pdf_path)
        # Basic metadata
        metadata = doc.metadata
        
        # Add document structure metadata
        metadata["toc"] = doc.get_toc()
        metadata["page_count"] = doc.page_count
        
        # Extract document language if available
        if "language" in metadata:
            metadata["primary_language"] = metadata["language"]
            
        # Add document statistics
        word_count = 0
        for page in doc:
            word_count += len(page.get_text("words"))
        metadata["word_count"] = word_count
        
        doc.close()
    except Exception as e:
        logging.warning(f"Failed to extract document metadata: {str(e)}")
    
    return metadata