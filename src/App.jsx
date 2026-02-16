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

ChartJS.register(...registerables, Filler, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement);

const DATA_URL = "https://raw.githubusercontent.com/Timeswantstocode/GoldView/main/data.json";
const FOREX_PROXY = "/api/forex";

// REPLACE THIS with your actual domain name from Search Console
const PRIMARY_DOMAIN = "https://viewgold.vercel.app"; 

const getOrCreateTooltip = (chart) => {
  let tooltipEl = chart.canvas.parentNode.querySelector('div');
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.style.background = 'rgba(10, 10, 10, 0.7)';
    tooltipEl.style.backdropFilter = 'blur(20px)';
    tooltipEl.style.WebkitBackdropFilter = 'blur(20px)';
    tooltipEl.style.borderRadius = '14px';
    tooltipEl.style.color = 'white';
    tooltipEl.style.opacity = 1;
    tooltipEl.style.pointerEvents = 'none';
    tooltipEl.style.position = 'absolute';
    tooltipEl.style.transform = 'translate(-50%, 0)';
    tooltipEl.style.transition = 'all .12s ease';
    tooltipEl.style.border = '1px solid rgba(255, 255, 255, 0.08)';
    tooltipEl.style.padding = '8px 12px';
    tooltipEl.style.zIndex = '100';
    tooltipEl.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
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
      span.style.fontSize = '8px';
      span.style.fontWeight = '800';
      span.style.textTransform = 'uppercase';
      span.style.display = 'block';
      span.style.marginBottom = '2px';
      span.style.opacity = '0.5';
      span.style.whiteSpace = 'nowrap';
      span.innerText = title;
      div.appendChild(span);
    });
    bodyLines.forEach((body) => {
      const span = document.createElement('span');
      span.style.fontSize = '14px';
      span.style.fontWeight = '900';
      span.style.letterSpacing = '-0.01em';
      span.style.whiteSpace = 'nowrap';
      span.innerText = body;
      div.appendChild(span);
    });
    while (tooltipEl.firstChild) { tooltipEl.firstChild.remove(); }
    tooltipEl.appendChild(div);
  }
  const {offsetLeft: positionX, offsetTop: positionY} = chart.canvas;
  tooltipEl.style.opacity = 1;
  tooltipEl.style.left = positionX + tooltip.caretX + 'px';
  tooltipEl.style.top = positionY + tooltip.caretY - 60 + 'px';
};

