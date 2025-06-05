import openai
import os
import json
from dotenv import load_dotenv
from typing import List, Dict, Tuple, Any

# Load environment variables
#load_dotenv('.env.local')
if os.getenv("ZEA_ENV") != "production":
    load_dotenv(".env.local")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = openai.OpenAI(api_key=OPENAI_API_KEY)  # Initialize client properly

def parse_entities_and_relationships(response_content: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Parse the OpenAI response to extract entities and relationships
    """
    entities = []
    relationships = []
    
    try:
        # Split the response into entities and relationships sections
        if "ENTITIES:" in response_content and "RELATIONSHIPS:" in response_content:
            parts = response_content.split("RELATIONSHIPS:")
            entities_text = parts[0].replace("ENTITIES:", "").strip()
            relationships_text = parts[1].strip()
            
            # Parse entities
            for entity_line in entities_text.split("\n"):
                if entity_line.strip():
                    # Format: Name [Type]: Description
                    if ":" in entity_line:
                        entity_parts = entity_line.split(":", 1)
                        name_type = entity_parts[0].strip()
                        description = entity_parts[1].strip() if len(entity_parts) > 1 else ""
                        
                        # Extract name and type
                        if "[" in name_type and "]" in name_type:
                            name = name_type.split("[")[0].strip()
                            entity_type = name_type.split("[")[1].split("]")[0].strip()
                            entities.append({
                                "name": name,
                                "type": entity_type,
                                "description": description
                            })
            
            # Parse relationships
            for rel_line in relationships_text.split("\n"):
                if rel_line.strip():
                    # Format: Entity1 [Relationship] Entity2: Description
                    if "[" in rel_line and "]" in rel_line:
                        parts = rel_line.split("[")
                        source = parts[0].strip()
                        remaining = parts[1].split("]")
                        relation_type = remaining[0].strip()
                        
                        # Extract target and description
                        target_desc = remaining[1].strip()
                        if ":" in target_desc:
                            target_parts = target_desc.split(":", 1)
                            target = target_parts[0].strip()
                            description = target_parts[1].strip() if len(target_parts) > 1 else ""
                        else:
                            target = target_desc
                            description = ""
                            
                        relationships.append({
                            "source": source,
                            "relation": relation_type,
                            "target": target,
                            "description": description
                        })
    except Exception as e:
        print(f"Error parsing response: {e}")
    
    return entities, relationships

def process_chunk(chunk: Dict[str, Any]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Process a single chunk through the OpenAI API
    """
    text = chunk["text"]
    chunk_id = chunk["id"]
    
    prompt = f"""
    Extract the entities, their descriptions, and the relationships between them from the following text. 
    Format your response with 'ENTITIES:' followed by entity information and 'RELATIONSHIPS:' followed by relationship information.
    
    For entities, use the format: Name [Type]: Description
    For relationships, use the format: Entity1 [Relationship] Entity2: Description
    
    Identify entities such as locations, organizations, people, infrastructure, environmental elements, and social factors.
    
    TEXT: {text}
    """
    
    try:
        # Updated API call format for OpenAI client v1.0.0+
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an entity and relationship extraction assistant for ESG reports."},
                {"role": "user", "content": prompt}
            ],
            temperature=0
        )
        
        # Extract content directly from the response
        content = response.choices[0].message.content
        entities, relationships = parse_entities_and_relationships(content)
        
        # Add chunk ID to each entity and relationship
        for entity in entities:
            entity["chunk_id"] = chunk_id
            
        for relation in relationships:
            relation["chunk_id"] = chunk_id
            
        return entities, relationships
        
    except Exception as e:
        print(f"Error processing chunk {chunk_id}: {e}")
        return [], []

def main():
    # Load chunks from the JSON file
    try:
        with open("./chunks/esg4_chunks.json", "r", encoding="utf-8") as f:
            chunks = json.load(f)
    except Exception as e:
        print(f"Error loading chunks file: {e}")
        return
    
    print(f"Loaded {len(chunks)} chunks from file.")
    
    all_entities = []
    all_relationships = []
    
    # Process each chunk
    for i, chunk in enumerate(chunks):
        print(f"Processing chunk {i+1}/{len(chunks)}: {chunk['id']}")
        entities, relationships = process_chunk(chunk)
        
        all_entities.extend(entities)
        all_relationships.extend(relationships)
        
        print(f"  - Extracted {len(entities)} entities and {len(relationships)} relationships")
    
    # Save results to files
    output_dir = "./output"
    os.makedirs(output_dir, exist_ok=True)
    
    with open(f"{output_dir}/entities.json", "w", encoding="utf-8") as f:
        json.dump(all_entities, f, ensure_ascii=False, indent=2)
        
    with open(f"{output_dir}/relationships.json", "w", encoding="utf-8") as f:
        json.dump(all_relationships, f, ensure_ascii=False, indent=2)
    
    print(f"\nProcessing complete. Extracted {len(all_entities)} total entities and {len(all_relationships)} total relationships.")
    print(f"Results saved to {output_dir}/entities.json and {output_dir}/relationships.json")

if __name__ == "__main__":
    main()