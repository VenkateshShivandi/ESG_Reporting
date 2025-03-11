"""
Transformation module for the ESG PDF ETL Pipeline.

This module handles transforming extracted content into semantic chunks,
calculating ESG relevance, and preparing data for RAG.
"""

import json
import logging
import re
import time
import uuid
from typing import Dict, List, Any, Optional
import numpy as np
import nltk
from nltk.tokenize import sent_tokenize
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import math
import os

# Import refactored modules
from parsers.pdf_parser.compute_simplified_embeddings import compute_simplified_embeddings
from parsers.pdf_parser.create_ocr_chunks import create_ocr_chunks

# Add these utility imports
from parsers.utils.text_utils import (
    clean_text,
    detect_language,
    get_sentence_tokenizer_for_language
)
from parsers.utils.file_utils import create_directory

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Placeholder for ETL settings (to be replaced with actual config file)
try:
    from config.etl_settings import (
        MIN_CHUNK_SIZE,
        MAX_CHUNK_SIZE,
        CHUNK_SIMILARITY_THRESHOLD,
        MAX_CHUNK_OVERLAP,
        EMBEDDING_MODEL_NAME,
        ESG_RELEVANCE_THRESHOLD,
        LARGE_DOCUMENT_THRESHOLD,
        ENABLE_PERFORMANCE_OPTIMIZATIONS,
        CHUNK_TYPE
    )
except ImportError:
    logging.warning("config.etl_settings not found. Using default values.")
    MIN_CHUNK_SIZE = 1
    MAX_CHUNK_SIZE = 15
    CHUNK_SIMILARITY_THRESHOLD = 0.7
    MAX_CHUNK_OVERLAP = 2
    EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"
    ESG_RELEVANCE_THRESHOLD = 0.0
    LARGE_DOCUMENT_THRESHOLD = 50
    ENABLE_PERFORMANCE_OPTIMIZATIONS = True
    CHUNK_TYPE = "semantic"  # Options: "basic", "semantic", "mixed"

# Define constants
DEFAULT_LANGUAGE = "en"
SUPPORTED_LANGUAGES = ["en", "es", "fr", "de", "pt"]

class CustomEncoder(json.JSONEncoder):
    """Custom JSON encoder to handle numpy types and other non-standard types."""
    def default(self, obj):
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        return str(obj)

def split_into_sentences(text: str) -> List[str]:
    """Split text into sentences with improved handling for various languages and formats."""
    if not text:
        return []
    cleaned_text = text
    cleaned_text = re.sub(r"\n+", ". ", cleaned_text)
    cleaned_text = re.sub(r"\s*\|\s*", ". ", cleaned_text)
    cleaned_text = re.sub(r"(?<=\w);(?=\s*\w)", ";. ", cleaned_text)
    cleaned_text = re.sub(r"(?<=\w):(?=\s*\w)", ":. ", cleaned_text)
    cleaned_text = re.sub(r"([A-Za-z]+:)([^\.;]*)", r"\1\2. ", cleaned_text)
    cleaned_text = re.sub(r"(\d+\s*\w+\s*\d+\.\d+)", r"\1. ", cleaned_text)
    cleaned_text = re.sub(r"(^|\n)(\d+\.|•|\*|-)\s*", r"\1\2 ", cleaned_text)
    cleaned_text = re.sub(r"(•|\*|-|\d+\.)\s+([^\.;:!?]+)", r"\1 \2. ", cleaned_text)
    sentences = sent_tokenize(cleaned_text, language="english")
    all_sentences = [s.strip() for s in sentences if s.strip() and len(s.strip()) > 3 and not re.match(r"^[\d\s\-\.,:/\\]*$", s.strip())]
    if len(all_sentences) < 3 and len(text) > 300:
        logger.info("Document not splitting well, enforcing more granular chunking")
        all_sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+|(?<=\n)\s*|\s*\n\s*|\s*\|\s*", text) if len(s.strip()) > 3]
    logger.info(f"Split text into {len(all_sentences)} sentences")
    return all_sentences

def compute_sentence_embeddings(sentences: List[str]) -> np.ndarray:
    """Compute embeddings for a list of sentences using a pre-trained model."""
    if not sentences:
        logger.warning("No sentences provided for embedding")
        return np.array([])
    try:
        model_name = EMBEDDING_MODEL_NAME
        logger.info(f"Computing sentence embeddings with {model_name} for {len(sentences)} sentences")
        model = SentenceTransformer(model_name)
        batch_size = 256 if len(sentences) > 500 else 128 if len(sentences) > 100 else 32
        show_progress_bar = len(sentences) > 100
        embeddings = model.encode(
            sentences, batch_size=batch_size, show_progress_bar=show_progress_bar, convert_to_numpy=True
        )
        logger.info(f"Successfully computed {embeddings.shape[1]}-dimensional embeddings")
        return embeddings
    except Exception as e:
        logger.error(f"Error computing embeddings: {str(e)}")
        raise

