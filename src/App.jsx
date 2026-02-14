import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import { 
  Chart as ChartJS, registerables, Filler, Tooltip, 
  Legend, CategoryScale, LinearScale, PointElement, LineElement 
} from 'chart.js';
import { 
  LayoutDashboard, Calculator, RefreshCcw, TrendingUp, 
  X, Calendar, Zap, Activity, Coins, ArrowRightLeft, Globe, ArrowDown,
  Sun, Moon, Bell, BellOff, Share2, Table, Info, ChevronDown, ChevronUp,
  Download, Check, TrendingDown, DollarSign, Shield
} from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Helmet, HelmetProvider } from 'react-helmet-async';

ChartJS.register(...registerables, Filler, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement);

const DATA_URL = "https://raw.githubusercontent.com/Timeswantstocode/GoldView/main/data.json";
const FOREX_PROXY = "/api/forex";

/* ─── Theme helpers ─── */
const themes = {
  dark: {
    bg: '#020202', card: 'rgba(255,255,255,0.05)', cardBorder: 'rgba(255,255,255,0.1)',
    text: '#f4f4f5', textMuted: '#a1a1aa', textDim: '#52525b', inputBg: 'rgba(0,0,0,0.6)',
    inputBorder: '#27272a', navBg: 'rgba(24,24,27,0.6)', tooltipBg: 'rgba(10,10,10,0.7)',
    footerBorder: 'rgba(255,255,255,0.05)', gridLine: 'rgba(255,255,255,0.04)',
    gridLineY: 'rgba(255,255,255,0.08)', tickColor: 'rgba(255,255,255,0.25)',
    selBorder: 'rgba(255,255,255,0.05)', overlayBg: 'rgba(255,255,255,0.02)',
  },
  light: {
    bg: '#f8f8f8', card: 'rgba(255,255,255,0.85)', cardBorder: 'rgba(0,0,0,0.08)',
    text: '#18181b', textMuted: '#52525b', textDim: '#a1a1aa', inputBg: 'rgba(255,255,255,0.9)',
    inputBorder: '#d4d4d8', navBg: 'rgba(255,255,255,0.7)', tooltipBg: 'rgba(255,255,255,0.9)',
    footerBorder: 'rgba(0,0,0,0.06)', gridLine: 'rgba(0,0,0,0.05)',
    gridLineY: 'rgba(0,0,0,0.08)', tickColor: 'rgba(0,0,0,0.35)',
    selBorder: 'rgba(0,0,0,0.06)', overlayBg: 'rgba(0,0,0,0.02)',
  }
};

/* ─── Custom HTML Tooltip ─── */
const createTooltipHandler = (isDark) => (context) => {
  const {chart, tooltip} = context;
  let tooltipEl = chart.canvas.parentNode.querySelector('div.chart-tooltip');
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'chart-tooltip';
    tooltipEl.style.borderRadius = '14px';
    tooltipEl.style.opacity = 1;
    tooltipEl.style.pointerEvents = 'none';
    tooltipEl.style.position = 'absolute';
    tooltipEl.style.transform = 'translate(-50%, 0)';
    tooltipEl.style.transition = 'all .12s ease';
    tooltipEl.style.padding = '8px 12px';
    tooltipEl.style.zIndex = '100';
    chart.canvas.parentNode.appendChild(tooltipEl);
  }
  tooltipEl.style.background = isDark ? 'rgba(10,10,10,0.7)' : 'rgba(255,255,255,0.9)';
  tooltipEl.style.backdropFilter = 'blur(20px)';
  tooltipEl.style.WebkitBackdropFilter = 'blur(20px)';
  tooltipEl.style.color = isDark ? 'white' : '#18181b';
  tooltipEl.style.border = isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.1)';
  tooltipEl.style.boxShadow = isDark ? '0 10px 30px rgba(0,0,0,0.5)' : '0 10px 30px rgba(0,0,0,0.1)';

  if (tooltip.opacity === 0) { tooltipEl.style.opacity = 0; return; }
  if (tooltip.body) {
    const titleLines = tooltip.title || [];
    const bodyLines = tooltip.body.map(b => b.lines);
    const div = document.createElement('div');
    div.style.display = 'flex'; div.style.flexDirection = 'column'; div.style.alignItems = 'center';
    titleLines.forEach(title => {
      const span = document.createElement('span');
      span.style.fontSize = '8px'; span.style.fontWeight = '800'; span.style.textTransform = 'uppercase';
      span.style.display = 'block'; span.style.marginBottom = '2px'; span.style.opacity = '0.5'; span.style.whiteSpace = 'nowrap';
      span.innerText = title; div.appendChild(span);
    });
    bodyLines.forEach((body) => {
      const span = document.createElement('span');
      span.style.fontSize = '14px'; span.style.fontWeight = '900'; span.style.letterSpacing = '-0.01em'; span.style.whiteSpace = 'nowrap';
      span.innerText = body; div.appendChild(span);
    });
    while (tooltipEl.firstChild) { tooltipEl.firstChild.remove(); }
    tooltipEl.appendChild(div);
  }
  const {offsetLeft: positionX, offsetTop: positionY} = chart.canvas;
  tooltipEl.style.opacity = 1;
  tooltipEl.style.left = positionX + tooltip.caretX + 'px';
  tooltipEl.style.top = positionY + tooltip.caretY - 60 + 'px';
};

/* ─── Karat multipliers ─── */
const karatMultipliers = { '24K': 1, '22K': 22/24, '21K': 21/24, '18K': 18/24 };

/* ─── Hallmark data ─── */
const hallmarkData = [
  { karat: '24K', purity: '99.9%', desc: 'Pure gold, softest form. Used for coins, bars, and investment.', color: '#D4AF37' },
  { karat: '22K', purity: '91.6%', desc: 'Most popular in Nepal for jewelry. Mix of gold with copper/silver.', color: '#C5A028' },
  { karat: '21K', purity: '87.5%', desc: 'Common in Middle East jewelry. Good balance of purity and strength.', color: '#B8941F' },
  { karat: '18K', purity: '75.0%', desc: 'Durable, used for western fine jewelry. Contains 25% alloy metals.', color: '#A88516' },
];

