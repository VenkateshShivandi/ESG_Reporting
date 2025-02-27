import xml.etree.ElementTree as ET
from datetime import datetime

def process_xml(file_path):
    tree = ET.parse(file_path)
    root = tree.getroot()
    
    # Count number of elements
    element_count = count_elements(root)
    
    # Get root element name and attributes
    root_info = {
        'name': root.tag,
        'attributes': dict(root.attrib)
    }
    
    # Get the first few child elements for preview
    children = []
    for child in list(root)[:5]:  # First 5 children
        children.append({
            'tag': child.tag,
            'attributes': dict(child.attrib),
            'text': child.text.strip() if child.text else None
        })
    
    return {
        'type': 'xml',
        'root': root_info,
        'element_count': element_count,
        'children_preview': children,
        'processed_at': datetime.now().isoformat()
    }

def count_elements(elem):
    count = 1  # Count the element itself
    for child in elem:
        count += count_elements(child)
    return count 