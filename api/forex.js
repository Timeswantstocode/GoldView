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
      const yRes = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${tickers.join(',')}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const yData = await yRes.json();
      yData?.quoteResponse?.result?.forEach(q => {
        liveMarket[q.symbol] = q.regularMarketPrice;
      });
    } catch (e) { console.error("Yahoo Live Fetch Failed"); }

    const liveUsdNpr = liveMarket["USDNPR=X"] || 144.95;

    // 2. Fetch Official History from Nepal Rastra Bank (NRB)
    const nrbUrl = `https://www.nrb.org.np/api/forex/v1/rates?from=${startDate}&to=${endDate}&per_page=100&page=1`;
    const nrbRes = await fetch(nrbUrl);
    const nrbData = await nrbRes.json();
    
    if (!nrbData?.data?.payload) throw new Error("NRB API unavailable");

    // 3. Process NRB Data and inject LIVE prices for every currency in the first entry
    const finalRates = nrbData.data.payload.map((day, index) => {
      const isLatestEntry = index === 0;

      return {
        date: day.date,
        currencies: day.rates.map(r => {
          const code = r.currency.iso3;
          let buy = parseFloat(r.buy);
          let sell = parseFloat(r.sell);

          // ONLY update the very first entry with LIVE market data
          if (isLatestEntry && liveUsdNpr) {
            if (code === "USD") {
              buy = liveUsdNpr;
              sell = liveUsdNpr;
            } else if (code === "INR") {
              buy = 160.00; // Keep Nepal-India peg official
              sell = 160.00;
            } else {
              // Calculate LIVE Cross Rate for every other currency
              // Formula: (USD/NPR) / (USD/ForeignCode) * Unit
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
        })
      };
    });

    // 4. Final Output
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');
    return res.status(200).json({
      status: "success",
      source: "Nepal Rastra Bank + Yahoo Live Market",
      last_updated: new Date().toISOString(),
      rates: finalRates
    });

  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
}