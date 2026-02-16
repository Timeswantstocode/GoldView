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
  
  // Primary: ExchangeRate-API (More reliable for real-time)
  // Backup: NRB (Official but sometimes delayed)
  const primaryUrl = "https://open.er-api.com/v6/latest/USD";
  const nrbUrl = `https://www.nrb.org.np/api/forex/v1/rates?from=${startDate}&to=${endDate}&per_page=100&page=1`;

  try {
    // Try Primary Source first
    const response = await fetch(primaryUrl, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`Primary API Error: ${response.status}`);
    
    const data = await response.json();
    const nprRate = data.rates ? data.rates.NPR : null;
    if (!nprRate) throw new Error("Invalid Primary Response");

    const formattedData = {
      status: "success",
      source: "ExchangeRate-API",
      last_updated: data.time_last_update_utc || endDate,
      rates: [{
        date: new Date().toISOString().split('T')[0],
        currencies: [
          { currency: "US Dollar", code: "USD", unit: 1, buy: nprRate, sell: nprRate }
        ]
      }]
    };

    // Try to merge with NRB data for history if possible, but don't fail if NRB is down/stale
    try {
      const nrbRes = await fetch(nrbUrl, { signal: AbortSignal.timeout(5000) });
      if (nrbRes.ok) {
        const nrbData = await nrbRes.json();
        if (nrbData.data && nrbData.data.payload) {
          const nrbRates = nrbData.data.payload.map(day => ({
            date: day.date,
            currencies: day.rates.map(r => ({
              currency: r.currency.name,
              code: r.currency.iso3,
              unit: r.currency.unit,
              buy: parseFloat(r.buy),
              sell: parseFloat(r.sell)
            }))
          }));
          
          // Add current rate to the top if it's newer than NRB's latest
          const latestNrbDate = nrbRates.length > 0 ? nrbRates[0].date : "";
          if (formattedData.rates[0].date > latestNrbDate) {
            formattedData.rates = [...formattedData.rates, ...nrbRates];
          } else {
            formattedData.rates = nrbRates;
          }
          formattedData.source = "ExchangeRate-API + NRB";
        }
      }
    } catch (e) {
      console.warn("NRB fetch failed, using primary only:", e.message);
    }

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.status(200).json(formattedData);

  } catch (primaryError) {
    console.error('Primary Forex Fetch Error:', primaryError.message);
    
    // Fallback to other sources if primary fails
    const backupSources = [
      "https://api.exchangerate-api.com/v4/latest/USD"
    ];

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
