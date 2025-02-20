Feature: Data Ingestion
  As a user, I want to upload various document types with ESG metadata tagging so that my documents are searchable and ready for processing.

  Scenario: Uploading a multi-format document
    Given I am logged in as a valid user
    When I navigate to the "Upload" interface on the dashboard
    And I select a file in PDF, Excel, CSV, DOCX, or XML format
    And I click the "Upload" button
    Then the file should be securely stored in the system
    And the system should tag the file with relevant ESG metadata

  Scenario: Processing structured and unstructured data
    Given I have uploaded multiple documents in different formats
    When the system processes the files
    Then it should use a dual pipeline to handle both structured and unstructured data
    And each document should be enriched with ESG metadata for enhanced search and reporting
