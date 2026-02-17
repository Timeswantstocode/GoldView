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
  Award,
  Clock,
  MapPin,
  CheckCircle2,
  TrendingUp as TrendingIcon
} from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Helmet, HelmetProvider } from 'react-helmet-async';

/**
 * GOLDVIEW NEPAL - VERSION 2.0.1
 * 
 * FIX LOG:
 * 1. Graph Switching: Added dynamic key to Line component using metal + timeframe state.
 * 2. Y-Axis Ticks: Disabled display of tick labels on the right side of the graph.
 * 3. Tooltip Points: Restored pointRadius and hoverRadius for visual feedback dots.
 * 4. Grid Opacity: Lowered grid line alpha to 0.03 for minimal distraction.
 * 5. Data Flow: Ensured parsePrice handles all localized string formats.
 */

// Register ChartJS
ChartJS.register(...registerables, Filler, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title);

// Global Performance Config
ChartJS.defaults.animation = {
  duration: 600,
  easing: 'easeOutQuart'
};
ChartJS.defaults.responsive = true;
ChartJS.defaults.maintainAspectRatio = false;

const DATA_URL = "https://raw.githubusercontent.com/Timeswantstocode/GoldView/main/data.json";
const FOREX_PROXY = "/api/forex";
const PRIMARY_DOMAIN = "https://viewgold.vercel.app";

/**
 * Sanitizes input values to ensure they are valid numbers for the graph.
 * Strips commas (1,20,000 -> 120000) and handles undefined states.
 */
const parsePrice = (val) => {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/,/g, '').replace(/\s/g, '').trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Custom Tooltip Handler
 * Logic to render a custom HTML div instead of the standard canvas tooltip.
 */
