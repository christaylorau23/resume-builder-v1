/**
 * Canonical fixture for pdfkit-rendering tests.
 * Used by build-pdf.test.ts and pipeline.integration.test.ts.
 *
 * Contains "TypeScript" as a hard keyword so AC6 text extraction can verify it.
 */
import type { StructuredResume } from '@repo/types';

export const CANONICAL_RESUME: StructuredResume = {
  name: 'Alex Rivera',
  contact: {
    email: 'alex@example.com',
    phone: '+1 555-0100',
    linkedin: 'linkedin.com/in/alexrivera',
    location: 'San Francisco, CA',
  },
  headline: 'Senior TypeScript Engineer',
  summary:
    'Experienced TypeScript engineer specializing in React and distributed systems. ' +
    'Proven track record delivering scalable APIs and cloud-native solutions at high-growth startups.',
  experience: [
    {
      title: 'Senior Software Engineer',
      company: 'TechCorp',
      location: 'San Francisco, CA',
      startDate: '2021-01',
      endDate: 'Present',
      bullets: [
        'Architected TypeScript monorepo reducing build times by 40%',
        'Led React frontend migration from class to functional components',
        'Built distributed event-driven pipeline handling 50k events/sec',
      ],
    },
    {
      title: 'Software Engineer',
      company: 'StartupIO',
      location: 'Remote',
      startDate: '2018-06',
      endDate: '2020-12',
      bullets: [
        'Developed REST APIs with Node.js and PostgreSQL for 200k users',
        'Implemented AWS Lambda functions reducing infrastructure costs 30%',
      ],
    },
  ],
  education: [
    {
      degree: 'Bachelor of Computer Science',
      institution: 'State University',
      location: 'Austin, TX',
      graduationDate: '2018',
    },
  ],
  skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'AWS', 'Docker', 'GraphQL'],
};

/** Hard-tier JD keywords that MUST appear as text in the rendered PDF. */
export const CANONICAL_JD_KEYWORDS = [
  { term: 'TypeScript', tier: 'hard' as const },
  { term: 'React', tier: 'hard' as const },
  { term: 'Node.js', tier: 'alias' as const },
  { term: 'PostgreSQL', tier: 'alias' as const },
  { term: 'AWS', tier: 'contextual' as const },
];
