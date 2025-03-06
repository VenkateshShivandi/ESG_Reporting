"""
Image Parser Module

This module provides functionality to parse image files (JPEG, PNG) using:
- Tesseract-OCR: OCR for text extraction
- Pillow: Image processing and manipulation

The main function is parse_image(), which extracts text and metadata
from image files and returns them in a structured format.
"""

import os
import logging
from typing import Dict, List, Any, Union, Tuple

# Import utility functions
from .utils import safe_parse, create_result_dict

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to import the required libraries
try:
    from PIL import Image, ImageEnhance, ImageFilter, ExifTags
    PILLOW_AVAILABLE = True
except ImportError:
    PILLOW_AVAILABLE = False
    logger.warning("Pillow not available. Image processing will be limited.")

try:
    import pytesseract
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    logger.warning("Tesseract-OCR not available. Text extraction from images will not work.")

def get_image_metadata(image: Image.Image, file_path: str) -> Dict[str, Any]:
    """
    Extract metadata from an image.
    
    Args:
        image (PIL.Image.Image): PIL Image object
        file_path (str): Path to the image file
        
    Returns:
        Dict[str, Any]: Metadata dictionary
    """
    metadata = {
        "filename": os.path.basename(file_path),
        "filesize": os.path.getsize(file_path),
        "format": image.format,
        "mode": image.mode,
        "width": image.width,
        "height": image.height
    }
    
    # Extract EXIF data if available
    try:
        exif_data = {}
        if hasattr(image, '_getexif') and image._getexif() is not None:
            for tag, value in image._getexif().items():
                if tag in ExifTags.TAGS:
                    tag_name = ExifTags.TAGS[tag]
                    exif_data[tag_name] = str(value)
        
        if exif_data:
            metadata["exif"] = exif_data
    except Exception as e:
        logger.warning(f"Error extracting EXIF data: {str(e)}")
    
    return metadata

def preprocess_image_for_ocr(image: Image.Image) -> Image.Image:
    """
    Preprocess an image to improve OCR results.
    
    Args:
        image (PIL.Image.Image): PIL Image object
        
    Returns:
        PIL.Image.Image: Preprocessed image
    """
    try:
        # Convert to grayscale if not already
        if image.mode != 'L':
            image = image.convert('L')
        
        # Increase contrast
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(2.0)
        
        # Apply slight blur to reduce noise
        image = image.filter(ImageFilter.GaussianBlur(radius=0.5))
        
        # Apply threshold to make text more clear
        # Convert the image to black and white based on a threshold value
        fn = lambda x: 255 if x > 128 else 0
        image = image.point(fn, mode='1')
        
        return image
    except Exception as e:
        logger.warning(f"Error preprocessing image: {str(e)}")
        return image

def extract_text_with_tesseract(image: Image.Image, preprocess: bool = True) -> str:
    """
    Extract text from an image using Tesseract OCR.
    
    Args:
        image (PIL.Image.Image): PIL Image object
        preprocess (bool): Whether to preprocess the image for better OCR results
        
    Returns:
        str: Extracted text
    """
    if not TESSERACT_AVAILABLE:
        return ""
    
    try:
        # Preprocess image if requested
        if preprocess:
            processed_image = preprocess_image_for_ocr(image)
        else:
            processed_image = image
        
        # Extract text using Tesseract
        text = pytesseract.image_to_string(processed_image)
        return text.strip()
    except Exception as e:
        logger.error(f"Error extracting text with Tesseract: {str(e)}")
        return ""

