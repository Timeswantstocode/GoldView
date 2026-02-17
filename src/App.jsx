import React, { useState, useMemo, useEffect, useCallback, useRef, memo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  registerables,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
} from 'chart.js';
import {
  LayoutDashboard,
  Calculator,
  RefreshCcw,
  TrendingUp,
  X,
  Calendar,
  Zap,
  Activity,
  Coins,
  ArrowRightLeft,
  Globe,
  ArrowDown,
  Bell,
  Info,
  TrendingDown,
  Scale,
  History,
  ShieldCheck,
  AlertCircle,
  ChevronRight,
  Download,
  ExternalLink,
  TableProperties,
  BarChart3,
  Layers,
  Award
} from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Helmet, HelmetProvider } from 'react-helmet-async';

/**
 * GOLDVIEW NEPAL - VERSION 1.9.5
 * 
 * CORE FIXES APPLIED:
 * 1. Build Fix: Removed 'AreaController' named import (internal class).
 * 2. Data Sanitization: Added regex to strip commas/whitespace from price strings.
 * 3. Visibility Fix: Unique 'key' prop on Line component forces instance refresh.
 * 4. Scale Handling: Automatic Y-axis normalization based on active metal.
 */

// Register all ChartJS components
ChartJS.register(...registerables, Filler, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title);

// Global Chart Performance Config
ChartJS.defaults.animation = {
  duration: 500,
  easing: 'easeOutQuart'
};
ChartJS.defaults.responsive = true;
ChartJS.defaults.maintainAspectRatio = false;
ChartJS.defaults.color = 'rgba(255, 255, 255, 0.5)';
ChartJS.defaults.borderColor = 'rgba(255, 255, 255, 0.08)';

// Constants & API Endpoints
const DATA_URL = "https://raw.githubusercontent.com/Timeswantstocode/GoldView/main/data.json";
const FOREX_PROXY = "/api/forex";
const PRIMARY_DOMAIN = "https://viewgold.vercel.app";
const CACHE_KEY_METAL = 'gv_v19_metal_cache_v2';
const CACHE_KEY_FOREX = 'gv_v19_forex_cache_v2';
const CACHE_LIFETIME = 15 * 60 * 1000; // 15 Minutes

/**
 * Utility: parsePrice
 * Prevents "Invisible Graph" by ensuring all inputs are strictly numeric.
 * Strips commas commonly found in South Asian price formatting (e.g., 1,20,000).
 */
const parsePrice = (val) => {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/,/g, '').replace(/\s/g, '').trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Custom Tooltip Component (Vanilla DOM injection for Chart.js)
 */
const getOrCreateTooltip = (chart) => {
  let tooltipEl = chart.canvas.parentNode.querySelector('div');
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.style.background = 'rgba(8, 8, 8, 0.9)';
    tooltipEl.style.backdropFilter = 'blur(24px)';
    tooltipEl.style.WebkitBackdropFilter = 'blur(24px)';
    tooltipEl.style.borderRadius = '20px';
    tooltipEl.style.color = 'white';
    tooltipEl.style.opacity = 1;
    tooltipEl.style.pointerEvents = 'none';
    tooltipEl.style.position = 'absolute';
    tooltipEl.style.transform = 'translate(-50%, 0)';
    tooltipEl.style.transition = 'all .18s cubic-bezier(0.4, 0, 0.2, 1)';
    tooltipEl.style.border = '1px solid rgba(255, 255, 255, 0.15)';
    tooltipEl.style.padding = '14px 18px';
    tooltipEl.style.zIndex = '100';
    tooltipEl.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.7)';
    chart.canvas.parentNode.appendChild(tooltipEl);
  }
  return tooltipEl;
};

const externalTooltipHandler = (context) => {
  const { chart, tooltip } = context;
  const tooltipEl = getOrCreateTooltip(chart);

  if (tooltip.opacity === 0) {
    tooltipEl.style.opacity = 0;
    return;
  }

  if (tooltip.body) {
    const titleLines = tooltip.title || [];
    const bodyLines = tooltip.body.map(b => b.lines);
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'center';

    titleLines.forEach(title => {
      const span = document.createElement('span');
      span.style.fontSize = '9px';
      span.style.fontWeight = '900';
      span.style.textTransform = 'uppercase';
      span.style.letterSpacing = '0.15em';
      span.style.marginBottom = '6px';
      span.style.color = 'rgba(255,255,255,0.5)';
      span.innerText = title;
      container.appendChild(span);
    });

    bodyLines.forEach((body) => {
      const span = document.createElement('span');
      span.style.fontSize = '18px';
      span.style.fontWeight = '900';
      span.style.letterSpacing = '-0.02em';
      span.style.color = '#fff';
      span.innerText = body;
      container.appendChild(span);
    });

    while (tooltipEl.firstChild) { tooltipEl.firstChild.remove(); }
    tooltipEl.appendChild(container);
  }

  const { offsetLeft: positionX, offsetTop: positionY } = chart.canvas;
  tooltipEl.style.opacity = 1;
  tooltipEl.style.left = positionX + tooltip.caretX + 'px';
  tooltipEl.style.top = positionY + tooltip.caretY - 90 + 'px';
};

