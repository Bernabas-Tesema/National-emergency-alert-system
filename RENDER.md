# Render deploy notes

## Important: two services

| Service | Root Directory | Framework | Health |
|---|---|---|---|
| **EthioAlert AI** | `Ai` | **FastAPI** (correct) | `/ai/health` |
| **EthioAlert API** | `backend` | **Django** | `/health` |

If the build log installs `fastapi` / `uvicorn`, you are deploying the **AI** service. That is expected. Django is a **second** Web Service with root `backend`.

## Fix “Exited with status 3” on AI

Uvicorn exit **3** = startup failed. With `AI_ENV=prod` (set in the AI Dockerfile), the app refuses to start unless Render Environment has:

```env
AI_SERVICE_KEY=<24+-char secret you create>
AI_MODE=live
GROQ_API_KEY=<your groq key>
```

Optional: `OPENROUTER_API_KEY`, `AI_PROVIDER_ORDER=groq,openrouter`

SMTP variables belong only on the **Django API** service, not AI.

## Create services

### 1) AI (FastAPI)
- Branch: `main`
- Region: Oregon
- Root Directory: `Ai`
- Runtime: Docker
- Health: `/ai/health`

### 2) API (Django) — separate Web Service
- Root Directory: `backend`
- Runtime: Docker
- Health: `/health`
- Attach Render Postgres → `DATABASE_URL`
- Set `AI_SERVICE_URL=https://YOUR-AI.onrender.com`
- Set the **same** `AI_SERVICE_KEY` as the AI service
- Copy SMTP vars from your local `backend/.env`

## After AI is live

Open `https://YOUR-AI.onrender.com/ai/health` — should return `"status":"ok"`.

## 3) Frontend (Static Site)

1. Render → **New** → **Static Site**
2. Same repo, branch `main`
3. Settings:
   - **Root Directory:** `frontend(web)`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
4. Environment (build-time):

```env
VITE_API_BASE=https://national-emergency-alert-system-1-backend.onrender.com
```

5. After deploy, copy the frontend URL (e.g. `https://something.onrender.com`)
6. Update the **API** service env:

```env
CORS_ORIGINS=https://YOUR-FRONTEND.onrender.com
CSRF_TRUSTED_ORIGINS=https://YOUR-FRONTEND.onrender.com,https://national-emergency-alert-system-1-backend.onrender.com
FRONTEND_URL=https://YOUR-FRONTEND.onrender.com
ALLOWED_HOSTS=national-emergency-alert-system-1-backend.onrender.com
```

7. Save API env → restart/redeploy API, then open the frontend `/login`

## Django admin login (`/admin`)

On each API boot the container runs `bootstrap_admin` (creates/updates user `admin`).

| Field | Value |
|---|---|
| URL | `https://YOUR-API.onrender.com/admin/login/` |
| Username | `admin` |
| Password | value of `DJANGO_ADMIN_PASSWORD` (default `change-me` if unset) |

Also set on the API service:

```env
DJANGO_ADMIN_PASSWORD=<strong-password>
BOOTSTRAP_DEMO_STAFF=true
ALLOWED_HOSTS=national-emergency-alert-system-1-backend.onrender.com
CSRF_TRUSTED_ORIGINS=https://YOUR-FRONTEND,https://national-emergency-alert-system-1-backend.onrender.com
```

`BOOTSTRAP_DEMO_STAFF=true` seeds frontend staff users (`sysadmin1`, …) with password `change-me`.
