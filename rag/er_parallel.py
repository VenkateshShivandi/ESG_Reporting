import concurrent.futures
from typing import Dict, List, Tuple, Set
from tqdm import tqdm
from openai import OpenAI
import json
import os
from dataclasses import dataclass, field
from datetime import datetime
from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

@dataclass
class Entity:
    name: str
    type: str
    descriptions: List[str] = field(default_factory=list)
    chunk_ids: Set[str] = field(default_factory=set)

    def to_dict(self) -> Dict:
        return {
            "name": self.name,
            "type": self.type,
            "descriptions": self.descriptions,
            "chunk_ids": list(self.chunk_ids)
        }

@dataclass
class Relationship:
    source: str
    target: str
    type: str
    description: str
    chunk_id: str

    def to_dict(self) -> Dict:
        return {
            "source": self.source,
            "target": self.target,
            "type": self.type,
            "description": self.description,
            "chunk_id": self.chunk_id
        }

class EntityRelationshipManager:
    def __init__(self, 
                 model_name: str = "gpt-4",
                 max_workers: int = 8,
                 batch_size: int = 10):
        self.model_name = model_name
        self.max_workers = max_workers
        self.batch_size = batch_size
        self.client = OpenAI()
        
    def process_document(self, file_id: str, chunks: List[Dict], embeddings: List[List[float]]) -> Tuple[Dict[str, Entity], List[Relationship]]:
        """
        Process an entire document to extract entities and relationships from its chunks.
        
        Args:
            file_id: The unique identifier for the document
            chunks: List of text chunks with their metadata
            embeddings: List of embeddings for each chunk
            
        Returns:
            Tuple containing entities dictionary and relationships list
        """
        entities = {}
        relationships = []
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Submit chunks for processing in batches
            futures = []
            for i in range(0, len(chunks), self.batch_size):
                batch = chunks[i:i + self.batch_size]
                future = executor.submit(self._process_chunk_batch, batch)
                futures.append(future)
            
            # Process results as they complete
            with tqdm(total=len(futures), desc="Processing chunk batches") as pbar:
                for future in concurrent.futures.as_completed(futures):
                    try:
                        batch_entities, batch_relationships = future.result()
                        self._merge_batch_results(entities, relationships, batch_entities, batch_relationships)
                        pbar.update(1)
                    except Exception as e:
                        print(f"Error processing batch: {str(e)}")
                        pbar.update(1)
        
        return entities, relationships

    def _process_chunk_batch(self, chunks: List[Dict]) -> Tuple[Dict[str, Entity], List[Relationship]]:
        """
        Process a batch of chunks to extract entities and relationships.
        
        Args:
            chunks: List of chunks to process
            
        Returns:
            Tuple of entities and relationships extracted from the batch
        """
        batch_entities = {}
        batch_relationships = []
        
        for chunk in chunks:
            try:
                chunk_entities, chunk_relationships = self._extract_from_chunk(chunk)
                self._merge_batch_results(batch_entities, batch_relationships, chunk_entities, chunk_relationships)
            except Exception as e:
                print(f"Error processing chunk: {str(e)}")
                continue
                
        return batch_entities, batch_relationships

    def _extract_from_chunk(self, chunk: Dict) -> Tuple[Dict[str, Entity], List[Relationship]]:
        """
        Extract entities and relationships from a single chunk using LLM.
        
        Args:
            chunk: The chunk to process
            
        Returns:
            Tuple of entities and relationships extracted from the chunk
        """
        prompt = self._prepare_extraction_prompt(chunk["text"])
        
        response = self.client.chat.completions.create(
            model=self.model_name,
            messages=[
                {"role": "system", "content": "You are an expert at extracting entities and relationships from text."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            max_tokens=4000
        )
        
        result = response.choices[0].message.content
        return self._parse_extraction_result(result, chunk["chunk_id"])

    def _prepare_extraction_prompt(self, text: str) -> str:
        """
        Prepare the prompt for entity and relationship extraction.
        
        Args:
            text: The text to analyze
            
        Returns:
            Formatted prompt string
        """
        # TODO: Import or define these constants
        from rag.entity_extraction import GRAPH_EXTRACTION_PROMPT
        return GRAPH_EXTRACTION_PROMPT.format(
            entity_types="Organization, Person, Location, Document, Topic, Claim, Metric",
            input_text=text[:8000],  # Limit text length
            tuple_delimiter="|",
            record_delimiter=";",
            completion_delimiter="###"
        )

    def _parse_extraction_result(self, result: str, chunk_id: str) -> Tuple[Dict[str, Entity], List[Relationship]]:
        """
        Parse the LLM response into structured entities and relationships.
        
        Args:
            result: The LLM response text in format:
                   ("entity"|name|type|description);
                   ("relationship"|source|target|description|weight);
            chunk_id: ID of the chunk being processed
            
        Returns:
            Tuple of parsed entities and relationships
        """
        entities = {}
        relationships = []
        
        try:
            # Split the result into individual records
            records = result.strip().split("\n;\n")
            
            for record in records:
                record = record.strip()
                if not record:
                    continue
                    
                try:
                    # Remove outer parentheses and quotes
                    record = record.strip('()"')
                    parts = record.split("|")
                    
                    if len(parts) < 4:
                        print(f"Warning: Skipping invalid record (too few parts): {record}")
                        continue
                        
                    record_type = parts[0].strip('"')
                    
                    if record_type.lower() == "entity":
                        # Handle entity record
                        entity_name = parts[1].strip()
                        entity_type = parts[2].strip()
                        entity_description = parts[3].strip().strip(")")  # Remove trailing parenthesis
                        
                        if entity_name and entity_type:
                            entity = entities.get(entity_name, Entity(
                                name=entity_name,
                                type=entity_type,
                                descriptions=[],
                                chunk_ids=set()
                            ))
                            entity.descriptions.append(entity_description)
                            entity.chunk_ids.add(chunk_id)
                            entities[entity_name] = entity
                            
                    elif record_type.lower() == "relationship":
                        # Handle relationship record
                        source = parts[1].strip()
                        target = parts[2].strip()
                        description = parts[3].strip()
                        # Extract relationship type from description or use a default
                        rel_type = "connects_to"  # Default type
                        
                        if source and target:
                            relationship = Relationship(
                                source=source,
                                target=target,
                                type=rel_type,
                                description=description,
                                chunk_id=chunk_id
                            )
                            relationships.append(relationship)
                            
                except Exception as e:
                    print(f"Warning: Error parsing record: {record}. Error: {str(e)}")
                    continue
                    
        except Exception as e:
            print(f"Error parsing extraction result: {str(e)}")
            print(f"Raw result: {result}")
            
        return entities, relationships

    def _merge_batch_results(self,
                           main_entities: Dict[str, Entity],
                           main_relationships: List[Relationship],
                           new_entities: Dict[str, Entity],
                           new_relationships: List[Relationship]):
        """
        Merge new batch results into the main collections.
        
        Args:
            main_entities: Main entities dictionary to merge into
            main_relationships: Main relationships list to merge into
            new_entities: New entities to merge
            new_relationships: New relationships to merge
        """
        # Merge entities
        for entity_name, entity in new_entities.items():
            if entity_name in main_entities:
                # Merge descriptions and chunk_ids
                main_entities[entity_name].descriptions.extend(entity.descriptions)
                main_entities[entity_name].chunk_ids.update(entity.chunk_ids)
            else:
                main_entities[entity_name] = entity
        
        # Add new relationships
        main_relationships.extend(new_relationships)

    def store_results(self, file_id: str, entities: Dict[str, Entity], relationships: List[Relationship]) -> bool:
        """
        Store the extracted entities and relationships in the database.
        
        Args:
            file_id: The document ID
            entities: Dictionary of entities to store
            relationships: List of relationships to store
            
        Returns:
            Boolean indicating success
        """
        try:
            # Fetch all chunk IDs for this document from the document_chunks table
            response = supabase.postgrest.schema("esg_data").table("document_chunks") \
                .select("id") \
                .eq("document_id", file_id) \
                .execute()
            
            # Get the list of database chunk IDs
            db_chunk_ids = [row.get('id') for row in response.data if row.get('id') is not None]
            
            print(f"Found {len(db_chunk_ids)} chunks in document_chunks table")
            
            if not db_chunk_ids:
                print("Warning: No chunk IDs found for this document")
                return False
            
            # Since we can't directly map entity chunk_ids to database IDs,
            # we'll use the first available database chunk ID for all entities and relationships
            # This is a fallback approach - ideally you would have a way to match the correct chunks
            db_chunk_id = db_chunk_ids[0]
            
            # Transform entities into records
            entities_records = []
            for name, entity in entities.items():
                # Create a single record for each entity using the database chunk ID
                # Join all descriptions into a single text for the description column
                entity_description = "; ".join(entity.descriptions) if entity.descriptions else ""
                
                entity_record = {
                    "entity_name": entity.name,
                    "entity_type": entity.type,
                    "document_id": file_id,
                    "chunk_id": db_chunk_id,
                    "created_at": datetime.now().isoformat(),
                    "description": entity_description
                }
                entities_records.append(entity_record)
            
            # Transform relationships
            relationships_data = []
            for rel in relationships:
                rel_record = {
                    "source_entity_name": rel.source,
                    "relation_type": rel.type,
                    "target_entity_name": rel.target,
                    "document_id": file_id,
                    "chunk_id": db_chunk_id,
                    "created_at": datetime.now().isoformat(),
                    "description": rel.description
                }
                relationships_data.append(rel_record)
            
            print(f"Prepared {len(entities_records)} entity records and {len(relationships_data)} relationship records")
            
            # Store entities in Supabase
            if entities_records:
                supabase.postgrest.schema("esg_data").table("entities").insert(entities_records).execute()
                print(f"Successfully stored {len(entities_records)} entities")
            
            # Store relationships in Supabase
            if relationships_data:
                supabase.postgrest.schema("esg_data").table("relationships").insert(relationships_data).execute()
                print(f"Successfully stored {len(relationships_data)} relationships")
            
            return True
        except Exception as e:
            print(f"Error storing results: {str(e)}")
            print(f"First entity record (sample): {entities_records[0] if 'entities_records' in locals() and entities_records else 'No entities'}")
            print(f"First relationship record (sample): {relationships_data[0] if 'relationships_data' in locals() and relationships_data else 'No relationships'}")
            return False

    def get_entities_for_document(self, file_id: str) -> Dict[str, Entity]:
        """
        Retrieve all entities associated with a document.
        
        Args:
            file_id: The document ID
            
        Returns:
            Dictionary of entities
        """
        # TODO: Implement retrieval logic
        pass

    def get_relationships_for_document(self, file_id: str) -> List[Relationship]:
        """
        Retrieve all relationships associated with a document.
        
        Args:
            file_id: The document ID
            
        Returns:
            List of relationships
        """
        # TODO: Implement retrieval logic
        pass
