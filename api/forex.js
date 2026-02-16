export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const startDate = new Date(Date.now() - 95 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const currencyMeta = [
    { name: "US Dollar", code: "USD", unit: 1 },
    { name: "Indian Rupee", code: "INR", unit: 100 },
    { name: "European Euro", code: "EUR", unit: 1 },
    { name: "UK Pound Sterling", code: "GBP", unit: 1 },
    { name: "UAE Dirham", code: "AED", unit: 1 },
    { name: "Qatari Riyal", code: "QAR", unit: 1 },
    { name: "Saudi Arabian Riyal", code: "SAR", unit: 1 },
    { name: "Malaysian Ringgit", code: "MYR", unit: 1 },
    { name: "South Korean Won", code: "KRW", unit: 100 }, // Added KRW (Unit 100)
    { name: "Australian Dollar", code: "AUD", unit: 1 },
    { name: "Canadian Dollar", code: "CAD", unit: 1 },
    { name: "Singapore Dollar", code: "SGD", unit: 1 },
    { name: "Japanese Yen", code: "JPY", unit: 10 }
  ];

  try {
    // 1. Fetch LIVE USD/NPR from Yahoo (For the "Google Search" 144.95 price)
    let liveUsdNpr = 144.95;
    try {
      const yRes = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/USDNPR=X?interval=1d&range=1d`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const yData = await yRes.json();
      liveUsdNpr = yData?.chart?.result?.[0]?.meta?.regularMarketPrice || 144.95;
    } catch (e) { console.error("Yahoo Live Failed"); }

    // 2. Fetch History from Frankfurter (Includes KRW in symbols)
    const frankUrl = `https://api.frankfurter.dev/v1/${startDate}..?base=USD&symbols=NPR,EUR,GBP,INR,AUD,CAD,MYR,SGD,JPY,KRW`;
    const frankRes = await fetch(frankUrl);
    const frankData = await frankRes.json();

    // Middle Eastern Currencies are pegged to USD.
    const fixedPegs = { "AED": 3.6725, "QAR": 3.64, "SAR": 3.75 };

    // 3. Process History
    const history = Object.entries(frankData.rates).map(([date, rates]) => {
      const isToday = date === frankData.end_date;
      
      return {
        date: date,
        currencies: currencyMeta.map(meta => {
          let buyRate;
          const currentNprBase = isToday ? liveUsdNpr : (rates["NPR"] || 144.95);

          if (meta.code === "USD") {
            buyRate = currentNprBase;
          } else if (meta.code === "INR") {
            buyRate = 160.00; // Nepal official peg
          } else if (fixedPegs[meta.code]) {
            buyRate = (currentNprBase / fixedPegs[meta.code]) * meta.unit;
          } else {
            // Floating currencies (EUR, GBP, KRW, JPY, etc.)
            const foreignPerUsd = rates[meta.code] || 1;
            buyRate = (currentNprBase / foreignPerUsd) * meta.unit;
          }

          return {
            currency: meta.name,
            code: meta.code,
            unit: meta.unit,
            buy: Number(buyRate.toFixed(2)),
            sell: Number(buyRate.toFixed(2))
          };
        })
      };
    }).reverse();

    // 4. Fill Weekend Gaps / Missing Today
    const finalHistory = [];
    const seenDates = new Set();
    
    const todayStr = new Date().toISOString().split('T')[0];
    if (history.length > 0 && history[0].date !== todayStr) {
      const todayEntry = JSON.parse(JSON.stringify(history[0]));
      todayEntry.date = todayStr;
      // Inject the live USD rate into today's injected entry
      todayEntry.currencies.forEach(c => {
         if(c.code === "USD") { c.buy = liveUsdNpr; c.sell = liveUsdNpr; }
      });
      finalHistory.push(todayEntry);
      seenDates.add(todayStr);
    }

    history.forEach(item => {
      if (!seenDates.has(item.date)) {
        finalHistory.push(item);
        seenDates.add(item.date);
      }
    });

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');
    return res.status(200).json({
      status: "success",
      source: "Yahoo Live + Frankfurter History",
      last_updated: new Date().toISOString(),
      rates: finalHistory.slice(0, 90)
    });

  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
}