/**
 * Sub-Component: Stat Row for Market Info
 */
const MarketStatRow = ({ icon: Icon, label, value, color }) => (
  <div className="flex items-center justify-between p-5 rounded-3xl bg-white/[0.03] border border-white/5">
    <div className="flex items-center gap-4">
      <div className="p-3 rounded-2xl bg-black/40 border border-white/5">
        <Icon size={18} style={{ color }} />
      </div>
      <span className="text-xs font-bold text-zinc-400">{label}</span>
    </div>
    <span className="text-sm font-black text-white tracking-tight">{value}</span>
  </div>
);

/**
 * Sub-Component: Unit Conversion Table
 */
const UnitTable = () => (
  <div className="space-y-4 pt-6">
    <div className="flex items-center gap-2 mb-4">
      <TableProperties size={16} className="text-[#D4AF37]" />
      <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Unit Conversions</h4>
    </div>
    <div className="grid grid-cols-2 gap-3">
      {[
        { u: '1 Tola', v: '11.66 Grams' },
        { u: '1 Tola', v: '16 Aana' },
        { u: '1 Aana', v: '0.729 Grams' },
        { u: '1 Aana', v: '12 Lal' },
        { u: '10 Grams', v: '0.857 Tola' },
        { u: '1 Lal', v: '0.060 Grams' }
      ].map((item, i) => (
        <div key={i} className="flex justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          <span className="text-[10px] font-black text-zinc-500">{item.u}</span>
          <span className="text-[10px] font-black text-white">{item.v}</span>
        </div>
      ))}
    </div>
  </div>
);

/**
 * Main Application Component
 */
