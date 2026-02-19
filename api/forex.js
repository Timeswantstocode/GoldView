/*
 * Copyright (c) 2024-2026 Timeswantstocode. All Rights Reserved.
 * This software is proprietary and may not be copied, modified, or distributed.
 * See LICENSE file for details.
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 95 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  try {
    // Fetch Official Forex Data from Nepal Rastra Bank (NRB) - Government Source
    // This provides accurate, official exchange rates for all currencies
    const nrbUrl = `https://www.nrb.org.np/api/forex/v1/rates?from=${startDate}&to=${endDate}&per_page=100&page=1`;
    const nrbRes = await fetch(nrbUrl);
    const nrbData = await nrbRes.json();
    
    if (!nrbData?.data?.payload) throw new Error("NRB API unavailable");

    // Process NRB Data - Use official government rates directly
    const payload = nrbData.data.payload;
    const finalRates = payload.map((day) => {
      return {
        date: day.date,
        currencies: day.rates.map(r => ({
          currency: r.currency.name,
          code: r.currency.iso3,
          unit: r.currency.unit,
          buy: parseFloat(r.buy),
          sell: parseFloat(r.sell)
        }))
      };
    });

    // Cache for 1 day since NRB updates daily
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=172800');
    res.setHeader('CDN-Cache-Control', 'max-age=86400');
    return res.status(200).json({
      status: "success",
      source: "Nepal Rastra Bank (Official Government Data)",
      last_updated: new Date().toISOString(),
      rates: finalRates,
      cache_duration: '24 hours'
    });

  } catch (error) {
    // Sentinel: Removed message: error.message to prevent internal info leakage
    console.error("Forex Handler Error:", error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
}
