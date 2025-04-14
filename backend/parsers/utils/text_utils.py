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
    
    # Remove non-printable characters
    text = re.sub(r"[^\x20-\x7E\u00A0-\u00FF\u0100-\u017F]", " ", text)
    
    # Replace the entire replacements dictionary with this simplified version
    replacements = {}  # Start empty
    # Add accented characters
    replacements["Ã¡"] = "á"
    replacements["Ã©"] = "é" 
    replacements["Ã³"] = "ó"
    replacements["Ã±"] = "ñ"
    replacements["Ã£"] = "ã"
    replacements["Ã¶"] = "ö"
    replacements["Ã¼"] = "ü"
    replacements["Ã§"] = "ç"

    # Add punctuation using Unicode escape sequences
    replacements["â€¢"] = "\u2022"  # bullet
    replacements["emdash"] = "\u2014"  # em dash
    replacements["â€™"] = "\u2019"  # right single quote
    replacements["â€œ"] = "\u201C"  # left double quote
    replacements["â€\x9d"] = "\u201D"  # right double quote

    # Add miscellaneous
    replacements["Â"] = ""
    replacements["â€"] = ""
    
    # Replace the problematic line with standard ASCII hex representation
    text = text.replace("\xE2\x80\x94", "—") # Unicode em dash
    
    for wrong, right in replacements.items():
        text = text.replace(wrong, right)
    
    # Normalize whitespace and hyphens
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"(\w)-\s+(\w)", r"\1-\2", text)
    
    return text

def detect_language(text: str) -> str:
    """Robust language detection using langdetect with improved text cleaning."""
    SUPPORTED_LANGUAGES = ["en", "es", "fr", "de", "pt"]

    if not text or len(text.strip()) < 10:
        logger.warning("Text too short for language detection (<10 chars), defaulting to 'en'")
        return "en"

    # Clean the text specifically for language detection
    # Remove numbers, symbols, and table-like content, keeping letters and basic punctuation
    cleaned_text = re.sub(r'[^a-zA-ZáéíóúñüÁÉÍÓÚÑÜ\s.,!?¿¡]', ' ', text)
    cleaned_text = re.sub(r'\s+', ' ', cleaned_text).strip()

    # Count alphabetic characters to ensure we have enough meaningful content
    alpha_count = sum(c.isalpha() for c in cleaned_text)
    if alpha_count < 30:
        logger.warning(f"Insufficient alphabetic content ({alpha_count} chars) for reliable detection, checking for Spanish characters")
        spanish_chars = len(re.findall(r'[áéíóúñÁÉÍÓÚÑ¿¡]', cleaned_text))
        if spanish_chars >= 3:  # Lowered threshold from 5 to 3
            logger.info(f"Detected {spanish_chars} Spanish characters, setting language to 'es'")
            return "es"
        logger.info("No significant Spanish characters found, defaulting to 'en'")
        return "en"

    try:
        from langdetect import detect, LangDetectException
        try:
            lang = detect(cleaned_text)
            logger.info(f"langdetect result: '{lang}' for text sample: '{cleaned_text[:100]}...'")
            # Handle Spanish variants
            if lang in ["es", "ca", "eu", "gl"]:
                return "es"
            # Map to supported languages
            if lang in SUPPORTED_LANGUAGES:
                return lang
            # Map unsupported languages to the closest supported language
            lang_mapping = {
                'it': 'es',  # Italian -> Spanish (closer for Romance languages)
                'ro': 'es',  # Romanian -> Spanish
                'la': 'es',  # Latin -> Spanish
            }
            detected_lang = lang_mapping.get(lang, "en")
            if detected_lang != lang:
                logger.info(f"Mapped detected language '{lang}' to supported language '{detected_lang}'")
            return detected_lang
        except LangDetectException as e:
            logger.warning(f"LangDetectException occurred: {str(e)}, falling back to character-based detection")
    except ImportError:
        logger.warning("langdetect not installed, using fallback detection")

    # Fallback: Check for Spanish characters
    spanish_chars = len(re.findall(r'[áéíóúñÁÉÍÓÚÑ¿¡]', cleaned_text))
    if spanish_chars >= 3:  # Lowered threshold
        logger.info(f"Detected {spanish_chars} Spanish characters, setting language to 'es'")
        return "es"
    logger.info("No significant Spanish characters found in fallback, defaulting to 'en'")
    return "en"

