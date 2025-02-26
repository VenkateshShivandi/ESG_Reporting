# Helicone Integration for ESG MVP

This module provides Helicone integration for monitoring and analyzing LLM usage in the ESG MVP project.

## Features

- Embedding generation with Helicone tracking
- Chat completion with custom property tracking
- Feedback logging capability
- Comprehensive error handling
- Test suite for validation

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set up environment variables:
- Copy `.env.example` to `.env`
- Fill in your OpenAI and Helicone API keys

## Usage

```python
from services.llm_service import LLMService

# Initialize the service
llm_service = LLMService()

# Generate embeddings
embeddings = await llm_service.generate_embeddings("Your ESG text here")

# Get chat completion
messages = [
    {"role": "system", "content": "You are an ESG reporting assistant."},
    {"role": "user", "content": "What are key environmental metrics?"}
]
response = await llm_service.get_chat_completion(messages)

# Log feedback
llm_service.log_feedback("request_id", 5, "Great response!")
```

## Testing

Run tests using pytest:
```bash
pytest tests/
```

## Monitoring

Access your Helicone dashboard to view:
- Request logs
- Performance metrics
- Usage patterns
- Error rates
- User feedback

## Best Practices

1. Always include custom properties for better request tracking
2. Monitor response times and adjust batch sizes accordingly
3. Implement proper error handling in production
4. Regularly review Helicone analytics for optimization opportunities 