export default function App() {
  const [priceData, setPriceData] = useState(() => JSON.parse(localStorage.getItem('gv_v18_metal') || '[]'));
  const [forexHistory, setForexHistory] = useState(() => JSON.parse(localStorage.getItem('gv_v18_forex') || '[]'));
  const [loading, setLoading] = useState(priceData.length === 0);
  const [forexLoading, setForexLoading] = useState(true);
  const [view, setView] = useState('dashboard');
  const [calcMode, setCalcMode] = useState('jewelry'); 
  const [activeMetal, setActiveMetal] = useState('gold'); 
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [timeframe, setTimeframe] = useState(7);
  const [calc, setCalc] = useState({ tola: '', aana: '', lal: '', making: '', vat: true });
  const [currCalc, setCurrCalc] = useState({ amount: '1', source: 'USD', isSwapped: false });

  // New feature states
  const [isDark, setIsDark] = useState(() => localStorage.getItem('gv_theme') !== 'light');
  const [alerts, setAlerts] = useState(() => JSON.parse(localStorage.getItem('gv_alerts') || '[]'));
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [alertForm, setAlertForm] = useState({ type: 'gold', direction: 'below', price: '' });
  const [triggeredAlerts, setTriggeredAlerts] = useState([]);
  const [showHistoryTable, setShowHistoryTable] = useState(false);
  const [multiCurrChart, setMultiCurrChart] = useState(['USD']);
  const [showMultiCurr, setShowMultiCurr] = useState(false);
  const [shareStatus, setShareStatus] = useState(null);
  const [showHallmark, setShowHallmark] = useState(false);
  const [intlGoldPrice, setIntlGoldPrice] = useState(null);

  const chartRef = useRef(null);
  const shareCardRef = useRef(null);

  const theme = isDark ? themes.dark : themes.light;

  const currencyList = [
    { code: 'USD', flag: '\u{1F1FA}\u{1F1F8}' }, { code: 'GBP', flag: '\u{1F1EC}\u{1F1E7}' },
    { code: 'AUD', flag: '\u{1F1E6}\u{1F1FA}' }, { code: 'JPY', flag: '\u{1F1EF}\u{1F1F5}' },
    { code: 'KRW', flag: '\u{1F1F0}\u{1F1F7}' }, { code: 'AED', flag: '\u{1F1E6}\u{1F1EA}' },
    { code: 'EUR', flag: '\u{1F1EA}\u{1F1FA}' }
  ];

  // Persist theme
  useEffect(() => { localStorage.setItem('gv_theme', isDark ? 'dark' : 'light'); }, [isDark]);
  // Persist alerts
  useEffect(() => { localStorage.setItem('gv_alerts', JSON.stringify(alerts)); }, [alerts]);

  useEffect(() => {
    fetch(`${DATA_URL}?t=${Date.now()}`).then(res => res.json()).then(json => {
        setPriceData(json);
        localStorage.setItem('gv_v18_metal', JSON.stringify(json));
        setLoading(false);
    }).catch(() => setLoading(false));

    fetch(FOREX_PROXY).then(res => {
        if (!res.ok) throw new Error(`Forex API returned ${res.status}`);
        return res.json();
    }).then(json => {
        const payload = json?.data?.payload;
        if (!payload || !Array.isArray(payload) || payload.length === 0) throw new Error('Empty forex payload');
        const transformed = payload.map(day => {
          const dayRates = day.rates || [];
          const usdEntry = dayRates.find(r => (r.currency?.iso3 || r.currency?.ISO3) === 'USD');
          return {
            date: day.date,
            usdRate: parseFloat(usdEntry?.buy || 0),
            rates: dayRates.map(r => ({
              ...r,
              currency: {
                ...r.currency,
                iso3: r.currency?.iso3 || r.currency?.ISO3 || '',
              }
            }))
          };
        }).sort((a, b) => new Date(a.date) - new Date(b.date));
        setForexHistory(transformed);
        localStorage.setItem('gv_v18_forex', JSON.stringify(transformed));
        setForexLoading(false);
    }).catch((err) => {
        console.warn('Forex fetch failed:', err.message);
        setForexLoading(false);
    });

    // Fetch international gold price (XAU/USD)
    fetch('https://open.er-api.com/v6/latest/XAU')
      .then(res => res.json())
      .then(json => {
        if (json.result === 'success' && json.rates?.USD) {
          setIntlGoldPrice(1 / json.rates.USD);
        }
      })
      .catch(() => {});
  }, []);

  // Check alerts
  useEffect(() => {
    if (priceData.length === 0 && forexHistory.length === 0) return;
    const latest = priceData[priceData.length - 1];
    const latestUsd = forexHistory[forexHistory.length - 1]?.usdRate || 0;
    const newTriggered = [];
    alerts.forEach((alert, idx) => {
      const currentPrice = alert.type === 'usd' ? latestUsd : (latest?.[alert.type] || 0);
      const targetPrice = Number(alert.price);
      const triggered = alert.direction === 'below' ? currentPrice <= targetPrice : currentPrice >= targetPrice;
      if (triggered) newTriggered.push({ ...alert, idx, currentPrice });
    });
    setTriggeredAlerts(newTriggered);
  }, [priceData, forexHistory, alerts]);

  const formatRS = useCallback((num) => `\u0930\u0942 ${Math.round(num || 0).toLocaleString()}`, []);

  const themeColor = useMemo(() => {
    if (view === 'calculator' && calcMode === 'currency') return '#22c55e';
    if (activeMetal === 'gold') return '#D4AF37';
    if (activeMetal === 'silver') return '#94a3b8';
    return '#22c55e'; 
  }, [activeMetal, view, calcMode]);

  const activeDataList = useMemo(() => activeMetal === 'usd' ? forexHistory : priceData, [activeMetal, forexHistory, priceData]);
  const filteredData = useMemo(() => activeDataList.slice(-timeframe), [activeDataList, timeframe]);
  
  const getDayDiff = (id) => {
    const source = id === 'usd' ? forexHistory : priceData;
    if (source.length < 2) return { val: 'Rs. 0', isUp: true };
    const currVal = id === 'usd' ? source[source.length-1].usdRate : source[source.length-1][id];
    const prevVal = id === 'usd' ? source[source.length-2].usdRate : source[source.length-2][id];
    const diff = currVal - prevVal;
    return { val: `Rs. ${diff >= 0 ? '+' : ''}${diff.toLocaleString(undefined, {minimumFractionDigits: id === 'usd' ? 2 : 0})}`, isUp: diff >= 0 };
  };

  // Period change calculation
  const getPeriodChange = (id, days) => {
    const source = id === 'usd' ? forexHistory : priceData;
    if (source.length < 2) return { pct: 0, diff: 0, isUp: true };
    const curr = id === 'usd' ? source[source.length - 1].usdRate : source[source.length - 1][id];
    const pastIdx = Math.max(0, source.length - 1 - days);
    const past = id === 'usd' ? source[pastIdx].usdRate : source[pastIdx][id];
    const diff = curr - past;
    const pct = past !== 0 ? ((diff / past) * 100) : 0;
    return { pct, diff, isUp: diff >= 0 };
  };

  const tooltipHandler = useMemo(() => createTooltipHandler(isDark), [isDark]);

  const chartData = useMemo(() => ({
    labels: filteredData.map(d => {
        const date = new Date(d.date.replace(' ', 'T'));
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
    datasets: [{
      data: filteredData.map(d => activeMetal === 'usd' ? d.usdRate : Number(d[activeMetal]) || 0),
      borderColor: themeColor,
      borderWidth: 4,
      fill: true,
      tension: 0.4,
      pointRadius: (ctx) => (selectedPoint?.index === ctx.dataIndex ? 8 : 0),
      pointHoverRadius: 10,
      pointBackgroundColor: isDark ? '#fff' : '#18181b',
      pointBorderWidth: 3,
      backgroundColor: (context) => {
        const {ctx, chartArea} = context.chart;
        if (!chartArea) return null;
        const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        g.addColorStop(0, `${themeColor}40`);
        g.addColorStop(1, 'transparent');
        return g;
      },
    }]
  }), [filteredData, activeMetal, selectedPoint, themeColor, isDark]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { 
        legend: false, 
        tooltip: { 
            enabled: false,
            external: tooltipHandler,
            callbacks: {
                label: (ctx) => `\u0930\u0942 ${ctx.raw.toLocaleString(undefined, {minimumFractionDigits: activeMetal === 'usd' ? 2 : 0})}`,
            }
        } 
    },
    scales: {
      x: {
        display: true,
        grid: { display: true, color: theme.gridLine, borderDash: [6, 6], drawTicks: false },
        ticks: { color: theme.tickColor, font: { size: 9, weight: '700' }, maxRotation: 0, maxTicksLimit: timeframe === 7 ? 7 : 8 }
      },
      y: { display: true, position: 'right', grid: { display: true, color: theme.gridLineY, borderDash: [5, 5], drawBorder: false }, ticks: { display: false } }
    },
    onClick: (e, elements) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        const point = filteredData[index];
        setSelectedPoint({ index, date: point.date, price: activeMetal === 'usd' ? point.usdRate : point[activeMetal] });
      }
    }
  }), [filteredData, activeMetal, timeframe, theme, tooltipHandler]);

  // Multi-currency chart
  const multiCurrColors = { USD: '#22c55e', EUR: '#3b82f6', GBP: '#a855f7', AUD: '#f59e0b', JPY: '#ef4444', KRW: '#ec4899', AED: '#06b6d4' };
  const multiCurrChartData = useMemo(() => {
    const sliced = forexHistory.slice(-timeframe);
    return {
      labels: sliced.map(d => {
        const date = new Date(d.date.replace(' ', 'T'));
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }),
      datasets: multiCurrChart.map(code => {
        const color = multiCurrColors[code] || '#888';
        return {
          label: code,
          data: sliced.map(d => {
            const rate = (d.rates || []).find(r => r.currency?.iso3 === code);
            const rawRate = parseFloat(rate?.buy || 0);
            const unit = parseInt(rate?.currency?.unit || 1);
            return rawRate / unit;
          }),
          borderColor: color,
          borderWidth: 2.5,
          fill: false,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 5,
        };
      })
    };
  }, [forexHistory, timeframe, multiCurrChart]);

  const multiCurrChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { 
      legend: { display: true, position: 'top', labels: { color: theme.text, font: { size: 10, weight: '700' }, boxWidth: 12, padding: 12 } },
      tooltip: { enabled: true, backgroundColor: isDark ? 'rgba(10,10,10,0.8)' : 'rgba(255,255,255,0.9)', titleColor: isDark ? '#fff' : '#18181b', bodyColor: isDark ? '#fff' : '#18181b', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', borderWidth: 1 },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: theme.tickColor, font: { size: 9, weight: '700' }, maxRotation: 0, maxTicksLimit: 8 } },
      y: { position: 'right', grid: { color: theme.gridLineY, borderDash: [5, 5] }, ticks: { color: theme.tickColor, font: { size: 9 } } },
    }
  }), [isDark, theme]);

  // Share handler
  const handleShare = async () => {
    const latest = priceData[priceData.length - 1];
    const latestUsd = forexHistory[forexHistory.length - 1]?.usdRate || 0;
    const text = `GoldView Nepal - ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}\n\n24K Gold: ${formatRS(latest?.gold)}/tola\nSilver: ${formatRS(latest?.silver)}/tola\nUSD/NPR: ${latestUsd.toFixed(2)}\n\nhttps://viewgold.vercel.app`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: 'GoldView Nepal', text });
        setShareStatus('shared');
      } catch { setShareStatus(null); }
    } else {
      await navigator.clipboard.writeText(text);
      setShareStatus('copied');
    }
    setTimeout(() => setShareStatus(null), 2000);
  };

  const addAlert = () => {
    if (!alertForm.price) return;
    setAlerts([...alerts, { ...alertForm, id: Date.now() }]);
    setAlertForm({ type: 'gold', direction: 'below', price: '' });
    setShowAlertForm(false);
  };
  const removeAlert = (id) => setAlerts(alerts.filter(a => a.id !== id));
  const dismissTriggeredAlert = (idx) => setTriggeredAlerts(triggeredAlerts.filter((_, i) => i !== idx));

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bg, color: '#D4AF37' }}>
      <RefreshCcw className="w-10 h-10 animate-spin" />
    </div>
  );

  const latestPrice = priceData[priceData.length - 1];
  const latestUsdRate = forexHistory[forexHistory.length - 1]?.usdRate || 0;

  return (
    <HelmetProvider>
      <div className="min-h-screen font-sans pb-40 overflow-x-hidden relative transition-colors duration-500" style={{ backgroundColor: theme.bg, color: theme.text }}>
        <Helmet>
            <title>Gold Price Nepal Today | USD to NPR Rate - GoldView</title>
            <meta name="description" content="Check live gold, silver and dollar prices in Nepal. Official NRB exchange rates." />
            <link rel="canonical" href="https://viewgold.vercel.app/" />
            <script type="application/ld+json">
             {JSON.stringify({
               "@context": "https://schema.org", "@type": "WebApplication",
               "name": "GoldView Nepal", "url": "https://viewgold.vercel.app",
               "description": "Live Gold and Silver prices in Nepal with NRB Currency Exchange rates.",
               "applicationCategory": "FinanceApplication", "operatingSystem": "All"
             })}
            </script>
        </Helmet>

        {/* Triggered Alerts Banner */}
        {triggeredAlerts.length > 0 && (
          <div className="px-6 pt-4 space-y-2 relative z-20">
            {triggeredAlerts.map((a, i) => (
              <div key={i} className="flex items-center gap-3 p-4 rounded-2xl border animate-in slide-in-from-top-2 duration-300"
                style={{ backgroundColor: a.direction === 'below' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)', borderColor: a.direction === 'below' ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)' }}>
                <Bell className="w-4 h-4 shrink-0" style={{ color: a.direction === 'below' ? '#ef4444' : '#22c55e' }} />
                <span className="text-xs font-bold flex-1">
                  {a.type.toUpperCase()} is now {formatRS(a.currentPrice)} {' - '} {a.direction === 'below' ? 'dropped below' : 'rose above'} your target of {formatRS(Number(a.price))}
                </span>
                <button onClick={() => dismissTriggeredAlert(i)} className="p-1 rounded-full" style={{ backgroundColor: theme.card }}><X className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
        )}

        {/* Header */}
        <header className="p-8 pt-16 flex justify-between items-end relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full shadow-lg animate-pulse" style={{ backgroundColor: themeColor, boxShadow: `0 0 10px ${themeColor}` }}></div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] transition-colors duration-500" style={{ color: themeColor }}>Market Update</p>
            </div>
            <h1 className="text-4xl font-black tracking-tighter" style={{ color: theme.text }}>GoldView</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsDark(!isDark)} className="p-4 rounded-3xl border active:scale-90 transition-all backdrop-blur-xl" style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}>
              {isDark ? <Sun className="w-5 h-5" style={{ color: '#f59e0b' }} /> : <Moon className="w-5 h-5" style={{ color: '#6366f1' }} />}
            </button>
            <button onClick={() => window.location.reload()} className="p-4 rounded-3xl border active:scale-90 transition-all backdrop-blur-xl" style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}>
              <RefreshCcw className={`w-5 h-5 transition-colors duration-500 ${forexLoading ? 'animate-spin' : ''}`} style={{ color: themeColor }} />
            </button>
          </div>
        </header>

        {/* ─── MARKET DASHBOARD ─── */}
        <div style={{ display: view === 'dashboard' ? 'block' : 'none' }}>
          <main className="px-6 space-y-6 relative z-10 animate-in fade-in duration-500">

            {/* Price Cards */}
            <div className="space-y-4">
              {['gold', 'silver', 'usd'].map((type) => {
                 const isActive = activeMetal === type;
                 const diff = getDayDiff(type);
                 const val = type === 'usd' ? latestUsdRate : (latestPrice?.[type] || 0);
                 const meta = {
                   gold: { label: '24K Chhapawal Gold', sub: 'per tola', color: '#D4AF37' },
                   silver: { label: 'Pure Silver', sub: 'per tola', color: '#94a3b8' },
                   usd: { label: 'USD to NPR', sub: 'Official Buying Rate', color: '#22c55e' }
                 }[type];
                 return (
                  <div key={type} onClick={() => { setActiveMetal(type); setSelectedPoint(null); }}
                    className={`p-7 rounded-[2.8rem] border-[1.5px] transition-all duration-300 cursor-pointer backdrop-blur-xl relative overflow-hidden`}
                    style={{
                      backgroundColor: isActive ? (isDark ? `${meta.color}18` : `${meta.color}12`) : theme.card,
                      borderColor: isActive ? `${meta.color}40` : theme.cardBorder,
                      opacity: isActive ? 1 : 0.5,
                      transform: isActive ? 'scale(1.02)' : 'scale(1)',
                    }}>
                    <div className="flex justify-between items-start mb-2 text-[10px] font-black uppercase tracking-widest">
                      <div style={{ color: theme.textMuted }}>{meta.label}<p className="text-[8px] mt-0.5" style={{ color: theme.textDim }}>{meta.sub}</p></div>
                      {type === 'usd' && forexLoading ? <RefreshCcw className="w-3 h-3 text-green-500 animate-spin" /> : 
                      <div className={`px-2.5 py-1 rounded-xl border ${diff.isUp ? 'border-green-500/20' : 'border-red-500/20'}`} style={{ backgroundColor: diff.isUp ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: diff.isUp ? '#22c55e' : '#ef4444' }}>{diff.val}</div>}
                    </div>
                    <div className="flex justify-between items-end text-4xl font-black tracking-tighter">
                      <h2 style={{ color: theme.text }}>{type === 'usd' ? `\u0930\u0942 ${val.toFixed(2)}` : formatRS(val)}</h2>
                      {isActive && <TrendingUp className={`w-5 h-5 ${diff.isUp ? 'text-green-500' : 'text-red-500 rotate-180'}`} />}
                    </div>
                  </div>
                 );
              })}
            </div>

            {/* Karat Prices */}
            {activeMetal === 'gold' && latestPrice?.gold && (
              <section className="rounded-[2.5rem] p-6 border backdrop-blur-xl" style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}>
                <h3 className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: theme.textMuted }}>
                  <Coins className="w-4 h-4" style={{ color: '#D4AF37' }} /> Gold Karat Prices
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(karatMultipliers).map(([karat, mult]) => (
                    <div key={karat} className="p-4 rounded-2xl border" style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.03)', borderColor: theme.cardBorder }}>
                      <p className="text-[9px] font-black uppercase tracking-wider mb-1" style={{ color: hallmarkData.find(h => h.karat === karat)?.color || '#D4AF37' }}>{karat}</p>
                      <p className="text-lg font-black" style={{ color: theme.text }}>{formatRS(latestPrice.gold * mult)}</p>
                      <p className="text-[8px] mt-0.5" style={{ color: theme.textDim }}>per tola</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Price Change Summary */}
            <section className="rounded-[2.5rem] p-6 border backdrop-blur-xl" style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}>
              <h3 className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: theme.textMuted }}>
                <Activity className="w-4 h-4" style={{ color: themeColor }} /> {activeMetal.toUpperCase()} Performance
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {[{ label: '7 Days', days: 7 }, { label: '30 Days', days: 30 }, { label: '90 Days', days: 90 }].map(({ label, days }) => {
                  const change = getPeriodChange(activeMetal, days);
                  return (
                    <div key={label} className="p-4 rounded-2xl border text-center" style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.03)', borderColor: theme.cardBorder }}>
                      <p className="text-[8px] font-black uppercase tracking-wider mb-2" style={{ color: theme.textDim }}>{label}</p>
                      <p className="text-lg font-black" style={{ color: change.isUp ? '#22c55e' : '#ef4444' }}>
                        {change.isUp ? '+' : ''}{change.pct.toFixed(1)}%
                      </p>
                      <p className="text-[9px] font-bold mt-0.5" style={{ color: theme.textMuted }}>
                        {change.isUp ? '+' : ''}{activeMetal === 'usd' ? change.diff.toFixed(2) : Math.round(change.diff).toLocaleString()}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* International Gold Price */}
            {intlGoldPrice && activeMetal === 'gold' && (
              <section className="rounded-[2.5rem] p-6 border backdrop-blur-xl" style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}>
                <h3 className="text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: theme.textMuted }}>
                  <Globe className="w-4 h-4" style={{ color: '#3b82f6' }} /> International Spot Price
                </h3>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-3xl font-black" style={{ color: theme.text }}>${intlGoldPrice.toFixed(2)}</p>
                    <p className="text-[9px] font-bold mt-1" style={{ color: theme.textDim }}>XAU/USD per troy ounce</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black" style={{ color: '#D4AF37' }}>{formatRS(latestPrice?.gold)}</p>
                    <p className="text-[9px] font-bold" style={{ color: theme.textDim }}>Nepal per tola</p>
                  </div>
                </div>
              </section>
            )}

            {/* Quick Actions Row */}
            <div className="flex gap-3">
              <button onClick={handleShare} className="flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl border active:scale-95 transition-all" style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}>
                {shareStatus === 'copied' ? <Check className="w-4 h-4 text-green-500" /> : shareStatus === 'shared' ? <Check className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4" style={{ color: themeColor }} />}
                <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: theme.textMuted }}>{shareStatus === 'copied' ? 'Copied!' : shareStatus === 'shared' ? 'Shared!' : 'Share'}</span>
              </button>
              <button onClick={() => setShowAlertForm(!showAlertForm)} className="flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl border active:scale-95 transition-all" style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}>
                <Bell className="w-4 h-4" style={{ color: themeColor }} />
                <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: theme.textMuted }}>Alert{alerts.length > 0 ? ` (${alerts.length})` : ''}</span>
              </button>
              <button onClick={() => setShowHallmark(!showHallmark)} className="flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl border active:scale-95 transition-all" style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}>
                <Shield className="w-4 h-4" style={{ color: themeColor }} />
                <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: theme.textMuted }}>Purity</span>
              </button>
            </div>

            {/* Alert Form */}
            {showAlertForm && (
              <section className="rounded-[2.5rem] p-6 border backdrop-blur-xl animate-in slide-in-from-top-2 duration-300" style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}>
                <h3 className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: theme.textMuted }}>
                  <Bell className="w-4 h-4" style={{ color: themeColor }} /> Set Price Alert
                </h3>
                <div className="flex gap-3 mb-4">
                  {['gold', 'silver', 'usd'].map(t => (
                    <button key={t} onClick={() => setAlertForm({ ...alertForm, type: t })} className="flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all border" style={{ backgroundColor: alertForm.type === t ? themeColor : 'transparent', color: alertForm.type === t ? (isDark ? '#000' : '#000') : theme.textMuted, borderColor: alertForm.type === t ? themeColor : theme.cardBorder }}>{t}</button>
                  ))}
                </div>
                <div className="flex gap-3 mb-4">
                  {['below', 'above'].map(d => (
                    <button key={d} onClick={() => setAlertForm({ ...alertForm, direction: d })} className="flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all border flex items-center justify-center gap-1.5" style={{ backgroundColor: alertForm.direction === d ? (d === 'below' ? '#ef4444' : '#22c55e') : 'transparent', color: alertForm.direction === d ? '#fff' : theme.textMuted, borderColor: alertForm.direction === d ? 'transparent' : theme.cardBorder }}>
                      {d === 'below' ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}{d === 'below' ? 'Drops Below' : 'Rises Above'}
                    </button>
                  ))}
                </div>
                <input type="number" placeholder="Target price (Rs)" className="w-full p-5 rounded-2xl font-black text-lg outline-none border mb-4 text-center" style={{ backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text, caretColor: themeColor, fontSize: '16px' }} value={alertForm.price} onChange={e => setAlertForm({ ...alertForm, price: e.target.value })} />
                <button onClick={addAlert} className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider active:scale-95 transition-all" style={{ backgroundColor: themeColor, color: '#000' }}>Set Alert</button>
                
                {alerts.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-wider" style={{ color: theme.textDim }}>Active Alerts</p>
                    {alerts.map(a => (
                      <div key={a.id} className="flex items-center justify-between p-3 rounded-xl border" style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.03)', borderColor: theme.cardBorder }}>
                        <span className="text-xs font-bold" style={{ color: theme.text }}>{a.type.toUpperCase()} {a.direction === 'below' ? 'drops below' : 'rises above'} {formatRS(Number(a.price))}</span>
                        <button onClick={() => removeAlert(a.id)} className="p-1"><X className="w-3.5 h-3.5" style={{ color: '#ef4444' }} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Hallmark Info */}
            {showHallmark && (
              <section className="rounded-[2.5rem] p-6 border backdrop-blur-xl animate-in slide-in-from-top-2 duration-300" style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}>
                <h3 className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: theme.textMuted }}>
                  <Shield className="w-4 h-4" style={{ color: '#D4AF37' }} /> Gold Purity Guide
                </h3>
                <div className="space-y-3">
                  {hallmarkData.map(h => (
                    <div key={h.karat} className="p-4 rounded-2xl border" style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.03)', borderColor: theme.cardBorder }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-black" style={{ color: h.color }}>{h.karat}</span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-lg" style={{ backgroundColor: `${h.color}20`, color: h.color }}>{h.purity} pure</span>
                      </div>
                      <p className="text-[11px] leading-relaxed" style={{ color: theme.textMuted }}>{h.desc}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-4 rounded-2xl border" style={{ backgroundColor: isDark ? 'rgba(34,197,94,0.08)' : 'rgba(34,197,94,0.05)', borderColor: 'rgba(34,197,94,0.15)' }}>
                  <p className="text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: '#22c55e' }}>Tip</p>
                  <p className="text-[11px] leading-relaxed" style={{ color: theme.textMuted }}>Always check for the Nepal Bureau of Standards and Metrology (NBSM) hallmark stamp when buying gold jewelry in Nepal. It guarantees purity.</p>
                </div>
              </section>
            )}

            {/* Price Trend Chart */}
            <section className="border rounded-[3.5rem] p-9 backdrop-blur-xl shadow-xl" style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}>
              <div className="flex justify-between items-center mb-8 px-1 w-full">
                <h3 className="text-xl font-black tracking-tight flex items-center gap-3"><Activity className="w-5 h-5" style={{ color: themeColor }} /> Price Trend</h3>
                <div className="flex rounded-full p-1 border" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderColor: theme.cardBorder }}>
                  {[7, 30, 90].map((t) => (<button key={t} onClick={() => { setTimeframe(t); setSelectedPoint(null); }} className="px-3 py-1.5 rounded-full text-[9px] font-black transition-all" style={timeframe === t ? { backgroundColor: themeColor, color: '#000', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' } : { color: theme.textDim }}>{t === 7 ? '7D' : t === 30 ? '1M' : '3M'}</button>))}
                </div>
              </div>
              <div className="h-64 relative w-full"><Line ref={chartRef} data={chartData} options={chartOptions} redraw={false} /></div>
              
              {/* Selected Point Detail */}
              <div className={`mt-8 transition-all duration-500 overflow-hidden ${selectedPoint ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}>
                {selectedPoint && (
                  <div className="border-2 rounded-[2.8rem] p-7 flex flex-wrap gap-5 justify-between items-center w-full backdrop-blur-xl relative" style={{ backgroundColor: theme.card, borderColor: `${themeColor}40` }}>
                    <div className="absolute inset-0 rounded-[2.8rem] pointer-events-none" style={{ backgroundColor: theme.overlayBg }} />
                    <div className="flex items-center gap-5 flex-1 min-w-[220px]">
                      <div className="w-14 h-14 rounded-3xl flex items-center justify-center border shrink-0" style={{ borderColor: `${themeColor}30`, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}>
                        <Calendar className="w-7 h-7" style={{ color: themeColor }} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] mb-1" style={{ color: themeColor }}>Historical Point</p>
                        <p className="text-lg font-black leading-tight" style={{ color: theme.text }}>
                            {new Date(selectedPoint.date.replace(' ', 'T')).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-[9px] font-black uppercase mb-1" style={{ color: theme.textDim }}>Market Rate</p>
                        <p className="text-3xl font-black" style={{ color: theme.text }}>{activeMetal === 'usd' ? `\u0930\u0942 ${selectedPoint.price.toFixed(2)}` : formatRS(selectedPoint.price)}</p>
                      </div>
                      <button onClick={() => setSelectedPoint(null)} className="p-3 rounded-full active:scale-90 transition-all border" style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}><X className="w-5 h-5" style={{ color: theme.textMuted }} /></button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Multi-Currency Chart */}
            <section className="rounded-[2.5rem] p-6 border backdrop-blur-xl" style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}>
              <button onClick={() => setShowMultiCurr(!showMultiCurr)} className="w-full flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2" style={{ color: theme.textMuted }}>
                  <DollarSign className="w-4 h-4" style={{ color: '#22c55e' }} /> Multi-Currency Chart
                </h3>
                {showMultiCurr ? <ChevronUp className="w-4 h-4" style={{ color: theme.textDim }} /> : <ChevronDown className="w-4 h-4" style={{ color: theme.textDim }} />}
              </button>
              {showMultiCurr && (
                <div className="mt-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {currencyList.map(c => (
                      <button key={c.code} onClick={() => setMultiCurrChart(prev => prev.includes(c.code) ? prev.filter(x => x !== c.code) : [...prev, c.code])}
                        className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border transition-all"
                        style={{ backgroundColor: multiCurrChart.includes(c.code) ? multiCurrColors[c.code] : 'transparent', color: multiCurrChart.includes(c.code) ? '#fff' : theme.textMuted, borderColor: multiCurrChart.includes(c.code) ? multiCurrColors[c.code] : theme.cardBorder }}>
                        {c.flag} {c.code}
                      </button>
                    ))}
                  </div>
                  {multiCurrChart.length > 0 && (
                    <div className="h-56"><Line data={multiCurrChartData} options={multiCurrChartOptions} /></div>
                  )}
                </div>
              )}
            </section>

            {/* Historical Price Table */}
            <section className="rounded-[2.5rem] p-6 border backdrop-blur-xl" style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}>
              <button onClick={() => setShowHistoryTable(!showHistoryTable)} className="w-full flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2" style={{ color: theme.textMuted }}>
                  <Table className="w-4 h-4" style={{ color: themeColor }} /> Historical Prices
                </h3>
                {showHistoryTable ? <ChevronUp className="w-4 h-4" style={{ color: theme.textDim }} /> : <ChevronDown className="w-4 h-4" style={{ color: theme.textDim }} />}
              </button>
              {showHistoryTable && (
                <div className="mt-4 animate-in slide-in-from-top-2 duration-300 overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[8px] font-black uppercase tracking-wider" style={{ color: theme.textDim }}>
                        <th className="pb-3 pl-2">Date</th>
                        <th className="pb-3 text-right">Gold 24K</th>
                        <th className="pb-3 text-right">Silver</th>
                        <th className="pb-3 text-right pr-2">USD/NPR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...priceData].reverse().slice(0, 30).map((day, i) => {
                        const fxDay = forexHistory.find(f => f.date === day.date);
                        return (
                          <tr key={i} className="border-t text-xs font-bold" style={{ borderColor: theme.cardBorder }}>
                            <td className="py-3 pl-2" style={{ color: theme.textMuted }}>{new Date(day.date.replace(' ', 'T')).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                            <td className="py-3 text-right" style={{ color: '#D4AF37' }}>{formatRS(day.gold)}</td>
                            <td className="py-3 text-right" style={{ color: '#94a3b8' }}>{formatRS(day.silver)}</td>
                            <td className="py-3 text-right pr-2" style={{ color: '#22c55e' }}>{fxDay ? fxDay.usdRate.toFixed(2) : '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

          </main>
        </div>

        {/* ─── CALCULATOR TAB ─── */}
        <div style={{ display: view === 'calculator' ? 'block' : 'none' }}>
          <main className="px-6 relative z-10 animate-in zoom-in-95 duration-500">
            <div className="border rounded-[4rem] p-8 backdrop-blur-xl shadow-xl" style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}>
              <div className="flex p-1 rounded-3xl mb-10 border" style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.06)', borderColor: theme.cardBorder }}>
                  <button onClick={() => setCalcMode('jewelry')} style={calcMode === 'jewelry' ? { backgroundColor: themeColor } : {}} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase transition-all duration-500`} style2={calcMode === 'jewelry' ? { color: '#000' } : { color: theme.textDim }}
                    style={calcMode === 'jewelry' ? { backgroundColor: themeColor, color: '#000' } : { color: theme.textDim }}>Jewelry</button>
                  <button onClick={() => setCalcMode('currency')} className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase transition-all duration-500" style={calcMode === 'currency' ? { backgroundColor: '#22c55e', color: '#000' } : { color: theme.textDim }}>Currency</button>
              </div>

              {calcMode === 'jewelry' ? (
                <div className="space-y-6">
                  <div className="flex p-1 rounded-2xl mb-8 border w-fit mx-auto" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderColor: theme.cardBorder }}>
                      {['gold', 'silver'].map(metal => (<button key={metal} onClick={() => setActiveMetal(metal)} className="px-8 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all" style={{ backgroundColor: activeMetal === metal ? (metal === 'gold' ? '#D4AF37' : '#94a3b8') : 'transparent', color: activeMetal === metal ? '#000' : theme.textDim }}>{metal}</button>))}
                  </div>
                  <div className="mb-8 p-6 rounded-[2.2rem] border-2 flex items-center justify-between" style={{ borderColor: `${themeColor}80`, backgroundColor: `${themeColor}10` }}>
                    <div className="flex items-center gap-4"><Coins className="w-8 h-8" style={{ color: themeColor }} /><p className="text-xl font-black uppercase" style={{ color: theme.text }}>{activeMetal === 'gold' ? '24K Gold' : 'Pure Silver'}</p></div>
                    <div className="text-right text-[10px] font-black" style={{ color: theme.textDim }}>{formatRS(latestPrice?.[activeMetal === 'usd' ? 'gold' : activeMetal])}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {['tola', 'aana', 'lal'].map((unit) => (<div key={unit}><label className="text-[10px] font-black uppercase mb-2 block ml-3 tracking-[0.2em]" style={{ color: theme.textDim }}>{unit}</label>
                    <input type="number" className="w-full border-2 p-5 rounded-3xl text-center font-black text-2xl outline-none transition-all" style={{ backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text, caretColor: themeColor, fontSize: '16px' }} value={calc[unit]} onChange={(e) => setCalc({...calc, [unit]: e.target.value})} /></div>))}
                  </div>
                  <input type="number" placeholder="Making Charges (Rs)" className="w-full border-2 p-6 rounded-3xl font-black text-lg outline-none transition-all" style={{ backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text, fontSize: '16px' }} value={calc.making} onChange={(e) => setCalc({...calc, making: e.target.value})} />
                  <div onClick={() => setCalc({...calc, vat: !calc.vat})} className="flex justify-between items-center p-6 rounded-[2.2rem] border cursor-pointer" style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}>
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all" style={{ borderColor: calc.vat ? themeColor : theme.inputBorder, backgroundColor: calc.vat ? themeColor : 'transparent' }}>
                        {calc.vat && <Zap className="w-3.5 h-3.5 text-black fill-black" />}
                      </div>
                      <span className="font-bold" style={{ color: theme.textMuted }}>13% Govt VAT</span>
                    </div>
                  </div>
                  <div className="p-12 rounded-[3.5rem] text-black text-center shadow-2xl transition-all" style={{ background: `linear-gradient(135deg, ${themeColor}, ${activeMetal === 'gold' ? '#b8860b' : '#4b5563'})` }}>
                     <p className="text-[11px] font-black uppercase tracking-[0.4em] mb-2 opacity-60">Estimated Total</p>
                     <h3 className="text-5xl font-black tracking-tighter">{formatRS(( ( (Number(calc.tola)||0) + (Number(calc.aana)||0)/16 + (Number(calc.lal)||0)/192 ) * (latestPrice?.[activeMetal === 'usd' ? 'gold' : activeMetal]) + (Number(calc.making)||0) ) * (calc.vat ? 1.13 : 1))}</h3>
                  </div>
                </div>
              ) : (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="rounded-[3rem] p-7 border space-y-10" style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.04)', borderColor: theme.cardBorder }}>
                        <div className="flex items-start justify-between px-1">
                            <div className="flex-1 flex flex-col items-start gap-4">
                                <p className="text-[8px] font-black uppercase tracking-[0.2em]" style={{ color: theme.textDim }}>YOU SEND</p>
                                <div className="flex flex-col items-center gap-1.5 w-fit">
                                    <span className="text-4xl leading-none">{currCalc.isSwapped ? '\u{1F1F3}\u{1F1F5}' : currencyList.find(c => c.code === currCalc.source)?.flag}</span>
                                    {currCalc.isSwapped ? <span className="text-[11px] font-black mt-1" style={{ color: theme.text }}>NPR</span> : 
                                    <select className="bg-transparent font-black text-[11px] outline-none mt-1 text-center" style={{ color: theme.text }} value={currCalc.source} onChange={(e) => setCurrCalc({...currCalc, source: e.target.value})}>
                                        {currencyList.map(c => <option key={c.code} value={c.code} style={{ backgroundColor: isDark ? '#18181b' : '#fff' }}>{c.code}</option>)}
                                    </select>}
                                </div>
                            </div>
                            <div className="px-4 pt-8">
                                <button onClick={() => setCurrCalc({...currCalc, isSwapped: !currCalc.isSwapped})} className="p-4 bg-green-500/20 rounded-2xl active:rotate-180 transition-all border border-green-500/20 shadow-lg shadow-green-500/10"><ArrowRightLeft className="w-5 h-5 text-green-500" /></button>
                            </div>
                            <div className="flex-1 flex flex-col items-end gap-4 text-right">
                                <p className="text-[8px] font-black uppercase tracking-[0.2em]" style={{ color: theme.textDim }}>RECEIVER GETS</p>
                                <div className="flex flex-col items-center gap-1.5 w-fit ml-auto">
                                    <span className="text-4xl leading-none">{currCalc.isSwapped ? currencyList.find(c => c.code === currCalc.source)?.flag : '\u{1F1F3}\u{1F1F5}'}</span>
                                    {currCalc.isSwapped ? <select className="bg-transparent font-black text-[11px] outline-none mt-1 text-center" style={{ color: theme.text }} value={currCalc.source} onChange={(e) => setCurrCalc({...currCalc, source: e.target.value})}>
                                        {currencyList.map(c => <option key={c.code} value={c.code} style={{ backgroundColor: isDark ? '#18181b' : '#fff' }}>{c.code}</option>)}
                                    </select> : <span className="text-[11px] font-black mt-1" style={{ color: theme.text }}>NPR</span>}
                                </div>
                            </div>
                        </div>
                        <div className="relative">
                            <input type="number" placeholder="Amount" className="w-full border-2 p-8 rounded-[2.5rem] font-black text-4xl outline-none text-center transition-all" style={{ backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text, fontSize: '16px' }} value={currCalc.amount} onChange={(e) => setCurrCalc({...currCalc, amount: e.target.value})} />
                            <div className="absolute left-6 top-1/2 -translate-y-1/2 opacity-20"><Globe className="w-8 h-8 text-[#22c55e]" /></div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-green-500 to-green-700 p-12 rounded-[3.5rem] text-black text-center shadow-xl relative overflow-hidden group">
                       <div className="absolute top-4 right-6 text-7xl opacity-10 font-bold pointer-events-none">{currCalc.isSwapped ? currencyList.find(c => c.code === currCalc.source)?.flag : '\u{1F1F3}\u{1F1F5}'}</div>
                       <div className="flex flex-col items-center gap-2 mb-2 relative z-10">
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-black/10 rounded-full border border-black/5">
                              <span className="text-[10px] font-black">{currCalc.isSwapped ? '\u{1F1F3}\u{1F1F5} NPR' : `${currencyList.find(c => c.code === currCalc.source)?.flag} ${currCalc.source}`}</span>
                              <ArrowDown className="w-3 h-3 opacity-40" />
                              <span className="text-[10px] font-black bg-white/30 px-2 rounded-md">{currCalc.isSwapped ? `${currencyList.find(c => c.code === currCalc.source)?.flag} ${currCalc.source}` : '\u{1F1F3}\u{1F1F5} NPR'}</span>
                          </div>
                          <p className="text-[11px] font-black uppercase tracking-[0.4em] opacity-60">Payout Estimate</p>
                       </div>
                       <h3 className="text-5xl font-black tracking-tighter relative z-10">
                          {(() => {
                            const latestRates = forexHistory[forexHistory.length - 1]?.rates || [];
                            const rateData = latestRates.find(r => (r.currency?.iso3 || r.currency?.ISO3) === currCalc.source);
                            const rawRate = parseFloat(rateData?.buy || 133);
                            const unit = parseInt(rateData?.currency?.unit || 1);
                            const amt = Number(currCalc.amount) || 0;
                            if (currCalc.isSwapped) return ((amt / rawRate) * unit).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
                            return formatRS((amt / unit) * rawRate);
                          })()}
                       </h3>
                    </div>
                </div>
              )}
            </div>
          </main>
        </div>

        {/* Bottom Nav */}
        <nav className="fixed bottom-12 left-10 right-10 h-20 backdrop-blur-[50px] rounded-[3rem] border flex justify-around items-center px-4 z-50 shadow-2xl" style={{ backgroundColor: theme.navBg, borderColor: theme.cardBorder }}>
          <button onClick={() => setView('dashboard')} className="flex flex-col items-center gap-1.5 px-12 py-3.5 rounded-[2.2rem] transition-all duration-300" style={view === 'dashboard' ? { backgroundColor: themeColor, color: '#000', boxShadow: `0 0 40px ${themeColor}40` } : { color: theme.textDim }}>
            <LayoutDashboard className={`w-6 h-6 ${view === 'dashboard' ? 'fill-black' : ''}`} />
            <span className="text-[9px] font-black uppercase tracking-widest">Market</span>
          </button>
          <button onClick={() => { setView('calculator'); if(activeMetal === 'usd') setActiveMetal('gold'); }} className="flex flex-col items-center gap-1.5 px-12 py-3.5 rounded-[2.2rem] transition-all duration-300" style={view === 'calculator' ? { backgroundColor: themeColor, color: '#000', boxShadow: `0 0 40px ${themeColor}40` } : { color: theme.textDim }}>
            <Calculator className={`w-6 h-6 ${view === 'calculator' ? 'fill-black' : ''}`} />
            <span className="text-[9px] font-black uppercase tracking-widest">Calculator</span>
          </button>
        </nav>

        {/* Footer */}
        <footer className="mt-12 px-8 pb-12 text-[10px] leading-relaxed border-t pt-10" style={{ borderColor: theme.footerBorder, color: theme.textDim }}>
          <h2 className="font-black mb-2 uppercase tracking-widest" style={{ color: theme.textMuted }}>Live Gold and Silver Prices in Nepal</h2>
          <p>GoldView provides real-time updates for <strong>24K Chhapawal Gold</strong> and <strong>Pure Silver</strong> rates in Nepal based on market dealers.</p>
          <h2 className="font-black mt-6 mb-2 uppercase tracking-widest" style={{ color: theme.textMuted }}>NRB Official Exchange Rates</h2>
          <p>Get accurate <strong>USD to NPR</strong>, GBP to NPR and other foreign exchange rates directly from the official <strong>Nepal Rastra Bank (NRB)</strong> buying rates.</p>
          <div className="mt-12 text-center">
            <p className="font-black uppercase tracking-[0.3em]" style={{ color: theme.textDim }}>Made by @Timeswantstocode</p>
          </div>
        </footer>

        <Analytics />
        <SpeedInsights />
      </div>
    </HelmetProvider>
  );
}
