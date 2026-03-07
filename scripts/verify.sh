#!/usr/bin/env bash
set -euo pipefail

echo "==> Factory verify gate"

ran_any=0

# Node / TS projects
if [[ -f package.json ]]; then
  ran_any=1
  echo "==> Node project detected"
  npm -s test || { echo "TESTS failed"; exit 1; }

  if npm -s run | grep -qE ' lint'; then npm -s run lint; else echo "(skip) no lint script"; fi
  if npm -s run | grep -qE ' typecheck'; then npm -s run typecheck; else echo "(skip) no typecheck script"; fi
  if npm -s run | grep -qE ' build'; then npm -s run build; else echo "(skip) no build script"; fi

  # Superhuman Layout Simulation (FR10/FR12)
  echo "--- Strict Layout Simulation (FR10/FR12) ---"
  node packages/core/scripts/simulate-layout.js --strict || { echo "LAYOUT SIMULATION failed"; exit 1; }

  # ATS Readability Gate (FR13)
  echo "--- ATS Readability Gate (FR13) ---"
  grep -q "KeywordHeatmap" packages/core/src/layout-prep/keyword-heatmap.ts || { echo "ATS READABILITY GATE failed: KeywordHeatmap not found"; exit 1; }
  echo "(pass) KeywordHeatmap contract present in keyword-heatmap.ts"
fi

# Python projects
if [[ -f pyproject.toml || -f requirements.txt ]]; then
  ran_any=1
  echo "==> Python project detected"
  if command -v pytest >/dev/null 2>&1; then
    pytest -q
  else
    echo "pytest not found. Install it or add your own Python gate."
    exit 1
  fi
fi

if [[ "$ran_any" -eq 0 ]]; then
  echo "No project runtime detected (no package.json / pyproject.toml)."
  echo "This is expected on day-0. Your first agent task should scaffold the project + gates."
  exit 1
fi

echo "==> VERIFY PASSED"
