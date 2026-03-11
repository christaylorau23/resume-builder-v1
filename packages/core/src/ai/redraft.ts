/**
 * AI resume redraft using Anthropic claude-sonnet-4-6.
 *
 * Reads ANTHROPIC_API_KEY from process.env (set in apps/api/.env or hosting env).
 * Identity pillars (name, email, phone) are injected verbatim into the system prompt
 * so the model never hallucinates these values.
 *
 * Throws structured error codes so the API layer can map them to user-facing messages:
 *   MISSING_ANTHROPIC_KEY  — ANTHROPIC_API_KEY not set
 *   INVALID_ANTHROPIC_KEY  — Anthropic returned 401
 *   ANTHROPIC_RATE_LIMITED — Anthropic returned 429
 *   REDRAFT_PARSE_FAILED   — response was not valid StructuredResume JSON
 */
import Anthropic from '@anthropic-ai/sdk';
import { ZodError } from 'zod';
import type { IdentityPillars, StructuredResume } from '@repo/types';
import type { TieredKeyword } from '../layout-prep/keyword-heatmap';
import { StructuredResumeSchema } from './schema';

const MODEL = 'claude-sonnet-4-6';

/** ATS rules (see docs/ats-standards-2026.md) — injected into redraft prompt. */
const ATS_RULES = `
ATS OPTIMIZATION RULES (must follow):
- Keyword tiering: Prioritize "Hard" (Tier 1) skills in the Experience and Skills sections.
- Contextual weaving: Keywords must appear inside result-oriented bullet points (e.g. "Scaled [Tool] to [Metric]"), not as a flat list.
- Layout: Respect character limits (headline ~40 chars, summary ~600, bullets ~150 each). Do not exceed them.
- Readability: Keep a natural narrative tone. Do not repeat the same Tier 1 keyword more than 3 times (stuffing hurts ATS in 2026).`;

/** Error thrown by redraftResume with a structured code for API-layer handling. */
export class RedraftError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'RedraftError';
  }
}

/**
 * Build the system prompt. Identity pillars are injected verbatim — the model is
 * explicitly instructed not to modify them. When keywords are provided, the prompt
 * includes an explicit Hard keyword list and ATS rules from docs/ats-standards-2026.md.
 */
function buildSystemPrompt(pillars: IdentityPillars, keywords?: TieredKeyword[]): string {
  const hardKeywordBlock =
    keywords && keywords.length > 0
      ? `
MUST-WEAVE KEYWORDS (from JD extraction): You MUST naturally include these Hard keywords in the resume (headline, summary, experience bullets, and/or skills). Prefer exact phrases from the JD. Do not repeat any Hard keyword more than 3 times.
Hard keywords: ${keywords.filter((k) => k.tier === 'hard').map((k) => k.term).join(', ') || '(none)'}
${keywords.some((k) => k.tier === 'alias' || k.tier === 'contextual') ? `Also consider weaving where natural: ${keywords.filter((k) => k.tier !== 'hard').map((k) => k.term).join(', ')}` : ''}
`
      : '';

  return `You are an expert resume writer specialising in ATS (Applicant Tracking System) optimisation.
Your task is to rewrite the candidate's resume to target the provided job description.
${ATS_RULES}
${hardKeywordBlock}
IDENTITY PILLARS — use these EXACTLY as written. Never alter, invent, or omit them:
  Name:  ${pillars.name}
  Email: ${pillars.email}
  Phone: ${pillars.phone}

INSTRUCTIONS:
1. Analyse the job description carefully: extract role requirements, required and preferred skills,
   tools, certifications, seniority signals, and recurring keyword phrases.
2. Rewrite the resume sections (headline, summary, experience bullets, skills) so they emphasise
   the candidate's relevant experience and naturally include the extracted keywords.
3. Weave keywords into the narrative — do not stuff or list them awkwardly.
4. Never fabricate job titles, companies, dates, or achievements not implied by the candidate's
   existing experience. Reframe and sharpen real experience; do not invent new experience.
5. Keep bullets concise and impact-focused (one strong action verb + measurable outcome where
   possible). Aim for 2–4 bullets per role.
6. The skills list should be a flat array of individual terms (tools, languages, frameworks,
   certifications) drawn from the JD and the candidate's background.

OUTPUT RULES:
- Respond with ONLY a valid JSON object. No markdown fences. No explanation. No preamble.
- The JSON must match this TypeScript interface exactly:

interface StructuredResume {
  name: string;               // MUST equal "${pillars.name}"
  contact: {
    email?: string;           // MUST equal "${pillars.email}"
    phone?: string;           // MUST equal "${pillars.phone}"
    linkedin?: string;
    location?: string;
  };
  headline: string;           // one-line professional title (e.g. "Senior Product Manager")
  targetRole: string;         // the exact role title from the JD (e.g. "Head of Content Strategy") — displayed as the resume header role. Must match the seniority and title family of the JD.
  summary: string;            // 2–4 sentence professional summary paragraph
  experience: Array<{
    title: string;            // FACTUAL job title — do NOT alter this. Use exactly as provided.
    company: string;          // FACTUAL company name — do NOT alter this. Use exactly as provided.
    location?: string;
    startDate: string;        // format: "YYYY-MM" or "Month YYYY"
    endDate?: string;         // "Present" or "YYYY-MM"
    bullets: string[];
  }>;
  education: Array<{
    degree: string;
    institution: string;
    location?: string;
    graduationDate?: string;
  }>;
  skills: string[];
}`;
}