def get_sentence_tokenizer_for_language(language: str) -> Callable[[str], List[str]]:
    """Get an appropriate sentence tokenizer for the given language."""
    try:
        nltk.data.find("tokenizers/punkt")
    except LookupError:
        try:
            nltk.download("punkt", quiet=True)
        except Exception as e:
            logger.warning(f"Could not download NLTK punkt: {str(e)}. Using basic sentence splitting.")
            return lambda text: re.split(r"(?<=[.!?])\s+", text)
    
    language_map = {
        "es": "spanish",
        "fr": "french",
        "de": "german",
        "pt": "portuguese",
        "en": "english"
    }
    
    nltk_language = language_map.get(language, "english")
    return lambda text: nltk.sent_tokenize(text, language=nltk_language)

def remove_special_characters(text: str, keep_punctuation: bool = True) -> str:
    """
    Remove special characters from text.
    
    Args:
        text (str): The text to clean
        keep_punctuation (bool, optional): Whether to keep punctuation. Defaults to True.
        
    Returns:
        str: The text with special characters removed
    """
    if not text:
        return ""
    
    # Define what to keep
    if keep_punctuation:
        # Keep alphanumeric and punctuation
        pattern = r'[^a-zA-Z0-9\s' + re.escape(string.punctuation) + ']'
    else:
        # Keep only alphanumeric
        pattern = r'[^a-zA-Z0-9\s]'
    
    # Remove special characters
    cleaned = re.sub(pattern, '', text)
    
    return cleaned

def split_text_into_sentences(text: str) -> List[str]:
    """
    Split text into sentences.
    
    Args:
        text (str): The text to split
        
    Returns:
        list: List of sentences
    """
    if not text:
        return []
    
    # Simple sentence splitter (can be improved with better NLP libraries)
    # This regex looks for sentence-ending punctuation followed by whitespace and a capital letter
    sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z])', text)
    
    # Remove empty sentences and strip whitespace
    sentences = [s.strip() for s in sentences if s.strip()]
    
    return sentences

def calculate_text_similarity(text1: str, text2: str) -> float:
    """
    Calculate similarity between two text strings using simple character-based comparison.
    
    For more advanced similarity, consider using libraries like:
    - fuzzywuzzy for Levenshtein distance
    - sentence-transformers for semantic similarity
    
    Args:
        text1 (str): First text string
        text2 (str): Second text string
        
    Returns:
        float: Similarity score between 0 (completely different) and 1 (identical)
    """
    if not text1 and not text2:
        return 1.0  # Both empty means they're identical
    
    if not text1 or not text2:
        return 0.0  # One empty means completely different
    
    # Normalize both texts
    text1 = clean_text(text1.lower())
    text2 = clean_text(text2.lower())
    
    # Use Jaccard similarity for character-level comparison
    # (intersection of characters / union of characters)
    set1, set2 = set(text1), set(text2)
    intersection = len(set1.intersection(set2))
    union = len(set1.union(set2))
    
    return intersection / union if union > 0 else 0.0

def extract_keywords(text: str, stop_words: set = None) -> List[tuple]:
    """
    Extract potential keywords from text by removing stop words and sorting by frequency.
    
    Args:
        text (str): The text to analyze
        stop_words (set, optional): Set of stop words to ignore. Defaults to None.
        
    Returns:
        list: List of (word, frequency) tuples sorted by frequency
    """
    if not text:
        return []
    
    # Default English stop words if not provided
    if stop_words is None:
        stop_words = {
            'a', 'an', 'the', 'and', 'or', 'but', 'if', 'because', 'as', 'what',
            'when', 'where', 'how', 'who', 'which', 'this', 'that', 'these', 'those',
            'then', 'just', 'so', 'than', 'such', 'both', 'through', 'about', 'for',
            'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
            'having', 'do', 'does', 'did', 'doing', 'to', 'from', 'by', 'on', 'at',
            'in', 'with', 'about', 'against', 'between', 'into', 'through', 'during',
            'before', 'after', 'above', 'below', 'of', 'off', 'over', 'under', 'again',
            'further', 'then', 'once', 'here', 'there', 'all', 'any', 'both', 'each',
            'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only',
            'own', 'same', 'so', 'than', 'too', 'very', 'can', 'will', 'should', 'now'
        }
    
    # Tokenize and clean
    words = re.findall(r'\b[a-z]+\b', text.lower())
    
    # Remove stop words
    filtered_words = [word for word in words if word not in stop_words and len(word) > 2]
    
    # Count frequencies
    word_counts = {}
    for word in filtered_words:
        word_counts[word] = word_counts.get(word, 0) + 1
    
    # Sort by frequency
    keywords = sorted(word_counts.items(), key=lambda x: x[1], reverse=True)
    
    return keywords