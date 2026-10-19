# National Emergency Alert System API

FastAPI backend implementing the first operational slice from the proposal:

- Phone OTP citizen authentication
- Citizen SOS submission
- Organization case submission
- INSA case review
- Alert drafting and two-person approval
- Region-based alert broadcast and delivery logs
- Audit logging for authentication and workflow actions

## Run locally

```powershell
py -3.10 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8081
```

API documentation is available at `http://127.0.0.1:8081/docs`.

Set `DEV_MODE=false` outside local development. In development, the phone verification response includes `debug_otp`; production deployments must connect the adapter boundary to Fayda and an SMS provider.

## Staff accounts

The local development accounts are configured through `STAFF_ADMIN_PASSWORD` and `STAFF_OFFICER_PASSWORD`:

- `insa_admin`: reviews cases and drafts alerts
- `insa_officer`: approves and dispatches alerts

The approver must be a different identity from the reviewer.
