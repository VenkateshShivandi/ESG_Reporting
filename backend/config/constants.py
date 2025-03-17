"""
Constants and static configurations for the ESG Reporting application.

This module contains constants that are used across the application,
including supported file types, ESG keywords, and other static values.
"""

# Supported file types and their descriptions
SUPPORTED_FILE_TYPES = {
    # Documents
    ".pdf": "PDF Document",
    ".docx": "Microsoft Word Document",
    ".doc": "Microsoft Word Document (Legacy)",
    ".rtf": "Rich Text Format",
    ".txt": "Plain Text Document",
    ".md": "Markdown Document",
    
    # Spreadsheets
    ".xlsx": "Microsoft Excel Spreadsheet",
    ".xls": "Microsoft Excel Spreadsheet (Legacy)",
    ".csv": "Comma-Separated Values",
    ".ods": "OpenDocument Spreadsheet",
    
    # Presentations
    ".pptx": "Microsoft PowerPoint Presentation",
    ".ppt": "Microsoft PowerPoint Presentation (Legacy)",
    
    # Images (for OCR)
    ".png": "PNG Image",
    ".jpg": "JPEG Image",
    ".jpeg": "JPEG Image",
    ".tiff": "TIFF Image",
    ".tif": "TIFF Image",
    
    # Other
    ".html": "HTML Document",
    ".htm": "HTML Document",
    ".xml": "XML Document",
    ".json": "JSON Document"
}

# ESG Keywords categorized by E, S, and G
ESG_KEYWORDS = {
    "Environmental": [
        "carbon", "climate", "emission", "environmental", "footprint", 
        "greenhouse", "GHG", "renewable", "sustainability", "sustainable", 
        "green", "energy", "waste", "water", "pollution", "biodiversity", 
        "conservation", "ecosystem", "recycling", "circular economy", 
        "resource efficiency", "carbon neutral", "carbon footprint", 
        "net zero", "climate change", "environmental impact", "renewable energy"
    ],
    "Social": [
        "community", "diversity", "employee", "equality", "equity", 
        "human rights", "inclusion", "labor", "safety", "social", 
        "stakeholder", "training", "wellbeing", "welfare", "work", 
        "worker", "workforce", "workplace", "health", "education", 
        "diversity and inclusion", "gender equality", "human capital", 
        "labor standards", "occupational health", "social impact", 
        "community engagement", "human rights"
    ],
    "Governance": [
        "accountability", "audit", "board", "compliance", "conflict of interest", 
        "corruption", "disclosure", "ethics", "governance", "legal", 
        "management", "policy", "regulation", "risk", "standard", 
        "transparency", "whistleblower", "anti-bribery", "anti-corruption", 
        "code of conduct", "corporate governance", "data protection", 
        "executive compensation", "fiduciary duty", "regulatory compliance", 
        "stakeholder engagement", "tax transparency"
    ]
}

# Combine all ESG keywords for convenience
ALL_ESG_KEYWORDS = set()
for category_keywords in ESG_KEYWORDS.values():
    ALL_ESG_KEYWORDS.update(category_keywords)
ALL_ESG_KEYWORDS = list(ALL_ESG_KEYWORDS)

# ESG Reporting frameworks and standards
ESG_FRAMEWORKS = {
    "GRI": "Global Reporting Initiative",
    "SASB": "Sustainability Accounting Standards Board",
    "TCFD": "Task Force on Climate-related Financial Disclosures",
    "IIRC": "International Integrated Reporting Council",
    "CDP": "Carbon Disclosure Project",
    "UN SDGs": "United Nations Sustainable Development Goals",
    "PRI": "Principles for Responsible Investment",
    "EU SFDR": "EU Sustainable Finance Disclosure Regulation",
    "EU Taxonomy": "EU Taxonomy for Sustainable Activities",
    "ISO 14001": "Environmental Management Systems",
    "ISO 26000": "Social Responsibility",
    "ISO 27001": "Information Security Management",
    "B Corp": "B Corporation Certification"
}

# HTTP Status Codes
HTTP_200_OK = 200
HTTP_201_CREATED = 201
HTTP_400_BAD_REQUEST = 400
HTTP_401_UNAUTHORIZED = 401
HTTP_403_FORBIDDEN = 403
HTTP_404_NOT_FOUND = 404
HTTP_500_INTERNAL_SERVER_ERROR = 500 