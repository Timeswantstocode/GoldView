// Historical exchange rates endpoint
// Stores and retrieves daily closing prices for USD to NPR and other currencies

import { put, list } from '@vercel/blob';
import yahooFinance from 'yahoo-finance2';

const HISTORY_BLOB_PATH = 'rates-history/usd-npr-history.json';

// Currencies to track in history
const trackedPairs = [
  { symbol: 'USDNPR=X', pair: 'USD-NPR' },
  { symbol: 'USDEUR=X', pair: 'USD-EUR' },
  { symbol: 'USDGBP=X', pair: 'USD-GBP' },
  { symbol: 'USDINR=X', pair: 'USD-INR' },
  { symbol: 'USDAUD=X', pair: 'USD-AUD' }
];

async function fetchClosingPrice(symbol) {
  try {
    const result = await yahooFinance.quote(symbol, {
      fields: ['regularMarketPrice']
    });
    return result.regularMarketPrice;
  } catch (error) {
    console.error(`Error fetching ${symbol}:`, error);
    return null;
  }
}

async function getHistoryFromBlob() {
  try {
    const { blobs } = await list({ prefix: 'rates-history/' });
    const historyBlob = blobs.find(b => b.pathname === HISTORY_BLOB_PATH);
    
    if (historyBlob) {
      const response = await fetch(historyBlob.url);
      if (response.ok) {
        return await response.json();
      }
    }
    return { history: [] };
  } catch (error) {
    console.error('Error fetching history from Blob:', error);
    return { history: [] };
  }
}

export default async function handler(req, res) {
  // 1. Handle GET requests (Retrieve history)
  if (req.method === 'GET') {
    try {
      const { days = 30, pair = 'USD-NPR' } = req.query;
      const data = await getHistoryFromBlob();
      
      // Filter by pair and limit by days
      const filteredHistory = data.history
        .filter(entry => entry.pair === pair)
        .slice(-parseInt(days));
      
      return res.status(200).json({
        pair,
        days: filteredHistory.length,
        history: filteredHistory
      });
    } catch (error) {
      console.error('History retrieval error:', error);
      return res.status(500).json({ error: 'Failed to retrieve history' });
    }
  } 

  // 2. Handle POST or Cron requests (Update history)
  // Vercel Crons send a GET request with a specific header, but we'll support POST too
  const isCron = req.headers['x-vercel-cron'] === '1';
  
  if (req.method === 'POST' || isCron) {
    try {
      // For manual POST, we can specify a single pair. For Cron, we update all tracked pairs.
      const pairsToUpdate = isCron ? trackedPairs : (req.body.symbol ? [{ symbol: req.body.symbol, pair: req.body.pair }] : trackedPairs);

      const data = await getHistoryFromBlob();
      const today = new Date().toISOString().split('T')[0];
      const timestamp = Date.now();

      for (const { symbol, pair } of pairsToUpdate) {
        const closingPrice = await fetchClosingPrice(symbol);
        
        if (closingPrice !== null) {
          const newEntry = {
            date: today,
            closing_price: closingPrice,
            pair: pair,
            timestamp: timestamp
          };

          // Check if entry for this date and pair already exists
          const existingIndex = data.history.findIndex(entry => entry.date === today && entry.pair === pair);
          
          if (existingIndex >= 0) {
            data.history[existingIndex] = newEntry;
          } else {
            data.history.push(newEntry);
          }
        }
      }

      // Keep history manageable (last 365 days per pair)
      // This is a simple cleanup; in a real app, you might want more sophisticated logic
      if (data.history.length > 365 * trackedPairs.length) {
        data.history = data.history.slice(-(365 * trackedPairs.length));
      }

      // Save updated history to Blob
      await put(HISTORY_BLOB_PATH, JSON.stringify(data, null, 2), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: true
      });

      return res.status(200).json({
        success: true,
        message: isCron ? 'Cron update successful' : 'Historical rate updated',
        date: today,
        updated_pairs: pairsToUpdate.map(p => p.pair)
      });
    } catch (error) {
      // Sentinel: Removed details: error.message to prevent internal info leakage
      console.error('History update error:', error);
      return res.status(500).json({ 
        error: 'Failed to update history'
      });
    }
  } 

  return res.status(405).json({ error: 'Method not allowed' });
}
