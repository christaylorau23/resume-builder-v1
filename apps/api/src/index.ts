/**
 * Resume Builder API: pipeline endpoint.
 */
import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { runPipeline, type PipelineInput } from '@repo/core';
import { scrapeJobDescription } from './services/scraper.js';

const PORT = Number(process.env.PORT) || 3001;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
  })
);

/** POST /api/scrape-jd — scrape job description from URL (e.g. LinkedIn, Seek). */
app.post('/api/scrape-jd', async (req, res) => {
  const url = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
  if (!url) {
    res.status(400).json({ error: 'MISSING_URL', message: 'Provide url in body.' });
    return;
  }
  try {
    const markdown = await scrapeJobDescription(url);
    res.json({ markdown });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Scrape failed';
    if (message.includes('Invalid URL') || message.includes('URL is required')) {
      res.status(400).json({ error: 'INVALID_URL', message });
      return;
    }
    res.status(502).json({ error: 'SCRAPE_FAILED', message });
  }
});

/** POST /api/run-pipeline — run the resume pipeline. */
app.post('/api/run-pipeline', async (req, res) => {
  const input = req.body as PipelineInput;
  if (!input?.structuredResume && !input?.jd) {
    res.status(400).json({ error: 'MISSING_INPUT', message: 'Provide structuredResume or jd in body.' });
    return;
  }
  try {
    const result = await runPipeline(input);
    res.setHeader('Content-Type', 'application/json');
    res.json({
      pdf: result.pdf.toString('base64'),
      visualPdf: result.visualPdf?.toString('base64'),
      layoutPrep: result.layoutPrep,
      warnings: result.warnings,
      suggestedFilename: result.suggestedFilename,
    });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'MISSING_ANTHROPIC_KEY') {
      res.status(500).json({ error: code, message: 'Server is missing ANTHROPIC_API_KEY. Contact the administrator.' });
      return;
    }
    if (code === 'INVALID_ANTHROPIC_KEY') {
      res.status(500).json({ error: code, message: 'Anthropic API key is invalid. Contact the administrator.' });
      return;
    }
    if (code === 'ANTHROPIC_RATE_LIMITED') {
      res.status(503).json({ error: code, message: 'AI service is rate-limited. Please retry in a moment.' });
      return;
    }
    if (code === 'REDRAFT_PARSE_FAILED') {
      res.status(500).json({ error: code, message: 'AI response could not be parsed. Please retry.' });
      return;
    }
    const message = err instanceof Error ? err.message : 'Pipeline failed';
    res.status(500).json({ error: 'PIPELINE_FAILED', message });
  }
});

app.listen(PORT, () => {
  console.log(`API server listening on ${BASE_URL}`);
});
