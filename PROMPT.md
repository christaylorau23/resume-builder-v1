# Ralph Loop Prompt (AI Software Factory)

## Mission
Execute the requested work until it is truly complete.

## Inputs
- BMAD artifacts: `_bmad-output/` (PRD/architecture/epics/stories)
- Specs: `specs/<feature>/requirements.md`, `design.md`, `implementation-plan.md`
- Verification gate: `bash scripts/verify.sh`

## Operating Rules
1) If a spec is missing, create or refine it before coding.
2) Implement in small steps; rerun verification often.
3) Never claim completion unless `bash scripts/verify.sh` passes.
4) If blocked, ask a single clear question (Telegram mode if enabled).

When done, output: LOOP_COMPLETE
