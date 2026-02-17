export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 95 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  try {
    // 1. Fetch LIVE and HISTORICAL quotes from Yahoo Finance
    const tickers = [
      "USDNPR=X", "USDEUR=X", "USDGBP=X", "USDAED=X", "USDQAR=X", "USDSAR=X", 
      "USDMYR=X", "USDKRW=X", "USDAUD=X", "USDCAD=X", "USDSGD=X", "USDJPY=X", "USDINR=X"
    ];
    
    let liveMarket = {};
    let historicalMarket = {};

    await Promise.all(tickers.map(async (ticker) => {
      try {
        // Fetch 1d live price
        const liveRes = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1m&range=1d`, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const liveData = await liveRes.json();
        const price = liveData?.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (price) liveMarket[ticker] = price;

        // Fetch 3-month historical data for the chart
        const histRes = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=95d`, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const histData = await histRes.json();
        const result = histData?.chart?.result?.[0];
        if (result && result.timestamp && result.indicators.quote[0].close) {
          historicalMarket[ticker] = result.timestamp.map((ts, i) => ({
            date: new Date(ts * 1000).toISOString().split('T')[0],
            price: result.indicators.quote[0].close[i]
          })).filter(item => item.price !== null);
        }
      } catch (e) {
        console.error(`Yahoo Fetch Failed for ${ticker}:`, e);
      }
    }));

    // 2. Fetch Official History from Nepal Rastra Bank (NRB) for currency metadata
    const nrbUrl = `https://www.nrb.org.np/api/forex/v1/rates?from=${startDate}&to=${endDate}&per_page=100&page=1`;
    const nrbRes = await fetch(nrbUrl);
    const nrbData = await nrbRes.json();
    
    if (!nrbData?.data?.payload) throw new Error("NRB API unavailable");

    const payload = nrbData.data.payload;
    const latestNrbTemplate = payload[0].rates;

    // 3. Process Historical Data using Yahoo Finance for USD/NPR
    // We'll use the dates from Yahoo's USDNPR=X history
    const usdnprHistory = historicalMarket["USDNPR=X"] || [];
    
    const finalRates = usdnprHistory.map(histItem => {
      const date = histItem.date;
      const liveUsdNpr = histItem.price;

      const dayRates = latestNrbTemplate.map(r => {
        const code = r.currency.iso3;
        let buy = liveUsdNpr; // Default to USDNPR if it's USD
        let sell = liveUsdNpr;

        if (code === "USD") {
          // Already set
        } else if (code === "INR") {
          buy = 160.00; // Fixed peg
          sell = 160.00;
        } else {
          const tickerName = `USD${code}=X`;
          const tickerHistory = historicalMarket[tickerName] || [];
          const histPrice = tickerHistory.find(h => h.date === date)?.price;
          
          if (histPrice) {
            const rate = (liveUsdNpr / histPrice) * r.currency.unit;
            buy = rate;
            sell = rate;
          } else {
            // Fallback to NRB data if Yahoo history for this specific cross is missing
            const nrbDay = payload.find(p => p.date === date);
            const nrbRate = nrbDay?.rates.find(nr => nr.currency.iso3 === code);
            buy = nrbRate ? parseFloat(nrbRate.buy) : 0;
            sell = nrbRate ? parseFloat(nrbRate.sell) : 0;
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

      return {
        date: date,
        currencies: dayRates
      };
    }).reverse(); // Most recent first

    // 4. Ensure the very latest live price is included as the first entry
    const today = new Date().toISOString().split('T')[0];
    const liveUsdNpr = liveMarket["USDNPR=X"];
    
    if (liveUsdNpr && (finalRates.length === 0 || finalRates[0].date !== today)) {
      const currentDayRates = latestNrbTemplate.map(r => {
        const code = r.currency.iso3;
        let buy = liveUsdNpr;
        let sell = liveUsdNpr;

        if (code === "USD") {
          // Already set
        } else if (code === "INR") {
          buy = 160.00;
          sell = 160.00;
        } else {
          const tickerName = `USD${code}=X`;
          const liveCross = liveMarket[tickerName];
          if (liveCross) {
            const rate = (liveUsdNpr / liveCross) * r.currency.unit;
            buy = rate;
            sell = rate;
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

      const currentEntry = {
        date: today,
        currencies: currentDayRates
      };

      // If the first entry in finalRates is also today (from Yahoo history), replace it
      if (finalRates.length > 0 && finalRates[0].date === today) {
        finalRates[0] = currentEntry;
      } else {
        finalRates.unshift(currentEntry);
      }
    }

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return res.status(200).json({
      status: "success",
      source: "Yahoo Finance (Live & History) + Nepal Rastra Bank (Metadata)",
      last_updated: new Date().toISOString(),
      rates: finalRates
    });

  } catch (error) {
    console.error("Forex Handler Error:", error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
}
