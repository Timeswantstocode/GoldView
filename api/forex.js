// api/forex.js
export default async function handler(req, res) {
  const to = new Date().toISOString().split('T')[0];
  const from = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const url = `https://www.nrb.org.np/api/forex/v1/rates?from=${from}&to=${to}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    
    // Add CORS headers so your frontend can read the data
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch NRB data' });
  }
}