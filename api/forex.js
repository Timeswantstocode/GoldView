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

    // 2. Fetch Official Data from Nepal Rastra Bank (NRB)
    const nrbUrl = `https://www.nrb.org.np/api/forex/v1/rates?from=${startDate}&to=${endDate}&per_page=100&page=1`;
    const nrbRes = await fetch(nrbUrl);
    const nrbData = await nrbRes.json();
    
    if (!nrbData?.data?.payload) throw new Error("NRB API unavailable");

    // 3. Process NRB Data and Merge Live Price
    const formattedRates = nrbData.data.payload.map((day, index) => {
      const isLatestDay = index === 0;

      return {
        date: day.date,
        currencies: day.rates.map(r => {
          const code = r.currency.iso3;
          let buy = parseFloat(r.buy);
          let sell = parseFloat(r.sell);

          // If this is the most recent entry and we have a Live Yahoo price
          if (isLatestDay && liveUsdNpr) {
            if (code === "USD") {
              // Update USD to the Google-accurate price
              buy = liveUsdNpr;
              sell = liveUsdNpr;
            } else {
              // Adjust other currencies based on the "Google" USD trend
              // (Live USD / Bank USD) * Bank Rate
              const adjustmentFactor = liveUsdNpr / parseFloat(day.rates.find(cr => cr.currency.iso3 === "USD").buy);
              buy = buy * adjustmentFactor;
              sell = sell * adjustmentFactor;
            }
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

    // 4. Ensure Today is always present (even if NRB hasn't updated yet)
    if (formattedRates.length > 0 && formattedRates[0].date !== endDate) {
      const latestFromNrb = JSON.parse(JSON.stringify(formattedRates[0]));
      latestFromNrb.date = endDate;
      
      // Force the USD to the current Live Market price
      if (liveUsdNpr) {
        latestFromNrb.currencies.forEach(c => {
          if (c.code === "USD") {
            c.buy = liveUsdNpr;
            c.sell = liveUsdNpr;
          }
        });
      }
      formattedRates.unshift(latestFromNrb);
    }

    // 5. Final Output (limit to 90 days)
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');
    return res.status(200).json({
      status: "success",
      source: "Nepal Rastra Bank + Yahoo Live",
      last_updated: new Date().toISOString(),
      rates: formattedRates.slice(0, 90)
    });

  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
}