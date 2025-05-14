## General Description

- **Purpose & Objectives**
    
    This application is an AI-powered ESG data management and analytics system designed to streamline the reporting and analysis of sustainability data. Its primary objective is to help ESG managers, analysts, decision-makers, and viewers efficiently upload, process, analyze, and report on ESG data.
    
- **Key Benefits**
    - Automated data extraction with ESG metadata tagging
    - Context-aware query responses using retrieval-augmented generation (RAG)
    - Secure user authentication via Google OAuth managed by Supabase Auth with row-level security
    - Interactive dashboard visualization and comprehensive reporting features
    - Scalable and GDPR-compliant platform

---

## User Registration

- **Access, Authentication, and Credential Management**
New users are greeted with a clean login page and can sign in using **Google OAuth**. The authentication is managed securely by **Supabase Auth**, ensuring that only authorized users gain access. Row-level security (RLS) further protects sensitive ESG data.

```mermaid
sequenceDiagram
  User->>IT_System: Request Access Credentials
  IT_System-->>User: Send Credentials
  User->>Login_System: Submit Credentials
  Login_System-->>User: Access Granted

```

---

## File Upload and Data Ingestion

- **File Upload Process**
    - Users upload ESG reporting files (PDF, Excel, CSV, DOCX) through the dashboard interface.
    - Files are securely stored in **Supabase Storage**.
- **System Interaction**
    
    The file upload triggers a notification that initiates the data processing pipeline.
    

```mermaid
flowchart TD
  A[User Uploads File] --> B[Supabase Storage]
  B --> C[Trigger Data Processing Pipeline]

```

---

## Data Processing and Storage

- **Processing Workflow**
    - **Text and Table Extraction:**
    Utilizes tools such as **PyPDF2** and **Tesseract OCR** for text extraction, and **Camelot** for table parsing.
    - **Data Chunking & ESG Tagging:**
    Extracted text is segmented into chunks and enhanced with ESG metadata tags.
    - **Embedding Generation:**
    OpenAI is used to generate embeddings for the processed data chunks.
- **Storage**
    
    Processed data is stored in two tables:
    
    - **esg_metrics:** Core ESG data
    - **esg_chunks:** Detailed data pieces

```mermaid
sequenceDiagram
    User->>Dashboard: Upload File
    Dashboard->>Supabase: Store File
    Supabase-->>Processor: Notify File Upload Complete
    Processor->>Extraction: Extract Text & Tables
    Extraction-->>Processor: Return Extracted Data
    Processor->>Embeddings: Generate Embeddings (OpenAI)
    Embeddings-->>Processor: Return Embedding Results
    Processor->>Database: Store in esg_metrics & esg_chunks

```

---

## Main Dashboard or Home Page

After signing in, users are directed to the **main dashboard**, which serves as the central hub for the application. The dashboard includes:

- A **left-hand sidebar** with navigation options for file uploads, data visualizations, and chatbot interactions.
- A **main content area** displaying dynamic charts and ESG metrics derived from uploaded documents.

This overview provides immediate insights into sustainability data trends and allows users to easily navigate to specific workflows, such as file processing, report generation, or chatbot queries.

```mermaid
flowchart LR
  A[User logs in] --> B[Main Dashboard]
  B --> C[Left-hand Sidebar: File Upload, Data Visualizations, Chatbot]
  B --> D[Main Content Area: Dynamic Charts & ESG Metrics]

```

---

## Dashboard and Analytics

- **Dashboard Overview**
The enriched data appears on the dashboard after processing. The dashboard is built using **Next.js**, **React**, and **Recharts**. Data is securely fetched from the database via the **Supabase API** and updated in real time.

```mermaid
flowchart LR
    A[("Database")] -->|"Query"| B["API Layer"]
    B -->|"Fetch"| C["Dashboard"]
    C -->|"Render"| D["Data Visualization"]
    style A fill:#f9f,stroke:#333
    style B fill:#bbf,stroke:#333
    style C fill:#dfd,stroke:#333
    style D fill:#ffd,stroke:#333
```

