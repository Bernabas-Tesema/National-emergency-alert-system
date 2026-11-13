# Deploy EthioAlert AI (production)

Django calls this service with `AI_SERVICE_URL` + header `X-Service-Key`. Citizens and staff never hold AI provider keys.

## Required environment

```env
AI_SERVICE_KEY=long-random-secret-shared-with-django
AI_MODE=live
AI_ENV=prod
GROQ_API_KEY=...
OPENROUTER_API_KEY=...
AI_PROVIDER_ORDER=groq,openrouter
```

With `AI_ENV=prod` the process **refuses to start** if the service key is weak or (for `live`) no LLM keys are set. OpenAPI `/docs` is disabled.

Optional: `CEREBRAS_API_KEY`, `AI_GROQ_MODEL`, `AI_ALLOWED_HOSTS`, `PORT`, `WEB_CONCURRENCY`, `LOG_LEVEL`.

## Option A — Docker Compose (with API)

From the repo root, use `docker-compose.prod.yml` and `.env.production.example`. The `ai` service is internal; Django reaches it at `http://ai:8088`.

## Option B — AI container alone

```powershell
cd Ai
docker build -t ethioalert-ai .
docker run -d --name ethioalert-ai -p 8088:8088 `
  -e AI_SERVICE_KEY=long-random-secret-shared-with-django `
  -e AI_MODE=live `
  -e AI_ENV=prod `
  -e GROQ_API_KEY=your-groq-key `
  -e OPENROUTER_API_KEY=your-openrouter-key `
  -e AI_PROVIDER_ORDER=groq,openrouter `
  ethioalert-ai
```

Health: `GET http://YOUR_AI_HOST:8088/ai/health` (no service key).

## Option C — Linux VPS / systemd

```bash
cd Ai
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# production .env with AI_ENV=prod
uvicorn app.main:app --host 127.0.0.1 --port 8088 --workers 2 --proxy-headers
```

Prefer keeping AI on a private network; only Django should call it.

## Wire Django

```env
AI_SERVICE_URL=https://your-ai-host
AI_SERVICE_KEY=same-long-secret
```

Web + mobile keep using `/api/v1/ai/*`; Django proxies with the service key.

## Production checklist

1. Strong unique `AI_SERVICE_KEY` (not a local default).
2. `AI_ENV=prod`.
3. At least one working LLM key for `AI_MODE=live`.
4. `GET /ai/health` → `"status":"ok"`.
5. Signed-in `POST /api/v1/ai/assist` works through Django.
6. Never put Groq/OpenRouter keys in Flutter or Vite.
