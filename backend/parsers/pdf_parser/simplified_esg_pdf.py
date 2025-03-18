import os
import fitz
import camelot
import json
import shutil
from datetime import datetime
from typing import List, Dict, Tuple
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass

# Import necessary components from other files
from .image_simplified import extract_images, save_images, ImageAnalyzer
from .text_simplified import SimplePDFParser, DocumentSection
from .camelot_simplified import extract_table_from_page, get_num_pages

@dataclass
class ESGReport:
    file_stats: Dict
    tables: List[Dict]
    images: List[Dict]
    text_content: List[DocumentSection]
    processing_summary: Dict

class ESGPDFProcessor:
    def __init__(self, pdf_path: str):
        self.pdf_path = pdf_path
        self.output_dir = f"output_{os.path.splitext(os.path.basename(pdf_path))[0]}"
        self.excluded_areas = []  # Stores table and image areas to avoid text overlap

    def _create_output_structure(self):
        """Create organized output directory structure"""
        dirs = ['tables', 'images', 'text', 'reports']
        for d in dirs:
            os.makedirs(os.path.join(self.output_dir, d), exist_ok=True)

    def get_file_stats(self) -> Dict:
        """Get PDF file statistics"""
        stats = {
            'file_name': os.path.basename(self.pdf_path),
            'file_size': f"{os.path.getsize(self.pdf_path) / (1024*1024):.2f} MB",
            'total_pages': get_num_pages(self.pdf_path),
            'processing_date': datetime.now().isoformat()
        }
        return stats

    def extract_and_filter_tables(self) -> Tuple[List[Dict], List[Tuple]]:
        """Extract tables and record their positions"""
        num_pages = get_num_pages(self.pdf_path)
        tables = []
        table_areas = []

        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = [executor.submit(extract_table_from_page, page) 
                      for page in range(1, num_pages + 1)]
            for page_idx, future in enumerate(futures):
                table_list = future.result()
                for table_idx, table in enumerate(table_list):
                    bbox = table._bbox
                    table_areas.append(bbox)
                    tables.append({
                        'page': page_idx + 1,
                        'table_number': table_idx + 1,
                        'shape': table.df.shape,
                        'output_path': os.path.join(self.output_dir, 'tables', 
                                                   f"table_p{page_idx+1}_{table_idx+1}.csv"),
                        'bbox': bbox
                    })
                    table.df.to_csv(tables[-1]['output_path'], index=False)
        
        self.excluded_areas.extend(table_areas)
        return tables, table_areas

    def extract_and_analyze_images(self) -> Tuple[List[Dict], List[Tuple]]:
        """Extract images with content analysis"""
        images = []
        image_areas = []
        image_list = extract_images(self.pdf_path)
        
        for img in image_list:
            analysis = ImageAnalyzer.analyze_content_value(img['data'])
            usefulness = ImageAnalyzer.determine_usefulness(analysis)
            
            if usefulness in ['high', 'medium']:
                img_data = {
                    'page': img['page'],
                    'format': img['format'],
                    'usefulness': usefulness,
                    'text_density': analysis.get('text_density', {}).get('text_percentage', 0),
                    'output_path': os.path.join(self.output_dir, 'images',
                                               f"img_p{img['page']}_{img['index']}.{img['format']}")
                }
                with open(img_data['output_path'], 'wb') as f:
                    f.write(img['data'])
                images.append(img_data)
                image_areas.append(self._get_image_bbox(img['page'], img['index']))
        
        self.excluded_areas.extend(image_areas)
        return images, image_areas

    def _get_image_bbox(self, page_num: int, image_index: int) -> Tuple:
        """Get image bounding box from original PDF"""
        doc = fitz.open(self.pdf_path)
        page = doc.load_page(page_num - 1)
        images = page.get_images(full=True)
        if image_index < len(images):
            return page.get_image_bbox(images[image_index])
        return (0, 0, 0, 0)

    def extract_text_content(self) -> List[DocumentSection]:
        """Extract and structure text content excluding tables/images"""
        parser = SimplePDFParser(self.pdf_path)
        
        # Modify the parser to exclude table/image areas
        original_parse = parser.parse
        def modified_parse():
            sections = original_parse()
            return [s for s in sections if not self._is_in_excluded_area(s.bbox)]
        parser.parse = modified_parse
        
        sections = parser.parse()
        hierarchy = parser.create_hierarchy(sections)
        
        # Save text output
        text_output = os.path.join(self.output_dir, 'text', 'document_structure.json')
        with open(text_output, 'w') as f:
            json.dump([self._section_to_dict(s) for s in hierarchy], f, indent=2)
            
        return hierarchy

    def _is_in_excluded_area(self, bbox: Tuple) -> bool:
        """Check if text area overlaps with excluded regions"""
        for excluded in self.excluded_areas:
            if (bbox[0] < excluded[2] and bbox[2] > excluded[0] and
                bbox[1] < excluded[3] and bbox[3] > excluded[1]):
                return True
        return False

    def _section_to_dict(self, section: DocumentSection) -> Dict:
        """Convert DocumentSection to JSON-serializable dict"""
        return {
            'title': section.title,
            'content': section.content,
            'children': [self._section_to_dict(c) for c in section.children],
            'page_range': f"{section.page_start}-{section.page_end}"
        }

    def generate_report(self, stats: Dict, tables: List, images: List, text: List) -> ESGReport:
        """Generate final processing report"""
        return ESGReport(
            file_stats=stats,
            tables=tables,
            images=images,
            text_content=text,
            processing_summary={
                'tables_extracted': len(tables),
                'images_saved': len(images),
                'text_sections': len(text),
                'excluded_areas': len(self.excluded_areas)
            }
        )

    def process(self) -> ESGReport:
        """Main processing pipeline"""
        self._create_output_structure()
        
        # Step 1: Get file statistics
        stats = self.get_file_stats()
        
        # Step 2: Table extraction
        tables, table_areas = self.extract_and_filter_tables()
        
        # Step 3: Image extraction
        images, image_areas = self.extract_and_analyze_images()
        
        # Step 4: Text extraction
        text_content = self.extract_text_content()
        
        # Step 5: Generate final report
        report = self.generate_report(stats, tables, images, text_content)
        
        # Save comprehensive report
        report_path = os.path.join(self.output_dir, 'reports', 'full_report.json')
        with open(report_path, 'w') as f:
            json.dump(report.__dict__, f, indent=2)
            
        return report

if __name__ == "__main__":
    import sys
    if len(sys.argv) != 2:
        print("Usage: python simplified_esg_pdf.py <path_to_pdf>")
        sys.exit(1)
        
    processor = ESGPDFProcessor(sys.argv[1])
    report = processor.process()
    print(f"ESG report processing complete. Results saved to {processor.output_dir}")
