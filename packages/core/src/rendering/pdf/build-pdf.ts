/**
 * PDF generation via PDFKit — ATS-critical Tagged PDF / PDF/UA renderer.
 *
 * ATS-CRITICAL invariants (NEVER change):
 *   tagged: true        — enables Tagged PDF / PDF/UA logical structure
 *   pdfVersion: '1.5'  — minimum version required for Tagged PDF
 *   subset: 'PDF/UA'   — full PDF/UA (ISO 14289-1) compliance
 *   doc.text() only    — all resume text stays as real embedded text; NEVER flatten to paths
 *
 * Content/layout separation: this renderer receives ONLY pre-constrained content
 * from the layout-prep step. No truncation, no AI calls, no Canva logic here.
 */
import PDFDocument from 'pdfkit';
import type { KeywordHeatmap, StructuredResume } from '@repo/types';

// ─── Page layout constants ────────────────────────────────────────────────────
// All spatial values in PDF points (1 pt = 1/72 inch).

const PAGE_WIDTH_PT = 595.28; // A4 width
const PAGE_HEIGHT_PT = 841.89; // A4 height
const MARGIN_PT = 56; // ~20 mm
const BASELINE_LINE_GAP = 4; // pt — adjusted ±10% for Perfect Spacing
const BULLET_GAP = 3; // pt between bullets
const SECTION_MARGIN = 12; // pt below each section heading rule

// ─── Types ────────────────────────────────────────────────────────────────────

type PDFDoc = InstanceType<typeof PDFDocument>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Draws a thin horizontal rule at the current y position and advances. */
function drawRule(doc: PDFDoc): void {
  const x = MARGIN_PT;
  const y = doc.y;
  doc
    .moveTo(x, y)
    .lineTo(PAGE_WIDTH_PT - MARGIN_PT, y)
    .lineWidth(0.5)
    .strokeColor('#444444')
    .stroke();
  doc.moveDown(0.3);
}

/** Section heading: bold label + rule underneath. */
function renderSectionHeading(doc: PDFDoc, label: string, lineGap: number): void {
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000');
  doc.text(label, { lineGap });
  drawRule(doc);
  doc.moveDown(SECTION_MARGIN / 12);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Build a tagged, searchable PDF from constrained resume content.
 *
 * @param resume  Constrained resume — output of the layout-prep step.
 * @param heatmap ATS keyword heatmap — sections with nonNegotiable===true MUST be rendered in full.
 * @returns PDF as a Buffer ready for file write or HTTP response.
 * @throws If content overflows the page (layout-prep constraints are too loose).
 */
export async function buildPdf(
  resume: StructuredResume,
  heatmap: KeywordHeatmap,
): Promise<Buffer> {
  // Validate: nonNegotiable sections must exist in the resume.
  // (Content was already constrained by layout-prep; we just assert correctness.)
  if (heatmap.sections.summary.nonNegotiable && !resume.summary) {
    throw new Error('buildPdf: summary section is nonNegotiable but resume.summary is empty.');
  }
  if (heatmap.sections.skills.nonNegotiable && resume.skills.length === 0) {
    throw new Error('buildPdf: skills section is nonNegotiable but resume.skills is empty.');
  }

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      tagged: true,
      pdfVersion: '1.5',
      // @ts-expect-error — 'PDF/UA' is a valid pdfkit subset value but the @types/pdfkit 0.13.x
      // type definition is missing it. pdfkit 0.17 supports it at runtime.
      subset: 'PDF/UA',
      info: { Title: resume.name },
      size: 'A4',
      margins: { top: MARGIN_PT, bottom: MARGIN_PT, left: MARGIN_PT, right: MARGIN_PT },
      autoFirstPage: true,
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    try {
      renderResume(doc, resume);
    } catch (err) {
      reject(err);
      doc.end();
      return;
    }

    doc.end();
  });
}

// ─── Renderer ─────────────────────────────────────────────────────────────────

