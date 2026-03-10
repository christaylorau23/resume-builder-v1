#!/usr/bin/env bash
# Smoke-test the JD → PDF path against a running API server.
# Usage: API_URL=http://localhost:3001 ./scripts/smoke-test-pipeline.sh
# Or: ./scripts/smoke-test-pipeline.sh  (defaults to http://localhost:3001)
# Requires: pnpm --filter api dev (and optionally web dev) running first.
set -euo pipefail

API_URL="${API_URL:-http://localhost:3001}"
echo "==> Smoke test: POST /api/run-pipeline (JD path) to $API_URL"

# 1) JD path: expect 200 (PDF) if ANTHROPIC_API_KEY is set, or 500 with MISSING_ANTHROPIC_KEY / INVALID_ANTHROPIC_KEY
RESP=$(curl -s -w "\n%{http_code}" -m 120 -X POST "$API_URL/api/run-pipeline" \
  -H "Content-Type: application/json" \
  -d '{"jd":"Senior Software Engineer. We need TypeScript and React. Remote role.","profile":{"targetMarket":"US"}}')
HTTP_BODY=$(echo "$RESP" | head -n -1)
HTTP_CODE=$(echo "$RESP" | tail -n 1)

if [[ "$HTTP_CODE" == "200" ]]; then
  if echo "$HTTP_BODY" | grep -q '"pdf"'; then
    echo "    JD path: OK (200, PDF returned)"
  else
    echo "    JD path: unexpected 200 body (no pdf key)"
    exit 1
  fi
elif [[ "$HTTP_CODE" == "500" ]]; then
  if echo "$HTTP_BODY" | grep -qE 'MISSING_ANTHROPIC_KEY|INVALID_ANTHROPIC_KEY|ANTHROPIC_RATE_LIMITED|REDRAFT_PARSE_FAILED'; then
    echo "    JD path: OK (500, expected credential/redraft error)"
  else
    echo "    JD path: 500 but body: $HTTP_BODY"
    exit 1
  fi
else
  echo "    JD path: unexpected HTTP $HTTP_CODE"
  echo "$HTTP_BODY" | head -c 500
  exit 1
fi

# 2) Structured JSON path (no Anthropic): expect 200 with PDF
RESP2=$(curl -s -w "\n%{http_code}" -m 30 -X POST "$API_URL/api/run-pipeline" \
  -H "Content-Type: application/json" \
  -d '{"structuredResume":{"name":"Alex Rivera","contact":{"email":"alex@example.com","phone":"+1 555-0100"},"headline":"Senior Engineer","summary":"Experienced developer.","experience":[{"title":"Engineer","company":"Tech","location":"SF","startDate":"2021-01","endDate":"Present","bullets":["Built APIs."]}],"education":[],"skills":["TypeScript","React"]}}')
HTTP_BODY2=$(echo "$RESP2" | head -n -1)
HTTP_CODE2=$(echo "$RESP2" | tail -n 1)

if [[ "$HTTP_CODE2" != "200" ]]; then
  echo "    JSON path: unexpected HTTP $HTTP_CODE2"
  echo "$HTTP_BODY2" | head -c 500
  exit 1
fi
if ! echo "$HTTP_BODY2" | grep -q '"pdf"'; then
  echo "    JSON path: 200 but no pdf in body"
  exit 1
fi
echo "    JSON path: OK (200, PDF returned)"

echo "==> Smoke test passed"
