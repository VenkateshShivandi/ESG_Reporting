# Tech Stack Document v2.0

**Based on Code Analysis (YYYY-MM-DD)** - *Replace with current date*

---

## 1. Technology Stack Overview

- **Goal**: An AI-powered platform for ESG data management, processing, analysis, and reporting.
- **Architecture**: A distributed system featuring a Next.js frontend, a Main Backend API (Flask), and a dedicated RAG Service (Flask).
- **Core Capabilities**: Ingestion of multiple document formats (PDF, DOCX, XLSX, CSV), AI-driven processing (chunking, embedding via OpenAI), data storage in Supabase PostgreSQL and Neo4j, and API-driven analytics and chat features.
- **Key Technologies**: React/Next.js, Python/Flask, Docker, Supabase (Auth, DB, Storage), OpenAI API, Neo4j.

---

## 2. Frontend Technologies

### Core Technologies

-   **Framework:** React (v18 assumed), Next.js (v14 assumed) - Leveraging features like App Router, Server Components potentially.
-   **Styling:** Tailwind CSS (v3 assumed), potentially Headless UI or similar for components.
-   **State Management:** React Context API or Zustand (Assumed).
-   **Data Visualization:** Recharts or ApexCharts (Assumed).
-   **Authentication Client:** Supabase Client JS Library (`@supabase/supabase-js`).
-   **API Communication:** Fetch API or Axios (Assumed).
-   **Deployment:** Vercel (Assumed, as per previous docs).

```mermaid
graph TD
    subgraph FrontendApp [Next.js / React App on Vercel]
        direction LR
        A[UI Components<br>(React, Tailwind)]
        B[Routing<br>(Next.js Router)]
        C[State Management<br>(Context/Zustand?)]
        D[API Client<br>(Fetch/Axios)]
        E[Auth Client<br>(Supabase JS)]
        F[Visualization<br>(Recharts?)]
    end
    subgraph BackendAPIs
       G[Main Backend API<br>(Flask @5005)]
    end
    subgraph ExternalAuth
       H[(Supabase Auth)]
    end

    E --> H
    D --> G

    style Frontend fill:#D5F5E3,stroke:#2ECC71
    style BackendAPIs fill:#e3f2fd,stroke:#2196f3
    style ExternalAuth fill:#FFF9C4,stroke:#FFC107
```

---

## 3. Backend Technologies

### Service 1: Main Backend API (`backend/app.py`)

-   **Language/Framework:** Python 3.x, Flask.
-   **Key Libraries:** Flask, Supabase Python Client (`supabase-py`), python-dotenv, PyJWT, Werkzeug.
-   **Responsibilities:**
    -   Handling user-facing API requests (`/api/*`).
    -   JWT Authentication & Authorization (`security.py`).
    -   File Management (Upload, List, Delete, Rename) via Supabase Storage & DB (`public.documents`).
    -   Triggering the RAG Service for processing.
    -   Serving analytics data (partially implemented, reads from `esg_data.*`).
    -   Proxying RAG queries (intended).
    -   Interacting with OpenAI Assistants API (`/api/chat`).

### Service 2: RAG Service (`rag/app.py`)

-   **Language/Framework:** Python 3.x, Flask.
-   **Key Libraries:** Flask, Supabase Python Client, OpenAI Python Client (`openai`), Document parsing libraries (e.g., PyMuPDF, python-docx, pandas inferred from usage), Neo4j driver (`neo4j`), Werkzeug.
-   **Responsibilities:**
    -   Receiving processing triggers (`/api/v1/process_document`, `/api/v1/process-file`).
    -   Downloading files from Supabase Storage.
    -   Parsing and chunking documents (`processor.py`, `chunking.py`).
    -   Generating embeddings via OpenAI API (`embedding_service.py`).
    -   Storing chunks/embeddings in Supabase PostgreSQL (`esg_data.document_chunks`).
    -   Executing the `ESGPipeline` to populate Neo4j (entity/claim extraction inferred).

### Databases & Storage

-   **Primary Database:** Supabase PostgreSQL (Managed Service).
    -   Schemas: `public`, `esg_data`.
    -   Key Tables: `public.documents`, `esg_data.document_chunks`, `esg_data.excel_metrics`.
    -   Features: SQL functions/RPC (`manage_document_metadata`), RLS potential.
-   **Graph Database:** Neo4j (Requires separate instance - Self-hosted or Cloud like AuraDB).
    -   Used by: RAG Service (`ESGPipeline`).
    -   Purpose: Knowledge graph representation, advanced analysis.
-   **File Storage:** Supabase Storage (S3-compatible object storage).
    -   Bucket: `documents`.

```mermaid
flowchart TB
    subgraph MainBackendAPI [Main Backend API]
        direction TB
        MB_Flask[Flask App] --> MB_Sec[Security Module]
        MB_Flask --> MB_Supabase[Supabase Client]
        MB_Flask --> MB_OpenAI[OpenAI Client (Assistants)]
        MB_Flask -- Triggers --> RAGSvcAPI{RAG Service API}
    end
    subgraph RAGService [RAG Service]
        direction TB
        RAG_Flask[Flask App] --> RAG_Proc[Processor/Chunker]
        RAG_Proc --> RAG_Embed[Embedding Service]
        RAG_Proc --> RAG_Supabase[Supabase Client]
        RAG_Proc --> RAG_Neo4j[Neo4j Driver]
        RAG_Embed --> OpenAI_API[(OpenAI API)]
    end
    subgraph Databases
       SupaDB[(Supabase DB<br>Postgres)]
       Neo4jDB[(Neo4j DB)]
       SupaStore[(Supabase Storage)]
    end

    MB_Supabase --> SupaDB
    MB_Supabase --> SupaStore
    RAG_Supabase --> SupaDB
    RAG_Supabase --> SupaStore
    RAG_Neo4j --> Neo4jDB

    style MainBackendAPI fill:#e3f2fd,stroke:#2196f3
    style RAGService fill:#c8e6c9,stroke:#4caf50
    style Databases fill:#fff2cc,stroke:#ff9900
```

