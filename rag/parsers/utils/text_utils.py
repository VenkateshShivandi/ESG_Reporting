# -*- coding: utf-8 -*-
"""
Text utility functions for the ESG Reporting backend.

This module contains functions for text processing, cleaning, and manipulation
that are used throughout the application, particularly in the ETL pipeline.
"""

import re
import string
import unicodedata
import logging
import nltk
from typing import Callable, List

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def clean_text(text: str) -> str:
    """Clean extracted text by removing extra whitespace and fixing encoding issues."""
    if not text:
        return ""
    
    # Remove page headers/footers (multilingual and varied formats)
    # Matches: "Page 5 of 60", "Página 5 de 60", "Page 5 sur 60", "Seite 5 von 60", "Pg. 5/60", etc.
    page_pattern = (
        r"(?i)"  # Case-insensitive
        r"(Página|Page|Seite|P\.|Pg\.)\s*\d+\s*(de|of|von|sur|\/)\s*\d+"  # Named page markers
        r"|\b\d+\s*(?:of|de|von|sur|\/)\s*\d+\b"  # Generic "5 of 60" at word boundaries
    )
    text = re.sub(page_pattern, "", text)
    
    # Normalize unicode characters to their closest ASCII representation
    # or a standard form to handle variations like different quote types
    text = unicodedata.normalize('NFKD', text)
    # Remove non-printable characters (includes more control characters than just ^\x20-\x7E)
    text = "".join(c for c in text if unicodedata.category(c)[0]!="C")

    # Fix common mojibake and specific character issues after normalization
    # (Some might be less necessary after NFKD, but keep for robustness)
    CHARACTER_REPLACEMENTS = {
        # Common ligatures and special characters
        "æ": "ae",
        "œ": "oe",
        "ﬁ": "fi",
        "ﬂ": "fl",
        # "â€"": "-", # en dash - Use standard hyphen for simplicity
        # "â€\"": "—", # em dash - Replace problematic entry below
        "\\u2014": "\\u2014", # em dash using unicode escape
        "‘": "'", # left single quotation mark
        "’": "'", # right single quotation mark (apostrophe)
        "“": '"', # left double quotation mark
        "”": '"', # right double quotation mark
        "„": '"', # double low-9 quotation mark
        "´": "'", # acute accent
        "`": "'", # grave accent
        # ... other replacements
    }
    for wrong, right in CHARACTER_REPLACEMENTS.items():
        text = text.replace(wrong, right)
    
    # Normalize whitespace: replace multiple spaces/tabs/newlines with a single space
    text = re.sub(r'\s+', ' ', text).strip()
    # Re-join hyphenated words broken across lines
    text = re.sub(r"(\w)-\s+(\w)", r"\1\2", text)
    
    return text

def detect_language(text: str) -> str:
    """Robust language detection using langdetect with improved text cleaning."""
    SUPPORTED_LANGUAGES = ["en", "es", "fr", "de", "pt"]

    if not text or len(text.strip()) < 10:
        logger.warning("Text too short for language detection (<10 chars), defaulting to 'en'")
        return "en"

    # Clean the text specifically for language detection
    cleaned_text = re.sub(r'[^a-zA-ZáéíóúñüÁÉÍÓÚÑÜ\s.,!?¿¡]', ' ', text)
    cleaned_text = re.sub(r'\s+', ' ', cleaned_text).strip()

    alpha_count = sum(c.isalpha() for c in cleaned_text)
    if alpha_count < 30:
        logger.warning(f"Insufficient alphabetic content ({alpha_count} chars) for reliable detection, checking for Spanish characters")
        spanish_chars = len(re.findall(r'[áéíóúñÁÉÍÓÚÑ¿¡]', cleaned_text))
        if spanish_chars >= 3:
            logger.info(f"Detected {spanish_chars} Spanish characters, setting language to 'es'")
            return "es"
        logger.info("No significant Spanish characters found, defaulting to 'en'")
        return "en"

    try:
        from langdetect import detect, LangDetectException
        try:
            # Use cleaned text for detection
            lang = detect(cleaned_text)
            logger.info(f"langdetect result: '{lang}' for text sample: '{cleaned_text[:100]}...'")
            
            # Handle Spanish variants more broadly
            if lang in ["es", "ca", "eu", "gl", "pt"]: # Include Portuguese here as often similar
                return "es" # Standardize to 'es' for simplicity in this app
            # Map supported languages
            if lang in SUPPORTED_LANGUAGES:
                return lang
                
            # Fallback for other Romance languages often confused with Spanish/Portuguese
            if lang in ['it', 'ro', 'la']:
                 logger.info(f"Mapped detected language '{lang}' to 'es'")
                 return "es"
                 
            # Default to English if not explicitly supported or mapped
            logger.info(f"Detected language '{lang}' not directly supported or mapped, defaulting to 'en'")
            return "en"
            
        except LangDetectException as e:
            logger.warning(f"LangDetectException occurred: {str(e)}, falling back to character-based detection")
    except ImportError:
        logger.warning("langdetect library not installed, using fallback detection")

    # Fallback: Check for Spanish characters if langdetect fails or is unavailable
    spanish_chars = len(re.findall(r'[áéíóúñÁÉÍÓÚÑ¿¡]', cleaned_text))
    if spanish_chars >= 3:
        logger.info(f"Detected {spanish_chars} Spanish characters in fallback, setting language to 'es'")
        return "es"
    logger.info("No significant Spanish characters found in fallback, defaulting to 'en'")
    return "en"

