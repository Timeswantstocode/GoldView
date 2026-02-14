// Enhanced Gold/Silver Price Scraper with multiple sources and verification
// Sources: sabinmagar API, GitHub data.json, cross-verification

const SOURCES = {
  sabinmagar: 'https://gold-silver.sabinmagar.com.np/wp-json/v1/metal-prices/',
  github: 'https://raw.githubusercontent.com/Timeswantstocode/GoldView/main/data.json',
};

async function fetchWithTimeout(url, timeout = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

// Source 1: sabinmagar API (gives Chapawal = 24K, plus Silver)
async function fetchSabinmagar() {
  const data = await fetchWithTimeout(SOURCES.sabinmagar);
  if (data.status !== 200 || !data.data) throw new Error('Invalid sabinmagar response');
  
  const entries = Array.isArray(data.data[0]) ? data.data[0] : data.data;
  const chapawal = entries.find(e => e.metal?.name?.toLowerCase().includes('chapawal'));
  const silver = entries.find(e => e.metal?.name?.toLowerCase().includes('silver'));
  
  const gold24k = parseInt(chapawal?.price_per_tola || 0);
  const silverPrice = parseInt(silver?.price_per_tola || 0);
  // 22K is approximately 91.67% of 24K (22/24), but Nepal market adds a slight premium
  // Standard Nepal jeweler 22K rate is typically 24K * (22/24) rounded to nearest 100
  const gold22k = Math.round((gold24k * 22 / 24) / 100) * 100;
  
  return {
    source: 'sabinmagar',
    date: chapawal?.date || new Date().toISOString().split('T')[0],
    gold: gold24k,
    gold22k: gold22k,
    silver: silverPrice,
    gold_per_10g: parseInt(chapawal?.price_per_ten_gram || 0),
    silver_per_10g: parseInt(silver?.price_per_ten_gram || 0),
  };
}

// Source 2: GitHub data.json (historical + latest)
async function fetchGithub() {
  const data = await fetchWithTimeout(SOURCES.github);
  if (!Array.isArray(data) || data.length === 0) throw new Error('Invalid github data');
  const latest = data[data.length - 1];
  return {
    source: 'github',
    date: latest.date,
    gold: parseInt(latest.gold || 0),
    gold22k: parseInt(latest.gold22k || Math.round((parseInt(latest.gold || 0) * 22 / 24) / 100) * 100),
    silver: parseInt(latest.silver || 0),
    history: data,
  };
}

// Cross-verify prices between sources (tolerance: 3% difference)
function verifyPrices(prices) {
  if (prices.length < 2) return prices[0] || null;
  
  const goldPrices = prices.map(p => p.gold).filter(p => p > 0);
  const silverPrices = prices.map(p => p.silver).filter(p => p > 0);
  
  let verified = { ...prices[0], verified: false, sources_count: prices.length };
  
  if (goldPrices.length >= 2) {
    const avg = goldPrices.reduce((a, b) => a + b, 0) / goldPrices.length;
    const maxDiff = Math.max(...goldPrices.map(p => Math.abs(p - avg) / avg));
    verified.verified = maxDiff < 0.03; // Within 3%
    verified.gold = Math.round(avg);
    verified.gold22k = Math.round((verified.gold * 22 / 24) / 100) * 100;
  }
  
  if (silverPrices.length >= 2) {
    const avg = silverPrices.reduce((a, b) => a + b, 0) / silverPrices.length;
    verified.silver = Math.round(avg);
  }
  
  return verified;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const results = [];
  const errors = [];
  
  // Fetch from all sources in parallel
  const [sabinResult, githubResult] = await Promise.allSettled([
    fetchSabinmagar(),
    fetchGithub(),
  ]);
  
  if (sabinResult.status === 'fulfilled') results.push(sabinResult.value);
  else errors.push({ source: 'sabinmagar', error: sabinResult.reason?.message });
  
  if (githubResult.status === 'fulfilled') results.push(githubResult.value);
  else errors.push({ source: 'github', error: githubResult.reason?.message });
  
  if (results.length === 0) {
    return res.status(500).json({ error: 'All sources failed', details: errors });
  }
  
  // Get verified latest prices
  const latest = verifyPrices(results);
  
  // Get historical data from github source if available
  const githubData = results.find(r => r.source === 'github');
  const history = githubData?.history || [];
  
  // Enrich history with 22K prices
  const enrichedHistory = history.map(day => ({
    ...day,
    gold22k: day.gold22k || Math.round((parseInt(day.gold || 0) * 22 / 24) / 100) * 100,
  }));
  
  return res.status(200).json({
    status: 200,
    updated: new Date().toISOString(),
    latest: {
      date: latest.date,
      gold: latest.gold,
      gold22k: latest.gold22k,
      silver: latest.silver,
      gold_per_10g: latest.gold_per_10g || 0,
      silver_per_10g: latest.silver_per_10g || 0,
      verified: latest.verified || false,
      sources_count: latest.sources_count || 1,
    },
    history: enrichedHistory,
    sources: results.map(r => r.source),
    errors: errors.length > 0 ? errors : undefined,
  });
}
