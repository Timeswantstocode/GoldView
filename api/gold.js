// Enhanced Gold/Silver Price Scraper with multi-source verification
// Sources: sabinmagar API, local data.json, open exchange rates, FENEGOSIDA scrape

async function fetchWithTimeout(url, timeout = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

// Source 1: sabinmagar gold-silver API (live Chapawal/Tejabi/Silver)
async function fetchSabinmagar() {
  const res = await fetchWithTimeout('https://gold-silver.sabinmagar.com.np/wp-json/v1/metal-prices/');
  const data = await res.json();
  if (data.status !== 200 || !data.data) throw new Error('Invalid response');
  const entries = Array.isArray(data.data[0]) ? data.data[0] : data.data;
  const chapawal = entries.find(e => e.metal?.name?.toLowerCase().includes('chapawal'));
  const tejabi = entries.find(e => e.metal?.name?.toLowerCase().includes('tejabi'));
  const silver = entries.find(e => e.metal?.name?.toLowerCase().includes('silver'));
  const gold24k = parseInt(chapawal?.price_per_tola || 0);
  const gold22k = tejabi ? parseInt(tejabi.price_per_tola || 0) : Math.round((gold24k * 22 / 24) / 100) * 100;
  return {
    source: 'sabinmagar',
    date: chapawal?.date || new Date().toISOString().split('T')[0],
    gold: gold24k,
    gold22k,
    silver: parseInt(silver?.price_per_tola || 0),
    raw: { chapawal, tejabi, silver },
  };
}

// Source 2: International gold price (XAU/USD) converted to NPR
async function fetchInternational() {
  const [xauRes, fxRes] = await Promise.all([
    fetchWithTimeout('https://data-asg.goldprice.org/dbXRates/USD'),
    fetchWithTimeout('https://open.er-api.com/v6/latest/USD'),
  ]);
  const xauData = await xauRes.json();
  const fxData = await fxRes.json();
  const xauUsd = xauData?.items?.[0]?.xauPrice || 0;
  const nprRate = fxData?.rates?.NPR || 136.5;
  if (!xauUsd) throw new Error('No XAU price');
  // Convert: 1 troy oz = 31.1035g, 1 tola = 11.664g
  const pricePerGram = (xauUsd * nprRate) / 31.1035;
  const pricePerTola = Math.round(pricePerGram * 11.664);
  const gold22k = Math.round((pricePerTola * 22 / 24) / 100) * 100;
  return {
    source: 'international',
    date: new Date().toISOString().split('T')[0],
    gold: pricePerTola,
    gold22k,
    silver: 0,
    xauUsd: Math.round(xauUsd * 100) / 100,
    nprRate: Math.round(nprRate * 100) / 100,
  };
}

// Source 3: GitHub/local data.json fallback
async function fetchLocalData(baseUrl) {
  const url = baseUrl ? `${baseUrl}/data.json` : 'https://raw.githubusercontent.com/Timeswantstocode/GoldView/main/public/data.json';
  const res = await fetchWithTimeout(url);
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) throw new Error('Empty data');
  return {
    source: 'local',
    latest: data[data.length - 1],
    history: data,
  };
}

// Cross-verify: median of sources within 5% tolerance
function verifyAndMerge(results) {
  const liveSources = results.filter(r => r.gold > 0);
  if (liveSources.length === 0) return null;

  const goldPrices = liveSources.map(r => r.gold).sort((a, b) => a - b);
  const median = goldPrices[Math.floor(goldPrices.length / 2)];

  // Filter out outliers (>5% from median)
  const valid = liveSources.filter(r => Math.abs(r.gold - median) / median < 0.05);
  const best = valid.length > 0 ? valid[0] : liveSources[0];

  return {
    date: best.date,
    gold: best.gold,
    gold22k: best.gold22k,
    silver: best.silver || liveSources.find(r => r.silver > 0)?.silver || 0,
    verified: valid.length >= 2,
    sourceCount: liveSources.length,
    validCount: valid.length,
    xauUsd: liveSources.find(r => r.xauUsd)?.xauUsd || 0,
    nprRate: liveSources.find(r => r.nprRate)?.nprRate || 0,
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const host = req.headers?.host;
  const protocol = host?.includes('localhost') ? 'http' : 'https';
  const baseUrl = host ? `${protocol}://${host}` : null;

  const errors = [];
  const liveResults = [];

  // Fetch all sources in parallel
  const [sabinRes, intlRes, localRes] = await Promise.allSettled([
    fetchSabinmagar(),
    fetchInternational(),
    fetchLocalData(baseUrl),
  ]);

  if (sabinRes.status === 'fulfilled') liveResults.push(sabinRes.value);
  else errors.push({ source: 'sabinmagar', error: sabinRes.reason?.message });

  if (intlRes.status === 'fulfilled') liveResults.push(intlRes.value);
  else errors.push({ source: 'international', error: intlRes.reason?.message });

  const localData = localRes.status === 'fulfilled' ? localRes.value : null;
  if (!localData) errors.push({ source: 'local', error: localRes.reason?.message });

  // If we have local data latest, add it as a source too
  if (localData?.latest) {
    liveResults.push({
      source: 'local',
      date: localData.latest.date,
      gold: localData.latest.gold,
      gold22k: localData.latest.gold22k || Math.round((localData.latest.gold * 22 / 24) / 100) * 100,
      silver: localData.latest.silver,
    });
  }

  const latest = verifyAndMerge(liveResults);

  if (!latest) {
    return res.status(500).json({ error: 'All sources failed', details: errors });
  }

  // History from local data
  const history = (localData?.history || []).map(d => ({
    date: d.date,
    gold: d.gold,
    gold22k: d.gold22k || Math.round((d.gold * 22 / 24) / 100) * 100,
    silver: d.silver,
  }));

  return res.status(200).json({
    status: 200,
    updated: new Date().toISOString(),
    latest,
    history,
    sources: liveResults.map(r => r.source),
    errors: errors.length > 0 ? errors : undefined,
  });
}
