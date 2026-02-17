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
  AreaController
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
  Download
} from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Helmet, HelmetProvider } from 'react-helmet-async';

/**
 * GOLDVIEW NEPAL - VERSION 1.9.0
 * 
 * CORE FIXES APPLIED:
 * 1. Data Sanitization: Added regex to strip commas from price strings before parsing.
 * 2. Component Lifecycle: Added unique 'key' to Line component to force redraw on state change.
 * 3. Gradient Logic: Fixed canvas context check for background gradients.
 * 4. Scale Handling: Added explicit parsing for USD vs NPR scales.
 */

// Register ChartJS components
ChartJS.register(...registerables, Filler, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title, AreaController);

// Global Chart Defaults
ChartJS.defaults.animation = {
  duration: 400,
  easing: 'easeOutQuart'
};
ChartJS.defaults.responsive = true;
ChartJS.defaults.maintainAspectRatio = false;
ChartJS.defaults.color = 'rgba(255, 255, 255, 0.6)';
ChartJS.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';

// Constants
const DATA_URL = "https://raw.githubusercontent.com/Timeswantstocode/GoldView/main/data.json";
const FOREX_PROXY = "/api/forex";
const PRIMARY_DOMAIN = "https://viewgold.vercel.app";
const CACHE_KEY_METAL = 'gv_v19_metal_data';
const CACHE_KEY_FOREX = 'gv_v19_forex_data';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

/**
 * Utility: Sanitizes price strings and converts to float
 * Prevents "Invisible Graph" caused by NaN values
 */
