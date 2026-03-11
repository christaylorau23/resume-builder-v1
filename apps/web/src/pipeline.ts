/**
 * Generate Resume UI: paste JD or structured JSON, run pipeline, download PDF.
 */
import { getApiBaseUrl } from './constants';
import { callRunPipeline, callScrapeJd, buildPipelineProfile } from './api';
import type { PipelineResponse } from './api';

function base64ToBlobUrl(b64: string, mime: string): string {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return URL.createObjectURL(new Blob([bytes], { type: mime }));
}

export function renderPipeline(): string {
  return `
    <section class="pipeline card" aria-label="Generate Resume">
      <h2>Generate Resume</h2>
      <div class="pipeline-tabs" role="tablist">
        <button type="button" class="pipeline-tab active" data-mode="jd" role="tab" aria-selected="true">Paste JD</button>
        <button type="button" class="pipeline-tab" data-mode="json" role="tab" aria-selected="false">Paste Resume JSON</button>
        <button type="button" class="pipeline-tab" data-mode="url" role="tab" aria-selected="false">Job URL</button>
      </div>
      <div class="pipeline-input-group">
        <div class="pipeline-textarea-wrap">
          <textarea id="pipeline-input" class="pipeline-textarea" rows="8" placeholder="Paste job description text here…"></textarea>
        </div>
        <div class="pipeline-url-wrap" style="display: none;">
          <input type="text" id="pipeline-url-input" class="pipeline-url-input" placeholder="Paste LinkedIn or Seek job URL…" />
          <p id="pipeline-url-error" class="pipeline-url-error" style="display: none;"></p>
        </div>
        <div id="pipeline-jd-preview" class="pipeline-jd-preview" style="display: none;">
          <p class="pipeline-jd-preview-label">Scraped content — review before generating:</p>
          <pre id="pipeline-jd-preview-text" class="pipeline-jd-preview-text"></pre>
          <div class="pipeline-jd-preview-actions">
            <button type="button" id="pipeline-jd-confirm" class="pipeline-run-btn">Use this JD → Generate</button>
            <button type="button" id="pipeline-jd-retry" class="pipeline-jd-retry-btn">Try different URL</button>
          </div>
        </div>
      </div>
      <p id="pipeline-api-hint" class="pipeline-hint" style="display: none;">Set VITE_API_URL to your API server to run the pipeline.</p>
      <button type="button" id="pipeline-run" class="pipeline-run-btn">Generate Resume</button>
      <div id="pipeline-status" class="pipeline-status" aria-live="polite"></div>
      <div id="pipeline-results" class="pipeline-results" style="display: none;">
        <div class="pipeline-result-item" id="pipeline-pdf-links"></div>
        <div class="pipeline-result-item" id="pipeline-heatmap"></div>
        <div class="pipeline-result-item" id="pipeline-visual-pdf"></div>
        <div class="pipeline-result-item pipeline-warnings" id="pipeline-warnings"></div>
      </div>
    </section>
  `;
}