function renderResume(doc: PDFDoc, resume: StructuredResume): void {
  // ── Perfect Spacing: compute adjusted lineGap ──────────────────────────────
  // Count total content items to estimate density, then nudge lineGap within ±10%.
  const bulletCount = resume.experience.reduce((n, e) => n + e.bullets.length, 0);
  const contentDensity =
    resume.experience.length * 2 + bulletCount + resume.education.length + 1; // 1 for summary
  // Dense content → tighter gap; sparse → looser. Clamp to ±10% of baseline.
  const densityFactor = Math.min(1, Math.max(0, contentDensity / 20));
  const lineGap = BASELINE_LINE_GAP * (1 + 0.1 - 0.2 * densityFactor); // [0.9, 1.1] × baseline

  // ── Document structure root ────────────────────────────────────────────────
  const docStruct = doc.struct('Document');
  doc.addStructure(docStruct);

  // ── Header: name, contact, headline ───────────────────────────────────────
  const headerSect = doc.struct('Sect', { title: 'Header' });
  docStruct.add(headerSect);

  headerSect.add(
    doc.struct('H', {}, () => {
      doc.fontSize(18).font('Helvetica-Bold').fillColor('#000000');
      doc.text(resume.name, { align: 'center', lineGap });
    }),
  );

  const contactParts = [
    resume.contact.email,
    resume.contact.phone,
    resume.contact.linkedin,
    resume.contact.location,
  ].filter((v): v is string => Boolean(v));

  if (contactParts.length > 0) {
    headerSect.add(
      doc.struct('P', {}, () => {
        doc.fontSize(10).font('Helvetica').fillColor('#333333');
        doc.text(contactParts.join('  |  '), { align: 'center', lineGap });
      }),
    );
  }

  const displayRole = resume.targetRole ?? resume.headline;
  if (displayRole) {
    headerSect.add(
      doc.struct('P', {}, () => {
        doc.fontSize(11).font('Helvetica-Oblique').fillColor('#000000');
        doc.text(displayRole, { align: 'center', lineGap });
      }),
    );
  }

  headerSect.end();
  doc.moveDown(0.6);

  // ── Summary ────────────────────────────────────────────────────────────────
  if (resume.summary) {
    const summarySect = doc.struct('Sect', { title: 'Summary' });
    docStruct.add(summarySect);

    summarySect.add(
      doc.struct('H', {}, () => {
        renderSectionHeading(doc, 'Summary', lineGap);
      }),
    );

    summarySect.add(
      doc.struct('P', {}, () => {
        doc.fontSize(10).font('Helvetica').fillColor('#000000');
        doc.text(resume.summary, { lineGap });
      }),
    );

    summarySect.end();
    doc.moveDown(0.6);
  }

  // ── Experience ─────────────────────────────────────────────────────────────
  if (resume.experience.length > 0) {
    const experienceSect = doc.struct('Sect', { title: 'Experience' });
    docStruct.add(experienceSect);

    experienceSect.add(
      doc.struct('H', {}, () => {
        renderSectionHeading(doc, 'Experience', lineGap);
      }),
    );

    for (const entry of resume.experience) {
      const entrySect = doc.struct('Sect', { title: entry.title });
      experienceSect.add(entrySect);

      // Job title + company line
      entrySect.add(
        doc.struct('P', {}, () => {
          const dateStr = `${entry.startDate} – ${entry.endDate ?? 'Present'}`;
          const leftText = `${entry.title}  ·  ${entry.company}${entry.location ? ', ' + entry.location : ''}`;
          doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000');
          doc.text(leftText, { continued: true, lineGap });
          doc.font('Helvetica').fillColor('#555555');
          doc.text(dateStr, { align: 'right', lineGap });
          doc.fillColor('#000000');
        }),
      );

      // Bullets
      if (entry.bullets.length > 0) {
        const bulletList = doc.struct('List');
        entrySect.add(bulletList);

        // Perfect Spacing: if last bullet would widow, collapse bullet gap
        const bulletGap =
          entry.bullets.length === 1 ? BULLET_GAP * 0.8 : BULLET_GAP;

        for (const bullet of entry.bullets) {
          bulletList.add(
            doc.struct('LI', {}, () => {
              doc.fontSize(10).font('Helvetica').fillColor('#000000');
              doc.text(`• ${bullet}`, { indent: 12, lineGap: bulletGap });
            }),
          );
        }

        bulletList.end();
      }

      entrySect.end();
      doc.moveDown(0.3);
    }

    experienceSect.end();
    doc.moveDown(0.3);
  }

  // ── Education ──────────────────────────────────────────────────────────────
  if (resume.education.length > 0) {
    const educationSect = doc.struct('Sect', { title: 'Education' });
    docStruct.add(educationSect);

    educationSect.add(
      doc.struct('H', {}, () => {
        renderSectionHeading(doc, 'Education', lineGap);
      }),
    );

    for (const entry of resume.education) {
      educationSect.add(
        doc.struct('P', {}, () => {
          const parts = [entry.degree, entry.institution];
          if (entry.location) parts.push(entry.location);
          if (entry.graduationDate) parts.push(entry.graduationDate);
          doc.fontSize(10).font('Helvetica').fillColor('#000000');
          doc.text(parts.join('  ·  '), { lineGap });
        }),
      );
    }

    educationSect.end();
    doc.moveDown(0.6);
  }

  // ── Skills ─────────────────────────────────────────────────────────────────
  if (resume.skills.length > 0) {
    const skillsSect = doc.struct('Sect', { title: 'Skills' });
    docStruct.add(skillsSect);

    skillsSect.add(
      doc.struct('H', {}, () => {
        renderSectionHeading(doc, 'Skills', lineGap);
      }),
    );

    const skillList = doc.struct('List');
    skillsSect.add(skillList);

    skillList.add(
      doc.struct('LI', {}, () => {
        doc.fontSize(10).font('Helvetica').fillColor('#000000');
        doc.text(resume.skills.join('  ·  '), { lineGap });
      }),
    );

    skillList.end();
    skillsSect.end();
  }

  // ── Overflow detection ─────────────────────────────────────────────────────
  const usableBottom = PAGE_HEIGHT_PT - MARGIN_PT;
  if (doc.y > usableBottom) {
    throw new Error(
      `buildPdf: content overflowed page (y=${doc.y.toFixed(1)}, limit=${usableBottom.toFixed(1)}). ` +
        'Layout-prep constraints must be tightened.',
    );
  }

  docStruct.end();
}
