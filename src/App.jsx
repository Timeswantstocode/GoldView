import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import { 
  Chart as ChartJS, registerables, Filler, Tooltip, 
  Legend, CategoryScale, LinearScale, PointElement, LineElement 
} from 'chart.js';
import { 
  LayoutDashboard, Calculator, RefreshCcw, TrendingUp, 
  X, Calendar, Zap, Activity, Coins, Globe, ArrowDown, Share2, BellRing, Info, ChevronRight 
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Helmet, HelmetProvider } from 'react-helmet-async';

ChartJS.register(...registerables, Filler, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement);

const DATA_URL = "https://raw.githubusercontent.com/Timeswantstocode/GoldView/main/data.json";
const FOREX_PROXY = "/api/forex";

// --- ORIGINAL CUSTOM HTML TOOLTIP HANDLER (DARKER & FOGGIER) ---
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
  const [priceData, setPriceData] = useState(() => JSON.parse(localStorage.getItem('gv_v22_metal') || '[]'));
  const [forexHistory, setForexHistory] = useState(() => JSON.parse(localStorage.getItem('gv_v22_forex') || '[]'));
  const [loading, setLoading] = useState(priceData.length === 0);
  const [view, setView] = useState('dashboard');
  const [activeMetal, setActiveMetal] = useState('gold');
  const [selectedCurrencies, setSelectedCurrencies] = useState(['USD']);
  const [timeframe, setTimeframe] = useState(7);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [calcType, setCalcType] = useState('buy');
  const [calc, setCalc] = useState({ tola: '', aana: '', lal: '', making: '', vat: true });
  
  const shareRef = useRef(null);

  // --- NATIVE NOTIFICATION LOGIC ---
  useEffect(() => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      setIsSubscribed(await OneSignal.User.PushSubscription.optedIn);
    });
  }, []);

  const handlePushSubscription = () => {
    window.OneSignalDeferred.push((OneSignal) => {
      OneSignal.User.PushSubscription.optIn();
    });
  };

  useEffect(() => {
    fetch(`${DATA_URL}?t=${Date.now()}`).then(res => res.json()).then(json => {
        const processed = json.map(d => ({ ...d, tejabi: d.tejabi || Math.round(d.gold * 0.9167) }));
        setPriceData(processed);
        localStorage.setItem('gv_v22_metal', JSON.stringify(processed));
        setLoading(false);
    }).catch(() => setLoading(false));

    fetch(FOREX_PROXY).then(res => res.json()).then(json => {
        const transformed = json.data.payload.map(d => ({
          date: d.date,
          rates: d.rates
        })).sort((a, b) => new Date(a.date) - new Date(b.date));
        setForexHistory(transformed);
        localStorage.setItem('gv_v22_forex', JSON.stringify(transformed));
    });
  }, []);

  // --- BETTER METALLIC GRADIENTS & THEMES ---
  const themes = {
    gold: { 
      grad: 'from-[#BF953F] via-[#FCF6BA] via-[#FBF5B7] to-[#AA771C]', 
      text: '#D4AF37', 
      glow: 'shadow-[0_0_35px_-5px_#D4AF37]',
      cardText: 'text-black'
    },
    tejabi: { 
      grad: 'from-[#8A6E2F] via-[#C5A028] via-[#B8860B] to-[#5C4003]', 
      text: '#FFB800', 
      glow: 'shadow-[0_0_35px_-5px_#FFB800]',
      cardText: 'text-white'
    },
    silver: { 
      grad: 'from-[#757575] via-[#e0e0e0] to-[#757575]', 
      text: '#94a3b8', 
      glow: 'shadow-[0_0_35px_-5px_#94a3b8]',
      cardText: 'text-black'
    },
    forex: { 
      grad: 'from-[#11998e] to-[#38ef7d]', 
      text: '#22c55e', 
      glow: 'shadow-[0_0_35px_-5px_#22c55e]',
      cardText: 'text-black'
    }
  };

  const getPriceChange = (id) => {
    if (priceData.length < 2) return 0;
    const latest = priceData[priceData.length - 1][id];
    const prev = priceData[priceData.length - 2][id];
    return latest - prev;
  };

  const formatRS = (num) => `रू ${Math.round(num || 0).toLocaleString()}`;

  const handleShare = async () => {
    try {
      if (navigator.share) {
        const dataUrl = await toPng(shareRef.current, { quality: 0.95, backgroundColor: '#050505' });
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], 'goldview.png', { type: 'image/png' });
        await navigator.share({
          files: [file],
          title: 'GoldView Nepal Update',
          text: `Today's Gold Rate: ${formatRS(priceData[priceData.length-1].gold)}`
        });
      }
    } catch (err) { console.error("Share failed", err); }
  };

  const chartData = useMemo(() => {
    const labels = activeMetal === 'forex' ? forexHistory.slice(-timeframe).map(d => d.date) : priceData.slice(-timeframe).map(d => d.date.split(' ')[0]);
    
    if (activeMetal !== 'forex') {
      return {
        labels,
        datasets: [{
          data: priceData.slice(-timeframe).map(d => d[activeMetal]),
          borderColor: themes[activeMetal].text,
          borderWidth: 4,
          tension: 0.4,
          fill: true,
          backgroundColor: (ctx) => {
            const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 400);
            g.addColorStop(0, `${themes[activeMetal].text}40`);
            g.addColorStop(1, 'transparent');
            return g;
          }
        }]
      };
    } else {
      // Multi-Currency Logic
      return {
        labels,
        datasets: selectedCurrencies.map((curr, idx) => ({
          label: curr,
          data: forexHistory.slice(-timeframe).map(d => {
            const r = d.rates.find(rate => rate.currency.iso3 === curr);
            return r ? parseFloat(r.buy) : 0;
          }),
          borderColor: ['#22c55e', '#3b82f6', '#ef4444', '#a855f7', '#f97316'][idx % 5],
          borderWidth: 3,
          tension: 0.4,
          pointRadius: 0
        }))
      };
    }
  }, [priceData, forexHistory, activeMetal, timeframe, selectedCurrencies]);

  if (loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
      <RefreshCcw className="w-8 h-8 animate-spin text-amber-500" />
      <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-500">GoldView</p>
    </div>
  );

  return (
    <HelmetProvider>
      <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans pb-40 overflow-x-hidden selection:bg-amber-500/30">
        <Helmet>
          <title>GoldView Nepal | Premium Tracker</title>
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        </Helmet>

        {/* --- NATIVE PUSH PROMPT --- */}
        {!isSubscribed && (
          <div className="p-6 bg-gradient-to-r from-zinc-900 to-black border-b border-white/10 animate-in slide-in-from-top duration-1000">
             <div className="max-w-xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-amber-500 shadow-2xl">
                      <BellRing className="w-6 h-6 animate-pulse" />
                   </div>
                   <div>
                      <h4 className="text-sm font-black uppercase tracking-tight">Push Notifications</h4>
                      <p className="text-[10px] opacity-50 uppercase tracking-tighter">Native Alerts on your Lock Screen</p>
                   </div>
                </div>
                <button onClick={handlePushSubscription} className="px-6 py-2.5 bg-white text-black rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all">Enable</button>
             </div>
          </div>
        )}

        {/* --- HEADER --- */}
        <header className="p-8 pt-12 flex justify-between items-end relative z-[100] sticky top-0 bg-black/60 backdrop-blur-2xl border-b border-white/5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e]"></div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Market Tracked</p>
            </div>
            <h1 className="text-4xl font-black tracking-tighter">GoldView</h1>
          </div>
          <div className="flex gap-3">
            <button onClick={handleShare} className="p-4 bg-white/5 rounded-2xl border border-white/10 active:scale-95 transition-all"><Share2 className="w-5 h-5" /></button>
            <button onClick={() => window.location.reload()} className="p-4 bg-white/5 rounded-2xl border border-white/10 active:scale-95 transition-all"><RefreshCcw className="w-5 h-5" /></button>
          </div>
        </header>

        {/* --- DASHBOARD VIEW --- */}
        {view === 'dashboard' && (
          <main className="px-6 space-y-6 mt-6 animate-in fade-in duration-700" ref={shareRef}>
            <div className="grid gap-4">
              {['gold', 'tejabi', 'silver', 'forex'].map((type) => {
                const isActive = activeMetal === type;
                const change = getPriceChange(type === 'tejabi' ? 'tejabi' : type);
                const val = type === 'forex' ? (forexHistory[forexHistory.length-1]?.rates.find(r => r.currency.iso3 === 'USD')?.buy || 0) : (priceData[priceData.length-1]?.[type] || 0);
                
                return (
                  <div key={type} onClick={() => setActiveMetal(type)}
                    className={`p-8 rounded-[2.8rem] border transition-all duration-700 cursor-pointer relative overflow-hidden ${
                      isActive ? `bg-gradient-to-br ${themes[type].grad} border-white/40 ${themes[type].glow} scale-[1.02]` : 'border-white/5 bg-white/[0.03] opacity-40'
                    }`}>
                    <div className="flex justify-between items-start relative z-10">
                       <p className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-black/60' : 'opacity-40'}`}>
                         {type === 'gold' ? '24K Chhapawal' : type === 'tejabi' ? '22K Tejabi' : type === 'silver' ? 'Pure Silver' : 'USD to NPR'}
                       </p>
                       <div className={`px-3 py-1 rounded-xl text-[10px] font-black ${isActive ? 'bg-black/10 text-black' : (change >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400')}`}>
                         {change >= 0 ? '+' : ''}{change.toLocaleString()}
                       </div>
                    </div>
                    <h2 className={`text-4xl font-black tracking-tighter mt-2 relative z-10 ${isActive ? themes[type].cardText : 'text-white'}`}>
                      {type === 'forex' ? `रू ${parseFloat(val).toFixed(2)}` : formatRS(val)}
                    </h2>
                  </div>
                );
              })}
            </div>

            {/* --- MULTI CURRENCY SELECTOR (ONLY WHEN FOREX ACTIVE) --- */}
            {activeMetal === 'forex' && (
              <div className="flex flex-wrap gap-2 p-3 bg-white/5 rounded-3xl border border-white/10 animate-in slide-in-from-left duration-500">
                {['USD', 'GBP', 'EUR', 'AUD', 'JPY', 'AED'].map(c => {
                   const isSel = selectedCurrencies.includes(c);
                   return (
                    <button key={c} onClick={() => isSel ? setSelectedCurrencies(selectedCurrencies.filter(i => i !== c)) : setSelectedCurrencies([...selectedCurrencies, c])}
                      className={`px-5 py-2.5 rounded-2xl text-[10px] font-black transition-all ${isSel ? 'bg-green-500 text-black shadow-lg shadow-green-500/20' : 'text-zinc-500 bg-white/5'}`}>{c}</button>
                   );
                })}
              </div>
            )}

            {/* --- TREND CHART --- */}
            <section className="bg-white/5 border border-white/10 rounded-[3.5rem] p-10 backdrop-blur-3xl relative overflow-hidden">
               <div className="flex justify-between items-center mb-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center" style={{ color: themes[activeMetal].text }}><Activity className="w-5 h-5" /></div>
                    <h3 className="font-black text-xs uppercase tracking-widest opacity-40 tracking-[0.2em]">Market Depth</h3>
                  </div>
                  <div className="flex bg-black/50 rounded-full p-1 border border-white/5">
                    {[7, 30, 90].map(t => (<button key={t} onClick={() => setTimeframe(t)} className={`px-5 py-2 rounded-full text-[9px] font-black transition-all ${timeframe === t ? 'bg-white text-black shadow-xl' : 'text-zinc-500'}`}>{t}D</button>))}
                  </div>
               </div>
               <div className="h-72">
                  <Line 
                    data={chartData} 
                    options={{ 
                      responsive: true, 
                      maintainAspectRatio: false, 
                      interaction: { mode: 'index', intersect: false },
                      plugins: { 
                        legend: { 
                          display: activeMetal === 'forex', 
                          position: 'top',
                          labels: { color: '#fff', font: { family: 'Inter', weight: '900', size: 10 }, usePointStyle: true, padding: 20 } 
                        },
                        tooltip: { enabled: false, external: externalTooltipHandler }
                      }, 
                      scales: { 
                        x: { display: true, grid: { display: false }, ticks: { display: false } }, 
                        y: { display: true, position: 'right', grid: { color: 'rgba(255,255,255,0.05)', borderDash: [5, 5] }, ticks: { display: false } } 
                      } 
                    }} 
                  />
               </div>
            </section>
          </main>
        )}

        {/* --- CALCULATOR VIEW --- */}
        {view === 'calculator' && (
          <main className="px-6 mt-6 animate-in zoom-in-95 duration-500">
            <div className="bg-white/5 border border-white/10 rounded-[4rem] p-10 backdrop-blur-3xl">
              <div className="flex gap-2 bg-black/40 p-1.5 rounded-3xl mb-10">
                <button onClick={() => setCalcType('buy')} className={`flex-1 py-4 rounded-2xl text-[10px] font-black tracking-widest transition-all ${calcType === 'buy' ? 'bg-white text-black' : 'text-zinc-600'}`}>NEW PURCHASE</button>
                <button onClick={() => setCalcType('sell')} className={`flex-1 py-4 rounded-2xl text-[10px] font-black tracking-widest transition-all ${calcType === 'sell' ? 'bg-white text-black' : 'text-zinc-600'}`}>SELL BACK</button>
              </div>

              <div className="space-y-8">
                 <div className="flex gap-3 justify-center">
                    {['gold', 'tejabi', 'silver'].map(m => (
                      <button key={m} onClick={() => setActiveMetal(m)} className={`px-6 py-3 rounded-2xl border text-[9px] font-black uppercase tracking-widest transition-all ${activeMetal === m ? 'border-white/40 bg-white/10 text-white' : 'border-white/5 opacity-40'}`}>{m}</button>
                    ))}
                 </div>

                 <div className="grid grid-cols-3 gap-6">
                    {['tola', 'aana', 'lal'].map(u => (
                      <div key={u}>
                        <label className="text-[10px] font-black opacity-30 uppercase block text-center mb-3 tracking-widest">{u}</label>
                        <input type="number" value={calc[u]} onChange={(e) => setCalc({...calc, [u]: e.target.value})} className="w-full bg-black/60 border border-white/10 p-6 rounded-3xl text-center text-3xl font-black outline-none focus:border-white/30 transition-all" placeholder="0" />
                      </div>
                    ))}
                 </div>

                 {calcType === 'buy' && (
                   <div className="space-y-4">
                      <input type="number" placeholder="Making Charges (Total रू)" value={calc.making} onChange={(e) => setCalc({...calc, making: e.target.value})} className="w-full bg-black/60 border border-white/10 p-7 rounded-3xl text-center font-black outline-none focus:border-white/30 transition-all text-xl" />
                      <div onClick={() => setCalc({...calc, vat: !calc.vat})} className="p-7 bg-white/5 border border-white/10 rounded-3xl flex justify-between items-center cursor-pointer active:scale-[0.98] transition-all">
                        <div className="flex items-center gap-4">
                           <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${calc.vat ? 'bg-amber-500' : 'bg-zinc-800'}`}>
                              <Zap className={`w-4 h-4 ${calc.vat ? 'text-black fill-black' : 'text-zinc-500'}`} />
                           </div>
                           <span className="font-black text-sm opacity-70 tracking-tight">Apply 13% Govt VAT</span>
                        </div>
                        <div className={`w-12 h-6 rounded-full relative transition-all ${calc.vat ? 'bg-amber-500' : 'bg-zinc-800'}`}>
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${calc.vat ? 'left-7' : 'left-1'}`}></div>
                        </div>
                      </div>
                   </div>
                 )}

                 <div className={`p-14 rounded-[3.5rem] text-center shadow-2xl transition-all duration-1000 bg-gradient-to-br ${themes[activeMetal === 'forex' ? 'gold' : activeMetal].grad}`}>
                    <p className="text-[11px] font-black uppercase tracking-[0.4em] text-black/60 mb-3">{calcType === 'buy' ? 'Grand Total' : 'You Receive Cash'}</p>
                    <h3 className="text-6xl font-black tracking-tighter text-black">
                      {(() => {
                        const rate = priceData[priceData.length-1][activeMetal === 'forex' ? 'gold' : activeMetal];
                        const weight = (Number(calc.tola)||0) + (Number(calc.aana)||0)/16 + (Number(calc.lal)||0)/192;
                        let total = weight * rate;
                        if (calcType === 'buy') {
                          total += (Number(calc.making)||0);
                          if (calc.vat) total *= 1.13;
                        } else { total *= 0.95; }
                        return formatRS(total);
                      })()}
                    </h3>
                 </div>
              </div>
            </div>
          </main>
        )}

        {/* --- NAVIGATION --- */}
        <nav className="fixed bottom-10 left-8 right-8 h-20 bg-zinc-900/60 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 flex justify-around items-center px-4 z-[200]">
          <button onClick={() => setView('dashboard')} className={`flex flex-col items-center gap-1.5 px-10 py-3 rounded-2xl transition-all ${view === 'dashboard' ? 'text-white' : 'text-zinc-600'}`}>
            <LayoutDashboard className={`w-6 h-6 ${view === 'dashboard' ? 'fill-white' : ''}`} />
            <span className="text-[9px] font-black uppercase tracking-widest">Dashboard</span>
          </button>
          <button onClick={() => setView('calculator')} className={`flex flex-col items-center gap-1.5 px-10 py-3 rounded-2xl transition-all ${view === 'calculator' ? 'text-white' : 'text-zinc-600'}`}>
            <Calculator className={`w-6 h-6 ${view === 'calculator' ? 'fill-white' : ''}`} />
            <span className="text-[9px] font-black uppercase tracking-widest">Calculator</span>
          </button>
        </nav>

        <footer className="mt-20 px-10 pb-20 text-center opacity-30">
           <p className="text-[10px] font-black uppercase tracking-[0.5em]">GoldView Nepal • Designed by @Timeswantstocode</p>
        </footer>

        <Analytics />
        <SpeedInsights />
      </div>
    </HelmetProvider>
  );
}