import os
import sys
import pytest
from pathlib import Path
from typing import List, Dict, Any
import importlib.util

# Get the absolute path of the module
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
MODULE_PATH = PROJECT_ROOT / "parsers" / "pdf_parser" / "section_hierarchy.py"

# Load the module dynamically
spec = importlib.util.spec_from_file_location("pdf_parser_section_hierarchy", MODULE_PATH)
pdf_parser_section_hierarchy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pdf_parser_section_hierarchy)

# Get the function from the module
build_section_hierarchy = pdf_parser_section_hierarchy.build_section_hierarchy

class TestSectionHierarchy:
    
    def test_empty_headers(self):
        """Test with empty headers list."""
        result = build_section_hierarchy([])
        assert isinstance(result, list)
        assert len(result) == 0
    
    def test_single_header(self):
        """Test with a single header."""
        headers = [{"text": "Introduction", "level": 1, "position": 1}]
        result = build_section_hierarchy(headers)
        
        assert len(result) == 1
        assert result[0]["text"] == "Introduction"
        assert result[0]["level"] == 1
        assert result[0]["path"] == ["Introduction"]
        assert result[0]["full_path_text"] == "Introduction"
    
    def test_flat_structure(self):
        """Test with multiple headers at the same level."""
        headers = [
            {"text": "Introduction", "level": 1, "position": 1},
            {"text": "Methods", "level": 1, "position": 2},
            {"text": "Results", "level": 1, "position": 3},
            {"text": "Conclusion", "level": 1, "position": 4}
        ]
        
        result = build_section_hierarchy(headers)
        
        assert len(result) == 4
        
        # Check all headers have level 1 and correct path
        for i, header in enumerate(result):
            assert header["level"] == 1
            assert len(header["path"]) == 1
            assert header["path"][0] == headers[i]["text"]
            assert header["full_path_text"] == headers[i]["text"]
    
    def test_hierarchical_structure(self):
        """Test with headers at different levels creating a hierarchical structure."""
        headers = [
            {"text": "Executive Summary", "level": 1, "position": 1},
            {"text": "Introduction", "level": 1, "position": 2},
            {"text": "Background", "level": 2, "position": 3},
            {"text": "Project Scope", "level": 2, "position": 4},
            {"text": "Methods", "level": 1, "position": 5},
            {"text": "Data Collection", "level": 2, "position": 6},
            {"text": "Survey Design", "level": 3, "position": 7},
            {"text": "Participant Selection", "level": 3, "position": 8},
            {"text": "Analysis Techniques", "level": 2, "position": 9},
            {"text": "Results", "level": 1, "position": 10}
        ]
        
        result = build_section_hierarchy(headers)
        
        assert len(result) == 10
        
        # Check specific paths
        assert result[0]["path"] == ["Executive Summary"]
        assert result[1]["path"] == ["Introduction"]
        assert result[2]["path"] == ["Introduction", "Background"]
        assert result[2]["full_path_text"] == "Introduction > Background"
        assert result[6]["path"] == ["Methods", "Data Collection", "Survey Design"]
        assert result[6]["full_path_text"] == "Methods > Data Collection > Survey Design"
        assert result[9]["path"] == ["Results"]
    
    def test_unsorted_headers(self):
        """Test with headers in unsorted order."""
        headers = [
            {"text": "Methods", "level": 1, "position": 5},
            {"text": "Executive Summary", "level": 1, "position": 1},
            {"text": "Background", "level": 2, "position": 3},
            {"text": "Introduction", "level": 1, "position": 2}
        ]
        
        result = build_section_hierarchy(headers)
        
        # Check that headers are sorted by position
        assert result[0]["text"] == "Executive Summary"
        assert result[1]["text"] == "Introduction"
        assert result[2]["text"] == "Background"
        assert result[3]["text"] == "Methods"
        
        # Check path is correctly built
        assert result[2]["path"] == ["Introduction", "Background"]
    
    def test_skipped_levels(self):
        """Test with headers that skip levels (e.g., from level 1 to level 3)."""
        headers = [
            {"text": "Executive Summary", "level": 1, "position": 1},
            {"text": "Detailed Analysis", "level": 3, "position": 2},  # Skips level 2
            {"text": "Conclusion", "level": 1, "position": 3}
        ]
        
        result = build_section_hierarchy(headers)
        
        assert len(result) == 3
        
        # Check that level 3 is correctly placed under level 1
        assert result[1]["path"] == ["Executive Summary", "Detailed Analysis"]
        assert result[1]["level"] == 3
        
        # Check that conclusion is correctly placed
        assert result[2]["path"] == ["Conclusion"]
    
    def test_deep_nesting(self):
        """Test with deeply nested headers."""
        headers = [
            {"text": "Level 1", "level": 1, "position": 1},
            {"text": "Level 2", "level": 2, "position": 2},
            {"text": "Level 3", "level": 3, "position": 3},
            {"text": "Level 4", "level": 4, "position": 4},
            {"text": "Level 5", "level": 5, "position": 5},
            {"text": "Another Level 1", "level": 1, "position": 6}
        ]
        
        result = build_section_hierarchy(headers)
        
        assert len(result) == 6
        
        # Check deepest nesting
        assert result[4]["path"] == ["Level 1", "Level 2", "Level 3", "Level 4", "Level 5"]
        assert result[4]["full_path_text"] == "Level 1 > Level 2 > Level 3 > Level 4 > Level 5"
        
        # Check that new level 1 resets path
        assert result[5]["path"] == ["Another Level 1"]
    
    def test_mixed_structure(self):
        """Test with a mix of flat and hierarchical structures."""
        headers = [
            {"text": "Abstract", "level": 1, "position": 1},
            {"text": "Introduction", "level": 1, "position": 2},
            {"text": "Chapter 1", "level": 1, "position": 3},
            {"text": "Section 1.1", "level": 2, "position": 4},
            {"text": "Section 1.2", "level": 2, "position": 5},
            {"text": "Subsection 1.2.1", "level": 3, "position": 6},
            {"text": "Chapter 2", "level": 1, "position": 7},
            {"text": "Conclusion", "level": 1, "position": 8}
        ]
        
        result = build_section_hierarchy(headers)
        
        assert len(result) == 8
        
        # Check specific paths for mixed structure
        assert result[0]["path"] == ["Abstract"]
        assert result[3]["path"] == ["Chapter 1", "Section 1.1"]
        assert result[5]["path"] == ["Chapter 1", "Section 1.2", "Subsection 1.2.1"]
        assert result[6]["path"] == ["Chapter 2"]
        assert result[7]["path"] == ["Conclusion"]

if __name__ == "__main__":
    pytest.main(["-xvs", __file__]) 