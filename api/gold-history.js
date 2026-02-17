
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // GC=F is Gold Futures on Yahoo Finance, which is a good proxy for global gold price
    // Alternatively, we can use a specific ticker if the user has one in mind, 
    // but GC=F is the standard for gold price history.
    const ticker = "GC=F"; 
    const yRes = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=90d`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    if (!yRes.ok) throw new Error(`Yahoo Finance API returned ${yRes.status}`);
    
    const yData = await yRes.json();
    const result = yData?.chart?.result?.[0];
    
    if (!result) throw new Error("No data found in Yahoo Finance response");

    const timestamps = result.timestamp;
    const prices = result.indicators.quote[0].close;
    
    const history = timestamps.map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      price: prices[i] ? Number(prices[i].toFixed(2)) : null
    })).filter(item => item.price !== null);

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.status(200).json({
      status: "success",
      ticker: ticker,
      source: "Yahoo Finance",
      history: history
    });

  } catch (error) {
    console.error("Gold History Error:", error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
}
