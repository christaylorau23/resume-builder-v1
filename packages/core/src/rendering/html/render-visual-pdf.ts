/**
 * Render a StructuredResume as a designer-grade visual PDF using Puppeteer.
 * This is the "print" counterpart to the ATS PDFKit PDF.
 *
 * WSL note: --no-sandbox is required for Chromium inside WSL2.
 * Failure is isolated — never throws; returns undefined on error.
 */
import type { StructuredResume, IdentityPillars } from '@repo/types';
import { buildHtmlResume } from './template';

export async function renderVisualPdf(
  resume: StructuredResume,
  pillars: IdentityPillars
): Promise<Buffer | undefined> {
  try {
    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    try {
      const page = await browser.newPage();
      const html = buildHtmlResume(resume, pillars);
      await page.setContent(html, { waitUntil: 'load' });
      const pdfBytes = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      });
      return Buffer.from(pdfBytes);
    } finally {
      await browser.close();
    }
  } catch (err) {
    console.error('[renderVisualPdf] failed:', err instanceof Error ? err.message : String(err));
    return undefined;
  }
}
