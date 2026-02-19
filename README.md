# 📈 GoldView Nepal

[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen?style=for-the-badge&logo=vercel)](https://www.goldview.tech/)
[![Vercel Deployment](https://img.shields.io/badge/Vercel-Deployed-black?style=for-the-badge&logo=vercel)](https://www.goldview.tech/)

**GoldView** is a high-performance, minimalist web application providing real-time gold and silver price tracking in Nepal. Designed for investors, jewelers, and enthusiasts, it offers accurate market data, interactive trends, and powerful calculation tools in a sleek, mobile-first interface.

**Copyright © 2024-2026 Timeswantstocode. All Rights Reserved.**

This is proprietary software. Unauthorized copying, modification, or distribution is prohibited. See LICENSE file for details.

---

## ✨ Key Features

-   **🔔 Real-Time Price Alerts:** Native push notifications for instant updates on price changes (supports Android, Chrome, and iOS PWA).
-   **💰 Live Market Dashboard:** Track 24K Chhapawal Gold, 22K Tejabi Gold, and Pure Silver rates with daily fluctuations.
-   **💹 Forex Integration:** Live exchange rates for USD, INR, GBP, EUR, AUD, JPY, KRW, and AED to NPR.
-   **📊 Interactive Trends:** Deep-dive into historical data with 7-day, 1-month, and 3-month interactive charts powered by Chart.js.
-   **🧮 Jewelry Calculator:** Professional-grade calculator for buying and selling, including customizable making charges and 13% VAT toggles.
-   **💱 Currency Converter:** Instant conversion between major global currencies and Nepali Rupees.
-   **📱 Progressive Web App (PWA):** Install GoldView on your home screen for a native app experience on iOS and Android.

---

## 🛠️ Tech Stack

-   **Frontend:** React 18, Vite, Tailwind CSS
-   **Icons & UI:** Lucide React, Chart.js
-   **Backend:** Node.js (Vercel Serverless Functions)
-   **Automation:** Python (BeautifulSoup4, Requests) for data scraping
-   **Storage:** Vercel Blob for persistent subscription and historical data
-   **Monitoring:** Vercel Analytics & Speed Insights

---

## 🔧 Environment Variables

**Note:** This section is for reference only. The source code is proprietary and not available for deployment by third parties.

For the deployed application at https://www.goldview.tech/, the following environment variables are configured:

| Variable | Description |
| :--- | :--- |
| `VAPID_PUBLIC_KEY` | Public key for Web Push notifications. |
| `VAPID_PRIVATE_KEY` | Private key for Web Push notifications. |
| `VAPID_EMAIL` | Contact email for VAPID (e.g., `mailto:your@email.com`). |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token for storing subscriptions and data. |

### Generating VAPID Keys

**Note:** This information is provided for educational reference only.

You can generate VAPID keys using the included script:
```bash
python generate_vapid.py
```

---

## 🛰️ Automated Data Updates

The project uses GitHub Actions to scrape the latest prices from official sources (**FENEGOSIDA** and **Ashesh**) every hour.

-   **Scheduled Scrape:** Runs automatically via `.github/workflows/scrape.yml`.
-   **Manual Scrape:** Can be triggered via the "Actions" tab in GitHub.
-   **Verification:** The system cross-references multiple sources to ensure data accuracy before updating.

---

## 📱 PWA & Mobile Setup

For the best experience on **iOS**:
1. Open [www.goldview.tech](https://www.goldview.tech/) in Safari.
2. Tap the **Share** button.
3. Select **"Add to Home Screen"**.
4. Open GoldView from your home screen to enable Push Notifications.

---

## 📄 License

Copyright © 2024-2026 Timeswantstocode. All Rights Reserved.

This is proprietary software. See LICENSE file for full terms. Unauthorized copying, modification, or distribution is strictly prohibited.

---

## 👨‍💻 Author

Created with ❤️ by **[@Timeswantstocode](https://github.com/Timeswantstocode)**

[![GitHub](https://img.shields.io/badge/GitHub-Profile-181717?style=for-the-badge&logo=github)](https://github.com/Timeswantstocode)
