// api/forex.js
export default async function handler(req, res) {
  const { from, to } = req.query;
  // If no dates provided, default to last 90 days
  const endDate = to || new Date().toISOString().split('T')[0];
  const startDate = from || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const url = `https://www.nrb.org.np/api/forex/v1/rates?from=${startDate}&to=${endDate}&per_page=100&page=1`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    
    // Cache for 1 hour to stay within NRB limits and boost performance
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch from NRB" });
  }
}