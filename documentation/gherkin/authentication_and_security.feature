Feature: Authentication and Security
  As a user of the ESG Reporting Platform
  I want secure authentication and data protection
  So that my sensitive ESG data remains private and compliant with regulations

  Background:
    Given the ESG Reporting Platform is running
    And Supabase authentication is configured with Google OAuth

  Scenario: User logs in with Google OAuth
    Given I am on the login page
    When I click on "Continue with Google"
    Then I should be redirected to Google's authentication page
    When I provide valid Google credentials
    And I grant required permissions
    Then I should be redirected back to the platform
    And I should see the dashboard page
    And my session should be maintained until I log out

  Scenario: Session persistence between visits
    Given I have previously logged in with Google OAuth
    When I visit the platform again within the session duration
    Then I should be automatically authenticated
    And I should be taken directly to the dashboard page

  Scenario: User logs out
    Given I am logged in to the platform
    When I click the "Sign Out" button
    Then I should be logged out of the application
    And I should be redirected to the login page
    And my session should be invalidated

  Scenario: Protected routes require authentication
    Given I am not logged in to the platform
    When I try to access the dashboard page directly
    Then I should be redirected to the login page
    And I should see a login form

  Scenario: User can only access their organization's ESG data
    Given I am logged in as a user from "Organization A"
    When I access the ESG data page
    Then I should only see data related to "Organization A"
    And I should not see any data from "Organization B"

  Scenario: User with admin role can access administrative functions
    Given I am logged in as a user with "admin" role
    When I access the platform
    Then I should see the admin dashboard options
    And I should be able to access user management features

  Scenario: GDPR Compliance - Minimal data collection
    Given I am on the login page
    When I examine the Google OAuth consent screen
    Then it should only request essential permissions
    And it should clearly explain what data is collected and why

  Scenario: GDPR Compliance - User data access
    Given I am logged in to the platform
    When I access my profile page
    Then I should be able to view all my personal data stored in the system
    And I should be able to request data export

  Scenario: GDPR Compliance - Audit trails
    Given I am logged in as an admin
    When I access the security logs
    Then I should see a record of all authentication events
    And each record should include timestamp, user ID, and action performed
