# -*- coding: utf-8 -*-
"""Tests for the central file processor in rag.processor."""

import os
import pytest
from rag.processor import process_uploaded_file

# Define the path to the test files directory (relative to project root)
# Assumes tests are run from the project root directory
TEST_FILES_DIR = os.path.abspath("backend/test_files") 

# --- Test Fixtures (Optional but good practice) ---

@pytest.fixture
def sample_csv_path():
    return os.path.join(TEST_FILES_DIR, "sample1.csv")

@pytest.fixture
def sample_xlsx_path():
    # Using the slightly more complex one
    return os.path.join(TEST_FILES_DIR, "sample.xlsx") 

@pytest.fixture
def sample_docx_path():
    return os.path.join(TEST_FILES_DIR, "Exit Ticket 5.docx")

@pytest.fixture
def sample_pdf_path():
    # Using a smaller, potentially simpler PDF
    return os.path.join(TEST_FILES_DIR, "Invoice.pdf") 

@pytest.fixture
def sample_txt_path():
    return os.path.join(TEST_FILES_DIR, "sample.txt")
    
@pytest.fixture
def unsupported_file_path(tmp_path):
    # Create a dummy file with an unsupported extension
    unsupported = tmp_path / "test.unsupported"
    unsupported.write_text("This content should be chunked as text fallback.")
    return str(unsupported)

# --- Test Cases --- 

def test_process_csv(sample_csv_path):
    """Test processing a CSV file."""
    assert os.path.exists(sample_csv_path), f"Test file not found: {sample_csv_path}"
    chunks = process_uploaded_file(sample_csv_path)
    
    assert isinstance(chunks, list)
    assert len(chunks) > 0, "Should produce at least one chunk for valid CSV"
    
    # Check structure of the first chunk
    chunk = chunks[0]
    assert isinstance(chunk, dict)
    assert "chunk_id" in chunk
    assert "text" in chunk
    assert "source_filename" in chunk
    assert "source_type" in chunk
    assert "metadata" in chunk
    assert isinstance(chunk["metadata"], dict)
    
    # Check specific fields
    assert chunk["source_filename"] == "sample1.csv"
    assert chunk["source_type"] == "csv"
    assert chunk["text"] # Should not be empty
    assert "row_start" in chunk["metadata"]
    assert "row_end" in chunk["metadata"]
    assert "delimiter" in chunk["metadata"]

def test_process_excel(sample_xlsx_path):
    """Test processing an Excel (.xlsx) file."""
    assert os.path.exists(sample_xlsx_path), f"Test file not found: {sample_xlsx_path}"
    chunks = process_uploaded_file(sample_xlsx_path)
    
    assert isinstance(chunks, list)
    assert len(chunks) > 0, "Should produce chunks for valid XLSX"
    
    # Check structure of the first chunk
    chunk = chunks[0]
    assert isinstance(chunk, dict)
    assert "chunk_id" in chunk
    assert "text" in chunk
    assert "source_filename" in chunk
    assert "source_type" in chunk
    assert "metadata" in chunk
    assert isinstance(chunk["metadata"], dict)
    
    # Check specific fields
    assert chunk["source_filename"] == "sample.xlsx"
    assert chunk["source_type"] == "excel"
    assert chunk["text"] # Should not be empty
    assert "sheet_name" in chunk["metadata"]
    assert "row_start" in chunk["metadata"]
    assert "row_end" in chunk["metadata"]

def test_process_docx(sample_docx_path):
    """Test processing a DOCX file."""
    assert os.path.exists(sample_docx_path), f"Test file not found: {sample_docx_path}"
    chunks = process_uploaded_file(sample_docx_path)
    
    assert isinstance(chunks, list)
    assert len(chunks) > 0, "Should produce chunks for valid DOCX"
    
    # Check structure of the first chunk
    chunk = chunks[0]
    assert isinstance(chunk, dict)
    assert "chunk_id" in chunk
    assert "text" in chunk
    assert "source_filename" in chunk
    assert "source_type" in chunk
    assert "metadata" in chunk
    assert isinstance(chunk["metadata"], dict)
    
    # Check specific fields
    assert chunk["source_filename"] == "Exit Ticket 5.docx"
    assert chunk["source_type"] == "docx"
    assert chunk["text"] # Should not be empty
    assert "section_heading" in chunk["metadata"]

def test_process_pdf(sample_pdf_path):
    """Test processing a PDF file."""
    assert os.path.exists(sample_pdf_path), f"Test file not found: {sample_pdf_path}"
    # Note: Uses the original RAG chunker for PDF
    chunks = process_uploaded_file(sample_pdf_path)
    
    assert isinstance(chunks, list)
    assert len(chunks) > 0, "Should produce chunks for valid PDF"
    
    # Check structure of the first chunk
    chunk = chunks[0]
    assert isinstance(chunk, dict)
    assert "chunk_id" in chunk
    assert "text" in chunk
    assert "source_filename" in chunk
    assert "source_type" in chunk
    assert "metadata" in chunk
    assert isinstance(chunk["metadata"], dict)
    
    # Check specific fields
    assert chunk["source_filename"] == "Invoice.pdf"
    assert chunk["source_type"] == "pdf"
    assert chunk["text"] # Should not be empty
    # Original chunker might have different metadata keys
    assert "start_char" in chunk["metadata"]
    assert "end_char" in chunk["metadata"]

def test_process_txt(sample_txt_path):
    """Test processing a TXT file."""
    assert os.path.exists(sample_txt_path), f"Test file not found: {sample_txt_path}"
    # Note: Uses the original RAG chunker for TXT
    chunks = process_uploaded_file(sample_txt_path)
    
    assert isinstance(chunks, list)
    assert len(chunks) > 0, "Should produce chunks for valid TXT"
    
    # Check structure of the first chunk
    chunk = chunks[0]
    assert isinstance(chunk, dict)
    assert "chunk_id" in chunk
    assert "text" in chunk
    assert "source_filename" in chunk
    assert "source_type" in chunk
    assert "metadata" in chunk
    assert isinstance(chunk["metadata"], dict)
    
    # Check specific fields
    assert chunk["source_filename"] == "sample.txt"
    assert chunk["source_type"] == "text"
    assert chunk["text"] # Should not be empty
    assert "start_char" in chunk["metadata"]
    assert "end_char" in chunk["metadata"]

def test_process_unsupported_type(unsupported_file_path):
    """Test processing an unsupported file type (should fallback to text)."""
    # Note: Uses the original RAG chunker as fallback
    chunks = process_uploaded_file(unsupported_file_path)
    
    assert isinstance(chunks, list)
    assert len(chunks) > 0, "Should produce fallback chunks for unsupported type"
    
    # Check structure of the first chunk
    chunk = chunks[0]
    assert isinstance(chunk, dict)
    assert "chunk_id" in chunk
    assert "text" in chunk
    assert "source_filename" in chunk
    assert "source_type" in chunk
    assert "metadata" in chunk
    assert isinstance(chunk["metadata"], dict)
    
    # Check specific fields
    assert chunk["source_filename"] == "test.unsupported"
    assert chunk["source_type"] == "text_fallback"
    assert chunk["text"] == "This content should be chunked as text fallback."
    assert "start_char" in chunk["metadata"]
    assert "end_char" in chunk["metadata"]

def test_process_nonexistent_file():
    """Test processing a file that does not exist."""
    chunks = process_uploaded_file("nonexistent/file/path.pdf")
    assert isinstance(chunks, list)
    assert len(chunks) == 0, "Should return empty list for non-existent file" 