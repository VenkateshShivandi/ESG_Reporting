"""Utility functions for detecting document structure."""

import re
from typing import List, Dict, Any, Tuple
import logging

def detect_headers(text: str, pages: Dict[int, str]) -> List[Dict[str, Any]]:
    """
    Detect headers in document text.
    
    Args:
        text: Full document text
        pages: Dictionary mapping page numbers to page text
        
    Returns:
        List of headers with metadata (position, level, text)
    """
    headers = []
    
    # Regex patterns for common ESG headers
    header_patterns = [
        # Standard ESG sections
        r"(?i)^(\s*)(Environmental|Social|Governance)(\s+Impact|\s+Factors|\s+Metrics)?(\s*)$",
        # GRI/SASB standard headers
        r"(?i)^(\s*)(GRI|SASB)(\s+\d+\.?\d*)?(\s*:)?\s+([A-Za-z\s]+)$",
        # Common ESG topics
        r"(?i)^(\s*)(Carbon|Climate|Emissions|Diversity|Inclusion|Board|Ethics|Human Rights)(\s+[A-Za-z\s]+)?$",
        # Numbered sections (allow multiple formats)
        r"^\s*(\d+(\.\d+)?)\s+([A-Z][a-z]+(\s+[A-Za-z]+){0,5})\s*$",
        # TCFD framework headers
        r"(?i)^(\s*)(Governance|Strategy|Risk Management|Metrics and Targets)(\s+of Climate-Related (Risks|Opportunities))?(\s*)$",
        # Annual report standard sections
        r"(?i)^(\s*)(Executive Summary|Letter from (the |our )?(CEO|Chairman)|Financial (Highlights|Summary))(\s*)$",
        # More ESG topics
        r"(?i)^(\s*)(Waste Management|Energy Efficiency|Water Usage|Biodiversity|Supply Chain|Community Relations)(\s+[A-Za-z\s]+)?$",
        # SDG goals references
        r"(?i)^(\s*)(SDG|Sustainable Development Goal)s?(\s+\d+)?(\s*:)?\s*([A-Za-z\s]+)?$",
        # Abstract, Introduction, Methodology patterns (common in academic papers)
        r"(?i)^(\s*)(Abstract|Introduction|Background|Methodology|Methods|Results|Discussion|Conclusion)(\s*)$",
        
        # Numbered sections without specific formatting requirements (more flexible)
        r"^\s*(\d+(\.\d+)?\.?\s+)(.+)$",
        
        # References/Bibliography headers
        r"(?i)^(\s*)(References|Bibliography|Works Cited|Literature)(\s*)$",
        
        # Catch-all for any line that's short and possibly a heading
        r"^([A-Z][A-Za-z\s]{2,40})$",
        
        # Spanish academic sections
        r"(?i)^(\s*)(Introducción|Metodología|Conclusión|Referencias|Resultados|Discusión)(\s*)$",
        # Numbered Spanish sections
        r"(?i)^(\s*)(\d+\.)(\s+)([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(\s+[A-Za-záéíóúñ]+){0,5})(\s*)$",
    ]
    
    # Exclude page annotations
    exclude_patterns = [
        r"(?i)^(\s*)(Machine Translated by Google)(\s*)$",
        r"(?i)^(\s*)(http|www)(.*)$",
        r"(?i)^(\s*)(\d+\s+de\s+[a-z]+\s+de\s+\d{4})(.*)$"
    ]
    
    line_positions = []
    lines = text.split('\n')
    
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
            
        is_header = False
        for pattern in header_patterns:
            if re.match(pattern, line):
                is_header = True
                # Determine header level based on various signals
                level = 1  # Default to top level
                if re.search(r'\d+\.\d+', line):  # Sub-section like "1.2"
                    level = 2
                
                headers.append({
                    "text": line,
                    "position": i,
                    "level": level
                })
                break
                
    # After the pattern matching, add this fallback logic:
    # If no headers were found, create artificial section breaks based on document length
    if not headers and len(lines) > 50:
        # Create artificial sections every ~300 lines
        section_size = 300
        for i in range(0, len(lines), section_size):
            if i > 0:  # Skip the very beginning
                headers.append({
                    "text": f"Section {i // section_size}",
                    "position": i,
                    "level": 1
                })
        
        if headers:
            logging.info(f"No natural headers found, created {len(headers)} artificial section breaks")
    
    return headers 

def build_section_hierarchy(headers):
    """Build a hierarchical structure from detected headers."""
    hierarchy = []
    current_path = []
    
    sorted_headers = sorted(headers, key=lambda h: h["position"])
    for header in sorted_headers:
        level = header["level"]
        
        # Adjust current path based on this header's level
        while len(current_path) >= level:
            current_path.pop()
        
        # Add this header to the current path
        current_path.append(header)
        
        # Create full path for this header
        full_path = [h["text"] for h in current_path]
        
        # Add to hierarchy with full path
        hierarchy.append({
            "text": header["text"],
            "position": header["position"],
            "level": level,
            "path": full_path,
            "full_path_text": " > ".join(full_path)
        })
    
    return hierarchy 