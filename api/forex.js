export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // 1. Define Currencies and their Global USD Tickers
  // We use the USD base (e.g., USDAED=X) because these are the most accurate live tickers on Yahoo/Google
  const currencyMeta = [
    { name: "US Dollar", code: "USD", unit: 1, ticker: "USDNPR=X" },
    { name: "Indian Rupee", code: "INR", unit: 100, ticker: "USDINR=X" }, 
    { name: "European Euro", code: "EUR", unit: 1, ticker: "USDEUR=X" },
    { name: "UK Pound Sterling", code: "GBP", unit: 1, ticker: "USDGBP=X" },
    { name: "UAE Dirham", code: "AED", unit: 1, ticker: "USDAED=X" },
    { name: "Qatari Riyal", code: "QAR", unit: 1, ticker: "USDQAR=X" },
    { name: "Saudi Arabian Riyal", code: "SAR", unit: 1, ticker: "USDSAR=X" },
    { name: "Malaysian Ringgit", code: "MYR", unit: 1, ticker: "USDMYR=X" },
    { name: "Australian Dollar", code: "AUD", unit: 1, ticker: "USDAUD=X" },
    { name: "Canadian Dollar", code: "CAD", unit: 1, ticker: "USDCAD=X" },
    { name: "Singapore Dollar", code: "SGD", unit: 1, ticker: "USDSGD=X" },
    { name: "Japanese Yen", code: "JPY", unit: 10, ticker: "USDJPY=X" }
  ];

  try {
    // 2. Fetch USD/NPR 95-day history (to fill gaps)
    const chartRes = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/USDNPR=X?interval=1d&range=95d`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const chartData = await chartRes.json();
    const result = chartData?.chart?.result?.[0];
    const timestamps = result?.timestamp || [];
    const usdNprPrices = result?.indicators?.quote?.[0]?.close || [];

    const priceMap = {};
    timestamps.forEach((ts, i) => {
      const dateStr = new Date(ts * 1000).toISOString().split('T')[0];
      if (usdNprPrices[i]) priceMap[dateStr] = usdNprPrices[i];
    });

    // 3. Fetch LIVE global market rates for ALL currency pairs
    const tickers = currencyMeta.map(m => m.ticker).join(',');
    const quoteRes = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${tickers}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const quoteData = await quoteRes.json();
    
    const liveMarketRates = {};
    quoteData?.quoteResponse?.result?.forEach(q => {
      liveMarketRates[q.symbol] = q.regularMarketPrice;
    });

    const currentUsdNpr = liveMarketRates["USDNPR=X"] || usdNprPrices[usdNprPrices.length - 1];

    // 4. Generate 90 days of continuous data
    const history = [];
    let lastKnownUsd = currentUsdNpr;

    for (let i = 0; i < 90; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      // Handle weekends by using the last available price
      const dayUsdPrice = priceMap[dateStr] || lastKnownUsd;
      lastKnownUsd = dayUsdPrice;

      history.push({
        date: dateStr,
        currencies: currencyMeta.map(meta => {
          let finalNprRate;

          if (meta.code === "USD") {
            finalNprRate = dayUsdPrice;
          } else if (meta.code === "INR") {
            finalNprRate = 160.00; // Fixed official Nepal-India Peg
          } else {
            /* 
               THE CROSS RATE FORMULA:
               To get [Currency]/NPR, we take (USD/NPR) and divide by (USD/[Currency])
               Example for AED: 144.95 (USDNPR) / 3.67 (USDAED) = 39.49 NPR
            */
            const usdToForeign = liveMarketRates[meta.ticker];
            
            if (usdToForeign) {
              // Calculate the rate relative to that day's USD price
              const baseRate = (dayUsdPrice / usdToForeign);
              finalNprRate = baseRate * meta.unit;
            } else {
              finalNprRate = 0;
            }
          }

          return {
            currency: meta.name,
            code: meta.code,
            unit: meta.unit,
            buy: Number(finalNprRate.toFixed(2)),
            sell: Number(finalNprRate.toFixed(2))
          };
        })
      });
    }

    // 5. Cache for 5 minutes
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');
    
    return res.status(200).json({
      status: "success",
      source: "Yahoo Finance Live Market",
      last_updated: new Date().toISOString(),
      rates: history
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
}