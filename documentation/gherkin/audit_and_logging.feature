Feature: Audit & Logging
  As an administrator, I want to review detailed audit logs so that I can monitor user and system activities for compliance and troubleshooting.

  Scenario: Logging key user actions
    Given a user performs an action (upload, edit, download, etc.)
    When the action is completed
    Then the system should record the event with details such as timestamp, user ID, and action type

  Scenario: Viewing the audit log dashboard
    Given I am an administrator
    When I navigate to the Audit & Logging dashboard
    Then I should be able to filter and search logs by date, user, or event type
    And I should have an option to export the log data for further analysis
