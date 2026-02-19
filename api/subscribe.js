/*
 * Copyright (c) 2024-2026 Timeswantstocode. All Rights Reserved.
 * This software is proprietary and may not be copied, modified, or distributed.
 * See LICENSE file for details.
 */

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

    // 2. Remove duplicate subscriptions and truly dead ones (failed 6+ times)
    // Keep only unique endpoints and subscriptions that haven't exceeded failure threshold
    const FAILURE_THRESHOLD = 6;  // Remove after 6 consecutive failures
    const uniqueEndpoints = new Set();
    const cleanedSubscriptions = subscriptions.filter(s => {
      // Remove subscriptions that have failed too many times
      const failureCount = s.failureCount || 0;
      if (failureCount >= FAILURE_THRESHOLD) {
        console.log('Removing dead subscription (failed', failureCount, 'times):', s.endpoint?.substring(0, 50));
        return false;
      }
      // Remove duplicates (keep first occurrence)
      if (uniqueEndpoints.has(s.endpoint)) {
        console.log('Removing duplicate subscription:', s.endpoint?.substring(0, 50));
        return false;
      }
      uniqueEndpoints.add(s.endpoint);
      return true;
    });
    
    // 3. Check if this new subscription already exists
    const exists = cleanedSubscriptions.some(s => s.endpoint === subscription.endpoint);
    
    if (!exists) {
      // Security: Limit total subscriptions to prevent storage exhaustion
      if (cleanedSubscriptions.length >= 10000) {
        return res.status(400).json({ error: 'Subscription limit reached' });
      }

      cleanedSubscriptions.push(subscription);
      console.log('Subscription added. Total:', cleanedSubscriptions.length);
    } else {
      console.log('Subscription already exists.');
    }
    
    // 4. Save cleaned list back to Vercel Blob (always save to persist cleanup)
    await put(BLOB_PATH, JSON.stringify(cleanedSubscriptions, null, 2), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false, // Keep the filename consistent
      allowOverwrite: true    // Allow overwriting the existing file to "append" data
    });
    
    return res.status(200).json({ 
      success: true, 
      message: 'Subscription synchronized',
      count: cleanedSubscriptions.length,
      cleaned: subscriptions.length !== cleanedSubscriptions.length
    });
  } catch (error) {
    // Sentinel: Removed details: error.message to prevent internal info leakage
    console.error('Subscription error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}