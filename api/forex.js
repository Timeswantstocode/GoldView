export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 95 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  try {
    // 1. Fetch LIVE quotes for ALL global currency pairs from Yahoo
    // We fetch USD vs everything else to calculate the most accurate NPR cross-rates
    const tickers = [
      "USDNPR=X", "USDEUR=X", "USDGBP=X", "USDAED=X", "USDQAR=X", "USDSAR=X", 
      "USDMYR=X", "USDKRW=X", "USDAUD=X", "USDCAD=X", "USDSGD=X", "USDJPY=X", "USDINR=X"
    ];
    
    let liveMarket = {};
    try {
      // Use a more reliable Yahoo Finance endpoint or multiple sources if needed
      // Added a timestamp to prevent caching issues
      const yRes = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${tickers.join(',')}&t=${Date.now()}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
      });
      const yData = await yRes.json();
      yData?.quoteResponse?.result?.forEach(q => {
        liveMarket[q.symbol] = q.regularMarketPrice;
      });
    } catch (e) { 
      console.error("Yahoo Live Fetch Failed", e); 
    }

    const liveUsdNpr = liveMarket["USDNPR=X"];

    // 2. Fetch Official History from Nepal Rastra Bank (NRB)
    const nrbUrl = `https://www.nrb.org.np/api/forex/v1/rates?from=${startDate}&to=${endDate}&per_page=100&page=1`;
    const nrbRes = await fetch(nrbUrl);
    const nrbData = await nrbRes.json();
    
    if (!nrbData?.data?.payload) throw new Error("NRB API unavailable");

    // 3. Process NRB Data and inject LIVE prices for every currency in the first entry
    const payload = nrbData.data.payload;
    const finalRates = payload.map((day, index) => {
      const isLatestEntry = index === 0;
      
      const dayRates = day.rates.map(r => {
        const code = r.currency.iso3;
        let buy = parseFloat(r.buy);
        let sell = parseFloat(r.sell);

        // ONLY update the very first entry with LIVE market data if available
        if (isLatestEntry) {
          if (code === "USD" && liveUsdNpr) {
            buy = liveUsdNpr;
            sell = liveUsdNpr;
          } else if (code === "INR") {
            buy = 160.00; // Keep Nepal-India peg official
            sell = 160.00;
          } else if (liveUsdNpr) {
            // Calculate LIVE Cross Rate for every other currency
            const tickerName = `USD${code}=X`;
            const usdToForeign = liveMarket[tickerName];
            
            if (usdToForeign) {
              const liveCrossRate = (liveUsdNpr / usdToForeign) * r.currency.unit;
              buy = liveCrossRate;
              sell = liveCrossRate;
            }
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
        date: day.date,
        currencies: dayRates
      };
    });

    // 4. Final Output with optimized caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return res.status(200).json({
      status: "success",
      source: "Nepal Rastra Bank + Yahoo Live Market",
      last_updated: new Date().toISOString(),
      rates: finalRates
    });

  } catch (error) {
    console.error("Forex Handler Error:", error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
}
