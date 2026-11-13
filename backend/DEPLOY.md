# Deploy EthioAlert Django API (production)

## What you get

| Piece | Role |
|---|---|
| Gunicorn + WhiteNoise | WSGI app + static admin assets |
| Postgres (`DATABASE_URL`) | Durable data |
| Redis or DB cache | OTP challenges across workers |
| Hard checks when `DEV_MODE=false` | Rejects weak secrets / open hosts |

## Required production env

See `.env.production.example`. Minimum:

- `DEV_MODE=false`
- Strong `DJANGO_SECRET_KEY`, `JWT_SECRET`, `AI_SERVICE_KEY`
- Explicit `ALLOWED_HOSTS`, `CORS_ORIGINS`, `FRONTEND_URL`
- `DATABASE_URL=postgres://...`
- Working SMTP for staff login OTP
- `AI_SERVICE_URL` pointing at the AI service

`debug_otp` is **never** returned when `DEV_MODE=false`.

## Option A — Docker Compose (API + AI + Postgres + Redis)

From the repo root:

```powershell
Copy-Item .env.production.example .env.production
# edit secrets in .env.production
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

API health: `GET http://YOUR_HOST:8081/health`  
AI health (internal): `http://ai:8088/ai/health`

Put Nginx/Caddy in front for HTTPS and reverse-proxy to port `8081`.

## Option B — API container only

```powershell
cd backend
docker build -t ethioalert-api .
docker run -d --name ethioalert-api -p 8081:8081 `
  -e DEV_MODE=false `
  -e DJANGO_SECRET_KEY=... `
  -e JWT_SECRET=... `
  -e DATABASE_URL=postgres://... `
  -e REDIS_URL=redis://... `
  -e ALLOWED_HOSTS=api.example.com `
  -e CORS_ORIGINS=https://console.example.com `
  -e FRONTEND_URL=https://console.example.com `
  -e AI_SERVICE_URL=https://ai.example.com `
  -e AI_SERVICE_KEY=... `
  ethioalert-api
```

## Option C — Linux VPS / systemd

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.production.example .env   # fill values
python manage.py migrate
python manage.py createcachetable   # if not using REDIS_URL
python manage.py collectstatic --noinput
gunicorn config.wsgi:application --bind 127.0.0.1:8081 --workers 3
```

Example unit (`/etc/systemd/system/ethioalert-api.service`):

```ini
[Unit]
Description=EthioAlert API
After=network.target postgresql.service

[Service]
WorkingDirectory=/opt/ethioalert/backend
EnvironmentFile=/opt/ethioalert/backend/.env
ExecStart=/opt/ethioalert/backend/.venv/bin/gunicorn config.wsgi:application --bind 127.0.0.1:8081 --workers 3
Restart=always

[Install]
WantedBy=multi-user.target
```

## First admin after deploy

```bash
python manage.py bootstrap_admin
# or
python manage.py bootstrap_demo_staff
```

Change every default password immediately.

## Production checklist

1. `DEV_MODE=false` and app starts (weak secrets will crash on purpose).
2. `GET /health` returns `"status":"ok"` and `"database":"ok"`.
3. Staff login emails OTP (no `debug_otp` in JSON).
4. Citizen phone verify works without exposing codes.
5. `AI_SERVICE_URL` + matching `AI_SERVICE_KEY` reach `/ai/health`.
6. CORS only lists your real web origins (not `*`).
7. TLS at the reverse proxy; set `SECURE_SSL_REDIRECT=true` when the app always sees HTTPS via `X-Forwarded-Proto`.
8. Do not ship `.env` or API keys in Flutter/Vite client bundles.
