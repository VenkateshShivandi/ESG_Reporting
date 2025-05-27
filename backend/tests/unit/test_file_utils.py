import os
import sys
import pytest
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock

# Setup path to allow importing from project root
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

# Import the module for testing
from backend.parsers.utils.file_utils import (
    create_directory,
    check_file_exists,
    get_file_extension,
    is_file_empty,
    safe_parse,
    create_result_dict
)

class TestFileUtils:
    
    @pytest.fixture
    def temp_dir(self):
        """Create a temporary directory for testing."""
        with tempfile.TemporaryDirectory() as temp_dir:
            yield temp_dir
    
    @pytest.fixture
    def sample_file(self):
        """Create a temporary file with content for testing."""
        with tempfile.NamedTemporaryFile(suffix='.txt', delete=False) as tmp:
            tmp.write(b'Sample file content for testing')
            tmp_path = tmp.name
        
        yield tmp_path
        
        # Cleanup
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
    
    @pytest.fixture
    def empty_file(self):
        """Create an empty temporary file for testing."""
        with tempfile.NamedTemporaryFile(suffix='.txt', delete=False) as tmp:
            tmp_path = tmp.name
        
        yield tmp_path
        
        # Cleanup
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
    
    def test_create_directory(self, temp_dir):
        """Test creating a directory."""
        # Test creating a new directory
        new_dir_path = os.path.join(temp_dir, "new_directory")
        create_directory(new_dir_path)
        assert os.path.exists(new_dir_path)
        assert os.path.isdir(new_dir_path)
        
        # Test with nested path
        nested_dir_path = os.path.join(temp_dir, "parent/child/grandchild")
        create_directory(nested_dir_path)
        assert os.path.exists(nested_dir_path)
        assert os.path.isdir(nested_dir_path)
        
        # Test with existing directory (should not raise error)
        create_directory(new_dir_path)  # This directory already exists
        assert os.path.exists(new_dir_path)
    
    def test_check_file_exists(self, sample_file, temp_dir):
        """Test checking if a file exists."""
        # Test with existing file
        assert check_file_exists(sample_file) is True
        
        # Test with non-existent file
        non_existent = os.path.join(temp_dir, "does_not_exist.txt")
        assert check_file_exists(non_existent) is False
        
        # Test with directory (not a file)
        assert check_file_exists(temp_dir) is False
    
    def test_get_file_extension(self):
        """Test extracting file extension."""
        # Simple case
        assert get_file_extension("document.pdf") == "pdf"
        
        # With path
        assert get_file_extension("/path/to/file.xlsx") == "xlsx"
        
        # With Windows-style path
        assert get_file_extension(r"C:\Users\data\report.csv") == "csv"
        
        # No extension
        assert get_file_extension("filename") == ""
        
        # Multiple dots
        assert get_file_extension("archive.tar.gz") == "gz"
        
        # Hidden file in Unix
        assert get_file_extension(".gitignore") == ""
    
    def test_is_file_empty(self, sample_file, empty_file):
        """Test checking if a file is empty."""
        # Test with non-empty file
        assert is_file_empty(sample_file) is False
        
        # Test with empty file
        assert is_file_empty(empty_file) is True
        
        # Test with non-existent file
        with pytest.raises(FileNotFoundError):
            is_file_empty("non_existent_file.txt")
    
    def test_safe_parse(self, sample_file):
        """Test the safe parsing wrapper function."""
        # Mock parsing function that works
        def successful_parse(file_path):
            return {"status": "success", "content": "parsed content"}
        
        # Mock parsing function that raises an exception
        def failing_parse(file_path):
            raise ValueError("Parsing error")
        
        # Test with successful parsing
        result = safe_parse(successful_parse, sample_file)
        assert result["status"] == "success"
        assert "error" not in result
        
        # Test with failing parsing
        result = safe_parse(failing_parse, sample_file)
        assert "error" in result
        assert result["error"] == "Error parsing file: Parsing error"
        
        # Test with non-existent file
        result = safe_parse(successful_parse, "non_existent_file.txt")
        assert "error" in result
        assert result["error"] == "File not found."
    
    def test_create_result_dict(self):
        """Test creating a standardized result dictionary."""
        # Basic metadata
        metadata = {"title": "Test Document", "author": "Test Author"}
        result = create_result_dict(metadata=metadata)
        assert result["metadata"] == metadata
        
        # With text
        text = "Sample document text"
        result = create_result_dict(metadata=metadata, text=text)
        assert result["text"] == text
        
        # With tables
        tables = [
            [["Header1", "Header2"], ["Value1", "Value2"]]
        ]
        result = create_result_dict(metadata=metadata, text=text, tables=tables)
        assert result["tables"] == tables
        
        # With error
        error = "Processing error occurred"
        result = create_result_dict(error=error)
        assert result["error"] == error
        
        # Complete result with all fields
        result = create_result_dict(metadata=metadata, text=text, tables=tables, error=error)
        assert result["metadata"] == metadata
        assert result["text"] == text
        assert result["tables"] == tables
        assert result["error"] == error

if __name__ == "__main__":
    pytest.main(["-xvs", __file__]) 