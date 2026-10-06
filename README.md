# CreatorCashFlow

> Full-stack SaaS infrastructure for creator agencies, brands and creators — combining campaign operations, payment visibility, financial workflows and AI-assisted intelligence.

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-brightgreen)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express.js-4.x-black)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-blue)](https://supabase.com/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-yellow)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![AI](https://img.shields.io/badge/AI-Gemini-purple)](https://ai.google.dev/)

**Live product:** https://creatorcashflow.co.za  
**Developer:** Reamogetswe Molefe

---

## Overview

CreatorCashFlow is a full-stack SaaS platform being developed for the creator economy.

It provides shared workflows for **creator agencies, brands and creators** to manage campaign activity, creator deliverables, payment visibility, financial information and client reporting from one workspace.

The project began as a creator financial dashboard and has evolved into a broader campaign-operations platform with a modular backend, authentication, database persistence, external integrations, AI-assisted functionality, automated testing and performance benchmarking.

CreatorCashFlow is currently in active development and market validation.

---

## Core Capabilities

- Creator, agency and brand account workflows
- Role-based authentication and authorization
- Campaign and creator-assignment foundations
- Creator transaction and cash-flow tracking
- Agency and creator collaboration workflows
- Payment and financial visibility
- Administrative monitoring and metrics
- Social-platform integration foundations
- AI-assisted financial guidance
- PII-aware AI processing
- Automated security, regression and integration testing
- Concurrency and performance benchmarking
- Responsive multi-role user interfaces

---

## Architecture

CreatorCashFlow uses a modular Node.js/Express backend with separate services, middleware, controllers and routes.

```text
                         ┌─────────────────────────┐
                         │        Frontend         │
                         │ HTML • CSS • JavaScript │
                         └────────────┬────────────┘
                                      │
                                      │ HTTP / JSON
                                      ▼
                         ┌─────────────────────────┐
                         │     Express REST API    │
                         └────────────┬────────────┘
                                      │
              ┌───────────────────────┼────────────────────────┐
              │                       │                        │
              ▼                       ▼                        ▼
     ┌─────────────────┐    ┌─────────────────┐     ┌─────────────────┐
     │ Authentication  │    │ Business Logic  │     │  Integrations   │
     │ JWT • bcrypt    │    │ Campaigns       │     │ Phyllo          │
     │ RBAC            │    │ Transactions    │     │ YouTube         │
     │ Rate Limiting   │    │ Collaboration   │     │ Meta/Instagram  │
     └────────┬────────┘    └────────┬────────┘     │ Gemini          │
              │                      │              │ Resend          │
              │                      │              └────────┬────────┘
              └──────────────┬───────┘                       │
                             ▼                               │
                    ┌─────────────────┐                      │
                    │    Supabase     │◄─────────────────────┘
                    │   PostgreSQL    │
                    └─────────────────┘
```

The backend is decomposed into:

```text
config/        → environment and application configuration
controllers/   → application and business logic
middleware/    → authentication, rate limiting and error handling
routes/        → REST API route definitions
services/      → database, AI and external-service logic
migrations/    → database evolution
tests/         → integration, security and regression testing
docs/          → API and technical documentation
```

---

## Technology Stack

### Backend

- Node.js
- Express.js
- JavaScript / ES6+
- REST APIs
- JSON Web Tokens
- bcrypt

### Database

- PostgreSQL
- Supabase
- SQL migrations

### Frontend

- HTML5
- CSS3
- JavaScript
- Chart.js
- Responsive layouts
- CSS Grid and Flexbox

### Security

- JWT authentication
- Password hashing with bcrypt
- Role-based access control
- Helmet security headers
- Content Security Policy
- CORS restrictions
- Endpoint-specific rate limiting
- Environment-based secret management
- Input-validation and security testing

### AI

- Google Gemini API
- Structured AI service layer
- PII masking
- Intent categorisation
- AI request error handling
- Usage and telemetry foundations

### External Integrations

- Supabase
- Phyllo
- Meta / Instagram
- YouTube
- Google Gemini
- Resend

### Engineering Tooling

- Git
- GitHub
- GitHub Actions
- Automated regression tests
- End-to-end tests
- Security tests
- Concurrency testing
- Load and latency benchmarking

---

## AI Service Layer

CreatorCashFlow includes a dedicated AI service layer built around the Google Gemini API.

AI functionality is separated from the rest of the application so that model communication, privacy handling and upstream failures can be managed independently.

The service includes:

- Prompt processing
- Gemini API communication
- PII redaction
- Financial-query categorisation
- API failure handling
- Invalid-response handling
- Usage estimation
- Structured service responses

Before supported user text is forwarded to the AI provider, the service can redact information such as:

```text
Email addresses  → [REDACTED_EMAIL]
Phone numbers    → [REDACTED_PHONE]
ZAR values       → [REDACTED_ZAR]
```

This provides an additional privacy layer between application data and external AI services.

---

## Authentication & Authorization

CreatorCashFlow supports several user roles:

```text
Creator
Agency
Brand
Administrator
```

Authentication is implemented with JSON Web Tokens.

Passwords are hashed using bcrypt before storage.

Authenticated tokens can contain information including:

```json
{
  "id": "user_id",
  "email": "user@example.com",
  "name": "Example User",
  "role": "creator",
  "organization_id": "organization_id"
}
```

Administrative functionality uses additional role verification so that standard user accounts cannot access protected administrator endpoints.

---

## API Structure

The Express backend currently exposes modular APIs across areas including:

```text
/api/health
/api/auth
/api/admin
/api/transactions
/api/onboarding
/api/integrations
/api/youtube
/api/agency
/api/gemini
/api/collaboration
```

A more detailed REST API specification is available in:

```text
docs/API.md
```

---

## Security Engineering

Security is treated as part of the application architecture rather than only as a deployment concern.

The repository contains implementations and tests for:

- authentication boundaries
- authorization
- rate limiting
- CORS restrictions
- content-security policies
- standardized error handling
- PII redaction
- secret/environment handling
- malformed-input rejection
- unauthorized route access
- administrator privilege enforcement
- brute-force protection
- security regression testing

For example, the project contains bounded sliding-window rate limiters for authentication, administrative actions, transaction operations and AI requests.

---

## Automated Testing

CreatorCashFlow contains multiple layers of automated testing.

The testing approach covers:

```text
Feature validation
Authentication
Authorization
REST API behavior
Administrative workflows
Integration flows
Security boundaries
AI service behavior
UI contracts
Full user journeys
Regression testing
Adversarial testing
Concurrency testing
Performance benchmarking
```

Run the primary test suite with:

```bash
npm test
```

Administrative tests:

```bash
npm run test:admin
```

Performance tests:

```bash
npm run test:stress
```

---

## CI/CD

GitHub Actions is used to automatically validate the project when changes are pushed or pull requests are created.

The CI workflow tests against multiple Node.js versions.

Current automated checks include:

```text
Dependency installation
Environment-file protection
Secret / PII checks
Express server startup
Health endpoint verification
Core regression tests
Administrative tests
End-to-end tests
Security tests
Adversarial tests
```

The workflow currently tests against:

```text
Node.js 18
Node.js 20
```

---

## Performance Engineering

CreatorCashFlow includes a custom Node.js concurrency and load-testing harness.

The benchmark system records:

- total requests
- successful requests
- failed requests
- requests per second
- minimum latency
- average latency
- p50 latency
- p90 latency
- p95 latency
- p99 latency
- endpoint-level performance

One recorded benchmark used:

```text
Concurrent users:       150
Total HTTP requests:    2,706
Successful requests:    2,706
Request success rate:   100%
Requests per second:    ~529
Average latency:        ~265 ms
```

The benchmark covered endpoints including:

```text
POST /api/auth/signup
POST /api/auth/login
GET  /api/transactions
POST /api/transactions
GET  /api/admin/metrics
```

Performance optimisation is ongoing, particularly around latency under higher concurrency.

---

## Repository Structure

```text
creator_cash_flow_ccf/
│
├── .github/
│   └── workflows/
│
├── config/
│
├── controllers/
│
├── middleware/
│
├── routes/
│
├── services/
│
├── migrations/
│
├── tests/
│
├── docs/
│
├── assets/
│
├── marketing/
│
├── database_setup.sql
├── server.js
├── app.js
├── admin.js
├── dashboards.js
├── package.json
├── stress_harness.js
├── stress_test_report.json
└── README.md
```

---

## Running the Project Locally

### 1. Clone the repository

```bash
git clone https://github.com/reamogetswemolefe0190-cmd/creator_cash_flow_ccf.git
cd creator_cash_flow_ccf
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example environment file:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Then configure the services you want to use.

Typical variables include:

```env
PORT=5000
NODE_ENV=development

SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

JWT_SECRET=

GEMINI_API_KEY=

PHYLLO_CLIENT_ID=
PHYLLO_CLIENT_SECRET=

RESEND_API_KEY=
```

Never commit real API keys or secrets to the repository.

### 4. Start the development server

```bash
npm run dev
```

Or run normally:

```bash
npm start
```

The API will typically be available at:

```text
http://localhost:5000
```

---

## Example Health Check

Once the server is running:

```bash
curl http://localhost:5000/api/health
```

The health endpoint provides application diagnostics including system state and integration information.

---

## Development Philosophy

CreatorCashFlow is being developed around several principles:

### User-first product development

Features are designed around actual creator-agency workflows rather than building technology only for the sake of adding features.

### Security by design

Authentication, authorization, rate limiting, privacy controls and regression tests are built into the architecture.

### Measure instead of assume

Performance is benchmarked with automated load testing rather than described with unsupported scalability claims.

### AI where it adds value

AI functionality is kept behind a dedicated service layer and is combined with conventional application logic rather than replacing deterministic software behavior.

### Ship, test and iterate

The project is continuously improved through product feedback, automated testing, debugging and measurable technical validation.

---

## Current Development Focus

CreatorCashFlow is currently moving from MVP development toward commercial validation.

Current priorities include:

- improving agency campaign workflows
- strengthening creator/brand collaboration
- expanding production integrations
- improving client reporting
- improving payment-status visibility
- strengthening security and reliability
- improving performance under load
- onboarding early agency pilot users

---

## Product Direction

The long-term goal is to create shared infrastructure for creator campaigns.

Instead of agencies managing campaigns across spreadsheets, chats, disconnected files and separate financial systems, CreatorCashFlow aims to provide a shared operating layer connecting:

```text
Agency
   │
   ├── Campaign brief
   ├── Creator assignments
   ├── Deliverables
   ├── Reviews / approvals
   ├── Payment progress
   └── Client reporting
   │
   ▼
Creator ───────────────────── Brand
```

The initial focus is creator and talent agencies managing recurring campaigns.

---

## Live Product

CreatorCashFlow is available at:

### https://creatorcashflow.co.za

The product is still under active development, so some integrations and workflows may remain experimental or pilot-stage.

---

## About the Developer

### Reamogetswe Molefe

I am a Mechanical Engineering student at the **University of Johannesburg** with a strong interest in software engineering, AI systems, SaaS development and product engineering.

I build software independently alongside my engineering studies, with a focus on turning real-world problems into working technical products.

My current areas of development include:

```text
JavaScript
Node.js
Express
REST APIs
PostgreSQL / Supabase
Python
AI / LLM integrations
Automation
Authentication & application security
Testing
Product design
SaaS development
```

Other AI engineering work includes **Kohort**, a Python-based multi-stage synthetic market-research system combining LLM orchestration, deterministic analytics and AI quality evaluation.

GitHub:

https://github.com/reamogetswemolefe0190-cmd

---

## Status

**Active Development — 2026**

CreatorCashFlow is currently being developed, tested and validated with the goal of progressing from working product infrastructure into real-world agency pilots.

---

<p align="center">
  <strong>CreatorCashFlow</strong><br>
  Building infrastructure for the creator economy.
</p>
