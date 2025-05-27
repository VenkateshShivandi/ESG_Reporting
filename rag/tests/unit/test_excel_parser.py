import pytest
from unittest.mock import patch, MagicMock
from rag.parsers.excel_parser import (
    extract_data_with_pandas,
    extract_metadata,
    parse_excel,
)


def test_extract_data_with_pandas():
    with patch("pandas.ExcelFile") as MockExcelFile:
        mock_excel = MagicMock()
        mock_excel.sheet_names = ["Sheet1"]
        mock_df = MagicMock()
        mock_df.columns.tolist.return_value = ["Col1", "Col2"]
        mock_df.values.tolist.return_value = [["Val1", "Val2"]]
        mock_excel.parse.return_value = mock_df
        MockExcelFile.return_value = mock_excel

        data = extract_data_with_pandas("mock/path/to/file.xlsx")
        assert "Sheet1" in data
        assert data["Sheet1"]["headers"] == ["Col1", "Col2"]
        assert data["Sheet1"]["data"] == [["Val1", "Val2"]]


def test_extract_metadata():
    with patch("os.path.getsize", return_value=1024):
        with patch("pandas.ExcelFile") as MockExcelFile:
            mock_excel = MagicMock()
            mock_excel.sheet_names = ["Sheet1"]
            MockExcelFile.return_value = mock_excel

            metadata = extract_metadata("mock/path/to/file.xlsx")
            assert metadata["filename"] == "file.xlsx"
            assert metadata["filesize"] == 1024
            assert metadata["sheet_names"] == ["Sheet1"]


def test_parse_excel():
    # Mock the safe_parse function to bypass file operations
    with patch("rag.parsers.excel_parser.safe_parse") as mock_safe_parse:
        # Create a properly structured mock result
        mock_safe_parse.return_value = {
            "metadata": {
                "filename": "file.xlsx",
                "filesize": 1024,
                "columns": {"Sheet1": ["Col1", "Col2"]},
            },
            "data": {"Sheet1": [["Val1", "Val2"]]},
        }

        # Call the function
        result = parse_excel("mock/path/to/file.xlsx")

        # Assertions
        assert "metadata" in result
        assert "data" in result
        assert "Sheet1" in result["data"]
