from chunking import PDFChunker, process_document
import sys
import json

# Option 1: Use the utility function
chunks = process_document("path/to/document.pdf", chunk_size=800, chunk_overlap=150)

# Option 2: Use the PDFChunker class directly
# chunker = PDFChunker(chunk_size=800, chunk_overlap=150)
# chunks = chunker.process_pdf("path/to/document.pdf")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python chunker.py <pdf_path> [chunk_size] [chunk_overlap]")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    chunk_size = int(sys.argv[2]) if len(sys.argv) > 2 else 600
    chunk_overlap = int(sys.argv[3]) if len(sys.argv) > 3 else 200
    
    # Either use process_document function
    chunks = process_document(
        pdf_path,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        verbose=True
    )
    
    # Or create the chunker directly
    # chunker = PDFChunker(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    # chunks = chunker.process_pdf(pdf_path)
    
    # Print summary
    print(f"Processed {pdf_path}")
    print(f"Created {len(chunks)} chunks with size {chunk_size}, overlap {chunk_overlap}")
    
    # Print first chunk as sample
    if chunks:
        sample = chunks[0]
        print("\nSample chunk:")
        print(f"ID: {sample['chunk_id']}")
        print(f"Length: {sample['length']} characters")
        print(f"Text snippet: {sample['text'][:100]}...")

# Save the chunks to a JSON file
with open(sys.argv[4] if len(sys.argv) > 4 else "chunks.json", 'w') as f:
    json.dump(chunks, f, indent=4)
