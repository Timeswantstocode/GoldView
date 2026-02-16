# Setting Up Push Notifications

The "PUSH SKIPPED: Subscriptions list is empty" error occurs because subscriptions are not being persisted. In a serverless environment like Vercel, the filesystem is read-only and resets between requests.

## Recommended Fix: Use a Database

To properly store subscriptions, you should use a database. Here are two easy options:

### Option 1: Vercel KV (Redis) - Easiest
1. Create a KV database in your Vercel Dashboard.
2. Update `api/subscribe.js` to use `@vercel/kv`.

```javascript
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  const subscription = req.body;
  await kv.sadd('subscriptions', JSON.stringify(subscription));
  return res.status(200).json({ success: true });
}
```

3. Update `scraper.py` to fetch subscriptions from the KV API before sending.

### Option 2: GitHub Actions Artifacts/Commits (Current Architecture)
If you want to keep using `subscriptions.json`, you must ensure that when a user subscribes, the change is committed back to the repository. However, this is slow and not recommended for high-traffic apps.

## Immediate Improvement
I have updated `api/subscribe.js` to attempt to handle subscriptions more gracefully and provided the `forex.js` fix for real-time prices.
