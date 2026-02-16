export default async function handler(req, res) {
  // 1. Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const API_KEY = "1de72fcaa4e9fe19534f8e3a";
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  // URLs
  const exchangeRateUrl = `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/USD`;
  const frankfurterUrl = `https://api.frankfurter.dev/v1/${startDate}..${endDate}?base=USD&symbols=NPR`;
  const nrbUrl = `https://www.nrb.org.np/api/forex/v1/rates?from=${startDate}&to=${endDate}&per_page=100&page=1`;

  try {
    // 1. Fetch Latest Rate using your API Key (Quota used here)
    const exRes = await fetch(exchangeRateUrl);
    const exData = await exRes.json();
    
    if (exData.result !== "success") throw new Error("ExchangeRate-API failed");
    const currentNprRate = exData.conversion_rates.NPR;

    // 2. Fetch History from Frankfurter (Free, no quota hit)
    const frankRes = await fetch(frankfurterUrl);
    const frankData = await frankRes.json();
    
    // Transform Frankfurter history into our format
    let history = Object.entries(frankData.rates || {})
      .map(([date, val]) => ({
        date: date,
        currencies: [{ currency: "US Dollar", code: "USD", unit: 1, buy: val.NPR, sell: val.NPR }]
      }));

    // Add your API Key's "Latest" rate to the front of the history
    const latestEntry = {
      date: endDate,
      currencies: [{ currency: "US Dollar", code: "USD", unit: 1, buy: currentNprRate, sell: currentNprRate }]
    };

    // Filter out if today's date already exists in history to avoid duplicates
    let finalRates = [latestEntry, ...history.filter(h => h.date !== endDate)];
    finalRates.sort((a, b) => new Date(b.date) - new Date(a.date));

    let responseData = {
      status: "success",
      source: "ExchangeRate-API + Frankfurter",
      last_updated: exData.time_last_update_utc,
      rates: finalRates
    };

    // 3. Optional: Enrich with NRB data for more currencies (AED, MYR, etc.)
    try {
      const nrbRes = await fetch(nrbUrl, { signal: AbortSignal.timeout(5000) });
      if (nrbRes.ok) {
        const nrbData = await nrbRes.json();
        if (nrbData.data?.payload) {
          // If NRB is available, we use their comprehensive list for all dates
          responseData.rates = nrbData.data.payload.map(day => ({
            date: day.date,
            currencies: day.rates.map(r => ({
              currency: r.currency.name,
              code: r.currency.iso3,
              unit: r.currency.unit,
              buy: parseFloat(r.buy),
              sell: parseFloat(r.sell)
            }))
          }));
          responseData.source = "Nepal Rastra Bank (Verified by ExchangeRate-API)";
        }
      }
    } catch (e) {
      console.warn("NRB fallback used history.");
    }

    // --- CACHE FOR 24 HOURS TO SAVE QUOTA ---
    // s-maxage=86400 (24h) caches on Vercel CDN
    // stale-while-revalidate=3600 allows serving old data while fetching new in background
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=3600');
    
    return res.status(200).json(responseData);

  } catch (error) {
    console.error('Forex Fetch Error:', error.message);
    return res.status(500).json({ 
      status: 'error',
      message: 'Failed to fetch forex data',
      details: error.message 
    });
  }
}