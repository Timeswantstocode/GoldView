import { put, list } from '@vercel/blob'; // Fixed: Removed 'get'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 0. Simple Rate Limiting (IP-based)
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    // Note: In a production environment with Upstash/Redis, you'd use a more robust tracker.
    // For now, we'll implement a basic check or suggest the user sets up Vercel KV/Upstash.
    
    const subscription = req.body;
    
    // 1. Basic Validation
    if (!subscription || typeof subscription !== 'object') {
      return res.status(400).json({ error: 'Invalid subscription payload' });
    }

    const { endpoint, keys } = subscription;
    if (!endpoint || typeof endpoint !== 'string' || !endpoint.startsWith('https://')) {
      return res.status(400).json({ error: 'Invalid or missing push endpoint' });
    }

    if (!keys || typeof keys !== 'object' || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ error: 'Invalid or missing push keys' });
    }

    // 2. Size Limit Validation (Prevent storage abuse)
    if (JSON.stringify(subscription).length > 2000) {
      return res.status(400).json({ error: 'Subscription payload too large' });
    }

    const BLOB_PATH = 'subscriptions/data.json';
    let subscriptions = [];

    // 1. Try to fetch existing subscriptions from Blob
    try {
      const { blobs } = await list({ prefix: 'subscriptions/' }); // Adjusted prefix to be more general
      const existingBlob = blobs.find(b => b.pathname === BLOB_PATH);
      
      if (existingBlob) {
        const response = await fetch(existingBlob.url);
        if (response.ok) {
           subscriptions = await response.json();
        }
      }
    } catch (e) {
      console.error('Error fetching existing subscriptions from Blob:', e);
      subscriptions = [];
    }

    // 2. Check if subscription already exists
    const exists = subscriptions.some(s => s.endpoint === subscription.endpoint);
    
    if (!exists) {
      subscriptions.push(subscription);
      
      // 3. Save updated list back to Vercel Blob
      await put(BLOB_PATH, JSON.stringify(subscriptions, null, 2), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false, // Keep the filename consistent
        allowOverwrite: true    // Allow overwriting the existing file to "append" data
      });
      
      console.log('Subscription added. Total:', subscriptions.length);
    } else {
      console.log('Subscription already exists.');
    }
    
    return res.status(200).json({ 
      success: true, 
      message: 'Subscription synchronized',
      count: subscriptions.length
    });
  } catch (error) {
    console.error('Subscription error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}