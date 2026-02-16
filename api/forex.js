export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  try {
    // 1. Fetch NRB Data (For History and the list of Currencies used in Nepal)
    const nrbUrl = `https://www.nrb.org.np/api/forex/v1/rates?from=${startDate}&to=${endDate}&per_page=100&page=1`;
    const nrbRes = await fetch(nrbUrl);
    const nrbData = await nrbRes.json();
    if (!nrbData.data || !nrbData.data.payload) throw new Error("NRB Data unavailable");

    // 2. Fetch Live Market Rates from Yahoo Finance
    // We fetch USDNPR and other USD pairs to calculate the most accurate "Google-style" rates
    const tickers = [
      "USDNPR=X", "USDAED=X", "USDAUD=X", "USDCAD=X", "USDCHF=X", "USDCNY=X", "USDDKK=X", 
      "USDEUR=X", "USDGBP=X", "USDHKD=X", "USDINR=X", "USDJPY=X", "USDKWD=X", "USDMYR=X", 
      "USDQAR=X", "USDSAR=X", "USDSEK=X", "USDSGD=X", "USDTHB=X", "USDKRW=X", "USDBHD=X", "USDOMR=X"
    ];
    const yahooUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${tickers.join(',')}`;
    
    let marketMap = {};
    try {
      const yRes = await fetch(yahooUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const yData = await yRes.json();
      yData.quoteResponse.result.forEach(quote => {
        marketMap[quote.symbol] = quote.regularMarketPrice;
      });
    } catch (e) {
      console.warn("Yahoo Finance live fetch failed, using NRB defaults.");
    }

    const liveUsdNpr = marketMap["USDNPR=X"]; // This will be the 144.85+ value

    // 3. Merge Live Yahoo data into the NRB structure
    const formattedRates = nrbData.data.payload.map((day, index) => {
      const isToday = index === 0;

      return {
        date: day.date,
        currencies: day.rates.map(r => {
          const code = r.currency.iso3;
          let buy = parseFloat(r.buy);
          let sell = parseFloat(r.sell);

          // Update today's rates with Yahoo Live Data
          if (isToday && liveUsdNpr) {
            if (code === "USD") {
              buy = liveUsdNpr;
              sell = liveUsdNpr;
            } else if (marketMap[`USD${code}=X`]) {
              // Market Cross Rate Formula: (NPR per USD) / (Foreign per USD) * Unit
              const crossRate = (liveUsdNpr / marketMap[`USD${code}=X`]) * r.currency.unit;
              buy = Number(crossRate.toFixed(2));
              sell = Number(crossRate.toFixed(2));
            }
          }

          return {
            currency: r.currency.name,
            code: code,
            unit: r.currency.unit,
            buy: buy,
            sell: sell
          };
        })
      };
    });

    const responseData = {
      status: "success",
      source: liveUsdNpr ? "Yahoo Finance (Live) + NRB History" : "Nepal Rastra Bank",
      last_updated: new Date().toISOString(),
      rates: formattedRates
    };

    // Cache for 15 minutes to keep it "Live" like Google
    res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=300');
    return res.status(200).json(responseData);

  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
}