def extract_text_with_layout(image: Image.Image) -> Dict[str, Any]:
    """
    Extract text with layout information using Tesseract OCR.
    
    Args:
        image (PIL.Image.Image): PIL Image object
        
    Returns:
        Dict[str, Any]: Text with layout information
    """
    if not TESSERACT_AVAILABLE:
        return {}
    
    try:
        # Extract text with layout information
        data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
        
        # Process the data
        blocks = []
        current_block = None
        current_block_text = []
        
        for i, text in enumerate(data['text']):
            if not text.strip():
                continue
                
            # Check if this is a new block
            block_num = data['block_num'][i]
            if current_block is None or current_block != block_num:
                # Save the previous block if it exists
                if current_block is not None and current_block_text:
                    blocks.append({
                        "block_num": current_block,
                        "text": " ".join(current_block_text),
                        "confidence": sum(data['conf'][j] for j in range(len(data['text'])) 
                                         if data['block_num'][j] == current_block and data['text'][j].strip()) / 
                                    len([j for j in range(len(data['text'])) 
                                         if data['block_num'][j] == current_block and data['text'][j].strip()])
                    })
                    current_block_text = []
                    
                current_block = block_num
                
            current_block_text.append(text)
            
        # Add the last block
        if current_block is not None and current_block_text:
            blocks.append({
                "block_num": current_block,
                "text": " ".join(current_block_text),
                "confidence": sum(data['conf'][j] for j in range(len(data['text'])) 
                                 if data['block_num'][j] == current_block and data['text'][j].strip()) / 
                            len([j for j in range(len(data['text'])) 
                                 if data['block_num'][j] == current_block and data['text'][j].strip()])
            })
            
        return {
            "blocks": blocks,
            "full_data": data
        }
    except Exception as e:
        logger.error(f"Error extracting text with layout: {str(e)}")
        return {}

def _parse_image_internal(file_path: str) -> Dict[str, Any]:
    """
    Internal function to parse an image file.
    
    Args:
        file_path (str): Path to the image file
        
    Returns:
        Dict[str, Any]: Parsed content
    """
    if not PILLOW_AVAILABLE:
        return create_result_dict(error="Pillow is not available for image processing.")
    
    try:
        # Open the image
        image = Image.open(file_path)
        
        # Extract metadata
        metadata = get_image_metadata(image, file_path)
        
        # Extract text
        text = ""
        layout = {}
        
        if TESSERACT_AVAILABLE:
            # First try with preprocessing
            text = extract_text_with_tesseract(image, preprocess=True)
            
            # If no text found, try without preprocessing
            if not text:
                text = extract_text_with_tesseract(image, preprocess=False)
                
            # Extract text with layout information
            layout = extract_text_with_layout(image)
        else:
            return create_result_dict(
                content_type="metadata",
                content=metadata,
                error="Tesseract-OCR is not available for text extraction."
            )
        
        # Prepare result
        result = {
            "metadata": metadata,
            "text": text
        }
        
        if layout and "blocks" in layout:
            result["text_blocks"] = layout["blocks"]
            
        return result
    except Exception as e:
        return create_result_dict(error=f"Error parsing image file: {str(e)}")

def parse_image(file_path: str) -> Dict[str, Any]:
    """
    Parse an image file and extract text and metadata.
    
    Args:
        file_path (str): Path to the image file
        
    Returns:
        Dict[str, Any]: A dictionary containing:
            - metadata (Dict[str, Any]): File metadata
            - text (str): Extracted text (if Tesseract-OCR is available)
            - text_blocks (List[Dict]): Text with layout information (if available)
            - error (str): Error message (if any)
    """
    return safe_parse(_parse_image_internal, file_path)

# Example usage
if __name__ == "__main__":
    import sys
    import json
    
    if len(sys.argv) < 2:
        print("Usage: python image_parser.py <image_file_path>")
        sys.exit(1)
        
    file_path = sys.argv[1]
    result = parse_image(file_path)
    
    if "error" in result:
        print(f"Error: {result['error']}")
    else:
        print(f"Image: {result['metadata']['filename']}")
        print(f"Dimensions: {result['metadata']['width']}x{result['metadata']['height']}")
        print(f"Format: {result['metadata']['format']}")
        
        if "text" in result and result["text"]:
            print(f"Extracted text (excerpt): {result['text'][:300]}...")
        else:
            print("No text extracted.")
            
        if "text_blocks" in result:
            print(f"Text blocks found: {len(result['text_blocks'])}")
            
        print(f"Full result saved to {file_path}.json")
        
        # Save full result to JSON file
        with open(f"{file_path}.json", "w") as f:
            json.dump(result, f, indent=2) 