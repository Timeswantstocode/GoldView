export default async function handler(req, res) {
  // We fetch a 90-day range by default to support 7D, 1M, and 3M charts
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 95 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const NRB_API_URL = `https://www.nrb.org.np/api/forex/v1/rates?from=${startDate}&to=${endDate}&per_page=100&page=1`;

  try {
    const response = await fetch(NRB_API_URL);
    
    if (!response.ok) {
      throw new Error(`NRB API error: ${response.status}`);
    }

    const data = await response.json();

    // Cache results on Vercel Edge for 1 hour to prevent hitting NRB rate limits
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    return res.status(200).json(data);
  } catch (error) {
    console.error('Forex API Proxy Error:', error);
    return res.status(500).json({ error: 'Failed to fetch forex data from NRB' });
  }
}