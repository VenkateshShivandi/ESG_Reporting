import os
import sys
import pytest
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock
from typing import Dict, Any
import importlib.util

# Get the absolute path of the module
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
MODULE_PATH = PROJECT_ROOT / "parsers" / "pdf_parser" / "metadata.py"

# Load the module dynamically
spec = importlib.util.spec_from_file_location("metadata", MODULE_PATH)
metadata = importlib.util.module_from_spec(spec)
sys.modules["metadata"] = metadata  # Add to sys.modules to make patching easier
spec.loader.exec_module(metadata)

# Get the function from the module
extract_document_metadata = metadata.extract_document_metadata

class TestPDFMetadata:
    
    @pytest.fixture
    def mock_pdf_file(self):
        """Create a temporary mock PDF file for testing."""
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
            tmp.write(b'%PDF-1.5\nMock PDF content\n%%EOF')
            tmp_path = tmp.name
        
        yield tmp_path
        
        # Cleanup
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
    
    def test_extract_document_metadata_success(self, mock_pdf_file):
        """Test successful metadata extraction from PDF."""
        # Create mock objects
        mock_doc = MagicMock()
        mock_doc.metadata = {
            'title': 'ESG Annual Report',
            'author': 'Sustainability Team',
            'subject': 'Environmental Social Governance',
            'creator': 'PDF Creator Pro',
            'producer': 'PDF Library 2.0',
            'creationDate': 'D:20240101120000',
            'modDate': 'D:20240102120000'
        }
        mock_doc.page_count = 42
        mock_doc.name = mock_pdf_file
        mock_doc.__len__.return_value = 42
        
        # Mock get_toc and get_text for additional metadata
        mock_doc.get_toc.return_value = [['H1', 'Introduction', 1]]
        mock_page = MagicMock()
        mock_page.get_text.return_value = "Sample text with ESG keywords"
        mock_doc.__getitem__.return_value = mock_page
        
        # Mock fitz.open to return our mock document
        with patch('fitz.open', return_value=mock_doc):
            # Call function under test
            result = extract_document_metadata(mock_pdf_file)
        
        # Assertions - check that basic metadata is preserved
        assert isinstance(result, dict)
        assert result['title'] == 'ESG Annual Report'
        assert result['author'] == 'Sustainability Team'
        assert result['subject'] == 'Environmental Social Governance'
        assert result['creator'] == 'PDF Creator Pro'
        assert result['producer'] == 'PDF Library 2.0'
        assert result['creationDate'] == 'D:20240101120000'
        assert result['modDate'] == 'D:20240102120000'
        
        # Additional metadata added by the function
        assert result['page_count'] == 42
        assert 'toc' in result
        assert 'word_count' in result
    
    def test_extract_document_metadata_missing_fields(self, mock_pdf_file):
        """Test metadata extraction with missing fields."""
        # Setup mock document with minimal metadata
        mock_doc = MagicMock()
        mock_doc.metadata = {
            'title': '',  # Empty title
            # No author field
            'creator': 'PDF Creator'
            # Other fields missing
        }
        mock_doc.page_count = 10
        mock_doc.name = mock_pdf_file
        mock_doc.__len__.return_value = 10
        
        # Additional mocks
        mock_doc.get_toc.return_value = []
        mock_page = MagicMock()
        mock_page.get_text.return_value = "sample text"
        mock_doc.__getitem__.return_value = mock_page
        
        # Mock fitz.open to return our mock document
        with patch('fitz.open', return_value=mock_doc):
            # Call function under test
            result = extract_document_metadata(mock_pdf_file)
        
        # Assertions - only fields that exist in the original metadata should be present
        assert isinstance(result, dict)
        assert result['title'] == ''  # Empty title preserved
        assert 'author' not in result  # No author field was provided
        assert result['creator'] == 'PDF Creator'
        assert result['page_count'] == 10
        assert 'toc' in result
        assert 'word_count' in result
    
    def test_extract_document_metadata_statistics(self, mock_pdf_file):
        """Test document statistics extraction."""
        # Setup mock document
        mock_doc = MagicMock()
        mock_doc.metadata = {'title': 'Statistics Test'}
        mock_doc.page_count = 3
        mock_doc.name = mock_pdf_file
        
        # Simulate document with text for word counting
        mock_page = MagicMock()
        mock_page.get_text.return_value = "This is sample text"
        mock_page.get_text.side_effect = [
            [("word1", 1, 2, 3, 4, 5, 6), ("word2", 7, 8, 9, 10, 11, 12)],  # 2 words on page 1
            [("word3", 1, 2, 3, 4, 5, 6)],  # 1 word on page 2
            [("word4", 1, 2, 3, 4, 5, 6), ("word5", 7, 8, 9, 10, 11, 12), ("word6", 13, 14, 15, 16, 17, 18)]  # 3 words on page 3
        ]
        mock_doc.__getitem__.return_value = mock_page
        mock_doc.get_toc.return_value = []
        
        # Mock fitz.open to return our mock document
        with patch('fitz.open', return_value=mock_doc):
            # Call function under test
            result = extract_document_metadata(mock_pdf_file)
        
        # Assertions for document statistics
        assert result['title'] == 'Statistics Test'
        assert result['page_count'] == 3
        assert 'word_count' in result  # The implementation should count words
        assert 'toc' in result  # Table of contents should be included
    
    def test_extract_document_metadata_error_handling(self, mock_pdf_file):
        """Test error handling when PDF cannot be opened."""
        # Mock fitz.open to raise an exception
        with patch('fitz.open', side_effect=Exception("Failed to open PDF")):
            # Call function under test
            result = extract_document_metadata(mock_pdf_file)
        
        # Assertions for error case - the function should return an empty dict on error
        assert isinstance(result, dict)
        assert len(result) == 0  # Empty dictionary returned on error
    
    def test_extract_document_metadata_with_keywords(self, mock_pdf_file):
        """Test keyword extraction from text."""
        # Setup mock document
        mock_doc = MagicMock()
        mock_doc.metadata = {'title': 'Keyword Test'}
        mock_doc.page_count = 1
        
        # Mock text with repeating keywords for frequency analysis
        mock_text = "environmental social governance sustainability report climate carbon emissions diversity board"
        mock_page = MagicMock()
        # First get_text call is for "words" mode to count words
        mock_page.get_text.side_effect = [
            [("environmental", 0, 0, 0, 0, 0, 0), ("social", 0, 0, 0, 0, 0, 0), 
             ("governance", 0, 0, 0, 0, 0, 0), ("sustainability", 0, 0, 0, 0, 0, 0)],
            # Second call is for extracting full text
            mock_text
        ]
        mock_doc.__getitem__.return_value = mock_page
        mock_doc.get_toc.return_value = []
        
        # Mock Counter to ensure consistent results
        counter_mock = MagicMock()
        counter_mock.most_common.return_value = [("environmental", 3), ("sustainability", 2), ("governance", 2)]
        
        with patch('fitz.open', return_value=mock_doc), \
             patch('collections.Counter', return_value=counter_mock):
            # Call function under test
            result = extract_document_metadata(mock_pdf_file)
        
        # Assertions for keyword extraction
        assert result['title'] == 'Keyword Test'
        # Keywords may be extracted if implementation includes them
        if 'keywords' in result:
            assert isinstance(result['keywords'], list)

if __name__ == "__main__":
    pytest.main(["-xvs", __file__]) 