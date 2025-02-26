from typing import List, Dict, Any
import os
import json
import importlib.metadata

# Check OpenAI version 
OPENAI_VERSION = ""
try:
    OPENAI_VERSION = importlib.metadata.version("openai")
except importlib.metadata.PackageNotFoundError:
    pass

USING_OPENAI_V1 = OPENAI_VERSION.startswith("1.") if OPENAI_VERSION else False

try:
    from helicone.openai_proxy import openai as helicone_openai
    HELICONE_AVAILABLE = True
except ImportError:
    import openai
    helicone_openai = openai
    HELICONE_AVAILABLE = False
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
        self.api_key = os.environ.get("OPENAI_API_KEY", "dummy-key-for-tests")
        self.helicone_api_key = os.environ.get("HELICONE_API_KEY", "dummy-helicone-key")
        
        # Initialize OpenAI client based on version
        if USING_OPENAI_V1:
            # For OpenAI v1.x.x
            # Using default_headers instead of headers for Helicone auth
            self.client = helicone_openai.AsyncOpenAI(
                api_key=self.api_key,
                default_headers={
                    "Helicone-Auth": f"Bearer {self.helicone_api_key}"
                }
            )
        else:
            # For OpenAI v0.x.x
            helicone_openai.api_key = self.api_key
            self.client = helicone_openai
            # Set headers for older API
            self.headers = {
                "Helicone-Auth": f"Bearer {self.helicone_api_key}"
            }

    async def generate_embeddings(self, text: str) -> List[float]:
        """
        Generate embeddings for the given text using Helicone-wrapped OpenAI API.
        
        Args:
            text (str): Input text to generate embeddings for
            
        Returns:
            List[float]: The generated embedding vector
        """
        if not text:
            raise ValueError("Text cannot be empty")
            
        if USING_OPENAI_V1:
            # OpenAI v1.x.x API
            response = await self.client.embeddings.create(
                model="text-embedding-ada-002",
                input=text
            )
            # Handle both object and dict responses (for testing)
            if hasattr(response.data[0], 'embedding'):
                return response.data[0].embedding
            else:
                return response.data[0]["embedding"]
        else:
            # OpenAI v0.x.x API
            response = await self.client.Embedding.create(
                model="text-embedding-ada-002",
                input=text,
                headers=self.headers
            )
            return response["data"][0]["embedding"]

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
        if not messages:
            raise ValueError("Messages cannot be empty")
            
        if USING_OPENAI_V1:
            # OpenAI v1.x.x API
            headers = {}
            if custom_properties and HELICONE_AVAILABLE:
                headers["Helicone-Property-Custom"] = json.dumps(custom_properties)
                
            response = await self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=messages,
                temperature=0.7,
                headers=headers
            )
            
            # Handle both object and dict responses (for testing)
            content = ""
            if hasattr(response.choices[0], 'message'):
                content = response.choices[0].message.content
            else:
                content = response.choices[0]["message"]["content"]
            
            usage = response.usage.total_tokens if hasattr(response, 'usage') and hasattr(response.usage, 'total_tokens') else response.usage["total_tokens"] if isinstance(response.usage, dict) else 0
            model = response.model if hasattr(response, 'model') else response.get("model", "")
            
            return {
                "content": content,
                "usage": usage,
                "model": model
            }
        else:
            # OpenAI v0.x.x API
            headers = self.headers.copy()
            if custom_properties and HELICONE_AVAILABLE:
                headers["Helicone-Property-Custom"] = json.dumps(custom_properties)
                
            response = await self.client.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=messages,
                temperature=0.7,
                headers=headers
            )
            
            return {
                "content": response["choices"][0]["message"]["content"],
                "usage": response["usage"]["total_tokens"],
                "model": response["model"]
            }

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
        # Implement Helicone feedback logging
        # This is a placeholder - actual implementation would use Helicone's feedback API
        print(f"Feedback logged for request {request_id}: Rating {rating}, Feedback: {feedback_text}") 