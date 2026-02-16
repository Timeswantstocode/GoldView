# GoldView Push Notifications Setup

This project now supports native Web Push notifications without using OneSignal. Follow these steps to set it up:

## 1. Generate VAPID Keys
You need a pair of VAPID keys to identify your server to the push service.
Run the following command in your terminal (ensure you have `cryptography` and `pywebpush` installed):
```bash
python generate_vapid.py
```
This will output a `VAPID_PUBLIC_KEY` and a `VAPID_PRIVATE_KEY`.

## 2. Update Frontend
Open `src/App.jsx` and replace `YOUR_VAPID_PUBLIC_KEY` with the public key you just generated:
```javascript
const VAPID_PUBLIC_KEY = "YOUR_GENERATED_PUBLIC_KEY_HERE";
```

## 3. Set GitHub Secrets
Go to your GitHub repository settings -> Secrets and variables -> Actions and add the following secrets:
- `VAPID_PUBLIC_KEY`: Your generated public key.
- `VAPID_PRIVATE_KEY`: Your generated private key.
- `VAPID_EMAIL`: Your email address (e.g., `mailto:yourname@example.com`).

## 4. How it Works
1. When a user clicks the notification bell in the app, they are prompted to allow notifications.
2. If allowed, the browser generates a "Subscription" object.
3. This subscription needs to be stored in `subscriptions.json` in your repository.
4. When `scrape.yml` runs and detects a price change, it reads `subscriptions.json` and sends a push notification to all registered devices.

### Note on Subscription Storage
Currently, the app logs the subscription to the console. To fully automate this without a database, you can:
- Manually add your device's subscription to `subscriptions.json`.
- Or, set up a simple API (like the one in `api/subscribe.js`) to append to `subscriptions.json` via a GitHub Action or a small backend.