---

## 4. Infrastructure & Deployment

### Containerization & Orchestration

-   **Containerization:** Docker (Separate Dockerfiles for Main Backend and RAG Service).
-   **Orchestration:** Docker Compose (Likely for local development), Cloud orchestration (e.g., AWS ECS/EKS, Google Cloud Run, Azure Container Apps, Cloudflare Workers - depending on deployment choice).

### Cloud Services & Hosting

-   **Frontend Hosting:** Vercel (Assumed).
-   **Backend Hosting:** Cloud Provider (e.g., AWS, Google Cloud, Azure, Cloudflare). Requires hosting for two Python/Flask containers.
-   **Database & Storage:** Supabase (Managed Service).
-   **Graph Database:** Neo4j (Requires separate hosting - Cloud or Self-managed).
-   **AI Services:** OpenAI API (External SaaS).

### CI/CD & Monitoring

-   **CI/CD Pipelines:** GitHub Actions (Assumed, based on `.github` folder). Workflow likely includes build, test, push to container registry, deploy.
-   **Monitoring & Logging:**
    -   Application Logging (Built into Flask apps, writing to files/console).
    -   Cloud Provider Monitoring (e.g., CloudWatch, Google Cloud Monitoring).
    -   External Service Monitoring (Sentry - Optional, needs integration).

```mermaid
graph LR
    A[Developer --> GitRepo{GitHub}] --> B[GitHub Actions<br>(CI/CD)];
    B -- Build/Push --> C(Container Registry<br>e.g., Docker Hub, ECR);
    B -- Deploy FE --> D[Vercel];
    B -- Deploy BE --> E{Cloud Platform<br>(AWS/GCP/Azure/CF...)};
    E -- Runs --> F[Main API Container];
    E -- Runs --> G[RAG Service Container];
    F & G --> H[(Supabase)];
    G --> I[(Neo4j)];
    F & G --> J[(OpenAI API)];
    K[User] --> D;
    K --> E;

    style GitRepo fill:#f9f,stroke:#333
```

---

## 5. Third-Party Integrations

-   **Auth Provider:** Supabase Auth (Handles user management, interacts with providers like Google OAuth on the client-side).
-   **AI Services:** OpenAI API (Embeddings, Assistants API, potentially LLMs for RAG synthesis).
-   **Database:** Supabase (PostgreSQL + Storage).
-   **Graph Database:** Neo4j.

*(Note: Voiceflow was mentioned in previous docs but is not reflected in the current backend codebase analysis. Chat functionality uses OpenAI Assistants API directly from the Main Backend.)*

---

## 6. Security Architecture

-   **Authentication:** Supabase Auth for user management; JWT validation in Main Backend API (Bearer Tokens).
    -   *Note: Current JWT validation in `security.py` needs enhancement to verify token signature.*
-   **Authorization:** Role-based access control via `@require_role` decorator in Main Backend, checking JWT claims. Potential for Supabase Row-Level Security (RLS) policies based on `auth.uid()` and `org_id`.
-   **Encryption:**
    -   Data at Rest: Handled by Supabase (Database, Storage - typically AES-256). Neo4j encryption depends on its configuration.
    -   Data in Transit: HTTPS assumed for APIs, TLS for database connections (handled by clients).
-   **Infrastructure Security:** Dependent on Cloud Provider configurations (Firewalls, VPCs, etc.).
-   **Secret Management:** Environment variables (`.env.local`), potentially leveraging Cloud Provider secret management (e.g., AWS Secrets Manager, Google Secret Manager).

```mermaid
flowchart LR
    A[User] -->|HTTPS| B(Load Balancer/CDN<br>e.g., Cloudflare);
    B --> C{Frontend<br>(Vercel)};
    B --> D{Backend Host<br>(Cloud Platform)};
    D --> E[Main Backend API<br>JWT Check];
    D --> F[RAG Service];
    E --> G[(Supabase Auth<br>JWT Source)];
    E & F --> H[(Supabase DB/Storage<br>RLS Enforced)];
    F --> I[(Neo4j)];

    style G fill:#FFF9C4,stroke:#FFC107
```

---

## 7. Data Flow Summary

1.  **Login**: Frontend uses Supabase Auth (e.g., Google OAuth) -> Gets JWT.
2.  **Upload**: Frontend sends file + JWT to Main Backend (`/api/upload-file`) -> Main Backend stores file (Supabase Storage) & metadata (`public.documents`).
3.  **Process Trigger**: Frontend sends request + JWT to Main Backend (`/api/process-file`) -> Main Backend triggers RAG Service (`/api/v1/process_document`).
4.  **RAG Processing**: RAG Service gets file (Storage), chunks, gets embeddings (OpenAI), stores results (`esg_data.document_chunks`). Optionally populates Neo4j via separate pipeline/endpoint.
5.  **Query/Analytics**: Frontend sends request + JWT to Main Backend (`/api/analytics/*`, `/api/chat`, `/api/rag/query`) -> Main Backend fetches data (Supabase DB), interacts with OpenAI (Assistants), or proxies to RAG Service (for RAG queries).

---

*This document details the technology stack based on the analyzed codebase. Specific library versions and detailed configurations may vary.* 