export default async function handler(req, res) {
  // 1. Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  // Primary: Nepal Rastra Bank (NRB)
  const nrbUrl = `https://www.nrb.org.np/api/forex/v1/rates?from=${startDate}&to=${endDate}&per_page=100&page=1`;
  
  // Multiple Backups for long-term reliability
  const backupSources = [
    "https://open.er-api.com/v6/latest/USD",
    "https://api.exchangerate-api.com/v4/latest/USD"
  ];

  try {
    const response = await fetch(nrbUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(15000), 
    });

    if (!response.ok) throw new Error(`NRB API Error: ${response.status}`);

    const rawData = await response.json();
    if (!rawData.data || !rawData.data.payload) throw new Error("Invalid NRB Response");

    const formattedData = {
      status: "success",
      source: "Nepal Rastra Bank",
      last_updated: endDate,
      rates: rawData.data.payload.map(day => ({
        date: day.date,
        currencies: day.rates.map(r => ({
          currency: r.currency.name,
          code: r.currency.iso3,
          unit: r.currency.unit,
          buy: parseFloat(r.buy),
          sell: parseFloat(r.sell)
        }))
      })).sort((a, b) => new Date(b.date) - new Date(a.date))
    };

    res.setHeader('Cache-Control', 's-maxage=7200, stale-while-revalidate');
    return res.status(200).json(formattedData);

  } catch (primaryError) {
    console.error('Primary Forex Fetch Error:', primaryError.message);
    
    for (const backupUrl of backupSources) {
      try {
        const backupResponse = await fetch(backupUrl, { signal: AbortSignal.timeout(10000) });
        if (!backupResponse.ok) continue;
        
        const backupData = await backupResponse.json();
        const nprRate = backupData.rates ? backupData.rates.NPR : null;
        if (!nprRate) continue;
        
        const fallbackData = {
          status: "success",
          source: `Backup (${new URL(backupUrl).hostname})`,
          last_updated: endDate,
          rates: [{
            date: endDate,
            currencies: [
              { currency: "US Dollar", code: "USD", unit: 1, buy: nprRate, sell: nprRate }
            ]
          }]
        };
        
        res.setHeader('Cache-Control', 's-maxage=3600');
        return res.status(200).json(fallbackData);
      } catch (e) {
        console.error(`Backup ${backupUrl} failed:`, e.message);
      }
    }

    return res.status(500).json({ 
      status: 'error',
      message: 'All forex sources failed',
      details: primaryError.message 
    });
  }
}
