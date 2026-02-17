
/**
 * GoldView Nepal - Professional Gold, Silver & Forex Tracker
 * Developed by: @Timeswantstocode
 * 
 * Features:
 * - Real-time Data Sync (Metal + Forex)
 * - Imperative Chart.js Gradient Engine
 * - VAPID Push Notification System
 * - iOS PWA Installation Guide logic
 * - Comprehensive SEO (Helmet + JSON-LD)
 * - Dual-Mode Financial Calculators
 */

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import { 
  Chart as ChartJS, registerables, Filler, Tooltip, 
  Legend, CategoryScale, LinearScale, PointElement, LineElement 
} from 'chart.js';
import { 
  LayoutDashboard, Calculator, RefreshCcw, TrendingUp, 
  X, Calendar, Zap, Activity, Coins, ArrowRightLeft, Globe, ArrowDown, Bell
} from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Helmet, HelmetProvider } from 'react-helmet-async';

// Register ChartJS Components
ChartJS.register(...registerables, Filler, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement);

// Global Chart Defaults for high-end feel
ChartJS.defaults.animation = { duration: 600, easing: 'easeOutQuart' };

// Configuration Constants
const DATA_URL = "https://raw.githubusercontent.com/Timeswantstocode/GoldView/main/data.json";
const FOREX_PROXY = "/api/forex";
const PRIMARY_DOMAIN = "https://viewgold.vercel.app"; 
const VAPID_PUBLIC_KEY = "BK4UiqZsmzcWoQR_JFmuAhQQ2R7JQEIxC83Tppc8VxBwd4a3mXztqyv31Q9XJ3Ab6Yq_aqbExGlNMX2NP2j5zAQ";

// --- UTILITIES: DATA PARSING & THEMING ---
const parsePrice = (val) => {
  if (val == null) return 0;
  if (typeof val === 'number') return val;
  const n = parseFloat(String(val).replace(/,/g, '').trim());
  return isNaN(n) ? 0 : n;
};

const hexToRgb = (hex) => {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? `${parseInt(r[1], 16)}, ${parseInt(r[2], 16)}, ${parseInt(r[3], 16)}` : '212, 175, 55';
};

// --- CUSTOM TOOLTIP ENGINE ---
const getOrCreateTooltip = (chart) => {
  let tooltipEl = chart.canvas.parentNode.querySelector('div.gv-tooltip');
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'gv-tooltip';
    Object.assign(tooltipEl.style, {
      background: 'rgba(5, 5, 5, 0.85)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRadius: '12px',
      color: 'white',
      opacity: 0,
      pointerEvents: 'none',
      position: 'absolute',
      transform: 'translate(-50%, 0)',
      transition: 'all .15s ease',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      padding: '8px 12px',
      zIndex: '100',
      boxShadow: '0 15px 40px rgba(0,0,0,0.6)',
    });
    chart.canvas.parentNode.appendChild(tooltipEl);
  }
  return tooltipEl;
};

const externalTooltipHandler = (context) => {
  const {chart, tooltip} = context;
  const tooltipEl = getOrCreateTooltip(chart);
  if (tooltip.opacity === 0) { tooltipEl.style.opacity = 0; return; }
  if (tooltip.body) {
    const titleLines = tooltip.title || [];
    const bodyLines = tooltip.body.map(b => b.lines);
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.flexDirection = 'column';
    div.style.alignItems = 'center';
    
    titleLines.forEach(title => {
      const span = document.createElement('span');
      Object.assign(span.style, { 
        fontSize: '8px', fontWeight: '800', textTransform: 'uppercase', 
        marginBottom: '4px', opacity: '0.6', whiteSpace: 'nowrap', letterSpacing: '0.1em' 
      });
      span.innerText = title;
      div.appendChild(span);
    });
    
    bodyLines.forEach((body) => {
      const span = document.createElement('span');
      Object.assign(span.style, { 
        fontSize: '14px', fontWeight: '900', letterSpacing: '-0.02em', whiteSpace: 'nowrap' 
      });
      span.innerText = body;
      div.appendChild(span);
    });
    
    while (tooltipEl.firstChild) { tooltipEl.firstChild.remove(); }
    tooltipEl.appendChild(div);
  }
  const {offsetLeft: positionX, offsetTop: positionY} = chart.canvas;
  tooltipEl.style.opacity = 1;
  tooltipEl.style.left = positionX + tooltip.caretX + 'px';
  tooltipEl.style.top = positionY + tooltip.caretY - 75 + 'px';
};

