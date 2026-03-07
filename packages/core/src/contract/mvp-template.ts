/**
 * MVP template contract — character and line limits for the single MVP resume template.
 *
 * These limits are the source of truth consumed by:
 *   - layout-prep/apply-constraints.ts (enforcement + truncation)
 *   - rendering/pdf/build-pdf.ts (layout assumptions)
 *   - rendering/canva/export-canva.ts (Canva field mapping)
 *
 * Limits below are stubs — actual values must be measured against the
 * physical Canva template and PDF layout in a future story.
 */
import type { TemplateContract } from '@repo/types';

export const MVP_TEMPLATE_CONTRACT: TemplateContract = {
  name: 'mvp-v1',
  fields: {
    name: { maxChars: 60, strategy: 'trim' },
    headline: { maxChars: 80, strategy: 'ellipsis' },
    summary: { maxChars: 400, strategy: 'ellipsis' },
    'experience[].title': { maxChars: 60, strategy: 'trim' },
    'experience[].company': { maxChars: 60, strategy: 'trim' },
    'experience[].bullets[]': { maxChars: 120, strategy: 'ellipsis' },
    'education[].degree': { maxChars: 80, strategy: 'trim' },
    skills: { maxLines: 2, strategy: 'collapse' },
  },
};
