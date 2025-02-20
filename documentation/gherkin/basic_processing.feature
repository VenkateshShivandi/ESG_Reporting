Feature: Basic Processing
  As a system, I need to extract text, segment content, and generate embeddings so that ESG data is searchable and analyzable.

  Scenario: Extracting text and segmenting with ESG tags
    Given a document has been successfully uploaded
    When the system processes the document
    Then it should extract the text content and break it into searchable chunks
    And each chunk should be tagged with relevant ESG metadata

  Scenario: Generating embeddings for document content
    Given a document has been chunked and tagged
    When the system invokes the embedding generation service
    Then each chunk should have a corresponding embedding generated using OpenAI embeddings

  Scenario: Processing non-PDF documents with OCR and table extraction
    Given a non-PDF document (e.g., DOCX) is uploaded
    When the system processes the document
    Then it should use OCR (e.g., Tesseract) and table extraction tools (e.g., Camelot) where applicable
