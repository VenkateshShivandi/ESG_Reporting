def validate_chunk_schema(chunk):
    """Validate that a chunk has all required metadata fields."""
    required_fields = ["id", "text", "section", "type"]
    errors = []
    
    for field in required_fields:
        if field not in chunk:
            errors.append(f"Missing required field: {field}")
    
    # Validate specific fields
    if "esg_relevance" in chunk and not (0 <= chunk["esg_relevance"] <= 1):
        errors.append("esg_relevance must be between 0 and 1")
        
    if "section_level" in chunk and not isinstance(chunk["section_level"], int):
        errors.append("section_level must be an integer")
    
    return errors 