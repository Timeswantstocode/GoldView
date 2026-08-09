// Currencies displayed on the dashboard
const CURRENCY_LIST = ['USD', 'INR', 'GBP', 'AUD', 'JPY', 'KRW', 'AED', 'EUR'];

const NRB_BASE = 'https://www.nrb.org.np/api/forex/v1';
const YAHOO_CHART = 'https://query1.finance.yahoo.com/v8/finance/chart';
const YAHOO_QUOTE = 'https://query1.finance.yahoo.com/v7/finance/quote';

async function fetchNrbLiveRates() {
  const res = await fetch(`${NRB_BASE}/app-rate`);
  if (!res.ok) throw new Error('NRB app-rate unavailable');
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) throw new Error('NRB app-rate empty');
  const { date } = data[0];
  const currencies = data.map(r => ({
    currency: r.name,
    code: r.iso3,
    unit: r.unit || 1,
    buy: parseFloat(r.buy),
    sell: parseFloat(r.sell),
  }));
  return { date, currencies };
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

async function yahooHistory(symbol, days) {
  const range = `${days}d`;
  const res = await fetch(
    `${YAHOO_CHART}/${encodeURIComponent(symbol)}?interval=1d&range=${range}`,
    { headers: { 'User-Agent': 'Mozilla/5.0' } },
  );
  if (!res.ok) throw new Error(`Yahoo history unavailable for ${symbol}`);
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`Yahoo history empty for ${symbol}`);
  const timestamps = result.timestamp || [];
  const closes = result?.indicators?.quote?.[0]?.close || [];
  const entries = [];
  for (let i = 0; i < timestamps.length; i++) {
    if (closes[i] != null) {
      const d = new Date(timestamps[i] * 1000);
      entries.push({ date: d.toISOString().split('T')[0], close: closes[i] });
    }
  }
  return entries;
}

async function yahooBatchQuotes(symbols) {
  if (symbols.length === 0) return {};
  const res = await fetch(
    `${YAHOO_QUOTE}?symbols=${symbols.map(s => encodeURIComponent(s)).join(',')}`,
    { headers: { 'User-Agent': 'Mozilla/5.0' } },
  );
  if (!res.ok) return {};
  const json = await res.json();
  const results = json?.quoteResponse?.result || [];
  const map = {};
  for (const r of results) {
    if (r.regularMarketPrice != null) {
      map[r.symbol.replace('=X', '')] = r.regularMarketPrice;
    }
  }
  return map;
}

async function fetchYahooForex() {
  // Fetch USDNPR history (1 request) + all cross-rate quotes (1 request = 2 total)
  const crossSymbols = CURRENCY_LIST.filter(c => c !== 'USD' && c !== 'INR');
  const [usdNprHistory, quoteMap] = await Promise.all([
    yahooHistory('USDNPR=X', 95),
    yahooBatchQuotes(crossSymbols.map(c => `USD${c}=X`)),
  ]);

  if (usdNprHistory.length === 0) throw new Error('Yahoo USDNPR history unavailable');
  const usdNprLatest = usdNprHistory[usdNprHistory.length - 1].close;
  if (!usdNprLatest) throw new Error('Yahoo USDNPR latest price unavailable');

  return usdNprHistory.map(({ date, close }) => {
    const usdBuy = close;
    const currencies = [{ currency: 'U.S. Dollar', code: 'USD', unit: 1, buy: usdBuy, sell: usdBuy }];
    currencies.push({ currency: 'INR', code: 'INR', unit: 1, buy: 1.6, sell: 1.6 });
    for (const code of crossSymbols) {
      const usdRate = quoteMap[`USD${code}`];
      if (usdRate && usdRate > 0) {
        currencies.push({ currency: code, code, unit: 1, buy: usdBuy / usdRate, sell: usdBuy / usdRate });
      }
    }
    return { date, currencies };
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    let finalRates;
    let source;

    try {
      // Primary: NRB official history (~95 days) so the currency chart has a full line
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 95 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      finalRates = await fetchNrbDateRangeRates(startDate, endDate);
      source = 'Nepal Rastra Bank (Official Government Data)';

      // Merge today's live app-rate if it is newer than the history's last day
      try {
        const live = await fetchNrbLiveRates();
        if (live.date > finalRates[finalRates.length - 1].date) {
          finalRates.push(live);
        }
      } catch (err3) {
        console.warn('NRB live merge failed, history only:', err3.message);
      }
    } catch (err1) {
      console.warn('NRB date-range failed, trying live app-rate:', err1.message);
      try {
        const data = await fetchNrbLiveRates();
        finalRates = [{ date: data.date, currencies: data.currencies }];
        source = 'Nepal Rastra Bank (Live)';
      } catch (err2) {
        console.warn('NRB app-rate failed, using Yahoo fallback:', err2.message);
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
