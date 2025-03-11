"""
OCR chunk creation for the ESG PDF ETL Pipeline.
"""

import logging
import uuid
import re
import math
from typing import Dict, List, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Placeholder for ESG keywords from constants
try:
    from config.constants import ESG_KEYWORDS
except ImportError:
    ESG_KEYWORDS = {
        "Environmental": ["carbon", "climate", "emission", "environmental"],
        "Social": ["community", "diversity", "employee", "equality"],
        "Governance": ["accountability", "audit", "board", "compliance"]
    }

def clean_text(text: str) -> str:
    """Clean extracted text by removing extra whitespace and fixing common issues."""
    if not text:
        return ""
    if len(text) > 100000:
        return re.sub(r"\s+", " ", text).strip()
    cleaned = re.sub(r"\s+", " ", text)
    cleaned = re.sub(r"\n+", "\n", cleaned)
    cleaned = re.sub(r"(\w+)-\s*\n\s*(\w+)", r"\1\2", cleaned)
    cleaned = re.sub(r"\x00-\x08\x0B\x0C\x0E-\x1F\x7F", "", cleaned)
    cleaned = "".join(c for c in cleaned if c.isprintable() or c == "\n")
    return cleaned.strip()

def calculate_esg_relevance(text: str) -> float:
    """Calculate the ESG relevance score for a chunk of text."""
    if not text:
        return 0.0
    text_lower = text.lower()
    all_keywords = []
    for category_keywords in ESG_KEYWORDS.values():
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

def create_ocr_chunks(
    images_by_page: Dict[int, List[Dict[str, Any]]], min_chars: int = 50
) -> List[Dict[str, Any]]:
    """Create chunks from OCR text extracted from images."""
    ocr_chunks = []
    for page_num, images in images_by_page.items():
        page_ocr_text = " ".join(
            image_data["ocr_text"].strip() for image_data in images
            if "ocr_text" in image_data and image_data["ocr_text"] and image_data["ocr_text"].strip()
        )
        if page_ocr_text and len(page_ocr_text) >= min_chars:
            cleaned_text = clean_text(page_ocr_text)
            ocr_chunk = {
                "id": str(uuid.uuid4()),
                "type": "ocr",
                "text": cleaned_text,
                "page": page_num,
                "sentences": len(cleaned_text.split(". ")),
                "word_count": len(cleaned_text.split()),
                "char_count": len(cleaned_text),
                "token_estimate": len(cleaned_text.split()) + 10,
                "esg_relevance": calculate_esg_relevance(cleaned_text),
                "contains_ocr": True,
                "source_images": [image_data["id"] for image_data in images if "id" in image_data]
            }
            ocr_chunks.append(ocr_chunk)
    return ocr_chunks