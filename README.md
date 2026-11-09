# CreatorCashFlow

**Campaign operations for creator agencies.**

CreatorCashFlow is a campaign-operations platform being built to help creator agencies coordinate campaigns, manage deliverables, track approvals and monitor payment progress in one workspace.

It aims to replace fragmented workflows across spreadsheets, chat conversations and disconnected documents with a shared operating space for agency teams and their creators.

**Live product:** [creatorcashflow.co.za](https://creatorcashflow.co.za)  
**Developer:** Reamogetswe Molefe  
**Status:** Active development · Pilot validation

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-brightgreen)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express.js-4.x-black)](https://expressjs.com/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-yellow)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Supabase](https://img.shields.io/badge/Database-Supabase-blue)](https://supabase.com/)

---

## The problem

Creator campaigns involve more than finding a creator and publishing content.

An agency may need to coordinate:

- Campaign briefs and requirements
- Creator assignments
- Content deliverables
- Review and approval cycles
- Deadlines and campaign progress
- Creator payment status
- Client updates and reporting

When these activities are managed across spreadsheets, messages and separate tools, it becomes difficult to maintain a reliable view of campaign progress.

**CreatorCashFlow is being built to bring these workflows together.**

## Product direction

The initial focus is creator and talent agencies managing recurring campaigns.

The core workflow is:

```text
       CLIENT / CAMPAIGN BRIEF
                  |
                  v
          CAMPAIGN SETUP
                  |
                  v
         CREATOR ASSIGNMENT
                  |
                  v
        DELIVERABLE SUBMISSION
                  |
                  v
         REVIEW & APPROVAL
                  |
                  v
         PAYMENT PROGRESS
                  |
                  v
          CLIENT REPORTING
```

The goal is to give agencies a clearer view of what needs to happen, what has been completed and what still requires attention.

## Core product areas

### Campaign management

Organise campaign information and coordinate the work required to execute a campaign.

### Creator collaboration

Support workflows between agencies and creators, including campaign participation and deliverable coordination.

### Deliverables and approvals

Track campaign content and its progress through review and approval stages.

### Payment visibility

Provide a clearer view of creator payment progress and campaign-related financial activity.

### Client reporting

Bring campaign progress and relevant information into a more organised reporting workflow.

These are the product's central workflow areas. The platform is still evolving, and not every planned capability should be treated as a completed production feature.

---

## Engineering architecture

CreatorCashFlow uses a modular Node.js and Express backend with a REST API.

The application separates routing, middleware, controllers, services and configuration to keep business logic and infrastructure concerns organised.

```text
                 FRONTEND APPLICATION
                         |
                         | HTTP / JSON
                         v
                  EXPRESS REST API
                         |
          +--------------+--------------+
          |              |              |
          v              v              v
    AUTHENTICATION   APPLICATION     INTEGRATION
    & AUTHORIZATION    SERVICES        SERVICES
          |              |              |
          |              v              |
          |        CAMPAIGN LOGIC       |
          |        COLLABORATION        |
          |        TRANSACTIONS         |
          |              |              |
          +--------------+--------------+
                         |
                         v
                DATA / STORAGE LAYER
                  Supabase + SQL
                  Application state
```

The repository includes:

| Layer | Responsibility |
|---|---|
| Routes | Define REST API endpoints |
| Controllers | Handle application requests |
| Middleware | Authentication, rate limiting and request handling |
| Services | Business logic and external integrations |
| Configuration | Environment and service configuration |
| Migrations | Database schema changes |
| Tests | Feature, integration and regression validation |

The application includes both Supabase integration and in-memory application storage. Persistence behaviour should therefore be evaluated per workflow rather than assumed to be uniform across the entire platform.

## Technology stack

| Area | Technologies |
|---|---|
| Backend | Node.js, Express.js |
| Language | JavaScript, ES6+ |
| API | REST, HTTP, JSON |
| Authentication | JWT, bcrypt |
| Database integration | Supabase, PostgreSQL |
| Frontend | HTML, CSS, JavaScript |
| Visualisation | Chart.js |
| Security | Helmet, rate limiting, input validation |
| AI integration | Google Gemini API |
| Email integration | Resend |
| Creator integrations | Phyllo, YouTube and Meta integration work |
| Testing | Node.js test scripts, integration and stress tests |
| CI | GitHub Actions |

---

## Authentication and security

The backend includes authentication and access-control foundations for different application roles.

The current role model includes:

```text
Creator
Agency
Brand
Administrator
```

Security-related implementations include:

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access checks
- Protected administrative endpoints
- Rate limiting
- Security headers through Helmet
- Input and request validation
- Environment-based secret configuration
- Security and regression tests

The intention is to keep access boundaries explicit and protect sensitive application operations.

## AI service integration

CreatorCashFlow includes a separate AI service layer using the Google Gemini API.

The service layer is designed to isolate model requests from the rest of the application and handle upstream errors and response processing.

Implemented service concerns include:

- API communication
- Prompt processing
- Financial-query categorisation
- Personally identifiable information redaction
- Response handling
- Error handling
- Usage estimation and telemetry

AI is treated as a supporting application capability, not a replacement for the platform's underlying business logic.

## External integrations

The repository includes integration work involving:

- Supabase
- Phyllo
- YouTube
- Meta / Instagram
- Google Gemini
- Resend

Integration availability and completeness vary. Some capabilities remain under development or require external provider configuration.

---

## Testing and engineering validation

The project includes automated checks for application behaviour and selected integration workflows.

The primary test command is:

```bash
npm test
```

Additional test commands include:

```bash
npm run test:admin
```

```bash
npm run test:instagram
```

```bash
npm run test:ui
```

The repository's testing work covers areas such as:

- Authentication and authorization
- API behaviour
- Administrative workflows
- Collaboration flows
- Integration behaviour
- UI contracts
- Regression checks

These tests are used during development to identify regressions and validate selected application workflows.

## Performance testing

CreatorCashFlow includes a custom Node.js HTTP load-testing harness.

It supports configurable virtual-user concurrency and test duration, and records:

- Request counts
- Successful and failed responses
- Throughput
- Average latency
- p50, p90, p95 and p99 latency
- Endpoint-level performance

Run the local stress test using:

```bash
npm run test:stress
```

The default script runs with 150 concurrent virtual users for 15 seconds against the local application.

This is a development benchmark, not evidence of production-scale capacity. Results depend on the machine, application configuration and test environment.

---

## Running locally

### Requirements

- Node.js 18 or later
- npm
- Git
- Supabase credentials for workflows that require the configured database
- API credentials for optional external services

### 1. Clone the repository

```bash
git clone https://github.com/reamogetswemolefe0190-cmd/creatorcashflow.git
cd creatorcashflow
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a local `.env` file using the repository's `.env.example` as a reference, if available.

Typical configuration may include:

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

Only configure credentials required by the features you intend to run. Never commit real secrets to GitHub.

### 4. Start the application

Development mode:

```bash
npm run dev
```

Standard mode:

```bash
npm start
```

### 5. Run the test suite

```bash
npm test
```

---

## Current development priorities

CreatorCashFlow is being developed with a focus on moving from a working product foundation toward real agency usage.

Current priorities include:

- Refining campaign and deliverable workflows
- Improving agency and creator collaboration
- Strengthening approval and payment-progress visibility
- Improving client-facing reporting
- Validating workflows with early agency users
- Improving data consistency and persistence
- Strengthening integration reliability
- Iterating on the product based on pilot feedback

The immediate objective is to make the core agency workflow useful and dependable before expanding into additional functionality.

## Product philosophy

**Solve the workflow before expanding the feature set.**

CreatorCashFlow is being developed around four principles:

1. **Operational clarity:** Agencies should be able to understand campaign status without piecing together information from multiple tools.
2. **Practical collaboration:** Creators and agency teams need a shared view of responsibilities and deliverables.
3. **Financial visibility:** Payment progress should be easier to monitor alongside campaign execution.
4. **Iterative development:** Product decisions should be informed by actual user workflows and feedback.

## About the developer

I'm Reamogetswe Molefe, a mechanical engineering student at the University of Johannesburg and an independent software developer.

I build software products that explore practical problems across business operations, applied AI and full-stack engineering.

CreatorCashFlow is one of my ongoing projects, through which I'm developing experience in:

- Backend architecture and REST API development
- Authentication and application security
- Database integration
- Third-party API integration
- AI service integration
- Automated testing
- Product development and validation

Another project, [Kohort](https://github.com/reamogetswemolefe0190-cmd/kohort), explores AI orchestration, synthetic research workflows and deterministic analytics.

**GitHub:** [reamogetswemolefe0190-cmd](https://github.com/reamogetswemolefe0190-cmd)

---

## Project status

**Active development · Pilot validation**

CreatorCashFlow is being developed and tested as an agency-first campaign-operations product. The live site is available at [creatorcashflow.co.za](https://creatorcashflow.co.za).

The project is not presented as a fully mature financial platform. Its focus is on validating the core campaign workflows and building a reliable foundation for real-world agency use.

<p align="center">
  <strong>CreatorCashFlow</strong><br>
  Less campaign admin. More operational clarity.
</p>
