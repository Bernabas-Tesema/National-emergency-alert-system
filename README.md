# EthioAlert: National Emergency Alert & Citizen Safety System (NESS)

> **Disclaimer.** EthioAlert is a student-developed prototype that demonstrates a proposed national emergency alert and citizen safety system. It uses simulated operational data. INSA's role as system administrator is proposed for this project and does not imply official affiliation, authorization, or endorsement by INSA or any government institution.

## Submission

- **GitHub repository:** https://github.com/Bernabas-Tesema/National-emergency-alert-system
- **Video presentation (5 minutes):** [Watch the demo video](https://drive.google.com/file/d/1EE94jCJMRafxHlF8Bl5nuzw2FAPGUUKN/view?usp=drive_link)

## Project information

**Purpose.** EthioAlert sends the right alert to the right citizens quickly, lets citizens report emergencies back to responders, and requires two different officials to approve every public broadcast, so false alerts are less likely.

### Main features

**Website: the control center**
- Role-based access for seven roles, with a guard that sends citizens to the mobile app.
- Agencies report incidents with severity, attachments and an area drawn on a map.
- Case review, an alert composer in English and Amharic, and two-tier approval with a two-factor signature.
- A live dispatch monitor for cell broadcast, app push and voice, with an instant cancel control.
- SOS operations with masked citizen identities, and a read-only audit log.

**Backend**
- Django REST Framework: one-time-code login, staff login, SOS, cases, two-person approval, region-based broadcast and audit logs.

**Mobile app (citizens)**
- Phone sign-in linked to the national ID (Fayda), an SMS code.
- Active alerts with severity colours, labels, an area map, updates and an all-clear.
- Loud push notifications for critical alerts.
- SOS reporting with automatic GPS, six categories, and a photo or short video if available.
- My reports with status and messages from responders.
- Offline safety guide, large text, screen reader labels and read-aloud.

**AI suggestion service**
- Suggests case triage, English and Amharic alert drafts, a summary and a ranking of open cases. A human always decides.

**Prototype limits:** real Fayda and SMS integration, translations into Afan Oromo, Tigrinya and Somali, identity verification at registration, and an iOS build are not implemented. The mobile app has 45 automated tests.

## Run the website

**Requirements:** Git, Python 3.10+, Node.js 20+. Use two PowerShell windows.

```powershell
git clone https://github.com/Bernabas-Tesema/National-emergency-alert-system.git
cd National-emergency-alert-system
```

**Window 1: backend (port 8081)**

```powershell
cd backend
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
py manage.py migrate
py manage.py runserver 127.0.0.1:8081
```

Check http://127.0.0.1:8081/health. Staff passwords are set in `backend/.env` (default `change-me`). In dev mode the phone login returns a `debug_otp`, so no real SMS is needed.

**Window 2: website (port 5173)**

```powershell
cd "frontend(web)"
npm install
npm run dev
```

Open http://localhost:5173. The dev server forwards `/backend` to the backend, so no URL needs to be set.

## Run the mobile-app (main)

**Mobile app (Flutter)**

```powershell
cd mobile
flutter pub get
flutter run
```

**AI service (port 8088)**

```powershell
cd Ai
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
python -m uvicorn app.main:app --port 8088 --env-file .env
```

Set `AI_SERVICE_KEY` in `Ai/.env`. Use `AI_MODE=demo` to answer without internet.

**Tests:** `npm test` (website), `py manage.py test` (backend), `flutter test` (mobile), `python -m pytest` (AI, after `pip install -r requirements-dev.txt`).

## Production deploy (API + AI)

Production Docker Compose runs Postgres, Redis, Django (Gunicorn), and the AI service:

```powershell
Copy-Item .env.production.example .env.production
# fill strong secrets, hosts, SMTP, and at least one LLM key
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Details: [`backend/DEPLOY.md`](backend/DEPLOY.md) and [`Ai/DEPLOY.md`](Ai/DEPLOY.md).

## Repository layout

```text
frontend(web)/   Website (React + Vite), port 5173
backend/         Django REST API, port 8081
mobile/          Flutter citizen app
Ai/              AI suggestion service, port 8088
docs/            API contract and assumptions
```

## Team

| Full name | CTC ID |
|---|---|
| Bernabas Tesema | CTC-6878-26 |
| Yabets Melese | CTC-2605-26 |
| Betel Alemgena | CTC-3806-26 |
| Yeabsira Wondwossen | CTC-3200-26 |
| Besufekad Zenebe | CTC-057-26 |
| Gemechu Fekadu | CTC-1454-26 |

*INSA Summer Camp CTC final project.*
