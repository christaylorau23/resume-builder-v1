#!/usr/bin/env python3
"""
Bridge: BMAD story-*.md → Ralph specs and task file.

Scans _bmad-output/planning-artifacts/ for story-*.md, derives a slug per story,
and creates specs/<slug>/requirements.md, design.md, implementation-plan.md
plus .ralph/tasks/<number>-<slug>.code-task.md.

Usage:
  python3 scripts/bmad_to_ralph.py --project .
"""

import argparse
import re
from pathlib import Path


ARTIFACTS_DIR = "_bmad-output/planning-artifacts"
SPECS_DIR = "specs"
RALPH_TASKS_DIR = ".ralph/tasks"
STORY_GLOB = "story-*.md"


def slug_from_filename(path: Path) -> str:
    """story-pdfkit-rendering.md -> pdfkit-rendering"""
    name = path.stem  # story-pdfkit-rendering
    if name.startswith("story-"):
        return name[6:]  # pdfkit-rendering
    return name


def split_sections(content: str) -> dict[str, str]:
    """Split markdown by ## headers; returns {section_title: body}."""
    sections = {}
    current = None
    buf: list[str] = []
    for line in content.splitlines():
        m = re.match(r"^##\s+(.+)$", line)
        if m:
            if current is not None:
                sections[current] = "\n".join(buf).strip()
            current = m.group(1).strip()
            buf = []
        else:
            buf.append(line)
    if current is not None:
        sections[current] = "\n".join(buf).strip()
    return sections


def get_section(sections: dict[str, str], *keys: str) -> str:
    """Return first matching section body or empty string."""
    for k in keys:
        for title, body in sections.items():
            if k.lower() in title.lower():
                return body
    return ""


def build_requirements_md(sections: dict[str, str], story_id: str) -> str:
    """requirements.md: Objective, ACs, Verification Gate, Dependencies."""
    parts = [
        "# Requirements",
        "",
        "Source: BMAD story (`_bmad-output/planning-artifacts/`). Story ID: " + story_id,
        "",
        "---",
        "",
        "## Objective",
        "",
        get_section(sections, "Objective") or "(No objective section found.)",
        "",
        "---",
        "",
        "## Acceptance Criteria (Definition of Done)",
        "",
        get_section(sections, "Acceptance Criteria") or "(No acceptance criteria found.)",
        "",
        "---",
        "",
        "## Verification Gate",
        "",
        get_section(sections, "Verification Gate") or "(No verification gate found.)",
        "",
        "---",
        "",
        "## Dependencies",
        "",
        get_section(sections, "Dependencies") or "(No dependencies section found.)",
    ]
    return "\n".join(parts)


def build_design_md(sections: dict[str, str]) -> str:
    """design.md: Context, constraints, signature, constants, overflow."""
    context = get_section(sections, "Context")
    impl_notes = get_section(sections, "Implementation Notes")
    out_of_scope = get_section(sections, "Out of Scope")
    parts = [
        "# Design",
        "",
        "Technical context and implementation constraints for the renderer.",
        "",
        "---",
        "",
        "## Context",
        "",
        context or "(No context section found.)",
        "",
        "---",
        "",
        "## Implementation Notes (signature, layout, overflow)",
        "",
        impl_notes or "(No implementation notes found.)",
        "",
        "---",
        "",
        "## Out of Scope for This Story",
        "",
        out_of_scope or "(No out-of-scope section found.)",
    ]
    return "\n".join(parts)


