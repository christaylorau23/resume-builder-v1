/** A single work experience entry. */
export interface ExperienceEntry {
  title: string;
  company: string;
  location?: string;
  startDate: string;
  endDate?: string;
  bullets: string[];
}

/** A single education entry. */
export interface EducationEntry {
  degree: string;
  institution: string;
  location?: string;
  graduationDate?: string;
}

/**
 * The single structured resume that is the source of truth for both
 * PDF generation and Canva export. Produced by the AI redraft step.
 * All fields must stay within the limits defined in the TemplateContract.
 */
export interface StructuredResume {
  /** Full name of the candidate. */
  name: string;
  /** Contact: email, phone, LinkedIn, etc. */
  contact: {
    email?: string;
    phone?: string;
    linkedin?: string;
    location?: string;
  };
  /** One-line professional headline (e.g. "Senior Software Engineer"). */
  headline: string;
  /** Professional summary paragraph. */
  summary: string;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  /** Flat list of skills (tools, languages, frameworks, certifications). */
  skills: string[];
}
