# EthioAlert — National Emergency Alert System (NESS)

## Implementation Document

> **Version:** 2.4 · **Updated:** November 2026
> **Platform Name:** EthioAlert — *Stay Informed. Stay Safe.*

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Diagram](#2-architecture-diagram)
3. [Technology Stack](#3-technology-stack)
4. [Service Components](#4-service-components)
   - 4.1 [Backend API (Django)](#41-backend-api-django)
   - 4.2 [Web Frontend (React)](#42-web-frontend-react)
   - 4.3 [AI Service (FastAPI)](#43-ai-service-fastapi)
   - 4.4 [Mobile App (Flutter)](#44-mobile-app-flutter)
5. [Database Schema](#5-database-schema)
6. [Role-Based Access Control (RBAC)](#6-role-based-access-control-rbac)
7. [Authentication Flow](#7-authentication-flow)
8. [Core Workflows](#8-core-workflows)
   - 8.1 [Incident Case Lifecycle](#81-incident-case-lifecycle)
   - 8.2 [Alert Approval & Dispatch](#82-alert-approval--dispatch)
   - 8.3 [SOS Emergency Pipeline](#83-sos-emergency-pipeline)
9. [API Endpoints](#9-api-endpoints)
10. [Frontend Page Map](#10-frontend-page-map)
11. [AI Capabilities](#11-ai-capabilities)
12. [Deployment](#12-deployment)
13. [How to Run (Development)](#13-how-to-run-development)
14. [Demo Accounts](#14-demo-accounts)
15. [Project File Structure](#15-project-file-structure)

---

## 1. System Overview

EthioAlert is Ethiopia's **national emergency alert and citizen safety platform** operated by the Information Network Security Administration (INSA). It enables:

- **Partner organizations** (Fire Authority, Police, Health, etc.) to **submit incident reports** to INSA for verification.
- **INSA administrators** to **triage, verify, and compose public alerts** from verified incidents.
- **Higher officers** to **approve alerts** via a Tier-2 approval gate before any public broadcast.
- **Emergency dispatchers** to **manage SOS distress calls** from citizens and route them to the correct partner organization.
- **Citizens** to **receive emergency alerts** via push notification, SMS, and voice channels, and to **send SOS distress signals** through the mobile app.
- **AI-assisted** incident triage, alert drafting, severity ranking, and contextual assistant for all roles.

The system enforces **separation of duties**: no single person can both compose and approve a public alert.

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTS                              │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Web Console  │  │  Mobile App  │  │   SMS / Voice    │  │
│  │  (React SPA)  │  │  (Flutter)   │  │  (Gateway API)   │  │
│  │  :5173        │  │  Android/iOS │  │                  │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                 │                    │            │
└─────────┼─────────────────┼────────────────────┼────────────┘
          │                 │                    │
          ▼                 ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND API (Django REST)                 │
│                        :8000                                │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────┐ ┌───────┐ ┌─────────┐ │
│  │   Auth   │ │  Cases   │ │Alerts│ │  SOS  │ │  Audit  │ │
│  │  (JWT)   │ │  CRUD    │ │Draft/│ │Assign/│ │  Logs   │ │
│  │  + OTP   │ │ +Review  │ │Approv│ │Route  │ │         │ │
│  └──────────┘ └──────────┘ └──────┘ └───────┘ └─────────┘ │
│                       │                                     │
│                       ▼                                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │   PostgreSQL (prod) / SQLite (dev)                     │ │
│  │   Tables: staff_accounts, citizens, cases,             │ │
│  │           alerts, delivery_logs, audit_logs            │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────┬───────────────────────────────────┘
                          │  AI proxy calls
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   AI SERVICE (FastAPI)                       │
│                       :8088                                 │
│                                                             │
│  ┌────────┐  ┌────────┐  ┌───────┐  ┌───────┐  ┌───────┐  │
│  │ Triage │  │  Draft │  │Summary│  │  Rank │  │Assist │  │
│  │        │  │        │  │       │  │       │  │(Chat) │  │
│  └────────┘  └────────┘  └───────┘  └───────┘  └───────┘  │
│                       │                                     │
│                       ▼                                     │
│          Groq  /  OpenRouter  /  Cerebras                   │
│           (LLM providers with failover)                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Backend API** | Python, Django, Django REST Framework | Python 3.14, Django 5.x |
| **Database** | PostgreSQL (prod) / SQLite (dev) | Postgres 16 |
| **Authentication** | JWT (PyJWT), 2FA via email OTP | - |
| **Web Frontend** | React, TypeScript, Vite, Tailwind CSS v4 | React 19 |
| **UI Components** | Radix UI, shadcn/ui, Lucide icons | - |
| **State/Routing** | React Router v8, TanStack React Query & Table | - |
| **AI Service** | Python, FastAPI, Uvicorn | FastAPI 0.115+ |
| **LLM Providers** | Groq, OpenRouter, Cerebras (failover chain) | - |
| **Mobile** | Flutter (Dart) | Flutter 3.x |
| **Deployment** | Docker Compose, Render.com Blueprint | - |
| **Email** | Django SMTP (Gmail App Password) | - |
| **Admin Panel** | Django Admin + Jazzmin theme | - |

---

## 4. Service Components

### 4.1 Backend API (Django)

**Location:** `backend/`
**Port:** `8000`
**Entry point:** `manage.py runserver`

The Django backend serves the REST API for all clients. Key modules:

| Module | File | Purpose |
|--------|------|---------|
| **Models** | `alerts_api/models.py` | 6 database models (see §5) |
| **Views** | `alerts_api/views.py` | All REST endpoints — auth, cases, alerts, SOS, audit |
| **Serializers** | `alerts_api/serializers.py` | Request validation for every endpoint |
| **Authentication** | `alerts_api/authentication.py` | JWT Bearer token authentication middleware |
| **Security** | `alerts_api/security.py` | Token signing/verification, OTP generation, Fayda ID hashing |
| **Passwords** | `alerts_api/passwords.py` | Argon2/bcrypt hashing, temp password generation |
| **Roles** | `alerts_api/roles.py` | Canonical role definitions, legacy alias mapping, JWT role mapping |
| **Permissions** | `alerts_api/permissions.py` | `IsAuthenticatedJWT` DRF permission class |
| **Mailer** | `alerts_api/mailer.py` | HTML email templates for OTP, credentials, alerts |
| **OTP Store** | `alerts_api/otp_store.py` | In-memory (dev) or Redis (prod) OTP challenge storage |
| **AI Proxy** | `alerts_api/ai_proxy.py` | Proxies AI requests from web → AI service with service key auth |
| **AI Client** | `alerts_api/ai_client.py` | HTTP client for AI service calls |
| **Throttling** | `alerts_api/throttling.py` | Rate limiting for auth endpoints |
| **Settings** | `config/settings.py` | Django configuration (DB, CORS, middleware, email) |

**Management Commands:**

| Command | Purpose |
|---------|---------|
| `python manage.py bootstrap_demo_staff` | Seed all 6 demo staff accounts (password: `change-me`) |
| `python manage.py bootstrap_admin` | Create the initial super admin account |
| `python manage.py migrate` | Apply database migrations |

---

### 4.2 Web Frontend (React)

**Location:** `frontend(web)/`
**Port:** `5173` (Vite dev server)
**Build:** `npm run build` → `dist/`

A single-page React application providing the **Operations Console** for INSA staff and partner organizations.

#### Feature Modules

| Feature | Directory | Pages |
|---------|-----------|-------|
| **Auth** | `features/auth/` | `LoginPage` (2FA), `ChangePasswordPage`, `SessionTimeout`, `AuthProvider` |
| **INSA Command** | `features/insa-command/` | `CommandDashboardPage` — operational KPI overview |
| **Case Triage** | `features/insa-cases/` | `CaseReviewQueuePage` — review, verify, reject, clarify submitted incidents |
| **Alert Composer** | `features/insa-alerts/` | `AlertComposerPage` — draft public alerts from verified cases |
| **Approval Queue** | `features/insa-approvals/` | `ApprovalQueuePage` — Tier-2 officer approval before dispatch |
| **Dispatch Monitor** | `features/insa-dispatch/` | `DispatchMonitorPage` — live broadcast telemetry |
| **SOS Operations** | `features/insa-sos/` | `SosOperationsPage` — manage citizen SOS tickets |
| **Staff Management** | `features/insa-management/` | `StaffPage`, `StaffForm`, `OrganizationsPage`, `SettingsPage`, `AuditLogPage` |
| **Reports** | `features/insa-reports/` | `ReportsAnalyticsPage` — charts and metrics |
| **Resource Portal** | `features/resource-portal/` | `CaseDashboardPage`, `CaseFormPage`, `CaseDetailPage`, `OrgOutcomesPage`, `OrgSosInboxPage`, `OrgAdminPage` |
| **AI Assistant** | `features/ai/` | `EthioAlertAiAssistant` — floating chat widget with role-aware prompts |
| **Theme** | `features/theme/` | `ThemeToggle`, `appearance.ts` — dim/bright mode toggle |
| **Realtime** | `features/realtime/` | `RealtimeProvider` — WebSocket/polling bus for live updates |

#### Shared Packages

| Package | Path | Contents |
|---------|------|----------|
| **Core Permissions** | `packages/core/permissions/matrix.ts` | Single source of truth for roles, permissions, RBAC matrix |
| **UI Kit** | `packages/ui/` | `DataTable`, `StatusBadge` reusable components |

#### API Layer (Dual-Mode)

The frontend supports **two modes** controlled by `VITE_API_BASE` environment variable:

- **Mock mode** (default, no backend needed): All `src/api/mock*.ts` files provide in-memory data for every feature.
- **Live mode** (with backend running): All `src/api/live*.ts` files make real HTTP calls to the Django API.

| File | Mock / Live | Purpose |
|------|-------------|---------|
| `mockAccounts.ts` | Mock | Hardcoded user accounts for login |
| `mockCases.ts` | Mock | Sample incident case data |
| `mockAlerts.ts` | Mock | Sample alert data |
| `mockSos.ts` | Mock | Sample SOS tickets |
| `mockAdmin.ts` | Mock | Staff CRUD operations |
| `mockAudit.ts` | Mock | Audit log entries |
| `liveAuth.ts` | Live | Real JWT auth + OTP |
| `liveCases.ts` | Live | Real case CRUD |
| `liveAlerts.ts` | Live | Real alert draft/approve/dispatch |
| `liveSos.ts` | Live | Real SOS operations |
| `liveAudit.ts` | Live | Real audit log fetch |
| `liveAi.ts` | Live | Real AI assistant/triage/draft |
| `config.ts` | Both | Detects which mode to use |
| `client.ts` | Both | Shared `apiFetch` wrapper with token injection |

---

### 4.3 AI Service (FastAPI)

**Location:** `Ai/`
**Port:** `8088`
**Entry point:** `uvicorn app.main:app`

A standalone microservice that provides AI-powered intelligence to the platform.

#### Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/ai/health` | GET | Health check |
| `/ai/triage` | POST | Classify incident: category, severity, summary, confidence score |
| `/ai/draft` | POST | Draft a public alert in English + Amharic (full + SMS-length) |
| `/ai/summary` | POST | Summarize a case into key points |
| `/ai/rank` | POST | Rank multiple items by urgency/severity |
| `/ai/assist` | POST | Role-aware chat assistant |

#### AI Pipeline

1. **Input sanitization** — PII scrubbing (phone, email, Fayda ID, names) via regex
2. **Mode selection** — `live` (LLM → cache → rules), `demo` (cache → LLM → rules), `offline` (cache → rules)
3. **LLM provider chain** — Tries providers in order (Groq → OpenRouter → Cerebras) with automatic failover
4. **Response validation** — Pydantic schema enforcement on all LLM outputs
5. **Rule-based fallback** — Keyword-based classification when all LLM providers are unavailable

#### Key Files

| File | Purpose |
|------|---------|
| `app/main.py` | FastAPI app, endpoint routing, auth middleware |
| `app/llm.py` | LLM provider abstraction, failover, PII scrubbing |
| `app/prompts.py` | System prompts for each AI task |
| `app/schemas.py` | Pydantic models for request/response validation |
| `app/rules.py` | Rule-based fallback classification |
| `app/startup.py` | Environment validation on boot |
| `data/demo_cache.json` | Pre-computed responses for demo/offline mode |

---

### 4.4 Mobile App (Flutter)

**Location:** `mobile/`
**Platform:** Android (tested on Samsung SM-M135FU)

The citizen-facing mobile app provides:

| Screen | File | Purpose |
|--------|------|---------|
| **Intro** | `screens/intro_screen.dart` | Onboarding walkthrough for first-time users |
| **Login** | `screens/login_screen.dart` | Phone + Fayda ID verification → JWT token |
| **Home** | `screens/home_shell.dart` | Main shell with navigation — alerts feed, SOS, profile |
| **SOS** | `screens/sos_screen.dart` | Emergency distress signal with location + case type |

#### Mobile API Client

| File | Purpose |
|------|---------|
| `api/ethio_api.dart` | Singleton HTTP client — auth, alerts, SOS, case submission |
| `config.dart` | API base URL configuration |
| `theme/ethio_theme.dart` | Material theme (dark teal EthioAlert branding) |
| `utils/ai_text.dart` | AI-generated safety tips and contextual text |
| `widgets/` | Reusable UI components (nav icons, AI message bubbles) |

#### Mobile Auth Flow

1. User enters phone number → `POST /api/v1/auth/phone/verify` → OTP sent via SMS
2. User enters OTP → `POST /api/v1/auth/phone/confirm` → JWT access token
3. Token stored in `SharedPreferences`, attached to all subsequent API calls

---

## 5. Database Schema

```
┌──────────────────┐       ┌──────────────────┐
│  staff_accounts  │       │     citizens     │
├──────────────────┤       ├──────────────────┤
│ id (PK)          │       │ id (PK)          │
│ username (unique)│       │ phone (unique)   │
│ email            │       │ fayda_id_hash    │
│ full_name        │       │ registered_region│
│ phone            │       │ device_token     │
│ role (enum)      │       │ language         │
│ organization     │       │ created_at       │
│ password_hash    │       └────────┬─────────┘
│ must_change_pwd  │                │
│ pwd_change_token │                │ reporter_id (FK)
│ is_active        │                │
│ last_login_at    │                ▼
│ created_at       │       ┌──────────────────┐
│ updated_at       │       │      cases       │
└──────────────────┘       ├──────────────────┤
                           │ id (PK)          │
                           │ reporter_id (FK) │──→ citizens
                           │ organization     │
                           │ source (org/sos) │
                           │ assigned_org     │
                           │ case_type        │
                           │ severity         │
                           │ description      │
                           │ region           │
                           │ lat / lng        │
                           │ title            │
                           │ created_by       │
                           │ review_comment   │
                           │ org_response     │
                           │ status           │
                           │ created_at       │
                           │ updated_at       │
                           └────────┬─────────┘
                                    │ case_id (FK)
                                    ▼
                           ┌──────────────────┐
                           │     alerts       │
                           ├──────────────────┤
                           │ id (PK)          │
                           │ case_id (FK)     │──→ cases
                           │ reviewer_id      │
                           │ approver_id      │
                           │ title            │
                           │ message          │
                           │ severity         │
                           │ region           │
                           │ channels (JSON)  │
                           │ status           │
                           │ created_at       │
                           │ approved_at      │
                           │ dispatched_at    │
                           └────────┬─────────┘
                                    │ alert_id (FK)
                                    ▼
                           ┌──────────────────┐
                           │  delivery_logs   │
                           ├──────────────────┤
                           │ id (PK)          │
                           │ alert_id (FK)    │──→ alerts
                           │ citizen_id (FK)  │──→ citizens
                           │ channel          │
                           │ status           │
                           │ created_at       │
                           └──────────────────┘

                           ┌──────────────────┐
                           │   audit_logs     │
                           ├──────────────────┤
                           │ id (PK)          │
                           │ actor            │
                           │ action           │
                           │ resource         │
                           │ ip_address       │
                           │ metadata (JSON)  │
                           │ created_at       │
                           └──────────────────┘
```

---

## 6. Role-Based Access Control (RBAC)

### Role Definitions (6 roles)

| Role | Label | Scope | Home Page |
|------|-------|-------|-----------|
| `ADMINISTRATOR` | Administrator (INSA) | Full system control — cases, alerts, SOS, staff, orgs, settings, audit | `/insa/dashboard` |
| `HIGHER_OFFICER` | Higher Officer (Tier-2 Approver) | Alert approval, case view, audit, reports | `/insa/approvals` |
| `DISPATCHER` | Emergency Dispatcher (SOS) | SOS operations only | `/insa/sos` |
| `AUDITOR` | Compliance Auditor (INSA) | Read-only audit logs, reports, case/alert/SOS view | `/insa/audit` |
| `ORG_ADMIN` | Organization Administrator | Org incidents, SOS inbox, manage own officers | `/resource/dashboard` |
| `ORG_OFFICER` | Organization Officer | Submit incidents, respond to SOS tickets | `/resource/dashboard` |

### Permission Matrix

| Permission | ADMINISTRATOR | HIGHER_OFFICER | DISPATCHER | AUDITOR | ORG_ADMIN | ORG_OFFICER |
|------------|:---:|:---:|:---:|:---:|:---:|:---:|
| `case.create` | | | | | ✅ | ✅ |
| `case.view_all` | ✅ | ✅ | | ✅ | | |
| `case.view_own` | | | | | ✅ | ✅ |
| `case.verify / reject / clarify` | ✅ | | | | | |
| `case.merge` | ✅ | | | | | |
| `alert.compose` | ✅ | | | | | |
| `alert.submit_tier1` | ✅ | | | | | |
| `alert.approve_tier2` | ✅ | ✅ | | | | |
| `alert.dispatch` | ✅ | | | | | |
| `alert.view` | ✅ | ✅ | | ✅ | ✅ | ✅ |
| `sos.view / assign / update` | ✅ | | ✅ | | ✅ | ✅ |
| `sos.escalate` | ✅ | | ✅ | | ✅ | ✅ |
| `sos.reveal_identity` | ✅ | | ✅ | | | |
| `org.manage` | ✅ | | | | | |
| `org.manage_own_officers` | | | | | ✅ | |
| `staff.manage` | ✅ | | | | | |
| `settings.manage` | ✅ | | | | | |
| `audit.view` | ✅ | ✅ | | ✅ | | |
| `reports.view_national` | ✅ | ✅ | | ✅ | | |
| `reports.view_org` | | | | | ✅ | |

### Legacy Alias Mapping

Old role strings are automatically normalized:

| Legacy alias | Maps to |
|-------------|---------|
| `system_admin`, `SUPER_ADMIN` | `ADMINISTRATOR` |
| `admin` | `ADMINISTRATOR` |
| `higher_officer` | `HIGHER_OFFICER` |
| `dispatcher` | `DISPATCHER` |
| `auditor` | `AUDITOR` |
| `org_admin` | `ORG_ADMIN` |
| `provider` | `ORG_OFFICER` |

---

## 7. Authentication Flow

### Staff Login (Web Console) — Two-Factor

```
   Browser                        Django API                    Email (SMTP)
     │                               │                             │
     │  POST /auth/staff/login       │                             │
     │  { username, password }       │                             │
     │──────────────────────────────▶│                             │
     │                               │  verify password hash       │
     │                               │  generate 6-digit OTP       │
     │                               │  store challenge (5 min)    │
     │                               │                             │
     │                               │  send OTP email ───────────▶│
     │                               │                             │
     │  200 { challenge_id,          │                             │
     │        email_hint }           │                             │
     │◀──────────────────────────────│                             │
     │                               │                             │
     │  POST /auth/staff/verify-otp  │                             │
     │  { challenge_id, code }       │                             │
     │──────────────────────────────▶│                             │
     │                               │  verify OTP                 │
     │                               │  issue JWT (30 min)         │
     │                               │  write audit log            │
     │                               │                             │
     │  200 { access_token,          │                             │
     │        user: { role, ... } }  │                             │
     │◀──────────────────────────────│                             │
```

### Citizen Login (Mobile App)

```
   Mobile App                     Django API
     │                               │
     │  POST /auth/phone/verify      │
     │  { phone: "+251..." }         │
     │──────────────────────────────▶│
     │                               │  hash Fayda ID
     │                               │  generate OTP
     │                               │  (send via SMS gateway)
     │                               │
     │  200 { otp_sent: true }       │
     │◀──────────────────────────────│
     │                               │
     │  POST /auth/phone/confirm     │
     │  { phone, otp, device_token } │
     │──────────────────────────────▶│
     │                               │  verify OTP
     │                               │  upsert Citizen record
     │                               │  issue JWT
     │                               │
     │  200 { access_token }         │
     │◀──────────────────────────────│
```

---

## 8. Core Workflows

### 8.1 Incident Case Lifecycle

```
  Partner Org                INSA Administrator         Higher Officer
     │                            │                          │
     │  Submit incident           │                          │
     │  (case_type, severity,     │                          │
     │   description, region)     │                          │
     │───────────────────────────▶│                          │
     │                            │                          │
     │                   ┌────────┴────────┐                 │
     │                   │  Triage case    │                 │
     │                   │  (AI assists)   │                 │
     │                   └────────┬────────┘                 │
     │                            │                          │
     │                   ┌────────┴────────┐                 │
     │                   │  Decision:      │                 │
     │                   │  • verify ✅     │                 │
     │                   │  • reject ❌     │                 │
     │                   │  • clarify ❓    │                 │
     │                   └────────┬────────┘                 │
     │                            │                          │
     │  ◀─── needs_clarification ─┤                          │
     │       (org resubmits)      │                          │
     │                            │                          │
     │                   verified │                          │
     │                            ▼                          │
     │                   Compose public alert ──────────────▶│
     │                   (AI drafts EN + AM)                 │
     │                                              Approve / Reject
     │                                                       │
     │                            ◀──────── approved ────────┤
     │                            │                          │
     │                   Dispatch to citizens                 │
     │                   (push + SMS + voice)                │
```

**Case statuses:** `submitted` → `under_review` → `verified` / `rejected` / `needs_clarification` → `approved` → `broadcast`

### 8.2 Alert Approval & Dispatch

1. **Compose** — `ADMINISTRATOR` creates an alert draft from a verified case (`POST /alerts/draft`)
2. **Tier-1 Submit** — Alert status changes to `pending_approval`
3. **Tier-2 Approve** — `HIGHER_OFFICER` reviews and approves (`POST /alerts/{id}/approve`)
4. **Dispatch** — `ADMINISTRATOR` triggers broadcast (`POST /alerts/broadcast`):
   - Query all citizens in the alert's region
   - Create `DeliveryLog` entries for each citizen × channel (push, sms, voice)
   - Write audit log entry
   - Return recipient count

**Alert statuses:** `draft` → `pending_approval` → `approved` → `dispatched`

### 8.3 SOS Emergency Pipeline

```
  Citizen (Mobile)        INSA Dispatcher           Partner Org
       │                        │                        │
       │  SOS distress signal   │                        │
       │  (type, location)      │                        │
       │───────────────────────▶│                        │
       │                        │                        │
       │                 Auto-route by type:             │
       │                 fire → Fire Authority           │
       │                 health → Ministry of Health     │
       │                 flood → Disaster Risk Mgmt     │
       │                 accident → Traffic Police       │
       │                        │                        │
       │                 Assign to org ─────────────────▶│
       │                        │                        │
       │                        │            Acknowledge │
       │                        │◀───────────────────────│
       │                        │                        │
       │                        │            Respond or  │
       │                        │            Return to   │
       │                        │            INSA        │
       │                        │◀───────────────────────│
       │                        │                        │
       │            Update status (resolved/escalated)   │
       │◀───────────────────────│                        │
```

**SOS statuses:** `new` → `assigned` → `acknowledged` → `resolved` / `returned_to_insa`

---

## 9. API Endpoints

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/auth/phone/verify` | Public | Start citizen phone verification |
| POST | `/api/v1/auth/phone/confirm` | Public | Confirm phone OTP → JWT |
| POST | `/api/v1/auth/staff/login` | Public | Staff username + password → OTP challenge |
| POST | `/api/v1/auth/staff/verify-otp` | Public | Confirm staff OTP → JWT |
| POST | `/api/v1/auth/change-password` | JWT | Change or reset password |

### Cases

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/cases` | JWT | List cases (filtered by role) |
| POST | `/api/v1/cases` | JWT | Create a new incident case |
| GET | `/api/v1/cases/{id}` | JWT | Get case detail |
| PUT | `/api/v1/cases/{id}` | JWT | Update case |
| POST | `/api/v1/cases/{id}/review` | JWT | Review: verify / reject / clarify |
| POST | `/api/v1/cases/{id}/resubmit` | JWT | Resubmit after clarification request |

### Alerts

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/alerts` | JWT | List all alerts |
| GET | `/api/v1/alerts/mine` | JWT | Citizen's regional alerts |
| POST | `/api/v1/alerts/draft` | JWT | Create alert draft from case |
| GET | `/api/v1/alerts/{id}` | JWT | Get alert detail |
| POST | `/api/v1/alerts/{id}/approve` | JWT | Tier-2 approval |
| POST | `/api/v1/alerts/broadcast` | JWT | Dispatch approved alert |

### SOS

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/sos` | JWT | List SOS tickets |
| POST | `/api/v1/sos/submit` | JWT | Submit SOS distress signal |
| POST | `/api/v1/sos/{id}/acknowledge` | JWT | Org acknowledges receipt |
| POST | `/api/v1/sos/{id}/return-to-insa` | JWT | Return ticket to INSA |
| POST | `/api/v1/sos/{id}/assign` | JWT | Assign to organization |
| PUT | `/api/v1/sos/{id}/status` | JWT | Update SOS status |

### Staff & Admin

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/staff` | JWT | Create new staff account |
| GET | `/api/v1/audit` | JWT | Fetch audit log entries |

### AI (proxied through backend)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/ai/assist` | JWT | AI chat assistant |
| POST | `/api/v1/ai/triage` | JWT | AI incident triage |
| POST | `/api/v1/ai/draft` | JWT | AI alert draft (EN + AM) |
| POST | `/api/v1/ai/summary` | JWT | AI case summary |
| POST | `/api/v1/ai/rank` | JWT | AI severity ranking |

---

## 10. Frontend Page Map

| Route | Page | Roles |
|-------|------|-------|
| `/login` | Login (2FA) | Public |
| `/change-password` | Force password change | Any authenticated |
| `/insa/dashboard` | Command Dashboard | ADMINISTRATOR, HIGHER_OFFICER |
| `/insa/cases` | Case Review Queue | ADMINISTRATOR, HIGHER_OFFICER, AUDITOR |
| `/insa/alerts` | Alert Composer | ADMINISTRATOR |
| `/insa/approvals` | Tier-2 Approval Queue | HIGHER_OFFICER |
| `/insa/dispatch/:id` | Live Broadcast Monitor | ADMINISTRATOR, HIGHER_OFFICER |
| `/insa/sos` | SOS Operations Feed | DISPATCHER, ADMINISTRATOR, HIGHER_OFFICER, AUDITOR |
| `/insa/staff` | Staff Account Management | ADMINISTRATOR |
| `/insa/organizations` | Organization Management | ADMINISTRATOR |
| `/insa/settings` | System Settings | ADMINISTRATOR |
| `/insa/reports` | Reports & Analytics | ADMINISTRATOR, AUDITOR, HIGHER_OFFICER |
| `/insa/audit` | Audit Log | AUDITOR, ADMINISTRATOR, HIGHER_OFFICER |
| `/resource/dashboard` | Org Case Dashboard | ORG_ADMIN, ORG_OFFICER |
| `/resource/cases/new` | Submit Incident | ORG_ADMIN, ORG_OFFICER |
| `/resource/cases/:id` | Case Detail | ORG_ADMIN, ORG_OFFICER |
| `/resource/outcomes` | Case Outcomes | ORG_ADMIN, ORG_OFFICER |
| `/resource/sos` | SOS Inbox | ORG_ADMIN, ORG_OFFICER |
| `/resource/org-admin` | Manage Officers | ORG_ADMIN |

---

## 11. AI Capabilities

| Feature | Endpoint | Input | Output |
|---------|----------|-------|--------|
| **Triage** | `/ai/triage` | Case description + region | Category, severity, summary, confidence (0–1), reasoning |
| **Alert Draft** | `/ai/draft` | Verified case details | English body, Amharic body, SMS English (160 chars), SMS Amharic |
| **Summary** | `/ai/summary` | Case or alert text | Executive summary + key bullet points |
| **Rank** | `/ai/rank` | List of items (cases, alerts) | Priority-ordered list with reasoning |
| **Assistant** | `/ai/assist` | Role + user message + context | Role-tailored response (safety, procedure, policy) |

**Safety guardrails:**
- PII scrubbing before LLM calls (phone numbers, emails, names, Fayda IDs, URLs)
- No LLM-generated content is auto-dispatched — human approval required at every stage
- Rule-based fallback when all LLM providers are down
- Demo cache for consistent offline behavior

---

## 12. Deployment

### Production (Docker Compose)

```bash
# In project root
cp .env.production.example .env
# Fill in all secrets in .env
docker compose -f docker-compose.prod.yml up -d --build
```

Services:
- **db** — PostgreSQL 16
- **redis** — Redis 7 (OTP + session store)
- **ai** — FastAPI AI service on port 8088
- **api** — Django API on port 8000
- Frontend built as static and served via CDN or nginx

### Render.com (Free Tier)

The `render.yaml` blueprint deploys two services:
- `ethioalert-ai` — AI service (Docker, free tier)
- `ethioalert-api` — Django API (Docker, free tier)

---

## 13. How to Run (Development)

### Prerequisites

- Python 3.12+ (3.14 used in this project)
- Node.js 20+ and npm
- Flutter SDK (for mobile)
- Git

### Step 1: Backend API (Terminal 1)

```bash
cd backend

# Create virtual environment (first time only)
python3 -m venv .venv

# Activate it
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure .env (already set up for dev defaults)
# Edit backend/.env if needed

# Run migrations
python manage.py migrate

# Seed demo staff accounts (password: change-me for all)
python manage.py bootstrap_demo_staff

# Start the API server
python manage.py runserver 0.0.0.0:8000
```

### Step 2: AI Service (Terminal 2)

```bash
cd Ai

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure Ai/.env with your LLM API keys
# GROQ_API_KEY and/or OPENROUTER_API_KEY required for live AI

# Start the AI service
uvicorn app.main:app --host 0.0.0.0 --port 8088 --reload
```

### Step 3: Web Frontend (Terminal 3)

```bash
cd "frontend(web)"

# Install dependencies (first time)
npm install

# Start Vite dev server
npm run dev
```

The web app opens at **http://localhost:5173**

#### Mock mode vs Live mode

- **Without** the backend running → web works in **mock mode** with sample data
- **With** the backend running → set `VITE_API_BASE=http://localhost:8000/api/v1` in `frontend(web)/.env.local` to use **live mode**

### Step 4: Mobile App (Terminal 4, optional)

```bash
cd mobile

# Get dependencies
flutter pub get

# Connect Android device via USB or start emulator

# Run the app
flutter run

# Or specify device
flutter run -d <device-id>
```

Configure the backend URL in `mobile/lib/config.dart`.

### Quick Test

1. Open **http://localhost:5173** in your browser
2. Log in with any demo account (see §14)
3. For mock mode, 2FA code is always `123456`

---

## 14. Demo Accounts

### Credentials Quick Reference

> [!IMPORTANT]
> **One-Time First Login OTP**: 
> Verification code (OTP/2FA) is required **only on the first login** for each account.
> Once verified, when users log out and log in again, they sign in directly with their username and password without being prompted for OTP again.
> 
> **Mock mode** (default, no backend needed): Password = `Password123!` · First login 2FA Code = `123456`
> **Live mode** (Django backend running): Password = `change-me` · First login 2FA Code sent via email / on-screen debug OTP

### All Demo Accounts with Passwords

| # | Username | Password (Mock) | Password (Live) | Role | Label | Organization | 2FA Code (1st Login Only) |
|---|----------|----------------|-----------------|------|-------|-------------|----------------------------|
| 1 | `admin1` | `Password123!` | `change-me` | ADMINISTRATOR | Administrator (INSA) | INSA | `123456` |
| 2 | `officer1` | `Password123!` | `change-me` | HIGHER_OFFICER | Higher Officer (Tier-2 Approver) | INSA | `123456` |
| 3 | `dispatcher1` | `Password123!` | `change-me` | DISPATCHER | Emergency Dispatcher (SOS) | INSA | `123456` |
| 4 | `auditor1` | `Password123!` | `change-me` | AUDITOR | Compliance Auditor | INSA | `123456` |
| 5 | `orgadmin1` | `Password123!` | `change-me` | ORG_ADMIN | Organization Administrator | Fire & Emergency Authority | `123456` |
| 6 | `provider1` | `Password123!` | `change-me` | ORG_OFFICER | Organization Officer | Fire & Emergency Authority | `123456` |

### Email Configuration & OTP Delivery

The backend supports two modes for delivering the first-time login verification codes:

1. **Development Console Mode (Recommended for Local Dev - Zero Setup)**:
   In `backend/.env`:
   ```env
   EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
   ```
   When set to `console.EmailBackend`, Django prints the OTP directly to the terminal running `python manage.py runserver`, and in DEBUG mode the OTP is also available on-screen.

2. **Real SMTP Mode (Gmail)**:
   In `backend/.env`:
   ```env
   STAFF_FALLBACK_OTP_EMAIL=your-real-email@gmail.com
   DEFAULT_FROM_EMAIL=your-real-email@gmail.com
   EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USE_TLS=true
   EMAIL_HOST_USER=your-real-email@gmail.com
   EMAIL_HOST_PASSWORD=xxxx-xxxx-xxxx-xxxx   # 16-character Google App Password (not your normal password)
   ```
   > [!NOTE]
   > If you see `yo***@gmail.com`, that was the placeholder `your-gmail@gmail.com` masked by the privacy filter.
   > The error `Connection unexpectedly closed` happens when placeholder credentials (`your-gmail-app-password`) attempt to connect to Gmail SMTP. Updating `backend/.env` with your real email and App Password (or switching to `console.EmailBackend`) resolves this.

### Role Descriptions & Access Summary

| Role | What They Can Do |
|------|-----------------|
| **ADMINISTRATOR** | Full system access — manage users, approve/reject alerts, configure settings, view audit logs, access all modules |
| **HIGHER_OFFICER** | Tier-2 approval of drafted alerts before public dispatch, review escalated cases |
| **DISPATCHER** | Handle SOS distress signals, manage emergency response routing, monitor live dispatch |
| **AUDITOR** | Read-only access to audit logs, compliance reports, system activity monitoring |
| **ORG_ADMIN** | Manage their organization's officers, view organization-scoped reports and alerts |
| **ORG_OFFICER** | Submit incident reports, view organization resources, respond to community alerts |

### How to Log In

1. Open `http://localhost:5173` (or your configured port)
2. Enter a **username** and **password** from the table above
3. Enter the **2FA code**: `123456` (mock mode) or check the configured email (live mode)
4. You will be redirected to the dashboard for that role

---

## 15. Project File Structure

```
National-emergency-alert-system/
├── backend/                          # Django REST API
│   ├── alerts_api/                   # Main Django app
│   │   ├── models.py                 # 6 database models
│   │   ├── views.py                  # All REST endpoints
│   │   ├── serializers.py            # Request validation
│   │   ├── authentication.py         # JWT middleware
│   │   ├── security.py               # Token signing, OTP, hashing
│   │   ├── passwords.py              # Password hashing utilities
│   │   ├── roles.py                  # Role definitions & aliases
│   │   ├── permissions.py            # DRF permission classes
│   │   ├── mailer.py                 # Email templates (OTP, creds)
│   │   ├── otp_store.py              # OTP challenge storage
│   │   ├── ai_proxy.py               # AI request proxy
│   │   ├── ai_client.py              # AI HTTP client
│   │   ├── throttling.py             # Rate limiting
│   │   ├── admin.py                  # Django admin registration
│   │   ├── urls.py                   # URL routing
│   │   ├── management/commands/      # Management commands
│   │   │   ├── bootstrap_admin.py    # Initial admin setup
│   │   │   └── bootstrap_demo_staff.py # Seed demo accounts
│   │   ├── migrations/               # Database migrations
│   │   └── templates/                # Email HTML templates
│   ├── config/                       # Django project settings
│   │   ├── settings.py               # Main configuration
│   │   ├── urls.py                   # Root URL config
│   │   └── wsgi.py / asgi.py         # WSGI/ASGI entry
│   ├── .env                          # Environment variables
│   ├── requirements.txt              # Python dependencies
│   ├── manage.py                     # Django CLI
│   └── Dockerfile                    # Production container
│
├── frontend(web)/                    # React SPA (Vite + TypeScript)
│   ├── src/
│   │   ├── api/                      # Mock + live API modules
│   │   ├── components/               # Shared UI components
│   │   │   └── ui/                   # shadcn/ui primitives
│   │   ├── features/                 # Feature modules
│   │   │   ├── auth/                 # Login, 2FA, session
│   │   │   ├── ai/                   # AI chat assistant
│   │   │   ├── insa-command/         # Command dashboard
│   │   │   ├── insa-cases/           # Case review queue
│   │   │   ├── insa-alerts/          # Alert composer
│   │   │   ├── insa-approvals/       # Tier-2 approval
│   │   │   ├── insa-dispatch/        # Broadcast monitor
│   │   │   ├── insa-sos/             # SOS operations
│   │   │   ├── insa-management/      # Staff, orgs, settings, audit
│   │   │   ├── insa-reports/         # Analytics
│   │   │   ├── resource-portal/      # Partner org pages
│   │   │   ├── theme/                # Dark/bright toggle
│   │   │   └── realtime/             # Live update bus
│   │   ├── layouts/AppShell.tsx       # Main app shell + sidebar
│   │   ├── routes/AppRoutes.tsx       # Route definitions
│   │   ├── packages/core/            # Shared permissions matrix
│   │   ├── types/                    # TypeScript type defs
│   │   ├── lib/                      # Utilities
│   │   ├── index.css                 # Global styles + theme
│   │   ├── App.tsx                   # Root component
│   │   └── main.tsx                  # Vite entry point
│   ├── public/                       # Static assets
│   │   ├── ethioalert-logo-dark.png  # Logo (transparent, dark-ready)
│   │   └── favicon.svg               # Browser icon
│   ├── package.json                  # NPM dependencies
│   ├── vite.config.ts                # Vite configuration
│   └── tsconfig.json                 # TypeScript config
│
├── Ai/                               # FastAPI AI microservice
│   ├── app/
│   │   ├── main.py                   # FastAPI app + endpoints
│   │   ├── llm.py                    # LLM provider chain + PII scrub
│   │   ├── prompts.py                # System prompts per task
│   │   ├── schemas.py                # Pydantic models
│   │   ├── rules.py                  # Rule-based fallback
│   │   └── startup.py                # Environment validation
│   ├── data/demo_cache.json          # Pre-cached AI responses
│   ├── .env                          # AI env vars + API keys
│   ├── requirements.txt              # Python dependencies
│   └── Dockerfile                    # Production container
│
├── mobile/                           # Flutter mobile app
│   ├── lib/
│   │   ├── main.dart                 # App entry + bootstrap
│   │   ├── api/ethio_api.dart        # HTTP client singleton
│   │   ├── config.dart               # API base URL
│   │   ├── screens/                  # App screens
│   │   ├── theme/ethio_theme.dart    # Material theme
│   │   ├── utils/                    # AI text helpers
│   │   └── widgets/                  # Reusable widgets
│   ├── android/                      # Android platform code
│   ├── ios/                          # iOS platform code
│   └── pubspec.yaml                  # Flutter dependencies
│
├── packages/                         # Shared monorepo packages
│   └── core/src/permissions/         # Permission matrix (source of truth)
│       └── matrix.ts
│
├── docker-compose.prod.yml           # Production Docker stack
├── render.yaml                       # Render.com deploy blueprint
├── README.md                         # Project readme
├── implementation.md                 # This file
└── .env.production.example           # Production env template
```

---

> **Built for Ethiopia's safety. Every alert saves lives.**
