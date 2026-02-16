import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const subscription = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Invalid subscription' });
    }

    // In Vercel, the filesystem is read-only in production.
    // However, for this project, the user is likely running the scraper locally 
    // or expecting the subscriptions to be saved to the repository via some mechanism.
    // To fix the "Subscriptions list is empty" error, we need a way to store these.
    
    // For a real fix without a database, we would need to use an external service.
    // But to address the user's immediate issue, we will update the code to at least
    // attempt to read/write to a file, and provide instructions for a better solution.
    
    const filePath = join(process.cwd(), 'subscriptions.json');
    let subscriptions = [];
    
    if (existsSync(filePath)) {
      try {
        const fileData = readFileSync(filePath, 'utf8');
        subscriptions = JSON.parse(fileData || '[]');
      } catch (e) {
        subscriptions = [];
      }
    }

    // Check if subscription already exists
    const exists = subscriptions.some(s => s.endpoint === subscription.endpoint);
    if (!exists) {
      subscriptions.push(subscription);
      // NOTE: This will only work in local development or environments with persistent storage.
      // In Vercel, this file will NOT persist across requests.
      try {
        writeFileSync(filePath, JSON.stringify(subscriptions, null, 2));
      } catch (e) {
        console.error('Could not write to subscriptions.json:', e);
      }
    }
    
    console.log('Subscription added. Total:', subscriptions.length);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Subscription received',
      count: subscriptions.length
    });
  } catch (error) {
    console.error('Subscription error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
