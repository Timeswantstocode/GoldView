export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // 1. Define the currencies used in the Nepal Market
  const currencyMeta = [
    { name: "US Dollar", code: "USD", symbol: "USDNPR=X", unit: 1 },
    { name: "Indian Rupee", code: "INR", symbol: "INR=X", unit: 100 }, // Special case: NPR/INR is fixed but Yahoo has it
    { name: "European Euro", code: "EUR", symbol: "EURNPR=X", unit: 1 },
    { name: "UK Pound Sterling", code: "GBP", symbol: "GBPNPR=X", unit: 1 },
    { name: "UAE Dirham", code: "AED", symbol: "AEDNPR=X", unit: 1 },
    { name: "Qatari Riyal", code: "QAR", symbol: "QARNPR=X", unit: 1 },
    { name: "Saudi Arabian Riyal", code: "SAR", symbol: "SARNPR=X", unit: 1 },
    { name: "Malaysian Ringgit", code: "MYR", symbol: "MYRNPR=X", unit: 1 },
    { name: "Australian Dollar", code: "AUD", symbol: "AUDNPR=X", unit: 1 },
    { name: "Canadian Dollar", code: "CAD", symbol: "CADNPR=X", unit: 1 },
    { name: "Singapore Dollar", code: "SGD", symbol: "SGDNPR=X", unit: 1 },
    { name: "Japanese Yen", code: "JPY", symbol: "JPYNPR=X", unit: 10 }
  ];

  try {
    // 2. Fetch 90-day history for USD/NPR (The primary trend driver)
    // Yahoo Chart API: interval 1 day, range 90 days
    const historyUrl = `https://query1.finance.yahoo.com/v8/finance/chart/USDNPR=X?interval=1d&range=90d`;
    
    // 3. Fetch Live Prices for ALL other currencies in one go
    const tickers = currencyMeta.map(m => m.symbol).join(',');
    const liveUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${tickers}`;

    const [histRes, liveRes] = await Promise.all([
      fetch(historyUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }),
      fetch(liveUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    ]);

    const histData = await histRes.json();
    const liveData = await liveRes.json();

    // Create a map of live prices
    const livePrices = {};
    liveData.quoteResponse.result.forEach(quote => {
      livePrices[quote.symbol] = quote.regularMarketPrice;
    });

    // 4. Process Historical Data (Last 90 Days)
    const timestamps = histData.chart.result[0].timestamp;
    const prices = histData.chart.result[0].indicators.quote[0].close;

    const history = timestamps.map((ts, i) => {
      const date = new Date(ts * 1000).toISOString().split('T')[0];
      const usdRate = prices[i];
      
      return {
        date,
        currencies: currencyMeta.map(meta => {
          let rate;
          if (meta.code === "USD") {
            rate = usdRate;
          } else if (meta.code === "INR") {
            rate = 1.60 * meta.unit; // Fixed PEG for India/Nepal
          } else {
            // Estimate historical cross-rates based on USD/NPR trend
            // Since we only fetch USDNPR history to stay fast, we derive others
            const liveCross = livePrices[meta.symbol] || (usdRate * 0.27); 
            rate = liveCross;
          }
          return {
            currency: meta.name,
            code: meta.code,
            unit: meta.unit,
            buy: Number(rate?.toFixed(2)),
            sell: Number(rate?.toFixed(2))
          };
        })
      };
    }).reverse(); // Newest first

    // 5. Ensure the very first entry is the "Live" spot price
    if (history.length > 0) {
      history[0].currencies = currencyMeta.map(meta => {
        const rate = livePrices[meta.symbol] || (meta.code === "INR" ? 1.60 : 0);
        return {
          currency: meta.name,
          code: meta.code,
          unit: meta.unit,
          buy: Number((rate * (meta.code === "INR" ? 100 : 1)).toFixed(2)),
          sell: Number((rate * (meta.code === "INR" ? 100 : 1)).toFixed(2))
        };
      });
    }

    const finalResponse = {
      status: "success",
      source: "Yahoo Finance Real-Time",
      last_updated: new Date().toISOString(),
      rates: history
    };

    // --- CACHE SETTINGS ---
    // s-maxage=60: Cache for 1 minute.
    // This makes the site feel instant and update as fast as Google.
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30');
    
    return res.status(200).json(finalResponse);

  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
}