import pytest
from unittest.mock import patch, MagicMock
from rag.parsers.docx_parser import (
    extract_text_from_docx,
    extract_tables_with_context,
    parse_docx,
)


def test_extract_text_from_docx():
    with patch("rag.parsers.docx_parser.Document") as MockDocument:
        mock_doc = MagicMock()
        mock_doc.paragraphs = [
            MagicMock(text="Paragraph 1"),
            MagicMock(text="Paragraph 2"),
        ]
        MockDocument.return_value = mock_doc

        text = extract_text_from_docx("mock/path/to/file.docx")
        assert text == "Paragraph 1\nParagraph 2"


def test_extract_tables_with_context():
    # Create a more detailed mock structure
    mock_doc = MagicMock()

    # Mock the document structure
    mock_element = MagicMock()
    mock_body = MagicMock()
    mock_tbl_element = MagicMock()
    mock_tbl_element.tag.endswith.return_value = True  # Simulates tag.endswith('tbl')

    # Set up the body elements (including a table element)
    mock_body.__iter__.return_value = [mock_tbl_element]  # Simulates doc.element.body
    mock_element.body = mock_body
    mock_doc.element = mock_element

    # Set up the part structure for filename
    mock_package = MagicMock()
    mock_package.filename = "test.docx"
    mock_part = MagicMock()
    mock_part.package = mock_package
    mock_doc.part = mock_part

    # Set up the table structure
    mock_cell1 = MagicMock()
    mock_cell2 = MagicMock()
    mock_cell1.text = "Cell 1"
    mock_cell2.text = "Cell 2"

    mock_row = MagicMock()
    mock_row.cells = [mock_cell1, mock_cell2]

    mock_table = MagicMock()
    mock_table.rows = [mock_row]

    mock_doc.tables = [mock_table]

    # Call the function with our deeply mocked document
    tables = extract_tables_with_context(mock_doc)

    # Test the results
    assert len(tables) == 1
    assert tables[0]["content"] == [["Cell 1", "Cell 2"]]


def test_parse_docx():
    with patch("rag.parsers.docx_parser.Document") as MockDocument:
        mock_doc = MagicMock()
        mock_doc.paragraphs = [
            MagicMock(text="Paragraph 1"),
            MagicMock(text="Paragraph 2"),
        ]
        mock_doc.tables = []
        MockDocument.return_value = mock_doc

        result = parse_docx("mock/path/to/file.docx")
        assert "metadata" in result
        assert "text" in result
        assert "sections" in result
        assert "tables" in result
