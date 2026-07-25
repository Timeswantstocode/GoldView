import yahooFinance from 'yahoo-finance2';

// Currencies displayed on the dashboard
const CURRENCY_LIST = ['USD', 'INR', 'GBP', 'AUD', 'JPY', 'KRW', 'AED', 'EUR'];

// Currencies with official pegged rates to NPR (used when NRB is unavailable)
const PEGGED_RATES = { INR: 1.6 };

const NRB_BASE = 'https://www.nrb.org.np/api/forex/v1';

async function fetchNrbLiveRates() {
  const res = await fetch(`${NRB_BASE}/app-rate`);
  if (!res.ok) throw new Error('NRB app-rate unavailable');
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) throw new Error('NRB app-rate empty');
  const { date, published_on, modified_on } = data[0];
  const currencies = data.map(r => ({
    currency: r.name,
    code: r.iso3,
    unit: r.unit || 1,
    buy: parseFloat(r.buy),
    sell: parseFloat(r.sell),
  }));
  return { date, published_on, modified_on, currencies };
}

async function fetchNrbDateRangeRates(from, to) {
  const res = await fetch(`${NRB_BASE}/rates?from=${from}&to=${to}&per_page=100&page=1`);
  if (!res.ok) throw new Error('NRB rates unavailable');
  const data = await res.json();
  if (!data?.data?.payload) throw new Error('NRB rates empty');
  return data.data.payload.map(day => ({
    date: day.date,
    currencies: day.rates.map(r => ({
      currency: r.currency.name,
      code: r.currency.iso3,
      unit: r.currency.unit || 1,
      buy: parseFloat(r.buy),
      sell: parseFloat(r.sell),
    })),
  }));
}

async function fetchYahooForex() {
  const today = new Date().toISOString().split('T')[0];

  const quote = async (symbol) => {
    try {
      const result = await yahooFinance.quote(symbol, { fields: ['regularMarketPrice'] });
      return result.regularMarketPrice;
    } catch {
      return null;
    }
  };

  const usdNpr = await quote('USDNPR=X');
  if (!usdNpr) throw new Error('Yahoo USDNPR unavailable');

  // Build rates for all currencies via cross-rate: NPR/X = USDNPR / USDX
  const todayData = { date: today, currencies: [] };

  for (const code of CURRENCY_LIST) {
    if (code === 'USD') {
      todayData.currencies.push({
        currency: 'U.S. Dollar', code: 'USD', unit: 1,
        buy: usdNpr, sell: usdNpr,
      });
      continue;
    }
    if (PEGGED_RATES[code]) {
      const pegged = PEGGED_RATES[code];
      todayData.currencies.push({
        currency: code, code, unit: 1,
        buy: pegged, sell: pegged,
      });
      continue;
    }
    const usdRate = await quote(`USD${code}=X`);
    if (usdRate && usdRate > 0) {
      const nprRate = usdNpr / usdRate;
      todayData.currencies.push({
        currency: code, code, unit: 1,
        buy: nprRate, sell: nprRate,
      });
    }
  }

  return [todayData];
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    let finalRates;
    let source;

    // 1) Try NRB /app-rate (simpler live endpoint from nrb-forex-node)
    try {
      const data = await fetchNrbLiveRates();
      finalRates = [{
        date: data.date,
        currencies: data.currencies,
      }];
      source = 'Nepal Rastra Bank (Live)';
    } catch (err1) {
      console.warn('NRB app-rate failed, trying date-range:', err1.message);
      // 2) Fall back to NRB date-range endpoint
      try {
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        finalRates = await fetchNrbDateRangeRates(startDate, endDate);
        source = 'Nepal Rastra Bank (Official Government Data)';
      } catch (err2) {
        console.warn('NRB date-range failed, using Yahoo fallback:', err2.message);
        // 3) Yahoo Finance cross-rate fallback
        finalRates = await fetchYahooForex();
        source = 'Yahoo Finance (Cross-Rate)';
      }
    }

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
    res.setHeader('CDN-Cache-Control', 'max-age=3600');
    return res.status(200).json({
      status: 'success',
      source,
      last_updated: new Date().toISOString(),
      rates: finalRates,
      cache_duration: '1 hour',
    });
  } catch (error) {
    console.error('Forex Handler Error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
}
