# AI service

Small FastAPI service. The backend sends it a case or a list of cases, it sends back a suggestion.
It never sends, approves or saves anything. A person always decides.

## Run (Windows PowerShell)
```
py -3 -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements-dev.txt
Copy-Item .env.example .env
.\.venv\Scripts\python -m uvicorn app.main:app --port 8088 --env-file .env
.\.venv\Scripts\python -m pytest -q
```
Put a long random value in `AI_SERVICE_KEY` and at least one free key (Groq is enough) in `.env`.
`AI_MODE`: `live` (AI, then demo cache, then rules), `demo` (cache first), `offline` (no network).

## Endpoints
All need the header `X-Service-Key`. Health does not.

| Endpoint | Send | Fills this button |
|---|---|---|
| `GET /ai/health` | nothing | |
| `POST /ai/triage` | `{description, category?, suggested_severity?, region?, case_id?}` | AI Triage & Synthesis |
| `POST /ai/draft` | same as triage | AI Generate Text |
| `POST /ai/summary` | `{items: [{id, category?, severity?, description?, age_minutes?}], set_id?}` | AI Executive Summary |
| `POST /ai/rank` | same as summary | AI Threat Ranking |

Every answer has the same shape:
```
{"suggestion": true, "source": "llm|cache|rules", "provider": "groq", "confidence": 0.86,
 "low_confidence": false, "warnings": [], "data": {...}}
```
`source: rules` means the AI was down. Confidence is then 0.35, so show it as weak.
Triage `data` has `category`, `severity` (low/medium/high/critical), `channel_severity` (information/warning/critical), `summary`, `reasons`.

## Names it accepts
Category: `health` and `health_disease` mean disease, `flood_weather` means flood, `security_conflict` means security, anything unknown means other.
Severity: any letter case. `information` means low and `warning` means medium.
So the backend and the web app can send what they already use.

## How it works
`main.py` routes, key check and the order of tries. `llm.py` talks to Groq, Cerebras and OpenRouter and tries the next one if a provider fails. `rules.py` is the answer when nothing else works. `schemas.py` checks every answer. `prompts.py` holds the prompts. `data/demo_cache.json` has ready answers for the demo cases (send their `case_id` or `set_id`).
Phones, ids, emails, links and titled names are removed before text leaves the service.