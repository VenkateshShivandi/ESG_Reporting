import fitz
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import os
from PIL import Image
import io
from PIL import ImageFilter
import logging
import sys
import pytesseract
import cv2
from skimage import measure
from sklearn.cluster import KMeans
from typing import List, Dict, Any, Tuple

# ANSI color codes
class Colors:
    RESET = "\033[0m"
    RED = "\033[91m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    PURPLE = "\033[95m"
    CYAN = "\033[96m"

# Custom formatter with colors
class ColoredFormatter(logging.Formatter):
    FORMATS = {
        logging.DEBUG: Colors.BLUE + "%(asctime)s - %(levelname)s - %(message)s" + Colors.RESET,
        logging.INFO: Colors.GREEN + "%(asctime)s - %(levelname)s - %(message)s" + Colors.RESET,
        logging.WARNING: Colors.YELLOW + "%(asctime)s - %(levelname)s - %(message)s" + Colors.RESET,
        logging.ERROR: Colors.RED + "%(asctime)s - %(levelname)s - %(message)s" + Colors.RESET,
        logging.CRITICAL: Colors.PURPLE + "%(asctime)s - %(levelname)s - %(message)s" + Colors.RESET
    }

    def format(self, record):
        log_fmt = self.FORMATS.get(record.levelno)
        formatter = logging.Formatter(log_fmt)
        return formatter.format(record)

# Configure logging with colored output
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Clear any existing handlers
for handler in logger.handlers[:]:
    logger.removeHandler(handler)

# Add console handler with colored formatter
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setFormatter(ColoredFormatter())
logger.addHandler(console_handler)

def extract_images(pdf_path: str) -> List[Dict[str, Any]]:
    """Extract images from PDF with metadata"""
    logger.info(f"🔍 Starting PDF image extraction from: {pdf_path}")
    
    try:
        doc = fitz.open(pdf_path)
        logger.info(f"✅ Successfully opened PDF: {pdf_path}")
    except Exception as e:
        logger.error(f"❌ Failed to open PDF: {e}")
        return []
    
    logger.info(f"Processing {doc.page_count} pages for image extraction...")
    images = []
        
    for page_num in range(len(doc)):
        page = doc[page_num]
        image_list = page.get_images()
                
        for img_idx, img in enumerate(image_list):
            try:
                xref = img[0]
                base_image = doc.extract_image(xref)
                
                if base_image:
                    image_data = {
                        'data': base_image["image"],
                        'format': base_image["ext"],
                        'page': page_num + 1,
                        'index': img_idx
                    }
                    images.append(image_data)
            except Exception as e:
                logger.warning(f"⚠️ Failed to extract image {img_idx} from page {page_num + 1}: {e}")
                continue
        
    logger.info(f"✅ Successfully extracted {len(images)} images")
    return images

def process_image(image_data):
    try:
        img = Image.open(io.BytesIO(image_data))
        processed = img.crop((0, 0, 500, 500)).filter(ImageFilter.SHARPEN)
        logger.info(f"✅ Successfully processed image")
        return processed
    except Exception as e:
        logger.error(f"❌ Image processing failed: {str(e)}")
        return None

def save_image(image, output_path):
    try:
        image.save(output_path)
        logger.info(f"✅ Saved image to {output_path}")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to save image to {output_path}: {str(e)}")
        return False

class ImageAnalyzer:
    @staticmethod
    def _analyze_text_density(np_img):
        """Analyze text content density in the image"""
        try:
            # Convert to grayscale
            if len(np_img.shape) == 3:
                gray = cv2.cvtColor(np_img, cv2.COLOR_BGR2GRAY)
            else:
                gray = np_img

            # Apply adaptive thresholding to better identify text
            binary = cv2.adaptiveThreshold(
                gray, 
                255, 
                cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                cv2.THRESH_BINARY_INV, 
                11, 
                2
            )

            # Calculate text density
            text_pixels = np.sum(binary == 255)  # White pixels are text in binary_inv
            total_pixels = binary.size
            text_percentage = text_pixels / total_pixels

            # Analyze text distribution in regions
            h, w = binary.shape
            regions = {
                'top': np.sum(binary[:h//4, :] == 255) / (h * w // 4),
                'middle': np.sum(binary[h//4:3*h//4, :] == 255) / (h * w // 2),
                'bottom': np.sum(binary[3*h//4:, :] == 255) / (h * w // 4)
            }

            return {
                "text_percentage": text_percentage,
                "regions": regions,
                "is_mostly_empty": text_percentage < 0.01  # 1% text threshold
            }
        except Exception as e:
            logger.debug(f"⚠️ Text density analysis error: {str(e)}")
            return None

    @staticmethod
    def analyze_content_value(image_data: bytes) -> Dict[str, Any]:
        """Analyze image content for business value"""
        # Convert bytes to numpy array
        image_array = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
        
        if img is None:
            return {'error': 'Failed to decode image'}
        
        analysis = {
            'dimensions': img.shape[:2],
            'text_density': ImageAnalyzer._analyze_text_density(img),
            'visual_complexity': ImageAnalyzer._analyze_visual_complexity(img)
            }
        
        return analysis

    @staticmethod
    def _analyze_visual_complexity(img: np.ndarray) -> Dict[str, float]:
        """Analyze visual complexity of image"""
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Calculate edge density using Canny edge detection
        edges = cv2.Canny(gray, 100, 200)
        edge_density = np.sum(edges == 255) / edges.size
        
        # Calculate color variance
        color_variance = np.var(img)
            
        return {
            'edge_density': edge_density,
            'color_variance': float(color_variance),
            'is_complex': edge_density > 0.1 or color_variance > 1000
        }

    @staticmethod
    def determine_usefulness(analysis: Dict[str, Any]) -> str:
        """Determine image usefulness based on analysis"""
        if 'error' in analysis:
            return 'low'
            
        text_density = analysis.get('text_density', {}).get('text_percentage', 0)
        complexity = analysis.get('visual_complexity', {})
        edge_density = complexity.get('edge_density', 0)
        color_variance = complexity.get('color_variance', 0)
        
        if text_density > 20 or edge_density > 0.15:
            return 'high'
        elif text_density > 10 or edge_density > 0.1:
            return 'medium'
        else:
            return 'low'

def save_images(images: List[Dict[str, Any]], output_dir: str = "extracted_images") -> None:
    """Save extracted images to disk"""
    os.makedirs(output_dir, exist_ok=True)
    
    for idx, img in enumerate(images):
        try:
            output_path = os.path.join(output_dir, f"image_{img['page']}_{idx}.{img['format']}")
            with open(output_path, 'wb') as f:
                f.write(img['data'])
        except Exception as e:
            logger.error(f"❌ Failed to save image {idx}: {e}")

# Main execution
try:
    if len(sys.argv) != 2:
        print("Usage: python image_simplified.py <path_to_pdf>")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    images = extract_images(pdf_path)
    save_images(images)
except Exception as e:
    logger.error(f"❌ An unexpected error occurred: {str(e)}")


