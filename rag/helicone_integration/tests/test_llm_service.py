import pytest
import os
from ..services.llm_service import LLMService

@pytest.fixture
def llm_service():
    """Fixture to create LLM service instance."""
    return LLMService()

@pytest.mark.asyncio
async def test_embedding_generation(llm_service):
    """Test embedding generation with Helicone tracking."""
    test_text = "This is a test for ESG reporting embeddings."
    embedding = await llm_service.generate_embeddings(test_text)
    
    assert isinstance(embedding, list)
    assert len(embedding) > 0
    assert all(isinstance(x, float) for x in embedding)

@pytest.mark.asyncio
async def test_chat_completion(llm_service):
    """Test chat completion with Helicone tracking."""
    messages = [
        {"role": "system", "content": "You are an ESG reporting assistant."},
        {"role": "user", "content": "What are the key metrics for environmental reporting?"}
    ]
    
    custom_properties = {
        "test_type": "esg_metrics",
        "category": "environmental"
    }
    
    response = await llm_service.get_chat_completion(messages, custom_properties)
    
    assert isinstance(response, dict)
    assert "content" in response
    assert "usage" in response
    assert "model" in response

def test_feedback_logging(llm_service):
    """Test feedback logging functionality."""
    test_request_id = "test_request_123"
    test_rating = 5
    test_feedback = "Great response on ESG metrics!"
    
    # This should not raise an exception
    llm_service.log_feedback(test_request_id, test_rating, test_feedback)

@pytest.mark.asyncio
async def test_error_handling(llm_service):
    """Test error handling in the LLM service."""
    with pytest.raises(Exception):
        # Test with invalid input
        await llm_service.generate_embeddings(None)
    
    with pytest.raises(Exception):
        # Test with invalid messages format
        await llm_service.get_chat_completion([]) 