"""
Loading module for the ESG PDF ETL Pipeline.

This module handles saving the processed chunks into output files.
"""

import os
import json
import logging
from datetime import datetime
from typing import Dict, List, Any
import numpy as np

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

class CustomEncoder(json.JSONEncoder):
    """Custom JSON encoder to handle numpy types and other non-standard types."""
    def default(self, obj):
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return str(obj)

def save_chunks_to_json(chunks: List[Dict[str, Any]], output_path: str) -> bool:
    """Save chunks to a JSON file."""
    try:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(chunks, f, cls=CustomEncoder, ensure_ascii=False, indent=2)
        logger.info(f"Saved {len(chunks)} chunks to {output_path}")
        return True
    except Exception as e:
        logger.error(f"Error saving chunks to {output_path}: {str(e)}")
        return False

def load_chunks(
    extraction_result: Dict[str, Any],
    transformation_result: Dict[str, Any],
    output_path: str,
    pdf_path: str,
    source_name: str = None
) -> Dict[str, Any]:
    """Load the chunks into output files and return detailed counts."""
    filename = source_name if source_name else os.path.basename(pdf_path).split(".")[0]
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file_path = os.path.join(output_path, f"{filename}_chunks.json")
    manifest_path = os.path.join(os.path.dirname(output_path), f"{filename}_manifest.json")
    chunk_info = {
        "filename": filename,
        "pdf_path": pdf_path,
        "extraction_info": extraction_result.get("metadata", {}),
        "transformation_info": transformation_result.get("metadata", {}),
        "chunk_count": len(transformation_result.get("chunks", [])),
        "timestamp": timestamp,
        "output_path": output_file_path
    }
    chunks = transformation_result.get("chunks", [])
    if not chunks:
        logger.warning("No chunks to load")
        return {"error": "No chunks to load", "status": "failed"}
    if not save_chunks_to_json(chunks, output_file_path):
        return {"error": f"Failed to save chunks to {output_file_path}", "status": "failed"}
    manifest_data = {}
    if os.path.exists(manifest_path):
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                manifest_data = json.load(f)
        except Exception as e:
            logger.warning(f"Error reading manifest file: {e}")
    if "runs" not in manifest_data:
        manifest_data["runs"] = []
    run_info = {
        "timestamp": timestamp,
        "readable_timestamp": datetime.now().strftime("%Y-%m-%d_%H-%M-%S"),
        "output_path": output_file_path,
        "chunk_count": len(chunks),
        "extraction_stats": extraction_result.get("metadata", {}),
        "transformation_stats": transformation_result.get("metadata", {})
    }
    manifest_data["runs"].append(run_info)
    manifest_data["last_updated"] = timestamp
    manifest_data["document_name"] = filename
    try:
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest_data, f, cls=CustomEncoder, indent=2)
        logger.info(f"Updated manifest at {manifest_path}")
    except Exception as e:
        logger.error(f"Error updating manifest: {e}")
        return {"error": str(e), "status": "failed"}
    # Calculate detailed counts
    ocr_chunks = transformation_result.get("ocr_chunks", [])
    tables = transformation_result.get("tables", [])
    text_chunks = [chunk for chunk in chunks if chunk not in ocr_chunks]  # Text chunks are total minus OCR
    return {
        "status": "success",
        "output_path": output_file_path,
        "manifest_path": manifest_path,
        "num_chunks": len(text_chunks),  # Text chunks
        "ocr_chunks": ocr_chunks,        # List of OCR chunks
        "tables": tables,                # List of tables
        "total_chunks": len(chunks),     # Total chunks (text + OCR)
        "timestamp": timestamp
    }