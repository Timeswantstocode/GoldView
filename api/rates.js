// Live exchange rates endpoint using Yahoo Finance
// Supports USD to NPR and all other major currencies

import yahooFinance from 'yahoo-finance2';

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
let cachedRates = null;
let cacheTimestamp = null;

// Map of common currency pairs to Yahoo Finance symbols
const currencyPairs = {
  'USD-NPR': 'USDNPR=X',
  'USD-EUR': 'USDEUR=X',
  'USD-GBP': 'USDGBP=X',
  'USD-INR': 'USDINR=X',
  'USD-AUD': 'USDAUD=X',
  'USD-CAD': 'USDCAD=X',
  'USD-CHF': 'USDCHF=X',
  'USD-CNY': 'USDCNY=X',
  'USD-JPY': 'USDJPY=X',
  'USD-SEK': 'USDSEK=X',
  'USD-NZD': 'USDNZD=X',
  'USD-SGD': 'USDSGD=X',
  'USD-HKD': 'USDHKD=X',
  'USD-BRL': 'USDBRL=X',
  'USD-MXN': 'USDMXN=X',
};

async function fetchRateFromYahoo(symbol) {
  try {
    const result = await yahooFinance.quote(symbol, {
      fields: ['regularMarketPrice', 'currency', 'shortName']
    });
    
    return {
      symbol,
      price: result.regularMarketPrice,
      currency: result.currency,
      name: result.shortName,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error fetching ${symbol} from Yahoo Finance:`, error);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { base = 'USD', target } = req.query;

    // Validate currency codes
    if (!/^[A-Z]{3}$/.test(base)) {
      return res.status(400).json({ error: 'Invalid base currency code' });
    }

    if (target && !/^[A-Z]{3}$/.test(target)) {
      return res.status(400).json({ error: 'Invalid target currency code' });
    }

    // Check cache
    const now = Date.now();
    if (cachedRates && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log('Returning cached rates');
      
      if (target) {
        const pair = `${base}-${target}`;
        const rate = cachedRates[pair];
        if (rate) {
          return res.status(200).json({
            base,
            target,
            rate: rate.price,
            timestamp: rate.timestamp,
            source: 'cached'
          });
        }
      }

      return res.status(200).json({
        base,
        rates: cachedRates,
        timestamp: new Date().toISOString(),
        source: 'cached'
      });
    }

    // Fetch fresh rates
    const rates = {};
    
    if (target) {
      // Fetch specific pair
      const pair = `${base}-${target}`;
      const symbol = currencyPairs[pair] || `${base}${target}=X`;
      const rateData = await fetchRateFromYahoo(symbol);
      
      if (!rateData) {
        return res.status(404).json({ error: `Could not fetch rate for ${pair}` });
      }

      // Update cache
      cachedRates = { [pair]: rateData };
      cacheTimestamp = now;

      return res.status(200).json({
        base,
        target,
        rate: rateData.price,
        timestamp: rateData.timestamp,
        source: 'live'
      });
    } else {
      // Fetch all common pairs with USD as base
      for (const [pair, symbol] of Object.entries(currencyPairs)) {
        if (pair.startsWith(`${base}-`)) {
          const rateData = await fetchRateFromYahoo(symbol);
          if (rateData) {
            rates[pair] = rateData.price;
          }
        }
      }

      // Update cache
      cachedRates = rates;
      cacheTimestamp = now;

      return res.status(200).json({
        base,
        rates,
        timestamp: new Date().toISOString(),
        source: 'live'
      });
    }

  } catch (error) {
    console.error('Rates API error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch exchange rates',
      details: error.message 
    });
  }
}
