from sentence_transformers import SentenceTransformer, util
import nltk
nltk.download('punkt')
from nltk.tokenize import sent_tokenize
from typing import List, Dict
import spacy

# Load pre-trained SentenceTransformer model
model = SentenceTransformer('all-mpnet-base-v2')
nlp = spacy.load("es_core_news_sm")

def semantic_chunk_text(sections: List[Dict], similarity_threshold=0.25, max_chunk_size=700):
    """Chunk text based on semantic similarity and max chunk size, making chunks more compact but not too dense."""
    chunks = []
    prev_title = None
    
    for section in sections:
        section_title = section["heading"]
        sentences = [sent.text.strip() for sent in nlp(section["content"]).sents if sent.text.strip()]
        current_chunk, chunk_length = [], 0
        
        for i in range(len(sentences) - 1):
            sentence = sentences[i].replace("\n", ". ")
            if len(sentence) < 10 and current_chunk:  # Merge very short sentences
                current_chunk[-1] += " " + sentence
            else:
                current_chunk.append(sentence)
                chunk_length += len(sentence)
            
            embedding1 = model.encode(sentences[i], convert_to_tensor=True)
            embedding2 = model.encode(sentences[i + 1], convert_to_tensor=True)
            similarity = util.pytorch_cos_sim(embedding1, embedding2).item()
            
            if (similarity < similarity_threshold and len(current_chunk) >= 3) or chunk_length >= max_chunk_size:
                if prev_title == section_title and len(chunks) > 0:  # 合并相邻相同标题的 chunk
                    chunks[-1]["text"] += " " + " ".join(current_chunk)
                else:
                    chunks.append({"title": section_title, "text": " ".join(current_chunk)})
                prev_title = section_title
                current_chunk, chunk_length = [], 0
        
        if current_chunk:
            if prev_title == section_title and len(chunks) > 0:  # 继续合并
                chunks[-1]["text"] += " " + " ".join(current_chunk)
            else:
                chunks.append({"title": section_title, "text": " ".join(current_chunk)})
    
    # 处理可能的孤立短 chunk
    if len(chunks) > 1 and len(chunks[-1]["text"]) < 50:
        chunks[-2]["text"] += " " + chunks[-1]["text"]
        chunks.pop()
    
    return chunks
