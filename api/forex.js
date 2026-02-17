export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 95 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  try {
    // 1. Fetch LIVE quotes from Yahoo Finance
    const tickers = [
      "USDNPR=X", "USDEUR=X", "USDGBP=X", "USDAED=X", "USDQAR=X", "USDSAR=X", 
      "USDMYR=X", "USDKRW=X", "USDAUD=X", "USDCAD=X", "USDSGD=X", "USDJPY=X", "USDINR=X"
    ];
    
    let liveMarket = {};
    await Promise.all(tickers.map(async (ticker) => {
      try {
        const yRes = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1m&range=1d`, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const yData = await yRes.json();
        const price = yData?.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (price) liveMarket[ticker] = price;
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
    // If the latest NRB entry is from today, we replace it with our live entry
    let finalRates;
    if (historyRates.length > 0 && historyRates[0].date === today) {
      finalRates = [currentEntry, ...historyRates.slice(1)];
    } else {
      finalRates = [currentEntry, ...historyRates];
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
