/**
 * Per-field truncation strategies used by applyConstraints.
 * - 'trim'     : hard cut at maxChars
 * - 'ellipsis' : cut at maxChars - 1 and append '…'
 * - 'collapse' : for list fields, collapse extra items (see applyConstraints for list handling)
 */
import type { FieldLimit } from '@repo/types';

/**
 * Truncates a string value according to the given field limit.
 * Returns the original value unchanged when it is within the limit.
 */
export function truncateField(value: string, limit: FieldLimit): string {
  if (limit.maxChars === undefined) return value;
  if (value.length <= limit.maxChars) return value;

  if (limit.strategy === 'ellipsis') {
    return value.slice(0, limit.maxChars - 1) + '\u2026'; // '…'
  }
  // 'trim' and 'collapse' both hard-cut at maxChars
  return value.slice(0, limit.maxChars);
}
