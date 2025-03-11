import os
import json
import time
import logging
from datetime import datetime
from typing import Dict, List, Any

# Configure logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Import ETL functions
from parsers.esg_pdf_etl import run_etl_pipeline

def test_file(pdf_path: str, output_dir: str) -> Dict[str, Any]:
    """
    Test the ETL pipeline on a single file and return the results.
    
    Args:
        pdf_path: Path to the PDF file
        output_dir: Directory to save output files
        
    Returns:
        Dictionary with test results and metrics
    """
    start_time = time.time()
    filename = os.path.basename(pdf_path)
    
    logger.info(f"Testing file: {filename}")
    
    try:
        # Run the ETL pipeline
        result = run_etl_pipeline(pdf_path, output_dir)
        
        # Calculate processing time
        processing_time = time.time() - start_time
        
        # Extract relevant metrics
        metrics = {
            "filename": filename,
            "status": result.get("status", "unknown"),
            "processing_time_seconds": round(processing_time, 2),
            "success": result.get("status") == "success",
            "error": result.get("error", None),
            "num_chunks": result.get("num_chunks", 0),
            "language": result.get("transformation_result", {}).get("language", "unknown"),
            "document_name": result.get("document_name", "unknown"),
            "output_path": result.get("output_path", "unknown"),
        }
        
        # Check if the output file exists and read its content to get accurate counts
        if metrics["output_path"] and os.path.exists(metrics["output_path"]):
            try:
                with open(metrics["output_path"], 'r', encoding='utf-8') as f:
                    chunks = json.load(f)
                    
                    # Count different types of chunks
                    semantic_chunks = sum(1 for c in chunks if c.get("type", "") != "ocr" and not c.get("contains_ocr", False))
                    ocr_chunks = sum(1 for c in chunks if c.get("type", "") == "ocr" or c.get("contains_ocr", True))
                    table_chunks = sum(1 for c in chunks if "table" in c.get("text", "").lower())
                    
                    # Add detailed chunk metrics
                    metrics.update({
                        "semantic_chunk_count": semantic_chunks,
                        "ocr_chunk_count": ocr_chunks,
                        "table_chunk_count": table_chunks,
                        "total_chunk_count": len(chunks)
                    })
            except Exception as e:
                logger.warning(f"Could not read output file: {str(e)}")
                
        logger.info(f"Completed testing {filename} - Status: {metrics['status']}, " 
                   f"Chunks: {metrics.get('total_chunk_count', metrics.get('num_chunks', 0))}, "
                   f"Processing Time: {metrics['processing_time_seconds']}s")
        
        return metrics
        
    except Exception as e:
        logger.error(f"Error processing {filename}: {str(e)}")
        return {
            "filename": filename,
            "status": "error",
            "success": False,
            "error": str(e),
            "processing_time_seconds": round(time.time() - start_time, 2)
        }

def main():
    """
    Test the chunking strategy on all test files and generate a summary report.
    """
    # Directory paths
    test_files_dir = "test_files"
    output_dir = "output/chunks"
    summary_dir = "output/test_results"
    
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(summary_dir, exist_ok=True)
    
    # Get list of PDF files in the test directory
    pdf_files = [os.path.join(test_files_dir, f) for f in os.listdir(test_files_dir) 
                 if f.lower().endswith('.pdf')]
    
    logger.info(f"Found {len(pdf_files)} PDF files to test")
    
    # Test each file and collect results
    results = []
    for pdf_path in pdf_files:
        result = test_file(pdf_path, output_dir)
        results.append(result)
    
    # Create summary report
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    summary_path = os.path.join(summary_dir, f"chunking_test_summary_{timestamp}.json")
    
    summary = {
        "timestamp": timestamp,
        "total_files": len(pdf_files),
        "successful_files": sum(1 for r in results if r.get("success", False)),
        "failed_files": sum(1 for r in results if not r.get("success", False)),
        "results": results
    }
    
    # Save summary report
    with open(summary_path, 'w', encoding='utf-8') as f:
        json.dump(summary, f, indent=2)
    
    logger.info(f"Testing completed. Summary saved to {summary_path}")
    logger.info(f"Processed {summary['total_files']} files: "
               f"{summary['successful_files']} succeeded, {summary['failed_files']} failed")
    
    # Print results table
    print("\nRESULTS SUMMARY:")
    print("-" * 135)
    print(f"{'Filename':<30} | {'Status':<8} | {'Lang':<8} | {'Total':<5} | {'Semantic':<8} | {'OCR':<5} | {'Tables':<6} | {'Time (s)':<8} | {'Output Path':<40}")
    print("-" * 135)
    
    for r in results:
        filename = r.get("filename", "unknown")[:28]
        status = r.get("status", "unknown")[:8]
        language = r.get("language", "unknown")[:8]
        total_chunks = r.get("total_chunk_count", r.get("num_chunks", 0))
        semantic_chunks = r.get("semantic_chunk_count", 0)
        ocr = r.get("ocr_chunk_count", 0)
        tables = r.get("table_chunk_count", 0)
        time_s = r.get("processing_time_seconds", 0)
        output_path = r.get("output_path", "")
        if output_path and len(output_path) > 40:
            output_path = "..." + output_path[-37:]
        
        print(f"{filename:<30} | {status:<8} | {language:<8} | {total_chunks:<5} | {semantic_chunks:<8} | {ocr:<5} | {tables:<6} | {time_s:<8} | {output_path:<40}")
    
    print("-" * 135)

if __name__ == "__main__":
    main() 