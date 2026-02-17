// Historical exchange rates endpoint
// Stores and retrieves daily closing prices for USD to NPR and other currencies

import { put, list } from '@vercel/blob';
import yahooFinance from 'yahoo-finance2';

const HISTORY_BLOB_PATH = 'rates-history/usd-npr-history.json';

async function fetchHistoricalRate(symbol) {
  try {
    const result = await yahooFinance.quote(symbol, {
      fields: ['regularMarketPrice', 'currency']
    });
    
    return result.regularMarketPrice;
  } catch (error) {
    console.error(`Error fetching historical rate for ${symbol}:`, error);
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
  if (req.method === 'GET') {
    // Retrieve historical data
    try {
      const { days = 30 } = req.query;
      const history = await getHistoryFromBlob();
      
      // Return last N days
      const recentHistory = history.history.slice(-parseInt(days));
      
      return res.status(200).json({
        currency_pair: 'USD-NPR',
        days: recentHistory.length,
        history: recentHistory
      });
    } catch (error) {
      console.error('History retrieval error:', error);
      return res.status(500).json({ error: 'Failed to retrieve history' });
    }
  } 
  else if (req.method === 'POST') {
    // Update historical data with today's closing price
    try {
      const { symbol = 'USDNPR=X', pair = 'USD-NPR' } = req.body;

      // Fetch today's closing price
      const closingPrice = await fetchHistoricalRate(symbol);
      
      if (closingPrice === null) {
        return res.status(500).json({ error: 'Failed to fetch closing price' });
      }

      // Get existing history
      const data = await getHistoryFromBlob();
      
      // Check if today's entry already exists
      const today = new Date().toISOString().split('T')[0];
      const existingIndex = data.history.findIndex(entry => entry.date === today);
      
      const newEntry = {
        date: today,
        closing_price: closingPrice,
        pair: pair,
        timestamp: Date.now()
      };

      if (existingIndex >= 0) {
        // Update today's entry
        data.history[existingIndex] = newEntry;
      } else {
        // Add new entry
        data.history.push(newEntry);
      }

      // Keep only last 365 days to manage storage
      if (data.history.length > 365) {
        data.history = data.history.slice(-365);
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
        message: 'Historical rate updated',
        date: today,
        closing_price: closingPrice,
        total_records: data.history.length
      });
    } catch (error) {
      console.error('History update error:', error);
      return res.status(500).json({ 
        error: 'Failed to update history',
        details: error.message 
      });
    }
  } 
  else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