def get_sentence_tokenizer_for_language(language: str) -> Callable[[str], List[str]]:
    """Get an appropriate NLTK sentence tokenizer for the given language."""
    try:
        nltk.data.find("tokenizers/punkt")
    except LookupError:
        try:
            logger.info("NLTK punkt tokenizer not found. Downloading...")
            nltk.download("punkt", quiet=True)
            logger.info("NLTK punkt downloaded successfully.")
        except Exception as e:
            logger.error(f"Could not download NLTK punkt: {str(e)}. Using basic sentence splitting.")
            # Fallback to simple regex splitter if download fails
            return lambda text: [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
    
    language_map = {
        "es": "spanish",
        "fr": "french",
        "de": "german",
        "pt": "portuguese",
        "en": "english"
    }
    
    nltk_language = language_map.get(language, "english")
    logger.info(f"Using NLTK sentence tokenizer for language: '{nltk_language}' (detected: '{language}')")
    
    # Return the tokenizer function
    try:
        tokenizer = nltk.data.load(f'tokenizers/punkt/{nltk_language}.pickle')
        return tokenizer.tokenize
    except Exception as e:
        logger.error(f"Failed to load NLTK tokenizer for '{nltk_language}': {e}. Using English fallback.")
        tokenizer = nltk.data.load('tokenizers/punkt/english.pickle')
        return tokenizer.tokenize

def remove_special_characters(text: str, keep_punctuation: bool = True) -> str:
    """
    Remove special characters from text, keeping alphanumeric and optionally punctuation.
    
    Args:
        text (str): The text to clean
        keep_punctuation (bool, optional): Whether to keep standard punctuation. Defaults to True.
        
    Returns:
        str: The text with special characters removed
    """
    if not text:
        return ""
    
    # Normalize unicode first
    text = unicodedata.normalize('NFKD', text)
    
    if keep_punctuation:
        # Keep letters, numbers, spaces, and standard punctuation
        allowed_chars = string.ascii_letters + string.digits + string.whitespace + string.punctuation
    else:
        # Keep only letters, numbers, and spaces
        allowed_chars = string.ascii_letters + string.digits + string.whitespace
        
    # Filter out characters not in the allowed set
    cleaned = "".join(c for c in text if c in allowed_chars)
    
    # Normalize whitespace again after filtering
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    
    return cleaned

def split_text_into_sentences(text: str) -> List[str]:
    """
    Split text into sentences using language detection and NLTK.
    
    Args:
        text (str): The text to split
        
    Returns:
        list: List of sentences
    """
    if not text:
        return []
    
    # Detect language first
    lang = detect_language(text)
    # Get the appropriate tokenizer
    tokenizer = get_sentence_tokenizer_for_language(lang)
    
    # Tokenize and clean
    sentences = tokenizer(text)
    cleaned_sentences = [s.strip() for s in sentences if s and s.strip()]
    
    return cleaned_sentences

def calculate_text_similarity(text1: str, text2: str) -> float:
    """
    Calculate similarity between two text strings using simple character-based Jaccard similarity.
    Note: For semantic similarity, use vector embeddings.
    
    Args:
        text1 (str): First text string
        text2 (str): Second text string
        
    Returns:
        float: Similarity score between 0 (completely different) and 1 (identical)
    """
    if not text1 and not text2:
        return 1.0
    if not text1 or not text2:
        return 0.0
    
    # Normalize both texts (basic cleaning)
    text1_norm = re.sub(r'\s+', ' ', text1.lower().strip())
    text2_norm = re.sub(r'\s+', ' ', text2.lower().strip())
    
    # Use Jaccard similarity on character sets
    set1, set2 = set(text1_norm), set(text2_norm)
    intersection = len(set1.intersection(set2))
    union = len(set1.union(set2))
    
    return intersection / union if union > 0 else 0.0

def extract_keywords(text: str, stop_words: set = None) -> List[tuple]:
    """
    Extract potential keywords from text by removing stop words and sorting by frequency.
    This is a basic implementation, more advanced methods exist (e.g., TF-IDF, RAKE).

    Args:
        text (str): The text to analyze
        stop_words (set, optional): Set of stop words to ignore. Defaults to basic English set.
        
    Returns:
        list: List of (word, frequency) tuples sorted by frequency
    """
    if not text:
        return []
    
    # Basic English stop words if not provided
    if stop_words is None:
        stop_words = {
            "a", "an", "the", "and", "or", "but", "is", "in", "it", "of", "on", "that", "this", 
            "to", "was", "with", "for", "as", "at", "by", "from", "if", "not", "be", "are",
            "will", "can", "has", "had", "have", "such", "so", "than", "then", "too", "very"
            # Add more common words as needed
        }

    # Clean text: lowercase, remove punctuation/numbers
    cleaned_text = re.sub(r'[^a-z\s]', '', text.lower())
    words = cleaned_text.split()
    
    # Count word frequencies, excluding stop words
    word_counts = {}
    for word in words:
        if word not in stop_words and len(word) > 2: # Ignore short words
            word_counts[word] = word_counts.get(word, 0) + 1
            
    # Sort by frequency (descending)
    sorted_keywords = sorted(word_counts.items(), key=lambda item: item[1], reverse=True)
    
    return sorted_keywords 