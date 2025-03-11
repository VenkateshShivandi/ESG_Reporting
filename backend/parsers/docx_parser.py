import os
import logging
from typing import Dict, List, Any
from docx import Document

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def extract_text_from_docx(file_path: str) -> str:
    """Extract full text from a DOCX file, ignoring empty paragraphs."""
    try:
        doc = Document(file_path)
        return "\n".join([para.text.strip() for para in doc.paragraphs if para.text.strip()])
    except Exception as e:
        logger.error(f"Error extracting text from DOCX: {str(e)}")
        return ""

def extract_tables_with_context(doc: Document) -> List[Dict[str, Any]]:
    """Extract tables with context (e.g., preceding paragraph as title)."""
    try:
        tables_data = []
        for i, table in enumerate(doc.tables):
            # Try to find the preceding paragraph as the table's title
            prev_para = doc.paragraphs[i - 1].text.strip() if i > 0 and doc.paragraphs else ""
            table_title = prev_para if prev_para else f"Table {i + 1}"
            table_content = [[cell.text.strip() for cell in row.cells] for row in table.rows]
            tables_data.append({
                "title": table_title,
                "content": table_content
            })
        return tables_data
    except Exception as e:
        logger.error(f"Error extracting tables from DOCX: {str(e)}")
        return []

def extract_metadata_from_docx(file_path: str) -> Dict[str, Any]:
    """Extract comprehensive metadata from a DOCX file."""
    try:
        doc = Document(file_path)
        metadata = {
            "filename": os.path.basename(file_path),
            "filesize": os.path.getsize(file_path),
            "paragraphs": len(doc.paragraphs),
            "tables": len(doc.tables),
            "word_count": sum(len(para.text.split()) for para in doc.paragraphs),
            "page_count": len(doc.sections)  # Approximate page count
        }
        try:
            core_props = doc.core_properties
            metadata.update({
                "author": core_props.author or "Not available",
                "title": core_props.title or "Not available",
                "created": core_props.created.isoformat() if core_props.created else "Not available",
                "modified": core_props.modified.isoformat() if core_props.modified else "Not available",
                "last_modified_by": core_props.last_modified_by or "Not available",
                "revision": core_props.revision or "Not available"
            })
        except Exception as e:
            logger.warning(f"Error extracting core properties: {str(e)}")
        return metadata
    except Exception as e:
        logger.error(f"Error extracting metadata from DOCX: {str(e)}")
        return {}

def extract_sections_from_docx(file_path: str) -> List[Dict[str, Any]]:
    """Extract sections using styles and content patterns, with type classification."""
    try:
        doc = Document(file_path)
        sections = []
        current_section = None
        current_content = []
        current_type = "question"  # Default type

        for para in doc.paragraphs:
            text = para.text.strip()
            if not text:
                continue  # Ignore empty paragraphs

            # Check if the paragraph is a heading (style-based or pattern-based)
            is_heading = (para.style and 'Heading' in para.style.name) or text.isupper() or text.startswith("Step ")
            is_observation = text.startswith("Observación:")

            if is_heading or is_observation:
                if current_section and current_content:
                    sections.append({
                        "heading": current_section,
                        "content": "\n".join(current_content),
                        "type": current_type
                    })
                    current_content = []
                current_section = text
                current_type = "observation" if is_observation else "question"
            else:
                current_content.append(text)

        # Append the last section
        if current_section and current_content:
            sections.append({
                "heading": current_section,
                "content": "\n".join(current_content),
                "type": current_type
            })
        elif current_content:
            sections.append({
                "heading": "Introduction",
                "content": "\n".join(current_content),
                "type": "question"
            })

        return sections
    except Exception as e:
        logger.error(f"Error extracting sections from DOCX: {str(e)}")
        return []

def parse_docx(file_path: str) -> Dict[str, Any]:
    """Parse a DOCX file into structured content with metadata, text, sections, and tables."""
    try:
        doc = Document(file_path)
        metadata = extract_metadata_from_docx(file_path)
        text = extract_text_from_docx(file_path)
        tables = extract_tables_with_context(doc)
        sections = extract_sections_from_docx(file_path)

        # Merge tables into sections with context
        for table in tables:
            sections.append({
                "heading": table["title"],
                "content": "\n".join([" | ".join(row) for row in table["content"]]),
                "type": "table"
            })

        result = {
            "metadata": metadata,
            "text": text,
            "sections": sections,
            "tables": tables
        }
        return result
    except Exception as e:
        logger.error(f"Error parsing DOCX file: {str(e)}")
        return {"error": str(e)}

# Example usage
if __name__ == "__main__":
    file_path = "example.docx"
    result = parse_docx(file_path)
    print(result)