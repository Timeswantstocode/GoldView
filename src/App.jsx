import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import { 
  Chart as ChartJS, registerables, Filler, Tooltip, 
  Legend, CategoryScale, LinearScale, PointElement, LineElement 
} from 'chart.js';
import { 
  LayoutDashboard, Calculator, RefreshCcw, TrendingUp, 
  X, Calendar, Zap, Activity, Coins, ArrowRightLeft, Globe
} from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';

ChartJS.register(...registerables, Filler, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement);

const DATA_URL = "https://raw.githubusercontent.com/Timeswantstocode/GoldView/main/data.json";
const FOREX_PROXY = "/api/forex";

export default function App() {
  // 1. STATE & INSTANT CACHE BOOT
  const [priceData, setPriceData] = useState(() => {
    const cached = localStorage.getItem('gv_metal_v4');
    return cached ? JSON.parse(cached) : [];
  });
  const [forexHistory, setForexHistory] = useState(() => {
    const cached = localStorage.getItem('gv_forex_v4');
    return cached ? JSON.parse(cached) : [];
  });
  
  const [loading, setLoading] = useState(priceData.length === 0);
  const [forexLoading, setForexLoading] = useState(true);
  
  const [view, setView] = useState('dashboard');
  const [calcMode, setCalcMode] = useState('jewelry'); 
  const [activeMetal, setActiveMetal] = useState('gold'); 
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [timeframe, setTimeframe] = useState(7);
  
  const [calc, setCalc] = useState({ tola: '', aana: '', lal: '', making: '', vat: true });
  const [currCalc, setCurrCalc] = useState({ amount: '', source: 'USD', isSwapped: false });

  const chartRef = useRef(null);

  const currencyList = [
    { code: 'USD', flag: '🇺🇸' }, { code: 'GBP', flag: '🇬🇧' },
    { code: 'AUD', flag: '🇦🇺' }, { code: 'JPY', flag: '🇯🇵' },
    { code: 'KRW', flag: '🇰🇷' }, { code: 'AED', flag: '🇦🇪' },
    { code: 'EUR', flag: '🇪🇺' }
  ];

  // 2. DATA FETCHING
  useEffect(() => {
    fetch(`${DATA_URL}?t=${Date.now()}`)
      .then(res => res.json())
      .then(json => {
        setPriceData(json);
        localStorage.setItem('gv_metal_v4', JSON.stringify(json));
        setLoading(false);
      }).catch(() => setLoading(false));

    fetch(FOREX_PROXY)
      .then(res => res.json())
      .then(json => {
        const transformed = json.data.payload.map(day => ({
          date: day.date,
          usdRate: parseFloat(day.rates.find(r => r.currency.iso3 === 'USD')?.buy || 0),
          rates: day.rates
        })).sort((a, b) => new Date(a.date) - new Date(b.date));
        
        setForexHistory(transformed);
        localStorage.setItem('gv_forex_v4', JSON.stringify(transformed));
        setForexLoading(false);
      }).catch(() => setForexLoading(false));
  }, []);

  const formatRS = useCallback((num) => `रू ${Math.round(num || 0).toLocaleString()}`, []);
  const accentColor = activeMetal === 'gold' ? '#D4AF37' : activeMetal === 'silver' ? '#94a3b8' : '#22c55e';

  const activeDataList = useMemo(() => activeMetal === 'usd' ? forexHistory : priceData, [activeMetal, forexHistory, priceData]);
  const filteredData = useMemo(() => activeDataList.slice(-timeframe), [activeDataList, timeframe]);
  
  const getDayDiff = (id) => {
    const source = id === 'usd' ? forexHistory : priceData;
    if (source.length < 2) return { val: 'Rs. 0', isUp: true };
    const curr = id === 'usd' ? source[source.length - 1].usdRate : source[source.length - 1][id];
    const prev = id === 'usd' ? source[source.length - 2].usdRate : source[source.length - 2][id];
    const diff = curr - prev;
    return { 
        val: `Rs. ${diff >= 0 ? '+' : ''}${diff.toLocaleString(undefined, {minimumFractionDigits: id === 'usd' ? 2 : 0})}`, 
        isUp: diff >= 0 
    };
  };

  const currentStats = useMemo(() => {
    const values = filteredData.map(d => activeMetal === 'usd' ? d.usdRate : Number(d[activeMetal]) || 0);
    if (values.length === 0) return { low: 0, high: 0, change: "0.00" };
    return { 
        low: Math.min(...values), 
        high: Math.max(...values), 
        change: values.length > 1 ? (((values[values.length-1] - values[0]) / values[0]) * 100).toFixed(2) : "0.00" 
    };
  }, [filteredData, activeMetal]);

  // 3. CHART SETUP
  const chartData = useMemo(() => ({
    labels: filteredData.map(d => {
        const date = new Date(d.date.replace(' ', 'T'));
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
    datasets: [{
      data: filteredData.map(d => activeMetal === 'usd' ? d.usdRate : Number(d[activeMetal]) || 0),
      borderColor: accentColor,
      borderWidth: 4,
      fill: true,
      tension: 0.4,
      pointRadius: (ctx) => (selectedPoint?.index === ctx.dataIndex ? 10 : 0),
      pointHoverRadius: 12,
      pointBackgroundColor: '#fff',
      pointBorderColor: accentColor,
      pointBorderWidth: 4,
      backgroundColor: (context) => {
        const {ctx, chartArea} = context.chart;
        if (!chartArea) return null;
        const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        g.addColorStop(0, `${accentColor}40`);
        g.addColorStop(1, 'transparent');
        return g;
      },
    }]
  }), [filteredData, activeMetal, selectedPoint, accentColor]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false }, 
    plugins: { 
        legend: false, 
        tooltip: { 
            enabled: true,
            backgroundColor: 'rgba(10, 10, 10, 0.9)',
            callbacks: {
                label: (ctx) => `रू ${ctx.raw.toLocaleString(undefined, {minimumFractionDigits: activeMetal === 'usd' ? 2 : 0})}`,
                title: (items) => items[0].label
            }
        } 
    },
    scales: {
      x: {
        display: true,
        grid: { display: true, color: 'rgba(255, 255, 255, 0.05)', borderDash: [6, 6], drawTicks: false },
        ticks: { color: 'rgba(255, 255, 255, 0.3)', font: { size: 9, weight: '700' }, padding: 10, maxRotation: 0, maxTicksLimit: timeframe === 7 ? 7 : 8 }
      },
      y: { 
        display: true, position: 'right', 
        grid: { display: true, color: 'rgba(255, 255, 255, 0.08)', borderDash: [5, 5], drawBorder: false, drawTicks: false }, 
        ticks: { display: false } 
      }
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
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <RefreshCcw className="w-10 h-10 text-[#D4AF37] animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020202] text-zinc-100 font-sans pb-40 overflow-x-hidden relative">
      <header className="p-8 pt-16 flex justify-between items-end relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full shadow-lg animate-pulse" style={{ backgroundColor: accentColor }}></div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em]" style={{ color: accentColor }}>Market Update</p>
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-white">GoldView</h1>
        </div>
        <button onClick={() => window.location.reload()} className="p-4 bg-white/5 backdrop-blur-3xl rounded-3xl border border-white/10">
          <RefreshCcw className={`w-5 h-5 ${forexLoading ? 'animate-spin' : ''}`} style={{ color: accentColor }} />
        </button>
      </header>

      {/* DASHBOARD VIEW */}
      <div style={{ display: view === 'dashboard' ? 'block' : 'none' }}>
        <main className="px-6 space-y-6 relative z-10 animate-in fade-in duration-700">
          <div className="space-y-4">
            {/* GOLD CARD */}
            <div onClick={() => { setActiveMetal('gold'); setSelectedPoint(null); }}
              className={`p-7 rounded-[2.8rem] border-[1.5px] transition-all duration-300 cursor-pointer bg-gradient-to-br backdrop-blur-3xl relative overflow-hidden ${
                activeMetal === 'gold' ? 'from-[#D4AF37]/50 to-[#D4AF37]/15 border-[#D4AF37]/40 scale-[1.03]' : 'border-white/5 bg-white/5 opacity-40'
              }`}>
              <div className="flex justify-between items-start mb-2 text-[10px] font-black uppercase tracking-widest">
                <div>24K Chhapawal Gold<p className="text-[8px] opacity-50 mt-0.5">per tola</p></div>
                <div className={`px-2.5 py-1 rounded-xl border ${getDayDiff('gold').isUp ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>{getDayDiff('gold').val}</div>
              </div>
              <div className="flex justify-between items-end">
                <h2 className="text-4xl font-black tracking-tighter">{formatRS(priceData[priceData.length-1]?.gold)}</h2>
                {activeMetal === 'gold' && <TrendingUp className={`w-5 h-5 ${getDayDiff('gold').isUp ? 'text-green-500' : 'text-red-500 rotate-180'}`} />}
              </div>
            </div>

            {/* SILVER CARD */}
            <div onClick={() => { setActiveMetal('silver'); setSelectedPoint(null); }}
              className={`p-7 rounded-[2.8rem] border-[1.5px] transition-all duration-300 cursor-pointer bg-gradient-to-br backdrop-blur-3xl relative overflow-hidden ${
                activeMetal === 'silver' ? 'from-zinc-400/40 to-zinc-600/15 border-zinc-500/30 scale-[1.03]' : 'border-white/5 bg-white/5 opacity-40'
              }`}>
              <div className="flex justify-between items-start mb-2 text-[10px] font-black uppercase tracking-widest">
                <div>Pure Silver<p className="text-[8px] opacity-50 mt-0.5">per tola</p></div>
                <div className={`px-2.5 py-1 rounded-xl border ${getDayDiff('silver').isUp ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>{getDayDiff('silver').val}</div>
              </div>
              <div className="flex justify-between items-end">
                <h2 className="text-4xl font-black tracking-tighter">{formatRS(priceData[priceData.length-1]?.silver)}</h2>
                {activeMetal === 'silver' && <TrendingUp className={`w-5 h-5 ${getDayDiff('silver').isUp ? 'text-green-500' : 'text-red-500 rotate-180'}`} />}
              </div>
            </div>

            {/* USD CARD */}
            <div onClick={() => { setActiveMetal('usd'); setSelectedPoint(null); }}
              className={`p-7 rounded-[2.8rem] border-[1.5px] transition-all duration-300 cursor-pointer bg-gradient-to-br backdrop-blur-3xl relative overflow-hidden ${
                activeMetal === 'usd' ? 'from-[#22c55e]/45 to-[#22c55e]/15 border-[#22c55e]/40 scale-[1.03]' : 'border-white/5 bg-white/5 opacity-40'
              }`}>
              <div className="flex justify-between items-start mb-2 text-[10px] font-black uppercase tracking-widest">
                <div>USD to NPR<p className="text-[8px] opacity-50 mt-0.5">Source: NRB Official</p></div>
                {forexLoading ? <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10"><RefreshCcw className="w-3 h-3 text-green-500 animate-spin" /><span className="text-[8px] text-zinc-500 uppercase">Updating</span></div> : 
                <div className={`px-2.5 py-1 rounded-xl border ${getDayDiff('usd').isUp ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>{getDayDiff('usd').val}</div>}
              </div>
              <div className="flex justify-between items-end">
                <h2 className="text-4xl font-black tracking-tighter">{forexHistory.length > 0 ? `रू ${forexHistory[forexHistory.length-1].usdRate.toFixed(2)}` : "..."}</h2>
                {activeMetal === 'usd' && <TrendingUp className={`w-5 h-5 ${getDayDiff('usd').isUp ? 'text-green-500' : 'text-red-500 rotate-180'}`} />}
              </div>
            </div>
          </div>

          <section className="bg-white/5 border border-white/10 rounded-[3.5rem] p-9 backdrop-blur-3xl shadow-xl">
            <div className="flex justify-between items-center mb-8 px-1">
              <h3 className="text-xl font-black tracking-tight flex items-center gap-3"><Activity className="w-5 h-5" style={{ color: accentColor }} /> Price Trend</h3>
              <div className="flex bg-white/5 rounded-full p-1 border border-white/10">
                {[7, 30, 90].map((t) => (
                  <button key={t} onClick={() => { setTimeframe(t); setSelectedPoint(null); }}
                    className={`px-3 py-1.5 rounded-full text-[9px] font-black transition-all ${timeframe === t ? `text-black` : 'text-zinc-500'}`}
                    style={timeframe === t ? { backgroundColor: accentColor } : {}}>{t === 7 ? '7D' : t === 30 ? '1M' : '3M'}</button>
                ))}
              </div>
            </div>
            
            <div className="h-64 relative w-full"><Line ref={chartRef} data={chartData} options={chartOptions} redraw={false} /></div>

            <div className="flex justify-between mt-10 pt-8 border-t border-white/10 w-full text-center">
              <div><p className="text-[9px] font-black text-zinc-600 uppercase mb-2">Low</p><p className="text-base font-black text-blue-400">{activeMetal === 'usd' ? currentStats.low.toFixed(2) : formatRS(currentStats.low)}</p></div>
              <div className="px-8 border-x border-white/10"><p className="text-[9px] font-black text-zinc-600 uppercase mb-2">Change</p><p className={`text-base font-black ${Number(currentStats.change) >= 0 ? 'text-green-500' : 'text-red-500'}`}>{currentStats.change}%</p></div>
              <div><p className="text-[9px] font-black text-zinc-600 uppercase mb-2">High</p><p className="text-base font-black text-green-500">{activeMetal === 'usd' ? currentStats.high.toFixed(2) : formatRS(currentStats.high)}</p></div>
            </div>

            {selectedPoint && (
              <div className="mt-8 bg-black/80 border-2 rounded-[2.8rem] p-7 flex flex-wrap gap-5 justify-between items-center animate-in slide-in-from-bottom-2 shadow-2xl w-full" style={{ borderColor: `${accentColor}80` }}>
                <div className="flex items-center gap-5 flex-1 min-w-[220px]">
                  <div className="w-14 h-14 rounded-3xl flex items-center justify-center border shrink-0" style={{ backgroundColor: `${accentColor}20`, borderColor: `${accentColor}30` }}><Calendar className="w-7 h-7" style={{ color: accentColor }} /></div>
                  <div><p className="text-[9px] font-black uppercase tracking-[0.3em] mb-1" style={{ color: accentColor }}>Historical Point</p>
                  <p className="text-lg font-black text-white">{new Date(selectedPoint.date.replace(' ', 'T')).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p></div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-right"><p className="text-[9px] font-black text-zinc-600 uppercase mb-1">Rate</p><p className="text-3xl font-black text-white">{activeMetal === 'usd' ? `रू ${selectedPoint.price.toFixed(2)}` : formatRS(selectedPoint.price)}</p></div>
                  <button onClick={() => setSelectedPoint(null)} className="p-3 bg-zinc-800 rounded-full"><X className="w-5 h-5 text-zinc-400" /></button>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>

      {/* CALCULATOR VIEW */}
      <div style={{ display: view === 'calculator' ? 'block' : 'none' }}>
        <main className="px-6 relative z-10 animate-in zoom-in-95 duration-500">
          <div className="bg-white/5 border border-white/10 rounded-[4rem] p-8 backdrop-blur-3xl shadow-xl">
            <div className="flex p-1 bg-black/40 rounded-3xl mb-10 border border-white/5">
                <button onClick={() => setCalcMode('jewelry')} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase transition-all ${calcMode === 'jewelry' ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20' : 'text-zinc-500'}`}>Jewelry</button>
                <button onClick={() => setCalcMode('currency')} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase transition-all ${calcMode === 'currency' ? 'bg-[#22c55e] text-black shadow-lg shadow-[#22c55e]/20' : 'text-zinc-500'}`}>Currency</button>
            </div>
            {calcMode === 'jewelry' ? (
              <div className="space-y-6">
                <div className="flex p-1 bg-white/5 rounded-2xl mb-8 border border-white/5 w-fit mx-auto">
                    {['gold', 'silver'].map(metal => (
                        <button key={metal} onClick={() => setActiveMetal(metal)} 
                          style={{ backgroundColor: activeMetal === metal ? accentColor : 'transparent' }}
                          className={`px-8 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${activeMetal === metal ? 'text-black shadow-md' : 'text-zinc-500'}`}>
                          {metal}
                        </button>
                    ))}
                </div>
                <div className="mb-8 p-6 rounded-[2.2rem] border-2 flex items-center justify-between transition-all"
                     style={{ borderColor: `${accentColor}80`, backgroundColor: `${accentColor}10` }}>
                  <div className="flex items-center gap-4">
                    <Coins className="w-8 h-8" style={{ color: accentColor }} />
                    <p className="text-xl font-black uppercase text-white">{activeMetal === 'gold' ? '24K Chhapawal' : 'Pure Silver'}</p>
                  </div>
                  <div className="text-right text-[10px] font-black text-zinc-500">{formatRS(priceData[priceData.length-1]?.[activeMetal === 'usd' ? 'gold' : activeMetal])}</div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {['tola', 'aana', 'lal'].map((unit) => (
                    <div key={unit}>
                      <label className="text-[10px] font-black text-zinc-500 uppercase mb-2 block ml-3 tracking-[0.2em]">{unit}</label>
                      <input type="number" 
                        style={{ caretColor: accentColor }}
                        className={`w-full bg-black/60 border-2 border-zinc-800 p-5 rounded-3xl text-center font-black text-2xl text-white outline-none transition-all focus:border-[${accentColor}]`} 
                        onFocus={(e) => e.target.style.borderColor = accentColor}
                        onBlur={(e) => e.target.style.borderColor = '#27272a'}
                        value={calc[unit]} onChange={(e) => setCalc({...calc, [unit]: e.target.value})} 
                      />
                    </div>
                  ))}
                </div>
                <input type="number" placeholder="Making Charges (Rs)" 
                  className="w-full bg-black/60 border-2 border-zinc-800 p-6 rounded-3xl font-black text-lg outline-none text-white transition-all" 
                  onFocus={(e) => e.target.style.borderColor = accentColor}
                  onBlur={(e) => e.target.style.borderColor = '#27272a'}
                  value={calc.making} onChange={(e) => setCalc({...calc, making: e.target.value})} 
                />
                <div onClick={() => setCalc({...calc, vat: !calc.vat})} className="flex justify-between items-center p-6 bg-white/5 rounded-[2.2rem] border border-white/5 cursor-pointer active:scale-[0.98] transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all"
                           style={{ borderColor: calc.vat ? accentColor : '#27272a', backgroundColor: calc.vat ? accentColor : 'transparent' }}>
                        {calc.vat && <Zap className="w-3.5 h-3.5 text-black fill-black" />}
                      </div>
                      <span className="font-bold text-zinc-300">13% Govt VAT</span>
                    </div>
                </div>
                <div className="p-12 rounded-[3.5rem] text-black text-center shadow-xl transition-all"
                     style={{ background: `linear-gradient(135deg, ${accentColor}, ${activeMetal === 'gold' ? '#b8860b' : '#4b5563'})` }}>
                   <h3 className="text-5xl font-black tracking-tighter">{formatRS(( ( (Number(calc.tola)||0) + (Number(calc.aana)||0)/16 + (Number(calc.lal)||0)/192 ) * (priceData[priceData.length-1]?.[activeMetal === 'usd' ? 'gold' : activeMetal]) + (Number(calc.making)||0) ) * (calc.vat ? 1.13 : 1))}</h3>
                </div>
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-4 bg-black/60 p-6 rounded-[2.5rem] border-2 border-zinc-800"><Globe className="w-8 h-8 text-green-500" /><div className="flex-1"><p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Source Currency</p>
                  <select className="bg-transparent font-black text-xl text-white outline-none w-full" value={currCalc.source} onChange={(e) => setCurrCalc({...currCalc, source: e.target.value})}>{['USD 🇺🇸', 'GBP 🇬🇧', 'AUD 🇦🇺', 'JPY 🇯🇵', 'KRW 🇰🇷', 'AED 🇦🇪', 'EUR 🇪🇺'].map(c => <option key={c} value={c.split(' ')[0]} className="bg-zinc-900">{c}</option>)}</select></div>
                  <button onClick={() => setCurrCalc({...currCalc, isSwapped: !currCalc.isSwapped})} className="p-4 bg-green-500/20 rounded-2xl active:rotate-180 transition-all duration-500"><ArrowRightLeft className="w-5 h-5 text-green-500" /></button>
                  <div className="flex-1 text-right"><p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Target</p><p className="font-black text-xl text-white">🇳🇵 NPR</p></div></div>
                  <input type="number" placeholder="Enter Amount" className="w-full bg-black/60 border-2 border-zinc-800 p-8 rounded-[2.5rem] font-black text-4xl outline-none focus:border-green-500 text-white text-center" value={currCalc.amount} onChange={(e) => setCurrCalc({...currCalc, amount: e.target.value})} />
                  <div className="bg-gradient-to-br from-green-500 to-green-700 p-12 rounded-[3.5rem] text-black text-center shadow-xl"><p className="text-[11px] font-black uppercase tracking-[0.4em] mb-2 opacity-60">{currCalc.isSwapped ? `NPR to ${currCalc.source}` : `${currCalc.source} to NPR (Receiver Gets)`}</p><h3 className="text-5xl font-black tracking-tighter">{(() => {
                        const latest = forexHistory[forexHistory.length - 1]?.rates || [];
                        const rate = parseFloat(latest.find(r => r.currency.iso3 === currCalc.source)?.buy || 133);
                        const res = currCalc.isSwapped ? (Number(currCalc.amount) / rate) : (Number(currCalc.amount) * rate);
                        return currCalc.isSwapped ? res.toFixed(2) : formatRS(res);
                      })()}</h3><p className="text-[8px] font-bold mt-4 opacity-50 uppercase tracking-widest">NRB Official Buying Rate</p></div>
              </div>
            )}
          </div>
        </main>
      </div>

      <nav className="fixed bottom-12 left-10 right-10 h-20 bg-zinc-900/60 backdrop-blur-[50px] rounded-[3rem] border border-white/10 flex justify-around items-center px-4 z-50 shadow-2xl">
        <button onClick={() => setView('dashboard')} className={`flex flex-col items-center gap-1.5 px-12 py-3.5 rounded-[2.2rem] transition-all duration-300 ${view === 'dashboard' ? 'text-black' : 'text-zinc-500'}`} style={view === 'dashboard' ? { backgroundColor: accentColor, boxShadow: `0 0 40px ${accentColor}40` } : {}}><LayoutDashboard className={`w-6 h-6 ${view === 'dashboard' ? 'fill-black' : ''}`} /><span className="text-[9px] font-black uppercase tracking-widest">Market</span></button>
        <button onClick={() => { setView('calculator'); if(activeMetal === 'usd') setActiveMetal('gold'); }} className={`flex flex-col items-center gap-1.5 px-12 py-3.5 rounded-[2.2rem] transition-all duration-300 ${view === 'calculator' ? 'text-black' : 'text-zinc-500'}`} style={view === 'calculator' ? { backgroundColor: accentColor, boxShadow: `0 0 40px ${accentColor}40` } : {}}><Calculator className={`w-6 h-6 ${view === 'calculator' ? 'fill-black' : ''}`} /><span className="text-[9px] font-black uppercase tracking-widest">Calculator</span></button>
      </nav>
      <Analytics />
    </div>
  );
}