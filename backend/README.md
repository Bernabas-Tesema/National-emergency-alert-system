# National Emergency Alert System API (Django)

Django REST Framework backend for EthioAlert:

- Phone OTP citizen authentication
- Citizen SOS submission
- Organization case submission
- INSA case review
- Alert drafting and two-person approval
- Region-based alert broadcast and delivery logs
- Audit logging for authentication and workflow actions

## Run locally

```powershell
cd backend
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
py manage.py migrate
py manage.py runserver 127.0.0.1:8081
```

If `pip` into the venv is slow, system Python with the packages already installed also works:

```powershell
cd backend
Copy-Item .env.example .env
py -3 manage.py migrate
py -3 manage.py runserver 127.0.0.1:8081
```

Health check: `http://127.0.0.1:8081/health`

Opening `http://127.0.0.1:8081/` redirects to the clean **Unfold** admin login (`/admin/login/`).

```powershell
pip install -r requirements.txt
py manage.py bootstrap_admin
```

Default admin login: `admin` / `change-me` (from `DJANGO_ADMIN_PASSWORD`).

Set `DEV_MODE=false` outside local development. In development, the phone verification response includes `debug_otp`.

### Production

See **[DEPLOY.md](./DEPLOY.md)** for Gunicorn, Postgres, Redis/cache, Docker, and security checklist. Root `docker-compose.prod.yml` runs API + AI + Postgres + Redis together.

Organization officers can list SOS tickets at `GET /api/v1/sos`, acknowledge them, and return findings to INSA.

### Staff credentials by email
Creating a staff/org account (Django admin **Staff accounts**, or `POST /api/v1/staff`) emails EthioAlert credentials plus a change-password link (`FRONTEND_URL/change-password?token=...`).  
INSA admin can assign every web role: `SUPER_ADMIN`, `ADMINISTRATOR`, `HIGHER_OFFICER`, `DISPATCHER`, `AUDITOR`, `ORG_ADMIN`, `ORG_OFFICER`.

### Login email OTP
Staff sign-in is two steps:
1. `POST /api/v1/auth/staff/login` — checks password, emails a random 6-digit code to the account email
2. `POST /api/v1/auth/staff/verify-otp` — `{ challenge_id, code }` issues the JWT

On first login after account creation, `must_change_password` still forces `/change-password`.

### Seed every role for local demos
```powershell
py manage.py bootstrap_demo_staff
```
Creates `sysadmin1`, `admin1`, `officer1`, `dispatcher1`, `auditor1`, `orgadmin1`, `provider1` (password `change-me`).  
Use real mailbox addresses on those accounts (or rely on `debug_otp` while `DEBUG=true`) so login OTP delivery works.

### Role handoff chain
1. Org officer submits incident → INSA Administrator reviews (`/insa/cases`)
2. INSA drafts alert → Higher Officer approves (`/insa/approvals`) → broadcast
3. Org officer tracks result (`/resource/outcomes`)
4. Citizen SOS → Org SOS Inbox → return to INSA → Dispatcher claims (`/insa/sos` assign/status) + case queue
5. Auditor reads national cases / alerts / audit log (read-only)

## Staff accounts

Configured through `STAFF_ADMIN_PASSWORD` and `STAFF_OFFICER_PASSWORD` in `.env`:

| Username | Role | Default password |
|---|---|---|
| `insa_admin` | reviews cases and drafts alerts | `change-me` |
| `insa_officer` | approves and dispatches alerts | `change-me` |
| `org_officer` | submits organization cases | `change-me` (uses admin password) |

The approver must be a different identity from the reviewer.

## Website integration

The Vite app proxies `/backend` to `http://127.0.0.1:8081`. Keep `VITE_API_BASE=/backend` in `frontend(web)/.env.development`.
