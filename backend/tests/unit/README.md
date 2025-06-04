# ESG Reporting Backend Tests

This directory contains the comprehensive test suite for the ESG Reporting backend components, focusing on document parsing, ETL processes, text analysis, metadata extraction, and API endpoints.

## Test Organization

The test suite is organized by functionality:

- **test_section_hierarchy.py**: Tests for building hierarchical document structure
- **test_pdf_metadata.py**: Tests for extracting metadata from PDF files
- **test_text_utils.py**: Tests for text processing utilities (cleaning, language detection, etc.)
- **test_file_utils.py**: Tests for file handling utilities
- **test_structure_utils.py**: Tests for detecting document structure and headers
- **test_chunk_enrichment.py**: Tests for enriching document chunks with metadata
- **test_robust_etl.py**: Tests for the robust ETL module for data extraction and transformation
- **test_security.py**: Tests for JWT token verification, authentication, authorization, and RLS policy generation
- **test_sample.py**: Basic sample tests showing path-resolving functionality

### API Tests

The API test suite uses independent test modules with mock Flask applications to test the endpoints without complex dependencies:

- **test_basic_api.py**: Tests for basic API endpoints including status, user profile, and ESG data endpoints
- **test_file_management_api.py**: Tests for file upload, listing, creation, deletion, and search endpoints
- **test_document_processing_api.py**: Tests for document processing, metadata extraction, and search funct   gggionality
- **test_analytics_and_chat_api.py**: Tests for analytics metrics, charts, trends, and chatbot functionality

## Running Tests

### Running All Tests

To run all tests in the unit test suite:

```bash
cd backend
python -m pytest tests/unit -v
```

### Running Individual Test Files

To run tests from a specific test file:

```bash
cd backend
python -m pytest tests/unit/test_file_utils.py -v
```

### Running API Tests

To run just the API tests:

```bash
cd backend
python -m pytest tests/unit/test_*_api.py -v
```

### Running Specific Tests

To run a specific test or test class:

```bash
cd backend
python -m pytest tests/unit/test_text_utils.py::TestTextUtils::test_clean_text -v
```

### Using the Test Runner Scripts

For Windows users:
```cmd
cd backend\tests\unit
.\run_tests.bat
```

Options:
- `-f <filename>` - Run tests in a specific file
- `-t <testname>` - Run a specific test
- `-v` - Verbose output

### Test Coverage

To generate a test coverage report:

```bash
cd backend
python -m pytest tests/unit --cov=backend --cov-report=term --cov-report=html:tests/coverage
```

This will generate an HTML coverage report in the `tests/coverage` directory.

## Test Configuration

The tests use the following configuration:

1. **Path Handling**: Each test file configures the Python module path to allow importing modules from the project root.
2. **Fixtures**: Common test fixtures provide sample data and mock objects.
3. **Mocking**: Where applicable, external dependencies are mocked using `unittest.mock`.

## API Testing Approach

The API tests use a standalone approach where:

1. Each test file creates its own Flask application with mock endpoints
2. Authentication is simulated using mock decorators
3. External dependencies (like database connections) are mocked
4. Tests verify correct HTTP status codes, response structure, and error handling

This approach allows testing of API endpoints without requiring the actual backend dependencies to be available.

## Adding New Tests

When adding new tests:

1. Follow the existing pattern of test organization.
2. Create a new test file following the naming convention `test_<module_name>.py`.
3. Organize tests in classes named `Test<ModuleName>`.
4. Include appropriate fixtures for test data.
5. Ensure tests cover successful cases, edge cases, and error handling.

## Running Tests in CI/CD

The test suite is integrated with the CI/CD pipeline via GitHub Actions. The workflow configuration can be found in `.github/workflows/backend-test.yml`.

## Test Utilities

Common testing utilities and helpers are available in the `tests/utils/` directory. 