const parsePrice = (val) => {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return val;
  const sanitized = String(val).replace(/,/g, '').trim();
  const parsed = parseFloat(sanitized);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Custom Tooltip Logic
 */
const getOrCreateTooltip = (chart) => {
  let tooltipEl = chart.canvas.parentNode.querySelector('div');
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.style.background = 'rgba(10, 10, 10, 0.85)';
    tooltipEl.style.backdropFilter = 'blur(20px)';
    tooltipEl.style.WebkitBackdropFilter = 'blur(20px)';
    tooltipEl.style.borderRadius = '16px';
    tooltipEl.style.color = 'white';
    tooltipEl.style.opacity = 1;
    tooltipEl.style.pointerEvents = 'none';
    tooltipEl.style.position = 'absolute';
    tooltipEl.style.transform = 'translate(-50%, 0)';
    tooltipEl.style.transition = 'all .15s ease';
    tooltipEl.style.border = '1px solid rgba(255, 255, 255, 0.12)';
    tooltipEl.style.padding = '12px 16px';
    tooltipEl.style.zIndex = '100';
    tooltipEl.style.boxShadow = '0 15px 40px rgba(0,0,0,0.6)';
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
      span.style.fontSize = '10px';
      span.style.fontWeight = '800';
      span.style.textTransform = 'uppercase';
      span.style.letterSpacing = '0.1em';
      span.style.marginBottom = '4px';
      span.style.opacity = '0.6';
      span.innerText = title;
      container.appendChild(span);
    });

    bodyLines.forEach((body) => {
      const span = document.createElement('span');
      span.style.fontSize = '16px';
      span.style.fontWeight = '900';
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
  tooltipEl.style.top = positionY + tooltip.caretY - 80 + 'px';
};

/**
 * Component: Price Card
 */
const PriceCard = memo(({ id, active, onClick, data, diff, loading }) => {
  const meta = {
    gold: { label: '24K Chhapawal', sub: 'Per Tola', color: '#D4AF37', grad: 'from-[#D4AF37]/40 to-transparent' },
    tejabi: { label: '22K Tejabi', sub: 'Per Tola', color: '#CD7F32', grad: 'from-[#CD7F32]/40 to-transparent' },
    silver: { label: 'Pure Silver', sub: 'Per Tola', color: '#94a3b8', grad: 'from-zinc-400/30 to-transparent' },
    usd: { label: 'USD to NPR', sub: 'Official Buy', color: '#22c55e', grad: 'from-[#22c55e]/30 to-transparent' }
  }[id];

  return (
    <div 
      onClick={onClick}
      className={`relative p-6 rounded-[2.5rem] border transition-all duration-500 cursor-pointer overflow-hidden ${
        active 
          ? `bg-gradient-to-br ${meta.grad} border-white/20 scale-[1.02] shadow-2xl` 
          : 'bg-white/5 border-white/5 opacity-50 hover:opacity-80'
      }`}
    >
      <div className="flex justify-between items-start relative z-10">
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{meta.label}</h4>
          <p className="text-[8px] font-bold text-zinc-500">{meta.sub}</p>
        </div>
        {!loading && (
          <div className={`px-2 py-1 rounded-lg text-[10px] font-black border ${
            diff.isUp ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
          }`}>
            {diff.val}
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-between items-end relative z-10">
        <h2 className="text-3xl font-black tracking-tighter text-white">
          {id === 'usd' ? `रू ${data.toFixed(2)}` : `रू ${Math.round(data).toLocaleString()}`}
        </h2>
        {active && (
          <div className="p-2 rounded-full bg-white/10">
            {diff.isUp ? <TrendingUp size={16} className="text-green-500" /> : <TrendingDown size={16} className="text-red-500" />}
          </div>
        )}
      </div>
      
      {active && (
        <div className="absolute -right-4 -bottom-4 opacity-10">
          <Activity size={100} style={{ color: meta.color }} />
        </div>
      )}
    </div>
  );
});

/**
 * Component: Main Application
 */
export default function App() {
  // State Initialization
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

  // Effect: Data Fetching
  useEffect(() => {
    const fetchData = async () => {
      try {
        const metalResp = await fetch(`${DATA_URL}?t=${Date.now()}`);
        if (metalResp.ok) {
          const json = await metalResp.json();
          if (Array.isArray(json)) {
            setPriceData(json);
            localStorage.setItem(CACHE_KEY_METAL, JSON.stringify(json));
          }
        }
      } catch (err) {
        console.error("Metal fetch error:", err);
      } finally {
        setLoading(false);
      }

      try {
        const forexResp = await fetch(FOREX_PROXY);
        if (forexResp.ok) {
          const json = await forexResp.json();
          if (json.status === "success" && Array.isArray(json.rates)) {
            const transformed = json.rates.map(day => ({
              date: day.date,
              usdRate: parsePrice(day.currencies.find(c => c.code === 'USD')?.buy || 0),
              rates: day.currencies
            })).sort((a, b) => new Date(a.date) - new Date(b.date));
            setForexHistory(transformed);
            localStorage.setItem(CACHE_KEY_FOREX, JSON.stringify(transformed));
          }
        }
      } catch (err) {
        console.error("Forex fetch error:", err);
      } finally {
        setForexLoading(false);
      }
    };

    fetchData();
    if ('Notification' in window) setNotifStatus(Notification.permission);
  }, []);

  // Derived Values
  const themeColor = useMemo(() => {
    if (view === 'calculator' && calcMode === 'currency') return '#22c55e';
    const colors = { gold: '#D4AF37', tejabi: '#CD7F32', silver: '#94a3b8', usd: '#22c55e' };
    return colors[activeMetal] || '#D4AF37';
  }, [activeMetal, view, calcMode]);

  const activeDataList = useMemo(() => {
    return activeMetal === 'usd' ? forexHistory : priceData;
  }, [activeMetal, forexHistory, priceData]);

  const filteredData = useMemo(() => {
    return activeDataList.slice(-timeframe);
  }, [activeDataList, timeframe]);

  const getDayDiff = useCallback((id) => {
    const source = id === 'usd' ? forexHistory : priceData;
    if (source.length < 2) return { val: 'Rs. 0', isUp: true };
    const curr = id === 'usd' ? source[source.length-1].usdRate : parsePrice(source[source.length-1][id]);
    const prev = id === 'usd' ? source[source.length-2].usdRate : parsePrice(source[source.length-2][id]);
    const diff = curr - prev;
    return { 
      val: `Rs. ${diff >= 0 ? '+' : ''}${diff.toLocaleString(undefined, { minimumFractionDigits: id === 'usd' ? 2 : 0 })}`, 
      isUp: diff >= 0 
    };
  }, [forexHistory, priceData]);

  // Chart Data Preparation
  const chartData = useMemo(() => {
    if (!filteredData.length) return { labels: [], datasets: [] };

    const labels = filteredData.map(d => {
      const date = new Date(d.date.replace(' ', 'T'));
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const dataPoints = filteredData.map(d => 
      activeMetal === 'usd' ? d.usdRate : parsePrice(d[activeMetal])
    );

    return {
      labels,
      datasets: [{
        data: dataPoints,
        borderColor: themeColor,
        borderWidth: 4,
        fill: true,
        tension: 0.4,
        pointRadius: (ctx) => (selectedPoint?.index === ctx.dataIndex ? 8 : 0),
        pointHoverRadius: 10,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: themeColor,
        pointBorderWidth: 3,
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return null;
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, `${themeColor}40`);
          gradient.addColorStop(1, 'transparent');
          return gradient;
        },
      }]
    };
  }, [filteredData, activeMetal, selectedPoint, themeColor]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 10, bottom: 0, left: 0, right: 0 } },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: false,
        external: externalTooltipHandler
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { 
          color: 'rgba(255, 255, 255, 0.4)', 
          font: { size: 10, weight: '700' },
          maxRotation: 0
        }
      },
      y: {
        position: 'right',
        grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
        ticks: {
          color: 'rgba(255, 255, 255, 0.4)',
          font: { size: 10, weight: '600' },
          callback: (val) => activeMetal === 'usd' ? `रू${val}` : `${val/1000}k`
        }
      }
    },
    onClick: (e, elements) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        const point = filteredData[index];
        setSelectedPoint({ 
          index, 
          date: point.date, 
          price: activeMetal === 'usd' ? point.usdRate : parsePrice(point[activeMetal]) 
        });
      }
    }
  }), [filteredData, activeMetal]);

  // Handlers
  const handleNotif = async () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;

    if (isIOS && !isStandalone) {
      setShowIOSGuide(true);
      return;
    }

    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setNotifStatus(permission);
  };

  const calculateResult = () => {
    const weight = (Number(calc.tola)||0) + (Number(calc.aana)||0)/16 + (Number(calc.lal)||0)/192;
    const rate = parsePrice(priceData[priceData.length-1]?.[activeMetal === 'usd' ? 'gold' : activeMetal]);
    if (tradeMode === 'sell') return weight * rate * 0.95;
    const subtotal = weight * rate + (Number(calc.making) || 0);
    return calc.vat ? subtotal * 1.13 : subtotal;
  };

  const calculateCurrency = () => {
    const latest = forexHistory[forexHistory.length - 1]?.rates || [];
    const target = latest.find(r => r.code === currCalc.source);
    if (!target) return 0;
    const rawRate = parsePrice(target.buy);
    const unit = parseInt(target.unit || 1);
    const amt = Number(currCalc.amount) || 0;
    
    if (currCalc.isSwapped) return (amt / rawRate) * unit;
    return (amt / unit) * rawRate;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020202] flex flex-col items-center justify-center space-y-4">
        <RefreshCcw className="w-12 h-12 text-[#D4AF37] animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Loading Market Data...</p>
      </div>
    );
  }

  return (
    <HelmetProvider>
      <div className="min-h-screen bg-[#020202] text-zinc-100 font-sans pb-40 overflow-x-hidden selection:bg-[#D4AF37] selection:text-black">
        <Helmet>
          <title>Gold Rate Nepal Today | Live 24K & 22K Prices - GoldView</title>
          <meta name="description" content="Official GoldView: Real-time 24K Gold, Silver and USD rates in Nepal with jewelry calculator." />
          <meta name="theme-color" content="#020202" />
        </Helmet>

        {/* Header */}
        <header className="p-8 pt-16 flex justify-between items-center relative z-20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-zinc-800 to-black border border-white/10 flex items-center justify-center shadow-2xl">
              <img src="/logo192.png" alt="GV" className="w-8 h-8 rounded-lg" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter">GoldView</h1>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Live Nepal Market</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleNotif} className={`p-4 rounded-2xl bg-white/5 border border-white/10 transition-all active:scale-90 ${notifStatus === 'granted' ? 'text-[#D4AF37]' : 'text-zinc-500'}`}>
              <Bell size={20} />
            </button>
            <button onClick={() => window.location.reload()} className="p-4 rounded-2xl bg-white/5 border border-white/10 text-zinc-500 active:scale-90 active:rotate-180 transition-all">
              <RefreshCcw size={20} />
            </button>
          </div>
        </header>

        {/* Dashboard View */}
        {view === 'dashboard' && (
          <main className="px-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Price Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['gold', 'tejabi', 'silver', 'usd'].map((type) => (
                <PriceCard 
                  key={type}
                  id={type}
                  active={activeMetal === type}
                  onClick={() => { setActiveMetal(type); setSelectedPoint(null); }}
                  data={type === 'usd' ? (forexHistory[forexHistory.length-1]?.usdRate || 0) : parsePrice(priceData[priceData.length-1]?.[type])}
                  diff={getDayDiff(type)}
                  loading={type === 'usd' && forexLoading}
                />
              ))}
            </div>

            {/* Chart Section */}
            <section className="bg-white/5 border border-white/10 rounded-[3rem] p-8 backdrop-blur-3xl relative overflow-hidden">
              <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                    <Activity size={18} style={{ color: themeColor }} />
                  </div>
                  <h3 className="text-lg font-black tracking-tight">Market Analytics</h3>
                </div>
                <div className="flex bg-black/40 rounded-full p-1 border border-white/5">
                  {[7, 30, 90].map((t) => (
                    <button 
                      key={t} 
                      onClick={() => { setTimeframe(t); setSelectedPoint(null); }}
                      className={`px-4 py-1.5 rounded-full text-[10px] font-black transition-all ${timeframe === t ? 'text-black' : 'text-zinc-500'}`}
                      style={timeframe === t ? { backgroundColor: themeColor } : {}}
                    >
                      {t === 7 ? '7D' : t === 30 ? '1M' : '3M'}
                    </button>
                  ))}
                </div>
              </div>

              {/* The Fix: key={activeMetal} forces Chart.js to re-initialize, preventing invisible canvas */}
              <div className="h-72 w-full relative">
                <Line 
                  key={`${activeMetal}-${timeframe}`} 
                  ref={chartRef}
                  data={chartData} 
                  options={chartOptions} 
                />
              </div>

              {/* Selection Info */}
              <div className={`mt-6 transition-all duration-500 ${selectedPoint ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 h-0'}`}>
                {selectedPoint && (
                  <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-black/40 flex items-center justify-center border border-white/10">
                        <Calendar size={20} style={{ color: themeColor }} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Selected History</p>
                        <p className="text-sm font-bold">{new Date(selectedPoint.date.replace(' ', 'T')).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-white">
                        {activeMetal === 'usd' ? `रू ${selectedPoint.price.toFixed(2)}` : `रू ${Math.round(selectedPoint.price).toLocaleString()}`}
                      </p>
                      <button onClick={() => setSelectedPoint(null)} className="text-[10px] font-black uppercase text-zinc-500 hover:text-white transition-colors">Dismiss</button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 rounded-[2.5rem] bg-zinc-900/50 border border-white/5 space-y-2">
                <div className="flex items-center gap-2 text-zinc-500 mb-1">
                  <ShieldCheck size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Verify</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed font-medium">Rates sourced from Federation of Nepal Gold and Silver Dealers' Association.</p>
              </div>
              <div className="p-6 rounded-[2.5rem] bg-zinc-900/50 border border-white/5 space-y-2">
                <div className="flex items-center gap-2 text-zinc-500 mb-1">
                  <Info size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Note</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed font-medium">Market is closed on Saturdays and Public Holidays.</p>
              </div>
            </div>
          </main>
        )}

        {/* Calculator View */}
        {view === 'calculator' && (
          <main className="px-6 space-y-6 animate-in zoom-in-95 duration-500">
            <div className="bg-white/5 border border-white/10 rounded-[3.5rem] p-8 backdrop-blur-3xl shadow-2xl">
              {/* Mode Toggle */}
              <div className="flex p-1.5 bg-black/40 rounded-[2rem] border border-white/5 mb-8">
                <button 
                  onClick={() => setCalcMode('jewelry')} 
                  className={`flex-1 py-4 rounded-3xl text-[10px] font-black uppercase transition-all duration-300 ${calcMode === 'jewelry' ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20' : 'text-zinc-500'}`}
                >
                  Jewelry Estimator
                </button>
                <button 
                  onClick={() => setCalcMode('currency')} 
                  className={`flex-1 py-4 rounded-3xl text-[10px] font-black uppercase transition-all duration-300 ${calcMode === 'currency' ? 'bg-[#22c55e] text-black shadow-lg shadow-[#22c55e]/20' : 'text-zinc-500'}`}
                >
                  Forex Converter
                </button>
              </div>

              {calcMode === 'jewelry' ? (
                <div className="space-y-6">
                  {/* Buy/Sell Toggle */}
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setTradeMode('buy')} 
                      className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase border transition-all ${tradeMode === 'buy' ? 'bg-green-500/10 border-green-500 text-green-500' : 'bg-transparent border-white/10 text-zinc-500'}`}
                    >
                      Purchase
                    </button>
                    <button 
                      onClick={() => setTradeMode('sell')} 
                      className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase border transition-all ${tradeMode === 'sell' ? 'bg-red-500/10 border-red-500 text-red-500' : 'bg-transparent border-white/10 text-zinc-500'}`}
                    >
                      Sell Back
                    </button>
                  </div>

                  {/* Metal Selection */}
                  <div className="flex justify-center gap-2 py-2">
                    {['gold', 'tejabi', 'silver'].map(m => (
                      <button 
                        key={m} 
                        onClick={() => setActiveMetal(m)}
                        className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase border transition-all ${activeMetal === m ? 'border-white/40 bg-white/10 text-white' : 'border-white/5 text-zinc-600'}`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>

                  {/* Weight Inputs */}
                  <div className="grid grid-cols-3 gap-4">
                    {['tola', 'aana', 'lal'].map((unit) => (
                      <div key={unit} className="space-y-2">
                        <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block text-center">{unit}</label>
                        <input 
                          type="number" 
                          placeholder="0"
                          className="w-full bg-black/60 border border-white/10 p-5 rounded-3xl text-center font-black text-2xl outline-none focus:border-[#D4AF37]/50 focus:ring-4 focus:ring-[#D4AF37]/10 transition-all"
                          value={calc[unit]}
                          onChange={(e) => setCalc({ ...calc, [unit]: e.target.value })}
                        />
                      </div>
                    ))}
                  </div>

                  {tradeMode === 'buy' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                      <div className="relative">
                        <input 
                          type="number" 
                          placeholder="Making Charge (Rs)" 
                          className="w-full bg-black/60 border border-white/10 p-6 rounded-[2rem] font-black text-lg outline-none focus:border-[#D4AF37]/50"
                          value={calc.making}
                          onChange={(e) => setCalc({ ...calc, making: e.target.value })}
                        />
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-600 font-black text-xs uppercase">Total Rs</div>
                      </div>
                      <button 
                        onClick={() => setCalc({ ...calc, vat: !calc.vat })}
                        className={`w-full p-6 rounded-[2rem] border flex justify-between items-center transition-all ${calc.vat ? 'border-blue-500/30 bg-blue-500/5' : 'border-white/5 bg-white/5'}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${calc.vat ? 'border-blue-500 bg-blue-500' : 'border-zinc-700'}`}>
                            {calc.vat && <Zap size={12} className="text-black fill-black" />}
                          </div>
                          <span className="font-bold text-zinc-300">Apply 13% Government VAT</span>
                        </div>
                        <Info size={16} className="text-zinc-600" />
                      </button>
                    </div>
                  )}

                  {/* Final Calculation Result */}
                  <div className="p-10 rounded-[3rem] text-center shadow-2xl relative overflow-hidden group" style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)` }}>
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                      <Scale size={80} className="text-black" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-2 text-black/60">Estimated {tradeMode === 'buy' ? 'Total Cost' : 'Payout'}</p>
                    <h3 className="text-5xl font-black tracking-tighter text-black">
                      रू {Math.round(calculateResult()).toLocaleString()}
                    </h3>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Currency Converter */}
                  <div className="bg-black/40 rounded-[2.5rem] p-6 border border-white/5 space-y-8">
                    <div className="flex items-center justify-between">
                      <div className="space-y-4">
                        <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">From Currency</p>
                        <div className="flex items-center gap-3">
                          <span className="text-4xl">{currCalc.isSwapped ? '🇳🇵' : currencyList.find(c => c.code === currCalc.source)?.flag}</span>
                          <select 
                            className="bg-transparent text-xl font-black text-white outline-none"
                            value={currCalc.source}
                            onChange={(e) => setCurrCalc({ ...currCalc, source: e.target.value })}
                          >
                            {currencyList.map(c => <option key={c.code} value={c.code} className="bg-zinc-900">{c.code}</option>)}
                          </select>
                        </div>
                      </div>
                      <button 
                        onClick={() => setCurrCalc({ ...currCalc, isSwapped: !currCalc.isSwapped })}
                        className="p-5 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 active:rotate-180 transition-all duration-500"
                      >
                        <ArrowRightLeft size={24} />
                      </button>
                      <div className="space-y-4 text-right">
                        <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">To Currency</p>
                        <div className="flex items-center gap-3 justify-end">
                          <span className="text-xl font-black text-white">{currCalc.isSwapped ? currCalc.source : 'NPR'}</span>
                          <span className="text-4xl">{!currCalc.isSwapped ? '🇳🇵' : currencyList.find(c => c.code === currCalc.source)?.flag}</span>
                        </div>
                      </div>
                    </div>

                    <div className="relative">
                      <input 
                        type="number" 
                        className="w-full bg-zinc-900/50 border border-white/10 p-8 rounded-3xl text-4xl font-black text-center text-white outline-none focus:border-green-500/50 transition-all"
                        value={currCalc.amount}
                        onChange={(e) => setCurrCalc({ ...currCalc, amount: e.target.value })}
                      />
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-700">
                        <Globe size={24} />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-[#22c55e] to-[#16a34a] p-12 rounded-[3.5rem] text-center shadow-xl">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-2 text-black/60">Conversion Result</p>
                    <h3 className="text-5xl font-black tracking-tighter text-black">
                      {currCalc.isSwapped ? '' : 'रू '}
                      {calculateCurrency().toLocaleString(undefined, { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      })}
                      {currCalc.isSwapped ? ` ${currCalc.source}` : ''}
                    </h3>
                  </div>
                </div>
              )}
            </div>
          </main>
        )}

        {/* Floating Bottom Nav */}
        <nav className="fixed bottom-10 left-8 right-8 h-24 bg-zinc-900/60 backdrop-blur-3xl rounded-[3rem] border border-white/10 flex items-center px-4 z-50 shadow-2xl">
          <button 
            onClick={() => setView('dashboard')} 
            className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-[2.5rem] transition-all duration-500 ${view === 'dashboard' ? 'text-black' : 'text-zinc-500'}`}
            style={view === 'dashboard' ? { backgroundColor: themeColor } : {}}
          >
            <LayoutDashboard size={24} className={view === 'dashboard' ? 'fill-black' : ''} />
            <span className="text-[9px] font-black uppercase tracking-widest">Market</span>
          </button>
          <button 
            onClick={() => setView('calculator')} 
            className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-[2.5rem] transition-all duration-500 ${view === 'calculator' ? 'text-black' : 'text-zinc-500'}`}
            style={view === 'calculator' ? { backgroundColor: themeColor } : {}}
          >
            <Calculator size={24} className={view === 'calculator' ? 'fill-black' : ''} />
            <span className="text-[9px] font-black uppercase tracking-widest">Calculator</span>
          </button>
        </nav>

        {/* IOS Install Guide Modal */}
        {showIOSGuide && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/90 backdrop-blur-lg animate-in fade-in duration-300">
            <div className="bg-[#121212] border border-white/10 rounded-[3rem] p-10 max-w-sm w-full space-y-8 text-center">
              <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto border border-white/10 text-[#D4AF37]">
                <Bell size={40} />
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-black text-white">Enable Notifications</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">On iOS, you must add GoldView to your Home Screen to receive live price alerts.</p>
              </div>
              <div className="space-y-4 bg-white/5 p-6 rounded-3xl text-left border border-white/5">
                {[
                  { step: 1, text: 'Tap the Share icon in Safari' },
                  { step: 2, text: 'Select "Add to Home Screen"' },
                  { step: 3, text: 'Open the app from your home' }
                ].map(item => (
                  <div key={item.step} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-black">{item.step}</div>
                    <p className="text-xs font-bold text-zinc-300">{item.text}</p>
                  </div>
                ))}
              </div>
              <button 
                onClick={() => setShowIOSGuide(false)} 
                className="w-full py-5 bg-[#D4AF37] text-black font-black rounded-3xl active:scale-95 transition-all"
              >
                Understood
              </button>
            </div>
          </div>
        )}

        {/* Enhanced SEO Footer */}
        <footer className="mt-20 px-8 pb-32 border-t border-white/5 pt-16 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-4">
              <h2 className="text-lg font-black text-white tracking-tight">About GoldView Nepal</h2>
              <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                GoldView is Nepal's premier digital platform for real-time precious metal tracking. We aggregate data from official 
                federation sources and international markets to provide the most accurate 24K Chhapawal, 22K Tejabi, and 
                Silver rates available in the Kathmandu Valley and across Nepal.
              </p>
            </div>
            <div className="space-y-4">
              <h2 className="text-lg font-black text-white tracking-tight">Market Standards</h2>
              <ul className="text-xs text-zinc-500 space-y-2 font-medium">
                <li className="flex items-center gap-2"><ChevronRight size={12} className="text-[#D4AF37]" /> 1 Tola = 11.66 Grams</li>
                <li className="flex items-center gap-2"><ChevronRight size={12} className="text-[#D4AF37]" /> 1 Tola = 16 Aana</li>
                <li className="flex items-center gap-2"><ChevronRight size={12} className="text-[#D4AF37]" /> Rates usually update at 11:00 AM daily</li>
              </ul>
            </div>
          </div>

          <div className="pt-12 border-t border-white/5 flex flex-col items-center gap-6">
            <div className="flex gap-4">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10"><ShieldCheck size={20} className="text-zinc-400" /></div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10"><Globe size={20} className="text-zinc-400" /></div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10"><Download size={20} className="text-zinc-400" /></div>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600">Built for Nepal by @Timeswantstocode</p>
          </div>
        </footer>

        <Analytics />
        <SpeedInsights />
      </div>
    </HelmetProvider>
  );
}

/**
 * TECHNICAL DOCUMENTATION
 * 
 * 1. Price Data Structure:
 *    Expects array of { date: string, gold: string, tejabi: string, silver: string }
 *    Strings can contain commas, handled by parsePrice().
 * 
 * 2. Forex Proxy:
 *    Expects NRB API format. Transformed into usdRate for history mapping.
 * 
 * 3. Chart Lifecycle:
 *    The 'key' prop on <Line /> is critical. Without it, switching from 'gold' (high values)
 *    to 'usd' (low values) often breaks the Chart.js internal scale calculator.
 * 
 * 4. PWA Support:
 *    Optimized for standalone display-mode with specific iOS installation guides.
 */