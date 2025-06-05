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
  - `unit/`: Unit tests for all backend components and API endpoints

- **data/**: Storage location for input documents
- **output/**: Storage location for processed results

## Main Components

- `esg_pdf_etl.py`: The main ETL (Extract-Transform-Load) pipeline for processing PDF documents
  - Extracts text and tables from PDFs using multiple libraries
  - Transforms content into semantically meaningful chunks
  - Loads processed data for downstream use

- `app.py`: The main Flask application providing API endpoints for:
  - File upload and management
  - Document processing
  - ESG data analytics
  - Search functionality
  - Chatbot integration

## Testing

The backend includes a comprehensive test suite covering the core functionality:

- **Unit Tests**: Located in `tests/unit/`, testing individual components and utilities
- **API Tests**: Independent test modules that use mock Flask applications to test endpoints
  - `test_basic_api.py`: Basic API endpoints (status, user profile)
  - `test_file_management_api.py`: File operations (upload, list, delete)
  - `test_document_processing_api.py`: Document processing and metadata
  - `test_analytics_and_chat_api.py`: Analytics metrics and chatbot functionality

### API Testing Strategy

The API tests use a standalone approach that doesn't require actual database or cloud storage connections. Each test file:

1. Creates its own independent Flask application
2. Implements mock routes that mirror the real API behavior
3. Simulates authentication and authorization flows
4. Mocks external dependencies (databases, file storage, etc.)
5. Tests both success cases and error handling

This approach provides several key benefits:

- **Isolated Testing**: Tests run independently without needing actual infrastructure
- **Fast Execution**: No connection overhead to external systems  
- **Developer-Friendly**: Tests can be run locally without complex setup
- **CI/CD Integration**: Easy to automate in continuous integration workflows
- **Maintainability**: API contract changes are immediately visible in tests

### Running the Tests

To run the tests:

```bash
cd backend
python -m pytest tests/unit -v
```

For Windows users, a convenience batch script is provided:

```cmd
cd backend\tests\unit
.\run_tests.bat
```

Options:
- `-f <filename>` - Run tests in a specific file
- `-t <testname>` - Run a specific test
- `-v` - Verbose output

For more details on testing, see the [Testing README](backend/tests/unit/README.md).

## Development and Testing Workflow

The recommended workflow for API development is:

1. Define the API endpoint and expected behavior
2. Create or update the corresponding test file
3. Implement the API endpoint in the application
4. Run the tests to ensure the implementation meets requirements
5. Document any changes in the appropriate README

This test-driven approach ensures that all API endpoints have validation, good error handling, and consistent behavior.

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

