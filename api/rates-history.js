/*
 * Copyright (c) 2024-2026 Timeswantstocode. All Rights Reserved.
 * This software is proprietary and may not be copied, modified, or distributed.
 * See LICENSE file for details.
 */

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
  const isCron = req.headers['x-vercel-cron'] === '1';
  const authHeader = req.headers['authorization'];
  
  // 1. Handle Update Requests (Cron or authorized POST)
  // Sentinel: Added verification for updates to prevent unauthorized data modification
  if (isCron || req.method === 'POST') {
    // Security: Verify secret if it's configured in the environment
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      // Sentinel: Whitelist pairs to prevent injection of arbitrary symbols/data
      let pairsToUpdate = trackedPairs;

      if (req.method === 'POST' && req.body && req.body.symbol) {
        const { symbol, pair } = req.body;
        const whitelisted = trackedPairs.find(p => p.symbol === symbol && p.pair === pair);
        if (!whitelisted) {
          return res.status(400).json({ error: 'Unsupported symbol or pair' });
        }
        pairsToUpdate = [whitelisted];
      }

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

  // 2. Handle GET requests (Retrieve history)
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
      // Sentinel: Removed details: error.message to prevent internal info leakage
      console.error('History retrieval error:', error);
      return res.status(500).json({ error: 'Failed to retrieve history' });
    }
  } 

  return res.status(405).json({ error: 'Method not allowed' });
}
