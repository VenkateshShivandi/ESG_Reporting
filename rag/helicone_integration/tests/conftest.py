import sys
import os
from pathlib import Path

# Get project root directory
root_dir = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(root_dir)) 