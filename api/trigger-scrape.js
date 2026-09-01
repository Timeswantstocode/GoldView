/*
 * Copyright (c) 2024-2026 Timeswantstocode. All Rights Reserved.
 * Vercel Cron -> GitHub workflow_dispatch bridge
 * Fixes GitHub schedule delays (up to 6-12h observed) by using Vercel's
 * more reliable cron to trigger the scrape workflow at exact NPT time.
 */

export default async function handler(req, res) {
  // Allow Vercel Cron (GET) and manual POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const isCron = req.headers['x-vercel-cron'] === '1';
  const authHeader = req.headers['authorization'] || '';
  const cronSecret = process.env.CRON_SECRET;

  // Verify Vercel Cron secret if configured.
  // Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is set.
  if (cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      // For cron requests without secret, reject. For manual POST allow same secret.
      return res.status(401).json({ error: 'Unauthorized: invalid CRON_SECRET' });
    }
  } else if (!isCron) {
    // No CRON_SECRET configured -> only allow Vercel Cron header or localhost manual with no secret
    // In production you SHOULD set CRON_SECRET to prevent abuse.
    console.warn('CRON_SECRET not set - cron endpoint is unauthenticated');
  }

  const ghPat = process.env.GH_PAT || process.env.GITHUB_PAT || process.env.TRIGGER_PAT;
  if (!ghPat) {
    console.error('Missing GH_PAT env var');
    return res.status(500).json({
      error: 'GH_PAT not configured',
      hint: 'Add GH_PAT (GitHub PAT with repo + workflow scope) in Vercel Env Vars',
    });
  }

  const owner = process.env.GH_REPO_OWNER || 'Timeswantstocode';
  const repo = process.env.GH_REPO_NAME || 'GoldView';
  const workflow = process.env.GH_WORKFLOW_FILE || 'scrape.yml';
  const ref = process.env.GH_REF || 'main';

  const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow}/dispatches`;

  try {
    const ghRes = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${ghPat}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        'User-Agent': 'GoldView-cron-trigger',
      },
      body: JSON.stringify({ ref }),
    });

    if (ghRes.status === 204) {
      console.log(`Triggered ${workflow} on ${ref} via Vercel Cron isCron=${isCron}`);
      return res.status(200).json({
        success: true,
        message: `Dispatched ${workflow} on ${ref}`,
        isCron,
        workflow,
        ref,
        at: new Date().toISOString(),
      });
    }

    const body = await ghRes.text();
    console.error(`GitHub dispatch failed ${ghRes.status}: ${body}`);
    return res.status(ghRes.status).json({
      error: 'GitHub dispatch failed',
      status: ghRes.status,
      details: body.slice(0, 1000),
    });
  } catch (error) {
    console.error('Trigger error:', error);
    return res.status(500).json({ error: 'Failed to trigger workflow', details: error.message });
  }
}
