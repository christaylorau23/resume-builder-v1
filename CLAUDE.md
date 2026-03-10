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

## Deployment
- **SSH and repo safety:** See [docs/ai-factory-deployment-bridge.md](docs/ai-factory-deployment-bridge.md) for the 5-phase setup (key-based GitHub auth, line endings, secret isolation, GPG TTY).
- **Branching and agent safety:** Agents must never push to `main` (or `master`). After verify passes, commit and push only to a feature/agent branch (e.g. `feature/<task>` or `agent/<short-id>`). Opening a PR is optional; a human will merge to main after review.
