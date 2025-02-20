Feature: Authentication & Security
  As a user, I want to securely log in using Google OAuth and have my data protected with row-level security so that my ESG information remains confidential and accessible only to authorized users.

  Scenario: Logging in with Google OAuth
    Given I am a new or returning user
    When I select the option to log in with Google OAuth
    Then I should be authenticated and redirected to the dashboard securely

  Scenario: Restricting data access with row-level security
    Given I am an authenticated user with a specific role
    When I access ESG data in the dashboard
    Then the system should enforce row-level security policies that restrict data access based on my role and permissions
