"""
XML Parser Module

This module provides functionality to parse XML files using:
- lxml: High-performance XML parsing
- ElementTree: XML tree navigation

The main function is parse_xml(), which extracts data from XML files
and returns it in a structured format.
"""

import os
import logging
from typing import Dict, List, Any, Union
import json

# Import utility functions
from .utils import safe_parse, create_result_dict

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to import the required libraries
try:
    import lxml.etree as ET
    LXML_AVAILABLE = True
except ImportError:
    LXML_AVAILABLE = False
    logger.warning("lxml not available. Falling back to built-in xml.etree.ElementTree")
    try:
        import xml.etree.ElementTree as ET
        ETREE_AVAILABLE = True
    except ImportError:
        ETREE_AVAILABLE = False
        logger.warning("xml.etree.ElementTree not available. XML parsing will be limited.")

def extract_xml_tree(file_path: str) -> Dict[str, Any]:
    """
    Extract the XML tree structure with lxml or ElementTree.
    
    Args:
        file_path (str): Path to the XML file
        
    Returns:
        Dict[str, Any]: Structured XML content
    """
    try:
        # Parse the XML file
        tree = ET.parse(file_path)
        root = tree.getroot()
        
        # Function to recursively convert XML elements to dictionaries
        def xml_to_dict(element):
            result = {}
            
            # Add attributes if any
            if element.attrib:
                result["@attributes"] = dict(element.attrib)
            
            # Process child elements
            children = list(element)
            if not children:
                # Element has no children, just text
                text = element.text
                if text is not None and text.strip():
                    result["#text"] = text.strip()
                    return result
                else:
                    # Element has no children and no non-whitespace text
                    return result if result else None
            
            # Group child elements by tag
            child_dict = {}
            for child in children:
                child_data = xml_to_dict(child)
                if child.tag in child_dict:
                    if isinstance(child_dict[child.tag], list):
                        child_dict[child.tag].append(child_data)
                    else:
                        child_dict[child.tag] = [child_dict[child.tag], child_data]
                else:
                    child_dict[child.tag] = child_data
            
            # Add child elements to result
            result.update(child_dict)
            
            # Add text if any (and not just whitespace)
            text = element.text
            if text is not None and text.strip() and children:
                result["#text"] = text.strip()
            
            return result
        
        # Convert root element to dictionary
        xml_dict = {root.tag: xml_to_dict(root)}
        
        return xml_dict
    except Exception as e:
        logger.error(f"Error extracting XML tree: {str(e)}")
        return create_result_dict(error=f"Error extracting XML tree: {str(e)}")

def extract_xpath_data(file_path: str) -> Dict[str, Any]:
    """
    Extract data using XPath queries (lxml only).
    
    Args:
        file_path (str): Path to the XML file
        
    Returns:
        Dict[str, Any]: Data extracted using XPath
    """
    if not LXML_AVAILABLE:
        return {"xpath_support": False}
    
    try:
        # Parse the XML file
        tree = ET.parse(file_path)
        root = tree.getroot()
        
        # Extract namespace information
        nsmap = root.nsmap if hasattr(root, 'nsmap') else {}
        
        # Collect basic statistics using XPath
        stats = {
            "element_count": len(root.xpath("//*")),
            "attribute_count": len(root.xpath("//@*")),
            "namespaces": nsmap
        }
        
        # Extract common data patterns (you can customize these)
        data_extracts = {}
        
        # Try to find tables
        table_elements = root.xpath("//table") or root.xpath("//*[contains(local-name(), 'Table')]")
        if table_elements:
            tables = []
            for i, table_elem in enumerate(table_elements):
                rows = table_elem.xpath(".//tr") or table_elem.xpath(".//*[contains(local-name(), 'Row')]")
                table_data = []
                for row in rows:
                    cells = row.xpath(".//td") or row.xpath(".//th") or row.xpath(".//*[contains(local-name(), 'Cell')]")
                    row_data = [cell.text.strip() if cell.text else "" for cell in cells]
                    if row_data:
                        table_data.append(row_data)
                if table_data:
                    tables.append(table_data)
            
            if tables:
                data_extracts["tables"] = tables
        
        # Try to find lists
        list_elements = root.xpath("//ul") or root.xpath("//ol") or root.xpath("//*[contains(local-name(), 'List')]")
        if list_elements:
            lists = []
            for list_elem in list_elements:
                items = list_elem.xpath(".//li") or list_elem.xpath(".//*[contains(local-name(), 'Item')]")
                list_items = [item.text.strip() if item.text else "" for item in items]
                if list_items:
                    lists.append(list_items)
            
            if lists:
                data_extracts["lists"] = lists
        
        return {
            "stats": stats,
            "data_extracts": data_extracts
        }
    except Exception as e:
        logger.error(f"Error extracting data with XPath: {str(e)}")
        return {"xpath_support": False, "error": str(e)}

