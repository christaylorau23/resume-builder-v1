# Project Rules (AI Software Factory)

This repo is bootstrapped with:
- BMAD Method (`_bmad/`, `_bmad-output/`)
- Ralph Orchestrator (`ralph.*.yml`, `.ralph/`)

## Non-negotiables
1) Spec-first: create/confirm specs in `specs/<feature>/` before implementing.
2) Keep BMAD planning artifacts as source-of-truth (`_bmad-output/planning-artifacts/`).
3) Verification is mandatory: run `bash scripts/verify.sh` before claiming done.
4) Prefer small commits per completed step.

## Workflow
- BMAD produces PRD/architecture/epics/stories.
- Story becomes a Ralph spec (convert with scripts/bmad_to_ralph.py).
- Ralph executes loops with backpressure gates (tests/lint/typecheck).
