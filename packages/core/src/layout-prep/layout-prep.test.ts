import { describe, expect, it } from 'vitest';
import { computeKeywordHeatmap } from './keyword-heatmap';
import type { TieredKeyword } from './keyword-heatmap';
import type { StructuredResume } from '@repo/types';

// ─── Fixture ─────────────────────────────────────────────────────────────────

const BASE_RESUME: StructuredResume = {
  name: 'Jane Smith',
  contact: { email: 'jane@example.com' },
  headline: 'Senior Software Engineer',
  summary: 'Experienced engineer with expertise in TypeScript and React.',
  experience: [
    {
      title: 'Software Engineer',
      company: 'Acme Corp',
      startDate: '2020-01',
      bullets: ['Built REST APIs using Node.js', 'Led migration to TypeScript'],
    },
  ],
  education: [
    {
      degree: 'Bachelor of Computer Science',
      institution: 'State University',
    },
  ],
  skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('layout-prep', () => {
  it.todo('applyConstraints: truncates summary to maxChars with ellipsis strategy');
  it.todo('applyConstraints: sets hadTruncation=true and populates truncatedFields');
  it.todo('applyConstraints: no-ops when all fields are within limits');

  describe('computeKeywordHeatmap', () => {
    // ── Original todo — now implemented ──────────────────────────────────────
    it('identifies present and missing JD keywords', () => {
      const keywords: TieredKeyword[] = [
        { term: 'TypeScript', tier: 'hard' },
        { term: 'Python', tier: 'hard' },
      ];
      const { keywordHeatmap } = computeKeywordHeatmap(BASE_RESUME, keywords);
      expect(keywordHeatmap.present).toContain('TypeScript');
      expect(keywordHeatmap.missing).toContain('Python');
    });

    // ── Guard: empty input ────────────────────────────────────────────────────
    it('returns score=1 and all-empty sections when no keywords provided', () => {
      const { keywordHeatmap } = computeKeywordHeatmap(BASE_RESUME, []);
      expect(keywordHeatmap.present).toEqual([]);
      expect(keywordHeatmap.missing).toEqual([]);
      expect(keywordHeatmap.score).toBe(1);
      for (const sec of Object.values(keywordHeatmap.sections)) {
        expect(sec.keywords).toEqual([]);
        expect(sec.nonNegotiable).toBe(false);
        expect(sec.density).toBe(0);
      }
      expect(keywordHeatmap.tiers.hard.present).toEqual([]);
      expect(keywordHeatmap.tiers.hard.missing).toEqual([]);
    });

    // ── Case-insensitive matching ─────────────────────────────────────────────
    it('matches keywords case-insensitively', () => {
      const keywords: TieredKeyword[] = [
        { term: 'typescript', tier: 'hard' },  // lower; resume has 'TypeScript'
        { term: 'REACT', tier: 'alias' },       // upper; resume has 'React'
      ];
      const { keywordHeatmap } = computeKeywordHeatmap(BASE_RESUME, keywords);
      expect(keywordHeatmap.present).toHaveLength(2);
      expect(keywordHeatmap.missing).toHaveLength(0);
    });

    // ── Whole-word boundary: "Java" ≠ "JavaScript" ───────────────────────────
    it('does not match a single-word term as a substring of a longer word', () => {
      const resume: StructuredResume = {
        ...BASE_RESUME,
        skills: ['JavaScript'],
        summary: 'Works with JavaScript only.',
        headline: 'JavaScript Developer',
      };
      const keywords: TieredKeyword[] = [{ term: 'Java', tier: 'hard' }];
      const { keywordHeatmap } = computeKeywordHeatmap(resume, keywords);
      expect(keywordHeatmap.missing).toContain('Java');
      expect(keywordHeatmap.present).not.toContain('Java');
    });

    // ── Multi-word phrase matching ────────────────────────────────────────────
    it('matches multi-word phrases via substring', () => {
      const resume: StructuredResume = {
        ...BASE_RESUME,
        summary: 'Expert in machine learning pipelines and deep learning models.',
      };
      const keywords: TieredKeyword[] = [
        { term: 'machine learning', tier: 'hard' },
        { term: 'deep learning', tier: 'alias' },
        { term: 'cloud computing', tier: 'contextual' },
      ];
      const { keywordHeatmap } = computeKeywordHeatmap(resume, keywords);
      expect(keywordHeatmap.present).toContain('machine learning');
      expect(keywordHeatmap.present).toContain('deep learning');
      expect(keywordHeatmap.missing).toContain('cloud computing');
    });

    // ── Regex metacharacters ─────────────────────────────────────────────────
    it('correctly matches terms containing regex metacharacters (C++, .NET, C#)', () => {
      const resume: StructuredResume = { ...BASE_RESUME, skills: ['C++', '.NET', 'C#'] };
      const keywords: TieredKeyword[] = [
        { term: 'C++', tier: 'hard' },
        { term: '.NET', tier: 'hard' },
        { term: 'C#', tier: 'hard' },
      ];
      const { keywordHeatmap } = computeKeywordHeatmap(resume, keywords);
      expect(keywordHeatmap.present).toHaveLength(3);
      expect(keywordHeatmap.missing).toHaveLength(0);
    });

    // ── Weighted score math ───────────────────────────────────────────────────
    it('score is 0 when all keywords are missing', () => {
      const keywords: TieredKeyword[] = [
        { term: 'Kubernetes', tier: 'hard' },
        { term: 'Rust', tier: 'alias' },
      ];
      const { keywordHeatmap } = computeKeywordHeatmap(BASE_RESUME, keywords);
      expect(keywordHeatmap.score).toBe(0);
      expect(keywordHeatmap.present).toHaveLength(0);
    });

    it('score is 1 when all keywords are present', () => {
      const keywords: TieredKeyword[] = [
        { term: 'TypeScript', tier: 'hard' },
        { term: 'React', tier: 'alias' },
        { term: 'Node.js', tier: 'contextual' },
      ];
      const { keywordHeatmap } = computeKeywordHeatmap(BASE_RESUME, keywords);
      expect(keywordHeatmap.score).toBe(1);
      expect(keywordHeatmap.missing).toHaveLength(0);
    });

    it('weighted score: title-tier keyword outweighs contextual-tier in partial coverage', () => {
      // hard(1.0) present, contextual(0.3) missing → score = 1.0 / (1.0 + 0.3) ≈ 0.769
      const keywords: TieredKeyword[] = [
        { term: 'TypeScript', tier: 'hard' },       // present
        { term: 'Kubernetes', tier: 'contextual' },  // missing
      ];
      const { keywordHeatmap } = computeKeywordHeatmap(BASE_RESUME, keywords);
      expect(keywordHeatmap.score).toBeCloseTo(1.0 / 1.3, 5);
    });

    it('tier weights: hard=1.0, alias=0.7, contextual=0.3 applied correctly', () => {
      // All three tiers present → score = (1.0+0.7+0.3) / (1.0+0.7+0.3) = 1
      const allPresent: TieredKeyword[] = [
        { term: 'TypeScript', tier: 'hard' },
        { term: 'React', tier: 'alias' },
        { term: 'Node.js', tier: 'contextual' },
      ];
      const { keywordHeatmap: full } = computeKeywordHeatmap(BASE_RESUME, allPresent);
      expect(full.score).toBe(1);

      // Only alias + contextual present; hard missing → score = (0.7+0.3) / (1.0+0.7+0.3) = 1/2
      const partialPresent: TieredKeyword[] = [
        { term: 'Kubernetes', tier: 'hard' },        // missing
        { term: 'React', tier: 'alias' },             // present
        { term: 'Node.js', tier: 'contextual' },      // present
      ];
      const { keywordHeatmap: partial } = computeKeywordHeatmap(BASE_RESUME, partialPresent);
      expect(partial.score).toBeCloseTo(1.0 / 2.0, 5);
    });

    // ── Tier breakdown ────────────────────────────────────────────────────────
    it('populates tiers.hard.missing when a hard keyword is absent', () => {
      const keywords: TieredKeyword[] = [
        { term: 'Kubernetes', tier: 'hard' },
        { term: 'TypeScript', tier: 'hard' },
      ];
      const { keywordHeatmap } = computeKeywordHeatmap(BASE_RESUME, keywords);
      expect(keywordHeatmap.tiers.hard.missing).toContain('Kubernetes');
      expect(keywordHeatmap.tiers.hard.present).toContain('TypeScript');
      expect(keywordHeatmap.tiers.alias.missing).toHaveLength(0);
      expect(keywordHeatmap.tiers.contextual.missing).toHaveLength(0);
    });

    // ── Section nonNegotiable flag ────────────────────────────────────────────
    it('marks a section nonNegotiable when it contains a hard keyword', () => {
      // 'TypeScript' appears in skills → skills.nonNegotiable should be true
      const keywords: TieredKeyword[] = [
        { term: 'TypeScript', tier: 'hard' },
      ];
      const { keywordHeatmap } = computeKeywordHeatmap(BASE_RESUME, keywords);
      expect(keywordHeatmap.sections.skills.nonNegotiable).toBe(true);
    });

    it('section nonNegotiable is false when only alias/contextual keywords present there', () => {
      // 'React' in skills but tier=alias → skills.nonNegotiable false
      const keywords: TieredKeyword[] = [
        { term: 'React', tier: 'alias' },
      ];
      const { keywordHeatmap } = computeKeywordHeatmap(BASE_RESUME, keywords);
      expect(keywordHeatmap.sections.skills.nonNegotiable).toBe(false);
      expect(keywordHeatmap.sections.skills.keywords).toContain('React');
    });

    // ── sectionDensity ────────────────────────────────────────────────────────
    it('section density reflects that section weighted contribution / total', () => {
      // 'TypeScript' (hard, 1.0) found in skills; total weight = 1.0 → density = 1.0/1.0 = 1
      const keywords: TieredKeyword[] = [{ term: 'TypeScript', tier: 'hard' }];
      const { keywordHeatmap } = computeKeywordHeatmap(BASE_RESUME, keywords);
      expect(keywordHeatmap.sections.skills.density).toBeCloseTo(1.0, 5);
      // education does not contain TypeScript → density 0
      expect(keywordHeatmap.sections.education.density).toBe(0);
    });

    it('keyword present in multiple sections is counted in each (densities may sum > 1)', () => {
      // 'TypeScript' appears in both summary ("TypeScript") and skills, and experience bullet
      const keywords: TieredKeyword[] = [{ term: 'TypeScript', tier: 'hard' }];
      const { keywordHeatmap } = computeKeywordHeatmap(BASE_RESUME, keywords);
      // present in summary (headline: 'Senior Software Engineer', summary mentions TypeScript)
      // present in skills ['TypeScript']
      // present in experience bullet 'Led migration to TypeScript'
      const coveredSections = Object.entries(keywordHeatmap.sections)
        .filter(([, sec]) => sec.keywords.length > 0)
        .map(([name]) => name);
      expect(coveredSections.length).toBeGreaterThan(1);
    });

    // ── Cross-section: searches all resume fields ─────────────────────────────
    it('searches experience bullets, company, title and education degree/institution', () => {
      const keywords: TieredKeyword[] = [
        { term: 'Acme Corp', tier: 'contextual' },       // experience.company
        { term: 'Computer Science', tier: 'contextual' }, // education.degree
        { term: 'State University', tier: 'contextual' }, // education.institution
        { term: 'REST APIs', tier: 'alias' },              // experience.bullets
      ];
      const { keywordHeatmap } = computeKeywordHeatmap(BASE_RESUME, keywords);
      expect(keywordHeatmap.present).toHaveLength(4);
      expect(keywordHeatmap.missing).toHaveLength(0);
      expect(keywordHeatmap.sections.experience.keywords).toContain('Acme Corp');
      expect(keywordHeatmap.sections.experience.keywords).toContain('REST APIs');
      expect(keywordHeatmap.sections.education.keywords).toContain('Computer Science');
      expect(keywordHeatmap.sections.education.keywords).toContain('State University');
    });
  });

  it.todo('truncateField: trim strategy cuts at maxChars');
  it.todo('truncateField: ellipsis strategy appends … at maxChars-1');
});
