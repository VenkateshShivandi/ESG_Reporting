import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from rag.helicone_integration.services.llm_service import LLMService, USING_OPENAI_V1

# Skip all tests if helicone is not available
helicone = pytest.importorskip("helicone", reason="Helicone package not installed")

@pytest.fixture
def mock_llm_service():
    """Fixture to create mocked LLM service instance."""
    service = LLMService()
    
    # Mock for the client based on OpenAI version
    if USING_OPENAI_V1:
        service.client = MagicMock()
        service.client.embeddings.create = AsyncMock()
        service.client.embeddings.create.return_value.data = [MagicMock(embedding=[0.1, 0.2, 0.3, 0.4])]
        service.client.chat.completions.create = AsyncMock()
        mock_response = MagicMock()
        mock_response.choices = [MagicMock(message=MagicMock(content="Test response"))]
        mock_response.usage.total_tokens = 15
        mock_response.model = "gpt-3.5-turbo"
        service.client.chat.completions.create.return_value = mock_response
    else:
        service.client = MagicMock()
        service.client.Embedding.create = AsyncMock()
        service.client.Embedding.create.return_value = {
            "data": [{"embedding": [0.1, 0.2, 0.3, 0.4]}]
        }
        service.client.ChatCompletion.create = AsyncMock()
        service.client.ChatCompletion.create.return_value = {
            "choices": [{"message": {"content": "Test response"}}],
            "usage": {"total_tokens": 15},
            "model": "gpt-3.5-turbo"
        }
    
    return service

@pytest.mark.asyncio
async def test_embedding_generation(mock_llm_service):
    """Test embedding generation with Helicone tracking."""
    test_text = "This is a test for ESG reporting embeddings."
    embedding = await mock_llm_service.generate_embeddings(test_text)
    
    assert isinstance(embedding, list)
    assert len(embedding) > 0
    assert all(isinstance(x, float) for x in embedding)

@pytest.mark.asyncio
async def test_chat_completion(mock_llm_service):
    """Test chat completion with Helicone tracking."""
    messages = [
        {"role": "system", "content": "You are an ESG reporting assistant."},
        {"role": "user", "content": "What are the key metrics for environmental reporting?"}
    ]
    
    custom_properties = {
        "test_type": "esg_metrics",
        "category": "environmental"
    }
    
    response = await mock_llm_service.get_chat_completion(messages, custom_properties)
    
    assert isinstance(response, dict)
    assert "content" in response
    assert "usage" in response
    assert "model" in response

def test_feedback_logging(mock_llm_service):
    """Test feedback logging functionality."""
    test_request_id = "test_request_123"
    test_rating = 5
    test_feedback = "Great response on ESG metrics!"
    
    # This should not raise an exception
    mock_llm_service.log_feedback(test_request_id, test_rating, test_feedback)

@pytest.mark.asyncio
async def test_error_handling(mock_llm_service):
    """Test error handling in the LLM service."""
    with pytest.raises(Exception):
        # Test with invalid input
        await mock_llm_service.generate_embeddings(None)
    
    with pytest.raises(Exception):
        # Test with invalid messages format
        await mock_llm_service.get_chat_completion([]) 

class TestLLMService:
    """Test the LLM service with Helicone integration"""
    
    @pytest.mark.unit
    @patch("openai.AsyncOpenAI")
    def test_initialization(self, mock_openai_class):
        """Test LLM service initialization"""
        service = LLMService()
        assert service.client is not None
    
    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_generate_embeddings(self):
        """Test embedding generation"""
        # Mock the client to avoid actual API calls
        service = LLMService()
        service.client = MagicMock()
        service.client.embeddings.create = AsyncMock()
        service.client.embeddings.create.return_value.data = [
            {"embedding": [0.1, 0.2, 0.3, 0.4]}
        ]
        
        text = "This is a test document for ESG analysis."
        embeddings = await service.generate_embeddings(text)
        
        assert isinstance(embeddings, list)
        assert len(embeddings) > 0
        
    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_get_chat_completion(self):
        """Test chat completion functionality"""
        # Mock the client
        service = LLMService()
        service.client = MagicMock()
        service.client.chat.completions.create = AsyncMock()
        service.client.chat.completions.create.return_value.choices = [
            {"message": {"content": "ESG stands for Environmental, Social, and Governance."}}
        ]
        service.client.chat.completions.create.return_value.usage = {"total_tokens": 15}
        service.client.chat.completions.create.return_value.model = "gpt-3.5-turbo"
        
        messages = [
            {"role": "system", "content": "You are an ESG assistant."},
            {"role": "user", "content": "What does ESG stand for?"}
        ]
        
        response = await service.get_chat_completion(messages)
        
        assert isinstance(response, dict)
        assert "content" in response
        
    @pytest.mark.unit
    def test_log_feedback(self):
        """Test feedback logging"""
        service = LLMService()
        service.client = MagicMock()
        
        # Should not raise any exceptions
        service.log_feedback("request_123", 5, "Great response!")
        
        # Additional assertions can be added once implementation details are known 