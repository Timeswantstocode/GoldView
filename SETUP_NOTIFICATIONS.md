# Setting Up Push Notifications with Vercel Blob

I have integrated **Vercel Blob** into your project to store push notification subscriptions persistently. This fixes the "Subscriptions list is empty" error.

## Steps to Complete Setup

### 1. Enable Vercel Blob in your Dashboard
1. Go to your project in the [Vercel Dashboard](https://vercel.com).
2. Click on the **Storage** tab.
3. Select **Connect Database** and choose **Blob**.
4. Follow the instructions to create a new Blob store.
5. Vercel will automatically add the `BLOB_READ_WRITE_TOKEN` to your Environment Variables.

### 2. Add Secret to GitHub Actions
To allow the notification script to run from GitHub Actions, you need to add the token there as well:
1. Go to your GitHub repository: `Timeswantstocode/GoldView`.
2. Navigate to **Settings** > **Secrets and variables** > **Actions**.
3. Click **New repository secret**.
4. Name: `BLOB_READ_WRITE_TOKEN`.
5. Value: (Copy the value of `BLOB_READ_WRITE_TOKEN` from your Vercel Project Settings > Environment Variables).

## How it Works
- **Frontend**: When a user enables notifications, the `/api/subscribe` endpoint saves their subscription to a file named `subscriptions/data.json` in your Vercel Blob storage.
- **Scraper/Notifications**: The Python scripts (`scraper.py` and `send_notifications.py`) now use the `BLOB_READ_WRITE_TOKEN` to fetch this file from Vercel Blob before sending notifications.

## Forex Prices
The forex API is now fully integrated with **Yahoo Finance** for real-time rates and **Nepal Rastra Bank** for historical data. No further setup is required for this.
