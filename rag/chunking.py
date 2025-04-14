import os
import re
import uuid
import sys
import json
import argparse
import PyPDF2
from typing import List, Dict, Any, Optional, Tuple


class PDFChunker:
    """
    Extract text from PDF documents and divide into overlapping chunks 
    for processing and embedding in RAG systems.
    """
    
    def __init__(self, chunk_size: int = 600, chunk_overlap: int = 200):
        """
        Initialize the PDF chunker with configurable chunk size and overlap.
        
        Args:
            chunk_size: Maximum size of each text chunk in characters (default: 600)
            chunk_overlap: Number of characters to overlap between chunks (default: 200)
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def extract_text_from_pdf(self, pdf_path: str) -> Tuple[str, bool]:
        """
        Extract all text content from a PDF file.
        
        Args:
            pdf_path: Path to the PDF file
            
        Returns:
            Tuple of (extracted text, success flag)
        """
        if not os.path.exists(pdf_path):
            return "", False
        
        try:
            text = ""
            with open(pdf_path, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                for page_num in range(len(reader.pages)):
                    page = reader.pages[page_num]
                    page_text = page.extract_text()
                    # Normalize Unicode characters to prevent escape sequences
                    page_text = page_text.encode('utf-8', errors='replace').decode('utf-8')
                    text += page_text + "\n\n"
            
            # Clean the text of excessive whitespace
            text = re.sub(r'\s+', ' ', text).strip()
            return text, True
        
        except Exception as e:
            print(f"Error extracting text from PDF {pdf_path}: {str(e)}")
            return "", False

    def create_chunks(self, text: str) -> List[Dict[str, Any]]:
        """
        Split text into overlapping chunks of specified size.
        
        Args:
            text: The text content to be chunked
            
        Returns:
            List of chunk dictionaries with text content and metadata
        """
        if not text:
            return []
        
        chunks = []
        start = 0
        
        while start < len(text):
            # Calculate end position for this chunk
            end = start + self.chunk_size
            
            # Handle the case where we're at the end of the text
            if end >= len(text):
                chunk_text = text[start:]
            else:
                # Try to find a good break point (sentence or paragraph end)
                # Look for sentence endings within the last 100 chars of the chunk
                search_range_start = max(end - 100, start + self.chunk_size // 2)
                search_range_end = min(end + 100, len(text))
                search_text = text[search_range_start:search_range_end]
                
                # Look for sentence breaks (period, question mark, exclamation)
                sentence_breaks = [
                    search_range_start + m.start() 
                    for m in re.finditer(r'[.!?]\s+', search_text)
                ]
                
                if sentence_breaks:
                    # Use the last sentence break before the chunk end
                    breaks_before_end = [b for b in sentence_breaks if b <= end]
                    if breaks_before_end:
                        end = breaks_before_end[-1] + 2  # +2 to include the period and space
                    else:
                        end = sentence_breaks[0] + 2
                
                chunk_text = text[start:end]
            
            # Generate a unique ID for the chunk
            chunk_id = str(uuid.uuid4())[:8]
            
            # Create chunk with metadata
            chunk = {
                "text": chunk_text,
                "chunk_id": chunk_id,
                "start_char": start,
                "end_char": end,
                "length": len(chunk_text)
            }
            
            chunks.append(chunk)
            
            # Move the start position for the next chunk, considering overlap
            start = end - self.chunk_overlap
            
            # If we've reached the end of the text, break
            if start >= len(text):
                break
        
        return chunks

    def process_pdf(self, pdf_path: str) -> List[Dict[str, Any]]:
        """
        Process a PDF file by extracting text and dividing into chunks.
        
        Args:
            pdf_path: Path to the PDF file
            
        Returns:
            List of chunk dictionaries with text content and metadata
        """
        text, success = self.extract_text_from_pdf(pdf_path)
        
        if not success:
            print(f"Failed to extract text from {pdf_path}")
            return []
        
        chunks = self.create_chunks(text)
        
        # Add source document info to each chunk
        for chunk in chunks:
            chunk["source"] = os.path.basename(pdf_path)
            chunk["source_path"] = pdf_path
        
        return chunks


def process_document(
    file_path: str,
    chunk_size: int = 600,
    chunk_overlap: int = 200,
    output_dir: str = None,
    verbose: bool = False
) -> List[Dict[str, Any]]:
    """
    Process a document with the PDFChunker and return the chunks.
    
    Args:
        file_path: Path to the PDF file
        chunk_size: Size of each chunk in characters
        chunk_overlap: Number of characters to overlap between chunks
        output_dir: Directory to save JSON output (if provided)
        verbose: Whether to print detailed information
        
    Returns:
        List of chunk dictionaries
    """
    if not os.path.exists(file_path):
        print(f"Error: File not found: {file_path}")
        return []
    
    if verbose:
        print(f"Processing {file_path} with chunk size={chunk_size}, overlap={chunk_overlap}")
    
    # Create the chunker with specified parameters
    chunker = PDFChunker(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    
    # Process the document
    chunks = chunker.process_pdf(file_path)
    
    if verbose:
        print(f"Created {len(chunks)} chunks")
        
        if chunks:
            sample = chunks[0]
            print("\nSample chunk:")
            print(f"ID: {sample['chunk_id']}")
            print(f"Length: {sample['length']} characters")
            print(f"Text preview: {sample['text'][:150]}...")
    
    # Save to JSON file if output directory is specified
    if output_dir and chunks:
        os.makedirs(output_dir, exist_ok=True)
        base_name = os.path.splitext(os.path.basename(file_path))[0]
        output_file = os.path.join(output_dir, f"{base_name}_chunks.json")
        
        with open(output_file, 'w', encoding='utf-8') as f:
            # ensure_ascii=False prevents unicode escaping (fixes \u00e1 issue)
            json.dump(chunks, f, ensure_ascii=False, indent=2)
            
        if verbose:
            print(f"Saved chunks to {output_file}")
    
    return chunks


def main():
    """Command-line interface for the PDF chunker"""
    parser = argparse.ArgumentParser(description="PDF Chunking Tool for RAG systems")
    
    parser.add_argument("file", help="Path to the PDF file to process")
    parser.add_argument("--size", type=int, default=600, 
                        help="Chunk size in characters (default: 600)")
    parser.add_argument("--overlap", type=int, default=200, 
                        help="Overlap between chunks in characters (default: 200)")
    parser.add_argument("--output-dir", "-o", type=str, default="output",
                        help="Directory to save output JSON files (default: output)")
    parser.add_argument("--verbose", "-v", action="store_true",
                        help="Print detailed information")
    parser.add_argument("--no-save", action="store_true",
                        help="Don't save output to disk")
    
    args = parser.parse_args()
    
    # Determine output directory (None if no-save is specified)
    output_dir = None if args.no_save else args.output_dir
    
    # Process the document
    chunks = process_document(
        args.file,
        chunk_size=args.size,
        chunk_overlap=args.overlap,
        output_dir=output_dir,
        verbose=args.verbose
    )
    
    # Always print summary
    print(f"\nSummary: Processed {args.file} and created {len(chunks)} chunks")
    if output_dir and chunks:
        base_name = os.path.splitext(os.path.basename(args.file))[0]
        output_file = os.path.join(output_dir, f"{base_name}_chunks.json")
        print(f"Output saved to: {output_file}")


if __name__ == "__main__":
    main()
