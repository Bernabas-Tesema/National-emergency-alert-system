# Demo day: AI service

## The night before

- [ ] `make test` passes on the demo machine, not just on your laptop.
- [ ] Keys for at least two providers work. Run `make smoke` with `AI_MODE=live` and confirm `source=llm`.
- [ ] Re-check free model ids on each provider dashboard. Free tiers rename and retire models without notice.
- [ ] `make eval` has been run. You know your numbers: say them, don't guess them.
- [ ] A native Amharic speaker has read every `am` and `sms_am` text in `data/demo_cache.json` and the rule templates in `app/core/rules.py`.
- [ ] Fill `landmarks` in `data/regions_bole.json` with real places per woreda (the area suggestion cannot match place names without them).
- [ ] The demo case descriptions in `data/demo_cases.json` still match what the portals send. The cache is keyed by `case_id`, so use those ids.
- [ ] Phone hotspot tested as a backup connection.

## Which mode to run

| Situation | `AI_MODE` | Why |
|---|---|---|
| Normal rehearsal | `live` | proves the real path |
| **The showcase** | `demo` | demo cases answer instantly from the pre-checked cache. Anything new still goes to real providers |
| No internet in the room | `offline` | never touches the network |

`demo` is the safe default for the final day. Tell the audience honestly which parts are live, and use `/ai/v1/health/providers` to show them (providers, latency, fallback counts).

## What to say (and not say)

Say: "The AI only suggests. A person verifies it, and a senior officer signs. It never sends anything."
Say: "If every AI provider fails, the system still works. It falls back to pre-checked answers or simple rules and tells the user the confidence is low."
Say: "We use fake data only. Free providers never see real citizens."
Say: "Our measured triage result is X of 20 on the dev set and Y of 5 on holdout. The keyword-only baseline is Z."
Don't say: that the AI is "accurate" or "trained". It is a general model with a careful prompt and validation around it.
Don't hide: Fayda is simulated, voice calls are simulated, SMS is real only to team phones.

## If something breaks live

1. `curl .../ai/v1/health/providers` with the key. Look at `breaker` and `last_error`.
2. A provider shows `open`/`rate_limited`: wait, or the next provider is already serving. Nothing to do.
3. Everything shows errors: restart with `AI_MODE=offline`. Demo cases keep working.
4. The backend can't reach us: check the key matches `AI_SERVICE_KEYS`, and the URL/port.
