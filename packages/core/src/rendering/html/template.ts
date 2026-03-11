/**
 * "Liquid Glass" HTML/CSS resume template.
 * Renders a StructuredResume as a clean, print-optimised HTML document.
 * No external CDN fonts — system fonts only for zero-network rendering.
 */
import type { StructuredResume, IdentityPillars } from '@repo/types';

/** Escape HTML special chars to prevent XSS in template literals. */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildHtmlResume(resume: StructuredResume, pillars: IdentityPillars): string {
  const name = esc(resume.name || pillars.name);
  const contact = [
    resume.contact.email || pillars.email,
    resume.contact.phone || pillars.phone,
    resume.contact.linkedin,
    resume.contact.location,
  ]
    .filter((v): v is string => !!v)
    .map(esc)
    .join(' &nbsp;·&nbsp; ');

  const experience = resume.experience
    .map(
      (exp) => `
    <div class="exp-item">
      <div class="exp-header">
        <div class="exp-title">
          ${esc(exp.title)}<span class="sep"> — </span><span class="exp-company">${esc(exp.company)}</span>${exp.location ? `<span class="sep"> · </span><span class="exp-location">${esc(exp.location)}</span>` : ''}
        </div>
        <div class="exp-dates">${esc(exp.startDate)}–${esc(exp.endDate ?? 'Present')}</div>
      </div>
      <ul class="bullet-list">
        ${exp.bullets.map((b) => `<li>${esc(b)}</li>`).join('\n        ')}
      </ul>
    </div>`
    )
    .join('\n');

  const education = resume.education
    .map(
      (edu) => `
    <div class="edu-item">
      <div class="edu-header">
        <div class="edu-degree">${esc(edu.degree)}${edu.institution ? `<span class="sep"> — </span><span class="edu-institution">${esc(edu.institution)}</span>` : ''}${edu.location ? `<span class="sep"> · </span><span class="edu-loc">${esc(edu.location)}</span>` : ''}</div>
        <div class="edu-dates">${esc(edu.graduationDate ?? '')}</div>
      </div>
    </div>`
    )
    .join('\n');

  const skills = resume.skills.map(esc).join(' &nbsp;·&nbsp; ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${name} — Resume</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  @page {
    size: A4;
    margin: 0;
  }

  body {
    font-family: 'Georgia', 'Times New Roman', serif;
    font-size: 10.5pt;
    line-height: 1.5;
    color: #111;
    background: #fff;
    padding: 20mm 20mm 20mm 20mm;
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
  }

  @media print {
    body { padding: 20mm 20mm 20mm 20mm; }
  }

  /* ── Header ──────────────────────────────────────── */
  .resume-name {
    font-family: 'Georgia', serif;
    font-size: 18pt;
    font-weight: bold;
    letter-spacing: 0.01em;
    color: #111;
    margin-bottom: 3pt;
  }

  .resume-headline {
    font-family: system-ui, -apple-system, 'Helvetica Neue', sans-serif;
    font-size: 10pt;
    color: #444;
    font-style: italic;
    margin-bottom: 5pt;
  }

  .resume-contact {
    font-family: system-ui, -apple-system, 'Helvetica Neue', sans-serif;
    font-size: 10pt;
    color: #555;
    margin-bottom: 11pt;
  }

  .header-rule {
    border: none;
    border-top: 0.75px solid #555;
    margin-bottom: 13pt;
  }

  /* ── Sections ─────────────────────────────────────── */
  .section {
    margin-bottom: 13pt;
    page-break-inside: avoid;
  }

  .section-label {
    font-family: system-ui, -apple-system, 'Helvetica Neue', sans-serif;
    font-size: 9pt;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #111;
    padding-bottom: 3pt;
    border-bottom: 0.75px solid #bbb;
    margin-bottom: 7pt;
  }

  /* ── Summary ──────────────────────────────────────── */
  .summary-text {
    font-size: 10.5pt;
    line-height: 1.6;
    color: #222;
  }

  /* ── Experience ───────────────────────────────────── */
  .exp-item { margin-bottom: 9pt; page-break-inside: avoid; }

  .exp-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8pt;
    margin-bottom: 3pt;
  }

  .exp-title {
    font-family: system-ui, -apple-system, 'Helvetica Neue', sans-serif;
    font-size: 10pt;
    font-weight: 600;
    color: #111;
    flex: 1;
  }

  .exp-company { font-weight: 400; color: #333; }
  .exp-location { font-weight: 400; color: #666; }
  .sep { color: #888; }

  .exp-dates {
    font-family: system-ui, -apple-system, 'Helvetica Neue', sans-serif;
    font-size: 8.5pt;
    color: #666;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .bullet-list {
    margin-left: 13pt;
    margin-top: 1pt;
  }

  .bullet-list li {
    font-size: 10pt;
    line-height: 1.5;
    color: #222;
    margin-bottom: 3pt;
  }

  /* ── Education ─────────────────────────────────────── */
  .edu-item { margin-bottom: 5pt; page-break-inside: avoid; }

  .edu-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8pt;
  }

  .edu-degree {
    font-family: system-ui, -apple-system, 'Helvetica Neue', sans-serif;
    font-size: 10pt;
    font-weight: 600;
    color: #111;
    flex: 1;
  }

  .edu-institution { font-weight: 400; color: #333; }
  .edu-loc { font-weight: 400; color: #666; }

  .edu-dates {
    font-family: system-ui, -apple-system, 'Helvetica Neue', sans-serif;
    font-size: 8.5pt;
    color: #666;
    white-space: nowrap;
    flex-shrink: 0;
  }

  /* ── Skills ────────────────────────────────────────── */
  .skills-text {
    font-family: system-ui, -apple-system, 'Helvetica Neue', sans-serif;
    font-size: 10pt;
    color: #222;
    line-height: 1.5;
  }
</style>
</head>
<body>
  <div class="resume-name">${name}</div>
  <div class="resume-headline">${esc(resume.targetRole ?? resume.headline)}</div>
  <div class="resume-contact">${contact}</div>
  <hr class="header-rule" />

  <div class="section">
    <div class="section-label">Summary</div>
    <div class="summary-text">${esc(resume.summary)}</div>
  </div>

  <div class="section">
    <div class="section-label">Experience</div>
    ${experience}
  </div>

  ${
    resume.education.length > 0
      ? `<div class="section">
    <div class="section-label">Education</div>
    ${education}
  </div>`
      : ''
  }

  ${
    resume.skills.length > 0
      ? `<div class="section">
    <div class="section-label">Skills</div>
    <div class="skills-text">${skills}</div>
  </div>`
      : ''
  }
</body>
</html>`;
}
