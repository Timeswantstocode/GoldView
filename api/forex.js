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

  // 2. Date range for the last 30 days (reduced from 95 to be more efficient)
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const url = `https://www.nrb.org.np/api/forex/v1/rates?from=${startDate}&to=${endDate}&per_page=100&page=1`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(15000), 
    });

    if (!response.ok) {
      throw new Error(`NRB API responded with status: ${response.status}`);
    }

    const rawData = await response.json();
    
    // 3. Transform data for easier frontend consumption
    // We extract the latest rates and format them cleanly
    const formattedData = {
      status: "success",
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

    // Cache for 1 hour
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    
    return res.status(200).json(formattedData);
  } catch (error) {
    console.error('Forex Fetch Error:', error.message);
    
    // Fallback or detailed error
    return res.status(500).json({ 
      status: 'error',
      message: 'Failed to fetch rates from Nepal Rastra Bank',
      details: error.message 
    });
  }
}
