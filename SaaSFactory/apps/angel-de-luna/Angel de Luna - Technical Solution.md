# **Angel de Luna \- Technical Solution**

# **Solution Proposal: Project**

# **Summary**

---

We present an AI solution proposal developed for Dr. Ángel E. de Luna, focused on improving the interpretation of Talents and Intelligences, and Personalities test results through an automated online consultation system. This AI agent is designed to guide users in interpreting their results, offer personalized vocational advice, and provide detailed reports.

Note: This proposal includes a version with the main functionalities detailed below, allowing for the possibility of future adaptations according to the client's needs.

# **👥 Stakeholders**

---

1. Chat-Based Consultation Interface

| Gaman Contact | Jorge Domenzain, Project Director |
| ----- | ----- |
| Client Contact | Dr. Ángel E. de Luna |
| **Client Informed** | At the client's request |

# **🎯 Goals and objectives**

---

1. Interpretation of Test Results

### **Expected delivery date:**

January 15, 2025

### **Objectives**

* **Consultation Automation:** Implement an AI agent that acts as Dr. Ángel E. de Luna, guiding users in interpreting their test results automatically and in a personalized manner.  
* **Advanced Results Interpretation:** Develop a system that analyzes test results and provides detailed feedback, including explanations about talents, intelligences, and personality.  
* **Dynamic Interaction:** Create a system of guided questions and contextual answers to delve deeper into test results, allowing for a more enriching user experience.  
* **Generation of Personalized Reports:** Implement the generation and delivery of final reports in PDF format that summarize the consultation, including personalized insights and recommendations.  
* **Comprehensive User Experience:** Design a complete consultation process, from uploading results to completing the session, that offers a smooth and valuable experience for the user.

# **🛠️ Development Features**

---

### **Version 1 Features**

* **User Authentication:** Implement a user authentication system that integrates with the client's existing credentials database, ensuring accurate and secure verification of user identities within our application.  
* **Intelligent Consultation Interface:** The AI agent will act as Dr. Ángel E. de Luna, providing personalized interpretations of test results.  
* **Results Upload and Access System:** Users will be able to upload their test results in the chat interface.  
* **Analysis and Interpretation Engine:** Implementation of a function to analyze test results and provide detailed insights on talents, intelligences, and personality.  
* **Dynamic Questions and Answers Module:** System capable of generating and responding to specific questions based on user results, allowing for a deep exploration of insights.  
* **Advanced Report Generator:** Automatic creation of downloadable PDF reports that summarize the consultation, including data visualizations and personalized recommendations.

[User Stories in Gherkin Syntax for Development Features](https://www.notion.so/User-Stories-in-Gherkin-Syntax-for-Development-Features-240056aeaed1404d97e2c740bfe9e8ae?pvs=21)

# **⚙️ Our process**

---

The proposal covers the following implementation phases, ensuring a clear roadmap for the delivery of the first version:

image.png

* Maximum delivery time of 90 business days.  
* Technical support included in the monthly licensing to resolve incidents and optimize performance.  
* Monthly reviews to adjust development according to client needs and collected usage data.  
* Testing phase with a select group of users to refine the experience before full launch.

# **🚀 Next Steps and Agreement**

---

\*\*Review and Approval:\*\*Review this proposal and approve the agreement for prototype development.

1. **Review and Approval**: Review this proposal and approve the agreement for the beta version.  
2. **Technical Setup**: Our team will collaborate with the client contact to complete the Client Configuration Template and assist with the implementation of the AI agent in their communication channels, including the integration of the knowledge base and brand customization.  
3. **Feedback Loop**: As the project progresses, we will schedule regular reviews to gather your comments and adjust feature development priorities.  
4. **Planned Features**: If desired, we will review and finalize the planned features for future versions.

**User Stories in Gherkin Syntax for Development Features**

## **Feature: User Authentication**

Scenario: User logs in successfully  
  Given the user is on the login page  
  When they enter valid credentials  
  And click the login button  
  Then they should be redirected to the dashboard

Scenario: User attempts to log in with invalid credentials  
  Given the user is on the login page  
  When they enter invalid credentials  
  And click the login button  
  Then they should see an error message  
  And remain on the login page

## **Feature: Display Welcome Video**

Feature: Display Welcome Video  
  As a user  
  I want to see a welcome video immediately after logging in  
  So that I can understand the purpose and process of the consultation experience

Scenario: User logs into the application  
  Given the user has successfully logged into the application  
  When the login process is complete  
  Then the welcome video should automatically play  
  And the user should have the option to skip the video if they choose

## **Feature: Results Upload and Access System**

Scenario: User uploads test results manually  
  Given the user is on the results upload page  
  When they select and upload their test result files  
  Then the system should process and store the results  
  And confirm successful upload to the user

Scenario: System automatically retrieves user's test results  
  Given the user has authorized access to their test results  
  When they initiate the consultation process  
  Then the system should automatically fetch their latest test results  
  And use them for the consultation

## **Feature: Intelligent Consultation Interface**

Scenario: AI agent provides personalized interpretation  
  Given the user has uploaded their test results  
  When the AI agent analyzes the results  
  Then it should provide a summary of top 5 talents, top 3 intelligences, and 3 primary personality types

Scenario: AI agent adjusts communication style based on user profile  
  Given the user's age and personality traits are known  
  When the AI agent interacts with the user  
  Then it should adapt its tone to be appropriate for the user's profile

## **Feature: Analysis and Interpretation Engine**

Scenario: System analyzes user's test results  
  Given the user's test results are available in the system  
  When the analysis process is initiated  
  Then the system should generate detailed insights on talents, intelligences, and personality  
  And prepare this information for the AI agent to use

Scenario: System provides career recommendations  
  Given the system has analyzed the user's test results  
  When generating career recommendations  
  Then it should suggest careers that align with the user's top talents and intelligences

## **Feature: Dynamic Questions and Answers Module**

Scenario: AI agent asks guided questions  
  Given the consultation is in progress  
  When the AI agent identifies an area to explore further  
  Then it should ask relevant questions to gather more information from the user

Scenario: User asks open-ended questions  
  Given the user is in a consultation session  
  When they ask a question about their results  
  Then the AI agent should provide a tailored answer based on their specific test results

## **Feature: Advanced Report Generator**

Scenario: System generates personalized PDF report  
  Given the consultation session has ended  
  When the report generation is triggered  
  Then the system should create a PDF report summarizing key insights, career options, and recommendations  
  And make this report available for the user to download

Scenario: Report includes follow-up recommendations  
  Given the system has generated a personalized report  
  When the user views the report  
  Then it should include suggestions for further exploration and development activities

## **Feature: Display Closing Video**

Feature: Display Closing Video  
  As a user  
  I want to see a button to view the closing video after downloading my report  
  So that I can conclude my vocational consultation with an emotional and insightful message

Scenario: User downloads their report  
  Given the user has completed their vocational consultation  
  And the report is available for download  
  When the user clicks the "Download Report" button  
  Then a button labeled "View Closing Video" should appear  
  And the user should be able to click it to play the closing video  
  And the video should be prominently displayed to encourage viewing

## **Feature: Capture Device Usage Data**

Feature: Capture Device Usage Data As a system administrator I want to include a survey question about the device used for the experience So that I can gather insights on user interaction with the platform Scenario: User completes the consultation experience Given the user has completed the consultation experience And they are directed to the exit survey When the survey loads Then the user should see a question asking, "Did you complete the experience on a computer or mobile device?" And the user should be able to select either "Computer" or "Mobile Device" And their response should be recorded for analytics