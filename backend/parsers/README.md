# Document Parsers for ESG Reporting

This package provides parsers for various file types commonly used in ESG reporting:

- PDF files
- Excel files (XLSX, XLS)
- Word documents (DOCX)
- PowerPoint presentations (PPTX)
- CSV files
- Images (JPEG, PNG)
- XML files (XML, XHTML, SVG, RSS)

The parsers extract text, tables, metadata, and other content from these files in a structured format, making them ready for further processing like chunking and RAG integration.

## Installation

Install all required dependencies:

```bash
pip install -r ../requirements.txt
```

### Tesseract OCR Installation

For OCR functionality (extracting text from images and scanned PDFs), you need to install Tesseract OCR separately:

- **Windows**: Download and install from [UB-Mannheim/tesseract](https://github.com/UB-Mannheim/tesseract/wiki)
- **Linux**: `sudo apt install tesseract-ocr`
- **macOS**: `brew install tesseract`

After installation, ensure the Tesseract executable is in your PATH or set the path in your code:

```python
import pytesseract
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'  # Windows example
```

## Usage

### Basic Usage

The simplest way to use the parsers is to let the library detect the file type automatically:

```python
from parsers import parse_file

result = parse_file('path/to/your/file.pdf')
print(result)
```

### Type-Specific Parsers

For more control, you can use the specific parsers:

```python
from parsers import parse_pdf, parse_excel, parse_docx, parse_pptx, parse_csv, parse_image, parse_xml

# Parse a PDF file
pdf_result = parse_pdf('path/to/your/file.pdf')

# Parse an Excel file
excel_result = parse_excel('path/to/your/file.xlsx')

# Parse a Word document
docx_result = parse_docx('path/to/your/file.docx')

# Parse a PowerPoint presentation
pptx_result = parse_pptx('path/to/your/file.pptx')

# Parse a CSV file
csv_result = parse_csv('path/to/your/file.csv')

# Parse an image
image_result = parse_image('path/to/your/file.jpg')

# Parse an XML file
xml_result = parse_xml('path/to/your/file.xml')
```

### Testing the Parsers

Use the included test script to parse any file and see the results:

```bash
python ../test_parsers.py path/to/your/file.pdf
```

## Output Format

Each parser returns a dictionary with structured data. The exact structure depends on the file type, but generally includes:

- `metadata`: File information like name, size, author, etc.
- `text`: Extracted text content (for text-based files)
- `tables`: Extracted tables (for files that contain tables)
- `sheets`: Worksheet data (for Excel files)
- `slides`: Slide content (for PowerPoint files)
- `text_blocks`: Text with layout information (for image files)
- `xml_structure`: Hierarchical structure of XML files
- `xpath_data`: Additional data extracted using XPath (for XML files)
- `error`: Error message (if parsing failed)

Example PDF result:

```json
{
  "metadata": {
    "title": "ESG Report",
    "author": "Example Corp",
    "created": "2023-01-01",
    "PageCount": 15
  },
  "text": "This is the extracted text content...",
  "tables": [
    [["Header1", "Header2"], ["Row1Col1", "Row1Col2"]]
  ]
}
```

Example XML result:

```json
{
  "metadata": {
    "filename": "report.xml",
    "filesize": 5432,
    "xml_version": "1.0",
    "encoding": "UTF-8",
    "root_tag": "ESGReport"
  },
  "xml_structure": {
    "ESGReport": {
      "@attributes": {
        "year": "2023"
      },
      "metrics": {
        "carbon": {
          "#text": "12.5"
        },
        "waste": {
          "#text": "34.2"
        }
      }
    }
  }
}
```

## Future Extensibility

This parsing system is designed to be easily extended for:

1. **Supabase Integration**: File paths can be replaced with Supabase Storage paths by modifying the existing file access logic.

2. **Chunking for RAG**: The raw extracted data can be chunked for RAG systems after parsing.

## Error Handling

All parsers include comprehensive error handling for:

- File not found
- Corrupted files
- Password-protected files
- Scanned PDFs/low-quality images
- Large files
- Malformed XML

Errors are returned in the `error` field of the result dictionary instead of raising exceptions.

## Package Structure

- `__init__.py`: Exports all parsers and the generic `parse_file` function
- `utils.py`: Shared utility functions
- `pdf_parser.py`: PDF file parser
- `excel_parser.py`: Excel file parser
- `docx_parser.py`: Word document parser
- `pptx_parser.py`: PowerPoint presentation parser
- `csv_parser.py`: CSV file parser
- `image_parser.py`: Image file parser
- `xml_parser.py`: XML file parser

## Dependencies

- **PDF Parsing**: PyPDF2, pdfminer.six, Camelot, PyMuPDF
- **Excel Parsing**: pandas, openpyxl
- **Word Parsing**: python-docx
- **PowerPoint Parsing**: python-pptx
- **CSV Parsing**: pandas
- **Image Parsing**: Pillow, pytesseract
- **XML Parsing**: lxml (with fallback to xml.etree.ElementTree)
- **Utilities**: chardet (for encoding detection) 