export function attachPipelineListeners(root: Document | DocumentFragment | Element): void {
  const apiBase = getApiBaseUrl();
  const runBtn = root.querySelector('#pipeline-run') as HTMLButtonElement | null;
  const inputEl = root.querySelector('#pipeline-input') as HTMLTextAreaElement | null;
  const urlInputEl = root.querySelector('#pipeline-url-input') as HTMLInputElement | null;
  const urlErrorEl = root.querySelector('#pipeline-url-error') as HTMLElement | null;
  const textareaWrap = root.querySelector('.pipeline-textarea-wrap') as HTMLElement | null;
  const urlWrap = root.querySelector('.pipeline-url-wrap') as HTMLElement | null;
  const previewEl = root.querySelector('#pipeline-jd-preview') as HTMLElement | null;
  const previewTextEl = root.querySelector('#pipeline-jd-preview-text') as HTMLElement | null;
  const confirmBtn = root.querySelector('#pipeline-jd-confirm') as HTMLButtonElement | null;
  const retryBtn = root.querySelector('#pipeline-jd-retry') as HTMLButtonElement | null;
  const statusEl = root.querySelector('#pipeline-status') as HTMLElement | null;
  const resultsEl = root.querySelector('#pipeline-results') as HTMLElement | null;
  const apiHint = root.querySelector('#pipeline-api-hint') as HTMLElement | null;

  if (!runBtn || !inputEl || !statusEl || !resultsEl) return;

  if (!apiBase) {
    runBtn!.disabled = true;
    if (apiHint) apiHint.style.display = 'block';
  }

  let currentMode: 'jd' | 'json' | 'url' = 'jd';
  let scrapedJd: string | null = null;
  const placeholders: Record<'jd' | 'json', string> = {
    jd: 'Paste job description text here…',
    json: 'Paste structured resume JSON here (e.g. from canonical-resume fixture).',
  };

  function isValidHttpUrl(s: string): boolean {
    try {
      const u = new URL(s);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  }

  function setUrlError(msg: string): void {
    if (!urlErrorEl) return;
    urlErrorEl.textContent = msg;
    urlErrorEl.style.display = msg ? 'block' : 'none';
  }

  function showPreview(text: string): void {
    scrapedJd = text;
    if (previewTextEl) previewTextEl.textContent = text.slice(0, 3000) + (text.length > 3000 ? '\n…[truncated for display]' : '');
    if (previewEl) previewEl.style.display = 'block';
    if (urlWrap) urlWrap.style.display = 'none';
    runBtn!.style.display = 'none';
  }

  function resetUrlTab(): void {
    scrapedJd = null;
    if (previewEl) previewEl.style.display = 'none';
    if (urlWrap) urlWrap.style.display = 'block';
    runBtn!.style.display = '';
    setUrlError('');
    if (urlInputEl) urlInputEl.value = '';
  }

  function setMode(mode: 'jd' | 'json' | 'url'): void {
    currentMode = mode;
    scrapedJd = null;
    if (previewEl) previewEl.style.display = 'none';
    runBtn!.style.display = '';
    if (textareaWrap) textareaWrap.style.display = mode === 'url' ? 'none' : 'block';
    if (urlWrap) urlWrap.style.display = mode === 'url' ? 'block' : 'none';
    if (mode !== 'url' && inputEl) {
      inputEl.placeholder = placeholders[mode];
      inputEl.classList.toggle('pipeline-textarea-json', mode === 'json');
    }
    runBtn!.textContent = mode === 'url' ? 'Fetch & Preview' : 'Generate Resume';
    setUrlError('');
  }

  // Real-time URL validation
  urlInputEl?.addEventListener('input', () => {
    const val = urlInputEl.value.trim();
    if (!val) {
      setUrlError('');
      runBtn!.disabled = false;
    } else if (!isValidHttpUrl(val)) {
      setUrlError('Enter a valid http:// or https:// URL.');
      runBtn!.disabled = true;
    } else {
      setUrlError('');
      runBtn!.disabled = false;
    }
  });

  // Confirm button: use scraped JD → run pipeline
  confirmBtn?.addEventListener('click', async () => {
    if (!scrapedJd) return;
    if (confirmBtn) confirmBtn.disabled = true;
    if (retryBtn) retryBtn.disabled = true;
    setStatus('Generating…', false);
    try {
      const data = await callRunPipeline({ jd: scrapedJd, profile: buildPipelineProfile() });
      setStatus('Done.', false);
      showResults(data);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Pipeline failed.', true);
      resultsEl.style.display = 'none';
    } finally {
      if (confirmBtn) confirmBtn.disabled = false;
      if (retryBtn) retryBtn.disabled = false;
    }
  });

  // Retry button: go back to URL input
  retryBtn?.addEventListener('click', () => {
    resetUrlTab();
    setStatus('', false);
    resultsEl!.style.display = 'none';
  });

  root.querySelectorAll('.pipeline-tab[data-mode]').forEach((tab) => {
    tab.addEventListener('click', () => {
      const mode = (tab as HTMLElement).dataset.mode as 'jd' | 'json' | 'url';
      if (mode !== 'jd' && mode !== 'json' && mode !== 'url') return;
      setMode(mode);
      (tab as HTMLElement).classList.add('active');
      (tab as HTMLElement).setAttribute('aria-selected', 'true');
      root.querySelectorAll('.pipeline-tab[data-mode]').forEach((t) => {
        if (t !== tab) {
          t.classList.remove('active');
          (t as HTMLElement).setAttribute('aria-selected', 'false');
        }
      });
    });
  });

  function setStatus(text: string, isError: boolean): void {
    statusEl!.textContent = text;
    statusEl!.className = 'pipeline-status' + (isError ? ' pipeline-error' : '');
  }

  function showResults(data: PipelineResponse): void {
    resultsEl!.style.display = 'block';

    const pdfLinksEl = root.querySelector('#pipeline-pdf-links') as HTMLElement | null;
    if (pdfLinksEl) {
      const url = base64ToBlobUrl(data.pdf, 'application/pdf');
      const atsFilename = data.suggestedFilename ?? 'resume-ats.pdf';
      pdfLinksEl.innerHTML = `
        <a href="${url}" download="${atsFilename}">Download ATS PDF</a>
        <span class="pipeline-result-sep">·</span>
        <a href="${url}" target="_blank" rel="noopener">Open ATS PDF</a>
      `;
    }

    const heatmapEl = root.querySelector('#pipeline-heatmap') as HTMLElement | null;
    const heatmap = data.layoutPrep?.keywordHeatmap;
    if (heatmapEl) {
      if (heatmap) {
        heatmapEl.textContent = `Keyword score: ${(heatmap.score * 100).toFixed(0)}% · Present: ${heatmap.present?.length ?? 0} · Missing: ${heatmap.missing?.length ?? 0}`;
      } else {
        heatmapEl.textContent = 'No keyword heatmap (no JD keywords provided).';
      }
    }

    const visualPdfEl = root.querySelector('#pipeline-visual-pdf') as HTMLElement | null;
    if (visualPdfEl) {
      if (data.visualPdf) {
        const vUrl = base64ToBlobUrl(data.visualPdf, 'application/pdf');
        const visualFilename = data.suggestedFilename
          ? data.suggestedFilename.replace('_Resume.pdf', '_Visual_Resume.pdf')
          : 'resume-visual.pdf';
        visualPdfEl.innerHTML = `
          <a href="${vUrl}" download="${visualFilename}">Download Visual PDF</a>
          <span class="pipeline-result-sep">·</span>
          <a href="${vUrl}" target="_blank" rel="noopener">Open Visual PDF</a>
        `;
      } else {
        visualPdfEl.textContent = '';
      }
    }

    const warningsEl = root.querySelector('#pipeline-warnings') as HTMLElement | null;
    if (warningsEl && data.warnings?.length) {
      warningsEl.innerHTML = data.warnings.map((w) => `<div>${w.code}: ${w.message}</div>`).join('');
      warningsEl.style.display = 'block';
    } else if (warningsEl) {
      warningsEl.innerHTML = '';
      warningsEl.style.display = 'none';
    }
  }

  runBtn!.addEventListener('click', async () => {
    if (!apiBase) {
      setStatus('API URL not configured (VITE_API_URL).', true);
      return;
    }

    if (currentMode === 'url') {
      const url = urlInputEl?.value?.trim() ?? '';
      if (!url) {
        setStatus('Enter a job URL (e.g. LinkedIn or Seek).', true);
        return;
      }
      if (!isValidHttpUrl(url)) {
        setUrlError('Enter a valid http:// or https:// URL.');
        return;
      }
      runBtn!.disabled = true;
      setStatus('Fetching job description…', false);
      try {
        const { markdown } = await callScrapeJd(url);
        setStatus('Review the scraped content below, then click "Use this JD" to generate.', false);
        showPreview(markdown);
      } catch (err) {
        setStatus(err instanceof Error ? err.message : 'Fetch failed.', true);
      } finally {
        runBtn!.disabled = false;
      }
      return;
    }

    const raw = inputEl.value.trim();
    if (!raw) {
      setStatus('Enter JD text or resume JSON.', true);
      return;
    }

    runBtn!.disabled = true;
    setStatus('Generating…', false);

    let body: Record<string, unknown>;
    if (currentMode === 'jd') {
      body = { jd: raw, profile: buildPipelineProfile() };
    } else {
      try {
        const parsed = JSON.parse(raw) as unknown;
        body = { structuredResume: parsed, profile: buildPipelineProfile() };
      } catch {
        setStatus('Invalid JSON. Check the resume structure.', true);
        runBtn!.disabled = false;
        return;
      }
    }

    try {
      const data = await callRunPipeline(body);
      setStatus('Done.', false);
      showResults(data);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Pipeline failed.', true);
      resultsEl!.style.display = 'none';
    } finally {
      runBtn!.disabled = false;
    }
  });
}
