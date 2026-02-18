# 🇳🇵 GoldView Nepal

> **Elevate your precious metal and currency tracking experience.**

[![Live Demo](https://img.shields.io/badge/Live-Demo-FFD700?style=for-the-badge&logo=vercel&logoColor=black)](https://viewgold.vercel.app/)
[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen?style=for-the-badge&logo=github-actions)](https://github.com/Timeswantstocode/GoldView/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Mobile Ready](https://img.shields.io/badge/Mobile-Optimized-orange?style=for-the-badge&logo=apple)](https://viewgold.vercel.app/)

**GoldView** is a sophisticated, high-performance web application designed specifically for the Nepali market. It provides real-time tracking of Gold (24K & 22K), Silver, and major global currencies with a focus on speed, accuracy, and an exceptional user experience.

---

## 🌟 Premium Features

### 📡 Real-Time Market Intel
- **Live Metal Rates:** Instant updates for 24K Chhapawal Gold, 22K Tejabi Gold, and Pure Silver.
- **Dynamic Forex Dashboard:** Real-time exchange rates for USD, INR, GBP, EUR, AUD, JPY, KRW, and AED to NPR.
- **Smart Notifications:** Native Web Push alerts keep you informed of price changes even when the app is closed.

### 📊 Advanced Analytics
- **Interactive Trend Charts:** Analyze historical data over 7 days, 1 month, or 3 months with high-fidelity visualization.
- **Historical Data Points:** Tap any point on the chart to see the exact rate and date in a polished detail view.

### 🧮 Professional Suite
- **Jewelry Calculator:** Accurately calculate jewelry costs with Tola/Aana/Lal units, making charges, and optional 13% VAT.
- **Currency Converter:** Seamlessly switch between global currencies and NPR with a sleek, bidirectional interface.
- **Portfolio Tracker:** Manage "My Gold" with ease. Track your purchase price vs. current market value to see unrealized profit/loss.

### 📱 Next-Gen Experience
- **PWA Excellence:** Install as a standalone app on iOS and Android for a native-like experience.
- **Internationalization:** Full support for both **English** and **Nepali** languages.
- **Shareable Insights:** Generate and share beautiful, high-resolution price cards with one tap.

---

## 🏗️ The Engineering

- **Frontend:** Built with [React 18](https://reactjs.org/) and [Vite](https://vitejs.dev/) for blazing fast performance.
- **Styling:** Highly customized [Tailwind CSS](https://tailwindcss.com/) with glassmorphism and GPU-accelerated animations.
- **Data Visualization:** [Chart.js](https://www.chartjs.org/) with custom tooltips and gradient fills.
- **Backend:** [Node.js](https://nodejs.org/) Serverless Functions on Vercel.
- **Persistence:** [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) for efficient data and subscription storage.
- **Automation:** Python-based scrapers (BeautifulSoup4) running on GitHub Actions.

---

## 🚀 Deployment & Installation

### Quick Start (Local Development)

1. **Clone & Enter:**
   ```bash
   git clone https://github.com/Timeswantstocode/GoldView.git
   cd GoldView
   ```

2. **Frontend Setup:**
   ```bash
   pnpm install
   pnpm dev
   ```

3. **Backend/Scraper Setup:**
   ```bash
   pip install -r requirements.txt
   python scraper.py
   ```

### ⚙️ Environment Configuration

| Variable | Use Case |
| :--- | :--- |
| `VAPID_PUBLIC_KEY` | Web Push identity. |
| `VAPID_PRIVATE_KEY` | Web Push secure signing. |
| `BLOB_READ_WRITE_TOKEN` | Database & storage access. |

---

## 📲 Home Screen Installation (PWA)

### **iOS (Safari)**
1. Tap the **Share** button.
2. Scroll down and select **"Add to Home Screen"**.
3. Launch from your home screen for the full experience.

### **Android (Chrome)**
1. Tap the **Menu** (⋮) icon.
2. Select **"Install app"**.

---

## 🤝 Contributing

We welcome contributions from the community!

1. **Fork** the repository.
2. **Create** your feature branch (`git checkout -b feature/CoolFeature`).
3. **Commit** your changes (`git commit -m 'Add CoolFeature'`).
4. **Push** to the branch (`git push origin feature/CoolFeature`).
5. **Open** a Pull Request.

---

## 📄 License

This project is licensed under the **MIT License**.

---

## 👤 Author

**Timeswantstocode**
- GitHub: [@Timeswantstocode](https://github.com/Timeswantstocode)

---

<p align="center">
  Developed with ❤️ for the Nepali Community.
</p>
