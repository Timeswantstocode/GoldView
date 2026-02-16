export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 95 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  try {
    // 1. Fetch LIVE USD/NPR from Yahoo (The "Google" 144.95 price)
    let liveUsdNpr = null;
    try {
      const yRes = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/USDNPR=X?interval=1d&range=1d`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const yData = await yRes.json();
      liveUsdNpr = yData?.chart?.result?.[0]?.meta?.regularMarketPrice;
    } catch (e) { console.error("Yahoo Live Failed"); }

    // 2. Fetch History from Nepal Rastra Bank
    // This API returns only days they published rates (no weekends/holidays)
    const nrbUrl = `https://www.nrb.org.np/api/forex/v1/rates?from=${startDate}&to=${endDate}&per_page=100&page=1`;
    const nrbRes = await fetch(nrbUrl);
    const nrbData = await nrbRes.json();
    
    if (!nrbData?.data?.payload) throw new Error("NRB API unavailable");

    // 3. Process the NRB list exactly as it is
    const rates = nrbData.data.payload.map((day, index) => {
      // We only update the very first (most recent) entry with the Live Yahoo price
      const isLatestEntry = index === 0;

      return {
        date: day.date,
        currencies: day.rates.map(r => {
          const code = r.currency.iso3;
          let buy = parseFloat(r.buy);
          let sell = parseFloat(r.sell);

          // If this is the newest day in the list, inject the Google-accurate USD price
          if (isLatestEntry && liveUsdNpr && code === "USD") {
            buy = liveUsdNpr;
            sell = liveUsdNpr;
          }

          return {
            currency: r.currency.name,
            code: code,
            unit: r.currency.unit,
            buy: Number(buy.toFixed(2)),
            sell: Number(sell.toFixed(2))
          };
        })
      };
    });

    // 4. Return the data exactly as formatted by NRB
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');
    return res.status(200).json({
      status: "success",
      source: "Nepal Rastra Bank (Live USD by Yahoo)",
      last_updated: new Date().toISOString(),
      rates: rates // No filling, no gap-closing
    });

  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
}