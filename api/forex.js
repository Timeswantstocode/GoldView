// api/forex.js
export default async function handler(req, res) {
  // Get date parameters from the frontend request
  const { from, to } = req.query;

  // NRB API requires dates in YYYY-MM-DD format
  // Example: https://www.nrb.org.np/api/forex/v1/rates?from=2024-01-01&to=2024-01-07&per_page=100&page=1
  const NRB_URL = `https://www.nrb.org.np/api/forex/v1/rates?from=${from}&to=${to}&per_page=100&page=1`;

  try {
    const response = await fetch(NRB_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'GoldView-App-Vercel', // Some APIs require a User-Agent
      },
    });

    if (!response.ok) {
      throw new Error(`NRB API responded with status: ${response.status}`);
    }

    const data = await response.json();

    // Set Cache-Control headers so Vercel edges cache the data for 1 hour 
    // This makes your app much faster and reduces load on NRB servers
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow your frontend to access it
    
    return res.status(200).json(data);
  } catch (error) {
    console.error('Forex Fetch Error:', error);
    return res.status(500).json({ error: 'Failed to fetch forex data' });
  }
}