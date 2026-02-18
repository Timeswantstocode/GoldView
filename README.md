# 📈 GoldView Nepal

[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen?style=for-the-badge&logo=vercel)](https://goldview.tech/)
[![Vercel Deployment](https://img.shields.io/badge/Vercel-Deployed-black?style=for-the-badge&logo=vercel)](https://goldview.tech/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

**GoldView** is a high-performance, minimalist web application providing real-time gold and silver price tracking in Nepal. Designed for investors, jewelers, and enthusiasts, it offers accurate market data, interactive trends, and powerful calculation tools in a sleek, mobile-first interface.

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

## 🚀 Getting Started

### Prerequisites

-   **Node.js** (v18 or higher)
-   **Python 3.x**
-   **pnpm** (preferred) or npm/yarn

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Timeswantstocode/GoldView.git
    cd GoldView
    ```

2.  **Install Frontend Dependencies:**
    ```bash
    pnpm install
    ```

3.  **Install Python Dependencies (for scraper):**
    ```bash
    pip install -r requirements.txt
    ```
    *(Note: Create a requirements.txt with `requests`, `beautifulsoup4`, `pywebpush` if not present)*

4.  **Run Locally:**
    ```bash
    pnpm dev
    ```

---

## 🔧 Configuration & Environment Variables

To enable all features like Push Notifications and Data Scraping, set the following environment variables in your Vercel project or GitHub Secrets:

| Variable | Description |
| :--- | :--- |
| `VAPID_PUBLIC_KEY` | Public key for Web Push notifications. |
| `VAPID_PRIVATE_KEY` | Private key for Web Push notifications. |
| `VAPID_EMAIL` | Contact email for VAPID (e.g., `mailto:your@email.com`). |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token for storing subscriptions and data. |

### Generating VAPID Keys
You can generate your own VAPID keys using the included script:
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
1. Open [goldview.tech](https://goldview.tech/) in Safari.
2. Tap the **Share** button.
3. Select **"Add to Home Screen"**.
4. Open GoldView from your home screen to enable Push Notifications.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 👨‍💻 Author

Created with ❤️ by **[@Timeswantstocode](https://github.com/Timeswantstocode)**

[![GitHub](https://img.shields.io/badge/GitHub-Profile-181717?style=for-the-badge&logo=github)](https://github.com/Timeswantstocode)
