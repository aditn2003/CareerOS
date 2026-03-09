# CareerOS — ATS for Candidates

**Manage job applications, resumes, and professional profiles — all in one place.**

CareerOS is a full-featured Application Tracking System (ATS) built _for job seekers_ to organize their search, tailor materials with AI, prepare for interviews, and grow their professional network.

---

## Features

### Documents

- **Resume Builder** — Build, upload, and optimize resumes with AI tailoring for specific roles
- **Cover Letter** — AI-generated, personalized cover letters
- **Doc Management** — Centralized document storage and organization

### Job Search

- **Jobs Dashboard** — Track applications across wishlist, applied, interview, offer, and rejected
- **Job Match** — AI-powered matching between your profile and job descriptions
- **Skills Gap Analysis** — Identify gaps for target roles and track improvement

### Interview Preparation

- **Interview Insights** — AI-driven insights and guidance
- **Question Bank** — Practice common interview questions
- **Response Coaching** — AI feedback on your answers
- **Mock Interview** — Simulate real interview scenarios
- **Technical Prep** — Technical interview preparation
- **Follow-Up Templates** — Post-interview thank-you and follow-up templates
- **Company Research** — Research companies before interviews
- **Salary Research & Negotiation** — Compensation insights and negotiation guidance
- **Interview Tracker & Analytics** — Track and analyze your interview performance

### Professional Network

- **Network** — Manage contacts, referrals, and networking events
- **Informational Interviews** — Track and prepare for informational conversations
- **Mentor** — Mentorship workflows for candidates (team-based)

### Analytics & Growth

- **Statistics** — Application trends and success metrics
- **Follow-Up Reminders** — Automated reminders for interviews and deadlines
- **Career Goals** — Set and track career objectives

### Account & Security

- **Profile** — Employment history, education, certifications, projects, skills
- **Auth** — Email/password, Google Sign-In, LinkedIn OAuth
- **Security** — JWT tokens, Helmet headers, rate limiting, XSS/SQL injection protection

---

## Tech Stack

| Layer      | Technology                                       |
| ---------- | ------------------------------------------------ |
| Frontend   | React 19, Vite, Chakra UI, Material UI, Recharts |
| Backend    | Node.js, Express, PostgreSQL (Supabase)          |
| AI         | Google Gemini, OpenAI                            |
| Auth       | JWT, bcrypt, Google OAuth, LinkedIn OAuth        |
| Email      | Resend, Nodemailer                               |
| Monitoring | Sentry, Winston                                  |

---

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL (or Supabase account)
- API keys: Google (Gemini), OpenAI, Resend

### Installation

```bash
# Install all dependencies (root + backend + frontend)
npm run install:all
```

### Development

```bash
# Run backend and frontend concurrently
npm run dev
```

- **Frontend**: http://localhost:5173 (Vite default)
- **Backend**: http://localhost:4000

### Environment Variables

Copy and configure environment variables for both `backend` and `frontend`. See [documentation/ENVIRONMENT_VARIABLES.md](documentation/ENVIRONMENT_VARIABLES.md) for full details.

**Backend** (minimum):

- `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
- `JWT_SECRET`, `FRONTEND_URL`
- `GOOGLE_API_KEY`, `OPENAI_API_KEY`, `RESEND_API_KEY`

**Frontend**:

- `VITE_API_URL`, `VITE_GOOGLE_CLIENT_ID`

---

## Project Structure

```
├── frontend/              # React + Vite SPA
├── backend/               # Express API
│   ├── db/                 # SQL migrations and schema
│   ├── routes/             # API route handlers
│   ├── scripts/            # Backend scripts (migrations, load-test, debug)
│   └── ...
├── documentation/         # Production docs, runbooks, guides
│   ├── development/       # Dev-only docs (coverage, test status)
│   └── ...
├── scripts/               # Root-level dev scripts (merge-coverage, ngrok, health checks)
└── .github/               # CI/CD workflows
```

---

## Scripts

| Command                 | Description                           |
| ----------------------- | ------------------------------------- |
| `npm run dev`           | Run backend + frontend in development |
| `npm test`              | Run all tests                         |
| `npm run test:coverage` | Run tests with coverage               |
| `npm run install:all`   | Install dependencies for monorepo     |

---

## Documentation

- [Getting Started](documentation/GETTING_STARTED.md) — User guide for CareerOS
- [Production Architecture](documentation/PRODUCTION_ARCHITECTURE.md) — System overview
- [Environment Variables](documentation/ENVIRONMENT_VARIABLES.md) — Configuration reference
- [Deployment Runbook](documentation/DEPLOYMENT_RUNBOOK.md) — Deployment procedures
- [Troubleshooting](documentation/TROUBLESHOOTING_GUIDE.md) — Common issues
- [Security Demo](documentation/UC145_SECURITY_DEMO_GUIDE.md) — Security testing guide
