/**
 * Applies template character/line limits to raw AI resume output.
 * Returns a constrained copy of the resume + LayoutPrepMetadata.
 *
 * This is the ONLY place truncation runs. The rendering layer receives
 * only the constrained output and must not perform any content trimming.
 *
 * Field path patterns supported:
 *   name, headline, summary              — simple string fields
 *   experience[].title                   — per-entry string
 *   experience[].company                 — per-entry string
 *   experience[].bullets[]               — per-entry per-bullet string
 *   education[].degree                   — per-entry string
 *   skills                               — list; collapsed to maxLines * 80 chars total
 */
import type { LayoutPrepMetadata, StructuredResume, TemplateContract } from '@repo/types';
import { truncateField } from './truncate';

export interface ConstraintResult {
  resume: StructuredResume;
  metadata: LayoutPrepMetadata;
}

export function applyConstraints(
  resume: StructuredResume,
  contract: TemplateContract
): ConstraintResult {
  const result: StructuredResume = JSON.parse(JSON.stringify(resume)) as StructuredResume;
  const truncatedFields: string[] = [];
  const truncationDetails: NonNullable<LayoutPrepMetadata['truncationDetails']> = {};

  function record(
    path: string,
    originalLength: number,
    maxLength: number,
    strategy: 'trim' | 'ellipsis' | 'collapse'
  ): void {
    truncatedFields.push(path);
    truncationDetails[path] = { originalLength, maxLength, strategy };
  }

  function applyStr(value: string, fieldPath: string, contractKey: string): string {
    const limit = contract.fields[contractKey];
    if (!limit || limit.maxChars === undefined) return value;
    if (value.length <= limit.maxChars) return value;
    record(fieldPath, value.length, limit.maxChars, limit.strategy);
    return truncateField(value, limit);
  }

  // Simple top-level string fields
  result.name     = applyStr(result.name,     'name',     'name');
  result.headline = applyStr(result.headline, 'headline', 'headline');
  result.summary  = applyStr(result.summary,  'summary',  'summary');

  // experience[].title / company / bullets[]
  const expTitleLimit   = contract.fields['experience[].title'];
  const expCompanyLimit = contract.fields['experience[].company'];
  const expBulletLimit  = contract.fields['experience[].bullets[]'];

  result.experience = result.experience.map((entry, i) => {
    let title   = entry.title;
    let company = entry.company;

    if (expTitleLimit?.maxChars && title.length > expTitleLimit.maxChars) {
      record(`experience[${i}].title`, title.length, expTitleLimit.maxChars, expTitleLimit.strategy);
      title = truncateField(title, expTitleLimit);
    }
    if (expCompanyLimit?.maxChars && company.length > expCompanyLimit.maxChars) {
      record(`experience[${i}].company`, company.length, expCompanyLimit.maxChars, expCompanyLimit.strategy);
      company = truncateField(company, expCompanyLimit);
    }

    const bullets = expBulletLimit?.maxChars
      ? entry.bullets.map((bullet, j) => {
          if (bullet.length <= expBulletLimit.maxChars!) return bullet;
          record(
            `experience[${i}].bullets[${j}]`,
            bullet.length,
            expBulletLimit.maxChars!,
            expBulletLimit.strategy
          );
          return truncateField(bullet, expBulletLimit);
        })
      : entry.bullets;

    return { ...entry, title, company, bullets };
  });

  // education[].degree
  const eduDegreeLimit = contract.fields['education[].degree'];
  if (eduDegreeLimit?.maxChars) {
    result.education = result.education.map((entry, i) => {
      if (entry.degree.length <= eduDegreeLimit.maxChars!) return entry;
      record(
        `education[${i}].degree`,
        entry.degree.length,
        eduDegreeLimit.maxChars!,
        eduDegreeLimit.strategy
      );
      return { ...entry, degree: truncateField(entry.degree, eduDegreeLimit) };
    });
  }

  // skills — maxLines: total joined length must fit within maxLines * 80 chars
  const skillsLimit = contract.fields['skills'];
  if (skillsLimit?.maxLines) {
    const charBudget = skillsLimit.maxLines * 80;
    let used = 0;
    const kept: string[] = [];
    for (const skill of result.skills) {
      const needed = used === 0 ? skill.length : skill.length + 4; // 4 for '  ·  ' minus 1
      if (used + needed <= charBudget) {
        kept.push(skill);
        used += needed;
      } else {
        break;
      }
    }
    if (kept.length < result.skills.length) {
      record('skills', result.skills.length, kept.length, 'collapse');
      result.skills = kept;
    }
  }

  return {
    resume: result,
    metadata: {
      truncatedFields,
      truncationDetails: truncatedFields.length > 0 ? truncationDetails : undefined,
      hadTruncation: truncatedFields.length > 0,
    },
  };
}
