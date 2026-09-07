/*
 * Copyright (c) 2024-2026 Timeswantstocode. All Rights Reserved.
 * GET /api/ashesh -> live Ashesh gold/silver rates as JSON.
 *
 * Bridge for environments whose IPs Ashesh blocks: since 2026-09-06
 * Ashesh returns 403 to GitHub Actions runners (widget, main page and
 * chart endpoints alike), so the scraper calls this endpoint as a second
 * source before falling back to the estimate_tejabi() formula.
 * Read-only public data, no secrets required.
 */

const WIDGET_URL = 'https://www.ashesh.com.np/gold/widget.php?api=521224q192';
const CHART_URL = (type) => `https://www.ashesh.com.np/gold/chart.php?type=${type}&unit=tola`;
const CHART_TYPE = { gold: 0, tejabi: 1, silver: 2 };
const RANGES = {
  gold: [100000, 1000000],
  tejabi: [100000, 1000000],
  silver: [1000, 15000],
};

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: 'https://www.ashesh.com.np/gold/',
  'Cache-Control': 'no-cache',
};

const inRange = (metal, v) => Number.isInteger(v) && v >= RANGES[metal][0] && v <= RANGES[metal][1];

function parseWidgetBlock(block, metal) {
  // One <div class="country"> chunk -> price if it is the Tola row for metal.
  const name = (block.match(/<div class="name">([^<]*)<\/div>/) || [])[1] || '';
  const unit = (block.match(/<div class="unit">([^<]*)<\/div>/) || [])[1] || '';
  const price = parseInt(((block.match(/<div class="rate_buying">(\d+)<\/div>/) || [])[1] || '0'), 10);
  if (!/tola/i.test(unit) || !inRange(metal, price)) return 0;
  if (metal === 'gold' && /hallmark/i.test(name)) return price;
  if (metal === 'tejabi' && /tajabi|tejabi/i.test(name)) return price;
  if (metal === 'silver' && /silver/i.test(name)) return price;
  return 0;
}

async function fromWidget() {
  const r = await fetch(WIDGET_URL, { headers: HEADERS, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`widget HTTP ${r.status}`);
  const html = await r.text();
  const out = {};
  for (const metal of Object.keys(CHART_TYPE)) {
    for (const block of html.split('<div class="country">')) {
      const v = parseWidgetBlock(block, metal);
      if (v) {
        out[metal] = v;
        break;
      }
    }
  }
  return out;
}

async function fromChart(metal) {
  const r = await fetch(CHART_URL(CHART_TYPE[metal]), {
    headers: HEADERS,
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) throw new Error(`chart ${metal} HTTP ${r.status}`);
  const html = await r.text();
  const m = html.match(/y:\s*(\d{4,6})/);
  const v = m ? parseInt(m[1], 10) : 0;
  return inRange(metal, v) ? v : 0;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const out = { gold: 0, tejabi: 0, silver: 0, source: 'none', at: new Date().toISOString() };
  try {
    Object.assign(out, await fromWidget());
    out.source = 'ashesh-widget';
  } catch (e) {
    console.warn('ashesh widget failed, trying charts:', e.message);
  }
  for (const metal of Object.keys(CHART_TYPE)) {
    if (!out[metal]) {
      try {
        out[metal] = await fromChart(metal);
        if (out[metal] && out.source !== 'ashesh-widget') out.source = 'ashesh-chart';
      } catch (e) {
        console.warn(`ashesh chart failed for ${metal}:`, e.message);
      }
    }
  }
  if (!out.gold && !out.tejabi && !out.silver) {
    return res.status(502).json({ error: 'Ashesh unreachable from edge', at: out.at });
  }
  res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
  return res.status(200).json(out);
}
