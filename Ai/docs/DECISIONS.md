# Decisions (so nobody re-argues them at 11 pm)

| # | Decision | Why | Revisit when |
|---|---|---|---|
| 1 | Separate service in `Ai/`, called by the backend over HTTP | Matches the proposal's "AI Analytics Service". The AI gets no DB and no SMS keys, so it physically cannot send or approve anything | never, this is the trust boundary |
| 2 | FastAPI + pydantic | Matches the build plan. Pydantic schemas are the contract and the validator in one place | |
| 3 | Provider chain: Groq, Cerebras, Gemini, OpenRouter, then cache, then rules | Free tiers rate-limit and disappear. One provider is a single point of failure on demo day | free limits change |
| 4 | Circuit breaker per provider | Without it a dead provider costs a full timeout on every request | |
| 5 | Strict JSON + schema validation + one retry with the error | Models drift. Validation turns "mostly works" into "works or fails over" | |
| 6 | Guards after validation (rank must list every id, area ids must be real, drafts can't carry links) | Valid JSON is not the same as a safe answer | |
| 7 | `channel_severity` computed by us, never by the model | The alert flow depends on it. It must be deterministic | |
| 8 | Rules fallback always reports confidence 0.35 and `source: rules` | A fallback that looks as good as the AI hides the outage | |
| 9 | Demo cache validated at startup, keyed by `case_id` | A typo should break on your laptop, not on stage | |
| 10 | LLM ranking is checked (must list every id exactly once), then renumbered 1..n; a bad ranking falls back to the deterministic score | A ranking has to be a permutation of the input. That is checkable, so check it | |
| 11 | No woreda coordinates or boundaries in `regions_bole.json` | We don't have real ones and won't invent them. Landmarks are a TODO for the team | real boundaries available |
| 12 | `AI_DATA_CLASS=synthetic` default, `real` disables providers that train on free-tier prompts | Encodes the privacy decision in code, not in a wiki page | real data appears |
| 13 | PII scrubber is regex, best effort | Names can't be reliably regexed. The real control is that the backend sends only incident fields | |
| 14 | No CORS, no browser access, API docs only in dev | Only the backend may call this | |
| 15 | In-memory rate limiter | One process is enough for V1. Use Redis if we run several | multiple replicas |
| 16 | Prompts are files in versioned folders | Old audit rows stay explainable. `v2` = new folder, not an edit | |
| 17 | Eval set has `dev` and `holdout` splits | Tune on dev, check holdout once. Otherwise the metric lies (Goodhart) | |
| 18 | Sender hints (category, severity, woreda text) are mapped, not rejected. Model output stays strict | Three teams named things three ways. A naming difference must not become a 422 on demo day | the teams agree one vocabulary |

## Known limits

- Amharic output from free models is unreliable. The schema checks that `am` is Ge'ez script, not that it is good Amharic. A native speaker must review.
- Free-tier model ids and limits are from an April 2026 comparison and change often. Verify on each dashboard.
- Rate limit and breaker state live in memory and reset on restart.
- Body size limit uses `Content-Length`. Behind the real backend this is fine. Do not expose the service directly.
- The golden set is 20 synthetic cases labelled by one person. It catches regressions and gross errors. It does not prove real-world accuracy.