/**
 * Redraft a resume from a job description using Anthropic claude-sonnet-4-6.
 * Identity pillars are injected verbatim; the model is constrained to use them unchanged.
 * When keywords are provided (e.g. from extractJdKeywords), the prompt includes an explicit
 * list of Hard keywords to weave and ATS rules from docs/ats-standards-2026.md.
 *
 * @throws {RedraftError} with code MISSING_ANTHROPIC_KEY | INVALID_ANTHROPIC_KEY |
 *   ANTHROPIC_RATE_LIMITED | REDRAFT_PARSE_FAILED
 */
export async function redraftResume(
  jd: string,
  pillars: IdentityPillars,
  keywords?: TieredKeyword[],
): Promise<StructuredResume> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new RedraftError(
      'MISSING_ANTHROPIC_KEY',
      'ANTHROPIC_API_KEY is not set. Add it to apps/api/.env or your hosting environment.',
    );
  }

  const client = new Anthropic({ apiKey });

  let responseText: string;
  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: buildSystemPrompt(pillars, keywords),
      messages: [
        {
          role: 'user',
          content: `Here is the job description to target:\n\n${jd}`,
        },
      ],
    });

    const block = message.content[0];
    if (block?.type !== 'text') {
      throw new RedraftError(
        'REDRAFT_PARSE_FAILED',
        'Anthropic response did not contain a text block.',
      );
    }
    responseText = block.text.trim();
  } catch (err) {
    if (err instanceof RedraftError) throw err;

    // Map Anthropic SDK API errors to structured codes
    if (err instanceof Anthropic.AuthenticationError) {
      throw new RedraftError(
        'INVALID_ANTHROPIC_KEY',
        'Anthropic API key was rejected (401). Check ANTHROPIC_API_KEY.',
        err,
      );
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new RedraftError(
        'ANTHROPIC_RATE_LIMITED',
        'Anthropic rate limit reached (429). Retry shortly.',
        err,
      );
    }
    throw new RedraftError(
      'REDRAFT_PARSE_FAILED',
      `Anthropic API call failed: ${err instanceof Error ? err.message : String(err)}`,
      err,
    );
  }

  // Strip any accidental markdown fence the model may have added
  const jsonText = responseText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new RedraftError(
      'REDRAFT_PARSE_FAILED',
      `Model response was not valid JSON. First 200 chars: ${jsonText.slice(0, 200)}`,
    );
  }

  let resume: StructuredResume;
  try {
    const validated = StructuredResumeSchema.parse(parsed);
    // Enforce identity pillars — override whatever the model returned
    resume = {
      ...validated,
      name: pillars.name,
      contact: {
        ...validated.contact,
        email: pillars.email,
        phone: pillars.phone,
      },
    };
  } catch (err) {
    if (err instanceof ZodError) {
      const issues = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
      throw new RedraftError(
        'REDRAFT_PARSE_FAILED',
        `AI output failed schema validation: ${issues}`,
        err,
      );
    }
    throw err;
  }

  return resume;
}

/**
 * CLI entry: run via `node .../redraft.js --jd <path> [--market AU|US] [--export pdf]`.
 *
 * --export pdf: runs the full pipeline (redraft → layout-prep → ATS PDF + Visual PDF).
 *   Without --export: prints StructuredResume JSON only (no pipeline, no PDF).
 */
export async function redraft() {
  const fs = await import('fs');
  const { resolveIdentityPillars } = await import('../identity-defaults.js');

  const argv = process.argv;
  const jdPath = argv[argv.indexOf('--jd') + 1];
  const marketRaw = argv[argv.indexOf('--market') + 1] || 'AU';
  const market: 'US' | 'AU' = marketRaw === 'US' ? 'US' : 'AU';
  const exportTarget = argv.includes('--export') ? argv[argv.indexOf('--export') + 1] : null;

  if (!jdPath) {
    console.error('Usage: pnpm run redraft --jd <path> [--market AU|US] [--export pdf]');
    process.exit(1);
  }

  console.log(`Starting redraft (Market: ${market})...`);

  const jdText = fs.readFileSync(jdPath, 'utf-8');
  const pillars = resolveIdentityPillars({ targetMarket: market });

  console.log(`Identity locked: ${pillars.name} | ${pillars.phone}`);

  if (exportTarget === 'pdf') {
    // Full pipeline path: redraft → ATS PDF + Visual PDF
    const { runPipeline } = await import('../pipeline/run-pipeline.js');
    console.log('Calling Anthropic + running full pipeline...');

    const result = await runPipeline({ jd: jdText, profile: { targetMarket: market } });

    console.log('\n--- Pipeline Result ---');
    if (result.visualPdf) {
      console.log(`Visual PDF size: ${result.visualPdf.length} bytes`);
    }
    if (result.warnings.length) {
      console.log('Warnings:', JSON.stringify(result.warnings, null, 2));
    }
    console.log(`ATS PDF size: ${result.pdf.length} bytes`);
  } else {
    // Redraft-only path: print StructuredResume JSON
    console.log('Calling Anthropic...');
    const result = await redraftResume(jdText, pillars);
    console.log(JSON.stringify(result, null, 2));
  }
}

// Run CLI only when invoked with --jd (avoids running when imported by runPipeline/tests)
if (typeof process !== 'undefined' && process.argv?.includes('--jd')) {
  redraft().catch((err) => {
    console.error(err instanceof RedraftError ? `[${err.code}] ${err.message}` : err);
    process.exit(1);
  });
}
