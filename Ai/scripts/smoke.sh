#!/usr/bin/env bash
# Hit every endpoint of a RUNNING service with the demo flood case and print the important bits.
#   AI_URL=http://127.0.0.1:8088 AI_SERVICE_KEY=<your key> bash scripts/smoke.sh
# If AI_SERVICE_KEY is not exported, the first key in .env is used.
set -u
cd "$(dirname "$0")/.."
URL="${AI_URL:-http://127.0.0.1:8088}"
KEY="${AI_SERVICE_KEY:-$(grep -E '^AI_SERVICE_KEYS=' .env 2>/dev/null | cut -d= -f2 | cut -d, -f1)}"
[ -z "$KEY" ] && { echo "No key. export AI_SERVICE_KEY or fill .env"; exit 2; }

PY="${PY:-.venv/bin/python}"; [ -x "$PY" ] || PY=python3
CASE=$($PY -c "import json;print(json.dumps(json.load(open('data/demo_cases.json'))['cases'][0]))")
fail=0

call() {  # name method path body
  local out code
  out=$(curl -s -m 60 -w '\n%{http_code}' -X "$2" "$URL$3" -H "X-Service-Key: $KEY" -H 'Content-Type: application/json' ${4:+-d "$4"})
  code=$(echo "$out" | tail -n1); body=$(echo "$out" | sed '$d')
  printf '%-10s HTTP %s  ' "$1" "$code"
  echo "$body" | $PY -c "
import sys, json
try:
    j = json.load(sys.stdin)
    d = j.get('data', {})
    print('source=%s provider=%s conf=%s low=%s warnings=%d %s' % (j.get('source'), j.get('provider'), j.get('confidence'), j.get('low_confidence'), len(j.get('warnings', [])), {k: d[k] for k in ('severity','woredas','scale') if k in d}))
except Exception:
    print('(not JSON)')"
  [ "$code" = "200" ] || fail=1
}

echo "== $URL =="
printf '%-10s HTTP %s\n' health "$(curl -s -o /dev/null -w '%{http_code}' "$URL/ai/v1/health")"
call providers GET  /ai/v1/health/providers
call triage    POST /ai/v1/triage    "$CASE"
call summary   POST /ai/v1/summary   "{\"case\": $CASE}"
call area      POST /ai/v1/area      "$CASE"
call draft     POST /ai/v1/draft     "{\"case\": $CASE, \"target_woredas\": [\"BOLE-W03\"], \"severity\": \"critical\"}"
call resources POST /ai/v1/resources "$CASE"
call rank      POST /ai/v1/rank      '{"set_id":"DEMO-SET-001","items":[{"id":"DEMO-FLOOD-001","category":"flood","severity":"critical","age_minutes":10},{"id":"DEMO-FIRE-001","kind":"sos","category":"fire","age_minutes":5},{"id":"DEMO-OUTBREAK-001","category":"disease","age_minutes":40}]}'

echo "-- negative checks (these SHOULD be rejected) --"
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$URL/ai/v1/triage" -H 'Content-Type: application/json' -d "$CASE")
echo "no key        -> $code (want 401)"; [ "$code" = "401" ] || fail=1
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$URL/ai/v1/triage" -H "X-Service-Key: $KEY" -H 'Content-Type: application/json' -d '{"description":"x","category":"bogus"}')
echo "bad category  -> $code (want 422)"; [ "$code" = "422" ] || fail=1

[ $fail -eq 0 ] && echo "SMOKE OK" || { echo "SMOKE FAILED"; exit 1; }
