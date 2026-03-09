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
import type { IdentityPillars, StructuredResume } from '@repo/types';

const MODEL = 'claude-sonnet-4-6';

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
 * explicitly instructed not to modify them.
 */
function buildSystemPrompt(pillars: IdentityPillars): string {
  return `You are an expert resume writer specialising in ATS (Applicant Tracking System) optimisation.
Your task is to rewrite the candidate's resume to target the provided job description.

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
  summary: string;            // 2–4 sentence professional summary paragraph
  experience: Array<{
    title: string;
    company: string;
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
 *
 * @throws {RedraftError} with code MISSING_ANTHROPIC_KEY | INVALID_ANTHROPIC_KEY |
 *   ANTHROPIC_RATE_LIMITED | REDRAFT_PARSE_FAILED
 */
export async function redraftResume(
  jd: string,
  pillars: IdentityPillars,
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
      system: buildSystemPrompt(pillars),
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

  const resume = validateStructuredResume(parsed, pillars);
  return resume;
}

/**
 * Validate parsed JSON is a StructuredResume and enforce identity pillar values.
 * Throws RedraftError with REDRAFT_PARSE_FAILED if the shape is wrong.
 */
function validateStructuredResume(parsed: unknown, pillars: IdentityPillars): StructuredResume {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new RedraftError('REDRAFT_PARSE_FAILED', 'Response JSON is not an object.');
  }

  const obj = parsed as Record<string, unknown>;

  if (typeof obj.name !== 'string' || !obj.name) {
    throw new RedraftError('REDRAFT_PARSE_FAILED', 'Missing or invalid field: name');
  }
  if (typeof obj.headline !== 'string' || !obj.headline) {
    throw new RedraftError('REDRAFT_PARSE_FAILED', 'Missing or invalid field: headline');
  }
  if (typeof obj.summary !== 'string' || !obj.summary) {
    throw new RedraftError('REDRAFT_PARSE_FAILED', 'Missing or invalid field: summary');
  }
  if (!Array.isArray(obj.experience)) {
    throw new RedraftError('REDRAFT_PARSE_FAILED', 'Missing or invalid field: experience');
  }
  if (!Array.isArray(obj.education)) {
    throw new RedraftError('REDRAFT_PARSE_FAILED', 'Missing or invalid field: education');
  }
  if (!Array.isArray(obj.skills)) {
    throw new RedraftError('REDRAFT_PARSE_FAILED', 'Missing or invalid field: skills');
  }

  const contact =
    typeof obj.contact === 'object' && obj.contact !== null
      ? (obj.contact as Record<string, unknown>)
      : {};

  // Enforce identity pillars — override whatever the model returned
  const resume: StructuredResume = {
    name: pillars.name,
    contact: {
      email: pillars.email,
      phone: pillars.phone,
      ...(typeof contact.linkedin === 'string' && { linkedin: contact.linkedin }),
      ...(typeof contact.location === 'string' && { location: contact.location }),
    },
    headline: obj.headline as string,
    summary: obj.summary as string,
    experience: (obj.experience as unknown[]).map((e, i) => {
      const entry = e as Record<string, unknown>;
      if (typeof entry.title !== 'string' || typeof entry.company !== 'string') {
        throw new RedraftError(
          'REDRAFT_PARSE_FAILED',
          `experience[${i}] missing title or company`,
        );
      }
      return {
        title: entry.title,
        company: entry.company,
        ...(typeof entry.location === 'string' && { location: entry.location }),
        startDate: typeof entry.startDate === 'string' ? entry.startDate : '',
        ...(typeof entry.endDate === 'string' && { endDate: entry.endDate }),
        bullets: Array.isArray(entry.bullets)
          ? (entry.bullets as unknown[]).filter((b) => typeof b === 'string')
          : [],
      };
    }),
    education: (obj.education as unknown[]).map((e) => {
      const entry = e as Record<string, unknown>;
      return {
        degree: typeof entry.degree === 'string' ? entry.degree : '',
        institution: typeof entry.institution === 'string' ? entry.institution : '',
        ...(typeof entry.location === 'string' && { location: entry.location }),
        ...(typeof entry.graduationDate === 'string' && {
          graduationDate: entry.graduationDate,
        }),
      };
    }),
    skills: (obj.skills as unknown[]).filter((s) => typeof s === 'string') as string[],
  };

  return resume;
}

/** CLI entry: run via `node .../redraft.js --jd <path> [--market AU|US]`. */
export async function redraft() {
  const fs = await import('fs');
  const { resolveIdentityPillars } = await import('../identity-defaults.js');

  const jdPath = process.argv[process.argv.indexOf('--jd') + 1];
  const marketRaw = process.argv[process.argv.indexOf('--market') + 1] || 'AU';
  const market: 'US' | 'AU' = marketRaw === 'US' ? 'US' : 'AU';

  console.log(`Starting redraft (Market: ${market})...`);

  const jdText = fs.readFileSync(jdPath, 'utf-8');
  const pillars = resolveIdentityPillars({ targetMarket: market });

  console.log(`Identity locked: ${pillars.name} | ${pillars.phone}`);
  console.log('Calling Anthropic...');

  const result = await redraftResume(jdText, pillars);
  console.log(JSON.stringify(result, null, 2));
}

// Run CLI only when invoked with --jd (avoids running when imported by runPipeline/tests)
if (typeof process !== 'undefined' && process.argv?.includes('--jd')) {
  redraft().catch((err) => {
    console.error(err instanceof RedraftError ? `[${err.code}] ${err.message}` : err);
    process.exit(1);
  });
}
