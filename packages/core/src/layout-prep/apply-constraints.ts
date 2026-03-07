/**
 * Applies template character/line limits to raw AI resume output.
 * Returns a constrained copy of the resume + LayoutPrepMetadata.
 *
 * This is the ONLY place truncation runs. The rendering layer receives
 * only the constrained output and must not perform any content trimming.
 *
 * @placeholder — full implementation in a future story.
 */
import type { LayoutPrepMetadata, StructuredResume, TemplateContract } from '@repo/types';

export interface ConstraintResult {
  resume: StructuredResume;
  metadata: LayoutPrepMetadata;
}

/** @placeholder */
export function applyConstraints(
  _resume: StructuredResume,
  _contract: TemplateContract
): ConstraintResult {
  throw new Error('applyConstraints: not implemented yet.');
}