def build_implementation_plan_md(sections: dict[str, str], slug: str) -> str:
    """implementation-plan.md: Ordered steps for Ralph."""
    # Derive steps from the story; these match the plan's suggested order.
    steps = [
        "1. Add PDFKit dependency: `pnpm add pdfkit --filter @repo/core` and `pnpm add -D @types/pdfkit --filter @repo/core`.",
        "2. Change `buildPdf` signature to accept `(resume: StructuredResume, heatmap: KeywordHeatmap): Promise<Buffer>` and add types from `@repo/types`.",
        "3. Define page layout constants at top of `build-pdf.ts` (PAGE_WIDTH_PT, PAGE_HEIGHT_PT, MARGIN_PT, BASELINE_LINE_GAP, BULLET_GAP, SECTION_MARGIN).",
        "4. Initialize PDFDocument with tagged PDF/PDF/UA options (tagged: true, pdfVersion: '1.5', subset: 'PDF/UA'); use doc.text() only for text.",
        "5. Implement heatmap-aware section rendering: respect heatmap.sections[section].nonNegotiable and render those sections in full.",
        "6. After writing all content, implement overflow detection: if doc.y > PAGE_HEIGHT_PT - MARGIN_PT, throw a descriptive error (fail fast, no second page).",
        "7. Implement Perfect Spacing: dynamic lineGap ±10% and/or bullet spacing collapse; use named constants only.",
        "8. Add logical structure tags with doc.struct() (Document, Sect, H, P, List/LI) and doc.markStructureContent() for each text block.",
        "9. Create canonical fixture in packages/core/__tests__/fixtures/canonical-resume.ts (CANONICAL_RESUME, CANONICAL_JD_KEYWORDS) per story fixture spec.",
        "10. Extend build-pdf.test.ts: assert tagged PDF, page count === 1, and that parsed text contains candidate name and hard keyword.",
        "11. Implement pipeline.integration.test.ts: call buildPdf with canonical fixture, write Buffer to output/test-resume.pdf, parse and assert hard keyword in text.",
        "12. Add performance assertion: buildPdf completes in under 5 seconds for the canonical 1-page resume.",
    ]
    intro = get_section(sections, "Objective")
    parts = [
        "# Implementation Plan",
        "",
        "Ordered steps to implement the story. Source: BMAD story (slug: " + slug + ").",
        "",
        "---",
        "",
        "## Objective (reminder)",
        "",
        intro or "(No objective.)",
        "",
        "---",
        "",
        "## Steps",
        "",
    ]
    parts.extend([s + "\n" for s in steps])
    parts.append("")
    parts.append("---")
    parts.append("")
    parts.append("Before marking done, run: `bash scripts/verify.sh`")
    return "\n".join(parts)


def build_task_md(slug: str, story_id: str, index: int) -> str:
    """Ralph task file content."""
    num = str(index).zfill(3)
    title = slug.replace("-", " ").title()
    return f"""# Task {num}: {title}

**Story ID:** {story_id}
**Spec:** specs/{slug}/

Implement the PDFKit rendering feature according to:

- specs/{slug}/requirements.md
- specs/{slug}/design.md
- specs/{slug}/implementation-plan.md

Definition of done: `bash scripts/verify.sh` passes.
"""


def extract_story_id(content: str) -> str:
    """Read Story ID from **Story ID:** line."""
    for line in content.splitlines():
        m = re.match(r"^\*\*Story ID:\*\*\s+(.+)$", line)
        if m:
            return m.group(1).strip()
    return "unknown"


def process_story(project_root: Path, story_path: Path, index: int) -> None:
    """Generate spec folder and task file for one story."""
    slug = slug_from_filename(story_path)
    content = story_path.read_text(encoding="utf-8")
    sections = split_sections(content)
    story_id = extract_story_id(content)

    spec_dir = project_root / SPECS_DIR / slug
    spec_dir.mkdir(parents=True, exist_ok=True)

    (spec_dir / "requirements.md").write_text(
        build_requirements_md(sections, story_id), encoding="utf-8"
    )
    (spec_dir / "design.md").write_text(build_design_md(sections), encoding="utf-8")
    (spec_dir / "implementation-plan.md").write_text(
        build_implementation_plan_md(sections, slug), encoding="utf-8"
    )

    tasks_dir = project_root / RALPH_TASKS_DIR
    tasks_dir.mkdir(parents=True, exist_ok=True)
    task_path = tasks_dir / f"{str(index).zfill(3)}-{slug}.code-task.md"
    task_path.write_text(build_task_md(slug, story_id, index), encoding="utf-8")

    print(f"  {story_path.name} -> specs/{slug}/ and {task_path.relative_to(project_root)}")


def main() -> None:
    parser = argparse.ArgumentParser(description="BMAD story → Ralph specs and tasks")
    parser.add_argument(
        "--project",
        type=Path,
        default=Path("."),
        help="Project root (default: current directory)",
    )
    args = parser.parse_args()
    project_root = args.project.resolve()
    artifacts = project_root / ARTIFACTS_DIR
    if not artifacts.is_dir():
        print(f"Artifacts dir not found: {artifacts}")
        return
    stories = sorted(artifacts.glob(STORY_GLOB))
    if not stories:
        print(f"No {STORY_GLOB} files in {artifacts}")
        return
    print(f"Converting {len(stories)} story/stories to Ralph specs...")
    for i, path in enumerate(stories, start=1):
        process_story(project_root, path, i)
    print("Done.")


if __name__ == "__main__":
    main()
