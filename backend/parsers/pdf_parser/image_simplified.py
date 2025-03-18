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

pdf_path = "./test_files/test.pdf"



def extract_images(pdf_path):
    try:
        doc = fitz.open(pdf_path)
        image_list = []
        
        logger.info(f"✅ Successfully opened PDF: {pdf_path}")
        logger.info(f"Processing {len(doc)} pages for image extraction...")
        
        for page_num in range(len(doc)):
            try:
                page = doc.load_page(page_num)
                image_items = page.get_images(full=True)
                
                if image_items:
                    logger.info(f"✅ Found {len(image_items)} images on page {page_num+1}")
                else:
                    logger.warning(f"⚠️ No images found on page {page_num+1}")
                
                for img_index, img in enumerate(image_items):
                    try:
                        xref = img[0]
                        base_image = doc.extract_image(xref)
                        image_data = base_image["image"]
                        image_list.append({
                            "page": page_num+1,
                            "index": img_index,
                            "data": image_data,
                            "format": base_image["ext"]
                        })
                        logger.debug(f"✅ Extracted image {img_index+1} from page {page_num+1}")
                    except Exception as e:
                        logger.error(f"❌ Failed to extract image {img_index} on page {page_num+1}: {str(e)}")
            except Exception as e:
                logger.error(f"❌ Error processing page {page_num+1}: {str(e)}")
        
        logger.info(f"✅ Extraction complete. Total images found: {len(image_list)}")
        return image_list
    except Exception as e:
        logger.error(f"❌ Failed to process PDF {pdf_path}: {str(e)}")
        return []

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
    def analyze_content_value(image_data):
        """Assess image usefulness with focus on text content"""
        try:
            img = Image.open(io.BytesIO(image_data))
            np_img = np.array(img)
            
            # Calculate text density first
            text_analysis = ImageAnalyzer._analyze_text_density(np_img)
            
            # If almost no text content, might be decorative or blank
            if text_analysis and text_analysis['is_mostly_empty']:
                logger.warning(f"⚠️ Image has very little text content ({text_analysis['text_percentage']:.1%})")
                return {
                    "text_density": text_analysis,
                    "usefulness_score": 0.1
                }

            return {
                "text_density": text_analysis,
                "ocr_content": ImageAnalyzer._analyze_text_content(np_img),
                "edge_density": ImageAnalyzer._calculate_edge_density(np_img)
            }
        except Exception as e:
            logger.error(f"❌ Content analysis failed: {str(e)}")
            return None

    @staticmethod
    def _analyze_text_content(np_img):
        """Evaluate text presence and quality using OCR"""
        try:
            # Convert to grayscale for OCR
            gray = cv2.cvtColor(np_img, cv2.COLOR_BGR2GRAY)
            text = pytesseract.image_to_string(gray)
            
            # Calculate text metrics
            word_count = len(text.split())
            line_count = len(text.split('\n'))
            
            return {
                "word_count": word_count,
                "line_count": line_count,
                "readability_score": min(word_count / 50, 1.0)  # Normalized 0-1
            }
        except Exception as e:
            logger.debug(f"⚠️ Text analysis error: {str(e)}")
            return None

    @staticmethod
    def _analyze_graphical_content(np_img):
        """Detect charts/diagrams using edge detection"""
        try:
            edges = cv2.Canny(np_img, 100, 200)
            edge_pixels = np.sum(edges > 0)
            total_pixels = edges.size
            return edge_pixels / total_pixels  # Edge density ratio
        except Exception as e:
            logger.debug(f"⚠️ Graphical analysis error: {str(e)}")
            return None

    @staticmethod
    def _calculate_edge_density(np_img):
        """Calculate edge presence using Sobel operator"""
        try:
            gray = cv2.cvtColor(np_img, cv2.COLOR_BGR2GRAY)
            sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=5)
            sobely = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=5)
            edge_mag = np.sqrt(sobelx**2 + sobely**2)
            return np.mean(edge_mag)  # Higher = more edges
        except Exception as e:
            logger.debug(f"⚠️ Edge analysis error: {str(e)}")
            return None

    @staticmethod
    def determine_usefulness(analysis):
        """Classify image based on text content and other metrics"""
        if not analysis:
            return "low"

        # Get text density metrics
        text_density = analysis.get('text_density', {})
        text_percentage = text_density.get('text_percentage', 0)
        
        # Check if image is mostly empty
        if text_density.get('is_mostly_empty', True):
            return "low"

        # Get OCR confidence and word count
        ocr_data = analysis.get('ocr_content', {})
        word_count = ocr_data.get('word_count', 0) if ocr_data else 0
        
        # Calculate score based primarily on text metrics
        text_score = min(text_percentage * 5, 1.0)  # Normalize text density
        word_score = min(word_count / 50, 1.0)      # Normalize word count
        
        # Weighted score calculation
        total_score = (
            text_score * 0.6 +           # Text density weight
            word_score * 0.4             # Word count weight
        )

        # Log detailed scoring
        logger.debug(f"""
        Text Content Scoring:
        - Text Density Score: {text_score:.2f} ({text_percentage:.1%} text)
        - Word Count Score: {word_score:.2f} ({word_count} words)
        - Total Score: {total_score:.2f}
        """)

        # Classify based on total score
        if total_score > 0.7:
            return "high"
        elif total_score > 0.3:
            return "medium"
        else:
            return "low"

