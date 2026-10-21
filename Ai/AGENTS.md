# AGENTS.md: rules for AI coding agents working in `Ai/`

Scope: only edit files under `Ai/`. Do not touch `backend/`, `frontend(web)/`, `mobile_app/` or the shared `docs/`.

1. Read `README.md`, `docs/AI_CONTRACT.md`, `docs/DECISIONS.md` and `app/core/schemas.py` before changing anything. `schemas.py` is the contract.
2. The AI service only suggests. Never add code that sends SMS or push, approves, cancels or writes to a database. Never give this service credentials for those.
3. One small change at a time. Run `make test` and `make lint` before saying it is done. Both must pass.
4. Changing a response shape or an endpoint = contract change. Update `schemas.py`, `docs/AI_CONTRACT.md` and the tests together, and say so in your summary. Never rename or remove a field in v1.
5. Changing a prompt: create `app/prompts/v2/`, do not edit `v1`. The JSON example in each prompt must validate against its schema (`tests/test_content.py` checks this).
6. Never log case text, prompts or provider response bodies. Log ids, timings and outcomes only.
7. Never put a key, token or real personal data in code, tests, fixtures or docs. Test data is synthetic. Keys come from the environment.
8. Do not add a dependency without a one-line reason in `docs/DECISIONS.md`.
9. Keep comments explaining why, not what. No dead code.
10. If the docs disagree with each other or the request is unclear, stop and ask.