export default function App() {
  // State: Data Core
  const [priceData, setPriceData] = useState(() => JSON.parse(localStorage.getItem('gv_v18_metal') || '[]'));
  const [forexHistory, setForexHistory] = useState(() => JSON.parse(localStorage.getItem('gv_v18_forex') || '[]'));
  const [loading, setLoading] = useState(priceData.length === 0);
  const [forexLoading, setForexLoading] = useState(true);

  // State: UI Navigation
  const [view, setView] = useState('dashboard');
  const [calcMode, setCalcMode] = useState('jewelry'); 
  const [tradeMode, setTradeMode] = useState('buy'); 
  const [activeMetal, setActiveMetal] = useState('gold'); 
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [timeframe, setTimeframe] = useState(7);

  // State: Calculators Data
  const [calc, setCalc] = useState({ tola: '', aana: '', lal: '', making: '', vat: true });
  const [currCalc, setCurrCalc] = useState({ amount: '1', source: 'USD', isSwapped: false });

  // State: PWA & Notifications
  const [notifStatus, setNotifStatus] = useState('default');
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const chartRef = useRef(null);
  const themeColorRef = useRef('#D4AF37');
  const gradientRafRef = useRef(null);

  const currencyList = [
    { code: 'USD', flag: '🇺🇸' }, { code: 'GBP', flag: '🇬🇧' },
    { code: 'AUD', flag: '🇦🇺' }, { code: 'JPY', flag: '🇯🇵' },
    { code: 'KRW', flag: '🇰🇷' }, { code: 'AED', flag: '🇦🇪' },
    { code: 'EUR', flag: '🇪🇺' }
  ];

  // Logic: Market Data Fetching with 5-minute Cache
  useEffect(() => {
    const now = Date.now();
    const CACHE_LIMIT = 5 * 60 * 1000;
    const metalCacheTime = localStorage.getItem('gv_v18_metal_time');

    if (!metalCacheTime || now - parseInt(metalCacheTime) > CACHE_LIMIT) {
      fetch(`${DATA_URL}?t=${now}`).then(res => res.json()).then(json => {
          setPriceData(json);
          localStorage.setItem('gv_v18_metal', JSON.stringify(json));
          localStorage.setItem('gv_v18_metal_time', now.toString());
          setLoading(false);
      }).catch(() => setLoading(false));
    } else {
      setLoading(false);
    }

    fetch(FOREX_PROXY).then(res => res.json()).then(json => {
        if(json.rates) {
          const transformed = json.rates.map(day => ({
            date: day.date,
            usdRate: parseFloat(day.currencies.find(c => c.code === 'USD')?.buy || 0),
            rates: day.currencies
          })).sort((a, b) => new Date(a.date) - new Date(b.date));
          setForexHistory(transformed);
          localStorage.setItem('gv_v18_forex', JSON.stringify(transformed));
        }
        setForexLoading(false);
    }).catch(() => setForexLoading(false));

    if ('Notification' in window) setNotifStatus(Notification.permission);
  }, []);

  // Theme Logic: Dynamic colors for different asset classes
  const themeColor = useMemo(() => {
    let color = '#22c55e'; // Default Green
    if (view !== 'calculator' || calcMode !== 'currency') {
      if (activeMetal === 'gold') color = '#D4AF37';
      else if (activeMetal === 'tejabi') color = '#CD7F32'; 
      else if (activeMetal === 'silver') color = '#94a3b8';
    }
    themeColorRef.current = color;
    return color;
  }, [activeMetal, view, calcMode]);

  // Logic: Imperative Gradient Rendering
  const applyGradient = useCallback(() => {
    if (gradientRafRef.current) cancelAnimationFrame(gradientRafRef.current);
    gradientRafRef.current = requestAnimationFrame(() => {
      const chart = chartRef.current;
      if (!chart) return;
      const { ctx, chartArea } = chart;
      if (!chartArea || !chartArea.height) return;

      const rgb = hexToRgb(themeColorRef.current);
      const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
      g.addColorStop(0, `rgba(${rgb}, 0.45)`);
      g.addColorStop(0.6, `rgba(${rgb}, 0.15)`);
      g.addColorStop(1, `rgba(${rgb}, 0)`);

      if (chart.data.datasets[0]) {
        chart.data.datasets[0].backgroundColor = g;
        chart.update('none');
      }
    });
  }, []);

  useEffect(() => {
  if (!chartRef.current) return;
  applyGradient();
}, [chartData, themeColor]);

  // Logic: Data Analytics
  const formatRS = useCallback((num) => `रू ${Math.round(num || 0).toLocaleString()}`, []);
  const activeDataList = useMemo(() => activeMetal === 'usd' ? forexHistory : priceData, [activeMetal, forexHistory, priceData]);
  const filteredData = useMemo(() => {
  if (!activeDataList || activeDataList.length === 0) return [];
  return activeDataList.slice(-timeframe);
}, [activeDataList, timeframe]);

  const getDayDiff = (id) => {
    const source = id === 'usd' ? forexHistory : priceData;
    if (source.length < 2) return { val: 'Rs. 0', isUp: true };
    const currVal = id === 'usd' ? source[source.length-1].usdRate : parsePrice(source[source.length-1][id]);
    const prevVal = id === 'usd' ? source[source.length-2].usdRate : parsePrice(source[source.length-2][id]);
    const diff = currVal - prevVal;
    return { 
      val: `Rs. ${diff >= 0 ? '+' : ''}${diff.toLocaleString(undefined, {minimumFractionDigits: id === 'usd' ? 2 : 0})}`, 
      isUp: diff >= 0 
    };
  };

  // Logic: Chart Configuration
  const chartData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }

    return {
      labels: filteredData.map(d => {
          const date = new Date(d.date.replace(' ', 'T'));
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }),
      datasets: [{
        data: filteredData.map(d => parsePrice(activeMetal === 'usd' ? d.usdRate : d[activeMetal])),
        borderColor: themeColor,
        borderWidth: 3,
        fill: true,
        tension: 0.45,
        pointRadius: (ctx) => (selectedPoint?.index === ctx.dataIndex ? 6 : 0),
        pointHoverRadius: 10,
        pointBackgroundColor: '#fff',
        pointBorderColor: themeColor,
        pointBorderWidth: 3,
      }]
    };
  }, [filteredData, activeMetal, selectedPoint, themeColor]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { 
        legend: false, 
        tooltip: { enabled: false, external: externalTooltipHandler } 
    },
    scales: {
      x: {
        grid: { display: true, color: 'rgba(255, 255, 255, 0.05)', borderDash: [8, 8], drawTicks: false },
        ticks: { color: 'rgba(255, 255, 255, 0.3)', font: { size: 9, weight: '700' }, maxRotation: 0 }
      },
      y: { 
        position: 'right', 
        grace: '15%', 
        grid: { display: true, color: 'rgba(255, 255, 255, 0.08)', borderDash: [4, 4] }, 
        ticks: { display: false } 
      }
    },
    onClick: (e, elements) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        const point = filteredData[index];
        setSelectedPoint({ index, date: point.date, price: activeMetal === 'usd' ? point.usdRate : parsePrice(point[activeMetal]) });
      }
    }
  }), [filteredData, activeMetal]);

  // --- LOGIC: PWA & VAPID SUBSCRIPTION ---
  const handleNotificationRequest = async () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
    
    if (isIOS && !isStandalone) { 
        setShowIOSGuide(true); 
        return; 
    }

    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      alert("Push notifications are not supported in this browser.");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotifStatus(permission);
      
      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.ready;
        
        const existingSub = await registration.pushManager.getSubscription();
        const subscription = existingSub || await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: VAPID_PUBLIC_KEY
        });

        await fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription)
        });
        
        registration.showNotification("GoldView Nepal", {
          body: "Notifications active! You will get alerts when prices change.",
          icon: "/logo192.png",
          badge: "/logo192.png",
          tag: 'goldview-welcome'
        });
      }
    } catch (err) {
      console.error("Push Error:", err);
    }
  };

  // SEO: Schema.org Structured Data
  const structuredData = useMemo(() => {
    return JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "GoldView Nepal",
      "url": PRIMARY_DOMAIN,
      "description": "Live 24K Chhapawal Gold, Silver and Forex rates in Nepal.",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "All",
      "author": { "@type": "Person", "name": "Timeswantstocode" },
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "NPR" }
    });
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center text-[#D4AF37]">
      <div className="flex flex-col items-center gap-4">
        <RefreshCcw className="w-8 h-8 animate-spin" />
        <p className="text-[9px] font-black uppercase tracking-[0.4em] opacity-50">Syncing Market Data</p>
      </div>
    </div>
  );

  return (
    <HelmetProvider>
      <div className="min-h-screen bg-[#020202] text-zinc-100 font-sans pb-28 overflow-x-hidden relative px-4 sm:px-6">
        <Helmet>
            <title>Gold Price Nepal Today | Live 24K Chhapawal Gold Rate - GoldView</title>
            <meta name="description" content="GoldView: Live Chhapawal 24K Gold, Tejabi 22K Gold, and Pure Silver rates in Nepal today. Official historical charts and jewelry calculation engine." />
            <link rel="canonical" href={PRIMARY_DOMAIN}/>
            <meta name="robots" content="index, follow" />
            <meta property="og:title" content="Gold Price Nepal Today | GoldView" />
            <meta property="og:image" content={`${PRIMARY_DOMAIN}/logo192.png`} />
            <script type="application/ld+json">{structuredData}</script>
        </Helmet>

        {/* --- APP HEADER (Reduced Padding & Sizes) --- */}
        <header className="pt-8 pb-4 flex justify-between items-end relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full animate-pulse shadow-lg" style={{ backgroundColor: themeColor, boxShadow: `0 0 10px ${themeColor}` }}></div>
              <p className="text-[9px] font-black uppercase tracking-[0.3em] transition-colors duration-500" style={{ color: themeColor }}>Live Market</p>
            </div>
            <div className="flex items-center gap-3">
              <img src="/logo192.png" alt="GoldView Logo" className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl border border-white/10 shadow-2xl" />
              <h1 className="text-xl sm:text-2xl font-black tracking-tighter text-white">GoldView</h1>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleNotificationRequest} className={`p-3.5 bg-white/5 backdrop-blur-3xl rounded-2xl border border-white/10 active:scale-90 transition-all ${notifStatus === 'granted' ? 'border-[#D4AF37]/30' : ''}`}>
              <Bell className={`w-5 h-5 ${notifStatus === 'granted' ? 'text-[#D4AF37]' : 'text-zinc-400'}`} />
            </button>
            <button onClick={() => window.location.reload()} className="p-3.5 bg-white/5 backdrop-blur-3xl rounded-2xl border border-white/10 active:scale-90 transition-all">
              <RefreshCcw className={`w-5 h-5 text-zinc-400`} />
            </button>
          </div>
        </header>

        {/* --- MAIN DASHBOARD --- */}
        <div style={{ display: view === 'dashboard' ? 'block' : 'none' }}>
          <main className="px-5 space-y-4 relative z-10 animate-in fade-in duration-700">
            <div className="grid grid-cols-1 gap-4">
              {['gold', 'tejabi', 'silver', 'usd'].map((type) => {
                 const isActive = activeMetal === type;
                 const diff = getDayDiff(type);
                 const val = type === 'usd' ? (forexHistory[forexHistory.length-1]?.usdRate || 0) : parsePrice(priceData[priceData.length-1]?.[type]);
                 const meta = {
                   gold: { label: '24K Chhapawal Gold', sub: 'per tola', grad: 'from-[#D4AF37]/30 to-[#D4AF37]/5' },
                   tejabi: { label: '22K Tejabi Gold', sub: 'per tola', grad: 'from-[#CD7F32]/30 to-[#CD7F32]/5' },
                   silver: { label: 'Pure Silver (99.9%)', sub: 'per tola', grad: 'from-zinc-400/20 to-zinc-600/5' },
                   usd: { label: 'USD to NPR', sub: 'NRB Buying Rate', grad: 'from-[#22c55e]/25 to-[#22c55e]/5' }
                 }[type];
                 return (
                  <div key={type} onClick={() => { setActiveMetal(type); setSelectedPoint(null); }}
                    className={`p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-[1.5px] transition-all duration-500 cursor-pointer bg-gradient-to-br backdrop-blur-3xl relative overflow-hidden group ${
                      isActive ? `${meta.grad} border-white/20 scale-[1.01] shadow-2xl` : 'border-white/5 bg-white/5 opacity-50 hover:opacity-70'
                    }`}>
                    <div className="flex justify-between items-start mb-2 text-[10px] font-black uppercase tracking-widest">
                      <div>{meta.label}<p className="text-[8px] opacity-40 mt-0.5">{meta.sub}</p></div>
                      {type === 'usd' && forexLoading ? <RefreshCcw className="w-3 h-3 text-green-500 animate-spin" /> : 
                      <div className={`px-2 py-1 rounded-xl border text-[9px] ${diff.isUp ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>{diff.val}</div>}
                    </div>
                    <div className="flex justify-between items-end text-2xl sm:text-3xl font-black tracking-tighter">
                      <h2>{type === 'usd' ? `रू ${val.toFixed(2)}` : formatRS(val)}</h2>
                      {isActive && <TrendingUp className={`w-6 h-6 ${diff.isUp ? 'text-green-500' : 'text-red-500 rotate-180'}`} />}
                    </div>
                  </div>
                 );
              })}
            </div>

            {/* --- PRICE CHART SECTION (Smaller padding & rounded) --- */}
            <section className="bg-white/5 border border-white/10 rounded-3xl p-4 sm:p-6 backdrop-blur-[60px] shadow-2xl relative overflow-hidden">
              <div className="flex justify-between items-center mb-6 px-1">
                <h3 className="text-lg font-black tracking-tight flex items-center gap-3">
                    <Activity className="w-5 h-5" style={{ color: themeColor }} /> 
                    {activeMetal.toUpperCase()} Performance
                </h3>
                <div className="flex bg-black/40 rounded-full p-1 border border-white/10">
                  {[7, 30, 90].map((t) => (
                    <button key={t} onClick={() => { setTimeframe(t); setSelectedPoint(null); }} 
                      className={`px-3 py-1.5 rounded-full text-[8px] font-black transition-all duration-300 ${timeframe === t ? `text-black shadow-md` : 'text-zinc-500 hover:text-zinc-300'}`} 
                      style={timeframe === t ? { backgroundColor: themeColor } : {}}>
                        {t === 7 ? '7D' : t === 30 ? '1M' : '3M'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-44 sm:h-56 relative w-full">
                {filteredData.length > 0 && (
                  <Line
                    ref={chartRef}
                    data={chartData}
                    options={chartOptions}
                  />
                )}
              </div>
              
              <div className={`mt-6 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden ${selectedPoint ? 'max-h-60 opacity-100 translate-y-0' : 'max-h-0 opacity-0 translate-y-10'}`}>
                {selectedPoint && (
                  <div className="bg-white/10 border-2 rounded-[2rem] p-5 flex flex-wrap gap-4 justify-between items-center w-full backdrop-blur-[80px] relative border-white/10" style={{ borderColor: `${themeColor}40` }}>
                    <div className="flex items-center gap-4 flex-1 min-w-[200px]">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 bg-white/[0.04]" style={{ borderColor: `${themeColor}40` }}>
                        <Calendar className="w-6 h-6" style={{ color: themeColor }} />
                      </div>
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-[0.2em] mb-1" style={{ color: themeColor }}>Archive Record</p>
                        <p className="text-sm font-black text-white leading-tight">
                            {new Date(selectedPoint.date.replace(' ', 'T')).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-[8px] font-black text-zinc-500 uppercase mb-0.5 tracking-wider">Rate</p>
                        <p className="text-xl font-black text-white">{activeMetal === 'usd' ? `रू ${selectedPoint.price.toFixed(2)}` : formatRS(selectedPoint.price)}</p>
                      </div>
                      <button onClick={() => setSelectedPoint(null)} className="p-3 bg-white/5 rounded-full hover:bg-white/15 transition-all border border-white/10"><X className="w-5 h-5 text-zinc-400" /></button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </main>
        </div>

        {/* --- CALCULATOR ENGINE --- */}
        <div style={{ display: view === 'calculator' ? 'block' : 'none' }}>
          <main className="px-5 relative z-10 animate-in zoom-in-95 duration-700">
            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 backdrop-blur-[50px] shadow-2xl">
              <div className="flex p-1 bg-black/50 rounded-2xl mb-8 border border-white/5">
                  <button onClick={() => setCalcMode('jewelry')} 
                    style={calcMode === 'jewelry' ? { backgroundColor: themeColor } : {}} 
                    className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${calcMode === 'jewelry' ? 'text-black shadow-lg' : 'text-zinc-500'}`}>
                        Jewelry Engine
                  </button>
                  <button onClick={() => setCalcMode('currency')} 
                    className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${calcMode === 'currency' ? 'bg-[#22c55e] text-black shadow-lg' : 'text-zinc-500'}`}>
                        Forex Convert
                  </button>
              </div>

              {calcMode === 'jewelry' ? (
                <div className="space-y-6">
                  <div className="flex p-1 bg-black/40 rounded-2xl border border-white/5">
                     <button onClick={() => setTradeMode('buy')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${tradeMode === 'buy' ? 'text-black shadow-lg' : 'text-zinc-500'}`} style={tradeMode === 'buy' ? { backgroundColor: '#22c55e' } : {}}>Purchase</button>
                     <button onClick={() => setTradeMode('sell')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${tradeMode === 'sell' ? 'text-black shadow-lg' : 'text-zinc-500'}`} style={tradeMode === 'sell' ? { backgroundColor: '#ef4444' } : {}}>Sell</button>
                  </div>

                  <div className="flex p-1 bg-white/5 rounded-2xl border border-white/5 w-fit mx-auto gap-2">
                      {['gold', 'tejabi', 'silver'].map(metal => (
                        <button key={metal} onClick={() => setActiveMetal(metal)} 
                          style={{ backgroundColor: activeMetal === metal ? (metal === 'gold' ? '#D4AF37' : metal === 'tejabi' ? '#CD7F32' : '#94a3b8') : 'transparent' }} 
                          className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-500 ${activeMetal === metal ? 'text-black shadow-md' : 'text-zinc-500'}`}>
                            {metal}
                        </button>
                      ))}
                  </div>

                  <div className="p-5 rounded-2xl border flex items-center justify-between" style={{ borderColor: `${themeColor}60`, backgroundColor: `${themeColor}08` }}>
                    <div className="flex items-center gap-3">
                        <Coins className="w-6 h-6" style={{ color: themeColor }} />
                        <p className="text-sm font-black uppercase text-white">{activeMetal === 'gold' ? '24K Fine' : activeMetal === 'tejabi' ? '22K Standard' : 'Pure Silver'}</p>
                    </div>
                    <div className="text-right text-sm font-black text-zinc-400">{formatRS(parsePrice(priceData[priceData.length-1]?.[activeMetal]))}</div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {['tola', 'aana', 'lal'].map((unit) => (
                    <div key={unit}>
                        <label className="text-[8px] font-black text-zinc-500 uppercase mb-2 block ml-2 tracking-widest">{unit}</label>
                        <input type="number" style={{ caretColor: themeColor }} className="w-full bg-black/60 border border-zinc-800 p-4 rounded-2xl text-center font-black text-xl text-white outline-none focus:border-white/20 transition-all" value={calc[unit]} onChange={(e) => setCalc({...calc, [unit]: e.target.value})} placeholder="0" />
                    </div>))}
                  </div>
                  
                  {tradeMode === 'buy' && (
                    <div className="space-y-4">
                      <div className="relative">
                        <input type="number" placeholder="Making Charges" className="w-full bg-black/60 border border-zinc-800 p-5 rounded-2xl font-black text-sm outline-none text-white focus:border-white/20 pl-12 transition-all" value={calc.making} onChange={(e) => setCalc({...calc, making: e.target.value})} />
                        <Activity className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
                      </div>
                      <div onClick={() => setCalc({...calc, vat: !calc.vat})} className="flex justify-between items-center p-5 bg-white/5 rounded-2xl border border-white/5 cursor-pointer">
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center" style={{ borderColor: calc.vat ? themeColor : '#27272a', backgroundColor: calc.vat ? themeColor : 'transparent' }}>
                                {calc.vat && <Zap className="w-3 h-3 text-black fill-black" />}
                            </div>
                            <span className="font-black text-zinc-300 text-sm">Add 13% Govt VAT</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="p-8 rounded-[2rem] text-black text-center shadow-2xl relative overflow-hidden transition-all duration-700" style={{ background: `linear-gradient(135deg, ${themeColor}, ${activeMetal === 'gold' ? '#b8860b' : activeMetal === 'tejabi' ? '#8B4513' : '#4b5563'})` }}>
                     <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 opacity-60 relative z-10">{tradeMode === 'buy' ? 'Estimated Total' : 'Buyback Value'}</p>
                     <h3 className="text-4xl font-black tracking-tighter relative z-10">
                        {(() => {
                            const weight = (Number(calc.tola)||0) + (Number(calc.aana)||0)/16 + (Number(calc.lal)||0)/192;
                            const rate = parsePrice(priceData[priceData.length-1]?.[activeMetal]) || 0;
                            if (tradeMode === 'sell') return formatRS(weight * rate * 0.95);
                            return formatRS((weight * rate + (Number(calc.making)||0)) * (calc.vat ? 1.13 : 1));
                        })()}
                     </h3>
                  </div>
                </div>
              ) : (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="bg-black/50 rounded-3xl p-6 border border-white/10 space-y-8">
                        <div className="flex items-start justify-between">
                            <div className="flex-1 flex flex-col items-start gap-4">
                                <p className="text-[8px] font-black text-zinc-500 uppercase">REMITTING</p>
                                <div className="flex flex-col items-center gap-2">
                                    <span className="text-4xl leading-none">{currCalc.isSwapped ? '🇳🇵' : currencyList.find(c => c.code === currCalc.source)?.flag}</span>
                                    {currCalc.isSwapped ? <span className="text-[11px] font-black text-white">NPR</span> : 
                                    <select className="bg-white/5 px-2 py-1 rounded-lg font-black text-[10px] text-white outline-none" value={currCalc.source} onChange={(e) => setCurrCalc({...currCalc, source: e.target.value})}>
                                        {currencyList.map(c => <option key={c.code} value={c.code} className="bg-zinc-900">{c.code}</option>)}
                                    </select>}
                                </div>
                            </div>
                            <div className="pt-6">
                                <button onClick={() => setCurrCalc({...currCalc, isSwapped: !currCalc.isSwapped})} className="p-4 bg-green-500/20 rounded-2xl border border-green-500/20"><ArrowRightLeft className="w-6 h-6 text-green-500" /></button>
                            </div>
                            <div className="flex-1 flex flex-col items-end gap-4 text-right">
                                <p className="text-[8px] font-black text-zinc-500 uppercase">RECEIVING</p>
                                <div className="flex flex-col items-center gap-2 ml-auto">
                                    <span className="text-4xl leading-none">{!currCalc.isSwapped ? '🇳🇵' : currencyList.find(c => c.code === currCalc.source)?.flag}</span>
                                    {!currCalc.isSwapped ? <span className="text-[11px] font-black text-white">NPR</span> : 
                                    <select className="bg-white/5 px-2 py-1 rounded-lg font-black text-[10px] text-white outline-none" value={currCalc.source} onChange={(e) => setCurrCalc({...currCalc, source: e.target.value})}>
                                        {currencyList.map(c => <option key={c.code} value={c.code} className="bg-zinc-900">{c.code}</option>)}
                                    </select>}
                                </div>
                            </div>
                        </div>
                        <input type="number" placeholder="Enter Amount" className="w-full bg-black/80 border border-zinc-800 p-6 rounded-2xl font-black text-3xl outline-none focus:border-green-500/50 text-white text-center transition-all" value={currCalc.amount} onChange={(e) => setCurrCalc({...currCalc, amount: e.target.value})} />
                    </div>

                    <div className="bg-gradient-to-br from-green-600 to-green-900 p-10 rounded-[2rem] text-black text-center shadow-2xl relative overflow-hidden">
                       <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-2">Payout Estimate</p>
                       <h3 className="text-4xl font-black tracking-tighter relative z-10">
                          {(() => {
                            const latestRates = forexHistory[forexHistory.length - 1]?.rates || [];
                            const rateData = latestRates.find(r => r.code === currCalc.source);
                            const rawRate = parseFloat(rateData?.buy || 133);
                            const unit = parseInt(rateData?.unit || 1);
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

        {/* --- PWA: iOS INSTALLATION GUIDE --- */}
        {showIOSGuide && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/85 backdrop-blur-2xl animate-in fade-in duration-500">
            <div className="bg-[#121212] border border-white/10 rounded-[2.5rem] p-8 max-w-sm w-full text-center space-y-6">
              <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto border border-white/10">
                <Bell className="w-8 h-8 text-[#D4AF37]" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-white">Enable iOS Alerts</h3>
                <p className="text-zinc-400 text-sm">Install GoldView to your Home Screen to get live notifications.</p>
              </div>
              <div className="space-y-4 text-left bg-black/40 p-5 rounded-2xl border border-white/5">
                <p className="text-xs text-zinc-300">1. Tap <strong>Share</strong> in Safari.</p>
                <p className="text-xs text-zinc-300">2. Select <strong>"Add to Home Screen"</strong>.</p>
                <p className="text-xs text-zinc-300">3. Open from home screen to enable alerts.</p>
              </div>
              <button onClick={() => setShowIOSGuide(false)} className="w-full py-4 bg-[#D4AF37] text-black font-black rounded-xl text-sm">Got it</button>
            </div>
          </div>
        )}

        {/* --- BOTTOM NAVIGATION BAR (Height & Padding Adjusted) --- */}
        <nav className="fixed bottom-4 left-4 right-4 h-16 sm:h-20 bg-zinc-900/80 backdrop-blur-[40px] rounded-[2rem] border border-white/15 flex justify-around items-center px-4 z-50 shadow-2xl">
          <button onClick={() => setView('dashboard')} 
            className={`flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition-all duration-500 ${view === 'dashboard' ? 'text-black' : 'text-zinc-500 hover:text-zinc-300'}`} 
            style={view === 'dashboard' ? { backgroundColor: themeColor } : {}}>
                <LayoutDashboard className={`w-6 h-6 ${view === 'dashboard' ? 'fill-black' : ''}`} />
                <span className="text-[8px] font-black uppercase tracking-widest">Market</span>
          </button>
          
          <button onClick={() => { setView('calculator'); if(activeMetal === 'usd') setActiveMetal('gold'); }} 
            className={`flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition-all duration-500 ${view === 'calculator' ? 'text-black' : 'text-zinc-500 hover:text-zinc-300'}`} 
            style={view === 'calculator' ? { backgroundColor: themeColor } : {}}>
                <Calculator className={`w-6 h-6 ${view === 'calculator' ? 'fill-black' : ''}`} />
                <span className="text-[8px] font-black uppercase tracking-widest">Compute</span>
          </button>
        </nav>

        {/* --- FOOTER (Smaller padding) --- */}
        <footer className="mt-12 px-8 pb-12 text-zinc-600 text-[10px] leading-relaxed border-t border-white/5 pt-8">
          <div className="max-w-xl mx-auto text-center space-y-4">
            <h2 className="text-zinc-400 font-black mb-2 uppercase tracking-widest">Official Market Data Engine</h2>
            <p>Verified, real-time analytics for 24K Chhapawal Gold, 22K Tejabi Gold and Pure Silver within Nepal.</p>
            <p className="font-black uppercase tracking-[0.5em] text-zinc-500 text-[8px] opacity-40">Made by @Timeswantstocode</p>
          </div>
        </footer>

        <Analytics />
        <SpeedInsights />
      </div>
    </HelmetProvider>
  );
}