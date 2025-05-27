import pytest
from rag.chunkers.excel_chunker import chunk_excel_data
from rag.chunkers.csv_chunker import chunk_csv_data
from rag.chunkers.docx_chunker import chunk_docx_data


def test_chunk_excel():
    mock_parsed_data = {
        "metadata": {
            "filename": "test_data.xlsx",
            "columns": {"Sheet1": ["ColA", "ColB"]},
        },
        "data": {"Sheet1": [["A1", "B1"], ["A2", "B2"]] * 50},
    }
    chunks = chunk_excel_data(mock_parsed_data)
    assert len(chunks) > 0
    assert chunks[0]["source_filename"] == "test_data.xlsx"
    assert "Sheet1" in chunks[0]["sheet_name"]


def test_chunk_csv():
    mock_parsed_data = {
        "metadata": {"filename": "sample.csv", "columns": ["ID", "Name", "Value"]},
        "data": [[1, "Name_1", 10.5], [2, "Name_2", 20.5]] * 75,
    }
    chunks = chunk_csv_data(mock_parsed_data)
    assert len(chunks) > 0
    assert chunks[0]["source_filename"] == "sample.csv"
    assert "Row 1" in chunks[0]["text"]


def test_chunk_docx():
    mock_parsed_data = {
        "metadata": {"filename": "test.docx"},
        "sections": [
            {
                "heading": "Introduction",
                "content": "This is a sentence. Another sentence.",
            },
            {"heading": "Methods", "content": "Method A was used. Method B was used."},
        ],
    }
    chunks = chunk_docx_data(mock_parsed_data)
    assert len(chunks) > 0
    assert chunks[0]["source_filename"] == "test.docx"
    assert "Introduction" in chunks[0]["metadata"]["section_heading"]
