/**
 * Extract tiered keywords from a job description for ATS optimization.
 *
 * Uses Anthropic claude-sonnet-4-6 to identify and tier keywords (hard / alias / contextual)
 * so the redraft step can weave them into the resume and the heatmap can verify coverage.
 *
 * Throws ExtractKeywordsError with codes: MISSING_ANTHROPIC_KEY | INVALID_ANTHROPIC_KEY |
 *   ANTHROPIC_RATE_LIMITED | EXTRACT_PARSE_FAILED
 */
import Anthropic from '@anthropic-ai/sdk';
import type { TieredKeyword } from '../layout-prep/keyword-heatmap';

const MODEL = 'claude-sonnet-4-6';

const EXTRACT_SYSTEM_PROMPT = `You are an expert at parsing job descriptions for ATS (Applicant Tracking System) optimization.

Your task: from the given job description, extract keywords and phrases that matter for resume matching. Return a JSON array only (no markdown, no explanation).

TIERS:
- "hard": Role title(s), required skills, must-have tools/technologies, required certifications, and exact phrases that appear in "required" or "must have" sections. Use exact wording from the JD when possible.
- "alias": Preferred skills, equivalent terms, or synonyms that recruiters/ATS might accept (e.g. "React" when JD says "React.js").
- "contextual": Domain phrases, nice-to-have experience, or recurring themes that add context (e.g. "agile", "cross-functional").

RULES:
- Prefer exact phrases from the JD over paraphrases.
- Include multi-word phrases where they appear verbatim (e.g. "machine learning", "REST APIs").
- Deduplicate: do not list the same concept twice.
- Limit to the most impactful terms: aim for 8–20 hard, 5–15 alias, 5–15 contextual.
- Output ONLY a valid JSON array of objects: [ { "term": "string", "tier": "hard"|"alias"|"contextual" }, ... ]`;

export class ExtractKeywordsError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ExtractKeywordsError';
  }
}

/**
 * Extract tiered keywords from a job description using the same Anthropic API as redraft.
 *
 * @throws {ExtractKeywordsError} with code MISSING_ANTHROPIC_KEY | INVALID_ANTHROPIC_KEY |
 *   ANTHROPIC_RATE_LIMITED | EXTRACT_PARSE_FAILED
 */
export async function extractJdKeywords(jd: string): Promise<TieredKeyword[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new ExtractKeywordsError(
      'MISSING_ANTHROPIC_KEY',
      'ANTHROPIC_API_KEY is not set. Add it to apps/api/.env or your hosting environment.',
    );
  }

  const client = new Anthropic({ apiKey });

  let responseText: string;
  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: EXTRACT_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Extract ATS keywords from this job description:\n\n${jd}`,
        },
      ],
    });

    const block = message.content[0];
    if (block?.type !== 'text') {
      throw new ExtractKeywordsError(
        'EXTRACT_PARSE_FAILED',
        'Anthropic response did not contain a text block.',
      );
    }
    responseText = block.text.trim();
  } catch (err) {
    if (err instanceof ExtractKeywordsError) throw err;

    if (err instanceof Anthropic.AuthenticationError) {
      throw new ExtractKeywordsError(
        'INVALID_ANTHROPIC_KEY',
        'Anthropic API key was rejected (401). Check ANTHROPIC_API_KEY.',
        err,
      );
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new ExtractKeywordsError(
        'ANTHROPIC_RATE_LIMITED',
        'Anthropic rate limit reached (429). Retry shortly.',
        err,
      );
    }
    throw new ExtractKeywordsError(
      'EXTRACT_PARSE_FAILED',
      `Keyword extraction failed: ${err instanceof Error ? err.message : String(err)}`,
      err,
    );
  }

  const jsonText = responseText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new ExtractKeywordsError(
      'EXTRACT_PARSE_FAILED',
      `Response was not valid JSON. First 200 chars: ${jsonText.slice(0, 200)}`,
    );
  }

  return validateTieredKeywords(parsed);
}

const VALID_TIERS = ['hard', 'alias', 'contextual'] as const;

function validateTieredKeywords(parsed: unknown): TieredKeyword[] {
  if (!Array.isArray(parsed)) {
    throw new ExtractKeywordsError('EXTRACT_PARSE_FAILED', 'Response JSON is not an array.');
  }

  const result: TieredKeyword[] = [];
  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i];
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new ExtractKeywordsError(
        'EXTRACT_PARSE_FAILED',
        `Keyword at index ${i} is not an object.`,
      );
    }
    const obj = item as Record<string, unknown>;
    if (typeof obj.term !== 'string' || !obj.term.trim()) {
      throw new ExtractKeywordsError(
        'EXTRACT_PARSE_FAILED',
        `Keyword at index ${i} missing or invalid "term".`,
      );
    }
    if (!VALID_TIERS.includes(obj.tier as (typeof VALID_TIERS)[number])) {
      throw new ExtractKeywordsError(
        'EXTRACT_PARSE_FAILED',
        `Keyword at index ${i} has invalid "tier". Must be hard, alias, or contextual.`,
      );
    }
    result.push({ term: obj.term.trim(), tier: obj.tier as TieredKeyword['tier'] });
  }
  return result;
}
