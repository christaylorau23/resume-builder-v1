/**
 * A single resume section's ATS keyword coverage.
 * Used by the Layout Engine to protect high-value sections during FR12/FR13 truncation.
 */
export interface KeywordSection {
  /** Keywords from the JD that were found in this specific section. */
  keywords: string[];
  /**
   * True when ≥1 Tier 1 (hard) keyword appears in this section.
   * Layout Engine must NOT truncate this section below the point where hard keywords disappear.
   */
  nonNegotiable: boolean;
  /**
   * Weighted ATS contribution of this section:
   * Σ(weight_i for keywords found here) / Σ(weight_i for ALL keywords).
   * Higher density = higher protection priority for iOS "Perfect Spacing" adjustments.
   */
  density: number;
}

/** Present/missing split for a single keyword tier. */
export interface KeywordTierResult {
  present: string[];
  missing: string[];
}

/**
 * Full ATS keyword heatmap produced by the Superhuman tiered scoring algorithm.
 * Tier weights: hard=1.0, alias=0.7, contextual=0.3.
 * score = Σ(weight_i for present) / Σ(weight_i for all).
 */
export interface KeywordHeatmap {
  /** All present keywords (flat list, all tiers). */
  present: string[];
  /** All missing keywords (flat list, all tiers). */
  missing: string[];
  /** Weighted coverage ratio [0, 1]. 1.0 = full ATS coverage. */
  score: number;
  /** Per-section breakdown — drives Layout Engine protection decisions (FR12 / FR13). */
  sections: {
    summary: KeywordSection;
    experience: KeywordSection;
    skills: KeywordSection;
    education: KeywordSection;
  };
  /** Per-tier breakdown — tiers.hard.missing surfaces keywords the user must still add. */
  tiers: {
    hard: KeywordTierResult;       // Tier 1 (1.0) — non-negotiable
    alias: KeywordTierResult;      // Tier 2 (0.7) — semantic aliases
    contextual: KeywordTierResult; // Tier 3 (0.3) — density/context
  };
}

/**
 * Result returned by every runPipeline call.
 * `pdf` is ALWAYS present on success. `canva` is optional (best-effort).
 * Canva failure MUST NOT block PDF delivery — it only adds a PipelineWarning.
 */
export interface PipelineResult {
  /** PDF buffer — always present when the pipeline completes without a fatal error. */
  pdf: Buffer;
  /** Metadata from the layout-prep (constraint) step. Required on every run. */
  layoutPrep: LayoutPrepMetadata;
  /** Canva export result — only set when the Canva call succeeded. */
  canva?: CanvaExportResult;
  /** Non-fatal issues (e.g. CANVA_EXPORT_FAILED). Canva failure goes here, never blocks pdf. */
  warnings: PipelineWarning[];
}

/**
 * Metadata produced by the layout-prep (constraint) step.
 * Populated on every successful pipeline run.
 */
export interface LayoutPrepMetadata {
  /** Field paths that were truncated (e.g. "summary", "experience[2].bullets"). */
  truncatedFields: string[];
  /** Per-field truncation detail. */
  truncationDetails?: Record<
    string,
    { originalLength: number; maxLength: number; strategy: 'trim' | 'ellipsis' | 'collapse' }
  >;
  /** Convenience flag — true when any truncation occurred. */
  hadTruncation: boolean;
  /**
   * ATS keyword heatmap: which JD keywords are present / missing in the resume.
   * Computed by the keyword-heatmap step in layout-prep before rendering.
   */
  keywordHeatmap?: KeywordHeatmap;
}

/** Non-fatal pipeline issue. All codes are UPPER_SNAKE_CASE. */
export interface PipelineWarning {
  /** e.g. 'CANVA_EXPORT_FAILED', 'JD_URL_FETCH_FAILED' */
  code: string;
  /** Human-readable message — must not contain PII, resume text, or API keys. */
  message: string;
  /** Optional safe debugging details (e.g. { statusCode, timeout }). No secrets. */
  details?: unknown;
}

/** Result shape for a successful Canva export. */
export interface CanvaExportResult {
  designId: string;
  url?: string;
}
