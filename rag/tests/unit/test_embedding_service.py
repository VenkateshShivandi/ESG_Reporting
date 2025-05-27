from unittest.mock import patch, MagicMock
from rag.embedding_service import (
    generate_embeddings,
    OPENAI_EMBEDDING_MODEL,
    EXPECTED_DIMENSION,
)
from openai import RateLimitError, APIStatusError
from httpx import Request, Response


def test_generate_embeddings_success():
    with patch("rag.embedding_service._initialize_openai_client", return_value=True):
        # Use a flexible MagicMock for the client instance
        mock_openai_client_instance = MagicMock()

        # Explicitly create the .embeddings attribute as another MagicMock
        mock_embeddings_object = MagicMock()
        mock_openai_client_instance.embeddings = mock_embeddings_object

        mock_embedding_item = MagicMock()
        mock_embedding_item.embedding = [0.1] * EXPECTED_DIMENSION

        mock_create_response = MagicMock()
        mock_create_response.data = [mock_embedding_item]

        # Configure the .create() method on the mock_embeddings_object
        mock_embeddings_object.create.return_value = mock_create_response

        with patch("rag.embedding_service._openai_client", mock_openai_client_instance):
            result = generate_embeddings(["Test text"])
            assert len(result) == 1
            assert len(result[0]) == EXPECTED_DIMENSION
            mock_embeddings_object.create.assert_called_once_with(
                input=["Test text"], model=OPENAI_EMBEDDING_MODEL
            )


def test_generate_embeddings_initialization_failure():
    with patch("rag.embedding_service._initialize_openai_client", return_value=False):
        result = generate_embeddings(["Test text"])
        assert result == []


def test_generate_embeddings_empty_text_list():
    with patch("rag.embedding_service._initialize_openai_client", return_value=True):
        result = generate_embeddings([])
        assert result == []


def test_generate_embeddings_api_error():
    with patch("rag.embedding_service._initialize_openai_client", return_value=True):
        mock_openai_client_instance = MagicMock()
        mock_embeddings_object = MagicMock()
        mock_openai_client_instance.embeddings = mock_embeddings_object

        # Mock an httpx.Response object, as APIStatusError expects it
        mock_httpx_response = MagicMock(spec=Response)
        mock_httpx_response.status_code = 500  # Example: Internal Server Error
        mock_httpx_response.request = MagicMock(
            spec=Request
        )  # APIStatusError requires response.request
        # Mock headers for x-request-id, which APIStatusError might try to access
        mock_httpx_response.headers = MagicMock()
        mock_httpx_response.headers.get.return_value = "dummy-request-id"

        # Instantiate APIStatusError, which has .status_code via its .response attribute
        # This is the type of error the logger in embedding_service.py can handle
        # when accessing e.status_code.
        api_status_error_instance = APIStatusError(
            message="Simulated API Status Error",
            response=mock_httpx_response,
            body=None,
        )

        mock_embeddings_object.create.side_effect = api_status_error_instance

        with patch("rag.embedding_service._openai_client", mock_openai_client_instance):
            result = generate_embeddings(["Test text"])
            assert result == []


def test_generate_embeddings_rate_limit_error():
    with patch("rag.embedding_service._initialize_openai_client", return_value=True):
        mock_openai_client_instance = MagicMock()
        mock_embeddings_object = MagicMock()
        mock_openai_client_instance.embeddings = mock_embeddings_object

        mock_httpx_response = MagicMock(spec=Response)
        mock_httpx_response.status_code = 429  # Set status_code for RateLimitError
        # RateLimitError also expects the response to have a request attribute
        mock_httpx_response.request = MagicMock(spec=Request)
        mock_httpx_response.headers = MagicMock()  # Add mock headers
        mock_httpx_response.headers.get.return_value = (
            "dummy-request-id"  # Ensure .get works
        )

        mock_embeddings_object.create.side_effect = RateLimitError(
            message="Rate limit exceeded", response=mock_httpx_response, body=None
        )
        with patch("rag.embedding_service._openai_client", mock_openai_client_instance):
            result = generate_embeddings(["Test text"])
            assert result == []
