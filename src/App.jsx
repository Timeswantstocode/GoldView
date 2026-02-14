import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import { 
  Chart as ChartJS, registerables, Filler, Tooltip, 
  Legend, CategoryScale, LinearScale, PointElement, LineElement 
} from 'chart.js';
import { 
  LayoutDashboard, Calculator, RefreshCcw, TrendingUp, 
  X, Calendar, Zap, Activity, Coins, ArrowRightLeft, Globe, ArrowDown, History, Share2, Info, Scale, CheckCircle2
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Helmet, HelmetProvider } from 'react-helmet-async';

ChartJS.register(...registerables, Filler, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement);

const DATA_URL = "https://raw.githubusercontent.com/Timeswantstocode/GoldView/main/data.json";
const FOREX_PROXY = "/api/forex";

// --- ORIGINAL CUSTOM HTML TOOLTIP HANDLER (RE-INTEGRATED) ---
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
  if (tooltip.opacity === 0) {
    tooltipEl.style.opacity = 0;
    return;
  }
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
  // --- STATES ---
  const [priceData, setPriceData] = useState(() => JSON.parse(localStorage.getItem('gv_v18_metal') || '[]'));
  const [forexHistory, setForexHistory] = useState(() => JSON.parse(localStorage.getItem('gv_v18_forex') || '[]'));
  const [loading, setLoading] = useState(priceData.length === 0);
  const [forexLoading, setForexLoading] = useState(true);
  const [view, setView] = useState('dashboard');
  const [activeMetal, setActiveMetal] = useState('gold'); // gold, tejabi, silver, usd
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [timeframe, setTimeframe] = useState(7);
  
  // Calculator States
  const [calcMode, setCalcMode] = useState('jewelry'); // jewelry, convert, loan, currency
  const [calcType, setCalcType] = useState('buy'); // buy, sell
  const [calc, setCalc] = useState({ tola: '', aana: '', lal: '', making: '', vat: true });
  const [gramInput, setGramInput] = useState('');
  const [currCalc, setCurrCalc] = useState({ amount: '1', source: 'USD', isSwapped: false });
  
  const chartRef = useRef(null);
  const shareRef = useRef(null);

  const currencyList = [
    { code: 'USD', flag: '🇺🇸' }, { code: 'GBP', flag: '🇬🇧' },
    { code: 'AUD', flag: '🇦🇺' }, { code: 'JPY', flag: '🇯🇵' },
    { code: 'KRW', flag: '🇰🇷' }, { code: 'AED', flag: '🇦🇪' },
    { code: 'EUR', flag: '🇪🇺' }
  ];

  // --- DATA FETCHING ---
  useEffect(() => {
    fetch(`${DATA_URL}?t=${Date.now()}`).then(res => res.json()).then(json => {
        // Automatically inject tejabi field if scraper hasn't added it yet
        const processed = json.map(d => ({
            ...d,
            tejabi: d.tejabi || Math.round(d.gold * 0.9167)
        }));
        setPriceData(processed);
        localStorage.setItem('gv_v18_metal', JSON.stringify(processed));
        setLoading(false);
    }).catch(() => setLoading(false));

    fetch(FOREX_PROXY).then(res => res.json()).then(json => {
        const transformed = json.data.payload.map(day => ({
          date: day.date,
          usdRate: parseFloat(day.rates.find(r => r.currency.iso3 === 'USD')?.buy || 0),
          rates: day.rates
        })).sort((a, b) => new Date(a.date) - new Date(b.date));
        setForexHistory(transformed);
        localStorage.setItem('gv_v18_forex', JSON.stringify(transformed));
        setForexLoading(false);
    }).catch(() => setForexLoading(false));
  }, []);

  // --- MARKET LOGIC (NEW) ---
  const marketStatus = useMemo(() => {
    const npt = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Kathmandu"}));
    const day = npt.getDay(); 
    const hour = npt.getHours();
    if (day === 6) return { open: false, msg: "Saturday: Market Closed" };
    if (hour < 11 || hour >= 17) return { open: false, msg: "Closed (Opens 11AM)" };
    return { open: true, msg: "Live: Market Open" };
  }, []);

  const sentiment = useMemo(() => {
    if (priceData.length < 15) return { label: "Stable", color: "#94a3b8" };
    const curr = priceData[priceData.length-1].gold;
    const avg = priceData.slice(-15).reduce((a, b) => a + b.gold, 0) / 15;
    const diff = ((curr - avg) / avg) * 100;
    if (diff < -1.5) return { label: "Strong Buy", color: "#22c55e" };
    if (diff > 1.5) return { label: "High Price", color: "#ef4444" };
    return { label: "Neutral", color: "#D4AF37" };
  }, [priceData]);

  // --- HELPERS ---
  const formatRS = useCallback((num) => `रू ${Math.round(num || 0).toLocaleString()}`, []);
  
  const themeColor = useMemo(() => {
    if (view === 'calculator' && calcMode === 'currency') return '#22c55e';
    if (activeMetal === 'gold') return '#D4AF37';
    if (activeMetal === 'tejabi') return '#FFB800';
    if (activeMetal === 'silver') return '#94a3b8';
    return '#22c55e'; 
  }, [activeMetal, view, calcMode]);

  const activeDataList = useMemo(() => activeMetal === 'usd' ? forexHistory : priceData, [activeMetal, forexHistory, priceData]);
  const filteredData = useMemo(() => activeDataList.slice(-timeframe), [activeDataList, timeframe]);
  
  const handleShare = async () => {
    if (!shareRef.current) return;
    const dataUrl = await toPng(shareRef.current, { cacheBust: true, backgroundColor: '#020202' });
    const link = document.createElement('a');
    link.download = `GoldView-${new Date().toISOString().split('T')[0]}.png`;
    link.href = dataUrl;
    link.click();
  };

  const convertGrams = (g) => {
    const totalLal = (Number(g) || 0) / 0.06075;
    return { t: Math.floor(totalLal / 192), a: Math.floor((totalLal % 192) / 12), l: Math.round(totalLal % 12) };
  };

  // --- CHART CONFIG ---
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
        ticks: { color: 'rgba(255, 255, 255, 0.25)', font: { size: 9, weight: '700' }, maxRotation: 0, maxTicksLimit: 7 }
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
  }), [filteredData, activeMetal]);

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center text-[#D4AF37]">
      <RefreshCcw className="w-10 h-10 animate-spin" />
    </div>
  );

  return (
    <HelmetProvider>
      <div className="min-h-screen bg-[#020202] text-zinc-100 font-sans pb-40 overflow-x-hidden relative">
        <Helmet>
            <title>GoldView Nepal | Live Gold, Silver & USD Rates</title>
            <meta name="description" content="Check live 24K and 22K gold rates in Nepal. Official NRB exchange rates and jewelry calculators." />
        </Helmet>

        {/* --- APPLE HEADER --- */}
        <header className="p-8 pt-16 flex justify-between items-end relative z-10 sticky top-0 bg-black/40 backdrop-blur-3xl border-b border-white/5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: marketStatus.open ? '#22c55e' : '#ef4444', boxShadow: `0 0 10px ${marketStatus.open ? '#22c55e' : '#ef4444'}` }}></div>
              <p className="text-[9px] font-black uppercase tracking-[0.4em] transition-colors duration-500" style={{ color: themeColor }}>{marketStatus.msg}</p>
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-white">GoldView</h1>
          </div>
          <div className="flex gap-3">
            <button onClick={handleShare} className="p-4 bg-white/5 backdrop-blur-3xl rounded-3xl border border-white/10 active:scale-90 transition-all">
               <Share2 className="w-5 h-5" />
            </button>
            <button onClick={() => window.location.reload()} className="p-4 bg-white/5 backdrop-blur-3xl rounded-3xl border border-white/10 active:scale-90 transition-all">
              <RefreshCcw className={`w-5 h-5 transition-colors duration-500 ${forexLoading ? 'animate-spin' : ''}`} style={{ color: themeColor }} />
            </button>
          </div>
        </header>

        {/* --- MARKET DASHBOARD --- */}
        {view === 'dashboard' && (
          <main className="px-6 space-y-6 relative z-10 animate-in fade-in duration-500" ref={shareRef}>
            
            {/* SENTIMENT BAR */}
            <div className="bg-white/5 border border-white/10 rounded-[2rem] p-5 flex items-center justify-between backdrop-blur-3xl shadow-xl">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white/5" style={{ color: sentiment.color }}><TrendingUp className="w-5 h-5" /></div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Market Sentiment</p>
               </div>
               <span className="px-4 py-1.5 rounded-full text-[10px] font-black" style={{ backgroundColor: `${sentiment.color}20`, color: sentiment.color, border: `1px solid ${sentiment.color}40` }}>{sentiment.label}</span>
            </div>

            <div className="space-y-4">
              {['gold', 'tejabi', 'silver', 'usd'].map((type) => {
                 const isActive = activeMetal === type;
                 const val = type === 'usd' ? (forexHistory[forexHistory.length-1]?.usdRate || 0) : (priceData[priceData.length-1]?.[type] || 0);
                 const meta = {
                   gold: { label: '24K Chhapawal Gold', sub: 'per tola', grad: 'from-[#D4AF37]/50 to-[#D4AF37]/15' },
                   tejabi: { label: '22K Tejabi Gold', sub: 'per tola', grad: 'from-[#FFB800]/50 to-[#FFB800]/15' },
                   silver: { label: 'Pure Silver', sub: 'per tola', grad: 'from-zinc-400/40 to-zinc-600/15' },
                   usd: { label: 'USD to NPR', sub: 'NRB Buying Rate', grad: 'from-[#22c55e]/45 to-[#22c55e]/15' }
                 }[type];
                 return (
                  <div key={type} onClick={() => { setActiveMetal(type); setSelectedPoint(null); }}
                    className={`p-7 rounded-[2.8rem] border-[1.5px] transition-all duration-300 cursor-pointer bg-gradient-to-br backdrop-blur-3xl relative overflow-hidden ${
                      isActive ? `${meta.grad} border-white/20 scale-[1.02]` : 'border-white/5 bg-white/5 opacity-40'
                    }`}>
                    <div className="flex justify-between items-start mb-2 text-[10px] font-black uppercase tracking-widest">
                      <div>{meta.label}<p className="text-[8px] opacity-50 mt-0.5">{meta.sub}</p></div>
                    </div>
                    <div className="flex justify-between items-end text-4xl font-black tracking-tighter">
                      <h2>{type === 'usd' ? `रू ${val.toFixed(2)}` : formatRS(val)}</h2>
                      {isActive && <TrendingUp className={`w-5 h-5 text-white/20`} />}
                    </div>
                  </div>
                 );
              })}
            </div>

            <section className="bg-white/5 border border-white/10 rounded-[3.5rem] p-9 backdrop-blur-3xl shadow-xl">
              <div className="flex justify-between items-center mb-8 px-1 w-full">
                <h3 className="text-xl font-black tracking-tight flex items-center gap-3"><Activity className="w-5 h-5" style={{ color: themeColor }} /> Trend Analysis</h3>
                <div className="flex bg-white/5 rounded-full p-1 border border-white/10">
                  {[7, 30, 90].map((t) => (<button key={t} onClick={() => { setTimeframe(t); setSelectedPoint(null); }} className={`px-4 py-2 rounded-full text-[9px] font-black transition-all ${timeframe === t ? `text-black` : 'text-zinc-500'}`} style={timeframe === t ? { backgroundColor: themeColor } : {}}>{t}D</button>))}
                </div>
              </div>
              <div className="h-64 relative w-full"><Line ref={chartRef} data={chartData} options={chartOptions} /></div>
              
              <div className={`mt-8 transition-all duration-500 overflow-hidden ${selectedPoint ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}>
                {selectedPoint && (
                  <div className="bg-white/10 border-2 rounded-[2.8rem] p-7 flex flex-wrap gap-5 justify-between items-center w-full backdrop-blur-[40px] relative border-white/5" style={{ borderColor: `${themeColor}40` }}>
                    <div className="absolute inset-0 bg-white/[0.02] pointer-events-none" />
                    <div className="flex items-center gap-5 flex-1 min-w-[220px]">
                      <div className="w-14 h-14 rounded-3xl flex items-center justify-center border shrink-0 bg-white/[0.03]" style={{ borderColor: `${themeColor}30` }}>
                        <Calendar className="w-7 h-7" style={{ color: themeColor }} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] mb-1" style={{ color: themeColor }}>Historical Log</p>
                        <p className="text-lg font-black text-white leading-tight">{new Date(selectedPoint.date.replace(' ', 'T')).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-[9px] font-black text-zinc-600 uppercase mb-1">Market Rate</p>
                        <p className="text-3xl font-black text-white">{activeMetal === 'usd' ? `रू ${selectedPoint.price.toFixed(2)}` : formatRS(selectedPoint.price)}</p>
                      </div>
                      <button onClick={() => setSelectedPoint(null)} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-all border border-white/5"><X className="w-5 h-5 text-zinc-400" /></button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </main>
        )}

        {/* --- CALCULATORS TAB --- */}
        {view === 'calculator' && (
          <main className="px-6 relative z-10 animate-in zoom-in-95 duration-500">
            <div className="bg-white/5 border border-white/10 rounded-[4rem] p-8 backdrop-blur-3xl shadow-xl">
              
              <div className="flex p-1 bg-black/40 rounded-[2.5rem] mb-10 border border-white/5 overflow-x-auto no-scrollbar">
                  <button onClick={() => setCalcMode('jewelry')} className={`flex-1 py-4 px-6 rounded-[2rem] text-[9px] font-black uppercase transition-all whitespace-nowrap ${calcMode === 'jewelry' ? 'bg-white text-black' : 'text-zinc-500'}`}>Jewelry</button>
                  <button onClick={() => setCalcMode('convert')} className={`flex-1 py-4 px-6 rounded-[2rem] text-[9px] font-black uppercase transition-all whitespace-nowrap ${calcMode === 'convert' ? 'bg-green-500 text-black' : 'text-zinc-500'}`}>Converter</button>
                  <button onClick={() => setCalcMode('loan')} className={`flex-1 py-4 px-6 rounded-[2rem] text-[9px] font-black uppercase transition-all whitespace-nowrap ${calcMode === 'loan' ? 'bg-amber-500 text-black' : 'text-zinc-500'}`}>Loan</button>
                  <button onClick={() => setCalcMode('currency')} className={`flex-1 py-4 px-6 rounded-[2rem] text-[9px] font-black uppercase transition-all whitespace-nowrap ${calcMode === 'currency' ? 'bg-blue-500 text-black' : 'text-zinc-500'}`}>Currency</button>
              </div>

              {calcMode === 'jewelry' && (
                <div className="space-y-6">
                  {/* BUY SELL TOGGLE */}
                  <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5">
                    <button onClick={() => setCalcType('buy')} className={`flex-1 py-3 rounded-xl text-[10px] font-black ${calcType === 'buy' ? 'bg-zinc-800 text-green-400' : 'text-zinc-500'}`}>NEW PURCHASE</button>
                    <button onClick={() => setCalcType('sell')} className={`flex-1 py-3 rounded-xl text-[10px] font-black ${calcType === 'sell' ? 'bg-zinc-800 text-red-400' : 'text-zinc-500'}`}>SELL BACK</button>
                  </div>

                  <div className="flex p-1 bg-white/5 rounded-2xl mb-8 border border-white/5 w-fit mx-auto">
                      {['gold', 'tejabi', 'silver'].map(m => (<button key={m} onClick={() => setActiveMetal(m)} style={{ backgroundColor: activeMetal === m ? themeColor : 'transparent' }} className={`px-8 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${activeMetal === m ? 'text-black' : 'text-zinc-500'}`}>{m}</button>))}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {['tola', 'aana', 'lal'].map((unit) => (<div key={unit}><label className="text-[9px] font-black text-zinc-500 uppercase mb-2 block ml-3 tracking-widest">{unit}</label>
                    <input type="number" className="w-full bg-black/60 border border-white/10 p-5 rounded-3xl text-center font-black text-2xl text-white outline-none focus:border-white/20" value={calc[unit]} onChange={(e) => setCalc({...calc, [unit]: e.target.value})} placeholder="0" /></div>))}
                  </div>

                  {calcType === 'buy' ? (
                    <>
                      <input type="number" placeholder="Making Charges (Total Rs)" className="w-full bg-black/60 border border-white/10 p-6 rounded-3xl font-black outline-none text-white focus:border-white/20" value={calc.making} onChange={(e) => setCalc({...calc, making: e.target.value})} />
                      <div onClick={() => setCalc({...calc, vat: !calc.vat})} className="flex justify-between items-center p-6 bg-white/5 rounded-3xl border border-white/5 cursor-pointer"><div className="flex items-center gap-3"><div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${calc.vat ? 'bg-amber-500 border-amber-500' : 'border-zinc-800'}`}>{calc.vat && <Zap className="w-3.5 h-3.5 text-black fill-black" />}</div><span className="font-bold text-zinc-300">13% Govt VAT</span></div></div>
                    </>
                  ) : (
                    <div className="p-5 bg-red-500/10 border border-red-500/20 rounded-3xl flex gap-4 items-center">
                      <Info className="w-5 h-5 text-red-400" />
                      <p className="text-[11px] opacity-70 leading-relaxed">A standard 5% deduction is applied when selling back old jewelry to dealers.</p>
                    </div>
                  )}

                  <div className="p-12 rounded-[3.5rem] text-black text-center shadow-2xl transition-all" style={{ background: `linear-gradient(135deg, ${themeColor}, #000 160%)`, color: 'white' }}>
                     <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-2 opacity-60">{calcType === 'buy' ? 'Total Amount' : 'Net Cash Payout'}</p>
                     <h3 className="text-5xl font-black tracking-tighter">
                        {(() => {
                            const rate = priceData[priceData.length-1][activeMetal === 'usd' ? 'gold' : activeMetal];
                            const weight = (Number(calc.tola)||0) + (Number(calc.aana)||0)/16 + (Number(calc.lal)||0)/192;
                            let total = weight * rate;
                            if (calcType === 'buy') {
                                total += (Number(calc.making)||0);
                                if (calc.vat) total *= 1.13;
                            } else {
                                total *= 0.95;
                            }
                            return formatRS(total);
                        })()}
                     </h3>
                  </div>
                </div>
              )}

              {calcMode === 'convert' && (
                <div className="space-y-10 py-6 animate-in fade-in duration-500">
                  <div className="text-center">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 block mb-6">Mass in Grams</label>
                    <input type="number" value={gramInput} onChange={(e) => setGramInput(e.target.value)} className="bg-transparent border-b-4 border-white/10 w-full text-center text-7xl font-black outline-none focus:border-green-500 transition-all pb-6" placeholder="0.00" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {Object.entries(convertGrams(gramInput)).map(([k, v]) => (
                      <div key={k} className="bg-white/5 rounded-[2.5rem] p-8 text-center border border-white/5">
                        <p className="text-4xl font-black mb-1">{v}</p>
                        <p className="text-[10px] font-black uppercase opacity-30">{k === 't' ? 'Tola' : k === 'a' ? 'Aana' : 'Lal'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {calcMode === 'loan' && (
                <div className="space-y-8 py-6 animate-in fade-in duration-500">
                  <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-3xl flex gap-4 items-center">
                    <Info className="w-6 h-6 text-amber-500 shrink-0" />
                    <p className="text-xs leading-relaxed opacity-80">According to NRB directives, banks provide up to **70% Loan-to-Value (LTV)** for gold collateral loans.</p>
                  </div>
                  <div className="text-center p-14 bg-white/5 rounded-[3.5rem] border border-white/5">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-5">Estimated Loan Eligibility</p>
                    <h4 className="text-5xl font-black tracking-tighter text-amber-500">
                      {(() => {
                        const rate = priceData[priceData.length-1].gold;
                        const weight = (Number(calc.tola)||0) + (Number(calc.aana)||0)/16 + (Number(calc.lal)||0)/192;
                        return formatRS(weight * rate * 0.70);
                      })()}
                    </h4>
                    <p className="text-[9px] mt-8 opacity-20 uppercase font-black">Calculation based on Chhapawal 24K Daily Rate</p>
                  </div>
                </div>
              )}

              {calcMode === 'currency' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-black/40 rounded-[3rem] p-7 border border-white/10 space-y-10">
                        <div className="flex items-start justify-between px-1">
                            <div className="flex-1 flex flex-col items-start gap-4">
                                <p className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em]">SENDING</p>
                                <div className="flex flex-col items-center gap-1.5 w-fit">
                                    <span className="text-4xl leading-none">{currCalc.isSwapped ? '🇳🇵' : currencyList.find(c => c.code === currCalc.source)?.flag}</span>
                                    {currCalc.isSwapped ? <span className="text-[11px] font-black text-white mt-1">NPR</span> : 
                                    <select className="bg-transparent font-black text-[11px] text-white outline-none mt-1 text-center" value={currCalc.source} onChange={(e) => setCurrCalc({...currCalc, source: e.target.value})}>
                                        {currencyList.map(c => <option key={c.code} value={c.code} className="bg-zinc-900">{c.code}</option>)}
                                    </select>}
                                </div>
                            </div>
                            <div className="px-4 pt-8">
                                <button onClick={() => setCurrCalc({...currCalc, isSwapped: !currCalc.isSwapped})} className="p-4 bg-blue-500/20 rounded-2xl transition-all border border-blue-500/20"><ArrowRightLeft className="w-5 h-5 text-blue-500" /></button>
                            </div>
                            <div className="flex-1 flex flex-col items-end gap-4 text-right">
                                <p className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em]">RECEIVING</p>
                                <div className="flex flex-col items-center gap-1.5 w-fit ml-auto">
                                    <span className="text-4xl leading-none">{currCalc.isSwapped ? currencyList.find(c => c.code === currCalc.source)?.flag : '🇳🇵'}</span>
                                    {currCalc.isSwapped ? <select className="bg-transparent font-black text-[11px] text-white outline-none mt-1 text-center" value={currCalc.source} onChange={(e) => setCurrCalc({...currCalc, source: e.target.value})}>
                                        {currencyList.map(c => <option key={c.code} value={c.code} className="bg-zinc-900">{c.code}</option>)}
                                    </select> : <span className="text-[11px] font-black text-white mt-1">NPR</span>}
                                </div>
                            </div>
                        </div>
                        <input type="number" className="w-full bg-black/60 border-2 border-zinc-800 p-8 rounded-[2.5rem] font-black text-4xl outline-none focus:border-blue-500 text-white text-center transition-all" value={currCalc.amount} onChange={(e) => setCurrCalc({...currCalc, amount: e.target.value})} />
                    </div>
                    <div className="bg-blue-600 p-12 rounded-[3.5rem] text-white text-center shadow-xl relative overflow-hidden">
                       <p className="text-[11px] font-black uppercase tracking-[0.4em] opacity-60 mb-2">Payout Estimate</p>
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

        <nav className="fixed bottom-12 left-10 right-10 h-20 bg-zinc-900/60 backdrop-blur-[50px] rounded-[3rem] border border-white/10 flex justify-around items-center px-4 z-50 shadow-2xl">
          <button onClick={() => setView('dashboard')} className={`flex flex-col items-center gap-1.5 px-12 py-3.5 rounded-[2.2rem] transition-all duration-300 ${view === 'dashboard' ? 'text-black shadow-lg shadow-white/5' : 'text-zinc-500'}`} style={view === 'dashboard' ? { backgroundColor: themeColor } : {}}>
            <LayoutDashboard className={`w-6 h-6 ${view === 'dashboard' ? 'fill-black' : ''}`} />
            <span className="text-[9px] font-black uppercase tracking-widest">Market</span>
          </button>
          <button onClick={() => { setView('calculator'); if(activeMetal === 'usd') setActiveMetal('gold'); }} className={`flex flex-col items-center gap-1.5 px-12 py-3.5 rounded-[2.2rem] transition-all duration-300 ${view === 'calculator' ? 'text-black shadow-lg shadow-white/5' : 'text-zinc-500'}`} style={view === 'calculator' ? { backgroundColor: themeColor } : {}}>
            <Calculator className={`w-6 h-6 ${view === 'calculator' ? 'fill-black' : ''}`} />
            <span className="text-[9px] font-black uppercase tracking-widest">Tools</span>
          </button>
        </nav>

        <footer className="mt-12 px-8 pb-12 text-zinc-600 text-[10px] leading-relaxed border-t border-white/5 pt-10 text-center">
          <p className="font-black uppercase tracking-[0.3em] text-zinc-500 mb-2">GoldView Nepal • Made by @Timeswantstocode</p>
          <p className="opacity-40">Live Gold, Tejabi Gold and Silver prices in Nepal based on market sources. Official NRB Forex rates.</p>
        </footer>

        <Analytics />
        <SpeedInsights />
      </div>
    </HelmetProvider>
  );
}