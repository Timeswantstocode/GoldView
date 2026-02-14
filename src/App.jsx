import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import { 
  Chart as ChartJS, registerables, Filler, Tooltip, 
  Legend, CategoryScale, LinearScale, PointElement, LineElement 
} from 'chart.js';
import { 
  LayoutDashboard, Calculator, RefreshCcw, TrendingUp, 
  X, Calendar, Zap, Activity, Coins, ArrowRightLeft, Globe, ArrowDown, Share2, BellRing
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
      span.style.marginBottom = '2px'; span.style.opacity = '0.5'; span.innerText = title;
      div.appendChild(span);
    });
    bodyLines.forEach((body) => {
      const span = document.createElement('span');
      span.style.fontSize = '14px'; span.style.fontWeight = '900'; span.innerText = body;
      div.appendChild(span);
    });
    while (tooltipEl.firstChild) { tooltipEl.firstChild.remove(); }
    tooltipEl.appendChild(div);
  }
  tooltipEl.style.opacity = 1;
  tooltipEl.style.left = chart.canvas.offsetLeft + tooltip.caretX + 'px';
  tooltipEl.style.top = chart.canvas.offsetTop + tooltip.caretY - 60 + 'px';
};

export default function App() {
  const [priceData, setPriceData] = useState(() => JSON.parse(localStorage.getItem('gv_v22_metal') || '[]'));
  const [forexHistory, setForexHistory] = useState(() => JSON.parse(localStorage.getItem('gv_v22_forex') || '[]'));
  const [loading, setLoading] = useState(priceData.length === 0);
  const [view, setView] = useState('dashboard');
  const [activeMetal, setActiveMetal] = useState('gold'); // gold, tejabi, silver, usd
  const [selectedCurrencies, setSelectedCurrencies] = useState(['USD']);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [timeframe, setTimeframe] = useState(7);
  const [isSubscribed, setIsSubscribed] = useState(true);
  
  // Calculators
  const [calcMode, setCalcMode] = useState('jewelry'); 
  const [calcType, setCalcType] = useState('buy');
  const [calc, setCalc] = useState({ tola: '', aana: '', lal: '', making: '', vat: true });
  const [currCalc, setCurrCalc] = useState({ amount: '1', source: 'USD', isSwapped: false });

  const shareRef = useRef(null);

  const currencyList = [
    { code: 'USD', flag: '🇺🇸' }, { code: 'GBP', flag: '🇬🇧' }, { code: 'AUD', flag: '🇦🇺' }, 
    { code: 'JPY', flag: '🇯🇵' }, { code: 'KRW', flag: '🇰🇷' }, { code: 'AED', flag: '🇦🇪' }, { code: 'EUR', flag: '🇪🇺' }
  ];

  // --- NATIVE NOTIFICATION CHECK ---
  useEffect(() => {
    if (window.OneSignalDeferred) {
      window.OneSignalDeferred.push(async (OneSignal) => {
        setIsSubscribed(await OneSignal.User.PushSubscription.optedIn);
      });
    }
  }, []);

  const handlePushSubscription = () => {
    window.OneSignalDeferred.push((OneSignal) => OneSignal.User.PushSubscription.optIn());
  };

  useEffect(() => {
    fetch(`${DATA_URL}?t=${Date.now()}`).then(res => res.json()).then(json => {
        setPriceData(json);
        localStorage.setItem('gv_v22_metal', JSON.stringify(json));
        setLoading(false);
    }).catch(() => setLoading(false));

    fetch(FOREX_PROXY).then(res => res.json()).then(json => {
        const transformed = json.data.payload.map(day => ({
          date: day.date,
          rates: day.rates
        })).sort((a, b) => new Date(a.date) - new Date(b.date));
        setForexHistory(transformed);
        localStorage.setItem('gv_v22_forex', JSON.stringify(transformed));
    });
  }, []);

  const formatRS = useCallback((num) => `रू ${Math.round(num || 0).toLocaleString()}`, []);

  // --- UI COLOR CHANGING FEATURE (RESTORED) ---
  const themeColor = useMemo(() => {
    if (view === 'calculator' && calcMode === 'currency') return '#22c55e';
    if (activeMetal === 'gold') return '#D4AF37';
    if (activeMetal === 'tejabi') return '#FFB800'; // Distinct 22K Color
    if (activeMetal === 'silver') return '#94a3b8';
    return '#22c55e'; 
  }, [activeMetal, view, calcMode]);

  const handleShare = async () => {
    const dataUrl = await toPng(shareRef.current, { backgroundColor: '#020202' });
    if (navigator.share) {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'goldview.png', { type: 'image/png' });
      navigator.share({ files: [file], title: 'GoldView Nepal' });
    }
  };

  const activeDataList = useMemo(() => activeMetal === 'usd' ? forexHistory : priceData, [activeMetal, forexHistory, priceData]);
  const filteredData = useMemo(() => activeDataList.slice(-timeframe), [activeDataList, timeframe]);

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><RefreshCcw className="w-10 h-10 animate-spin text-[#D4AF37]" /></div>;

  return (
    <HelmetProvider>
      <div className="min-h-screen bg-[#020202] text-zinc-100 font-sans pb-40 overflow-x-hidden relative">
        <Helmet><title>GoldView Nepal | Live 24K & 22K Price</title></Helmet>

        {/* --- NATIVE PUSH PROMPT (APPLE STYLE) --- */}
        {!isSubscribed && (
          <div className="p-6 bg-white/5 border-b border-white/10 flex items-center justify-between sticky top-0 z-[200] backdrop-blur-2xl">
             <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-500"><BellRing className="w-5 h-5 animate-pulse" /></div>
                <p className="text-[10px] font-black uppercase tracking-widest">Enable Device Alerts</p>
             </div>
             <button onClick={handlePushSubscription} className="bg-white text-black px-5 py-2 rounded-full text-[9px] font-black uppercase">Enable</button>
          </div>
        )}

        <header className="p-8 pt-16 flex justify-between items-end relative z-10 sticky top-0 bg-black/40 backdrop-blur-3xl border-b border-white/5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full shadow-lg animate-pulse" style={{ backgroundColor: themeColor }}></div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] transition-colors duration-500" style={{ color: themeColor }}>Market Update</p>
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-white">GoldView</h1>
          </div>
          <div className="flex gap-3">
            <button onClick={handleShare} className="p-4 bg-white/5 backdrop-blur-3xl rounded-3xl border border-white/10 active:scale-90 transition-all"><Share2 className="w-5 h-5" /></button>
            <button onClick={() => window.location.reload()} className="p-4 bg-white/5 backdrop-blur-3xl rounded-3xl border border-white/10 active:scale-90 transition-all"><RefreshCcw className="w-5 h-5" style={{ color: themeColor }} /></button>
          </div>
        </header>

        {/* --- DASHBOARD --- */}
        {view === 'dashboard' && (
          <main className="px-6 space-y-6 relative z-10 mt-6" ref={shareRef}>
            <div className="space-y-4">
              {['gold', 'tejabi', 'silver', 'usd'].map((type) => {
                 const isActive = activeMetal === type;
                 const val = type === 'usd' ? (forexHistory[forexHistory.length-1]?.rates.find(r => r.currency.iso3 === 'USD')?.buy || 0) : (priceData[priceData.length-1]?.[type] || 0);
                 const meta = {
                   gold: { label: '24K Chhapawal Gold', grad: 'from-[#D4AF37]/50 to-[#D4AF37]/15' },
                   tejabi: { label: '22K Tejabi Gold', grad: 'from-[#FFB800]/50 to-[#FFB800]/15' },
                   silver: { label: 'Pure Silver', grad: 'from-zinc-400/40 to-zinc-600/15' },
                   usd: { label: 'USD Rate (NRB)', grad: 'from-[#22c55e]/45 to-[#22c55e]/15' }
                 }[type];
                 return (
                  <div key={type} onClick={() => { setActiveMetal(type); setSelectedPoint(null); }}
                    className={`p-7 rounded-[2.8rem] border-[1.5px] transition-all duration-300 cursor-pointer bg-gradient-to-br backdrop-blur-3xl relative overflow-hidden ${
                      isActive ? `${meta.grad} border-white/20 scale-[1.02]` : 'border-white/5 bg-white/5 opacity-40'
                    }`}>
                    <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">{meta.label}</p>
                    <div className="flex justify-between items-end text-4xl font-black tracking-tighter">
                      <h2>{type === 'usd' ? `रू ${parseFloat(val).toFixed(2)}` : formatRS(val)}</h2>
                      {isActive && <TrendingUp className="w-5 h-5 opacity-20" />}
                    </div>
                  </div>
                 );
              })}
            </div>

            {/* MULTI CURRENCY SELECTOR */}
            {activeMetal === 'usd' && (
              <div className="flex flex-wrap gap-2 p-2 bg-white/5 rounded-3xl border border-white/10">
                {['USD', 'GBP', 'EUR', 'AUD', 'JPY', 'AED'].map(c => (
                  <button key={c} onClick={() => selectedCurrencies.includes(c) ? setSelectedCurrencies(selectedCurrencies.filter(i => i !== c)) : setSelectedCurrencies([...selectedCurrencies, c])}
                    className={`px-4 py-2 rounded-2xl text-[10px] font-black transition-all ${selectedCurrencies.includes(c) ? 'bg-green-500 text-black' : 'text-zinc-500 bg-white/5'}`}>{c}</button>
                ))}
              </div>
            )}

            <section className="bg-white/5 border border-white/10 rounded-[3.5rem] p-9 backdrop-blur-3xl shadow-xl">
              <div className="flex justify-between items-center mb-8 w-full">
                <h3 className="text-xl font-black tracking-tight flex items-center gap-3"><Activity className="w-5 h-5" style={{ color: themeColor }} /> Price Trend</h3>
                <div className="flex bg-white/5 rounded-full p-1 border border-white/10">
                  {[7, 30, 90].map((t) => (<button key={t} onClick={() => setTimeframe(t)} className={`px-4 py-2 rounded-full text-[9px] font-black transition-all ${timeframe === t ? `text-black` : 'text-zinc-500'}`} style={timeframe === t ? { backgroundColor: themeColor } : {}}>{t}D</button>))}
                </div>
              </div>
              <div className="h-64 relative w-full">
                <Line 
                  data={{
                    labels: activeMetal === 'usd' ? forexHistory.slice(-timeframe).map(d => d.date) : priceData.slice(-timeframe).map(d => d.date.split(' ')[0]),
                    datasets: activeMetal === 'usd' ? selectedCurrencies.map((c, i) => ({
                      label: c, data: forexHistory.slice(-timeframe).map(d => parseFloat(d.rates.find(r => r.currency.iso3 === c)?.buy || 0)),
                      borderColor: ['#22c55e', '#3b82f6', '#ef4444', '#a855f7'][i%4], borderWidth: 3, tension: 0.4, pointRadius: 0
                    })) : [{
                      data: filteredData.map(d => d[activeMetal]),
                      borderColor: themeColor, borderWidth: 4, tension: 0.4, fill: true, pointRadius: (ctx) => (selectedPoint?.index === ctx.dataIndex ? 8 : 0),
                      backgroundColor: (ctx) => {
                        const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 400);
                        g.addColorStop(0, `${themeColor}40`); g.addColorStop(1, 'transparent'); return g;
                      }
                    }]
                  }} 
                  options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: activeMetal === 'usd' }, tooltip: { enabled: false, external: externalTooltipHandler } }, 
                  scales: { x: { display: true, grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.2)', font: { size: 9 } } }, y: { display: false } },
                  onClick: (e, elements) => {
                    if (elements.length > 0) {
                      const idx = elements[0].index;
                      const p = filteredData[idx];
                      setSelectedPoint({ index: idx, date: p.date, price: activeMetal === 'usd' ? 0 : p[activeMetal] });
                    }
                  } }} 
                />
              </div>

              {/* --- HISTORICAL POINT BOX (RESTORED) --- */}
              <div className={`mt-8 transition-all duration-500 overflow-hidden ${selectedPoint ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}>
                {selectedPoint && (
                  <div className="bg-white/10 border-2 rounded-[2.8rem] p-7 flex flex-wrap gap-5 justify-between items-center w-full backdrop-blur-[40px] relative border-white/5" style={{ borderColor: `${themeColor}40` }}>
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-3xl flex items-center justify-center border bg-white/[0.03]" style={{ borderColor: `${themeColor}30` }}><Calendar className="w-7 h-7" style={{ color: themeColor }} /></div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] mb-1" style={{ color: themeColor }}>Log Point</p>
                        <p className="text-lg font-black text-white">{new Date(selectedPoint.date.replace(' ', 'T')).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-[9px] font-black text-zinc-600 uppercase mb-1">Market Rate</p>
                        <p className="text-3xl font-black text-white">{formatRS(selectedPoint.price)}</p>
                      </div>
                      <button onClick={() => setSelectedPoint(null)} className="p-3 bg-white/5 rounded-full border border-white/5"><X className="w-5 h-5 text-zinc-400" /></button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </main>
        )}

        {/* --- CALCULATORS --- */}
        {view === 'calculator' && (
          <main className="px-6 relative z-10 mt-6 animate-in zoom-in-95 duration-500">
            <div className="bg-white/5 border border-white/10 rounded-[4rem] p-8 backdrop-blur-3xl shadow-xl">
              <div className="flex p-1 bg-black/40 rounded-3xl mb-10 border border-white/5">
                  <button onClick={() => setCalcMode('jewelry')} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase transition-all ${calcMode === 'jewelry' ? 'bg-white text-black' : 'text-zinc-500'}`}>Jewelry</button>
                  <button onClick={() => setCalcMode('currency')} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase transition-all ${calcMode === 'currency' ? 'bg-[#22c55e] text-black' : 'text-zinc-500'}`}>Currency</button>
              </div>

              {calcMode === 'jewelry' ? (
                <div className="space-y-6">
                  {/* BUY SELL TOGGLE */}
                  <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5">
                    <button onClick={() => setCalcType('buy')} className={`flex-1 py-3 rounded-xl text-[10px] font-black ${calcType === 'buy' ? 'bg-zinc-800 text-green-400' : 'text-zinc-500'}`}>NEW PURCHASE</button>
                    <button onClick={() => setCalcType('sell')} className={`flex-1 py-3 rounded-xl text-[10px] font-black ${calcType === 'sell' ? 'bg-zinc-800 text-red-400' : 'text-zinc-500'}`}>SELL BACK</button>
                  </div>
                  <div className="flex gap-2 justify-center">
                      {['gold', 'tejabi', 'silver'].map(m => (<button key={m} onClick={() => setActiveMetal(m)} style={{ backgroundColor: activeMetal === m ? themeColor : 'transparent' }} className={`px-8 py-2.5 rounded-xl text-[9px] font-black uppercase border border-white/5 ${activeMetal === m ? 'text-black' : 'text-zinc-500'}`}>{m}</button>))}
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {['tola', 'aana', 'lal'].map((unit) => (<div key={unit}><label className="text-[10px] font-black text-zinc-500 uppercase mb-2 block ml-3 tracking-widest">{unit}</label>
                    <input type="number" className="w-full bg-black/60 border-2 border-zinc-800 p-5 rounded-3xl text-center font-black text-2xl text-white outline-none focus:border-white/20" value={calc[unit]} onChange={(e) => setCalc({...calc, [unit]: e.target.value})} placeholder="0" /></div>))}
                  </div>
                  {calcType === 'buy' && (
                    <>
                      <input type="number" placeholder="Making Charges (Total Rs)" className="w-full bg-black/60 border-2 border-zinc-800 p-6 rounded-3xl font-black text-lg outline-none text-white focus:border-white/20" value={calc.making} onChange={(e) => setCalc({...calc, making: e.target.value})} />
                      <div onClick={() => setCalc({...calc, vat: !calc.vat})} className="flex justify-between items-center p-6 bg-white/5 rounded-[2.2rem] border border-white/5 cursor-pointer"><div className="flex items-center gap-3"><div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${calc.vat ? themeColor : 'border-zinc-800'}`}>{calc.vat && <Zap className="w-3.5 h-3.5 text-black fill-black" />}</div><span className="font-bold text-zinc-300">13% Govt VAT</span></div></div>
                    </>
                  )}
                  <div className={`p-12 rounded-[3.5rem] text-black text-center shadow-2xl transition-all duration-700`} style={{ background: `linear-gradient(135deg, ${themeColor}, #000 180%)`, color: 'white' }}>
                     <p className="text-[11px] font-black uppercase tracking-[0.4em] mb-2 opacity-60">{calcType === 'buy' ? 'Estimated Total' : 'Cash Payout'}</p>
                     <h3 className="text-5xl font-black tracking-tighter">
                       {(() => {
                         const rate = priceData[priceData.length-1][activeMetal];
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
                /* --- CURRENCY CONVERTER (RESTORED) --- */
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-black/40 rounded-[3rem] p-7 border border-white/10 space-y-10">
                        <div className="flex items-start justify-between px-1">
                            <div className="flex-1 flex flex-col items-start gap-4">
                                <p className="text-[8px] font-black text-zinc-500 uppercase">SEND</p>
                                <div className="flex flex-col items-center gap-1.5 w-fit">
                                    <span className="text-4xl">{currCalc.isSwapped ? '🇳🇵' : currencyList.find(c => c.code === currCalc.source)?.flag}</span>
                                    {currCalc.isSwapped ? <span className="text-[11px] font-black">NPR</span> : 
                                    <select className="bg-transparent font-black text-[11px] text-white outline-none" value={currCalc.source} onChange={(e) => setCurrCalc({...currCalc, source: e.target.value})}>
                                        {currencyList.map(c => <option key={c.code} value={c.code} className="bg-zinc-900">{c.code}</option>)}
                                    </select>}
                                </div>
                            </div>
                            <div className="px-4 pt-8"><button onClick={() => setCurrCalc({...currCalc, isSwapped: !currCalc.isSwapped})} className="p-4 bg-green-500/20 rounded-2xl border border-green-500/20"><ArrowRightLeft className="w-5 h-5 text-green-500" /></button></div>
                            <div className="flex-1 flex flex-col items-end gap-4">
                                <p className="text-[8px] font-black text-zinc-500 uppercase">GET</p>
                                <div className="flex flex-col items-center gap-1.5 w-fit">
                                    <span className="text-4xl">{currCalc.isSwapped ? currencyList.find(c => c.code === currCalc.source)?.flag : '🇳🇵'}</span>
                                    {currCalc.isSwapped ? <select className="bg-transparent font-black text-[11px] text-white" value={currCalc.source} onChange={(e) => setCurrCalc({...currCalc, source: e.target.value})}>
                                        {currencyList.map(c => <option key={c.code} value={c.code} className="bg-zinc-900">{c.code}</option>)}
                                    </select> : <span className="text-[11px] font-black">NPR</span>}
                                </div>
                            </div>
                        </div>
                        <input type="number" className="w-full bg-black/60 border-2 border-zinc-800 p-8 rounded-[2.5rem] font-black text-4xl outline-none focus:border-green-500 text-white text-center" value={currCalc.amount} onChange={(e) => setCurrCalc({...currCalc, amount: e.target.value})} />
                    </div>
                    <div className="bg-green-600 p-12 rounded-[3.5rem] text-white text-center shadow-xl">
                       <p className="text-[11px] font-black uppercase opacity-60 mb-2">Payout Estimate</p>
                       <h3 className="text-5xl font-black tracking-tighter">
                          {(() => {
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

        {/* --- NAVIGATION --- */}
        <nav className="fixed bottom-12 left-10 right-10 h-20 bg-zinc-900/60 backdrop-blur-[50px] rounded-[3rem] border border-white/10 flex justify-around items-center px-4 z-50">
          <button onClick={() => setView('dashboard')} className={`flex flex-col items-center gap-1.5 px-12 py-3.5 rounded-[2.2rem] transition-all duration-300 ${view === 'dashboard' ? 'text-black shadow-lg shadow-white/5' : 'text-zinc-500'}`} style={view === 'dashboard' ? { backgroundColor: themeColor } : {}}>
            <LayoutDashboard className={`w-6 h-6 ${view === 'dashboard' ? 'fill-black' : ''}`} />
            <span className="text-[9px] font-black uppercase tracking-widest">Market</span>
          </button>
          <button onClick={() => setView('calculator')} className={`flex flex-col items-center gap-1.5 px-12 py-3.5 rounded-[2.2rem] transition-all duration-300 ${view === 'calculator' ? 'text-black shadow-lg shadow-white/5' : 'text-zinc-500'}`} style={view === 'calculator' ? { backgroundColor: themeColor } : {}}>
            <Calculator className={`w-6 h-6 ${view === 'calculator' ? 'fill-black' : ''}`} />
            <span className="text-[9px] font-black uppercase tracking-widest">Calculator</span>
          </button>
        </nav>
      </div>
    </HelmetProvider>
  );
}