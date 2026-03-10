/**
 * MVP template contract — character and line limits for the ATS PDF (PDFKit).
 *
 * These limits are the source of truth consumed by:
 *   - layout-prep/apply-constraints.ts (enforcement + truncation)
 *   - rendering/pdf/build-pdf.ts (layout assumptions)
 *
 * The visual PDF (Puppeteer/HTML) in rendering/html/ has no character limits — HTML reflows.
 */
import type { TemplateContract } from '@repo/types';

export const MVP_TEMPLATE_CONTRACT: TemplateContract = {
  name: 'mvp-v1',
  fields: {
    name: { maxChars: 30, strategy: 'trim' },
    headline: { maxChars: 40, strategy: 'ellipsis' },
    summary: { maxChars: 600, strategy: 'ellipsis' },
    'experience[].title': { maxChars: 55, strategy: 'trim' },
    'experience[].company': { maxChars: 30, strategy: 'trim' },
    'experience[].bullets[]': { maxChars: 150, strategy: 'ellipsis' },
    'education[].degree': { maxChars: 45, strategy: 'trim' },
    skills: { maxLines: 16, strategy: 'collapse' },
  },
};
