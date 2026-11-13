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
