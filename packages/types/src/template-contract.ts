/**
 * Per-field content limit for a resume template.
 * Implementation (actual limit values) lives in packages/core/src/contract/.
 */
export interface FieldLimit {
  /** Maximum character count for this field. */
  maxChars?: number;
  /** Maximum number of lines for this field. */
  maxLines?: number;
  /** Truncation strategy when content exceeds the limit. */
  strategy: 'trim' | 'ellipsis' | 'collapse';
}

/**
 * Mapping from structured resume field paths to their layout constraints.
 * Field paths use dot notation (e.g. "summary", "experience[].bullets[]").
 */
export interface TemplateContract {
  /** Human-readable template name (e.g. "mvp-v1"). */
  name: string;
  /** Map of field path → limit. */
  fields: Record<string, FieldLimit>;
}