def extract_metadata(file_path: str) -> Dict[str, Any]:
    """
    Extract metadata from an XML file.
    
    Args:
        file_path (str): Path to the XML file
        
    Returns:
        Dict[str, Any]: File metadata
    """
    try:
        # Basic file information
        metadata = {
            "filename": os.path.basename(file_path),
            "filesize": os.path.getsize(file_path),
            "last_modified": os.path.getmtime(file_path)
        }
        
        # Parse the XML file to get XML-specific metadata
        try:
            tree = ET.parse(file_path)
            root = tree.getroot()
            
            # Extract XML declaration if available (lxml only)
            if LXML_AVAILABLE:
                if hasattr(tree, 'docinfo'):
                    metadata["xml_version"] = tree.docinfo.xml_version
                    if tree.docinfo.encoding:
                        metadata["encoding"] = tree.docinfo.encoding
                    if tree.docinfo.standalone is not None:
                        metadata["standalone"] = tree.docinfo.standalone
            
            # Root element information
            metadata["root_tag"] = root.tag
            
            # Namespaces (lxml has better namespace support)
            if LXML_AVAILABLE and hasattr(root, 'nsmap'):
                metadata["namespaces"] = root.nsmap
            
            # Try to find common metadata elements
            for meta_tag in ['title', 'author', 'description', 'date', 'creator']:
                elements = root.findall(f".//{meta_tag}") or root.findall(f".//*[contains(local-name(), '{meta_tag.capitalize()}')]")
                if elements and elements[0].text:
                    metadata[meta_tag] = elements[0].text.strip()
        except Exception as e:
            logger.warning(f"Error extracting XML-specific metadata: {str(e)}")
        
        return metadata
    except Exception as e:
        logger.error(f"Error extracting metadata: {str(e)}")
        return {"error": f"Error extracting metadata: {str(e)}"}

def _parse_xml_internal(file_path: str) -> Dict[str, Any]:
    """
    Internal function to parse an XML file.
    
    Args:
        file_path (str): Path to the XML file
        
    Returns:
        Dict[str, Any]: Parsed content
    """
    if not LXML_AVAILABLE and not ETREE_AVAILABLE:
        return create_result_dict(error="Neither lxml nor xml.etree.ElementTree is available for XML parsing.")
    
    try:
        # Extract metadata
        metadata = extract_metadata(file_path)
        
        # Extract XML tree
        xml_data = extract_xml_tree(file_path)
        
        # If error occurred in extraction
        if isinstance(xml_data, dict) and "error" in xml_data:
            return xml_data
        
        # Extract XPath data if lxml is available
        xpath_data = extract_xpath_data(file_path)
        
        # Prepare result
        result = {
            "metadata": metadata,
            "xml_structure": xml_data
        }
        
        # Add XPath data if available
        if xpath_data and "xpath_support" in xpath_data and xpath_data["xpath_support"] is False:
            # XPath not supported or failed
            if "error" in xpath_data:
                logger.warning(f"XPath extraction failed: {xpath_data['error']}")
        else:
            result["xpath_data"] = xpath_data
        
        return result
    except Exception as e:
        return create_result_dict(error=f"Error parsing XML file: {str(e)}")

def parse_xml(file_path: str) -> Dict[str, Any]:
    """
    Parse an XML file and extract data and metadata.
    
    Args:
        file_path (str): Path to the XML file
        
    Returns:
        Dict[str, Any]: A dictionary containing:
            - metadata (Dict[str, Any]): File metadata
            - xml_structure (Dict): Hierarchical structure of the XML
            - xpath_data (Dict): Data extracted using XPath queries (if lxml is available)
            - error (str): Error message (if any)
    """
    return safe_parse(_parse_xml_internal, file_path)

# Example usage
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python xml_parser.py <xml_file_path>")
        sys.exit(1)
        
    file_path = sys.argv[1]
    result = parse_xml(file_path)
    
    if "error" in result:
        print(f"Error: {result['error']}")
    else:
        print(f"File: {result['metadata']['filename']}")
        
        if "xml_version" in result["metadata"]:
            print(f"XML Version: {result['metadata']['xml_version']}")
        
        if "root_tag" in result["metadata"]:
            print(f"Root element: {result['metadata']['root_tag']}")
            
        if "namespaces" in result["metadata"]:
            print("Namespaces:")
            for prefix, uri in result["metadata"]["namespaces"].items():
                print(f"  {prefix or '(default)'}: {uri}")
        
        # Print some structure info
        print("\nXML Structure Preview:")
        structure_str = json.dumps(result["xml_structure"], indent=2)
        preview_lines = structure_str.split("\n")[:20]
        print("\n".join(preview_lines))
        if len(preview_lines) >= 20:
            print("...")
            
        print(f"\nFull result saved to {file_path}.json")
        
        # Save full result to JSON file
        with open(f"{file_path}.json", "w", encoding="utf-8") as f:
            # Handle non-serializable objects
            def default_serializer(obj):
                return str(obj)
                
            json.dump(result, f, indent=2, ensure_ascii=False, default=default_serializer) 