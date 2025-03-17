# ESG Reporting Backend

This directory contains the backend services for the ESG Reporting platform, responsible for document parsing, processing, and analytics related to Environmental, Social, and Governance (ESG) reporting.

## Directory Structure

- **config/**: Configuration files, constants, and environment-specific settings
  - `constants.py`: Global constants including ESG keywords and supported file types
  - `settings.py`: Environment-specific settings for development, testing, and production
  - `etl_settings.py`: Settings specific to the ETL pipeline

- **parsers/**: Document parsing modules for different file types
  - `pdf_parser.py`: Core PDF parsing functionality
  - More parsers for other document types will be added here

- **processors/**: Higher-level processing logic that builds on the parsers
  - Additional specialized processors will be added here

- **utils/**: Utility functions used across the application
  - `file_utils.py`: Common file handling utilities

- **tests/**: Test scripts and test data
  - `data/`: Sample data files for testing
  - `test_etl.py`: Tests for the ETL pipeline

- **data/**: Storage location for input documents
- **output/**: Storage location for processed results

## Main Components

- `esg_pdf_etl.py`: The main ETL (Extract-Transform-Load) pipeline for processing PDF documents
  - Extracts text and tables from PDFs using multiple libraries
  - Transforms content into semantically meaningful chunks
  - Loads processed data for downstream use

## PDF Parser Functionality

The PDF parser incorporates a robust multi-method approach to extract and process document content:

### Extraction Capabilities

- **Text Extraction**:
  - Primary method: PyMuPDF (fitz) - Fast and accurate text extraction with layout preservation
  - Fallback methods: pdfminer.six (detailed layout analysis) and PyPDF2 (simple extraction)
  - Automatic selection of the best extraction method based on content quality

- **Table Extraction**:
  - Uses Camelot to identify and extract tabular data
  - Preserves table structure with row/column information
  - Handles complex tables with merged cells and multiple columns

- **Image Extraction**:
  - Extracts images embedded in PDF documents using PyMuPDF
  - Optional saving of extracted images to disk with configurable output directory
  - Maintains metadata about image location, size, and source page

- **OCR Processing**:
  - Optional OCR for text in images using Tesseract
  - Configurable language support for OCR (default: English)
  - Filtering of images based on minimum character count for OCR chunks

### Transformation Features

- **Multilingual Support**:
  - Automatic language detection using langdetect
  - Support for multiple languages including English, Spanish, French, German, and Portuguese
  - Language-specific sentence tokenization
  - Multilingual embedding model (paraphrase-multilingual-MiniLM-L12-v2)

- **Semantic Chunking**:
  - Splits documents into semantically coherent chunks
  - Uses sentence embeddings to identify natural topic transitions
  - Configurable chunk size and similarity thresholds
  - Enhanced retention of document meaning and context

- **Performance Optimizations**:
  - Batched embedding computation for faster processing
  - Configurable batch sizes and embedding dimensions
  - Parallel processing for large documents
  - Comprehensive timing metrics for performance monitoring

### Output and Integration

- **Structured Output**:
  - JSON format for easy integration with downstream systems
  - Includes metadata about the source document
  - Preserves chunk relationships and document structure
  - Optional ESG relevance scoring for each chunk

- **Manifest Generation**:
  - Creates a manifest file summarizing the processing results
  - Includes statistics about extraction methods, chunk counts, and processing time
  - Facilitates tracking and management of processed documents

## Getting Started

1. Ensure all dependencies are installed
2. Configure your environment variables or use defaults in `config/settings.py`
3. Place input documents in the `data/` directory
4. Run the appropriate processor for your needs

## Development Guidelines

- Add new parsers to the `parsers/` directory
- Add new processors to the `processors/` directory
- Place utility functions in the appropriate module in `utils/`
- Update tests when adding new functionality
- Document any new modules or significant changes

