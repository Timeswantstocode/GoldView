# GoldView Debugging Analysis

## Codebase Structure

### Frontend (React + Vite)
- **[`src/App.jsx`](src/App.jsx)**: Main React component (571 lines)
  - Handles gold/silver/USD price display
  - Chart visualization with Chart.js
  - Calculator for jewelry and currency conversion
  - Notification subscription logic
  
- **[`src/main.jsx`](src/main.jsx)**: React entry point
- **[`index.html`](index.html)**: HTML shell with service worker registration
- **[`public/sw.js`](public/sw.js)**: Service Worker for push notifications

### Backend APIs (Vercel Serverless)
- **[`api/forex.js`](api/forex.js)**: Fetches live forex rates from Yahoo Finance + NRB history
- **[`api/rates.js`](api/rates.js)**: Alternative rates endpoint with caching
- **[`api/subscribe.js`](api/subscribe.js)**: Stores push notification subscriptions in Vercel Blob
- **[`api/rates-history.js`](api/rates-history.js)**: Cron job endpoint (not read yet)

### Data Collection
- **[`scraper.py`](scraper.py)**: Python scraper that:
  - Fetches gold/silver prices from FENEGOSIDA and Ashesh
  - Fetches USD/NPR history from Yahoo Finance
  - Sends push notifications when prices change
  - Updates [`data.json`](data.json)

### GitHub Actions
- **[`.github/workflows/scrape.yml`](.github/workflows/scrape.yml)**: Runs scraper 9x daily
- **[`.github/workflows/notify_prices.yml`](.github/workflows/notify_prices.yml)**: Manual notification trigger

---

## 🔍 IDENTIFIED ISSUES

### 1. **NOTIFICATION SYSTEM PROBLEMS** 🔴 CRITICAL

#### Root Causes Identified:

**A. Subscription Storage Issue**
- Line 185-189 in [`App.jsx`](src/App.jsx:185): Subscription is sent to `/api/subscribe`
- [`api/subscribe.js`](api/subscribe.js) stores in Vercel Blob at `subscriptions/data.json`
- [`scraper.py`](scraper.py:52-76) tries to fetch from Blob but has fallback logic
- **Problem**: If Blob storage fails or subscription isn't properly saved, notifications won't work

**B. Notification Trigger Logic**
- [`scraper.py`](scraper.py:286-296): Only sends notifications if prices CHANGE
- Line 293: `if change_g != 0 or change_s != 0 or change_t != 0:`
- **Problem**: If you subscribed but prices haven't changed since last scrape, you won't get a notification

**C. Service Worker Registration**
- [`index.html`](index.html:16-20): Service worker registered
- [`public/sw.js`](public/sw.js:30-44): Push event handler exists
- **Problem**: No diagnostic logging to confirm push messages are received

**D. VAPID Key Mismatch**
- [`App.jsx`](src/App.jsx:168): Uses hardcoded VAPID public key
- [`scraper.py`](scraper.py:13-15): Uses environment variable VAPID keys
- **Potential Issue**: If keys don't match, push will fail silently

#### Diagnostic Recommendations:
1. Add console logging to service worker push events
2. Add test notification button that bypasses price change logic
3. Verify Blob storage contains your subscription
4. Check browser console for subscription errors

---

### 2. **PERFORMANCE & LAG ISSUES** 🟡 HIGH PRIORITY

#### Root Causes Identified:

**A. Large Data Fetching**
- [`App.jsx`](src/App.jsx:111-123): Fetches entire `data.json` from GitHub raw URL
- [`data.json`](data.json) contains historical data (potentially 1000 entries per line 319 in scraper)
- **Problem**: Loading large JSON on every page load causes lag

**B. Forex API Call**
- [`App.jsx`](src/App.jsx:125-139): Fetches 90 days of forex history
- [`api/forex.js`](api/forex.js:11-45): Makes multiple Yahoo Finance API calls
- **Problem**: No loading states, blocks UI rendering