def save_images(image_list, output_dir):
    if not os.path.exists(output_dir):
        try:
            os.makedirs(output_dir)
            logger.info(f"✅ Created output directory: {output_dir}")
        except Exception as e:
            logger.error(f"❌ Failed to create output directory {output_dir}: {str(e)}")
            return False, False
    
    success_count = 0
    error_count = 0
    high_value = 0
    medium_value = 0
    low_value = 0
    
    for image in image_list:
        try:
            # Analyze image content
            analysis = ImageAnalyzer.analyze_content_value(image['data'])
            
            # Get text percentage
            text_percentage = analysis.get('text_density', {}).get('text_percentage', 0)
            text_percent_display = f"{text_percentage*100:.0f}"
            
            usefulness = ImageAnalyzer.determine_usefulness(analysis)
            
            # Log with text percentage
            if usefulness == "high":
                high_value += 1
                logger.info(f"💎 High-value image on page {image['page']} (text content: {text_percent_display}%)")
            elif usefulness == "medium":
                medium_value += 1
                logger.info(f"🔍 Medium-value image on page {image['page']} (text content: {text_percent_display}%)")
            else:
                low_value += 1
                logger.warning(f"⚠️ Low-value image skipped on page {image['page']} (text content: {text_percent_display}%)")
                continue
            
            # Save medium and high value images
            if usefulness in ["high", "medium"]:
                output_path = os.path.join(
                    output_dir, 
                    f"page_{image['page']}_index_{image['index']}_{usefulness}_value_{text_percent_display}pct_text.{image['format']}"
                )
                img = Image.open(io.BytesIO(image['data']))
                save_image(img, output_path)
                success_count += 1
                
        except Exception as e:
            logger.error(f"❌ Failed to process image from page {image['page']}, index {image['index']}: {str(e)}")
            error_count += 1
    
    # Print summary statistics
    logger.info(f"\n📊 Content Value Summary:")
    logger.info(f"  💎 High-value images: {high_value}")
    logger.info(f"  🔍 Medium-value images: {medium_value}")
    logger.info(f"  ⚠️ Low-value images (skipped): {low_value}")
    logger.info(f"  ✅ Successfully saved: {success_count} images")
    if error_count > 0:
        logger.warning(f"  ❌ Failed to save: {error_count} images")
    
    return success_count, error_count

# Main execution
try:
    logger.info(f"🔍 Starting PDF image extraction from: {pdf_path}")
    image_list = extract_images(pdf_path)
    
    if image_list:
        logger.info(f"💾 Saving {len(image_list)} extracted images to output directory")
        success, errors = save_images(image_list, "./output_images")
        
        # Final summary
        if errors == 0:
            logger.info(f"✅ Process completed successfully. Extracted and saved {success} images.")
        else:
            logger.warning(f"⚠️ Process completed with issues. Saved {success} images, encountered {errors} errors.")
    else:
        logger.warning("⚠️ No images were extracted from the PDF")
except Exception as e:
    logger.error(f"❌ An unexpected error occurred: {str(e)}")


