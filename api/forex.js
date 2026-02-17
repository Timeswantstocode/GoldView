export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 95 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  try {
    // 1. Fetch LIVE quotes and 90-day history from Yahoo Finance
    const tickers = [
      "USDNPR=X", "USDEUR=X", "USDGBP=X", "USDAED=X", "USDQAR=X", "USDSAR=X", 
      "USDMYR=X", "USDKRW=X", "USDAUD=X", "USDCAD=X", "USDSGD=X", "USDJPY=X", "USDINR=X"
    ];
    
    let liveMarket = {};
    let usdHistory = [];

    await Promise.all(tickers.map(async (ticker) => {
      try {
        // For USDNPR, fetch 90 days of history
        const range = ticker === "USDNPR=X" ? "90d" : "1d";
        const interval = ticker === "USDNPR=X" ? "1d" : "1m";
        
        const yRes = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?interval=${interval}&range=${range}`, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const yData = await yRes.json();
        const result = yData?.chart?.result?.[0];
        
        if (result) {
          const price = result.meta?.regularMarketPrice;
          if (price) liveMarket[ticker] = price;

          if (ticker === "USDNPR=X" && result.timestamp) {
            usdHistory = result.timestamp.map((ts, i) => ({
              date: new Date(ts * 1000).toISOString().split('T')[0],
              rate: result.indicators.quote[0].close[i]
            })).filter(h => h.rate !== null);
          }
        }
      } catch (e) {
        console.error(`Yahoo Fetch Failed for ${ticker}:`, e);
      }
    }));

    // 2. Fetch Official History from Nepal Rastra Bank (NRB)
    const nrbUrl = `https://www.nrb.org.np/api/forex/v1/rates?from=${startDate}&to=${endDate}&per_page=100&page=1`;
    const nrbRes = await fetch(nrbUrl);
    const nrbData = await nrbRes.json();
    
    if (!nrbData?.data?.payload) throw new Error("NRB API unavailable");

    // 3. Process NRB Data for history
    const payload = nrbData.data.payload;
    const historyRates = payload.map((day) => {
      return {
        date: day.date,
        currencies: day.rates.map(r => ({
          currency: r.currency.name,
          code: r.currency.iso3,
          unit: r.currency.unit,
          buy: parseFloat(r.buy),
          sell: parseFloat(r.sell)
        }))
      };
    });

    // 4. Construct the CURRENT entry using Yahoo Finance data
    const latestNrbTemplate = payload[0].rates;
    const liveUsdNpr = liveMarket["USDNPR=X"];

    const currentDayRates = latestNrbTemplate.map(r => {
      const code = r.currency.iso3;
      let buy = parseFloat(r.buy);
      let sell = parseFloat(r.sell);

      if (code === "USD" && liveUsdNpr) {
        buy = liveUsdNpr;
        sell = liveUsdNpr;
      } else if (code === "INR") {
        buy = 160.00; // Fixed peg
        sell = 160.00;
      } else if (liveUsdNpr) {
        const tickerName = `USD${code}=X`;
        const usdToForeign = liveMarket[tickerName];
        if (usdToForeign) {
          const liveCrossRate = (liveUsdNpr / usdToForeign) * r.currency.unit;
          buy = liveCrossRate;
          sell = liveCrossRate;
        }
      }

      return {
        currency: r.currency.name,
        code: code,
        unit: r.currency.unit,
        buy: Number(buy.toFixed(2)),
        sell: Number(sell.toFixed(2))
      };
    });

    const today = new Date().toISOString().split('T')[0];
    const currentEntry = {
      date: today,
      currencies: currentDayRates
    };

    // 5. Combine: Current (Yahoo) + History (NRB)
    // We want to use Yahoo for the last 90 days for USD, but NRB for other currencies and older history
    // Create a map of Yahoo USD rates for quick lookup
    const yahooUsdMap = new Map(usdHistory.map(h => [h.date, h.rate]));

    const finalRates = historyRates.map(entry => {
      const yahooRate = yahooUsdMap.get(entry.date);
      if (yahooRate) {
        // Update the USD rate in this entry with Yahoo's data
        const updatedCurrencies = entry.currencies.map(c => {
          if (c.code === "USD") {
            return { ...c, buy: Number(yahooRate.toFixed(2)), sell: Number(yahooRate.toFixed(2)) };
          }
          return c;
        });
        return { ...entry, currencies: updatedCurrencies };
      }
      return entry;
    });

    // Ensure today's entry is included and prioritized
    const hasToday = finalRates.some(r => r.date === today);
    if (!hasToday || (finalRates[0] && finalRates[0].date === today)) {
        // Replace or add today with currentEntry (live)
        const historyWithoutToday = finalRates.filter(entry => entry.date !== today);
        finalRates.splice(0, finalRates.length, currentEntry, ...historyWithoutToday);
    }

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return res.status(200).json({
      status: "success",
      source: "Yahoo Finance (Live) + Nepal Rastra Bank (History)",
      last_updated: new Date().toISOString(),
      rates: finalRates
    });

  } catch (error) {
    console.error("Forex Handler Error:", error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
}