export default function App() {
  // Persistence-aware State
  const [priceData, setPriceData] = useState(() => {
    const cached = localStorage.getItem(CACHE_KEY_METAL);
    return cached ? JSON.parse(cached) : [];
  });
  
  const [forexHistory, setForexHistory] = useState(() => {
    const cached = localStorage.getItem(CACHE_KEY_FOREX);
    return cached ? JSON.parse(cached) : [];
  });

  const [loading, setLoading] = useState(priceData.length === 0);
  const [forexLoading, setForexLoading] = useState(forexHistory.length === 0);
  const [view, setView] = useState('dashboard');
  const [activeMetal, setActiveMetal] = useState('gold');
  const [timeframe, setTimeframe] = useState(7);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [calcMode, setCalcMode] = useState('jewelry');
  const [tradeMode, setTradeMode] = useState('buy');
  const [calc, setCalc] = useState({ tola: '', aana: '', lal: '', making: '', vat: true });
  const [currCalc, setCurrCalc] = useState({ amount: '1000', source: 'USD', isSwapped: false });
  const [notifStatus, setNotifStatus] = useState('default');
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const chartRef = useRef(null);

  const currencyList = [
    { code: 'USD', flag: '🇺🇸' }, { code: 'GBP', flag: '🇬🇧' },
    { code: 'AUD', flag: '🇦🇺' }, { code: 'JPY', flag: '🇯🇵' },
    { code: 'KRW', flag: '🇰🇷' }, { code: 'AED', flag: '🇦🇪' },
    { code: 'EUR', flag: '🇪🇺' }, { code: 'CAD', flag: '🇨🇦' },
    { code: 'MYR', flag: '🇲🇾' }, { code: 'SAR', flag: '🇸🇦' }
  ];

  // Data Lifecycle Effect
  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const res = await fetch(`${DATA_URL}?t=${Date.now()}`);
        if (!res.ok) throw new Error("Metal API Unreachable");
        const json = await res.json();
        if (Array.isArray(json)) {
          setPriceData(json);
          localStorage.setItem(CACHE_KEY_METAL, JSON.stringify(json));
        }
      } catch (err) {
        console.error("Critical Metal Fetch Error:", err);
      } finally {
        setLoading(false);
      }

      try {
        const res = await fetch(FOREX_PROXY);
        if (!res.ok) throw new Error("Forex API Unreachable");
        const json = await res.json();
        if (json.status === "success" && Array.isArray(json.rates)) {
          const transformed = json.rates.map(day => ({
            date: day.date,
            usdRate: parsePrice(day.currencies.find(c => c.code === 'USD')?.buy || 0),
            rates: day.currencies
          })).sort((a, b) => new Date(a.date) - new Date(b.date));
          setForexHistory(transformed);
          localStorage.setItem(CACHE_KEY_FOREX, JSON.stringify(transformed));
        }
      } catch (err) {
        console.error("Forex Fetch Error:", err);
      } finally {
        setForexLoading(false);
      }
    };

    fetchMarketData();
    if ('Notification' in window) setNotifStatus(Notification.permission);
  }, []);

  // Compute Active Values
  const themeColor = useMemo(() => {
    if (view === 'calculator' && calcMode === 'currency') return '#22c55e';
    const mapping = { gold: '#D4AF37', tejabi: '#CD7F32', silver: '#94a3b8', usd: '#22c55e' };
    return mapping[activeMetal] || '#D4AF37';
  }, [activeMetal, view, calcMode]);

  const filteredData = useMemo(() => {
    const source = activeMetal === 'usd' ? forexHistory : priceData;
    return source.slice(-timeframe);
  }, [activeMetal, forexHistory, priceData, timeframe]);

  const getDayDiff = useCallback((id) => {
    const source = id === 'usd' ? forexHistory : priceData;
    if (source.length < 2) return { val: 'Rs. 0', isUp: true, pct: '0%' };
    const curr = id === 'usd' ? source[source.length-1].usdRate : parsePrice(source[source.length-1][id]);
    const prev = id === 'usd' ? source[source.length-2].usdRate : parsePrice(source[source.length-2][id]);
    const diff = curr - prev;
    const pct = ((diff / prev) * 100).toFixed(2);
    return { 
      val: `Rs. ${diff >= 0 ? '+' : ''}${diff.toLocaleString(undefined, { minimumFractionDigits: id === 'usd' ? 2 : 0 })}`, 
      isUp: diff >= 0,
      pct: `${diff >= 0 ? '+' : ''}${pct}%`
    };
  }, [forexHistory, priceData]);

  // Chart Configuration Logic
  const chartData = useMemo(() => {
    if (!filteredData.length) return { labels: [], datasets: [] };

    const labels = filteredData.map(d => {
      const dt = new Date(d.date.replace(' ', 'T'));
      return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const points = filteredData.map(d => 
      activeMetal === 'usd' ? d.usdRate : parsePrice(d[activeMetal])
    );

    return {
      labels,
      datasets: [{
        label: activeMetal.toUpperCase(),
        data: points,
        borderColor: themeColor,
        borderWidth: 5,
        fill: true,
        tension: 0.45,
        pointRadius: (ctx) => (selectedPoint?.index === ctx.dataIndex ? 10 : 0),
        pointHoverRadius: 12,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: themeColor,
        pointBorderWidth: 4,
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return null;
          const grad = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          grad.addColorStop(0, `${themeColor}60`);
          grad.addColorStop(0.5, `${themeColor}20`);
          grad.addColorStop(1, 'transparent');
          return grad;
        },
      }]
    };
  }, [filteredData, activeMetal, selectedPoint, themeColor]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false, external: externalTooltipHandler }
    },
    scales: {
      x: {
        grid: { display: true, color: 'rgba(255,255,255,0.03)', borderDash: [5, 5] },
        ticks: { color: 'rgba(255, 255, 255, 0.3)', font: { size: 10, weight: '800' }, maxRotation: 0 }
      },
      y: {
        position: 'right',
        grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
        ticks: {
          color: 'rgba(255, 255, 255, 0.3)',
          font: { size: 10, weight: '700' },
          callback: (v) => activeMetal === 'usd' ? `रू${v}` : `रू${(v/1000).toFixed(0)}k`
        }
      }
    },
    onClick: (e, elements) => {
      if (elements.length > 0) {
        const idx = elements[0].index;
        const d = filteredData[idx];
        setSelectedPoint({ 
          index: idx, 
          date: d.date, 
          price: activeMetal === 'usd' ? d.usdRate : parsePrice(d[activeMetal]) 
        });
      }
    }
  }), [filteredData, activeMetal]);

  // Handlers
  const toggleNotifications = async () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isPWA = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;

    if (isIOS && !isPWA) {
      setShowIOSGuide(true);
      return;
    }

    if (!('Notification' in window)) return;
    const res = await Notification.requestPermission();
    setNotifStatus(res);
  };

  const calculateJewelry = () => {
    const w = (Number(calc.tola)||0) + (Number(calc.aana)||0)/16 + (Number(calc.lal)||0)/192;
    const r = parsePrice(priceData[priceData.length-1]?.[activeMetal === 'usd' ? 'gold' : activeMetal]);
    if (tradeMode === 'sell') return w * r * 0.95;
    const sub = w * r + (Number(calc.making) || 0);
    return calc.vat ? sub * 1.13 : sub;
  };

  const calculateForex = () => {
    const latest = forexHistory[forexHistory.length - 1]?.rates || [];
    const target = latest.find(r => r.code === currCalc.source);
    if (!target) return 0;
    const rate = parsePrice(target.buy);
    const unit = parseInt(target.unit || 1);
    const amount = Number(currCalc.amount) || 0;
    
    if (currCalc.isSwapped) return (amount / rate) * unit;
    return (amount / unit) * rate;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020202] flex flex-col items-center justify-center space-y-6">
        <div className="relative">
            <div className="w-16 h-16 border-4 border-zinc-900 border-t-[#D4AF37] rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 bg-[#D4AF37]/10 rounded-full animate-pulse" />
            </div>
        </div>
        <div className="text-center space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#D4AF37]">GoldView Nepal</p>
            <p className="text-[8px] font-bold uppercase tracking-widest text-zinc-600">Initializing Live Stream...</p>
        </div>
      </div>
    );
  }

  return (
    <HelmetProvider>
      <div className="min-h-screen bg-[#020202] text-zinc-100 font-sans pb-40 overflow-x-hidden selection:bg-[#D4AF37] selection:text-black">
        <Helmet>
          <title>Gold Rate Nepal Today | Live 24K & 22K Prices - GoldView</title>
          <meta name="description" content="Official GoldView: Real-time 24K Gold, Silver and USD rates in Nepal with high-precision jewelry calculator." />
          <meta name="theme-color" content="#020202" />
        </Helmet>

        {/* Global Nav-Header */}
        <header className="p-8 pt-16 flex justify-between items-center relative z-20 max-w-5xl mx-auto">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-zinc-800 to-black border border-white/10 flex items-center justify-center shadow-2xl relative group">
              <div className="absolute inset-0 bg-[#D4AF37]/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <img src="/logo192.png" alt="GV" className="w-9 h-9 rounded-lg relative z-10" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500">GoldView</h1>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]" />
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Market Active</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={toggleNotifications} className={`p-4 rounded-3xl bg-white/5 border border-white/10 transition-all active:scale-90 ${notifStatus === 'granted' ? 'text-[#D4AF37]' : 'text-zinc-500'}`}>
              <Bell size={22} className={notifStatus === 'granted' ? 'fill-[#D4AF37]/20' : ''} />
            </button>
            <button onClick={() => window.location.reload()} className="p-4 rounded-3xl bg-white/5 border border-white/10 text-zinc-500 active:scale-90 active:rotate-180 transition-all">
              <RefreshCcw size={22} />
            </button>
          </div>
        </header>

        {/* View Switcher: Dashboard */}
        {view === 'dashboard' && (
          <main className="px-6 space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 max-w-5xl mx-auto">
            {/* Real-time Price Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {['gold', 'tejabi', 'silver', 'usd'].map((id) => {
                const isActive = activeMetal === id;
                const diff = getDayDiff(id);
                const price = id === 'usd' ? (forexHistory[forexHistory.length-1]?.usdRate || 0) : parsePrice(priceData[priceData.length-1]?.[id]);
                const config = {
                    gold: { label: '24K Chhapawal', col: '#D4AF37', g: 'from-[#D4AF37]/30 to-transparent' },
                    tejabi: { label: '22K Tejabi', col: '#CD7F32', g: 'from-[#CD7F32]/30 to-transparent' },
                    silver: { label: 'Pure Silver', col: '#94a3b8', g: 'from-zinc-400/20 to-transparent' },
                    usd: { label: 'USD Buy Rate', col: '#22c55e', g: 'from-[#22c55e]/20 to-transparent' }
                }[id];

                return (
                    <div key={id} onClick={() => { setActiveMetal(id); setSelectedPoint(null); }}
                        className={`p-7 rounded-[2.8rem] border transition-all duration-500 cursor-pointer overflow-hidden relative group ${
                            isActive ? `bg-gradient-to-br ${config.g} border-white/20 scale-[1.03] shadow-2xl` : 'bg-white/5 border-white/5 opacity-40 hover:opacity-70'
                        }`}>
                        <div className="flex justify-between items-start mb-6 relative z-10">
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{config.label}</h4>
                                <p className="text-[8px] font-bold text-zinc-600">{id === 'usd' ? 'NRB Official' : 'Per Tola'}</p>
                            </div>
                            <div className={`px-2.5 py-1 rounded-xl text-[10px] font-black border flex flex-col items-end ${diff.isUp ? 'text-green-400 border-green-500/20 bg-green-500/5' : 'text-red-400 border-red-500/20 bg-red-500/5'}`}>
                                <span>{diff.val}</span>
                                <span className="text-[8px] opacity-70">{diff.pct}</span>
                            </div>
                        </div>
                        <h2 className="text-4xl font-black tracking-tighter text-white mb-2">
                            {id === 'usd' ? `रू${price.toFixed(2)}` : `रू${Math.round(price).toLocaleString()}`}
                        </h2>
                        {isActive && <div className="absolute -right-6 -bottom-6 opacity-10 group-hover:scale-110 transition-transform"><Activity size={120} style={{ color: config.col }} /></div>}
                    </div>
                );
              })}
            </div>

            {/* Analysis Engine */}
            <section className="bg-white/5 border border-white/10 rounded-[3.5rem] p-10 backdrop-blur-3xl relative overflow-hidden shadow-inner">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg">
                    <BarChart3 size={24} style={{ color: themeColor }} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight">Market Analytics</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Price Action & Trends</p>
                  </div>
                </div>
                <div className="flex bg-black/50 rounded-full p-1.5 border border-white/5 shadow-2xl">
                  {[7, 30, 90, 180].map((t) => (
                    <button key={t} onClick={() => { setTimeframe(t); setSelectedPoint(null); }}
                      className={`px-6 py-2 rounded-full text-[10px] font-black transition-all ${timeframe === t ? 'text-black shadow-xl shadow-white/5' : 'text-zinc-500 hover:text-white'}`}
                      style={timeframe === t ? { backgroundColor: themeColor } : {}}>
                      {t === 7 ? '7D' : t === 30 ? '1M' : t === 90 ? '3M' : '6M'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fix: Unique Key forces Line component to clear previous instance/scales */}
              <div className="h-80 w-full relative group">
                <Line key={`${activeMetal}-${timeframe}-${themeColor}`} ref={chartRef} data={chartData} options={chartOptions} />
              </div>

              {/* Data Point Detail Overlay */}
              <div className={`mt-10 transition-all duration-700 ${selectedPoint ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95 h-0 overflow-hidden'}`}>
                {selectedPoint && (
                  <div className="p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/10 flex flex-wrap gap-8 justify-between items-center backdrop-blur-md">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-3xl bg-black/60 flex items-center justify-center border border-white/5 shadow-inner">
                        <Calendar size={28} style={{ color: themeColor }} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Historical Reference</p>
                        <p className="text-xl font-black text-white">{new Date(selectedPoint.date.replace(' ', 'T')).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-10">
                      <div className="text-right">
                        <p className="text-[10px] font-black text-zinc-600 uppercase mb-1">Closing Rate</p>
                        <p className="text-4xl font-black text-white">
                          {activeMetal === 'usd' ? `रू${selectedPoint.price.toFixed(2)}` : `रू${Math.round(selectedPoint.price).toLocaleString()}`}
                        </p>
                      </div>
                      <button onClick={() => setSelectedPoint(null)} className="p-4 bg-white/5 rounded-2xl hover:bg-white/10 text-zinc-400 active:scale-90 transition-all"><X size={20} /></button>
                    </div>
                  </div>
                )}
              </div>

              {/* Market Intelligence Row */}
              <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-white/5 pt-10">
                <MarketStatRow icon={TrendingUp} label="Period High" color="#22c55e" value={activeMetal === 'usd' ? `रू${Math.max(...filteredData.map(d => activeMetal === 'usd' ? d.usdRate : parsePrice(d[activeMetal]))).toFixed(2)}` : `रू${Math.round(Math.max(...filteredData.map(d => parsePrice(d[activeMetal])))).toLocaleString()}`} />
                <MarketStatRow icon={TrendingDown} label="Period Low" color="#ef4444" value={activeMetal === 'usd' ? `रू${Math.min(...filteredData.map(d => activeMetal === 'usd' ? d.usdRate : parsePrice(d[activeMetal]))).toFixed(2)}` : `रू${Math.round(Math.min(...filteredData.map(d => parsePrice(d[activeMetal])))).toLocaleString()}`} />
                <MarketStatRow icon={Activity} label="Volatility" color={themeColor} value={activeMetal === 'usd' ? 'Low' : 'Moderate'} />
              </div>
            </section>

            {/* Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-10 rounded-[3rem] bg-zinc-900/40 border border-white/5 space-y-6">
                    <div className="flex items-center gap-3">
                        <ShieldCheck size={20} className="text-[#D4AF37]" />
                        <h3 className="text-sm font-black uppercase tracking-widest text-white">Authenticity Guide</h3>
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                        Always verify the hallmark (BIS 999 for 24K) before purchase. Rates displayed are official Federation 
                        closing rates. Local showrooms may apply a premium based on inventory and making charges.
                    </p>
                    <UnitTable />
                </div>
                <div className="p-10 rounded-[3rem] bg-zinc-900/40 border border-white/5 space-y-6">
                    <div className="flex items-center gap-3">
                        <AlertCircle size={20} className="text-blue-400" />
                        <h3 className="text-sm font-black uppercase tracking-widest text-white">Market Hours</h3>
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                        The Nepal Gold and Silver Dealers' Association usually releases the new daily rate between 10:30 AM and 
                        11:30 AM NPT. Markets remain closed on Saturdays and major Public Holidays.
                    </p>
                    <div className="pt-6 space-y-3">
                        <div className="p-5 rounded-2xl bg-black/20 border border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3 text-[10px] font-black text-zinc-400"><History size={14} /> Update Frequency</div>
                            <div className="text-[10px] font-black text-white">Daily (6 Days)</div>
                        </div>
                        <div className="p-5 rounded-2xl bg-black/20 border border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3 text-[10px] font-black text-zinc-400"><Award size={14} /> Data Source</div>
                            <div className="text-[10px] font-black text-white">FENEGOSIDA / NRB</div>
                        </div>
                    </div>
                </div>
            </div>
          </main>
        )}

        {/* View Switcher: Calculator */}
        {view === 'calculator' && (
          <main className="px-6 max-w-4xl mx-auto animate-in zoom-in-95 duration-700">
            <div className="bg-white/5 border border-white/10 rounded-[4rem] p-10 backdrop-blur-3xl shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-zinc-500/20 to-transparent" />
              
              {/* Tool Mode Header */}
              <div className="flex p-2 bg-black/50 rounded-[2.5rem] border border-white/5 mb-10 shadow-inner">
                <button onClick={() => setCalcMode('jewelry')} 
                  className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-[2rem] text-[11px] font-black uppercase transition-all duration-500 ${calcMode === 'jewelry' ? 'bg-[#D4AF37] text-black shadow-xl shadow-[#D4AF37]/30' : 'text-zinc-500 hover:text-white'}`}>
                  <Layers size={16} /> Jewelry Estimator
                </button>
                <button onClick={() => setCalcMode('currency')} 
                  className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-[2rem] text-[11px] font-black uppercase transition-all duration-500 ${calcMode === 'currency' ? 'bg-[#22c55e] text-black shadow-xl shadow-[#22c55e]/30' : 'text-zinc-500 hover:text-white'}`}>
                  <Globe size={16} /> Forex Converter
                </button>
              </div>

              {calcMode === 'jewelry' ? (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="flex gap-3">
                    <button onClick={() => setTradeMode('buy')} 
                      className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase border-2 transition-all ${tradeMode === 'buy' ? 'bg-green-500/10 border-green-500/40 text-green-500 shadow-lg shadow-green-500/10' : 'bg-transparent border-white/5 text-zinc-600'}`}>
                      Purchase Estimate
                    </button>
                    <button onClick={() => setTradeMode('sell')} 
                      className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase border-2 transition-all ${tradeMode === 'sell' ? 'bg-red-500/10 border-red-500/40 text-red-500 shadow-lg shadow-red-500/10' : 'bg-transparent border-white/5 text-zinc-600'}`}>
                      Buyback Value
                    </button>
                  </div>

                  <div className="flex justify-center gap-3 py-4 border-y border-white/5">
                    {['gold', 'tejabi', 'silver'].map(m => (
                      <button key={m} onClick={() => setActiveMetal(m)}
                        className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase border-2 transition-all ${activeMetal === m ? 'border-white/40 bg-white/10 text-white' : 'border-transparent text-zinc-600 hover:text-zinc-400'}`}>
                        {m}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    {['tola', 'aana', 'lal'].map((unit) => (
                      <div key={unit} className="space-y-3">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] block text-center">{unit}</label>
                        <input type="number" placeholder="0" value={calc[unit]} onChange={(e) => setCalc({ ...calc, [unit]: e.target.value })}
                          className="w-full bg-black/60 border-2 border-white/5 p-6 rounded-[2rem] text-center font-black text-3xl outline-none focus:border-[#D4AF37]/40 focus:bg-black/80 transition-all placeholder:opacity-20" />
                      </div>
                    ))}
                  </div>

                  {tradeMode === 'buy' && (
                    <div className="space-y-4 pt-4">
                      <div className="relative group">
                        <input type="number" placeholder="Total Making Charge (NPR)" value={calc.making} onChange={(e) => setCalc({ ...calc, making: e.target.value })}
                          className="w-full bg-black/60 border-2 border-white/5 p-7 rounded-[2.5rem] font-black text-lg outline-none focus:border-[#D4AF37]/40 transition-all" />
                        <div className="absolute right-8 top-1/2 -translate-y-1/2 p-2 bg-white/5 rounded-xl border border-white/10"><Scale size={18} className="text-zinc-600" /></div>
                      </div>
                      <button onClick={() => setCalc({ ...calc, vat: !calc.vat })}
                        className={`w-full p-7 rounded-[2.5rem] border-2 flex justify-between items-center transition-all ${calc.vat ? 'border-blue-500/30 bg-blue-500/5 text-blue-400' : 'border-white/5 bg-white/5 text-zinc-500'}`}>
                        <div className="flex items-center gap-5">
                          <div className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all ${calc.vat ? 'border-blue-500 bg-blue-500 shadow-lg shadow-blue-500/20' : 'border-zinc-800'}`}>
                            {calc.vat && <Zap size={14} className="text-black fill-black" />}
                          </div>
                          <div className="text-left">
                            <span className="font-black text-sm block">Government VAT (13%)</span>
                            <span className="text-[9px] font-bold uppercase opacity-60">Mandatory for official invoicing</span>
                          </div>
                        </div>
                      </button>
                    </div>
                  )}

                  <div className="p-12 rounded-[3.5rem] text-center shadow-3xl relative overflow-hidden group" style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}cc)` }}>
                    <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:rotate-12 transition-transform pointer-events-none">
                      <Scale size={100} className="text-black" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-[11px] font-black uppercase tracking-[0.5em] mb-3 text-black/60">Final Valuation Result</p>
                        <h3 className="text-6xl font-black tracking-tighter text-black drop-shadow-sm">
                            रू{Math.round(calculateJewelry()).toLocaleString()}
                        </h3>
                        <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 bg-black/10 rounded-full text-[9px] font-black text-black/60 uppercase">
                            Market Based Estimate
                        </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-10 animate-in fade-in duration-500">
                  {/* Currency Logic Component */}
                  <div className="bg-black/50 rounded-[3rem] p-10 border border-white/5 shadow-inner space-y-10">
                    <div className="flex items-center justify-between">
                      <div className="space-y-4">
                        <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Base Currency</p>
                        <div className="flex items-center gap-4">
                          <span className="text-5xl">{currCalc.isSwapped ? '🇳🇵' : currencyList.find(c => c.code === currCalc.source)?.flag}</span>
                          <select className="bg-transparent text-2xl font-black text-white outline-none border-b border-white/10 pb-1"
                            value={currCalc.source} onChange={(e) => setCurrCalc({ ...currCalc, source: e.target.value })}>
                            {currencyList.map(c => <option key={c.code} value={c.code} className="bg-zinc-900">{c.code}</option>)}
                          </select>
                        </div>
                      </div>
                      <button onClick={() => setCurrCalc({ ...currCalc, isSwapped: !currCalc.isSwapped })}
                        className="p-6 rounded-full bg-green-500/10 border border-green-500/30 text-green-500 hover:shadow-[0_0_30px_#22c55e30] active:scale-90 transition-all duration-500">
                        <ArrowRightLeft size={28} />
                      </button>
                      <div className="space-y-4 text-right">
                        <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Target Currency</p>
                        <div className="flex items-center gap-4 justify-end">
                          <span className="text-2xl font-black text-white border-b border-white/10 pb-1">{currCalc.isSwapped ? currCalc.source : 'NPR'}</span>
                          <span className="text-5xl">{!currCalc.isSwapped ? '🇳🇵' : currencyList.find(c => c.code === currCalc.source)?.flag}</span>
                        </div>
                      </div>
                    </div>

                    <div className="relative group">
                      <input type="number" className="w-full bg-zinc-900/60 border-2 border-white/5 p-10 rounded-[2.5rem] text-5xl font-black text-center text-white outline-none focus:border-green-500/40 transition-all shadow-inner"
                        value={currCalc.amount} onChange={(e) => setCurrCalc({ ...currCalc, amount: e.target.value })} />
                      <div className="absolute left-10 top-1/2 -translate-y-1/2 text-zinc-800 opacity-40 group-focus-within:opacity-100 transition-opacity">
                        <Coins size={32} />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-[#22c55e] to-[#15803d] p-16 rounded-[4rem] text-center shadow-3xl relative">
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-black/10 rounded-full text-[9px] font-black text-black/40 uppercase tracking-widest">Official Payout Rate</div>
                    <p className="text-[11px] font-black uppercase tracking-[0.5em] mb-4 text-black/60">Estimated Total</p>
                    <h3 className="text-6xl font-black tracking-tighter text-black">
                      {currCalc.isSwapped ? '' : 'रू '}
                      {calculateForex().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      {currCalc.isSwapped ? ` ${currCalc.source}` : ''}
                    </h3>
                  </div>
                </div>
              )}
            </div>
          </main>
        )}

        {/* Global Navigation Dock */}
        <nav className="fixed bottom-10 left-10 right-10 h-24 bg-[#0a0a0a]/70 backdrop-blur-[60px] rounded-[3.5rem] border border-white/10 flex items-center px-6 z-50 shadow-[0_30px_100px_rgba(0,0,0,1)] max-w-lg mx-auto">
          <button onClick={() => setView('dashboard')} 
            className={`flex-1 flex flex-col items-center gap-2 py-5 rounded-[2.8rem] transition-all duration-700 ${view === 'dashboard' ? 'text-black' : 'text-zinc-600 hover:text-zinc-400'}`}
            style={view === 'dashboard' ? { backgroundColor: themeColor, boxShadow: `0 0 40px ${themeColor}40` } : {}}>
            <LayoutDashboard size={26} className={view === 'dashboard' ? 'fill-black' : ''} />
            <span className="text-[10px] font-black uppercase tracking-[0.15em]">Market</span>
          </button>
          <button onClick={() => setView('calculator')} 
            className={`flex-1 flex flex-col items-center gap-2 py-5 rounded-[2.8rem] transition-all duration-700 ${view === 'calculator' ? 'text-black' : 'text-zinc-600 hover:text-zinc-400'}`}
            style={view === 'calculator' ? { backgroundColor: themeColor, boxShadow: `0 0 40px ${themeColor}40` } : {}}>
            <Calculator size={26} className={view === 'calculator' ? 'fill-black' : ''} />
            <span className="text-[10px] font-black uppercase tracking-[0.15em]">Calculator</span>
          </button>
        </nav>

        {/* IOS Install Overlay */}
        {showIOSGuide && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-10 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-500">
            <div className="bg-[#111] border border-white/10 rounded-[3.5rem] p-12 max-w-md w-full space-y-10 text-center shadow-3xl">
              <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center mx-auto border border-white/10 shadow-lg text-[#D4AF37]">
                <Bell size={48} />
              </div>
              <div className="space-y-4">
                <h3 className="text-3xl font-black text-white tracking-tight">Price Alerts on iOS</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">Apple requires GoldView to be added to your Home Screen to enable Push Notifications.</p>
              </div>
              <div className="space-y-4 bg-black/40 p-8 rounded-[2.5rem] text-left border border-white/5">
                {[
                  { s: 1, t: 'Tap the Share icon in Safari toolbar' },
                  { s: 2, t: 'Scroll down to "Add to Home Screen"' },
                  { s: 3, t: 'Launch the app from your home screen' }
                ].map(item => (
                  <div key={item.s} className="flex items-center gap-5">
                    <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-xs font-black">{item.s}</div>
                    <p className="text-sm font-bold text-zinc-300">{item.t}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowIOSGuide(false)} className="w-full py-6 bg-[#D4AF37] text-black font-black rounded-3xl active:scale-95 transition-all shadow-xl shadow-[#D4AF37]/20">Got it, Proceed</button>
            </div>
          </div>
        )}

        {/* Professional SEO Footer */}
        <footer className="mt-24 px-8 pb-40 border-t border-white/5 pt-20 max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 mb-20">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <img src="/logo192.png" alt="Logo" className="w-8 h-8 opacity-50" />
                <h2 className="text-xl font-black text-white tracking-tight">GoldView Nepal</h2>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                The most advanced digital companion for tracking precious metal prices in the Nepal market. 
                Our platform delivers institutional-grade data accuracy with consumer-focused simplicity.
              </p>
            </div>
            <div className="space-y-6">
              <h2 className="text-sm font-black text-white uppercase tracking-widest">Resources</h2>
              <ul className="text-xs text-zinc-500 space-y-4 font-medium">
                <li className="flex items-center gap-2 group cursor-pointer hover:text-white transition-colors"><ChevronRight size={14} className="text-[#D4AF37]" /> Nepal Rastra Bank Forex</li>
                <li className="flex items-center gap-2 group cursor-pointer hover:text-white transition-colors"><ChevronRight size={14} className="text-[#D4AF37]" /> Federation (FENEGOSIDA) Rates</li>
                <li className="flex items-center gap-2 group cursor-pointer hover:text-white transition-colors"><ChevronRight size={14} className="text-[#D4AF37]" /> Jewelry Taxation Policy</li>
              </ul>
            </div>
            <div className="space-y-6">
              <h2 className="text-sm font-black text-white uppercase tracking-widest">Legal & Privacy</h2>
              <p className="text-[10px] text-zinc-600 leading-relaxed">
                Rates provided are for informational purposes only. GoldView is not responsible for 
                transactional discrepancies at retail locations. Always confirm live rates at your local dealer.
              </p>
              <div className="flex gap-4">
                  <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-zinc-500"><ShieldCheck size={18} /></div>
                  <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-zinc-500"><ExternalLink size={18} /></div>
                  <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-zinc-500"><Download size={18} /></div>
              </div>
            </div>
          </div>

          <div className="pt-16 border-t border-white/5 flex flex-col items-center gap-8">
            <div className="flex items-center gap-3 px-6 py-2 bg-white/5 rounded-full border border-white/5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e]" />
                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-500 text-center">Cloud Systems Sync: Operational</span>
            </div>
            <div className="text-center space-y-2">
                <p className="text-[11px] font-black uppercase tracking-[0.6em] text-zinc-500">Engineered by @Timeswantstocode</p>
                <p className="text-[8px] font-bold text-zinc-700">© 2024-2026 GoldView Nepal. Proprietary Interface Version 1.9.5-PRO</p>
            </div>
          </div>
        </footer>

        <Analytics />
        <SpeedInsights />
      </div>
    </HelmetProvider>
  );
}
