#!/usr/bin/env node
/**
 * Superhuman Layout Simulation — FR10 / FR12
 *
 * Verifies that sections marked nonNegotiable (containing Tier 1 / hard keywords)
 * are never truncated below the point where hard keywords disappear, even under
 * tight character limits (iOS "Perfect Spacing").
 *
 * Usage:
 *   node packages/core/scripts/simulate-layout.js          # relaxed limits
 *   node packages/core/scripts/simulate-layout.js --strict # halved limits
 *
 * Self-contained CJS — no transpiler required. Inlines the heatmap algorithm
 * so this script is the canonical integration proof for the keyword-heatmap module.
 *
 * Exit 0 = PASS, Exit 1 = FAIL (with diagnostics).
 */

'use strict';

// ─── Configuration ────────────────────────────────────────────────────────────

const STRICT = process.argv.includes('--strict');

/** Superhuman tier weights */
const TIER_WEIGHTS = { hard: 1.0, alias: 0.7, contextual: 0.3 };

/**
 * Per-section character limits for the resume text corpus.
 * nonNegotiable sections are exempt — limits only apply to unprotected sections.
 * Strict mode halves each limit to stress-test the protection logic.
 */
const CHAR_LIMITS = STRICT
  ? { summary: 60, experienceBullet: 50, skills: 80,  education: 80  }
  : { summary: 120, experienceBullet: 100, skills: 160, education: 160 };

// ─── Heatmap algorithm (mirrors packages/core/src/layout-prep/keyword-heatmap.ts) ──

