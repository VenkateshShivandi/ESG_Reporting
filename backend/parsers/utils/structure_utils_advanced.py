from typing import List, Dict, Any
import logging
import re

def detect_headers_by_font(pdf_path: str) -> List[Dict[str, Any]]:
    """Detect headers by analyzing font size and style."""
    headers = []
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(pdf_path)
        
        for page_num, page in enumerate(doc):
            blocks = page.get_text("dict")["blocks"]
            for block in blocks:
                if "lines" in block:
                    for line in block["lines"]:
                        for span in line["spans"]:
                            # Larger font or bold text is likely a header
                            if span["size"] > 12 or "bold" in span.get("font", "").lower():
                                # Exclude known non-headers
                                if not any(re.match(pattern, span["text"]) for pattern in exclude_patterns):
                                    headers.append({
                                        "text": span["text"],
                                        "position": page_num * 100,  # Approximate line position
                                        "level": 1 if span["size"] > 14 else 2,
                                        "font_size": span["size"]
                                    })
        doc.close()
    except Exception as e:
        logging.warning(f"Font-based header detection failed: {str(e)}")
    
    return headers 