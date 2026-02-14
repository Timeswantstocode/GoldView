import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import { 
  Chart as ChartJS, registerables, Filler, Tooltip, 
  Legend, CategoryScale, LinearScale, PointElement, LineElement 
} from 'chart.js';
import { 
  LayoutDashboard, Calculator, RefreshCcw, TrendingUp, 
  X, Calendar, Zap, Activity, Coins, ArrowRightLeft, Globe, ArrowDown, Share2, BellRing, BellOff, Info
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Helmet, HelmetProvider } from 'react-helmet-async';

ChartJS.register(...registerables, Filler, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement);

const DATA_URL = "https://raw.githubusercontent.com/Timeswantstocode/GoldView/main/data.json";
const FOREX_PROXY = "/api/forex";

// --- ORIGINAL FOGGY TOOLTIP HANDLER ---
const getOrCreateTooltip = (chart) => {
  let tooltipEl = chart.canvas.parentNode.querySelector('div.custom-tooltip');
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.classList.add('custom-tooltip');
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
    div.style.display = 'flex'; div.style.flexDirection = 'column'; div.style.alignItems = 'center';

    titleLines.forEach(title => {
      const span = document.createElement('span');
      span.style.fontSize = '8px'; span.style.fontWeight = '800'; span.style.textTransform = 'uppercase';
      span.style.marginBottom = '2px'; span.style.opacity = '0.5'; span.style.whiteSpace = 'nowrap';
      span.innerText = title; div.appendChild(span);
    });

    bodyLines.forEach((body) => {
      const span = document.createElement('span');
      span.style.fontSize = '14px'; span.style.fontWeight = '900'; span.style.letterSpacing = '-0.01em';
      span.style.whiteSpace = 'nowrap'; span.innerText = body; div.appendChild(span);
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
  // --- CORE STATES ---
  const [priceData, setPriceData] = useState(() => JSON.parse(localStorage.getItem('gv_v24_metal') || '[]'));
  const [forexHistory, setForexHistory] = useState(() => JSON.parse(localStorage.getItem('gv_v24_forex') || '[]'));
  const [loading, setLoading] = useState(priceData.length === 0);
  const [forexLoading, setForexLoading] = useState(true);
  const [view, setView] = useState('dashboard');
  const [activeMetal, setActiveMetal] = useState('gold'); // gold, tejabi, silver, usd
  const [timeframe, setTimeframe] = useState(7);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [selectedCurrencies, setSelectedCurrencies] = useState(['USD']);

  // --- CALCULATOR STATES ---
  const [calcMode, setCalcMode] = useState('jewelry'); // jewelry, currency
  const [calcType, setCalcType] = useState('buy'); // buy, sell
  const [calc, setCalc] = useState({ tola: '', aana: '', lal: '', making: '', vat: true });
  const [currCalc, setCurrCalc] = useState({ amount: '1', source: 'USD', isSwapped: false });

  const shareRef = useRef(null);

  const currencyList = [
    { code: 'USD', flag: '🇺🇸' }, { code: 'GBP', flag: '🇬🇧' }, { code: 'AUD', flag: '🇦🇺' }, 
    { code: 'JPY', flag: '🇯🇵' }, { code: 'KRW', flag: '🇰🇷' }, { code: 'AED', flag: '🇦🇪' }, { code: 'EUR', flag: '🇪🇺' }
  ];

  // --- DATA INITIALIZATION ---
  useEffect(() => {
    // Check Notification Subscription
    if (window.OneSignalDeferred) {
      window.OneSignalDeferred.push(async (OneSignal) => {
        setIsSubscribed(await OneSignal.User.PushSubscription.optedIn);
      });
    }

    // Fetch Metal Data
    fetch(`${DATA_URL}?t=${Date.now()}`).then(res => res.json()).then(json => {
        const processed = json.map(d => ({ ...d, tejabi: d.tejabi || Math.round(d.gold * 0.9167) }));
        setPriceData(processed);
        localStorage.setItem('gv_v24_metal', JSON.stringify(processed));
        setLoading(false);
    }).catch(() => setLoading(false));

    // Fetch Forex Data
    fetch(FOREX_PROXY).then(res => res.json()).then(json => {
        if (!json.data || !json.data.payload) throw new Error("API Structure Invalid");
        const transformed = json.data.payload.map(day => ({
          date: day.date,
          rates: day.rates
        })).sort((a, b) => new Date(a.date) - new Date(b.date));
        setForexHistory(transformed);
        localStorage.setItem('gv_v24_forex', JSON.stringify(transformed));
        setForexLoading(false);
    }).catch(() => setForexLoading(false));
  }, []);

  // --- HELPERS ---
  const formatRS = useCallback((num) => `रू ${Math.round(num || 0).toLocaleString()}`, []);
  
  const getPriceChange = (id) => {
    if (id === 'usd') {
        if (forexHistory.length < 2) return 0;
        const c = parseFloat(forexHistory[forexHistory.length-1].rates.find(r => r.currency.iso3 === 'USD')?.buy || 0);
        const p = parseFloat(forexHistory[forexHistory.length-2].rates.find(r => r.currency.iso3 === 'USD')?.buy || 0);
        return c - p;
    }
    if (priceData.length < 2) return 0;
    return priceData[priceData.length-1][id] - priceData[priceData.length-2][id];
  };

  const themeColor = useMemo(() => {
    if (view === 'calculator') {
        if (calcMode === 'currency') return '#22c55e';
        if (activeMetal === 'gold') return '#D4AF37';
        if (activeMetal === 'tejabi') return '#FFB800';
        if (activeMetal === 'silver') return '#94a3b8';
        return '#D4AF37';
    }
    if (activeMetal === 'gold') return '#D4AF37';
    if (activeMetal === 'tejabi') return '#FFB800'; 
    if (activeMetal === 'silver') return '#94a3b8';
    return '#22c55e'; 
  }, [activeMetal, view, calcMode]);

  const activeDataList = useMemo(() => activeMetal === 'usd' ? forexHistory : priceData, [activeMetal, forexHistory, priceData]);
  const filteredData = useMemo(() => activeDataList.slice(-timeframe), [activeDataList, timeframe]);

  const handlePushSubscription = () => {
    if (window.OneSignalDeferred) {
      window.OneSignalDeferred.push((OneSignal) => {
        OneSignal.Notifications.requestPermission();
      });
    }
  };

  const handleShare = async () => {
    const dataUrl = await toPng(shareRef.current, { backgroundColor: '#020202', cacheBust: true });
    if (navigator.share) {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'goldview.png', { type: 'image/png' });
      navigator.share({ files: [file], title: 'GoldView Market Update' });
    }
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center font-black text-amber-500 animate-pulse">GOLDVIEW...</div>;

  return (
    <HelmetProvider>
      <div className="min-h-screen bg-[#020202] text-zinc-100 font-sans pb-40 overflow-x-hidden relative selection:bg-white/10">
        <Helmet><title>Gold Price Today Nepal | GoldView</title></Helmet>

        {/* --- HEADER --- */}
        <header className="p-8 pt-16 flex justify-between items-end relative z-50 sticky top-0 bg-black/40 backdrop-blur-3xl border-b border-white/5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2.5 h-2.5 rounded-full shadow-lg animate-pulse" style={{ backgroundColor: themeColor, boxShadow: `0 0 15px ${themeColor}` }}></div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] transition-colors duration-500" style={{ color: themeColor }}>Market Live</p>
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-white">GoldView</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={handlePushSubscription} className="p-4 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 active:scale-90 transition-all">
              <BellRing className="w-5 h-5" style={{ color: isSubscribed ? '#22c55e' : '#52525b' }} />
            </button>
            <button onClick={handleShare} className="p-4 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 active:scale-90 transition-all"><Share2 className="w-5 h-5 text-white" /></button>
            <button onClick={() => window.location.reload()} className="p-4 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 active:scale-90 transition-all"><RefreshCcw className="w-5 h-5" style={{ color: themeColor }} /></button>
          </div>
        </header>

        {/* --- DASHBOARD --- */}
        {view === 'dashboard' && (
          <main className="px-6 space-y-6 mt-6 animate-in fade-in duration-700" ref={shareRef}>
            <div className="space-y-4">
              {['gold', 'tejabi', 'silver', 'usd'].map((type) => {
                 const isActive = activeMetal === type;
                 const change = getPriceChange(type);
                 const val = type === 'usd' ? (forexHistory[forexHistory.length-1]?.rates.find(r => r.currency.iso3 === 'USD')?.buy || 0) : (priceData[priceData.length-1]?.[type] || 0);
                 const meta = {
                   gold: { label: '24K Chhapawal Gold', grad: 'from-[#D4AF37]/50 to-transparent' },
                   tejabi: { label: 'Tejabi 22K Gold', grad: 'from-[#FFB800]/40 to-transparent' },
                   silver: { label: 'Pure Silver', grad: 'from-zinc-500/30 to-transparent' },
                   usd: { label: 'USD Rate (NRB)', grad: 'from-[#22c55e]/40 to-transparent' }
                 }[type];

                 return (
                  <div key={type} onClick={() => { setActiveMetal(type); setSelectedPoint(null); }}
                    className={`p-8 rounded-[3rem] border transition-all duration-500 cursor-pointer bg-gradient-to-br backdrop-blur-3xl relative overflow-hidden ${
                      isActive ? `${meta.grad} border-white/20 scale-[1.02]` : 'border-white/5 bg-white/5 opacity-40'
                    }`}>
                    <div className="flex justify-between items-start mb-2">
                       <p className="text-[11px] font-black uppercase tracking-widest opacity-50">{meta.label}</p>
                       <div className={`px-2.5 py-1 rounded-xl text-[10px] font-black border ${change >= 0 ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                         {change >= 0 ? '+' : ''}{type === 'usd' ? change.toFixed(2) : change.toLocaleString()}
                       </div>
                    </div>
                    <div className="flex justify-between items-end text-4xl font-black tracking-tighter">
                      <h2>{type === 'usd' ? `रू ${parseFloat(val).toFixed(2)}` : formatRS(val)}</h2>
                      {isActive && <TrendingUp className="w-6 h-6 opacity-40" />}
                    </div>
                  </div>
                 );
              })}
            </div>

            {/* FOREX MULTI SELECT */}
            {activeMetal === 'usd' && (
              <div className="flex flex-wrap gap-2 p-2 bg-white/5 rounded-3xl border border-white/10 animate-in slide-in-from-left">
                {['USD', 'GBP', 'EUR', 'AUD', 'JPY', 'AED'].map(c => (
                  <button key={c} onClick={() => selectedCurrencies.includes(c) ? setSelectedCurrencies(selectedCurrencies.filter(i => i !== c)) : setSelectedCurrencies([...selectedCurrencies, c])}
                    className={`px-5 py-2.5 rounded-2xl text-[10px] font-black transition-all ${selectedCurrencies.includes(c) ? 'bg-green-500 text-black shadow-lg shadow-green-500/20' : 'text-zinc-500 bg-white/5'}`}>{c}</button>
                ))}
              </div>
            )}

            {/* PERFORMANCE CHART */}
            <section className="bg-white/5 border border-white/10 rounded-[3.5rem] p-10 backdrop-blur-3xl shadow-xl">
              <div className="flex justify-between items-center mb-10 w-full px-1">
                <h3 className="text-xl font-black tracking-tight flex items-center gap-3"><Activity className="w-5 h-5" style={{ color: themeColor }} /> Performance</h3>
                <div className="flex bg-black/40 backdrop-blur-2xl rounded-full p-1.5 border border-white/10">
                  {[7, 30, 90].map((t) => (<button key={t} onClick={() => { setTimeframe(t); setSelectedPoint(null); }} className={`px-5 py-2 rounded-full text-[10px] font-black transition-all ${timeframe === t ? `text-black` : 'text-zinc-500'}`} style={timeframe === t ? { backgroundColor: themeColor } : {}}>{t === 7 ? '7D' : t === 30 ? '1M' : '3M'}</button>))}
                </div>
              </div>
              
              <div className="h-64 relative w-full">
                <Line 
                  data={{
                    labels: activeMetal === 'usd' ? forexHistory.slice(-timeframe).map(d => {
                        const date = new Date(d.date);
                        return `${date.toLocaleString('en-US', {month:'short'})} ${date.getDate()}`;
                    }) : priceData.slice(-timeframe).map(d => {
                        const date = new Date(d.date.split(' ')[0]);
                        return `${date.toLocaleString('en-US', {month:'short'})} ${date.getDate()}`;
                    }),
                    datasets: activeMetal === 'usd' ? selectedCurrencies.map((c, i) => ({
                      label: c, data: forexHistory.slice(-timeframe).map(d => parseFloat(d.rates.find(r => r.currency.iso3 === c)?.buy || 0)),
                      borderColor: ['#22c55e', '#3b82f6', '#ef4444', '#a855f7'][i%4], borderWidth: 4, tension: 0.4, pointRadius: 0
                    })) : [{
                      data: filteredData.map(d => d[activeMetal]),
                      borderColor: themeColor, borderWidth: 5, tension: 0.4, fill: true,
                      pointRadius: (ctx) => (selectedPoint?.index === ctx.dataIndex ? 10 : 0),
                      backgroundColor: (ctx) => {
                        const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 400);
                        g.addColorStop(0, `${themeColor}40`); g.addColorStop(1, 'transparent'); return g;
                      }
                    }]
                  }} 
                  options={{ 
                    responsive: true, maintainAspectRatio: false, 
                    plugins: { legend: { display: activeMetal === 'usd' }, tooltip: { enabled: false, external: externalTooltipHandler } }, 
                    scales: { 
                      x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.2)', font: { size: 10, weight: '900' }, maxRotation: 0 } }, 
                      y: { display: false } 
                    },
                    onClick: (e, elements) => {
                      if (elements.length > 0) {
                        const idx = elements[0].index;
                        const p = filteredData[idx];
                        setSelectedPoint({ index: idx, date: p.date, price: activeMetal === 'usd' ? 0 : p[activeMetal] });
                      }
                    }
                  }} 
                />
              </div>

              {/* HISTORICAL DETAIL BOX */}
              <div className={`mt-10 transition-all duration-500 overflow-hidden ${selectedPoint ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}>
                {selectedPoint && (
                  <div className="bg-white/[0.08] backdrop-blur-3xl border border-white/10 rounded-[2.8rem] p-7 flex justify-between items-center w-full animate-in slide-in-from-bottom duration-500">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-3xl flex items-center justify-center bg-white/[0.05]" style={{ border: `1px solid ${themeColor}40` }}><Calendar className="w-7 h-7" style={{ color: themeColor }} /></div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Market Entry</p>
                        <p className="text-xl font-black">{new Date(selectedPoint.date.replace(' ', 'T')).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-[10px] font-black uppercase opacity-50">Logged Rate</p>
                        <p className="text-3xl font-black">{formatRS(selectedPoint.price)}</p>
                      </div>
                      <button onClick={() => setSelectedPoint(null)} className="p-3 bg-white/5 rounded-full border border-white/10 active:scale-75 transition-all"><X className="w-5 h-5 text-zinc-400" /></button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </main>
        )}

        {/* --- TOOLS --- */}
        {view === 'calculator' && (
          <main className="px-6 relative z-10 mt-6 animate-in zoom-in-95 duration-500">
            <div className="bg-white/5 border border-white/10 rounded-[4rem] p-10 backdrop-blur-3xl shadow-2xl">
              
              {/* TOP SELECTOR */}
              <div className="flex p-1.5 bg-black/40 backdrop-blur-xl rounded-[2.2rem] mb-12 border border-white/10">
                  <button onClick={() => setCalcMode('jewelry')} className={`flex-1 py-4 rounded-[1.8rem] text-[10px] font-black uppercase transition-all duration-500 ${calcMode === 'jewelry' ? 'bg-white text-black shadow-xl' : 'text-zinc-500'}`}>Jewelry</button>
                  <button onClick={() => setCalcMode('currency')} className={`flex-1 py-4 rounded-[1.8rem] text-[10px] font-black uppercase transition-all duration-500 ${calcMode === 'currency' ? 'bg-[#22c55e] text-black shadow-xl' : 'text-zinc-500'}`}>Currency</button>
              </div>

              {calcMode === 'jewelry' ? (
                <div className="space-y-8">
                  {/* BUY SELL TOGGLE */}
                  <div className="flex bg-black/40 backdrop-blur-xl p-1.5 rounded-3xl border border-white/10">
                    <button onClick={() => setCalcType('buy')} className={`flex-1 py-4 rounded-2xl text-[10px] font-black transition-all ${calcType === 'buy' ? 'bg-zinc-800 text-green-400 border border-white/10 shadow-lg' : 'text-zinc-600'}`}>NEW PURCHASE</button>
                    <button onClick={() => setCalcType('sell')} className={`flex-1 py-4 rounded-2xl text-[10px] font-black transition-all ${calcType === 'sell' ? 'bg-zinc-800 text-red-400 border border-white/10 shadow-lg' : 'text-zinc-600'}`}>SELL BACK</button>
                  </div>

                  {/* METAL SELECTOR */}
                  <div className="flex gap-2 justify-center">
                      {['gold', 'tejabi', 'silver'].map(m => (
                        <button key={m} onClick={() => setActiveMetal(m)} 
                           className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase border transition-all ${activeMetal === m ? 'bg-white/10 border-white/30 text-white shadow-lg' : 'border-white/5 opacity-30'}`}>
                           {m === 'gold' ? '24K Chhapawal' : m === 'tejabi' ? 'Tejabi 22K' : 'Pure Silver'}
                        </button>
                      ))}
                  </div>

                  <div className="grid grid-cols-3 gap-5">
                    {['tola', 'aana', 'lal'].map((unit) => (
                      <div key={unit}>
                        <label className="text-[10px] font-black opacity-30 uppercase block text-center mb-3 tracking-widest">{unit}</label>
                        <input type="number" className="w-full bg-black/60 border border-white/10 p-7 rounded-[2.2rem] text-center font-black text-3xl outline-none focus:border-white/30 transition-all" value={calc[unit]} onChange={(e) => setCalc({...calc, [unit]: e.target.value})} placeholder="0" />
                      </div>
                    ))}
                  </div>

                  {calcType === 'buy' && (
                    <div className="space-y-5">
                      <input type="number" placeholder="Making Charges (Total रू)" className="w-full bg-black/60 border border-white/10 p-7 rounded-[2.2rem] font-black text-center text-xl outline-none focus:border-white/20" value={calc.making} onChange={(e) => setCalc({...calc, making: e.target.value})} />
                      <div onClick={() => setCalc({...calc, vat: !calc.vat})} className="p-7 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] flex justify-between items-center cursor-pointer transition-all active:scale-95">
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${calc.vat ? 'bg-amber-500 shadow-[0_0_15px_rgba(212,175,55,0.4)]' : 'bg-zinc-800'}`}><Zap className={`w-4 h-4 ${calc.vat ? 'text-black fill-black' : 'text-zinc-500'}`} /></div>
                          <span className="font-black text-sm opacity-70 tracking-tight">Add 13% Govt VAT</span>
                        </div>
                        <div className={`w-12 h-6 rounded-full relative transition-all ${calc.vat ? 'bg-amber-500' : 'bg-zinc-800'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${calc.vat ? 'left-7' : 'left-1'}`}></div></div>
                      </div>
                    </div>
                  )}

                  {/* PRICE DISPLAY */}
                  <div className="p-14 rounded-[4.5rem] text-center shadow-2xl transition-all duration-1000 overflow-hidden relative" style={{ background: `linear-gradient(145deg, ${themeColor}, #000 160%)`, color: 'white' }}>
                     <p className="text-[12px] font-black uppercase tracking-[0.4em] mb-3 opacity-60">{calcType === 'buy' ? 'Final Jewelry Price' : 'You Receive'}</p>
                     <h3 className="text-6xl font-black tracking-tighter">
                       {(() => {
                         const rate = priceData[priceData.length-1][activeMetal === 'usd' ? 'gold' : activeMetal];
                         const weight = (Number(calc.tola)||0) + (Number(calc.aana)||0)/16 + (Number(calc.lal)||0)/192;
                         let total = weight * rate;
                         if (calcType === 'buy') { total += (Number(calc.making)||0); if (calc.vat) total *= 1.13; }
                         else { total *= 0.95; }
                         return formatRS(total);
                       })()}
                     </h3>
                  </div>
                </div>
              ) : (
                /* --- CURRENCY CONVERTER --- */
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-black/60 backdrop-blur-2xl rounded-[3.5rem] p-8 border border-white/10 space-y-10">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <p className="text-[10px] font-black text-zinc-600 mb-4 uppercase tracking-[0.2em]">SEND</p>
                                <div className="flex flex-col items-center gap-2 w-fit">
                                    <span className="text-5xl">{currCalc.isSwapped ? '🇳🇵' : currencyList.find(c => c.code === currCalc.source)?.flag}</span>
                                    {currCalc.isSwapped ? <span className="font-black mt-2 text-sm tracking-widest">NPR</span> : 
                                    <select className="bg-transparent font-black text-sm outline-none mt-2 text-white" value={currCalc.source} onChange={(e) => setCurrCalc({...currCalc, source: e.target.value})}>
                                        {currencyList.map(c => <option key={c.code} value={c.code} className="bg-zinc-900">{c.code}</option>)}
                                    </select>}
                                </div>
                            </div>
                            <div className="pt-10"><button onClick={() => setCurrCalc({...currCalc, isSwapped: !currCalc.isSwapped})} className="p-5 bg-green-500/20 rounded-3xl border border-green-500/20 active:rotate-180 transition-all"><ArrowRightLeft className="w-6 h-6 text-green-500" /></button></div>
                            <div className="flex-1 text-right">
                                <p className="text-[10px] font-black text-zinc-600 mb-4 uppercase tracking-[0.2em]">GET</p>
                                <div className="flex flex-col items-center gap-2 w-fit ml-auto">
                                    <span className="text-5xl">{currCalc.isSwapped ? currencyList.find(c => c.code === currCalc.source)?.flag : '🇳🇵'}</span>
                                    {currCalc.isSwapped ? <select className="bg-transparent font-black text-sm mt-2" value={currCalc.source} onChange={(e) => setCurrCalc({...currCalc, source: e.target.value})}>
                                        {currencyList.map(c => <option key={c.code} value={c.code} className="bg-zinc-900">{c.code}</option>)}
                                    </select> : <span className="font-black mt-2 text-sm tracking-widest">NPR</span>}
                                </div>
                            </div>
                        </div>
                        <input type="number" className="w-full bg-black/40 border border-white/10 p-10 rounded-[3rem] font-black text-5xl outline-none focus:border-green-500 text-center transition-all" value={currCalc.amount} onChange={(e) => setCurrCalc({...currCalc, amount: e.target.value})} />
                    </div>
                    <div className="bg-green-600 p-14 rounded-[4rem] text-white text-center shadow-2xl relative overflow-hidden">
                       <p className="text-[12px] font-black uppercase tracking-[0.4em] opacity-60 mb-3">Conversion Payout</p>
                       <h3 className="text-6xl font-black tracking-tighter">
                          {(() => {
                            if (!forexHistory.length) return "रू 0";
                            const latestRates = forexHistory[forexHistory.length - 1]?.rates || [];
                            const rateData = latestRates.find(r => r.currency.iso3 === currCalc.source);
                            const rawRate = parseFloat(rateData?.buy || 133);
                            const unit = parseInt(rateData?.currency?.unit || 1);
                            const amt = Number(currCalc.amount) || 0;
                            if (currCalc.isSwapped) return ((amt / rawRate) * unit).toLocaleString(undefined, {minimumFractionDigits: 2});
                            return formatRS((amt / unit) * rawRate);
                          })()}
                       </h3>
                    </div>
                </div>
              )}
            </div>
          </main>
        )}

        {/* --- BOTTOM NAV --- */}
        <nav className="fixed bottom-12 left-10 right-10 h-20 bg-zinc-900/60 backdrop-blur-[50px] rounded-[3rem] border border-white/10 flex justify-around items-center px-4 z-[200]">
          <button onClick={() => setView('dashboard')} className={`flex flex-col items-center gap-1.5 px-12 py-3.5 rounded-[2.2rem] transition-all duration-300 ${view === 'dashboard' ? 'text-black shadow-lg shadow-white/5' : 'text-zinc-500'}`} style={view === 'dashboard' ? { backgroundColor: themeColor } : {}}>
            <LayoutDashboard className={`w-6 h-6 ${view === 'dashboard' ? 'fill-black' : ''}`} />
            <span className="text-[9px] font-black uppercase tracking-widest">Dashboard</span>
          </button>
          <button onClick={() => { setView('calculator'); setCalcMode('jewelry'); setCalcType('buy'); setActiveMetal('gold'); }} 
            className={`flex flex-col items-center gap-1.5 px-12 py-3.5 rounded-[2.2rem] transition-all duration-300 ${view === 'calculator' ? 'text-black shadow-lg shadow-white/5' : 'text-zinc-500'}`} style={view === 'calculator' ? { backgroundColor: themeColor } : {}}>
            <Calculator className={`w-6 h-6 ${view === 'calculator' ? 'fill-black' : ''}`} />
            <span className="text-[9px] font-black uppercase tracking-widest">Calculator</span>
          </button>
        </nav>

        <footer className="mt-20 px-10 pb-20 text-center opacity-30 text-[10px] leading-relaxed">
           <p className="font-black uppercase tracking-[0.5em] mb-2">GoldView Nepal</p>
           <p>Live Gold, Tejabi and Silver prices via FENEGOSIDA. Forex via Nepal Rastra Bank.</p>
        </footer>
      </div>
    </HelmetProvider>
  );
}