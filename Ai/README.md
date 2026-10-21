# Ai/: AI analytics service

Part of the National Emergency Alert & Citizen Safety System. This service helps INSA staff decide faster. It **only suggests**: it never sends, approves or cancels an alert. The backend calls it, a person confirms, and the two-person approval stays untouched.

| Endpoint | What it gives the staff member |
|---|---|
| `POST /ai/v1/triage` | category, severity, a two-sentence summary, what is missing |
| `POST /ai/v1/summary` | briefing for one case, or for everything open |
| `POST /ai/v1/rank` | open cases and SOS ordered by urgency |
| `POST /ai/v1/area` | which woredas should get the alert |
| `POST /ai/v1/draft` | the public message in English and Amharic, plus SMS versions |
| `POST /ai/v1/resources` | which organisations to contact, and how urgently |

## 5-minute start

```bash
cd Ai
make install                 # venv + dependencies + .env from the example
make test                    # 179 tests, no keys, no internet
export AI_SERVICE_KEYS=dev-key-0123456789abcdef
make run-offline             # terminal 1
AI_SERVICE_KEY=dev-key-0123456789abcdef make smoke    # terminal 2
```

Then add real free keys to `.env` (start with Groq only) and use `make run`. Full test guide: **`docs/TESTING.md`**.

## How it works

```
 backend ──X-Service-Key──▶  routes  ──▶  engine
                                           │ 1. strip personal data
                                           │ 2. pick sources by mode:
                                           │      live    llm → cache → rules
                                           │      demo    cache → llm → rules
                                           │      offline cache → rules
                                           │ 3. validate against the schema
                                           │ 4. business guards (valid woredas, no links, full ranking)
                                           ▼
                         envelope { suggestion:true, source, confidence, warnings, data }

 llm = Groq → Cerebras → Gemini → OpenRouter, each behind a circuit breaker,
       strict JSON, one retry that tells the model what was wrong
```

Why it is built this way is in `docs/DECISIONS.md`. The short version: free providers fail, so the service is designed to degrade honestly (`source` and `low_confidence` always say what happened) instead of failing or pretending.

## What's where

| Path | What |
|---|---|
| `app/main.py` | app factory, error shapes, logging |
| `app/security.py` | service-key auth, rate limits |
| `app/core/schemas.py` | **the contract**: every request and response |
| `app/core/engine.py` | the six features and their guards |
| `app/core/llm_client.py`, `breaker.py`, `providers/` | provider chain, failover, adapters |
| `app/core/pii.py` | personal-data scrubber |
| `app/core/rules.py` | no-AI fallback answers |
| `app/prompts/v1/` | versioned prompts (examples are tested against the schemas) |
| `data/` | woreda ids, demo cases, demo cache, all synthetic |
| `evals/` | 20 golden cases + scorer |
| `tests/` | 179 tests |
| `docs/AI_CONTRACT.md` | **give this to the backend team** |
| `docs/TESTING.md`, `DEMO_DAY.md`, `DECISIONS.md` | how to test, how to present, why |

## Put it in the team repo

```bash
git checkout -b feat/ai-service
unzip Ai-scaffold.zip           # creates Ai/ . If Ai/ already has files, move them aside first
cp Ai/docs/AI_CONTRACT.md docs/AI_CONTRACT.md      # the team's shared docs folder
git status                      # check: .env must NOT be listed
git add Ai docs/AI_CONTRACT.md
git commit -m "feat(ai): AI analytics service v1 (triage, summary, rank, area, draft, resources)"
git push -u origin feat/ai-service
```
Open a pull request and ask Besu to review `docs/AI_CONTRACT.md` before anyone codes against it. Touch only `Ai/` and that one doc.

## Before demo day (the honest list)

- **Verify the free model ids** on each provider dashboard. Defaults in `app/config.py` may be retired.
- **Amharic needs a native reader.** Schema checks the script, not the quality.
- **Fill `landmarks`** in `data/regions_bole.json`, or area suggestions can only echo what the sender chose.
- **Fake data only** goes to free providers. If real data ever appears, set `AI_DATA_CLASS=real`.
- Run `make eval` and know your numbers. Compare with `make eval-offline`.
- Use `AI_MODE=demo` on the day. See `docs/DEMO_DAY.md`.

## Not tested yet (and why)

Live calls to Groq, Cerebras, Gemini and OpenRouter (no keys here): the adapters are tested against fake HTTP responses, but real behaviour, real latency and real Amharic quality are for you to check at Level 3 and 4 of `docs/TESTING.md`. The Docker image was written but not built.