function buildCorpus(fields) {
  return fields
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function termFound(corpus, term) {
  const lower = term.toLowerCase();
  if (lower.includes(' ')) {
    return corpus.includes(lower);
  }
  const escaped = lower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('(?<!\\w)' + escaped + '(?!\\w)').test(corpus);
}

function computeHeatmap(resume, keywords) {
  if (keywords.length === 0) {
    const empty = { keywords: [], nonNegotiable: false, density: 0 };
    return {
      present: [], missing: [], score: 1,
      sections: { summary: { ...empty }, experience: { ...empty }, skills: { ...empty }, education: { ...empty } },
      tiers: { hard: { present: [], missing: [] }, alias: { present: [], missing: [] }, contextual: { present: [], missing: [] } },
    };
  }

  const corpusSummary    = buildCorpus([resume.headline, resume.summary]);
  const corpusExperience = buildCorpus(resume.experience.flatMap(e => [e.title, e.company, e.location || '', ...e.bullets]));
  const corpusSkills     = buildCorpus(resume.skills);
  const corpusEducation  = buildCorpus(resume.education.flatMap(e => [e.degree, e.institution, e.location || '']));
  const corpusGlobal     = buildCorpus([resume.name, corpusSummary, corpusExperience, corpusSkills, corpusEducation]);

  const present = [], missing = [];
  const tiers = {
    hard:       { present: [], missing: [] },
    alias:      { present: [], missing: [] },
    contextual: { present: [], missing: [] },
  };
  const sec = {
    summary:    { keywords: [], hasHard: false, weighted: 0 },
    experience: { keywords: [], hasHard: false, weighted: 0 },
    skills:     { keywords: [], hasHard: false, weighted: 0 },
    education:  { keywords: [], hasHard: false, weighted: 0 },
  };

  let weightedPresent = 0, weightedTotal = 0;

  for (const kw of keywords) {
    const weight = TIER_WEIGHTS[kw.tier];
    weightedTotal += weight;

    if (termFound(corpusGlobal, kw.term)) {
      present.push(kw.term);
      weightedPresent += weight;
      tiers[kw.tier].present.push(kw.term);
    } else {
      missing.push(kw.term);
      tiers[kw.tier].missing.push(kw.term);
    }

    const sectionHits = [
      ['summary', corpusSummary], ['experience', corpusExperience],
      ['skills', corpusSkills],   ['education', corpusEducation],
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
  const mkSection = (s) => ({
    keywords: s.keywords,
    nonNegotiable: s.hasHard,
    density: weightedTotal === 0 ? 0 : s.weighted / weightedTotal,
  });

  return {
    present, missing, score,
    sections: {
      summary:    mkSection(sec.summary),
      experience: mkSection(sec.experience),
      skills:     mkSection(sec.skills),
      education:  mkSection(sec.education),
    },
    tiers,
  };
}

// ─── Layout simulation ────────────────────────────────────────────────────────

/**
 * Truncates non-negotiable sections (bullets / text) to the character limit.
 * Sections flagged as nonNegotiable are left intact — this is the core FR12 rule.
 */
function applyLayoutConstraints(resume, heatmap, limits) {
  // Deep copy to avoid mutating the fixture
  const r = JSON.parse(JSON.stringify(resume));

  if (!heatmap.sections.summary.nonNegotiable) {
    r.summary = r.summary.slice(0, limits.summary);
  }

  if (!heatmap.sections.experience.nonNegotiable) {
    r.experience = r.experience.map((entry) => ({
      ...entry,
      bullets: entry.bullets.map((b) => b.slice(0, limits.experienceBullet)),
    }));
  }

  if (!heatmap.sections.skills.nonNegotiable) {
    // Trim the skills list so their joined corpus fits within the limit
    let used = 0;
    r.skills = r.skills.filter((s) => {
      if (used + s.length + 1 <= limits.skills) { used += s.length + 1; return true; }
      return false;
    });
  }

  if (!heatmap.sections.education.nonNegotiable) {
    r.education = r.education.map((e) => ({
      ...e,
      degree:      e.degree.slice(0, limits.education),
      institution: e.institution.slice(0, limits.education),
    }));
  }

  return r;
}

// ─── Test fixture ─────────────────────────────────────────────────────────────

const TEST_RESUME = {
  name: 'Alex Rivera',
  contact: { email: 'alex@example.com' },
  headline: 'Senior TypeScript Engineer',
  // summary intentionally contains hard keywords so it becomes nonNegotiable
  summary: 'Experienced TypeScript engineer specializing in React and distributed systems.',
  experience: [
    {
      title: 'Software Engineer',
      company: 'TechCorp',
      startDate: '2021-01',
      // experience does NOT contain hard keywords — will be truncated in strict mode
      bullets: [
        'Built REST APIs with Node.js and Express for microservices',
        'Led cloud infrastructure migration reducing costs by 30 percent',
      ],
    },
  ],
  // skills contains hard keywords — nonNegotiable
  skills: ['TypeScript', 'React', 'PostgreSQL', 'AWS', 'Node.js'],
  education: [
    {
      degree: 'Bachelor of Computer Science',
      institution: 'State University',
    },
  ],
};

const TEST_KEYWORDS = [
  { term: 'TypeScript',          tier: 'hard'        }, // in summary + skills
  { term: 'React',               tier: 'hard'        }, // in summary + skills
  { term: 'Node.js',             tier: 'alias'       }, // in experience + skills
  { term: 'PostgreSQL',          tier: 'alias'       }, // in skills
  { term: 'AWS',                 tier: 'contextual'  }, // in skills
  { term: 'distributed systems', tier: 'contextual'  }, // in summary
];

// ─── Run simulation ───────────────────────────────────────────────────────────

console.log(`\n==> Superhuman Layout Simulation (${STRICT ? 'STRICT' : 'normal'} mode)`);
console.log(`    Char limits: ${JSON.stringify(CHAR_LIMITS)}\n`);

let failures = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    failures++;
  } else {
    console.log(`  pass: ${message}`);
  }
}

// Step 1: Full heatmap on untruncated resume
const fullHeatmap = computeHeatmap(TEST_RESUME, TEST_KEYWORDS);
console.log('Step 1 — Full heatmap:');
console.log(`  score: ${fullHeatmap.score.toFixed(3)}`);
console.log(`  present: [${fullHeatmap.present.join(', ')}]`);
console.log(`  missing: [${fullHeatmap.missing.join(', ')}]`);
for (const [name, sec] of Object.entries(fullHeatmap.sections)) {
  console.log(`  sections.${name}: nonNegotiable=${sec.nonNegotiable} density=${sec.density.toFixed(3)} keywords=[${sec.keywords.join(', ')}]`);
}

assert(fullHeatmap.sections.summary.nonNegotiable,    'summary is nonNegotiable (contains hard keywords)');
assert(fullHeatmap.sections.skills.nonNegotiable,     'skills is nonNegotiable (contains hard keywords)');
assert(!fullHeatmap.sections.experience.nonNegotiable, 'experience is NOT nonNegotiable (no hard keywords)');
assert(!fullHeatmap.sections.education.nonNegotiable,  'education is NOT nonNegotiable (no hard keywords)');

const hardKeywordsBeforeTruncation = [...fullHeatmap.tiers.hard.present];
assert(hardKeywordsBeforeTruncation.includes('TypeScript'), 'TypeScript (hard) present before truncation');
assert(hardKeywordsBeforeTruncation.includes('React'),      'React (hard) present before truncation');

// Step 2: Apply layout constraints — protect nonNegotiable sections
console.log('\nStep 2 — Applying layout constraints (protecting nonNegotiable sections)...');
const truncatedResume = applyLayoutConstraints(TEST_RESUME, fullHeatmap, CHAR_LIMITS);

// Verify experience was truncated (it's not nonNegotiable)
const origBulletLen  = TEST_RESUME.experience[0].bullets[0].length;
const truncBulletLen = truncatedResume.experience[0].bullets[0].length;
assert(
  truncBulletLen <= CHAR_LIMITS.experienceBullet,
  `experience bullet truncated to ≤${CHAR_LIMITS.experienceBullet} chars (was ${origBulletLen}, now ${truncBulletLen})`
);

// Verify summary was NOT truncated (it's nonNegotiable)
assert(
  truncatedResume.summary === TEST_RESUME.summary,
  'summary preserved intact (nonNegotiable)'
);

// Verify skills were NOT truncated (nonNegotiable)
assert(
  truncatedResume.skills.includes('TypeScript') && truncatedResume.skills.includes('React'),
  'skills preserved intact (nonNegotiable): TypeScript and React still present'
);

// Step 3: Recompute heatmap on truncated resume
console.log('\nStep 3 — Recomputing heatmap after layout constraints...');
const postHeatmap = computeHeatmap(truncatedResume, TEST_KEYWORDS);
console.log(`  score: ${postHeatmap.score.toFixed(3)}`);
console.log(`  present: [${postHeatmap.present.join(', ')}]`);
console.log(`  missing: [${postHeatmap.missing.join(', ')}]`);

// Step 4: Assert hard keywords survived in protected sections
console.log('\nStep 4 — FR12 assertions: hard keywords must survive truncation...');
for (const kw of hardKeywordsBeforeTruncation) {
  assert(
    postHeatmap.present.includes(kw),
    `Hard keyword "${kw}" still present after layout constraints`
  );
}

assert(postHeatmap.sections.summary.nonNegotiable,  'summary remains nonNegotiable post-truncation');
assert(postHeatmap.sections.skills.nonNegotiable,   'skills remains nonNegotiable post-truncation');
assert(postHeatmap.score > 0,                        'overall ATS score > 0 post-truncation');

// Step 5: Summary
console.log('\n==> Simulation complete');
if (failures === 0) {
  console.log('    RESULT: PASS — all nonNegotiable sections protected; hard keywords survived\n');
  process.exit(0);
} else {
  console.error(`    RESULT: FAIL — ${failures} assertion(s) failed\n`);
  process.exit(1);
}
