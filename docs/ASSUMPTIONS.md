# Architecture Assumptions & Engineering Decisions

### 1. Separation of Duties (Two-Tier Mutual Exclusion)
- **Rule:** The same human operator cannot submit an alert at Tier 1 and subsequently authorize it at Tier 2.
- **Enforcement:** Enforced in the front-end UI by disabling the "Sign with 2FA & Approve" button when `currentUserId === alert.tier1SubmittedBy.id`, and enforced in the mock API by throwing an HTTP 403 error.

### 2. Citizen Identity Privacy Protection
- Citizens reporting SOS distress tickets or registering in the system are displayed with masked phone numbers (`+251 91* *** 456`) and hashed identifiers (`eth_id_88f921a4`).
- Unmasking raw names and telephone records is restricted to authorized operators, requiring a 2FA step-up code plus a mandatory minimum 20-character written operational justification.
- All unmasking events are permanently recorded in the audit log.

### 3. Limited Dispatcher View
- Users logged in with the `DISPATCHER` role are provided with an isolated, minimal console shell containing exclusively the SOS Operations feed and ticket triage drawer.
- Navigation links to other modules are removed, and deep links redirect to the `/forbidden` (403) page.

### 4. Offline / Mock Telemetry Simulator
- When running locally without a live WebSocket server, the client falls back to an internal simulated bus that emits heartbeat telemetry, case status changes, and test delivery progression.

### 5. Multi-Lingual Character Constraints
- SMS segments are calculated based on GSM 7-bit (160 characters per segment for English) and UCS-2 Unicode (70 characters per segment for Amharic Ge'ez script).
