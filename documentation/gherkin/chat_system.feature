Feature: Chat System for ESG Data Query and Report Generation
  As a user, I want to interact with an AI-powered chat interface so that I can query ESG data and generate reports dynamically.

  Scenario: Querying ESG data via chat
    Given I am on the chat interface within the dashboard
    When I type a query regarding ESG metrics or specific ESG data points
    Then the system should return a contextually relevant response using RAG technology

  Scenario: Building a custom report via chat
    Given I am interacting with the chat system
    When I request the generation of a custom ESG report
    Then the system should compile data from multiple sources and generate a structured report
    And I should be able to request modifications to the report through further chat inputs