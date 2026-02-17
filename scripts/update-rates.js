// Script to update daily closing prices
// Can be run as a cron job or scheduled task

import yahooFinance from 'yahoo-finance2';
import { put, list } from '@vercel/blob';

const HISTORY_BLOB_PATH = 'rates-history/usd-npr-history.json';

const currencyPairs = [
  { symbol: 'USDNPR=X', pair: 'USD-NPR' },
  { symbol: 'USDEUR=X', pair: 'USD-EUR' },
  { symbol: 'USDGBP=X', pair: 'USD-GBP' },
  { symbol: 'USDINR=X', pair: 'USD-INR' },
  { symbol: 'USDAUD=X', pair: 'USD-AUD' },
];

async function fetchClosingPrice(symbol) {
  try {
    const result = await yahooFinance.quote(symbol, {
      fields: ['regularMarketPrice', 'currency']
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

async function updateRates() {
  console.log('Starting daily rates update...');
  
  try {
    const data = await getHistoryFromBlob();
    const today = new Date().toISOString().split('T')[0];

    // Check if today's data already exists
    const existingIndex = data.history.findIndex(entry => entry.date === today);
    
    for (const { symbol, pair } of currencyPairs) {
      const closingPrice = await fetchClosingPrice(symbol);
      
      if (closingPrice !== null) {
        const newEntry = {
          date: today,
          closing_price: closingPrice,
          pair: pair,
          timestamp: Date.now()
        };

        if (existingIndex >= 0 && data.history[existingIndex].pair === pair) {
          data.history[existingIndex] = newEntry;
        } else {
          data.history.push(newEntry);
        }

        console.log(`Updated ${pair}: ${closingPrice}`);
      }
    }

    // Keep only last 365 days
    if (data.history.length > 365) {
      data.history = data.history.slice(-365);
    }

    // Save to Blob
    await put(HISTORY_BLOB_PATH, JSON.stringify(data, null, 2), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true
    });

    console.log(`✓ Successfully updated rates for ${today}`);
    console.log(`Total records stored: ${data.history.length}`);
  } catch (error) {
    console.error('Error updating rates:', error);
    process.exit(1);
  }
}

// Run the update
updateRates();
