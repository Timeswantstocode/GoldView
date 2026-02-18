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
    let tickerHistoryMaps = {}; // { ticker: Map(date -> rate) }

    await Promise.all(tickers.map(async (ticker) => {
      try {
        // Fetch 90 days of history for ALL supported tickers to ensure 100% "Google accuracy" across the board
        const range = "90d";
        const interval = "1d";
        
        const yRes = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?interval=${interval}&range=${range}`, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const yData = await yRes.json();
        const result = yData?.chart?.result?.[0];
        
        if (result) {
          const price = result.meta?.regularMarketPrice;
          if (price) liveMarket[ticker] = price;

          if (result.timestamp) {
            const historyMap = new Map();
            result.timestamp.forEach((ts, i) => {
              const d = new Date(ts * 1000).toISOString().split('T')[0];
              const val = result.indicators.quote[0].close[i];
              if (val !== null && val !== undefined) historyMap.set(d, val);
            });
            tickerHistoryMaps[ticker] = historyMap;
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
        // Indian Rupee is pegged 1.6:1
        buy = 160.00;
        sell = 160.15;
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

    // 5. Combine: Current (Yahoo) + History (NRB as template)
    // We prioritize Yahoo data for ALL currencies for the last 90 days to ensure 100% Accuracy.
    const yahooUsdNprMap = tickerHistoryMaps["USDNPR=X"];

    const finalRates = historyRates.map(entry => {
      const yahooUsdNprAtDate = yahooUsdNprMap?.get(entry.date);
      
      const updatedCurrencies = entry.currencies.map(c => {
        let buy = c.buy;
        let sell = c.sell;

        if (c.code === "USD" && yahooUsdNprAtDate) {
          buy = yahooUsdNprAtDate;
          sell = yahooUsdNprAtDate;
        } else if (c.code === "INR") {
          // Indian Rupee is pegged 1.6:1
          buy = 160.00;
          sell = 160.15;
        } else if (yahooUsdNprAtDate) {
          const ticker = `USD${c.code}=X`;
          const historyMap = tickerHistoryMaps[ticker];
          const usdToForeignAtDate = historyMap?.get(entry.date);
          if (usdToForeignAtDate) {
            const crossRate = (yahooUsdNprAtDate / usdToForeignAtDate) * c.unit;
            buy = crossRate;
            sell = crossRate;
          }
        }

        return { ...c, buy: Number(buy.toFixed(2)), sell: Number(sell.toFixed(2)) };
      });

      return { ...entry, currencies: updatedCurrencies };
    });

    // Always ensure today's live data is at the top
    const historyWithoutToday = finalRates.filter(entry => entry.date !== today);
    finalRates.splice(0, finalRates.length, currentEntry, ...historyWithoutToday);

    // Cache for 5 minutes to reduce API load
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.setHeader('CDN-Cache-Control', 'max-age=300');
    return res.status(200).json({
      status: "success",
      source: "Yahoo Finance (Live) + Nepal Rastra Bank (History)",
      last_updated: new Date().toISOString(),
      rates: finalRates,
      cache_duration: '5 minutes'
    });

  } catch (error) {
    // Sentinel: Removed message: error.message to prevent internal info leakage
    console.error("Forex Handler Error:", error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
}
