/**
 * Per-field truncation strategies used by applyConstraints.
 * - 'trim'     : hard cut at maxChars
 * - 'ellipsis' : cut at maxChars - 1 and append '…'
 * - 'collapse' : for list fields, collapse extra items into a "Key points: …" entry
 *
 * @placeholder — full implementation in a future story.
 */
import type { FieldLimit } from '@repo/types';

export function truncateField(value: string, limit: FieldLimit): string {
  throw new Error('truncateField: not implemented yet.');
}
