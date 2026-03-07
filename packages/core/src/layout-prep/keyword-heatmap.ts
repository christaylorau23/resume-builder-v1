/**
 * ATS keyword heatmap — Superhuman tiered scoring algorithm.
 *
 * Tier weights:  hard=1.0 | alias=0.7 | contextual=0.3
 * score = Σ(weight_i for present_i) / Σ(weight_i for all_i)
 *
 * Output includes per-section density and nonNegotiable flags so the
 * Layout Engine can protect high-tier keywords during FR12 (character limits)
 * and FR13 (searchable PDF) truncation, including iOS "Perfect Spacing".
 *
 * Does NOT block rendering — always returns a valid KeywordHeatmap, never throws.
 */
import type { KeywordHeatmap, KeywordSection, StructuredResume } from '@repo/types';

export type KeywordTier = 'hard' | 'alias' | 'contextual';

export interface TieredKeyword {
  term: string;
  tier: KeywordTier;
}

const TIER_WEIGHTS: Record<KeywordTier, number> = {
  hard: 1.0,
  alias: 0.7,
  contextual: 0.3,
};

/** Joins an array of text fields into a single lowercase corpus for scanning. */
function buildCorpus(fields: (string | undefined)[]): string {
  return fields
    .filter((f): f is string => Boolean(f))
    .join(' ')
    .toLowerCase();
}

/**
 * Returns true when `term` appears in `corpus`.
 *
 * - Multi-word phrases: substring match (phrase provides its own word context).
 * - Single-word terms: lookahead/lookbehind word boundary `(?<!\w)..(?!\w)`
 *   to avoid false positives (e.g. "Java" must not match "JavaScript").
 *   Uses lookbehind (ES2018+, safe in all modern Node/V8 versions) instead of
 *   `\b` so that terms starting with non-word chars (e.g. ".NET") work correctly.
 * - All regex metacharacters in `term` are escaped before building the pattern.
 */
function termFound(corpus: string, term: string): boolean {
  const lower = term.toLowerCase();
  if (lower.includes(' ')) {
    return corpus.includes(lower);
  }
  const escaped = lower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<!\\w)${escaped}(?!\\w)`).test(corpus);
}

/** Builds a KeywordSection from pre-computed per-section data. */
function buildSection(
  sectionKeywords: string[],
  hasHardKeyword: boolean,
  weightedInSection: number,
  weightedTotal: number
): KeywordSection {
  return {
    keywords: sectionKeywords,
    nonNegotiable: hasHardKeyword,
    density: weightedTotal === 0 ? 0 : weightedInSection / weightedTotal,
  };
}

/** Empty section returned when there are no keywords to evaluate. */
function emptySection(): KeywordSection {
  return { keywords: [], nonNegotiable: false, density: 0 };
}

export function computeKeywordHeatmap(
  resume: StructuredResume,
  jdKeywords: TieredKeyword[]
): { keywordHeatmap: KeywordHeatmap } {
  if (jdKeywords.length === 0) {
    return {
      keywordHeatmap: {
        present: [],
        missing: [],
        score: 1,
        sections: {
          summary: emptySection(),
          experience: emptySection(),
          skills: emptySection(),
          education: emptySection(),
        },
        tiers: {
          hard: { present: [], missing: [] },
          alias: { present: [], missing: [] },
          contextual: { present: [], missing: [] },
        },
      },
    };
  }

  // Build per-section corpora. Headline sits with summary (adjacent in layout;
  // never independently truncated).
  const corpusSummary = buildCorpus([resume.headline, resume.summary]);
  const corpusExperience = buildCorpus(
    resume.experience.flatMap((e) => [e.title, e.company, e.location ?? '', ...e.bullets])
  );
  const corpusSkills = buildCorpus(resume.skills);
  const corpusEducation = buildCorpus(
    resume.education.flatMap((e) => [e.degree, e.institution, e.location ?? ''])
  );
  // Global corpus = everything (name included for completeness).
  const corpusGlobal = buildCorpus([
    resume.name,
    corpusSummary,
    corpusExperience,
    corpusSkills,
    corpusEducation,
  ]);

  // Accumulators — flat lists
  const present: string[] = [];
  const missing: string[] = [];
  const tiers = {
    hard: { present: [] as string[], missing: [] as string[] },
    alias: { present: [] as string[], missing: [] as string[] },
    contextual: { present: [] as string[], missing: [] as string[] },
  };

  // Per-section accumulators
  const sec = {
    summary:    { keywords: [] as string[], hasHard: false, weighted: 0 },
    experience: { keywords: [] as string[], hasHard: false, weighted: 0 },
    skills:     { keywords: [] as string[], hasHard: false, weighted: 0 },
    education:  { keywords: [] as string[], hasHard: false, weighted: 0 },
  };

  let weightedPresent = 0;
  let weightedTotal = 0;

  for (const kw of jdKeywords) {
    const weight = TIER_WEIGHTS[kw.tier];
    weightedTotal += weight;

    const foundGlobal = termFound(corpusGlobal, kw.term);
    if (foundGlobal) {
      present.push(kw.term);
      weightedPresent += weight;
      tiers[kw.tier].present.push(kw.term);
    } else {
      missing.push(kw.term);
      tiers[kw.tier].missing.push(kw.term);
    }

    // Per-section matching (independent of global — keyword may be in multiple sections)
    const sectionHits: [keyof typeof sec, string][] = [
      ['summary', corpusSummary],
      ['experience', corpusExperience],
      ['skills', corpusSkills],
      ['education', corpusEducation],
    ];
    for (const [name, corpus] of sectionHits) {
      if (termFound(corpus, kw.term)) {
        sec[name].keywords.push(kw.term);
        sec[name].weighted += weight;
        if (kw.tier === 'hard') sec[name].hasHard = true;
      }
    }
  }

  const score = weightedTotal === 0 ? 1 : weightedPresent / weightedTotal;

  return {
    keywordHeatmap: {
      present,
      missing,
      score,
      sections: {
        summary:    buildSection(sec.summary.keywords,    sec.summary.hasHard,    sec.summary.weighted,    weightedTotal),
        experience: buildSection(sec.experience.keywords, sec.experience.hasHard, sec.experience.weighted, weightedTotal),
        skills:     buildSection(sec.skills.keywords,     sec.skills.hasHard,     sec.skills.weighted,     weightedTotal),
        education:  buildSection(sec.education.keywords,  sec.education.hasHard,  sec.education.weighted,  weightedTotal),
      },
      tiers,
    },
  };
}
