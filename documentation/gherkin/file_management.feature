Feature: File Management
  As a user, I want to organize my uploaded files by project and apply tagging so that I can quickly find and manage documents.

  Scenario: Organizing files into a project folder
    Given I have uploaded several documents
    When I create a new folder named "Project Alpha"
    And I assign selected documents to the "Project Alpha" folder
    Then those documents should appear under the "Project Alpha" folder in the document browser

  Scenario: Applying automatic and manual tagging
    Given a document is uploaded and processed
    When the system automatically assigns ESG metadata tags
    Then I should be able to view these tags
    And I should also be able to manually add or modify tags for the document

  Scenario: Previewing a document from the file browser
    Given I am on the file management dashboard with a list of "Available Documents"
    When I click on a document
    Then I should see a detailed preview of the document content along with its metadata and tags
