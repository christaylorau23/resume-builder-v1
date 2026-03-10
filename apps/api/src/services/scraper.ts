/**
 * Server-side scraper for job descriptions (e.g. LinkedIn, Seek).
 * Uses Firecrawl when available, falls back to native fetch + HTML stripping.
 * Call from API only (avoids CORS).
 */
import Firecrawl from '@mendable/firecrawl-js';

function isValidUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const u = new URL(trimmed);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Strip HTML tags and collapse whitespace. Extracts <title> as a leading header. */
function htmlToText(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';
  // Remove scripts, styles, and their content
  const stripped = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, '\n')
    .trim();
  return title ? `${title}\n\n${stripped}` : stripped;
}

/** Fallback scraper using native fetch — no external API key required. */
async function scrapeWithFetch(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ResumeBuilder/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status} fetching ${url}`);
    }
    const html = await resp.text();
    return htmlToText(html);
  } finally {
    clearTimeout(timeout);
  }
}

export async function scrapeJobDescription(url: string): Promise<string> {
  const trimmed = url.trim();
  if (!trimmed) {
    throw new Error('URL is required');
  }
  if (!isValidUrl(trimmed)) {
    throw new Error('Invalid URL');
  }

  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (apiKey) {
    console.log('[scraper] using Firecrawl');
    const app = new Firecrawl({ apiKey });
    const result = await app.scrape(trimmed, { formats: ['markdown'] });

    // SDK may return { success, data } or unwrapped data
    const data = (result as { data?: { markdown?: string }; success?: boolean; error?: string })?.data ?? (result as { markdown?: string });
    if (data?.markdown != null) {
      return data.markdown;
    }
    const withSuccess = result as { success?: boolean; error?: string };
    if (withSuccess?.success === false) {
      throw new Error(withSuccess.error ?? `Failed to scrape ${trimmed}`);
    }
    return '';
  }

  console.log('[scraper] FIRECRAWL_API_KEY not set — using native fetch fallback');
  return scrapeWithFetch(trimmed);
}
