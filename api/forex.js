export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const API_KEY = "1de72fcaa4e9fe19534f8e3a";
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // 1. Yahoo Finance URL (Real-time Spot Rate - Matches Google)
  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/USDNPR=X?interval=1d&range=1d`;
  // 2. Frankfurter (90-day history)
  const frankfurterUrl = `https://api.frankfurter.dev/v1/${startDate}..${endDate}?base=USD&symbols=NPR`;
  // 3. Your API (Backup)
  const exchUrl = `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/USD`;

  try {
    // FETCH LIVE RATE (Yahoo Finance)
    let liveRate = null;
    try {
      const yRes = await fetch(yahooUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const yData = await yRes.json();
      liveRate = yData.chart.result[0].meta.regularMarketPrice; 
    } catch (e) {
      console.error("Yahoo Finance failed, trying fallback");
    }

    // FETCH HISTORY (Frankfurter)
    const frankRes = await fetch(frankfurterUrl);
    const frankData = await frankRes.json();
    
    // FETCH NRB/EXCHANGE-API for verification if Yahoo failed
    if (!liveRate) {
      const exRes = await fetch(exchUrl);
      const exData = await exRes.json();
      liveRate = exData.conversion_rates.NPR;
    }

    // Process History
    let history = Object.entries(frankData.rates || {})
      .map(([date, val]) => ({
        date: date,
        currencies: [{ currency: "US Dollar", code: "USD", unit: 1, buy: val.NPR, sell: val.NPR }]
      }));

    // Add the most accurate "Google-like" rate to the top
    const latestEntry = {
      date: endDate,
      currencies: [{ 
        currency: "US Dollar", 
        code: "USD", 
        unit: 1, 
        buy: liveRate, 
        sell: liveRate 
      }]
    };

    let finalRates = [latestEntry, ...history.filter(h => h.date !== endDate)];
    finalRates.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Update NRB for other currencies if needed (optional)
    const responseData = {
      status: "success",
      source: "Yahoo Finance (Real-time) + Frankfurter",
      live_spot: liveRate,
      rates: finalRates
    };

    // --- CACHE SETTINGS ---
    // s-maxage=900 (15 minutes) - This makes it update frequently like Google
    res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=300');
    
    return res.status(200).json(responseData);

  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
}