---

## Chatbot Interaction

- **User Interaction**
Users can interact with the chatbot via the `/rag-query` endpoint.
The chatbot processes natural language queries and returns context-aware, ESG-specific responses using RAG technology.

```mermaid
sequenceDiagram
    User->>Chatbot: Submit Query
    Chatbot->>RAG_Endpoint: Forward to /rag-query
    RAG_Endpoint->>Database: Retrieve Relevant Context
    Database-->>RAG_Endpoint: Return Context
    RAG_Endpoint->>LLM: Generate Response
    LLM-->>RAG_Endpoint: Return Response
    RAG_Endpoint-->>Chatbot: Format Response
    Chatbot-->>User: Display Answer
```

---

## Reporting

- **Report Generation**
    - Users can export ESG data into Excel or PDF formats.
    - Report generation leverages **Pandas** for data manipulation, **WeasyPrint** for PDF exports, and **openpyxl** for Excel file creation.

```mermaid
flowchart LR
  A[Processed ESG Data] --> B[Report Generation Module]
  B --> C[Export as PDF/Excel]

```

---

## Error Handling and Alternate Paths

- **Error Scenarios**
    - **File Upload Errors:** Clear error messages prompt users to re-upload valid files.
    - **Processing Errors:** Users are notified of processing issues, and error logs are generated for troubleshooting.
    - **Connectivity Issues:** A fallback page informs users that processing will resume once connectivity is restored.

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> FileUpload: File Upload in Progress
    FileUpload --> Processing: Upload Successful
    FileUpload --> UploadError: Upload Failed
    Processing --> Success: Processing Complete
    Processing --> ProcessingError: Processing Error
    UploadError --> Idle: Retry Upload
    ProcessingError --> Idle: Retry Processing

```

---

## System Architecture

- **Components and Interactions**
    - **Data_Ingestion:** Handles file uploads and storage (Supabase Storage).
    - **Processing:** Manages data extraction, parsing, ESG metadata tagging, and embedding generation.
    - **Analytics:** Provides data retrieval (Supabase API) and dynamic dashboard visualizations.
    - **Auth:** Manages secure user authentication via Google OAuth and enforces row-level security (RLS).
    - **Reporting:** Supports data export in PDF and Excel formats.

```mermaid
%%{init: {'theme': 'neutral', 'themeVariables': { 'fontSize': '18px'}}}%%
graph TB
  subgraph Data_Ingestion
    A["User Uploads File (PDF/Excel/CSV/DOCX)"] --> B["Supabase Storage"]
  end
  subgraph Processing
    B --> C["Data Processing Module (Text Extraction, Table Parsing, ESG Tagging)"]
    C --> D["Generate Embeddings (OpenAI)"]
    D --> E["Store in DB (esg_metrics & esg_chunks)"]
  end
  subgraph Analytics
    E --> F["Supabase API"]
    F --> G["Next.js Dashboard & Charts"]
    G --> H["Chatbot"]
    H -->|Retrieve ESG Data| F
  end
  subgraph Auth
    I["Supabase Auth (Google OAuth, RLS)"] --> G
    I --> H
  end
  subgraph Reporting
    E --> J["Report Export Module (WeasyPrint, Pandas, openpyxl)"]
  end
  style Data_Ingestion fill:#e3f2fd,stroke:#2196f3
  style Processing fill:#ffb4c3,stroke:#dcdc39
  style Analytics fill:#c8e6c9,stroke:#4caf50
  style Auth fill:#ffcdcd,stroke:#f44336
  style Reporting fill:#e1bee7,stroke:#9c27b0

```

--- 

This updated documentation now includes the "Main Dashboard or Home Page" section exactly as provided, preserving the original language and formatting.