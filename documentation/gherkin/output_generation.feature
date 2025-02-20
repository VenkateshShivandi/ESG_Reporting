Feature: Output Generation
  As a user, I want to export my ESG reports in PDF and Excel formats so that I can share or archive the reports offline.

  Scenario: Exporting a report as PDF
    Given I have generated a custom ESG report
    When I select the option to export the report as PDF
    Then the system should generate a PDF using WeasyPrint and provide it for download

  Scenario: Exporting a report as Excel
    Given I have generated a custom ESG report
    When I select the option to export the report as Excel
    Then the system should generate an Excel file using Pandas and openpyxl and provide it for download