**C. Chart Re-rendering**
- [`App.jsx`](src/App.jsx:245-300): Chart data recalculated on every state change
- Line 379: `<Line ref={chartRef} data={chartData} options={chartOptions} redraw={false} />`
- **Problem**: `useMemo` helps but chart still heavy with 90 days of data

**D. No Code Splitting**
- All components in single [`App.jsx`](src/App.jsx) file (571 lines)
- Chart.js library loaded upfront
- **Problem**: Large initial bundle size

**E. Tailwind CDN**
- [`index.html`](index.html:24): Uses Tailwind CDN instead of build-time compilation
- **Problem**: Slower than compiled CSS, blocks rendering

#### Performance Recommendations:
1. Implement data pagination/windowing
2. Add proper loading states
3. Use Vercel Edge caching for API responses
4. Split components and lazy load
5. Replace Tailwind CDN with build-time compilation
6. Add service worker caching for data.json

---

### 3. **USD TO NPR HISTORY ACCURACY** 🟡 MEDIUM PRIORITY

#### Root Causes Identified:

**A. Data Source Confusion**
- [`App.jsx`](src/App.jsx:214-220): Uses `forexHistory` for USD data
- [`api/forex.js`](api/forex.js:110-130): Merges Yahoo Finance + NRB data
- [`scraper.py`](scraper.py:194-216): Fetches USD history separately
- **Problem**: Multiple data sources, unclear which is "official"

**B. Historical Data Not Stored**
- [`data.json`](data.json:1-20): Contains gold/silver/tejabi prices
- Line 306 in [`scraper.py`](scraper.py:306): Adds `usd` field to entries
- **Problem**: USD history in data.json but forex.js provides different data

**C. Yahoo Finance vs NRB**
- [`api/forex.js`](api/forex.js:113-126): Prioritizes Yahoo data over NRB
- Line 78-80: Overwrites NRB USD with Yahoo USD
- **Problem**: Yahoo data is "live" but may not match official NRB rates

#### Accuracy Recommendations:
1. Clarify data source priority (NRB official vs Yahoo live)
2. Store USD history consistently in data.json
3. Add data source labels in UI
4. Implement data validation/reconciliation

---

### 4. **LIVE CURRENCY RATES** 🟢 LOW PRIORITY

#### Current Implementation:
- [`api/forex.js`](api/forex.js:69-101): Calculates live cross-rates
- Line 84-91: Uses USD/NPR * USD/Foreign formula
- [`App.jsx`](src/App.jsx:457-500): Currency calculator uses forex data

#### Issues Identified:
**A. INR Hardcoded**
- [`api/forex.js`](api/forex.js:81-83): INR fixed at 160.00
- **Problem**: Not truly "live" for INR

**B. No Error Handling in UI**
- [`App.jsx`](src/App.jsx:125-139): No error state for forex fetch failure
- **Problem**: Calculator shows stale data without warning

**C. Cache Duration**
- [`api/rates.js`](api/rates.js:6): 1 hour cache
- **Problem**: "Live" rates may be up to 1 hour old

#### Currency Recommendations:
1. Remove INR hardcoding or document it
2. Add error states in UI
3. Display last update timestamp
4. Consider shorter cache for "live" rates

---

## 📊 PRIORITY MATRIX

| Issue | Severity | User Impact | Fix Complexity |
|-------|----------|-------------|----------------|
| Notifications not working | 🔴 Critical | High | Medium |
| Performance/Lag | 🟡 High | High | Medium-High |
| USD History Accuracy | 🟡 Medium | Medium | Low-Medium |
| Live Currency Rates | 🟢 Low | Low | Low |

---

## 🎯 RECOMMENDED FIX ORDER

1. **Add notification diagnostics** (Quick win, high impact)
2. **Optimize data loading** (Performance boost)
3. **Fix USD history** (Data accuracy)
4. **Enhance currency rates** (Polish)

---

## 🔧 NEXT STEPS

1. Add diagnostic logging to notification system
2. Test notification flow end-to-end
3. Implement performance optimizations
4. Validate USD data sources
5. Add error handling throughout
