# National Emergency Alert & Citizen Safety System (EthioAlert)

Production-grade web operations portals for the **Information Network Security Administration (INSA)** and partner **Resource Organizations**. Built in React 18, TypeScript, Tailwind CSS, and shadcn/ui with a crisis operations center aesthetic.

---

## 1. Quick Start

Ensure Node.js 20+ is installed.

```bash
# Navigate to web application directory
cd "frontend(web)"

# Install dependencies
npm install

# Start development server
npm run dev
# -> Local app will run at http://localhost:5173

# Run unit and integration tests
npm test

# Build production bundle
npm run build
```

---

## 2. Demo Accounts (7 Operational Roles)

All accounts share the default password: **`Password123!`**  
All two-factor verification steps and sensitive action step-ups accept code: **`123456`**

| Role Identifier | Username | Name | Organization | Landing Console |
| :--- | :--- | :--- | :--- | :--- |
| `SUPER_ADMIN` | `sysadmin1` | Marta Haile | INSA | `/insa/dashboard` (Full admin console) |
| `ADMINISTRATOR` | `admin1` | Tewodros Kassahun | INSA | `/insa/dashboard` (Triage & alert compose) |
| `HIGHER_OFFICER` | `officer1` | Hanna Bekele | INSA | `/insa/approvals` (Tier-2 cryptographic approval) |
| `DISPATCHER` | `dispatcher1` | Dawit Alemu | INSA | `/insa/sos` (Isolated SOS view) |
| `AUDITOR` | `auditor1` | Yonas Girma | INSA | `/insa/audit` (Read-only compliance audit) |
| `ORG_ADMIN` | `orgadmin1` | Selam Tesfaye | Fire & Emergency Authority | `/resource/dashboard` (Officer management) |
| `ORG_OFFICER` | `provider1` | Abebe Kebede | Fire & Emergency Authority | `/resource/dashboard` (Incident submission) |
| `CITIZEN` | `citizen1` | Biruk Lemma | None | Stays on login: *"Please use the mobile app"* |

| Address | Page | Roles |
|---|---|---|
| /login | Sign in (username, password, 2FA) | Everyone |
| /resource/dashboard | Case list | provider, org_admin |
| /resource/cases/new | New case form (save as draft or submit) | provider, org_admin |
| /resource/cases/:caseId | Case detail: INSA decision, delivery summary, messages, update and all clear, resubmit | provider, org_admin |
| /resource/cases/:caseId/edit | Edit a draft | provider, org_admin |
| /resource/org-admin | Officers and organization activity | org_admin |
| /insa/dashboard | Command dashboard | system_admin |
| /insa/sos | SOS operations. Higher officer and auditor are read-only. | dispatcher, higher_officer, auditor, system_admin |
| /insa/approvals | Tier 2 approval queue | higher_officer |
| /insa/audit | Read-only audit log with filters, paging and CSV export | auditor, system_admin |
| /insa/organizations | Register, suspend and reactivate organizations | system_admin |
| /insa/staff | Staff accounts: add, change role, suspend, reset | system_admin |
| /insa/settings | Languages, severity rules, regions, alert templates, telecom gateways | system_admin |
| /forbidden | Access denied | Signed-in staff |

---

## 3. Web Portals & Features Built

### Shared Foundation (Phase 1)
- **EthioAlert Dark Operations Console:** Teal-tinted dark operations palette (`#0c1417` canvas, `#09181b` sidebar, `#133e42` active nav pill, and crisis severity indicators).
- **Central Permissions Matrix:** Located at `packages/core/src/permissions/matrix.ts` controlling `<RequireRole>`, `<Can>`, and `usePermission` hooks.
- **Component Showcase Catalog:** Interactive demo page at `/dev/components` showcasing all 6 core components:
  1. `MapPicker` (interactive drawing: circle, polygon, box + cascading administrative dropdowns)
  2. `StatusBadge` (unified accessible badges with icons & WCAG AA contrast)
  3. `FileUploader` (drag-and-drop, MIME restrictions, simulated progress, preview, retry)
  4. `MessageThread` (real-time clarification chat between INSA and partner organizations)
  5. `DataTable` (TanStack Table with multi-column sorting, search filters, pagination)
  6. `WebSocketClient` & `useChannel` (auto-reconnect with exponential backoff & heartbeat)
- **Security Dialogs:** Idle session timeout warning 60 seconds before logout, `<TwoFactorPrompt />` modal returning a Promise for sensitive operations.

### Resource Organization Portal (Phase 2)
- **Incident Reporting Form (`/resource/cases/new`):** Validated with `zod`, draft autosave, affected area targeting via `MapPicker`, and evidence attachment via `FileUploader`.
- **Command Dashboard (`/resource/dashboard`):** Real-time metric cards, filter tabs (Draft, Submitted, Under Review, Clarification, Verified, Approved, Broadcast, Rejected).
- **Incident Investigation & Lifecycle (`/resource/cases/:id`):** Status timeline, INSA broadcast delivery summary, and messaging thread.
- **Organization Admin (`/resource/org-admin`):** Officer enrollment, status toggles (active/suspended with 2FA), and activity reports.

### INSA Control Centre (Phase 3)
- **Command Overview (`/insa/dashboard`):** Operational telemetry indicators matching the command console, live incident map, and AI executive threat summary panel.
- **Case Review Queue (`/insa/cases`):** Sorted by AI severity rank, verification, clarification request, and rejection with required justification.
- **Alert Composer (`/insa/alerts/composer`):** Multi-channel targeting (push, SMS, voice), SMS segment counter, area boundary selection, and emergency templates.
- **Two-Tier Approval Queue (`/insa/approvals`):** Tier-1 submission by Administrator, Tier-2 digital signature by Higher Officer. **Hard separation of duties enforced** (submitter cannot approve their own alert). Emergency fast-track for Critical hazards.
- **Broadcast Monitor (`/insa/dispatch/:id`):** Real-time delivery progress bars per channel, masked failed numbers with one-click tower retry.
- **SOS Operations (`/insa/sos`):** Live distress feed, dispatcher assignment, missing-person escalation, and privacy-protected identity unmasking requiring 2FA + written justification.
- **Limited Dispatcher View:** Stripped-down navigation strictly restricted to SOS tickets.

### INSA System Administration & Compliance (Phase 4 & 5)
- **Organizations & Staff Management:** `/insa/organizations` and `/insa/staff`.
- **Telecom Gateways & Settings:** `/insa/settings` with masked API credentials and connection tests.
- **Reports & Analytics:** `/insa/reports` with KPI metrics and PDF/Excel/CSV export.
- **Read-Only Audit Log:** `/insa/audit` with user, action, and date filters for Auditors.
- **API Contract:** Generated OpenAPI 3.0 specification at `docs/openapi.yaml`.

---

## 4. What is Mocked vs Real

- **Network Requests:** All REST endpoints run against MSW and in-memory stores in `src/api/` (following the exact contract in `docs/openapi.yaml`).
- **Telemetry & WebSocket:** When no backend `VITE_WS_URL` is set, `WebSocketClient` automatically switches to internal simulated bus mode emitting heartbeats and broadcast telemetry.
- **Map Tiles:** Live OpenStreetMap and CartoDB Dark Matter tiles via Leaflet.