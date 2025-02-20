Feature: Dashboard User Interface
  As a user, I want an interactive dashboard with ESG metrics, file management, and report-building tools
  so that I can efficiently analyze, manage, and generate custom ESG reports.

  Scenario: Viewing ESG metrics and interactive charts
    Given I have logged in and navigated to the dashboard
    When the system retrieves my processed ESG data
    Then I should see interactive charts displaying key ESG metrics and trends
    And the charts should allow drill-down for more detailed analysis

  Scenario: Managing documents via the dashboard
    Given I have uploaded multiple documents organized into project folders
    When I view the dashboard
    Then I should see a sidebar labeled "Available Documents" listing my documents grouped by project or folder
    And each folder should display a "+ Custom Document" button for new uploads
    And when I click on a document in the sidebar
    Then the main content area should display the document details including:
      | Section                     | Description                                                   |
      | Non-Functional Requirements | Performance, security, usability, and reliability aspects     |
      | Constraints & Assumptions   | Dependencies, third-party data, and assumptions               |
      | Known Issues                | Data privacy concerns, AI limitations, and system scalability |
    And I should see action buttons to copy, download the document, or download all documents in the project

  Scenario: Generating and modifying ESG reports through chat
    Given I am using the dashboard's integrated chat interface
    When I type a query to generate an ESG report selecting one or more documents
    Then the system should process the query using RAG technology and return a structured report
    And the report should reflect baseline logic where:
      | Framework    | Document Combination Example       |
      | Framework 1  | Doc 1 + Doc 2                      |
      | Framework 2  | Doc 2 + parts of Doc 3             |
      | Framework 3  | Parts of Doc 1 + Doc 3             |
    And I should be able to request modifications via chat to regenerate parts of the report
    And any modifications should update the main content area with the new report content