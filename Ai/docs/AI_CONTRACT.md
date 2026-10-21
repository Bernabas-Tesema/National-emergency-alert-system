# AI service contract (v1)

For the backend team (Besu, Gamulaa) and for whoever builds the admin portal. The source of truth is `app/core/schemas.py`. When this file and the code disagree, the code wins. Then fix this file.

## The one rule

**The AI only suggests.** It has no database access and no SMS or push keys, and it cannot approve anything. Every response says `"suggestion": true`. A person confirms before anything is used. The two-person approval in the backend stays exactly as designed.

## Calling it

| | |
|---|---|
| Base URL | `http://ai:8088` inside docker, `http://127.0.0.1:8088` locally |
| Who calls | **Only the backend.** Never the browser, never the mobile app. |
| Auth | Header `X-Service-Key: <one of AI_SERVICE_KEYS>` on every call except `GET /ai/v1/health` |
| Format | JSON in, JSON out. Max body 64 KB. |
| Timeout | Set 30 s on the backend side. Normal answers take 1 to 4 s. Failover can take longer. |
| Rate limit | 120 requests per minute per key (change with `AI_RATE_LIMIT_PER_MIN`) |

The backend should call us from the Case Service (triage on submit), the Alert Composer (draft, area, resources) and the dashboard (summary, rank).

## Endpoints

| Method + path | Purpose | Body |
|---|---|---|
| `POST /ai/v1/triage` | category + severity + short summary for one case or SOS | `CaseIn` |
| `POST /ai/v1/summary` | briefing for one case **or** for a set of items | `{case}` or `{cases:[...], set_id?, scope_label?}` |
| `POST /ai/v1/rank` | order open cases and SOS by urgency | `{items:[...], set_id?}` |
| `POST /ai/v1/area` | suggest target woredas | `CaseIn` |
| `POST /ai/v1/draft` | public message in English and Amharic, plus SMS versions | `{case, target_woredas?, severity?, recommended_action?}` |
| `POST /ai/v1/resources` | which organisations to contact, and how urgently | `CaseIn` |
| `GET /ai/v1/health` | liveness (open, says nothing about config) | none |
| `GET /ai/v1/health/providers` | which provider is live, breaker state, cache use (needs the key) | none |

### Request: `CaseIn`

```json
{
  "case_id": "DEMO-FLOOD-001",
  "kind": "case",
  "category": "flood",
  "source_org": "EMI",
  "suggested_severity": "critical",
  "description": "Heavy rain has fallen for six hours ...",
  "location_text": "Low-lying streets, Bole Woreda 03",
  "woredas": ["BOLE-W03"],
  "language": "en"
}
```

| Field | Rules |
|---|---|
| `description` | required, 3 to 4000 chars |
| `kind` | `case` (agency) or `sos` (citizen). Default `case` |
| `category` | `flood fire disease security missing_person weather accident other`. It is only a hint |
| `suggested_severity` | `information`, `warning` or `critical`, from the sender. Optional |
| `woredas` | ids like `BOLE-W01` to `BOLE-W14`, max 14. Anything else gives 422 |
| `case_id` | optional, `A-Za-z0-9_.:-`. Used for the demo cache lookup only |

Unknown extra fields are ignored, so adding a field on your side never breaks us.

### Response: the envelope (same for every endpoint)

```json
{
  "suggestion": true,
  "request_id": "cc7e6f42c0e6",
  "source": "llm",            // "llm" | "cache" | "rules"
  "provider": "groq",         // null for cache and rules
  "model": "llama-3.3-70b-versatile",
  "cached": false,
  "latency_ms": 1420,
  "prompt_version": "v1",
  "confidence": 0.86,
  "low_confidence": false,    // true when confidence < 0.5 (rules fallback is always 0.35)
  "reasons": ["..."],
  "warnings": ["..."],        // show these to the reviewer
  "data": { }                 // shape depends on the endpoint, see below
}
```

`data` for each endpoint:

| Endpoint | `data` |
|---|---|
| triage | `category, severity (low/medium/high/critical), channel_severity (information/warning/critical), summary, confidence, reasons[], missing_info[]` |
| summary | `summary, key_points[], confidence, reasons[]` |
| rank | `ranking[{id, rank, score 0-100, reason}], confidence, reasons[]`. Ranks are always 1..n, every input id appears exactly once |
| area | `woredas[] (only valid ids), confidence, reasons[]` |
| draft | `en, am, sms_en (<=160), sms_am (<=134), notes[], confidence, reasons[]` |
| resources | `recommendations[{org, priority now/soon/standby, reason}], scale low/medium/high, confidence, reasons[]` |

`channel_severity` maps our four levels to the alert flow: low to information, medium and high to warning, critical to critical.

### What `source` means for the UI

| `source` | Meaning | UI |
|---|---|---|
| `llm` | A real model answered and passed validation | normal "AI suggestion" label |
| `cache` | Pre-checked demo answer | normal label (demo mode, or providers were down) |
| `rules` | No AI available, keyword rules answered | show a clear **"Low confidence: AI unavailable"** banner |

Always show `warnings`. Examples: "AI rates this 'warning' but the sender suggested 'critical'", "Draft contained contact details; removed", "Personal data redacted before AI processing (2 items)".

### Errors

```json
{"error": {"code": "validation_error", "message": "Invalid request", "request_id": "64a8cd14196b",
           "problems": [{"field": "description", "message": "String should have at least 3 characters"}]}}
```

| Status | When |
|---|---|
| 401 | missing or wrong `X-Service-Key` (generic message on purpose) |
| 413 | body over 64 KB |
| 422 | validation. `problems` lists field and message only, never the value you sent |
| 429 | rate limit, or too many failed key attempts. Honour `Retry-After` |
| 500 | bug on our side. Log the `request_id` |

The service **does not return 5xx when AI providers fail**. It falls back to cache or rules and says so in `source`. Treat 5xx as a real fault.

## What the backend must do

1. **Send incident fields only.** Never citizen records, phone numbers or national ID values. We strip what we can find, but that is the second line of defence, not the first.
2. **Store every response** in an `ai_outputs` table (suggested below) and link it to the case. This is the audit trail the proposal requires.
3. **Render all strings as plain text.** Text can come from the model, which read text written by agencies and citizens. Never `innerHTML`, never `dangerouslySetInnerHTML`.
4. **Show `warnings` and the `source` banner** in the admin portal.
5. **Re-validate on your side.** If you take `woredas` from `/area`, check them against your own regions table. If you take a draft, a human edits and the two-tier approval still applies.
6. Keep `AI_SERVICE_KEYS` out of git. Put it in the backend's secret store or `.env`.

```sql
CREATE TABLE ai_outputs (
  id             BIGSERIAL PRIMARY KEY,
  incident_id    UUID REFERENCES incidents(id),
  task           TEXT NOT NULL,            -- triage | summary | rank | area | draft | resources
  request_id     TEXT NOT NULL,
  source         TEXT NOT NULL,            -- llm | cache | rules
  provider       TEXT,
  model          TEXT,
  prompt_version TEXT NOT NULL,
  confidence     REAL NOT NULL,
  response       JSONB NOT NULL,           -- the whole envelope
  accepted_by    UUID,                     -- staff user who used it, or NULL if ignored
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Changing the contract

- Adding an optional field: fine, tell the backend team.
- Renaming, removing or tightening anything: bump the URL to `/ai/v2/...` and keep v1 until the backend has moved.
- Changing a prompt: new folder `app/prompts/v2/`, set `AI_PROMPT_VERSION=v2`. Old audit rows keep their `prompt_version`.
