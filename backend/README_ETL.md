# ESG PDF ETL Pipeline

A streamlined Extract-Transform-Load pipeline for processing PDF documents to extract ESG-relevant content and prepare it for RAG (Retrieval Augmented Generation).

## Overview

This ETL pipeline processes PDF documents through three main stages:

1. **Extract**: Extract text and tables from PDF documents using multiple libraries for robust extraction
2. **Transform**: Create semantically coherent chunks and calculate ESG relevance scores
3. **Load**: Save processed chunks in JSON format for downstream RAG integration

## Features

- **Multiple PDF extraction methods**: Uses PyPDF2, pdfminer.six, and PyMuPDF for robust text extraction
- **Table extraction**: Uses camelot-py to extract tables from PDFs
- **Semantic chunking**: Creates semantically coherent chunks using sentence embeddings and cosine similarity
- **ESG relevance scoring**: Calculates relevance to Environmental, Social, and Governance topics
- **Structured output**: Saves chunks with metadata in JSON format for RAG integration
- **Batch processing**: Can process entire directories of PDF files

## Installation

1. Install the required dependencies:

```bash
pip install -r requirements_etl.txt
```

2. For table extraction with camelot, you may need to install additional dependencies:
   - Ghostscript: Used by camelot for PDF processing
   - Tkinter: Required for visualization (optional)

## Usage

### Process a single PDF

```bash
python esg_pdf_etl.py path/to/your/document.pdf output/directory
```

### Process all PDFs in a directory

```bash
python esg_pdf_etl.py path/to/pdf/directory output/directory
```

### Use as a module in your code

```python
from esg_pdf_etl import run_etl_pipeline

result = run_etl_pipeline(
    pdf_path="path/to/document.pdf",
    output_dir="output/directory"
)

if result['status'] == 'success':
    print(f"Created {result['num_chunks']} chunks")
    print(f"Output saved to: {result['output_path']}")
else:
    print(f"Error: {result.get('error')}")
```

## Output Structure

The pipeline creates the following outputs:

1. A main JSON file with all chunks organized by page
2. Individual JSON files for each chunk (if enabled)

Each chunk includes:
- Text content
- Number of sentences
- ESG relevance score
- Page number
- Source document metadata

## Configuration

Key parameters can be adjusted at the top of the `esg_pdf_etl.py` file:

- `MAX_CHUNK_SIZE`: Maximum number of sentences per chunk
- `CHUNK_SIMILARITY_THRESHOLD`: Threshold for semantic similarity
- `ESG_RELEVANCE_THRESHOLD`: Minimum ESG relevance score to keep a chunk
- `CREATE_INDIVIDUAL_CHUNK_FILES`: Whether to create individual JSON files for each chunk
- `TIMESTAMP_IN_FILENAME`: Whether to include a timestamp in filenames

## ESG Keywords

The pipeline uses a comprehensive list of ESG-related keywords organized into categories:
- Environmental: climate, emissions, sustainability, etc.
- Social: diversity, inclusion, human rights, etc.
- Governance: compliance, transparency, ethics, etc.

You can modify these keywords in the `ESG_KEYWORDS` dictionary in `esg_pdf_etl.py`.

## Requirements

- Python 3.8+
- Libraries listed in `requirements_etl.txt`

## Integration with RAG

The output of this ETL pipeline is designed to be used with a RAG (Retrieval Augmented Generation) system:

1. Process documents through this ETL pipeline
2. Store the chunks in a vector database
3. Implement a retrieval mechanism that uses the chunk metadata
4. Use the retrieved chunks to ground LLM responses in your document content

## License

MIT 