def create_basic_chunks(sentences: List[str], max_chunk_size: int = MAX_CHUNK_SIZE) -> List[Dict[str, Any]]:
    """Create basic chunks by grouping sentences sequentially as a fallback."""
    if not sentences:
        return []
    chunks = []
    for i in range(0, len(sentences), max_chunk_size):
        group = sentences[i:i + max_chunk_size]
        text = " ".join(group)
        chunk = {
            "id": str(uuid.uuid4()),
            "text": text,
            "sentences": len(group),
            "span": [i, min(i + max_chunk_size - 1, len(sentences) - 1)],
            "word_count": len(text.split()),
            "char_count": len(text),
            "token_estimate": len(text.split()) + 10,
            "esg_relevance": calculate_esg_relevance(text),
            "contains_ocr": "OCR" in text or "ocr_text" in text
        }
        chunks.append(chunk)
    return chunks

def create_semantic_chunks(
    sentences: List[str],
    embeddings: np.ndarray,
    max_chunk_size: int = MAX_CHUNK_SIZE,
    min_chunk_size: int = MIN_CHUNK_SIZE,
    similarity_threshold: float = CHUNK_SIMILARITY_THRESHOLD,
    max_overlap: int = MAX_CHUNK_OVERLAP
) -> List[Dict[str, Any]]:
    """Create semantically coherent chunks based on sentence embeddings."""
    if not sentences:
        return []
    if len(sentences) <= max_chunk_size:
        if len(sentences) > 3:
            chunk_size = max(min_chunk_size, len(sentences) // 3)
            chunks = []
            for i in range(0, len(sentences), chunk_size):
                end_idx = min(i + chunk_size, len(sentences))
                group = sentences[i:end_idx]
                if not group:
                    continue
                text = " ".join(group)
                if len(text.strip()) < 10:
                    continue
                chunks.append({
                    "id": str(uuid.uuid4())[:8],
                    "text": text,
                    "sentences": len(group),
                    "span": [i, end_idx - 1],
                    "word_count": len(text.split()),
                    "char_count": len(text),
                    "token_estimate": len(text.split()) + 10,
                    "esg_relevance": calculate_esg_relevance(text),
                    "contains_ocr": "OCR" in text or "ocr_text" in text
                })
            if len(chunks) > 1:
                logger.info(f"Created {len(chunks)} chunks for small document")
                return chunks
        text = " ".join(sentences)
        return [{
            "id": str(uuid.uuid4())[:8],
            "text": text,
            "sentences": len(sentences),
            "span": [0, len(sentences) - 1],
            "word_count": len(text.split()),
            "char_count": len(text),
            "token_estimate": len(text.split()) + 10,
            "esg_relevance": calculate_esg_relevance(text),
            "contains_ocr": "OCR" in text or "ocr_text" in text
        }]
    chunks = []
    current_chunk = []
    current_start = 0
    topic_change_scores = []
    for i in range(1, len(embeddings)):
        prev_embedding = embeddings[i - 1]
        curr_embedding = embeddings[i]
        prev_norm = np.linalg.norm(prev_embedding)
        curr_norm = np.linalg.norm(curr_embedding)
        if prev_norm > 0 and curr_norm > 0:
            similarity = np.dot(prev_embedding, curr_embedding) / (prev_norm * curr_norm)
            change_score = 1.0 - similarity
        else:
            change_score = 1.0
        topic_change_scores.append(change_score)
    break_points = []
    if topic_change_scores:
        mean_change = np.mean(topic_change_scores)
        std_change = np.std(topic_change_scores)
        adaptive_threshold = min(0.5, mean_change + std_change * 0.8)
        for i, score in enumerate(topic_change_scores):
            if score > adaptive_threshold:
                break_points.append(i + 1)
        logger.info(f"Detected {len(break_points)} natural topic transitions (mean change: {mean_change:.3f}, threshold: {adaptive_threshold:.3f})")
    current_chunk = []
    current_start = 0
    last_break_point = 0
    min_break_distance = min(3, min_chunk_size)
    for i in range(len(sentences)):
        if i == 0:
            current_chunk.append(sentences[i])
            continue
        if len(current_chunk) >= max_chunk_size:
            text = " ".join(current_chunk)
            chunks.append({
                "id": str(uuid.uuid4())[:8],
                "text": text,
                "sentences": len(current_chunk),
                "span": [current_start, i - 1],
                "word_count": len(text.split()),
                "char_count": len(text),
                "token_estimate": len(text.split()) + 10,
                "esg_relevance": calculate_esg_relevance(text),
                "contains_ocr": "OCR" in text or "ocr_text" in text
            })
            overlap_start = max(0, i - max_overlap)
            current_start = overlap_start
            current_chunk = sentences[overlap_start:i] + [sentences[i]]
            continue
        if i in break_points and len(current_chunk) >= min_chunk_size:
            current_embedding = embeddings[i]
            chunk_embeddings = embeddings[current_start:i]
            if chunk_embeddings.size > 0:
                avg_embedding = np.mean(chunk_embeddings, axis=0)
                avg_norm = np.linalg.norm(avg_embedding)
                curr_norm = np.linalg.norm(current_embedding)
                if avg_norm > 0 and curr_norm > 0:
                    similarity = np.dot(current_embedding, avg_embedding) / (curr_norm * avg_norm)
                    if similarity < similarity_threshold and len(current_chunk) >= min_chunk_size:
                        text = " ".join(current_chunk)
                        ends_incomplete = any(text.rstrip().endswith(end) for end in [",", ";", ":", "(", "-"])
                        if ends_incomplete and i < len(sentences) - 1:
                            text += " " + sentences[i]
                            end_idx = i
                        else:
                            end_idx = i - 1
                        chunks.append({
                            "id": str(uuid.uuid4())[:8],
                            "text": text,
                            "sentences": len(current_chunk) + (1 if ends_incomplete else 0),
                            "span": [current_start, end_idx],
                            "word_count": len(text.split()),
                            "char_count": len(text),
                            "token_estimate": len(text.split()) + 10,
                            "esg_relevance": calculate_esg_relevance(text),
                            "contains_ocr": "OCR" in text or "ocr_text" in text
                        })
                        current_start = i
                        current_chunk = [sentences[i]]
                        last_break_point = i
                        continue
        force_break = False
        if len(current_chunk) >= min_chunk_size:
            if sentences[i].strip().startswith("Table ") or sentences[i].strip().startswith("Figure "):
                force_break = True
            elif (
                len(sentences[i].split()) <= 8
                and sentences[i].strip().endswith(":")
                and not sentences[i - 1].strip().endswith(":")
            ):
                force_break = True
        if force_break:
            text = " ".join(current_chunk)
            chunks.append({
                "id": str(uuid.uuid4())[:8],
                "text": text,
                "sentences": len(current_chunk),
                "span": [current_start, i - 1],
                "word_count": len(text.split()),
                "char_count": len(text),
                "token_estimate": len(text.split()) + 10,
                "esg_relevance": calculate_esg_relevance(text),
                "contains_ocr": "OCR" in text or "ocr_text" in text
            })
            current_start = i
            current_chunk = [sentences[i]]
            last_break_point = i
            continue
        current_chunk.append(sentences[i])
    if current_chunk:
        text = " ".join(current_chunk)
        chunks.append({
            "id": str(uuid.uuid4())[:8],
            "text": text,
            "sentences": len(current_chunk),
            "span": [current_start, len(sentences) - 1],
            "word_count": len(text.split()),
            "char_count": len(text),
            "token_estimate": len(text.split()) + 10,
            "esg_relevance": calculate_esg_relevance(text),
            "contains_ocr": "OCR" in text or "ocr_text" in text
        })
    if len(chunks) > 1:
        i = 0
        while i < len(chunks) - 1:
            current = chunks[i]
            next_chunk = chunks[i + 1]
            if current["word_count"] < 10 or next_chunk["word_count"] < 10:
                current_embedding = np.mean(embeddings[current["span"][0]:current["span"][1]+1], axis=0)
                next_embedding = np.mean(embeddings[next_chunk["span"][0]:next_chunk["span"][1]+1], axis=0)
                current_norm = np.linalg.norm(current_embedding)
                next_norm = np.linalg.norm(next_embedding)
                similarity = np.dot(current_embedding, next_embedding) / (current_norm * next_norm) if current_norm > 0 and next_norm > 0 else 0.0
                if similarity > 0.7:
                    merged_text = current["text"] + " " + next_chunk["text"]
                    merged_chunk = {
                        "id": str(uuid.uuid4())[:8],
                        "text": merged_text,
                        "sentences": current["sentences"] + next_chunk["sentences"],
                        "span": [current["span"][0], next_chunk["span"][1]],
                        "word_count": len(merged_text.split()),
                        "char_count": len(merged_text),
                        "token_estimate": len(merged_text.split()) + 10,
                        "esg_relevance": calculate_esg_relevance(merged_text),
                        "contains_ocr": current.get("contains_ocr", False) or next_chunk.get("contains_ocr", False)
                    }
                    chunks[i] = merged_chunk
                    chunks.pop(i + 1)
                else:
                    i += 1
            else:
                i += 1
    logger.info(f"Created {len(chunks)} semantically coherent chunks")
    return chunks

def calculate_esg_relevance(text: str) -> float:
    """Calculate the ESG relevance score for a chunk of text."""
    if not text:
        return 0.0
    text_lower = text.lower()
    esg_keywords = {
        "environmental": [
            "environmental", "climate", "carbon", "emission", "greenhouse", "renewable",
            "sustainability", "sustainable", "green", "pollution", "waste", "recycling",
            "biodiversity", "energy efficiency", "clean energy", "conservation",
            "climate change", "carbon footprint", "net zero", "eco", "renewable energy",
            # Spanish additions
            "ambiental", "cambio climático", "huella de carbono", "energía renovable",
            "sostenibilidad", "parques solares", "impactos ambientales", "energía solar"
        ],
        "social": [
            "social", "community", "human rights", "diversity", "inclusion", "employee",
            "labor", "health", "safety", "gender", "equality", "discrimination", "harassment",
            "fair trade", "supply chain", "child labor", "forced labor", "working conditions",
            "social impact", "stakeholder", "csr", "corporate social responsibility",
            # Spanish additions
            "social", "comunidad", "derechos humanos", "diversidad", "inclusión",
            "condiciones de trabajo", "impacto social", "cohesión social", "inversión social"
        ],
        "governance": [
            "governance", "board", "compliance", "transparency", "ethics", "corruption",
            "bribery", "executive", "compensation", "shareholder", "voting", "audit",
            "risk management", "disclosure", "accountability", "regulation", "policy",
            "whistle", "whistleblower", "corporate governance", "conflict of interest",
            # Spanish additions
            "gobernanza", "transparencia", "ética", "cumplimiento", "gestión de riesgos"
        ]
    }
    all_keywords = []
    for category_keywords in esg_keywords.values():
        all_keywords.extend(category_keywords)
    keyword_count = sum(
        text_lower.count(keyword) if " " in keyword else len(re.findall(fr"\b{keyword}\b", text_lower))
        for keyword in all_keywords
    )
    word_count = len(text.split())
    if word_count == 0:
        return 0.0
    base_score = keyword_count / (math.log(word_count + 1) + 1)
    relevance_score = min(1.0, base_score * 0.3)
    return relevance_score

def determine_best_extraction_method(extracted_data: Dict[str, Any]) -> str:
    """Determine the best extraction method based on content quality."""
    if "metadata" in extracted_data and "best_method" in extracted_data["metadata"]:
        return extracted_data["metadata"]["best_method"]
    if "text" not in extracted_data or not extracted_data["text"]:
        logger.warning("No text extraction data available to determine best method")
        return ""
    available_methods = list(extracted_data["text"].keys())
    if not available_methods:
        logger.warning("No extraction methods available")
        return ""
    best_method = max(
        available_methods, key=lambda m: sum(len(t) for t in extracted_data["text"][m].values()), default=""
    )
    logger.info(f"Selected {best_method} as best extraction method based on character count")
    return best_method

def get_sentence_tokenizer_for_language(language):
    """Get an appropriate sentence tokenizer for the given language."""
    try:
        nltk.data.find("tokenizers/punkt")
    except LookupError:
        try:
            nltk.download("punkt", quiet=True)
        except:
            logger.warning("Could not download NLTK punkt. Using basic sentence splitting.")
            return lambda text: re.split(r"(?<=[.!?])\s+", text)
    return {
        "es": lambda text: sent_tokenize(text, language="spanish"),
        "fr": lambda text: sent_tokenize(text, language="french"),
        "de": lambda text: sent_tokenize(text, language="german"),
        "pt": lambda text: sent_tokenize(text, language="portuguese"),
    }.get(language, lambda text: sent_tokenize(text, language="english"))

def post_process_invoice_text(text):
    """Apply specific post-processing steps for invoice text."""
    if not text:
        return text
    text = re.sub(r"Â|Õž|·", "", text)
    text = re.sub(r"Ã³|Ã­|Ã¡|Ã©|Ãº|Ã±", lambda m: {"Ã³": "o", "Ã­": "i", "Ã¡": "a", "Ã©": "e", "Ãº": "u", "Ã±": "n"}[m.group()], text)
    text = re.sub(r"\$\s*(\d+)\s*\.\s*(\d+)", r"$\1.\2", text)
    text = re.sub(r"(\d+)USD", r"\1 USD", text)
    text = re.sub(r"\$ (\d+). (\d+)", r"$\1.\2", text)
    text = re.sub(r"January(\d+),", r"January \1,", text)
    text = re.sub(r"Jan(\d+)|Feb(\d+)", lambda m: m.group(0).replace(m.group(1), f" {m.group(1)}"), text)
    text = re.sub(r"Invoicenumber|Dateofissue|Datedue|Page(\d+)of(\d+)|UnitpriceAmount|SubtotaI|TotaI|BilIto|Amountdue|Payonline|Description(\w+)", lambda m: m.group(0).replace("I", "l").replace("l", " ").strip() + " ", text)
    text = re.sub(r"Cursor801|WestEndAvenue|NewYork,|NewYork(\d+)|UnitedStates|(\d{5})(\d{5})|Avenida|Cordilleradelos|Himalaya(\d+)|Lomas4ta|Seccion(\d+)|SanLuisPotosi", lambda m: m.group(0).replace(m.group(1) if m.group(1) else "", f" {m.group(1) if m.group(1) else ''}").strip(), text)
    text = re.sub(r"hi @ cursor\.com|roshan @ gaman\.ai|(\w+)@(\w+)\.(\w+)", r"\1@\2.\3 ", text)
    text = re.sub(r"MXRFC|USEIN", r"\g<0> ", text)
    text = re.sub(r"CursorProJan", r"Cursor Pro Jan", text)
    text = re.sub(r"(\d+)due|Inc\.USEIN", r"\1 due |Inc. US EIN ", text)
    text = re.sub(r"(Invoice|Bill to |Description|Pay online|Amount due)", r"\n\1", text)
    return re.sub(r"\s+", " ", text).strip()

def transform_content(
    extracted_data: Dict[str, Any],
    save_path: Optional[str] = None,
    chunk_size: int = MAX_CHUNK_SIZE,
    similarity_threshold: float = CHUNK_SIMILARITY_THRESHOLD,
    relevance_threshold: float = ESG_RELEVANCE_THRESHOLD
) -> Dict[str, Any]:
    """Transform extracted content into semantic chunks."""
    transform_start = time.time()
    transform_metrics = {}
    if extracted_data.get("status") == "error":
        return extracted_data
    page_count = extracted_data.get("page_count", 0)
    is_large_document = page_count > LARGE_DOCUMENT_THRESHOLD if ENABLE_PERFORMANCE_OPTIMIZATIONS else False
    if is_large_document:
        logger.info(f"Large document detected ({page_count} pages), applying performance optimizations")
    result = {
        "status": "success",
        "filename": extracted_data.get("filename", ""),
        "metadata": extracted_data.get("metadata", {}),
        "chunks": []
    }
    output_file = save_path
    if save_path:
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
    best_method = determine_best_extraction_method(extracted_data)
    result["best_method"] = best_method
    logger.info(f"Using {best_method} as the best text extraction method")
    method_data = extracted_data["text"].get(best_method)
    
    # Language detection on the entire document
    lang_start = time.time()
    try:
        # Concatenate all pages' raw text
        page_texts = {page: "\n".join(str(t) for t in texts) for page, texts in method_data.items()} if method_data else {}
        all_text = "\n".join(text for page, text in sorted(page_texts.items()) if text.strip())
        
        # Light cleaning to remove excessive noise (e.g., "200000...")
        noise_pattern = r"\b(?:\d{10,}|2000+\b)"  # Remove long numeric strings or "200000..."
        lightly_cleaned_text = re.sub(noise_pattern, " ", all_text)
        lightly_cleaned_text = re.sub(r"\s+", " ", lightly_cleaned_text).strip()
        
        # Log the length of the text being used for detection
        logger.info(f"Length of text for language detection: {len(lightly_cleaned_text)} characters")
        
        # Detect language on the entire document
        document_language = detect_language(lightly_cleaned_text)
        result["language"] = document_language
        logger.info(f"Detected dominant document language: {document_language}")
        
        # Warn if the detected language isn't supported for tokenization
        if document_language not in SUPPORTED_LANGUAGES:
            logger.warning(f"Detected language '{document_language}' is not supported for tokenization. Supported languages: {SUPPORTED_LANGUAGES}. Defaulting to English.")
            document_language = "en"
    except Exception as e:
        document_language = "en"
        result["language"] = document_language
        logger.warning(f"Language detection failed, defaulting to English: {str(e)}")
    transform_metrics["language_detection_time"] = time.time() - lang_start

    # Now clean the text after language detection
    cleaning_start = time.time()
    text_content = (
        "\n".join(
            str(text) for page, text in sorted(method_data.items())
            if isinstance(method_data, dict) and isinstance(page, int)
        ) 
        if method_data else ""
    )
    cleaned_text = clean_text(text_content) or ""  # Ensure never None
    transform_metrics["cleaning_time"] = time.time() - cleaning_start

    chunking_start = time.time()
    page_count = extracted_data.get("page_count", 0)
    char_count = sum(len(text) for text in method_data.values()) if isinstance(method_data, dict) else len(text_content)
    avg_chars_per_page = char_count / max(1, page_count)
    if page_count <= 5:
        target_chunks = max(3, min(10, page_count * 2))
        chunking_approach = "fine"
    elif page_count <= 20:
        target_chunks = max(5, min(20, page_count))
        chunking_approach = "moderate"
    else:
        target_chunks = max(10, min(30, page_count // 2))
        chunking_approach = "coarse"
    estimated_sentences = len(cleaned_text.split(". "))
    adjusted_chunk_size = max(MIN_CHUNK_SIZE, min(MAX_CHUNK_SIZE, round(estimated_sentences / target_chunks)))
    logger.info(f"Using {chunking_approach} chunking approach with target of {target_chunks} chunks and size {adjusted_chunk_size}")
    result["chunking_approach"] = chunking_approach
    result["target_chunks"] = target_chunks

    tokenization_start = time.time()
    try:
        sentence_tokenizer = get_sentence_tokenizer_for_language(document_language)
        sentences = sentence_tokenizer(cleaned_text)
        if len(sentences) < 5 and len(cleaned_text) > 1000:
            logger.warning(f"Sentence tokenization with {document_language} produced only {len(sentences)} sentences, trying robust fallback splitting")
            sentences = split_into_sentences(cleaned_text)
            if len(sentences) < 5:
                logger.warning("Robust fallback splitting still produced few sentences, using basic regex splitting")
                sentences = re.split(r"(?<=[.!?])\s+", cleaned_text)
    except Exception as e:
        logger.warning(f"Error in sentence tokenization with {document_language}: {str(e)}, falling back to robust splitting")
        sentences = split_into_sentences(cleaned_text)
        if len(sentences) < 5 and len(cleaned_text) > 1000:
            logger.warning("Robust fallback splitting produced few sentences, using basic regex splitting")
            sentences = re.split(r"(?<=[.!?])\s+", cleaned_text)
    logger.info(f"Split text into {len(sentences)} sentences")
    transform_metrics["tokenization_time"] = time.time() - tokenization_start

    embedding_start = time.time()
    logger.info(f"Computing embeddings using {EMBEDDING_MODEL_NAME}")
    try:
        embeddings = compute_sentence_embeddings(sentences)
        logger.info(f"Computed {embeddings.shape[1]}-dimensional embeddings for {len(sentences)} sentences")
    except Exception as e:
        logger.warning(f"Error computing embeddings: {str(e)}, falling back to simplified embeddings")
        try:
            embeddings = compute_simplified_embeddings(sentences)
            logger.info(f"Used simplified embeddings as fallback")
        except Exception as simplified_err:
            logger.error(f"Failed to compute even simplified embeddings: {str(simplified_err)}")
            return {"status": "error", "error": f"Failed to compute embeddings: {str(e)}", "filename": extracted_data.get("filename", "")}
    transform_metrics["embedding_time"] = time.time() - embedding_start

    # Add header detection
    headers = []
    if CHUNK_TYPE == "mixed" or CHUNK_TYPE == "metadata":
        # Get document text for header detection
        best_method = determine_best_extraction_method(extracted_data)
        method_data = extracted_data["text"].get(best_method)
        full_text = "\n\n".join(method_data.values())
        
        # Detect headers
        from ..utils.structure_utils import detect_headers
        headers = detect_headers(full_text, method_data)
        
        # Add font-based header detection as a fallback
        if len(headers) < 5 and os.path.exists(extracted_data.get("filename", "")):
            try:
                from ..utils.structure_utils_advanced import detect_headers_by_font
                font_headers = detect_headers_by_font(extracted_data["filename"])
                if len(font_headers) > len(headers):
                    headers = font_headers
                    logger.info(f"Used font-based header detection, found {len(headers)} headers")
            except Exception as e:
                logger.warning(f"Font-based header detection failed: {str(e)}")
        
        logger.info(f"Detected {len(headers)} section headers in document")
    
    # Choose chunking method based on configuration
    chunking_start = time.time()
    try:
        if CHUNK_TYPE == "semantic":
            chunks = create_semantic_chunks(
                sentences, embeddings, max_chunk_size=adjusted_chunk_size, 
                min_chunk_size=MIN_CHUNK_SIZE,
                similarity_threshold=similarity_threshold, 
                max_overlap=MAX_CHUNK_OVERLAP
            )
            logger.info(f"Created {len(chunks)} semantic chunks")
        elif CHUNK_TYPE == "mixed":
            chunks = create_hybrid_chunks(
                sentences, embeddings, headers,
                max_chunk_size=adjusted_chunk_size, 
                min_chunk_size=MIN_CHUNK_SIZE,
                similarity_threshold=similarity_threshold, 
                max_overlap=MAX_CHUNK_OVERLAP
            )
            
            # Add this fallback if hybrid chunking produces no chunks
            if not chunks:
                logger.warning("Hybrid chunking produced 0 chunks, falling back to semantic chunking")
                chunks = create_semantic_chunks(
                    sentences, embeddings, max_chunk_size=adjusted_chunk_size, 
                    min_chunk_size=MIN_CHUNK_SIZE,
                    similarity_threshold=similarity_threshold, 
                    max_overlap=MAX_CHUNK_OVERLAP
                )
                logger.info(f"Created {len(chunks)} semantic chunks (fallback from hybrid)")
            else:
                logger.info(f"Created {len(chunks)} hybrid chunks from {len(headers)} sections")
        elif CHUNK_TYPE == "basic":
            chunks = create_basic_chunks(sentences, max_chunk_size=adjusted_chunk_size)
            logger.info(f"Created {len(chunks)} basic chunks")
        else:
            logger.warning(f"Unknown chunk type: {CHUNK_TYPE}, falling back to semantic")
            chunks = create_semantic_chunks(
                sentences, embeddings, max_chunk_size=adjusted_chunk_size, 
                min_chunk_size=MIN_CHUNK_SIZE,
                similarity_threshold=similarity_threshold, 
                max_overlap=MAX_CHUNK_OVERLAP
            )
    except Exception as e:
        logger.error(f"Chunking failed: {str(e)}")
        try:
            chunks = create_basic_chunks(sentences, max_chunk_size=adjusted_chunk_size)
        except Exception as basic_e:
            logger.critical(f"Basic chunking failed: {str(basic_e)}")
            chunks = [cleaned_text]  # Fallback to full text
    
    transform_metrics["chunking_time"] = time.time() - chunking_start
    result["chunks"] = chunks

    if "tables" in extracted_data and extracted_data["tables"]:
        tables = []
        for page_idx, page_tables in extracted_data["tables"].items():
            for table_data in page_tables:
                processed_table = {
                    "id": table_data.get("id", f"table_p{page_idx+1}_{len(tables)+1}"),
                    "page": page_idx,
                    "rows": table_data.get("rows", len(table_data.get("data", []))),
                    "cols": table_data.get("cols", len(table_data.get("data", [[]])[0]) if table_data.get("data") else 0),
                    "data": table_data.get("data", []),
                    "has_header": table_data.get("has_header", False),
                    "header": table_data.get("header", [])
                }
                tables.append(processed_table)
        result["tables"] = tables
        logger.info(f"Included {len(tables)} tables in the output")

    if "images" in extracted_data and extracted_data["images"]:
        try:
            ocr_chunks = create_ocr_chunks(extracted_data["images"])
            # Filter out low-quality OCR chunks
            filtered_ocr_chunks = [
                chunk for chunk in ocr_chunks
                if chunk["word_count"] >= 10 and sum(c.isalpha() for c in chunk["text"]) / len(chunk["text"]) > 0.5
            ]
            if filtered_ocr_chunks:
                result["ocr_chunks"] = filtered_ocr_chunks
                result["chunks"].extend(filtered_ocr_chunks)
                logger.info(f"Created {len(filtered_ocr_chunks)} OCR chunks from images after filtering")
        except Exception as e:
            logger.warning(f"Error creating OCR chunks: {str(e)}")

    result["num_chunks"] = len(result["chunks"])  # Get final count
    if output_file:
        try:
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(result, f, cls=CustomEncoder, ensure_ascii=False, indent=2)
                logger.info(f"Saved transformed content to {output_file}")
        except Exception as e:
            logger.error(f"Error saving transformed content: {str(e)}")

    total_transform_time = time.time() - transform_start
    logger.info(f"Content transformation completed in {total_transform_time:.2f} seconds")
    logger.info(f"  - Text cleaning: {transform_metrics.get('cleaning_time', 0):.2f}s")
    logger.info(f"  - Language detection: {transform_metrics.get('language_detection_time', 0):.2f}s")
    logger.info(f"  - Sentence tokenization: {transform_metrics.get('tokenization_time', 0):.2f}s")
    logger.info(f"  - Embedding computation: {transform_metrics.get('embedding_time', 0):.2f}s")
    logger.info(f"  - Semantic chunking: {transform_metrics.get('chunking_time', 0):.2f}s")
    result["timing"] = transform_metrics
    result["total_transform_time"] = total_transform_time
    result["num_chunks"] = len(result["chunks"])
    return result

def calculate_similarity(embeddings):
    similarities = cosine_similarity(embeddings)
    return similarities - np.eye(similarities.shape[0])  # Remove self-similarity

def create_hybrid_chunks(
    sentences: List[str], 
    embeddings: np.ndarray,
    headers: List[Dict[str, Any]],
    max_chunk_size: int = MAX_CHUNK_SIZE,
    min_chunk_size: int = MIN_CHUNK_SIZE,
    similarity_threshold: float = CHUNK_SIMILARITY_THRESHOLD,
    max_overlap: int = MAX_CHUNK_OVERLAP
) -> List[Dict[str, Any]]:
    """
    Create chunks based on document structure with semantic chunking within sections.
    """
    # Convert header positions to sentence indices
    header_positions = []
    
    # If no headers, return empty list
    if not headers:
        return []
    
    # Sort headers by position
    sorted_headers = sorted(headers, key=lambda h: h["position"])
    
    # Create artificial sentence mapping
    # This divides the sentences proportionally based on header positions
    total_lines = max(h["position"] for h in headers) + 1
    sentences_per_line = len(sentences) / total_lines
    
    for header in sorted_headers:
        # Estimate the sentence index based on proportional position in document
        sent_idx = min(int(header["position"] * sentences_per_line), len(sentences)-1)
        header_positions.append((sent_idx, header))
    
    # Add document end as final position
    header_positions.append((len(sentences), None))
    
    chunks = []
    
    # Process each section
    for i in range(len(header_positions)-1):
        start_idx, header = header_positions[i]
        end_idx = header_positions[i+1][0]
        
        # Skip sections that are too small
        if end_idx - start_idx < min_chunk_size:
            continue
            
        section_sentences = sentences[start_idx:end_idx]
        section_embeddings = embeddings[start_idx:end_idx]
        
        # Process this section using semantic chunking
        section_chunks = create_semantic_chunks(
            section_sentences, 
            section_embeddings,
            max_chunk_size=max_chunk_size,
            min_chunk_size=min_chunk_size,
            similarity_threshold=similarity_threshold,
            max_overlap=max_overlap
        )
        
        # Add section metadata to chunks
        for chunk in section_chunks:
            if header:
                chunk["section"] = header["text"]
                chunk["section_level"] = header["level"]
            # Adjust spans to be document-relative
            chunk["span"] = [chunk["span"][0] + start_idx, chunk["span"][1] + start_idx]
            chunks.append(chunk)
    
    return chunks

def enrich_chunks_with_metadata(chunks, document_metadata, section_hierarchy):
    """Add standardized metadata to each chunk."""
    for chunk in chunks:
        # Find the most relevant section for this chunk
        chunk_position = chunk["span"][0] if "span" in chunk else 0
        
        # Find the closest section header before this chunk
        relevant_headers = [h for h in section_hierarchy if h["position"] <= chunk_position]
        closest_header = relevant_headers[-1] if relevant_headers else None
        
        if closest_header:
            chunk["section"] = closest_header["text"]
            chunk["section_level"] = closest_header["level"]
            chunk["section_path"] = closest_header["path"]
            chunk["section_full_path"] = closest_header["full_path_text"]
        
        # Add document-level metadata
        chunk["document"] = {
            "title": document_metadata.get("title", "Unknown"),
            "author": document_metadata.get("author", "Unknown"),
            "subject": document_metadata.get("subject", ""),
            "language": document_metadata.get("primary_language", "")
        }
        
        # Add content type metadata
        if "type" not in chunk:
            chunk["type"] = "text"
            
        # Calculate reading time estimate (200 words per minute)
        words = chunk.get("word_count", 0)
        chunk["reading_time_seconds"] = (words / 200) * 60
    
    return chunks