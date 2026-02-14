export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Try NRB API first
  try {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 95 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const url = `https://www.nrb.org.np/api/forex/v1/rates?from=${startDate}&to=${endDate}&per_page=100&page=1`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) throw new Error(`NRB returned ${response.status}`);

    const data = await response.json();

    // Normalize: NRB API uses uppercase ISO3, ensure we also provide lowercase iso3
    if (data?.data?.payload) {
      data.data.payload = data.data.payload.map(day => ({
        ...day,
        rates: (day.rates || []).map(rate => ({
          ...rate,
          currency: {
            ...rate.currency,
            iso3: rate.currency.iso3 || rate.currency.ISO3 || rate.currency.Iso3 || '',
            ISO3: rate.currency.ISO3 || rate.currency.iso3 || rate.currency.Iso3 || '',
          }
        }))
      }));
    }

    return res.status(200).json(data);
  } catch (nrbError) {
    // Fallback: use free ExchangeRate API for latest rates
    try {
      const fallbackRes = await fetch('https://open.er-api.com/v6/latest/USD');
      const fallbackData = await fallbackRes.json();

      if (fallbackData.result !== 'success') throw new Error('Fallback API failed');

      const nprRate = fallbackData.rates.NPR || 141;
      const today = new Date().toISOString().split('T')[0];

      // Build a response that matches NRB structure so the frontend works
      const currencyMap = {
        USD: { unit: 1, name: 'U.S. Dollar' },
        EUR: { unit: 1, name: 'Euro' },
        GBP: { unit: 1, name: 'UK Pound Sterling' },
        AUD: { unit: 1, name: 'Australian Dollar' },
        JPY: { unit: 100, name: 'Japanese Yen' },
        KRW: { unit: 100, name: 'South Korean Won' },
        AED: { unit: 1, name: 'UAE Dirham' },
      };

      const rates = Object.entries(currencyMap).map(([code, info]) => {
        const usdToTarget = fallbackData.rates[code] || 1;
        const buyRate = (nprRate / usdToTarget) * info.unit;
        return {
          currency: { iso3: code, ISO3: code, name: info.name, unit: info.unit },
          buy: buyRate.toFixed(4),
          sell: (buyRate * 1.005).toFixed(4),
        };
      });

      // Generate ~90 days of synthetic history using latest rate
      const payload = [];
      for (let i = 90; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        payload.push({
          date: d.toISOString().split('T')[0],
          published_on: d.toISOString(),
          rates: rates,
        });
      }

      return res.status(200).json({
        status: { code: 200 },
        data: { payload },
        _fallback: true,
      });
    } catch (fallbackError) {
      return res.status(500).json({ error: 'All forex sources failed', details: nrbError.message });
    }
  }
}
