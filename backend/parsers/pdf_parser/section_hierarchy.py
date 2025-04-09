"""
Section hierarchy module for the ESG PDF ETL Pipeline.

This module handles building hierarchical document structure from detected headers.
"""

import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

def build_section_hierarchy(headers: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
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
    
    logger.info(f"Built hierarchical structure from {len(headers)} headers, resulting in {len(hierarchy)} organized sections")
    return hierarchy 