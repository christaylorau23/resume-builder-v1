/**
 * Zod schema for StructuredResume — validates AI JSON output before use.
 * Mirrors the StructuredResume interface from @repo/types exactly.
 * Import and call `.parse()` to get a typed, validated object or throw ZodError.
 */
import { z } from 'zod';

export const ExperienceEntrySchema = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  location: z.string().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  bullets: z.array(z.string()),
});

export const EducationEntrySchema = z.object({
  degree: z.string(),
  institution: z.string(),
  location: z.string().optional(),
  graduationDate: z.string().optional(),
});

export const StructuredResumeSchema = z.object({
  name: z.string().min(1),
  contact: z.object({
    email: z.string().optional(),
    phone: z.string().optional(),
    linkedin: z.string().optional(),
    location: z.string().optional(),
  }),
  headline: z.string().min(1),
  targetRole: z.string().optional(),
  summary: z.string().min(1),
  experience: z.array(ExperienceEntrySchema),
  education: z.array(EducationEntrySchema),
  skills: z.array(z.string()),
});
