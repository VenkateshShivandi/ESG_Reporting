import os
import sys
from pathlib import Path

# Print current directory
print(f"Current directory: {os.getcwd()}")

# Print file path
print(f"This file path: {Path(__file__).resolve()}")

# Setup path to allow importing from project root
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
print(f"Project root: {PROJECT_ROOT}")
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

print(f"sys.path: {sys.path}")

try:
    # Try different import combinations
    print("Trying import: from parsers.pdf_parser.transformation import enrich_chunks_with_metadata")
    from parsers.pdf_parser.transformation import enrich_chunks_with_metadata
    print("Import successful!")
except ImportError as e:
    print(f"Import failed: {e}")

try:
    print("\nTrying import: from backend.parsers.pdf_parser.transformation import enrich_chunks_with_metadata")
    from backend.parsers.pdf_parser.transformation import enrich_chunks_with_metadata
    print("Import successful!")
except ImportError as e:
    print(f"Import failed: {e}")

# List directories in project root
print(f"\nDirectories in {PROJECT_ROOT}:")
for item in PROJECT_ROOT.iterdir():
    if item.is_dir():
        print(f"  {item.name}")

# Check if parsers directory exists
parsers_dir = PROJECT_ROOT / "parsers"
print(f"\nDoes {parsers_dir} exist? {parsers_dir.exists()}")
if parsers_dir.exists():
    print(f"Contents of {parsers_dir}:")
    for item in parsers_dir.iterdir():
        print(f"  {item.name}")

# Check if pdf_parser directory exists
pdf_parser_dir = parsers_dir / "pdf_parser"
print(f"\nDoes {pdf_parser_dir} exist? {pdf_parser_dir.exists()}")
if pdf_parser_dir.exists():
    print(f"Contents of {pdf_parser_dir}:")
    for item in pdf_parser_dir.iterdir():
        print(f"  {item.name}")

# Try direct import from module file
try:
    print("\nTrying direct import using module path")
    sys.path.append(str(parsers_dir))
    from pdf_parser.transformation import enrich_chunks_with_metadata
    print("Direct import successful!")
except ImportError as e:
    print(f"Direct import failed: {e}") 