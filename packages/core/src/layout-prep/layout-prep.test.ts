import { describe, expect, it } from 'vitest';
import { computeKeywordHeatmap } from './keyword-heatmap';
import type { TieredKeyword } from './keyword-heatmap';
import { applyConstraints } from './apply-constraints';
import { truncateField } from './truncate';
import type { StructuredResume, TemplateContract } from '@repo/types';

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

// ─── applyConstraints / truncateField fixtures ────────────────────────────────

const STRICT_CONTRACT: TemplateContract = {
  name: 'test-strict',
  fields: {
    name:                     { maxChars: 10,  strategy: 'trim'     },
    headline:                 { maxChars: 20,  strategy: 'ellipsis' },
    summary:                  { maxChars: 30,  strategy: 'ellipsis' },
    'experience[].title':     { maxChars: 10,  strategy: 'trim'     },
    'experience[].company':   { maxChars: 10,  strategy: 'trim'     },
    'experience[].bullets[]': { maxChars: 20,  strategy: 'ellipsis' },
    'education[].degree':     { maxChars: 15,  strategy: 'trim'     },
    skills:                   { maxLines: 1,   strategy: 'collapse' },
  },
};

describe('layout-prep', () => {
  describe('truncateField', () => {
    it('trim strategy cuts at maxChars exactly', () => {
      const result = truncateField('Hello World', { maxChars: 5, strategy: 'trim' });
      expect(result).toBe('Hello');
      expect(result.length).toBe(5);
    });

    it('ellipsis strategy appends … and total length equals maxChars', () => {
      const result = truncateField('Hello World', { maxChars: 6, strategy: 'ellipsis' });
      expect(result).toBe('Hello\u2026');
      expect(result.length).toBe(6);
    });

    it('returns value unchanged when within limit', () => {
      const value = 'Short';
      expect(truncateField(value, { maxChars: 100, strategy: 'trim' })).toBe(value);
      expect(truncateField(value, { maxChars: 100, strategy: 'ellipsis' })).toBe(value);
    });

    it('returns value unchanged when maxChars is undefined', () => {
      const value = 'Any string at all';
      expect(truncateField(value, { strategy: 'trim' })).toBe(value);
    });
  });

  describe('applyConstraints', () => {
    it('truncates summary to maxChars with ellipsis strategy', () => {
      const longSummary = 'A'.repeat(100);
      const resume: StructuredResume = { ...BASE_RESUME, summary: longSummary };
      const { resume: out } = applyConstraints(resume, STRICT_CONTRACT);
      expect(out.summary.length).toBe(30);
      expect(out.summary.endsWith('\u2026')).toBe(true);
    });

    it('sets hadTruncation=true and populates truncatedFields when truncation occurs', () => {
      const resume: StructuredResume = { ...BASE_RESUME, summary: 'A'.repeat(100) };
      const { metadata } = applyConstraints(resume, STRICT_CONTRACT);
      expect(metadata.hadTruncation).toBe(true);
      expect(metadata.truncatedFields).toContain('summary');
      expect(metadata.truncationDetails).toBeDefined();
      expect(metadata.truncationDetails!['summary'].originalLength).toBe(100);
      expect(metadata.truncationDetails!['summary'].maxLength).toBe(30);
    });

    it('no-ops when all fields are within limits', () => {
      // BASE_RESUME has very short fields — use a permissive contract
      const permissive: TemplateContract = {
        name: 'permissive',
        fields: {
          name:     { maxChars: 200, strategy: 'trim' },
          headline: { maxChars: 200, strategy: 'trim' },
          summary:  { maxChars: 200, strategy: 'trim' },
        },
      };
      const { resume: out, metadata } = applyConstraints(BASE_RESUME, permissive);
      expect(metadata.hadTruncation).toBe(false);
      expect(metadata.truncatedFields).toHaveLength(0);
      expect(out.summary).toBe(BASE_RESUME.summary);
      expect(out.name).toBe(BASE_RESUME.name);
    });

    it('truncates experience bullets with ellipsis', () => {
      const longBullet = 'B'.repeat(50);
      const resume: StructuredResume = {
        ...BASE_RESUME,
        experience: [{ ...BASE_RESUME.experience[0], bullets: [longBullet] }],
      };
      const { resume: out, metadata } = applyConstraints(resume, STRICT_CONTRACT);
      expect(out.experience[0].bullets[0].length).toBe(20);
      expect(out.experience[0].bullets[0].endsWith('\u2026')).toBe(true);
      expect(metadata.truncatedFields).toContain('experience[0].bullets[0]');
    });

    it('does not mutate the input resume', () => {
      const resume: StructuredResume = { ...BASE_RESUME, summary: 'A'.repeat(100) };
      const originalSummary = resume.summary;
      applyConstraints(resume, STRICT_CONTRACT);
      expect(resume.summary).toBe(originalSummary);
    });

    it('collapses skills list when total exceeds maxLines * 80 chars', () => {
      // maxLines=1 → budget=80 chars; each skill ~10 chars + 4 separator = 14 per skill after first
      const manySkills = Array.from({ length: 20 }, (_, i) => `Skill-${i.toString().padStart(2, '0')}`);
      const resume: StructuredResume = { ...BASE_RESUME, skills: manySkills };
      const { resume: out, metadata } = applyConstraints(resume, STRICT_CONTRACT);
      expect(out.skills.length).toBeLessThan(manySkills.length);
      expect(metadata.truncatedFields).toContain('skills');
    });
  });

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

});
