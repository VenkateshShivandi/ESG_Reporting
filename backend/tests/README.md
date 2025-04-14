# ESG Reporting Tests

This directory contains tests for the ESG Reporting application's backend functionality.

## Directory Structure

- `test_etl.py`: Tests for the ETL (Extract, Transform, Load) pipeline for PDF processing
- `__init__.py`: Empty file that marks this directory as a Python package

## Test Files

Test PDF files are located in the `backend/test_files/` directory (not in this tests directory). 
These files are used by the test scripts to verify the ETL pipeline functionality.

Available test files include:
- `Invoice.pdf`
- `DOF - Diario Oficial de la Federación (1).pdf`
- `El marco social para proyectos.pdf`
- And several other PDFs

## Running Tests

To run the ETL pipeline tests:

```bash
# From the backend directory
python -m tests.test_etl

# To test with a specific PDF file
python -m tests.test_etl /path/to/your/pdf_file.pdf
```

## Test Output

The ETL test will process the PDF and create chunks in the `backend/output/chunks/` directory.
The test will display information about:
- The PDF being processed
- The output file location
- Sample content from the chunks
- ESG relevance scores
- Total number of chunks created

## Writing New Tests

When writing new tests:
1. Name your test file with a `test_` prefix
2. Document the purpose of the test at the top of the file
3. Use the existing test files in `backend/test_files/` for your tests
4. Include clear logging to make test output meaningful

If adding new test files, consider creating a dedicated subdirectory in `backend/test_files/` 
for your specific test case to avoid cluttering the main test files directory. 