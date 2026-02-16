export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // List of currencies used in Nepal
  const currencyMeta = [
    { name: "US Dollar", code: "USD", unit: 1 },
    { name: "Indian Rupee", code: "INR", unit: 100 },
    { name: "European Euro", code: "EUR", unit: 1 },
    { name: "UK Pound Sterling", code: "GBP", unit: 1 },
    { name: "UAE Dirham", code: "AED", unit: 1 },
    { name: "Qatari Riyal", code: "QAR", unit: 1 },
    { name: "Saudi Arabian Riyal", code: "SAR", unit: 1 },
    { name: "Malaysian Ringgit", code: "MYR", unit: 1 },
    { name: "Australian Dollar", code: "AUD", unit: 1 },
    { name: "Canadian Dollar", code: "CAD", unit: 1 },
    { name: "Singapore Dollar", code: "SGD", unit: 1 },
    { name: "Japanese Yen", code: "JPY", unit: 10 }
  ];

  try {
    // 1. Fetch Live USD/NPR from Yahoo (The "Google" 144.85 price)
    let liveUsdNpr = 144.72; // Baseline fallback
    try {
      const yRes = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/USDNPR=X?interval=1d&range=1d`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
      });
      const yData = await yRes.json();
      const price = yData?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (price) liveUsdNpr = price;
    } catch (e) {
      console.error("Yahoo Live failed, using fallback");
    }

    // 2. Fetch 90-day History from Frankfurter (Very stable)
    const frankRes = await fetch(`https://api.frankfurter.dev/v1/${startDate}..?base=USD&symbols=NPR,EUR,GBP,INR,AUD,CAD,AED,QAR,SAR,MYR,SGD,JPY`);
    const frankData = await frankRes.json();

    if (!frankData || !frankData.rates) throw new Error("History data unavailable");

    // 3. Generate History and Inject Live Rate
    const history = Object.entries(frankData.rates).map(([date, rates]) => {
      const isLatestDay = date === frankData.end_date;
      
      return {
        date: date,
        currencies: currencyMeta.map(meta => {
          let buyRate;

          if (meta.code === "INR") {
            buyRate = 160.00; // Fixed Peg for Nepal
          } else if (meta.code === "USD") {
            // Use Yahoo price for the most recent day, otherwise use historical NPR rate
            buyRate = isLatestDay ? liveUsdNpr : (rates["NPR"] || 144.72);
          } else {
            // Cross-rate: (Current NPR Rate) / (Foreign Currency per USD) * Unit
            const nprBase = isLatestDay ? liveUsdNpr : (rates["NPR"] || 144.72);
            const foreignPerUsd = rates[meta.code] || 1;
            buyRate = (nprBase / foreignPerUsd) * meta.unit;
          }

          // Safety check: Ensure we never return 0 or NaN
          const finalRate = (buyRate && buyRate > 0) ? buyRate : 1;

          return {
            currency: meta.name,
            code: meta.code,
            unit: meta.unit,
            buy: Number(finalRate.toFixed(2)),
            sell: Number(finalRate.toFixed(2))
          };
        })
      };
    }).reverse(); // Newest first

    // 4. Return Data
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');
    return res.status(200).json({
      status: "success",
      source: "Yahoo Finance Live + Frankfurter History",
      last_updated: new Date().toISOString(),
      rates: history
    });

  } catch (error) {
    console.error("Critical Error:", error.message);
    // If everything fails, return an error object instead of 0
    return res.status(500).json({ status: 'error', message: error.message });
  }
}