export default async function handler(req, res) {
  // 1. Set CORS headers immediately to allow your frontend to talk to this proxy
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle the Preflight request (CORS)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 95 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const url = `https://www.nrb.org.np/api/forex/v1/rates?from=${startDate}&to=${endDate}&per_page=100&page=1`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        // NRB often blocks requests without a User-Agent
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      // Give it a slightly longer timeout as gov servers can be slow
      signal: AbortSignal.timeout(10000), 
    });

    if (!response.ok) {
      throw new Error(`NRB API responded with status: ${response.status}`);
    }

    const data = await response.json();

    // Cache the response for 1 hour to prevent hitting NRB too often (avoids IP blocks)
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    
    return res.status(200).json(data);
  } catch (error) {
    console.error('Forex Fetch Error:', error.message);
    return res.status(500).json({ 
      error: 'NRB Fetch Failed', 
      details: error.message 
    });
  }
}