import fitz
from dataclasses import dataclass
from typing import List, Tuple, Optional
import json
import re
from collections import defaultdict

@dataclass
class TextSection:
    text: str
    page_num: int
    font_size: float
    is_heading: bool
    bbox: Tuple[float, float, float, float]

@dataclass
class DocumentSection:
    title: Optional[str]
    content: List[str]
    children: List['DocumentSection']
    page_start: int
    page_end: int

class SimplePDFParser:
    def __init__(self, pdf_path: str):
        self.doc = fitz.open(pdf_path)
        self.heading_size_threshold = 12
        self.common_fonts = {}  # Track font usage statistics
        
    def _is_heading(self, text: str, font: str, size: float) -> bool:
        """Improved heading detection using multiple criteria"""
        return (
            size > self.heading_size_threshold and
            len(text.split()) < 15 and
            (text.isupper() or any(kw in text.lower() for kw in ['chapter', 'section', 'article'])) and
            font in self.common_fonts.get('heading_candidates', [])
        )

    def _detect_paragraph_break(self, current_line: str, next_line: str) -> bool:
        """Use linguistic cues to detect paragraph breaks"""
        # Sentence ending punctuation followed by capital letter
        if current_line and current_line[-1] in ('.', '!', '?') and next_line[:1].isupper():
            return True
            
        # Significant change in text density
        current_density = len(current_line) / (1 + current_line.count(' '))
        next_density = len(next_line) / (1 + next_line.count(' '))
        if abs(current_density - next_density) > 2.5:
            return True
            
        return False

    def _clean_text(self, text: str) -> str:
        """Normalize text and fix common PDF artifacts"""
        # Fix hyphenated words
        text = re.sub(r'(\w)-\s+(\w)', r'\1\2', text)
        
        # Remove orphan characters
        text = re.sub(r'\s+([.,;:])\s+', r'\1 ', text)
        
        # Normalize whitespace
        return ' '.join(text.split())

    def _merge_lines(self, lines: List[str]) -> List[str]:
        """Smart paragraph merging using linguistic patterns"""
        paragraphs = []
        current_para = []
        
        for i, line in enumerate(lines):
            line = self._clean_text(line)
            if not line:
                continue
                
            if not current_para:
                current_para.append(line)
                continue
                
            prev_line = current_para[-1]
            
            # Check for paragraph break conditions
            if self._detect_paragraph_break(prev_line, line):
                paragraphs.append(' '.join(current_para))
                current_para = [line]
            else:
                # Handle mid-paragraph line breaks
                if prev_line.endswith(('-', ',')) or line.startswith(('a', 'the', 'and', 'of')):
                    current_para.append(line)
                else:
                    current_para[-1] += ' ' + line
                    
        if current_para:
            paragraphs.append(' '.join(current_para))
            
        return paragraphs

    def parse(self) -> List[TextSection]:
        # First pass: collect font statistics
        self._analyze_fonts()
        
        # Second pass: parse content
        sections = []
        
        for page_num in range(len(self.doc)):
            page = self.doc[page_num]
            text_blocks = []
            
            # Extract text with coordinates and font info
            blocks = page.get_text("blocks", flags=fitz.TEXT_PRESERVE_WHITESPACE)
            
            for block in blocks:
                text = self._clean_text(block[4])
                if not text:
                    continue
                    
                font = self._get_dominant_font(block)
                size = self._get_avg_font_size(block)
                
                text_blocks.append({
                    'text': text,
                    'font': font,
                    'size': size,
                    'page': page_num + 1
                })
            
            # Process text blocks into paragraphs
            raw_lines = [tb['text'] for tb in text_blocks]
            paragraphs = self._merge_lines(raw_lines)
            
            # Create sections
            for para in paragraphs:
                if para:
                    sections.append(TextSection(
                        text=para,
                        page_num=page_num + 1,
                        font_size=size,
                        is_heading=self._is_heading(para, font, size),
                        bbox=None  # No longer using bbox
                    ))
        
        return sections

    def _analyze_fonts(self):
        """Analyze font usage patterns to identify headings"""
        font_stats = defaultdict(int)
        
        for page in self.doc:
            blocks = page.get_text("dict")["blocks"]
            for block in blocks:
                if "lines" in block:
                    for line in block["lines"]:
                        for span in line["spans"]:
                            key = (span['font'], span['size'])
                            font_stats[key] += 1
                            
        # Identify heading candidate fonts (used for short texts)
        self.common_fonts['heading_candidates'] = [
            font for (font, size), count in font_stats.items() 
            if size > self.heading_size_threshold and count < 50
        ]

    def _get_dominant_font(self, block) -> str:
        """Get the most frequently used font in a text block"""
        font_counter = defaultdict(int)
        if 'lines' in block:
            for line in block['lines']:
                for span in line['spans']:
                    font_counter[span['font']] += len(span['text'])
        if font_counter:
            return max(font_counter.items(), key=lambda x: x[1])[0]
        return 'unknown'

    def _get_avg_font_size(self, block) -> float:
        """Calculate average font size in a text block"""
        sizes = []
        if 'lines' in block:
            for line in block['lines']:
                for span in line['spans']:
                    sizes.extend([span['size']] * len(span['text']))
        return sum(sizes)/len(sizes) if sizes else 0.0

    def create_hierarchy(self, sections: List[TextSection]) -> List[DocumentSection]:
        """Group content under headings with flexible hierarchy"""
        hierarchy = []
        current_section = None
        content_buffer = []
        current_page = 0
        
        for section in sections:
            # Start new section when we find a heading
            if section.is_heading:
                if current_section is not None:
                    # Commit previous section
                    current_section.content = content_buffer
                    current_section.page_end = current_page
                    hierarchy.append(current_section)
                    
                # Start new section
                current_section = DocumentSection(
                    title=section.text,
                    content=[],
                    children=[],
                    page_start=section.page_num,
                    page_end=section.page_num
                )
                content_buffer = []
            else:
                # Add to current section or root
                if current_section:
                    # Check if this looks like a subheading
                    if len(section.text.split()) < 8 and section.text.endswith(':'):
                        current_section.children.append(DocumentSection(
                            title=section.text,
                            content=[],
                            children=[],
                            page_start=section.page_num,
                            page_end=section.page_num
                        ))
                    else:
                        content_buffer.append(section.text)
                else:
                    # Content before first heading
                    hierarchy.append(DocumentSection(
                        title=None,
                        content=[section.text],
                        children=[],
                        page_start=section.page_num,
                        page_end=section.page_num
                    ))
                
            current_page = section.page_num
        
        # Add final section
        if current_section is not None:
            current_section.content = content_buffer
            current_section.page_end = current_page
            hierarchy.append(current_section)
            
        return hierarchy

    def save_to_json(self, output_path: str):
        """Save the structured content to a JSON file."""
        sections = self.parse()
        hierarchy = self.create_hierarchy(sections)
        
        def section_to_dict(section):
            return {
                'title': section.title,
                'content': section.content,
                'children': [section_to_dict(child) for child in section.children],
                'page_range': f"{section.page_start}-{section.page_end}" 
                if section.page_start != section.page_end 
                else str(section.page_start)
            }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump([section_to_dict(s) for s in hierarchy], f, 
                     ensure_ascii=False, indent=2)

    def close(self):
        self.doc.close()

def main():
    pdf_path = "./test_files/invoice.pdf"
    output_path = "output_text.json"
    
    parser = SimplePDFParser(pdf_path)
    try:
        parser.save_to_json(output_path)
        print(f"Successfully parsed PDF and saved text to {output_path}")
    finally:
        parser.close()

if __name__ == "__main__":
    main()
