from typing import List, Dict, Any
import openai
from helicone.openai_proxy import openai as helicone_openai
from ..config.config import (
    HELICONE_API_KEY,
    OPENAI_API_KEY,
    EMBEDDING_MODEL,
    CHAT_MODEL,
    HELICONE_AUTH_HEADER
)

class LLMService:
    def __init__(self):
        """Initialize the LLM service with Helicone integration."""
        if not all([HELICONE_API_KEY, OPENAI_API_KEY]):
            raise ValueError("Missing required API keys")
        
        # Configure OpenAI with Helicone proxy
        helicone_openai.api_key = OPENAI_API_KEY
        self.client = helicone_openai

    async def generate_embeddings(self, text: str) -> List[float]:
        """
        Generate embeddings for the given text using Helicone-wrapped OpenAI API.
        
        Args:
            text (str): Input text to generate embeddings for
            
        Returns:
            List[float]: The generated embedding vector
        """
        try:
            response = await self.client.Embedding.create(
                model=EMBEDDING_MODEL,
                input=text,
                headers=HELICONE_AUTH_HEADER
            )
            return response.data[0].embedding
        except Exception as e:
            raise Exception(f"Error generating embeddings: {str(e)}")

    async def get_chat_completion(
        self,
        messages: List[Dict[str, str]],
        custom_properties: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Get chat completion using Helicone-wrapped OpenAI API.
        
        Args:
            messages (List[Dict[str, str]]): List of message dictionaries
            custom_properties (Dict[str, Any], optional): Custom properties for Helicone tracking
            
        Returns:
            Dict[str, Any]: The chat completion response
        """
        try:
            headers = HELICONE_AUTH_HEADER.copy()
            if custom_properties:
                headers["Helicone-Property-Custom"] = str(custom_properties)

            response = await self.client.ChatCompletion.create(
                model=CHAT_MODEL,
                messages=messages,
                headers=headers
            )
            return {
                "content": response.choices[0].message.content,
                "usage": response.usage,
                "model": response.model
            }
        except Exception as e:
            raise Exception(f"Error getting chat completion: {str(e)}")

    def log_feedback(
        self,
        request_id: str,
        rating: int,
        feedback_text: str = None
    ) -> None:
        """
        Log feedback for a specific request using Helicone's feedback API.
        
        Args:
            request_id (str): The Helicone request ID
            rating (int): Rating score (1-5)
            feedback_text (str, optional): Additional feedback text
        """
        try:
            feedback_data = {
                "rating": rating,
                "feedback": feedback_text
            }
            # Implementation for Helicone feedback logging
            # This would typically involve making a request to Helicone's feedback endpoint
            pass
        except Exception as e:
            raise Exception(f"Error logging feedback: {str(e)}") 