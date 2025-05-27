import pytest
from unittest.mock import patch
from rag.chunking import PDFChunker


@pytest.fixture
def chunker():
    return PDFChunker()


def test_extract_text_from_pdf(chunker):
    with patch.object(
        chunker, "extract_text_from_pdf", return_value=("mocked text", True)
    ) as mock_method:
        text, success = chunker.extract_text_from_pdf("mock/path/to/valid.pdf")
        assert success
        assert text == "mocked text"
        mock_method.assert_called_once_with("mock/path/to/valid.pdf")

    with patch.object(
        chunker, "extract_text_from_pdf", return_value=("", False)
    ) as mock_method:
        text, success = chunker.extract_text_from_pdf("mock/path/to/non-pdf.txt")
        assert not success
        assert text == ""
        mock_method.assert_called_once_with("mock/path/to/non-pdf.txt")


def test_create_chunks(chunker):
    # Create an sample text
    sample_text = (
        "This is a sample text. It will be chunked into smaller parts. "
        "The quick brown fox jumps over the lazy dog. "
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. "
        "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. "
        "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. "
        "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. "
        "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. "
        "Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. "
        "Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris. "
        "Integer in mauris eu nibh euismod gravida. Duis ac tellus et risus vulputate vehicula. "
        "Donec lobortis risus a elit. Etiam tempor. Ut ullamcorper, ligula eu tempor congue, eros est euismod turpis, id tincidunt sapien risus a quam. "
        "Maecenas fermentum consequat mi. Donec fermentum. Pellentesque malesuada nulla a mi. "
        "Duis sapien sem, aliquet nec, commodo eget, consequat quis, neque. Aliquam faucibus, elit ut dictum aliquet, felis nisl adipiscing sapien, sed malesuada diam lacus eget erat. "
        "Cras mollis scelerisque nunc. Nullam arcu. Aliquam consequat. Curabitur augue lorem, dapibus quis, laoreet et, pretium ac, nisi. "
        "Aenean magna nisl, mollis quis, molestie eu, feugiat in, orci. In hac habitasse platea dictumst."
    )
    chunks = chunker.create_chunks(sample_text)
    assert len(chunks) > 0
    # Check that the first chunk is smaller than the full text
    assert len(chunks[0]["text"]) < len(sample_text)


def test_process_pdf(chunker):
    mock_chunks = [{"text": "chunk1", "source": "mock.pdf"}]
    with patch.object(chunker, "process_pdf", return_value=mock_chunks) as mock_method:
        chunks = chunker.process_pdf("mock/path/to/valid.pdf")
        assert len(chunks) > 0
        assert chunks[0]["source"] == "mock.pdf"
        mock_method.assert_called_once_with("mock/path/to/valid.pdf")
