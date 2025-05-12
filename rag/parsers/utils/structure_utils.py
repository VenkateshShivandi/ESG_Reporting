"""Utility functions for detecting document structure."""

import re
from typing import List, Dict, Any, Tuple
import logging

logger = logging.getLogger(__name__)

def detect_headers(text: str, pages: Dict[int, str]=None) -> List[Dict[str, Any]]: # pages is optional now
    """
    Detect headers in document text based on patterns and simple heuristics.
    
    Args:
        text: Full document text separated by newlines.
        pages: Optional dictionary mapping page numbers to page text (not currently used).
        
    Returns:
        List of headers with metadata (position, level, text)
    """
    headers = []
    
    # Regex patterns for common ESG headers (English & Spanish)
    header_patterns = [
        # Standard ESG sections
        r"(?i)^\s*(Environmental|Social|Governance)(\s+Impact|\s+Factors|\s+Metrics)?\s*$",
        # Common ESG topics
        r"(?i)^\s*(Carbon|Climate|Emissions|Diversity|Inclusion|Board|Ethics|Human Rights|Waste Management|Energy Efficiency|Water Usage|Biodiversity|Supply Chain|Community Relations)(\s+[A-Za-z\s]+)?$",
        # Numbered/Lettered sections (more flexible)
        r"^\s*(\d+(\.\d+)*\.?|[A-Z]\.)\s+([A-ZÁÉÍÓÚÑÜ][\wÁÉÍÓÚÑÜ\s\(\)-]+)\s*$", # Match 1., 1.1, 1.1., A., etc. followed by capitalized word
        # TCFD framework headers
        r"(?i)^\s*(Governance|Strategy|Risk Management|Metrics and Targets)(\s+of Climate-Related (Risks|Opportunities))?\s*$",
        # Annual report standard sections
        r"(?i)^\s*(Executive Summary|Letter from (the |our )?(CEO|Chairman)|Financial (Highlights|Summary)|Contents|Index|Table of Contents|Introduction|Background|Methodology|Methods|Results|Discussion|Conclusion|References|Bibliography|Works Cited|Literature|Appendix|Anexo|Introducción|Metodología|Conclusión|Referencias|Resultados|Discusión|Resumen Ejecutivo|Contenido|Índice)\s*$",
        # SDG goals references
        r"(?i)^\s*(SDG|Sustainable Development Goal|ODS|Objetivo de Desarrollo Sostenible)s?(\s+\d+)?(\s*:)?\s*([A-Za-zÁÉÍÓÚÑÜ\s]+)?$",
        # Catch-all for UPPERCASE lines or short lines ending in colon
        r"^\s*[A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ\s\(\)-]{5,}\s*$", # All caps, at least 5 chars
        r"^\s*[A-ZÁÉÍÓÚÑÜ].{5,80}:\s*$" # Short line ending in a colon
    ]
    
    lines = text.split('\n')
    
    for i, line in enumerate(lines):
        stripped_line = line.strip()
        if not stripped_line or len(stripped_line) > 150: # Skip empty or very long lines
            continue
            
        # Basic exclusion patterns (e.g., URLs, common footers)
        if re.match(r"(?i)^\s*(http|www|Page|Página|Seite|\d+ of \d+|Machine Translated by Google)", stripped_line):
             continue

        is_header = False
        for pattern in header_patterns:
            match = re.match(pattern, stripped_line)
            if match:
                is_header = True
                # Determine header level based on indentation or numbering
                level = 1 # Default level
                leading_spaces = len(line) - len(line.lstrip(' '))
                if leading_spaces > 2:
                    level = 2 # Assume indented is level 2
                elif re.match(r"^\s*\d+\.\d+", stripped_line): # Sub-section like "1.2"
                    level = 2
                elif re.match(r"^\s*\d+\.\d+\.\d+", stripped_line): # Sub-sub-section like "1.2.3"
                    level = 3
                elif re.match(r"^\s*[A-Z]\.", stripped_line): # Lettered section like "A."
                     level = 2 

                headers.append({
                    "text": stripped_line,
                    "position": i, # Line number (0-indexed)
                    "level": level
                })
                break # Stop checking patterns for this line once matched
                
    # Fallback: If no headers found, create artificial sections for long docs
    if not headers and len(lines) > 300: # Only for docs longer than 300 lines
        section_size = 300 # Approximate lines per section
        for i in range(0, len(lines), section_size):
             # Create artificial section headers, ensuring position > 0
             if i > 0:
                 headers.append({
                     "text": f"Section {(i // section_size)}",
                     "position": i,
                     "level": 1
                 })
        if headers:
            logger.info(f"No natural headers found, created {len(headers)} artificial section breaks for long document.")
    
    logger.info(f"Detected {len(headers)} potential headers.")
    return headers 

def build_section_hierarchy(headers: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Build a hierarchical structure from a flat list of detected headers."""
    hierarchy = []
    current_path = [] # Stores the header dicts of the current path
    last_level = 0

    # Sort headers by position just in case they aren't
    sorted_headers = sorted(headers, key=lambda h: h["position"])
    
    for header in sorted_headers:
        level = header["level"] # Current header's level (e.g., 1, 2, 3)
        
        # Adjust current path based on level change
        if level > last_level: # Going deeper
             pass # Just append later
        elif level <= last_level: # Going up or staying at same level
             # Pop items from path until the parent level is reached
             while len(current_path) >= level:
                 current_path.pop()
        
        # Add current header to the path
        current_path.append(header)
        
        # Create the full path text
        full_path_text = " > ".join(h["text"] for h in current_path)
        
        # Add enriched header info to hierarchy
        hierarchy.append({
             **header, # Include original text, position, level
             "path": [h["text"] for h in current_path], # List of header texts in the path
             "full_path_text": full_path_text
         })
        
        last_level = level # Update last level seen

    logger.info(f"Built hierarchy for {len(hierarchy)} headers.")
    return hierarchy 