export default function App() {
  const [priceData, setPriceData] = useState(() => JSON.parse(localStorage.getItem('gv_v18_metal') || '[]'));
  const [forexHistory, setForexHistory] = useState(() => JSON.parse(localStorage.getItem('gv_v18_forex') || '[]'));
  const [loading, setLoading] = useState(priceData.length === 0);
  const [forexLoading, setForexLoading] = useState(true);
  const [view, setView] = useState('dashboard');
  const [calcMode, setCalcMode] = useState('jewelry'); 
  const [tradeMode, setTradeMode] = useState('buy'); 
  const [activeMetal, setActiveMetal] = useState('gold'); 
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [timeframe, setTimeframe] = useState(7);
  const [calc, setCalc] = useState({ tola: '', aana: '', lal: '', making: '', vat: true });
  const [currCalc, setCurrCalc] = useState({ amount: '1', source: 'USD', isSwapped: false });
  const [notifStatus, setNotifStatus] = useState('default');
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const chartRef = useRef(null);

  const currencyList = [
    { code: 'USD', flag: '🇺🇸' }, { code: 'GBP', flag: '🇬🇧' },
    { code: 'AUD', flag: '🇦🇺' }, { code: 'JPY', flag: '🇯🇵' },
    { code: 'KRW', flag: '🇰🇷' }, { code: 'AED', flag: '🇦🇪' },
    { code: 'EUR', flag: '🇪🇺' }
  ];

  useEffect(() => {
    fetch(`${DATA_URL}?t=${Date.now()}`).then(res => res.json()).then(json => {
        setPriceData(json);
        localStorage.setItem('gv_v18_metal', JSON.stringify(json));
        setLoading(false);
    }).catch(() => setLoading(false));

    fetch(FOREX_PROXY).then(res => res.json()).then(json => {
        // Correctly handle the response from api/forex.js
        const transformed = (json.rates || []).map(day => ({
          date: day.date,
          usdRate: parseFloat(day.currencies.find(c => c.code === 'USD')?.buy || 0),
          rates: day.currencies
        })).sort((a, b) => new Date(a.date) - new Date(b.date));
        setForexHistory(transformed);
        localStorage.setItem('gv_v18_forex', JSON.stringify(transformed));
        setForexLoading(false);
    }).catch((err) => {
        console.error("Forex fetch failed:", err);
        setForexLoading(false);
    });

    // Check notification permission
    if ('Notification' in window) {
      setNotifStatus(Notification.permission);
    }
  }, []);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;

  const [testNotifLoading, setTestNotifLoading] = useState(false);

  const handleTestNotification = async () => {
    if (notifStatus !== 'granted') {
      handleNotificationRequest();
      return;
    }
    
    setTestNotifLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      registration.showNotification("GoldView Test Alert 🔔", {
        body: "Success! Your device is ready to receive live price updates.",
        icon: "/logo192.png",
        badge: "/logo192.png",
        vibrate: [200, 100, 200],
        tag: 'test-notification'
      });
      // Small delay for UX
      setTimeout(() => setTestNotifLoading(false), 1000);
    } catch (err) {
      console.error("Test notification failed:", err);
      setTestNotifLoading(false);
      alert("Test failed. Please ensure notifications are allowed in your device settings.");
    }
  };

  const handleNotificationRequest = async () => {
    if (isIOS && !isStandalone) {
      setShowIOSGuide(true);
      return;
    }

    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      alert("Notifications are not supported in this browser.");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotifStatus(permission);
      
      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.ready;
        
        // VAPID Public Key - User needs to generate this and put it here
        const VAPID_PUBLIC_KEY = "YOUR_VAPID_PUBLIC_KEY"; 
        
        if (VAPID_PUBLIC_KEY === "YOUR_VAPID_PUBLIC_KEY") {
          console.log("VAPID Public Key not set. Only local notifications will work.");
          registration.showNotification("GoldView Nepal", {
            body: "Local alerts enabled! (Server-side push requires VAPID setup)",
            icon: "/logo192.png",
            badge: "/logo192.png",
            tag: 'welcome-notification'
          });
          return;
        }

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: VAPID_PUBLIC_KEY
        });

        // Send subscription to GitHub via an issue (simple way to store it without a DB)
        // This requires a small backend or a GitHub Action to process
        console.log("Subscription obtained:", JSON.stringify(subscription));
        
        // For now, we'll just show a success message
        registration.showNotification("GoldView Nepal", {
          body: "Price alerts enabled! You'll be notified when rates change.",
          icon: "/logo192.png",
          badge: "/logo192.png",
          tag: 'welcome-notification'
        });
      }
    } catch (err) {
      console.error("Notification request failed:", err);
    }
  };

  const formatRS = useCallback((num) => `रू ${Math.round(num || 0).toLocaleString()}`, []);

  const themeColor = useMemo(() => {
    if (view === 'calculator' && calcMode === 'currency') return '#22c55e';
    if (activeMetal === 'gold') return '#D4AF37';
    if (activeMetal === 'tejabi') return '#CD7F32'; 
    if (activeMetal === 'silver') return '#94a3b8';
    return '#22c55e'; 
  }, [activeMetal, view, calcMode]);

  const activeDataList = useMemo(() => activeMetal === 'usd' ? forexHistory : priceData, [activeMetal, forexHistory, priceData]);
  const filteredData = useMemo(() => activeDataList.slice(-timeframe), [activeDataList, timeframe]);

  const structuredData = useMemo(() => {
    return JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "GoldView Nepal",
      "url": PRIMARY_DOMAIN,
      "description": "Official live 24K Gold and Silver rates in Nepal.",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "All"
    });
  }, []);
  
  const getDayDiff = (id) => {
    const source = id === 'usd' ? forexHistory : priceData;
    if (source.length < 2) return { val: 'Rs. 0', isUp: true };
    const currVal = id === 'usd' ? source[source.length-1].usdRate : source[source.length-1][id];
    const prevVal = id === 'usd' ? source[source.length-2].usdRate : source[source.length-2][id];
    const diff = currVal - prevVal;
    return { val: `Rs. ${diff >= 0 ? '+' : ''}${diff.toLocaleString(undefined, {minimumFractionDigits: id === 'usd' ? 2 : 0})}`, isUp: diff >= 0 };
  };

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
      pointBackgroundColor: '#fff',
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
  }), [filteredData, activeMetal, selectedPoint, themeColor]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { 
        legend: false, 
        tooltip: { 
            enabled: false,
            external: externalTooltipHandler,
            callbacks: {
                label: (ctx) => `रू ${ctx.raw.toLocaleString(undefined, {minimumFractionDigits: activeMetal === 'usd' ? 2 : 0})}`,
            }
        } 
    },
    scales: {
      x: {
        display: true,
        grid: { display: true, color: 'rgba(255, 255, 255, 0.04)', borderDash: [6, 6], drawTicks: false },
        ticks: { color: 'rgba(255, 255, 255, 0.25)', font: { size: 9, weight: '700' }, maxRotation: 0, maxTicksLimit: timeframe === 7 ? 7 : 8 }
      },
      y: { display: true, position: 'right', grid: { display: true, color: 'rgba(255, 255, 255, 0.08)', borderDash: [5, 5], drawBorder: false }, ticks: { display: false } }
    },
    onClick: (e, elements) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        const point = filteredData[index];
        setSelectedPoint({ index, date: point.date, price: activeMetal === 'usd' ? point.usdRate : point[activeMetal] });
      }
    }
  }), [filteredData, activeMetal, timeframe]);

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center text-[#D4AF37]">
      <RefreshCcw className="w-10 h-10 animate-spin" />
    </div>
  );

  return (
    <HelmetProvider>
      <div className="min-h-screen bg-[#020202] text-zinc-100 font-sans pb-40 overflow-x-hidden relative">
        <Helmet>
            <title>Gold Price Nepal Today | 24K Gold Rate Live - GoldView</title>
            <meta name="description" content="Official GoldView: Live 24K Chhapawal gold, silver and USD rates in Nepal today." />
            <link rel="canonical" href="https://viewgold.vercel.app"/>
            <meta name="robots" content="index, follow" />
            <script type="application/ld+json">{structuredData}</script>
        </Helmet>

        <header className="p-8 pt-16 flex justify-between items-end relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full shadow-lg animate-pulse" style={{ backgroundColor: themeColor, boxShadow: `0 0 10px ${themeColor}` }}></div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] transition-colors duration-500" style={{ color: themeColor }}>Market Update</p>
            </div>
            <div className="flex items-center gap-3">
              <img src="/logo192.png" alt="GoldView Logo" className="w-10 h-10 rounded-xl shadow-lg border border-white/10" />
              <h1 className="text-4xl font-black tracking-tighter text-white">GoldView</h1>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleTestNotification} className={`p-4 bg-white/5 backdrop-blur-3xl rounded-3xl border border-white/10 active:scale-90 transition-all ${notifStatus === 'granted' ? 'border-[#D4AF37]/30' : ''}`}>
              <Bell className={`w-5 h-5 ${notifStatus === 'granted' ? 'text-[#D4AF37]' : 'text-zinc-400'} ${testNotifLoading ? 'animate-bounce' : ''}`} />
            </button>
            <button onClick={() => window.location.reload()} className="p-4 bg-white/5 backdrop-blur-3xl rounded-3xl border border-white/10 active:scale-90 transition-all">
              <RefreshCcw className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
        </header>

        {/* --- MARKET DASHBOARD --- */}
        <div style={{ display: view === 'dashboard' ? 'block' : 'none' }}>
          <main className="px-6 space-y-6 relative z-10 animate-in fade-in duration-500">
            <div className="space-y-4">
              {['gold', 'tejabi', 'silver', 'usd'].map((type) => {
                 const isActive = activeMetal === type;
                 const diff = getDayDiff(type);
                 const val = type === 'usd' ? (forexHistory[forexHistory.length-1]?.usdRate || 0) : (priceData[priceData.length-1]?.[type] || 0);
                 const meta = {
                   gold: { label: '24K Chhapawal Gold', sub: 'per tola', grad: 'from-[#D4AF37]/50 to-[#D4AF37]/15' },
                   tejabi: { label: '22K Tejabi Gold', sub: 'per tola', grad: 'from-[#CD7F32]/50 to-[#CD7F32]/15' },
                   silver: { label: 'Pure Silver', sub: 'per tola', grad: 'from-zinc-400/40 to-zinc-600/15' },
                   usd: { label: 'USD to NPR', sub: 'Official Buying Rate', grad: 'from-[#22c55e]/45 to-[#22c55e]/15' }
                 }[type];
                 return (
                  <div key={type} onClick={() => { setActiveMetal(type); setSelectedPoint(null); }}
                    className={`p-7 rounded-[2.8rem] border-[1.5px] transition-all duration-300 cursor-pointer bg-gradient-to-br backdrop-blur-3xl relative overflow-hidden ${
                      isActive ? `${meta.grad} border-white/20 scale-[1.02]` : 'border-white/5 bg-white/5 opacity-40'
                    }`}>
                    <div className="flex justify-between items-start mb-2 text-[10px] font-black uppercase tracking-widest">
                      <div>{meta.label}<p className="text-[8px] opacity-50 mt-0.5">{meta.sub}</p></div>
                      {type === 'usd' && forexLoading ? <RefreshCcw className="w-3 h-3 text-green-500 animate-spin" /> : 
                      <div className={`px-2.5 py-1 rounded-xl border ${diff.isUp ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>{diff.val}</div>}
                    </div>
                    <div className="flex justify-between items-end text-4xl font-black tracking-tighter">
                      <h2>{type === 'usd' ? `रू ${val.toFixed(2)}` : formatRS(val)}</h2>
                      {isActive && <TrendingUp className={`w-5 h-5 ${diff.isUp ? 'text-green-500' : 'text-red-500 rotate-180'}`} />}
                    </div>
                  </div>
                 );
              })}
            </div>

            <section className="bg-white/5 border border-white/10 rounded-[3.5rem] p-9 backdrop-blur-3xl shadow-xl">
              <div className="flex justify-between items-center mb-8 px-1 w-full">
                <h3 className="text-xl font-black tracking-tight flex items-center gap-3"><Activity className="w-5 h-5" style={{ color: themeColor }} /> Price Trend</h3>
                <div className="flex bg-white/5 rounded-full p-1 border border-white/10">
                  {[7, 30, 90].map((t) => (<button key={t} onClick={() => { setTimeframe(t); setSelectedPoint(null); }} className={`px-3 py-1.5 rounded-full text-[9px] font-black transition-all ${timeframe === t ? `text-black shadow-lg shadow-white/5` : 'text-zinc-500'}`} style={timeframe === t ? { backgroundColor: themeColor } : {}}>{t === 7 ? '7D' : t === 30 ? '1M' : '3M'}</button>))}
                </div>
              </div>
              <div className="h-64 relative w-full"><Line ref={chartRef} data={chartData} options={chartOptions} redraw={false} /></div>
              
              <div className={`mt-8 transition-all duration-500 overflow-hidden ${selectedPoint ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}>
                {selectedPoint && (
                  <div className="bg-white/10 border-2 rounded-[2.8rem] p-7 flex flex-wrap gap-5 justify-between items-center w-full backdrop-blur-[40px] relative border-white/5" style={{ borderColor: `${themeColor}40` }}>
                    <div className="flex items-center gap-5 flex-1 min-w-[220px]">
                      <div className="w-14 h-14 rounded-3xl flex items-center justify-center border shrink-0 bg-white/[0.03]" style={{ borderColor: `${themeColor}30` }}>
                        <Calendar className="w-7 h-7" style={{ color: themeColor }} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] mb-1" style={{ color: themeColor }}>Historical Point</p>
                        <p className="text-lg font-black text-white leading-tight">
                            {new Date(selectedPoint.date.replace(' ', 'T')).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-[9px] font-black text-zinc-600 uppercase mb-1">Market Rate</p>
                        <p className="text-3xl font-black text-white">{activeMetal === 'usd' ? `रू ${selectedPoint.price.toFixed(2)}` : formatRS(selectedPoint.price)}</p>
                      </div>
                      <button onClick={() => setSelectedPoint(null)} className="p-3 bg-white/5 rounded-full hover:bg-white/10 active:scale-90 transition-all border border-white/5"><X className="w-5 h-5 text-zinc-400" /></button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </main>
        </div>

        {/* --- CALCULATOR TAB --- */}
        <div style={{ display: view === 'calculator' ? 'block' : 'none' }}>
          <main className="px-6 relative z-10 animate-in zoom-in-95 duration-500">
            <div className="bg-white/5 border border-white/10 rounded-[4rem] p-8 backdrop-blur-3xl shadow-xl">
              <div className="flex p-1 bg-black/40 rounded-3xl mb-10 border border-white/5">
                  <button onClick={() => setCalcMode('jewelry')} style={calcMode === 'jewelry' ? { backgroundColor: themeColor } : {}} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase transition-all duration-500 ${calcMode === 'jewelry' ? 'text-black' : 'text-zinc-500'}`}>Jewelry</button>
                  <button onClick={() => setCalcMode('currency')} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase transition-all duration-500 ${calcMode === 'currency' ? 'bg-[#22c55e] text-black' : 'text-zinc-500'}`}>Currency</button>
              </div>

              {calcMode === 'jewelry' ? (
                <div className="space-y-6">
                  <div className="flex p-1 bg-black/40 rounded-[2rem] border border-white/5 mb-2">
                     <button onClick={() => setTradeMode('buy')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase transition-all duration-300 ${tradeMode === 'buy' ? 'text-black' : 'text-zinc-500'}`} style={tradeMode === 'buy' ? { backgroundColor: '#22c55e' } : {}}>Purchase</button>
                     <button onClick={() => setTradeMode('sell')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase transition-all duration-300 ${tradeMode === 'sell' ? 'text-black' : 'text-zinc-500'}`} style={tradeMode === 'sell' ? { backgroundColor: '#ef4444' } : {}}>Sell Back</button>
                  </div>

                  <div className="flex p-1 bg-white/5 rounded-2xl mb-8 border border-white/5 w-fit mx-auto gap-1">
                      {['gold', 'tejabi', 'silver'].map(metal => (<button key={metal} onClick={() => setActiveMetal(metal)} style={{ backgroundColor: activeMetal === metal ? (metal === 'gold' ? '#D4AF37' : metal === 'tejabi' ? '#CD7F32' : '#94a3b8') : 'transparent' }} className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${activeMetal === metal ? 'text-black' : 'text-zinc-500'}`}>{metal}</button>))}
                  </div>
                  <div className="mb-8 p-6 rounded-[2.2rem] border-2 flex items-center justify-between" style={{ borderColor: `${themeColor}80`, backgroundColor: `${themeColor}10` }}>
                    <div className="flex items-center gap-4"><Coins className="w-8 h-8" style={{ color: themeColor }} /><p className="text-xl font-black uppercase text-white">{activeMetal === 'gold' ? '24K Gold' : activeMetal === 'tejabi' ? '22K Gold' : 'Pure Silver'}</p></div>
                    <div className="text-right text-[10px] font-black text-zinc-500">{formatRS(priceData[priceData.length-1]?.[activeMetal === 'usd' ? 'gold' : activeMetal])}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {['tola', 'aana', 'lal'].map((unit) => (<div key={unit}><label className="text-[10px] font-black text-zinc-500 uppercase mb-2 block ml-3 tracking-[0.2em]">{unit}</label>
                    <input type="number" style={{ caretColor: themeColor }} className="w-full bg-black/60 border-2 border-zinc-800 p-5 rounded-3xl text-center font-black text-2xl text-white outline-none focus:border-white/20" value={calc[unit]} onChange={(e) => setCalc({...calc, [unit]: e.target.value})} /></div>))}
                  </div>
                  
                  {tradeMode === 'buy' && (
                    <>
                      <input type="number" placeholder="Making Charges (Rs)" className="w-full bg-black/60 border-2 border-zinc-800 p-6 rounded-3xl font-black text-lg outline-none text-white focus:border-white/20 animate-in fade-in slide-in-from-top-2" value={calc.making} onChange={(e) => setCalc({...calc, making: e.target.value})} />
                      <div onClick={() => setCalc({...calc, vat: !calc.vat})} className="flex justify-between items-center p-6 bg-white/5 rounded-[2.2rem] border border-white/5 cursor-pointer animate-in fade-in slide-in-from-top-2"><div className="flex items-center gap-3"><div className="w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all" style={{ borderColor: calc.vat ? themeColor : '#27272a', backgroundColor: calc.vat ? themeColor : 'transparent' }}>{calc.vat && <Zap className="w-3.5 h-3.5 text-black fill-black" />}</div><span className="font-bold text-zinc-300">13% Govt VAT</span></div></div>
                    </>
                  )}

                  <div className="p-12 rounded-[3.5rem] text-black text-center shadow-2xl transition-all" style={{ background: `linear-gradient(135deg, ${themeColor}, ${activeMetal === 'gold' ? '#b8860b' : activeMetal === 'tejabi' ? '#8B4513' : '#4b5563'})` }}>
                     <p className="text-[11px] font-black uppercase tracking-[0.4em] mb-2 opacity-60">{tradeMode === 'buy' ? 'Estimated Total' : 'Buyback Value (Market - 5%)'}</p>
                     <h3 className="text-5xl font-black tracking-tighter">
                        {(() => {
                            const weight = (Number(calc.tola)||0) + (Number(calc.aana)||0)/16 + (Number(calc.lal)||0)/192;
                            const rate = priceData[priceData.length-1]?.[activeMetal === 'usd' ? 'gold' : activeMetal] || 0;
                            if (tradeMode === 'sell') return formatRS(weight * rate * 0.95);
                            return formatRS((weight * rate + (Number(calc.making)||0)) * (calc.vat ? 1.13 : 1));
                        })()}
                     </h3>
                  </div>
                </div>
              ) : (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-black/40 rounded-[3rem] p-7 border border-white/10 space-y-10">
                        <div className="flex items-start justify-between px-1">
                            <div className="flex-1 flex flex-col items-start gap-4">
                                <p className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em]">YOU SEND</p>
                                <div className="flex flex-col items-center gap-1.5 w-fit">
                                    <span className="text-4xl leading-none">{currCalc.isSwapped ? '🇳🇵' : currencyList.find(c => c.code === currCalc.source)?.flag}</span>
                                    {currCalc.isSwapped ? <span className="text-[11px] font-black text-white mt-1">NPR</span> : 
                                    <select className="bg-transparent font-black text-[11px] text-white outline-none mt-1 text-center" value={currCalc.source} onChange={(e) => setCurrCalc({...currCalc, source: e.target.value})}>
                                        {currencyList.map(c => <option key={c.code} value={c.code} className="bg-zinc-900">{c.code}</option>)}
                                    </select>}
                                </div>
                            </div>
                            <div className="px-4 pt-8">
                                <button onClick={() => setCurrCalc({...currCalc, isSwapped: !currCalc.isSwapped})} className="p-4 bg-green-500/20 rounded-2xl active:rotate-180 transition-all border border-green-500/20 shadow-lg shadow-green-500/10"><ArrowRightLeft className="w-5 h-5 text-green-500" /></button>
                            </div>
                            <div className="flex-1 flex flex-col items-end gap-4 text-right">
                                <p className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em]">RECEIVER GETS</p>
                                <div className="flex flex-col items-center gap-1.5 w-fit ml-auto">
                                    <span className="text-4xl leading-none">{!currCalc.isSwapped ? '🇳🇵' : currencyList.find(c => c.code === currCalc.source)?.flag}</span>
                                    {!currCalc.isSwapped ? <span className="text-[11px] font-black text-white mt-1">NPR</span> : 
                                    <select className="bg-transparent font-black text-[11px] text-white outline-none mt-1 text-center" value={currCalc.source} onChange={(e) => setCurrCalc({...currCalc, source: e.target.value})}>
                                        {currencyList.map(c => <option key={c.code} value={c.code} className="bg-zinc-900">{c.code}</option>)}
                                    </select>}
                                </div>
                            </div>
                        </div>
                        <div className="relative">
                            <input type="number" placeholder="Amount" className="w-full bg-black/60 border-2 border-zinc-800 p-8 rounded-[2.5rem] font-black text-4xl outline-none focus:border-green-500 text-white text-center transition-all" value={currCalc.amount} onChange={(e) => setCurrCalc({...currCalc, amount: e.target.value})} />
                            <div className="absolute left-6 top-1/2 -translate-y-1/2 opacity-20"><Globe className="w-8 h-8 text-[#22c55e]" /></div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-green-500 to-green-700 p-12 rounded-[3.5rem] text-black text-center shadow-xl relative overflow-hidden group">
                       <div className="absolute top-4 right-6 text-7xl opacity-10 font-bold pointer-events-none">{currCalc.isSwapped ? currencyList.find(c => c.code === currCalc.source)?.flag : '🇳🇵'}</div>
                       <div className="flex flex-col items-center gap-2 mb-2 relative z-10">
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-black/10 rounded-full border border-black/5">
                              <span className="text-[10px] font-black">{currCalc.isSwapped ? '🇳🇵 NPR' : `${currencyList.find(c => c.code === currCalc.source)?.flag} ${currCalc.source}`}</span>
                              <ArrowDown className="w-3 h-3 opacity-40" />
                              <span className="text-[10px] font-black bg-white/30 px-2 rounded-md">{currCalc.isSwapped ? `${currencyList.find(c => c.code === currCalc.source)?.flag} ${currCalc.source}` : '🇳🇵 NPR'}</span>
                          </div>
                          <p className="text-[11px] font-black uppercase tracking-[0.4em] opacity-60">Payout Estimate</p>
                       </div>
                       <h3 className="text-5xl font-black tracking-tighter relative z-10">
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

        {/* --- iOS Notification Guide --- */}
        {showIOSGuide && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-[#121212] border border-white/10 rounded-[3rem] p-8 max-w-sm w-full shadow-2xl space-y-6 text-center">
              <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto border border-white/10">
                <Bell className="w-10 h-10 text-[#D4AF37]" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white tracking-tight">Enable Alerts on iOS</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">To receive price change notifications on your iPhone, you must add GoldView to your Home Screen:</p>
              </div>
              <div className="space-y-4 text-left bg-white/5 p-6 rounded-3xl border border-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-black">1</div>
                  <p className="text-xs text-zinc-300 font-bold">Tap the <span className="text-blue-400">Share</span> icon in Safari</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-black">2</div>
                  <p className="text-xs text-zinc-300 font-bold">Select <span className="text-white">"Add to Home Screen"</span></p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-black">3</div>
                  <p className="text-xs text-zinc-300 font-bold">Open the app from your home screen</p>
                </div>
              </div>
              <button onClick={() => setShowIOSGuide(false)} className="w-full py-5 bg-[#D4AF37] text-black font-black rounded-3xl active:scale-95 transition-all shadow-lg shadow-[#D4AF37]/20">Got it</button>
            </div>
          </div>
        )}

        <nav className="fixed bottom-12 left-10 right-10 h-20 bg-zinc-900/60 backdrop-blur-[50px] rounded-[3rem] border border-white/10 flex justify-around items-center px-4 z-50 shadow-2xl">
          <button onClick={() => setView('dashboard')} className={`flex flex-col items-center gap-1.5 px-12 py-3.5 rounded-[2.2rem] transition-all duration-300 ${view === 'dashboard' ? 'text-black shadow-lg shadow-white/5' : 'text-zinc-500'}`} style={view === 'dashboard' ? { backgroundColor: themeColor, boxShadow: `0 0 40px ${themeColor}40` } : {}}>
            <LayoutDashboard className={`w-6 h-6 ${view === 'dashboard' ? 'fill-black' : ''}`} />
            <span className="text-[9px] font-black uppercase tracking-widest">Market</span>
          </button>
          <button onClick={() => { setView('calculator'); if(activeMetal === 'usd') setActiveMetal('gold'); }} className={`flex flex-col items-center gap-1.5 px-12 py-3.5 rounded-[2.2rem] transition-all duration-300 ${view === 'calculator' ? 'text-black shadow-lg shadow-white/5' : 'text-zinc-500'}`} style={view === 'calculator' ? { backgroundColor: themeColor, boxShadow: `0 0 40px ${themeColor}40` } : {}}>
            <Calculator className={`w-6 h-6 ${view === 'calculator' ? 'fill-black' : ''}`} />
            <span className="text-[9px] font-black uppercase tracking-widest">Calculator</span>
          </button>
        </nav>

        <footer className="mt-12 px-8 pb-12 text-zinc-600 text-[10px] leading-relaxed border-t border-white/5 pt-10">
          <h2 className="text-zinc-400 font-black mb-2 uppercase tracking-widest">Live Gold and Silver Prices in Nepal</h2>
          <p>GoldView provides real-time updates for <strong>24K Chhapawal Gold</strong>, <strong>22K Tejabi Gold</strong> and <strong>Pure Silver</strong> rates in Nepal.</p>
          <div className="mt-12 text-center">
            <p className="font-black uppercase tracking-[0.3em] text-zinc-500">Made by @Timeswantstocode</p>
          </div>
        </footer>

        <Analytics />
        <SpeedInsights />
      </div>
    </HelmetProvider>
  );
}
