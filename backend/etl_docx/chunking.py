from sentence_transformers import SentenceTransformer, util
import nltk
nltk.download('punkt')
from nltk.tokenize import sent_tokenize
from typing import List, Dict

# Pre-trained Sentence-BERT model
model = SentenceTransformer('all-MiniLM-L6-v2')

def semantic_chunk_text(sections: List[Dict], similarity_threshold=0.35, max_chunk_size=512):
    """
    Optimized chunking to avoid chunks that are too long, with improved title handling.
    """
    chunks = []
    
    for section in sections:
        section_title = section["heading"] if section["heading"] else "No Title"
        sentences = sent_tokenize(section["content"])

        current_chunk = []
        chunk_length = 0

        for i in range(len(sentences) - 1):
            sentence = sentences[i].replace("\n", ". ")
            current_chunk.append(sentence)
            chunk_length += len(sentence)

            # Calculate semantic similarity between current sentence and the next one
            embedding1 = model.encode(sentences[i], convert_to_tensor=True)
            embedding2 = model.encode(sentences[i + 1], convert_to_tensor=True)
            similarity = util.pytorch_cos_sim(embedding1, embedding2).item()

            if (similarity < similarity_threshold and len(current_chunk) >= 3) or chunk_length >= max_chunk_size:
                chunks.append({
                    "title": section_title,
                    "text": " ".join(current_chunk)
                })
                current_chunk = []
                chunk_length = 0

        if current_chunk:
            chunks.append({
                "title": section_title,
                "text": " ".join(current_chunk)
            })

    return chunks