const getOrCreateTooltip = (chart) => {
  let tooltipEl = chart.canvas.parentNode.querySelector('div.gv-custom-tooltip');
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.classList.add('gv-custom-tooltip');
    tooltipEl.style.background = 'rgba(10, 10, 10, 0.9)';
    tooltipEl.style.backdropFilter = 'blur(20px)';
    tooltipEl.style.WebkitBackdropFilter = 'blur(20px)';
    tooltipEl.style.borderRadius = '18px';
    tooltipEl.style.color = 'white';
    tooltipEl.style.opacity = 1;
    tooltipEl.style.pointerEvents = 'none';
    tooltipEl.style.position = 'absolute';
    tooltipEl.style.transform = 'translate(-50%, 0)';
    tooltipEl.style.transition = 'all .15s ease';
    tooltipEl.style.border = '1px solid rgba(255, 255, 255, 0.12)';
    tooltipEl.style.padding = '12px 16px';
    tooltipEl.style.zIndex = '100';
    tooltipEl.style.boxShadow = '0 20px 40px rgba(0,0,0,0.6)';
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
      span.style.letterSpacing = '0.1em';
      span.style.marginBottom = '4px';
      span.style.opacity = '0.5';
      span.innerText = title;
      container.appendChild(span);
    });

    bodyLines.forEach((body) => {
      const span = document.createElement('span');
      span.style.fontSize = '16px';
      span.style.fontWeight = '900';
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
 * Component: Unit Info Helper
 */
const UnitHelper = memo(() => (
  <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5">
    <div className="space-y-3">
      <h4 className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Weight Standard</h4>
      {[
        { l: '1 Tola', v: '11.664g' },
        { l: '10 Grams', v: '0.857 Tola' },
        { l: '1 Aana', v: '0.729g' }
      ].map((item, idx) => (
        <div key={idx} className="flex justify-between items-center text-[10px] font-bold">
          <span className="text-zinc-400">{item.l}</span>
          <span className="text-white">{item.v}</span>
        </div>
      ))}
    </div>
    <div className="space-y-3">
      <h4 className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Division Standard</h4>
      {[
        { l: '1 Tola', v: '16 Aana' },
        { l: '1 Aana', v: '12 Lal' },
        { l: '1 Tola', v: '192 Lal' }
      ].map((item, idx) => (
        <div key={idx} className="flex justify-between items-center text-[10px] font-bold">
          <span className="text-zinc-400">{item.l}</span>
          <span className="text-white">{item.v}</span>
        </div>
      ))}
    </div>
  </div>
));

export default function App() {
  const [priceData, setPriceData] = useState(() => JSON.parse(localStorage.getItem('gv_v2_metal') || '[]'));
  const [forexHistory, setForexHistory] = useState(() => JSON.parse(localStorage.getItem('gv_v2_forex') || '[]'));
  const [loading, setLoading] = useState(priceData.length === 0);
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

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const mRes = await fetch(`${DATA_URL}?t=${Date.now()}`);
        const mJson = await mRes.json();
        if (Array.isArray(mJson)) {
          setPriceData(mJson);
          localStorage.setItem('gv_v2_metal', JSON.stringify(mJson));
        }

        const fRes = await fetch(FOREX_PROXY);
        const fJson = await fRes.json();
        if (fJson.status === "success") {
          const trans = fJson.rates.map(d => ({
            date: d.date,
            usdRate: parsePrice(d.currencies.find(c => c.code === 'USD')?.buy || 0),
            rates: d.currencies
          })).sort((a, b) => new Date(a.date) - new Date(b.date));
          setForexHistory(trans);
          localStorage.setItem('gv_v2_forex', JSON.stringify(trans));
        }
      } catch (e) { console.error("Data fetch failed", e); }
      finally { setLoading(false); }
    };
    fetchAll();
    if ('Notification' in window) setNotifStatus(Notification.permission);
  }, []);

  const themeColor = useMemo(() => {
    if (view === 'calculator' && calcMode === 'currency') return '#22c55e';
    return { gold: '#D4AF37', tejabi: '#CD7F32', silver: '#94a3b8', usd: '#22c55e' }[activeMetal] || '#D4AF37';
  }, [activeMetal, view, calcMode]);

  const filteredData = useMemo(() => {
    const list = activeMetal === 'usd' ? forexHistory : priceData;
    return list.slice(-timeframe);
  }, [activeMetal, timeframe, priceData, forexHistory]);

  const getDayDiff = useCallback((id) => {
    const src = id === 'usd' ? forexHistory : priceData;
    if (src.length < 2) return { val: 'Rs. 0', isUp: true };
    const c = id === 'usd' ? src[src.length-1].usdRate : parsePrice(src[src.length-1][id]);
    const p = id === 'usd' ? src[src.length-2].usdRate : parsePrice(src[src.length-2][id]);
    const d = c - p;
    return { val: `Rs. ${d >= 0 ? '+' : ''}${d.toLocaleString(undefined, { minimumFractionDigits: id === 'usd' ? 2 : 0 })}`, isUp: d >= 0 };
  }, [forexHistory, priceData]);

  const chartData = useMemo(() => {
    const labels = filteredData.map(d => {
      const dt = new Date(d.date.replace(' ', 'T'));
      return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    const points = filteredData.map(d => activeMetal === 'usd' ? d.usdRate : parsePrice(d[activeMetal]));

    return {
      labels,
      datasets: [{
        data: points,
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
          const { ctx, chartArea } = context.chart;
          if (!chartArea) return null;
          const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          g.addColorStop(0, `${themeColor}40`);
          g.addColorStop(1, 'transparent');
          return g;
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
        grid: { display: true, color: 'rgba(255, 255, 255, 0.03)', borderDash: [6, 6], drawTicks: false },
        ticks: { color: 'rgba(255, 255, 255, 0.4)', font: { size: 9, weight: '700' }, maxRotation: 0 }
      },
      y: {
        position: 'right',
        grid: { display: true, color: 'rgba(255, 255, 255, 0.03)', borderDash: [5, 5], drawBorder: false },
        ticks: { display: false } // FIX: Removed price values from right side
      }
    },
    onClick: (e, els) => {
      if (els.length > 0) {
        const i = els[0].index;
        const d = filteredData[i];
        setSelectedPoint({ index: i, date: d.date, price: activeMetal === 'usd' ? d.usdRate : parsePrice(d[activeMetal]) });
      }
    }
  }), [filteredData, activeMetal]);

  const handleJewelry = () => {
    const w = (Number(calc.tola)||0) + (Number(calc.aana)||0)/16 + (Number(calc.lal)||0)/192;
    const r = parsePrice(priceData[priceData.length-1]?.[activeMetal === 'usd' ? 'gold' : activeMetal]);
    if (tradeMode === 'sell') return w * r * 0.95;
    const sub = w * r + (Number(calc.making) || 0);
    return calc.vat ? sub * 1.13 : sub;
  };

  const handleForex = () => {
    const rates = forexHistory[forexHistory.length - 1]?.rates || [];
    const t = rates.find(r => r.code === currCalc.source);
    if (!t) return 0;
    const rate = parsePrice(t.buy);
    const u = parseInt(t.unit || 1);
    const amt = Number(currCalc.amount) || 0;
    if (currCalc.isSwapped) return (amt / rate) * u;
    return (amt / u) * rate;
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020202] flex flex-col items-center justify-center gap-4">
      <RefreshCcw className="w-10 h-10 text-[#D4AF37] animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Connecting to Market...</p>
    </div>
  );

  return (
    <HelmetProvider>
      <div className="min-h-screen bg-[#020202] text-zinc-100 font-sans pb-40 overflow-x-hidden relative">
        <Helmet>
          <title>Gold Price Nepal Today | Chhapawal & Silver Live - GoldView</title>
          <meta name="description" content="Official GoldView: Real-time 24K Chhapawal Gold and Silver rates in Nepal today." />
        </Helmet>

        <header className="p-8 pt-16 flex justify-between items-end relative z-10 max-w-5xl mx-auto">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full animate-pulse shadow-lg" style={{ backgroundColor: themeColor, boxShadow: `0 0 10px ${themeColor}` }}></div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em]" style={{ color: themeColor }}>Live Updates</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center border border-white/10 overflow-hidden shadow-2xl">
                <img src="/logo192.png" alt="Logo" className="w-7 h-7" />
              </div>
              <h1 className="text-4xl font-black tracking-tighter text-white">GoldView</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowIOSGuide(true)} className="p-4 bg-white/5 rounded-3xl border border-white/10 active:scale-90 transition-all text-zinc-400">
              <Bell size={20} className={notifStatus === 'granted' ? 'text-[#D4AF37]' : ''} />
            </button>
            <button onClick={() => window.location.reload()} className="p-4 bg-white/5 rounded-3xl border border-white/10 active:scale-90 transition-all text-zinc-400">
              <RefreshCcw size={20} />
            </button>
          </div>
        </header>

        {view === 'dashboard' ? (
          <main className="px-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['gold', 'tejabi', 'silver', 'usd'].map((type) => {
                const isActive = activeMetal === type;
                const diff = getDayDiff(type);
                const val = type === 'usd' ? (forexHistory[forexHistory.length-1]?.usdRate || 0) : parsePrice(priceData[priceData.length-1]?.[type]);
                const meta = {
                    gold: { l: '24K Chhapawal', s: 'Per Tola', g: 'from-[#D4AF37]/40 to-transparent' },
                    tejabi: { l: '22K Tejabi', s: 'Per Tola', g: 'from-[#CD7F32]/40 to-transparent' },
                    silver: { l: 'Pure Silver', s: 'Per Tola', g: 'from-zinc-400/30 to-transparent' },
                    usd: { l: 'USD to NPR', s: 'Buying Rate', g: 'from-[#22c55e]/30 to-transparent' }
                }[type];
                return (
                  <div key={type} onClick={() => { setActiveMetal(type); setSelectedPoint(null); }}
                    className={`p-7 rounded-[2.8rem] border transition-all duration-500 cursor-pointer overflow-hidden relative ${
                      isActive ? `bg-gradient-to-br ${meta.g} border-white/20 scale-[1.02] shadow-2xl` : 'bg-white/5 border-white/5 opacity-40 hover:opacity-60'
                    }`}>
                    <div className="flex justify-between items-start mb-6 relative z-10">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{meta.l}</p>
                        <p className="text-[8px] font-bold text-zinc-600">{meta.s}</p>
                      </div>
                      <div className={`px-2 py-1 rounded-lg text-[9px] font-black border ${diff.isUp ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>{diff.val}</div>
                    </div>
                    <div className="flex justify-between items-end relative z-10">
                      <h2 className="text-4xl font-black tracking-tighter text-white">
                        {type === 'usd' ? `रू ${val.toFixed(2)}` : `रू ${Math.round(val).toLocaleString()}`}
                      </h2>
                      {isActive && <TrendingUp size={20} className={diff.isUp ? 'text-green-500' : 'text-red-500 rotate-180'} />}
                    </div>
                    {isActive && <div className="absolute -right-6 -bottom-6 opacity-10"><Activity size={120} style={{ color: themeColor }} /></div>}
                  </div>
                );
              })}
            </div>

            <section className="bg-white/5 border border-white/10 rounded-[3.5rem] p-8 backdrop-blur-3xl relative overflow-hidden">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-zinc-400">
                    <Activity size={20} style={{ color: themeColor }} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-white">Market Trend</h3>
                    <p className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">Historical Performance</p>
                  </div>
                </div>
                <div className="flex bg-black/40 rounded-full p-1 border border-white/5">
                  {[7, 30, 90].map((t) => (
                    <button key={t} onClick={() => { setTimeframe(t); setSelectedPoint(null); }}
                      className={`px-5 py-2 rounded-full text-[10px] font-black transition-all ${timeframe === t ? 'text-black shadow-xl shadow-white/5' : 'text-zinc-500'}`}
                      style={timeframe === t ? { backgroundColor: themeColor } : {}}>
                      {t === 7 ? '7D' : t === 30 ? '1M' : '3M'}
                    </button>
                  ))}
                </div>
              </div>

              {/* FIX: Dynamic Key ensures the graph switches data and resets the Y-axis */}
              <div className="h-72 w-full relative">
                <Line 
                    key={`${activeMetal}-${timeframe}`} 
                    ref={chartRef} 
                    data={chartData} 
                    options={chartOptions} 
                />
              </div>

              <div className={`mt-6 transition-all duration-500 overflow-hidden ${selectedPoint ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                {selectedPoint && (
                  <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex justify-between items-center backdrop-blur-md">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-black/40 flex items-center justify-center border border-white/10">
                        <Calendar size={20} style={{ color: themeColor }} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Closing Rate</p>
                        <p className="text-sm font-bold text-white">
                            {new Date(selectedPoint.date.replace(' ', 'T')).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-white">
                        {activeMetal === 'usd' ? `रू ${selectedPoint.price.toFixed(2)}` : `रू ${Math.round(selectedPoint.price).toLocaleString()}`}
                      </p>
                      <button onClick={() => setSelectedPoint(null)} className="text-[9px] font-black uppercase text-zinc-500 hover:text-white transition-colors">Dismiss</button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-12">
              <div className="p-8 rounded-[2.5rem] bg-zinc-900/40 border border-white/5 space-y-4">
                <div className="flex items-center gap-3 text-zinc-400">
                  <ShieldCheck size={18} className="text-[#D4AF37]" />
                  <h4 className="text-[10px] font-black uppercase tracking-widest">Market Compliance</h4>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed font-medium">Rates provided are strictly sourced from FENEGOSIDA and Nepal Rastra Bank. Retail prices in local showrooms may vary slightly due to inventory costs.</p>
                <UnitHelper />
              </div>
              <div className="p-8 rounded-[2.5rem] bg-zinc-900/40 border border-white/5 space-y-4">
                <div className="flex items-center gap-3 text-zinc-400">
                  <AlertCircle size={18} className="text-blue-400" />
                  <h4 className="text-[10px] font-black uppercase tracking-widest">Trading Notice</h4>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed font-medium">Daily gold and silver rates are usually updated by 11:30 AM NPT. Markets remain closed on Saturdays and official public holidays.</p>
                <div className="pt-4 flex gap-3">
                    <div className="flex-1 p-3 rounded-2xl bg-black/20 border border-white/5 text-center">
                        <p className="text-[8px] font-black text-zinc-600 uppercase mb-1">Update Logic</p>
                        <p className="text-[10px] font-black text-white">NRB / Association</p>
                    </div>
                    <div className="flex-1 p-3 rounded-2xl bg-black/20 border border-white/5 text-center">
                        <p className="text-[8px] font-black text-zinc-600 uppercase mb-1">Precision</p>
                        <p className="text-[10px] font-black text-white">±0.01% Data Sync</p>
                    </div>
                </div>
              </div>
            </div>
          </main>
        ) : (
          <main className="px-6 space-y-6 animate-in zoom-in-95 duration-500 max-w-4xl mx-auto">
            <div className="bg-white/5 border border-white/10 rounded-[3.5rem] p-8 backdrop-blur-3xl shadow-2xl relative overflow-hidden">
              <div className="flex p-1 bg-black/40 rounded-[2.2rem] border border-white/5 mb-8">
                <button onClick={() => setCalcMode('jewelry')} 
                  className={`flex-1 py-4 rounded-[1.8rem] text-[10px] font-black uppercase transition-all duration-500 ${calcMode === 'jewelry' ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20' : 'text-zinc-500'}`}>
                  Jewelry Tool
                </button>
                <button onClick={() => setCalcMode('currency')} 
                  className={`flex-1 py-4 rounded-[1.8rem] text-[10px] font-black uppercase transition-all duration-500 ${calcMode === 'currency' ? 'bg-[#22c55e] text-black shadow-lg shadow-[#22c55e]/20' : 'text-zinc-500'}`}>
                  Currency Fix
                </button>
              </div>

              {calcMode === 'jewelry' ? (
                <div className="space-y-6">
                  <div className="flex gap-2 p-1 bg-black/40 rounded-2xl">
                    <button onClick={() => setTradeMode('buy')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${tradeMode === 'buy' ? 'bg-green-500 text-black shadow-lg' : 'text-zinc-600'}`}>Purchase</button>
                    <button onClick={() => setTradeMode('sell')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${tradeMode === 'sell' ? 'bg-red-500 text-black shadow-lg' : 'text-zinc-600'}`}>Sell Back</button>
                  </div>
                  <div className="flex justify-center gap-2 py-4 border-y border-white/5">
                    {['gold', 'tejabi', 'silver'].map(m => (
                      <button key={m} onClick={() => setActiveMetal(m)} className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${activeMetal === m ? 'bg-white/10 text-white' : 'text-zinc-600'}`}>{m}</button>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {['tola', 'aana', 'lal'].map((u) => (
                      <div key={u} className="space-y-2 text-center">
                        <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{u}</label>
                        <input type="number" placeholder="0" value={calc[u]} onChange={(e) => setCalc({ ...calc, [u]: e.target.value })} 
                          className="w-full bg-black/60 border border-white/10 p-5 rounded-3xl text-center font-black text-2xl outline-none focus:border-white/20" />
                      </div>
                    ))}
                  </div>
                  {tradeMode === 'buy' && (
                    <div className="space-y-4">
                        <input type="number" placeholder="Total Making Charges (Rs)" value={calc.making} onChange={(e) => setCalc({ ...calc, making: e.target.value })}
                            className="w-full bg-black/60 border border-white/10 p-6 rounded-[2rem] font-black text-lg outline-none focus:border-white/20" />
                        <button onClick={() => setCalc({ ...calc, vat: !calc.vat })}
                            className={`w-full p-6 rounded-[2rem] border flex justify-between items-center transition-all ${calc.vat ? 'border-blue-500/30 bg-blue-500/5' : 'border-white/5 bg-white/5'}`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${calc.vat ? 'border-blue-500 bg-blue-500' : 'border-zinc-700'}`}>
                                    {calc.vat && <Zap size={12} className="text-black fill-black" />}
                                </div>
                                <span className="font-black text-zinc-400 text-xs">Govt VAT (13%)</span>
                            </div>
                        </button>
                    </div>
                  )}
                  <div className="p-12 rounded-[3rem] text-center shadow-3xl relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)` }}>
                    <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none"><Scale size={100} className="text-black" /></div>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-2 text-black/60">Estimated {tradeMode === 'buy' ? 'Total' : 'Buyback'}</p>
                    <h3 className="text-5xl font-black tracking-tighter text-black">रू {Math.round(handleJewelry()).toLocaleString()}</h3>
                  </div>
                </div>
              ) : (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="bg-black/40 rounded-[2.5rem] p-8 border border-white/5 space-y-10 shadow-inner">
                    <div className="flex items-center justify-between">
                      <div className="space-y-4">
                        <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Base</p>
                        <div className="flex items-center gap-3">
                          <span className="text-4xl">{currCalc.isSwapped ? '🇳🇵' : currencyList.find(c => c.code === currCalc.source)?.flag}</span>
                          <select className="bg-transparent text-xl font-black text-white outline-none" value={currCalc.source} onChange={(e) => setCurrCalc({ ...currCalc, source: e.target.value })}>
                            {currencyList.map(c => <option key={c.code} value={c.code} className="bg-zinc-900">{c.code}</option>)}
                          </select>
                        </div>
                      </div>
                      <button onClick={() => setCurrCalc({ ...currCalc, isSwapped: !currCalc.isSwapped })} className="p-5 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 active:rotate-180 transition-all duration-500"><ArrowRightLeft size={24} /></button>
                      <div className="space-y-4 text-right">
                        <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Target</p>
                        <div className="flex items-center gap-3 justify-end">
                          <span className="text-xl font-black text-white">{currCalc.isSwapped ? currCalc.source : 'NPR'}</span>
                          <span className="text-4xl">{!currCalc.isSwapped ? '🇳🇵' : currencyList.find(c => c.code === currCalc.source)?.flag}</span>
                        </div>
                      </div>
                    </div>
                    <input type="number" className="w-full bg-zinc-900/50 border border-white/10 p-10 rounded-[2.5rem] text-4xl font-black text-center text-white outline-none focus:border-green-500/50 transition-all shadow-inner"
                      value={currCalc.amount} onChange={(e) => setCurrCalc({ ...currCalc, amount: e.target.value })} />
                  </div>
                  <div className="bg-gradient-to-br from-[#22c55e] to-[#16a34a] p-12 rounded-[3.5rem] text-center shadow-xl">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-2 text-black/60">Final Payout</p>
                    <h3 className="text-5xl font-black tracking-tighter text-black">
                      {currCalc.isSwapped ? '' : 'रू '}
                      {handleForex().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      {currCalc.isSwapped ? ` ${currCalc.source}` : ''}
                    </h3>
                  </div>
                </div>
              )}
            </div>
          </main>
        )}

        <nav className="fixed bottom-10 left-8 right-8 h-24 bg-zinc-900/60 backdrop-blur-3xl rounded-[3rem] border border-white/10 flex items-center px-4 z-50 shadow-2xl max-w-lg mx-auto">
          <button onClick={() => setView('dashboard')} className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-[2.2rem] transition-all duration-500 ${view === 'dashboard' ? 'text-black' : 'text-zinc-500'}`} style={view === 'dashboard' ? { backgroundColor: themeColor, boxShadow: `0 0 40px ${themeColor}40` } : {}}>
            <LayoutDashboard size={24} className={view === 'dashboard' ? 'fill-black' : ''} />
            <span className="text-[9px] font-black uppercase tracking-widest">Market</span>
          </button>
          <button onClick={() => setView('calculator')} className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-[2.2rem] transition-all duration-500 ${view === 'calculator' ? 'text-black' : 'text-zinc-500'}`} style={view === 'calculator' ? { backgroundColor: themeColor, boxShadow: `0 0 40px ${themeColor}40` } : {}}>
            <Calculator size={24} className={view === 'calculator' ? 'fill-black' : ''} />
            <span className="text-[9px] font-black uppercase tracking-widest">Calculator</span>
          </button>
        </nav>

        {showIOSGuide && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/95 backdrop-blur-xl animate-in fade-in duration-500">
            <div className="bg-[#111] border border-white/10 rounded-[3.5rem] p-10 max-w-sm w-full space-y-8 text-center shadow-3xl">
              <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto border border-white/10 text-[#D4AF37]"><Bell size={40} /></div>
              <div className="space-y-3">
                <h3 className="text-2xl font-black text-white">Price Alerts on iOS</h3>
                <p className="text-zinc-500 text-xs leading-relaxed">To enable real-time price change notifications, add GoldView to your Home Screen from Safari.</p>
              </div>
              <div className="space-y-4 bg-white/5 p-6 rounded-3xl text-left border border-white/5">
                {['Tap the Share icon in Safari', 'Select "Add to Home Screen"', 'Open from your home screen'].map((txt, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-black">{i+1}</div>
                    <p className="text-xs font-bold text-zinc-300">{txt}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowIOSGuide(false)} className="w-full py-5 bg-[#D4AF37] text-black font-black rounded-3xl active:scale-95 transition-all">Got it</button>
            </div>
          </div>
        )}

        <footer className="mt-20 px-8 pb-32 border-t border-white/5 pt-16 max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
            <div className="space-y-4">
              <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2"><Layers size={20} className="text-[#D4AF37]" /> GoldView Ecosystem</h2>
              <p className="text-xs text-zinc-500 leading-relaxed font-medium">GoldView is Nepal's leading digital platform for tracking 24K Chhapawal and 22K Tejabi gold rates. We serve over 10,000 users daily with institutional-grade data accuracy across the Kathmandu valley and Nepal.</p>
            </div>
            <div className="space-y-4">
              <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2"><Award size={20} className="text-blue-400" /> Market Authority</h2>
              <p className="text-xs text-zinc-500 leading-relaxed font-medium">Data is retrieved via secure NRB endpoints and verified Association dealer listings. This platform remains an independent source of market intelligence for gold investors in Nepal.</p>
            </div>
          </div>
          <div className="pt-12 border-t border-white/5 flex flex-col items-center gap-6">
            <div className="flex gap-4">
              {[ShieldCheck, Globe, Clock, MapPin, CheckCircle2, BarChart3, TrendingIcon].map((Icon, i) => (
                <div key={i} className="p-3 bg-white/5 rounded-xl border border-white/5 text-zinc-600"><Icon size={18} /></div>
              ))}
            </div>
            <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-500 mb-2">Designed by @Timeswantstocode</p>
                <p className="text-[8px] font-bold text-zinc-700">© 2026 GoldView Nepal. Proprietary Real-time Interface v2.0.1</p>
            </div>
          </div>
        </footer>

        <Analytics />
        <SpeedInsights />
      </div>
    </HelmetProvider>
  );
}

const currencyList = [
    { code: 'USD', flag: '🇺🇸' }, { code: 'GBP', flag: '🇬🇧' },
    { code: 'AUD', flag: '🇦🇺' }, { code: 'JPY', flag: '🇯🇵' },
    { code: 'KRW', flag: '🇰🇷' }, { code: 'AED', flag: '🇦🇪' },
    { code: 'EUR', flag: '🇪🇺' }, { code: 'CAD', flag: '🇨🇦' },
    { code: 'MYR', flag: '🇲🇾' }, { code: 'SAR', flag: '🇸🇦' }
];

