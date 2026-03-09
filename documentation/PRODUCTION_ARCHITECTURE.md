# Production Architecture Documentation

## System Overview

The ATS (Applicant Tracking System) for Candidates is a full-stack web application designed to help job seekers manage their job search process.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PRODUCTION ARCHITECTURE                         │
└─────────────────────────────────────────────────────────────────────────────┘

                                    ┌──────────────┐
                                    │   Users      │
                                    │  (Browser)   │
                                    └──────┬───────┘
                                           │ HTTPS
                                           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Vercel)                                │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  React + Vite Application                                              │  │
│  │  • Static assets served via Vercel CDN                                 │  │
│  │  • Client-side routing with React Router                               │  │
│  │  • JWT tokens stored in localStorage                                   │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────┬───────────────────────────────────┘
                                           │ HTTPS API Calls
                                           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND (Render.com)                             │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  Express.js Server                                                     │  │
│  │  • RESTful API endpoints                                               │  │
│  │  • JWT authentication middleware                                       │  │
│  │  • Helmet security headers                                             │  │
│  │  • Rate limiting on auth endpoints                                     │  │
│  │  • CORS whitelist configuration                                        │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────┬───────────────────────────────────┘
                                           │ SSL Connection
                                           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                              DATABASE (Supabase)                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  PostgreSQL Database                                                   │  │
│  │  • Connection pooling via Supavisor                                    │  │
│  │  • SSL/TLS encrypted connections                                       │  │
│  │  • Row-level security policies                                         │  │
│  │  • Automatic backups                                                   │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘

                              EXTERNAL SERVICES
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Google APIs    │  │   OpenAI API    │  │   Resend API    │  │  News API       │
│  • OAuth        │  │  • GPT-4        │  │  • Email        │  │  • Job news     │
│  • Gemini AI    │  │  • Completions  │  │  • Notifications│  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## Component Details

### Frontend (Vercel)

| Property | Value |
|----------|-------|
| **Platform** | Vercel |
| **Framework** | React 18 + Vite |
| **URL** | `https://your-app.vercel.app` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Node Version** | 18.x |

**Key Features:**
- Server-side rendering disabled (SPA)
- Automatic HTTPS/SSL
- Global CDN distribution
- Automatic deployments from `main` branch

### Backend (Render.com)

| Property | Value |
|----------|-------|
| **Platform** | Render.com |
| **Runtime** | Node.js 18.x |
| **URL** | `https://your-api.onrender.com` |
| **Start Command** | `node server.js` |
| **Health Check** | `GET /health` |
| **Instance Type** | Web Service |

**Key Features:**
- Auto-scaling based on load
- Automatic HTTPS/SSL
- Zero-downtime deployments
- Built-in DDoS protection

### Database (Supabase)

| Property | Value |
|----------|-------|
| **Platform** | Supabase |
| **Database** | PostgreSQL 15 |
| **Connection** | Pooled (Supavisor) |
| **Region** | US East |
| **Backup** | Daily automatic |

**Connection String Format:**
```
postgresql://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER AUTHENTICATION FLOW                        │
└─────────────────────────────────────────────────────────────────────────────┘

  User                    Frontend                   Backend                Database
   │                         │                          │                       │
   │  1. Login Request       │                          │                       │
   │ ───────────────────────>│                          │                       │
   │                         │  2. POST /login          │                       │
   │                         │ ────────────────────────>│                       │
   │                         │                          │  3. Query user        │
   │                         │                          │ ─────────────────────>│
   │                         │                          │  4. Return user data  │
   │                         │                          │ <─────────────────────│
   │                         │                          │                       │
   │                         │                          │  5. Verify password   │
   │                         │                          │     (bcrypt)          │
   │                         │                          │                       │
   │                         │  6. JWT Token            │                       │
   │                         │ <────────────────────────│                       │
   │  7. Store token         │                          │                       │
   │ <───────────────────────│                          │                       │
   │    (localStorage)       │                          │                       │
   │                         │                          │                       │
```

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API REQUEST FLOW                                │
└─────────────────────────────────────────────────────────────────────────────┘

  User                    Frontend                   Backend                Database
   │                         │                          │                       │
   │  1. Action (e.g. view)  │                          │                       │
   │ ───────────────────────>│                          │                       │
   │                         │  2. GET /api/jobs        │                       │
   │                         │  + Authorization header  │                       │
   │                         │ ────────────────────────>│                       │
   │                         │                          │                       │
   │                         │                          │  3. Verify JWT        │
   │                         │                          │     (auth middleware) │
   │                         │                          │                       │
   │                         │                          │  4. Query database    │
   │                         │                          │ ─────────────────────>│
   │                         │                          │  5. Return data       │
   │                         │                          │ <─────────────────────│
   │                         │  6. JSON Response        │                       │
   │                         │ <────────────────────────│                       │
   │  7. Render UI           │                          │                       │
   │ <───────────────────────│                          │                       │
   │                         │                          │                       │
```

---

## Security Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SECURITY LAYERS                                 │
└─────────────────────────────────────────────────────────────────────────────┘

Layer 1: Network Security
├── HTTPS/TLS encryption (all traffic)
├── CORS whitelist (allowed origins only)
└── DDoS protection (Vercel/Render built-in)

Layer 2: Application Security
├── Helmet.js security headers
│   ├── X-Content-Type-Options: nosniff
│   ├── X-Frame-Options: SAMEORIGIN
│   └── X-XSS-Protection: disabled (CSP preferred)
├── Rate limiting on authentication endpoints
│   └── 10 requests per 15 minutes
└── Input validation middleware

Layer 3: Authentication
├── JWT Bearer tokens
│   ├── Signed with HS256
│   ├── 24-hour expiration
│   └── Stored in localStorage
├── bcrypt password hashing (cost factor: 10)
└── User enumeration prevention

Layer 4: Database Security
├── Parameterized queries (SQL injection prevention)
├── SSL/TLS database connections
├── Connection pooling
└── Row-level security policies
```

---

## Scaling Considerations

### Current Capacity

| Resource | Limit | Current Usage |
|----------|-------|---------------|
| Database Connections | 60 (pooled) | ~5-10 |
| API Rate Limit (auth) | 10/15min | N/A |
| Vercel Bandwidth | 100GB/month | ~1GB |
| Render RAM | 512MB | ~200MB |

### Scaling Strategy

1. **Horizontal Scaling**: Add more Render instances
2. **Database Scaling**: Upgrade Supabase plan for more connections
3. **Caching**: Implement Redis for session/query caching
4. **CDN**: Already using Vercel CDN for static assets

---

## Disaster Recovery

| Scenario | Recovery Strategy | RTO | RPO |
|----------|-------------------|-----|-----|
| Frontend down | Vercel auto-recovery | 1 min | 0 |
| Backend down | Render auto-restart | 2 min | 0 |
| Database down | Supabase failover | 5 min | 1 hour |
| Data corruption | Restore from backup | 30 min | 24 hours |

**RTO** = Recovery Time Objective  
**RPO** = Recovery Point Objective

---

*Last Updated: December 2025*

