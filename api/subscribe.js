import { put, list } from '@vercel/blob'; // Fixed: Removed 'get'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const subscription = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Invalid subscription' });
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
        addRandomSuffix: true // Generate a unique filename to avoid overwrite errors
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