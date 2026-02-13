import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import { 
  Chart as ChartJS, registerables, Filler, Tooltip, 
  Legend, CategoryScale, LinearScale, PointElement, LineElement 
} from 'chart.js';
import { 
  LayoutDashboard, Calculator, RefreshCcw, TrendingUp, 
  X, Calendar, Zap, Activity, Coins, ArrowRightLeft
} from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';

ChartJS.register(...registerables, Filler, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement);

const DATA_URL = "https://raw.githubusercontent.com/Timeswantstocode/GoldView/main/data.json";
// On Vercel, we use a relative path to avoid CORS issues with NRB
const FOREX_PROXY_URL = "/api/forex"; 

const SUPPORTED_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'GBP', name: 'UK Pound', flag: '🇬🇧' },
  { code: 'AUD', name: 'AUS Dollar', flag: '🇦🇺' },
  { code: 'JPY', name: 'Japan Yen', flag: '🇯🇵' },
  { code: 'KRW', name: 'S. Korean Won', flag: '🇰🇷' },
  { code: 'AED', name: 'UAE Dirham', flag: '🇦🇪' },
  { code: 'CAD', name: 'Canada Dollar', flag: '🇨🇦' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
  { code: 'MYR', name: 'Malay Ringgit', flag: '🇲🇾' },
];

export default function App() {
  const [priceData, setPriceData] = useState([]);
  const [forexData, setForexData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('dashboard');
  const [activeMetal, setActiveMetal] = useState('gold'); // gold, silver, usd
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [timeframe, setTimeframe] = useState(7);
  const [calcMode, setCalcMode] = useState('jewelry'); // jewelry, currency
  const [calc, setCalc] = useState({ tola: '', aana: '', lal: '', making: '', vat: true });
  const [currCalc, setCurrCalc] = useState({ amount: '', activeCurr: 'USD', isNprToForeign: false });
  
  const chartRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const goldRes = await fetch(`${DATA_URL}?t=${Date.now()}`).then(res => res.json());
      setPriceData(Array.isArray(goldRes) ? goldRes : []);
      
      // Fetch Forex via Vercel API Proxy
      const forexRes = await fetch(FOREX_PROXY_URL).then(res => res.json());
      setForexData(forexRes?.data?.payload || []);
      
      setLoading(false);
    } catch (e) {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatRS = useCallback((num) => `रू ${Math.round(num || 0).toLocaleString()}`, []);
  
  const filteredData = useMemo(() => {
    if (activeMetal === 'usd') {
      return forexData.slice(-timeframe).map(d => ({
        date: d.date,
        price: parseFloat(d.rates.find(r => r.currency.iso3 === 'USD')?.buy || 0)
      })).filter(p => p.price > 0);
    }
    return priceData.slice(-timeframe).map(d => ({ date: d.date, price: Number(d[activeMetal]) || 0 }));
  }, [priceData, forexData, timeframe, activeMetal]);

  const current = useMemo(() => priceData[priceData.length - 1] || {}, [priceData]);
  const currentUSD = useMemo(() => forexData[forexData.length - 1]?.rates.find(r => r.currency.iso3 === 'USD')?.buy || 0, [forexData]);
  const yesterdayUSD = useMemo(() => forexData[forexData.length - 2]?.rates.find(r => r.currency.iso3 === 'USD')?.buy || currentUSD, [forexData, currentUSD]);

  const getDayDiff = (type) => {
    let curr, prev;
    if (type === 'usd') { curr = parseFloat(currentUSD); prev = parseFloat(yesterdayUSD); }
    else { curr = current[type] || 0; prev = priceData[priceData.length - 2]?.[type] || curr; }
    const diff = curr - prev;
    return { val: `Rs. ${diff >= 0 ? '+' : ''}${diff.toLocaleString(undefined, {maximumFractionDigits: 2})}`, isUp: diff >= 0 };
  };

  const accentColor = useMemo(() => {
    if (activeMetal === 'gold') return '#D4AF37';
    if (activeMetal === 'silver') return '#94a3b8';
    return '#22c55e'; // Green for USD
  }, [activeMetal]);

  const chartData = useMemo(() => ({
    labels: filteredData.map(d => d.date),
    datasets: [{
      data: filteredData.map(d => d.price),
      borderColor: accentColor,
      borderWidth: 4,
      fill: true,
      tension: 0.4,
      pointRadius: (ctx) => (selectedPoint?.index === ctx.dataIndex ? 10 : 0),
      pointHoverRadius: 10,
      pointBackgroundColor: '#fff',
      pointBorderColor: accentColor,
      pointBorderWidth: 4,
      backgroundColor: (context) => {
        const {ctx, chartArea} = context.chart;
        if (!chartArea) return null;
        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        gradient.addColorStop(0, `${accentColor}44`);
        gradient.addColorStop(1, 'transparent');
        return gradient;
      },
    }]
  }), [filteredData, activeMetal, selectedPoint, accentColor]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    hover: { mode: 'index', intersect: false },
    interaction: { mode: 'index', intersect: false },
    plugins: { 
        legend: false, 
        tooltip: { 
            enabled: true,
            backgroundColor: 'rgba(10, 10, 10, 0.9)',
            callbacks: {
                label: (context) => `रू ${context.raw.toLocaleString()}`,
                title: (items) => new Date(items[0].label).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            }
        } 
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: 'rgba(255, 255, 255, 0.2)', font: { size: 9 } } },
      y: { display: true, position: 'right', grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { display: false } }
    },
    onClick: (e, elements) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        setSelectedPoint({ index, date: filteredData[index].date, price: filteredData[index].price });
      }
    }
  }), [filteredData]);

  if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><RefreshCcw className="w-10 h-10 text-[#D4AF37] animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#020202] text-zinc-100 font-sans pb-40 overflow-x-hidden relative">
      
      {/* Background Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className={`absolute top-[-5%] left-[-5%] w-[60%] h-[50%] blur-[120px] rounded-full transition-all duration-700 ${
          activeMetal === 'gold' ? 'bg-[#D4AF37]/10' : activeMetal === 'silver' ? 'bg-blue-600/5' : 'bg-green-500/10'
        }`} />
      </div>

      <header className="p-8 pt-16 flex justify-between items-end relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_12px_green] animate-pulse" />
            <p className="text-[#D4AF37] text-[10px] font-black uppercase tracking-[0.4em]">Official Market Rates</p>
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-white">GoldView</h1>
        </div>
        <button onClick={fetchData} className="p-4 bg-white/5 rounded-3xl border border-white/10 active:scale-90 transition-all">
          <RefreshCcw className="w-5 h-5 text-[#D4AF37]" />
        </button>
      </header>

      {view === 'dashboard' ? (
        <main className="px-6 space-y-6 relative z-10 animate-in fade-in duration-700">
          
          <div className="space-y-4">
            {[
              { id: 'gold', label: '24K Chhapawal Gold', sub: 'per tola', grad: 'from-[#D4AF37]/25 to-transparent', border: 'border-[#D4AF37]/30', val: current.gold },
              { id: 'silver', label: 'Pure Silver', sub: 'per tola', grad: 'from-zinc-400/15 to-transparent', border: 'border-zinc-500/20', val: current.silver },
              { id: 'usd', label: 'USD to NPR', sub: 'Official Buy Rate', grad: 'from-green-500/20 to-transparent', border: 'border-green-500/30', val: currentUSD }
            ].map((item) => {
              const isActive = activeMetal === item.id;
              const diff = getDayDiff(item.id);
              return (
                <div 
                  key={item.id}
                  onClick={() => { setActiveMetal(item.id); setSelectedPoint(null); }}
                  className={`p-7 rounded-[2.8rem] border-[1.5px] transition-all duration-500 cursor-pointer bg-gradient-to-br backdrop-blur-3xl relative overflow-hidden ${
                    isActive ? `${item.grad} ${item.border} scale-[1.03]` : 'border-white/5 bg-white/5 opacity-40'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-white' : 'text-zinc-500'}`}>{item.label}</span>
                        <p className="text-[9px] font-bold opacity-60 text-zinc-400 mt-0.5">{item.sub}</p>
                    </div>
                    <div className={`px-2.5 py-1 rounded-xl text-[9px] font-black border ${diff.isUp ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                      {diff.val}
                    </div>
                  </div>
                  <div className="flex justify-between items-end">
                    <h2 className="text-4xl font-black tracking-tighter text-white">{item.id === 'usd' ? `रू ${item.val}` : formatRS(item.val)}</h2>
                    {isActive && <TrendingUp className={`w-5 h-5 ${diff.isUp ? 'text-green-500' : 'text-red-500 rotate-180'}`} />}
                  </div>
                </div>
              );
            })}
          </div>

          <section className="bg-white/5 border border-white/10 rounded-[3.5rem] p-9 backdrop-blur-3xl">
            <div className="flex justify-between items-center mb-8 px-1">
              <h3 className="text-xl font-black tracking-tight flex items-center gap-3">
                <Activity className={`w-5 h-5`} style={{color: accentColor}} /> {activeMetal.toUpperCase()} Trend
              </h3>
              <div className="flex bg-white/5 rounded-full p-1 border border-white/10">
                {[7, 30, 90].map(t => (
                  <button key={t} onClick={() => { setTimeframe(t); setSelectedPoint(null); }} className={`px-3 py-1.5 rounded-full text-[9px] font-black transition-all ${timeframe === t ? 'bg-white text-black' : 'text-zinc-500'}`}>
                    {t === 7 ? '7D' : t === 30 ? '1M' : '3M'}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="h-64 relative">
              <Line ref={chartRef} data={chartData} options={chartOptions} />
            </div>

            {selectedPoint && (
              <div className="mt-8 bg-black/80 border-2 rounded-[2.8rem] p-7 flex flex-wrap gap-5 justify-between items-center animate-in slide-in-from-bottom-2 backdrop-blur-3xl shadow-2xl" style={{borderColor: `${accentColor}55`}}>
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-3xl flex items-center justify-center border" style={{backgroundColor: `${accentColor}22`, borderColor: `${accentColor}44`}}>
                    <Calendar className="w-7 h-7" style={{color: accentColor}} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] mb-1" style={{color: accentColor}}>Historical Point</p>
                    <p className="text-lg font-black text-white leading-tight">{new Date(selectedPoint.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="text-3xl font-black text-white tracking-tighter">{formatRS(selectedPoint.price)}</p>
                  </div>
                  <button onClick={() => setSelectedPoint(null)} className="p-3 bg-zinc-800 rounded-full"><X className="w-5 h-5 text-zinc-400" /></button>
                </div>
              </div>
            )}
          </section>
        </main>
      ) : (
        <main className="px-6 relative z-10 animate-in zoom-in-95 duration-500">
          <div className="bg-white/5 border border-white/10 rounded-[4rem] p-10 backdrop-blur-3xl shadow-xl">
            
            <div className="flex bg-black/40 p-1.5 rounded-full mb-8 border border-white/5">
                <button onClick={() => setCalcMode('jewelry')} className={`flex-1 py-3 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${calcMode === 'jewelry' ? 'bg-[#D4AF37] text-black shadow-lg' : 'text-zinc-500'}`}>Jewelry</button>
                <button onClick={() => setCalcMode('currency')} className={`flex-1 py-3 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${calcMode === 'currency' ? 'bg-green-500 text-black shadow-lg' : 'text-zinc-500'}`}>Currency</button>
            </div>

            {calcMode === 'jewelry' ? (
              <div className="animate-in fade-in slide-in-from-top-4">
                <div className="grid grid-cols-3 gap-4 mb-8">
                  {['tola', 'aana', 'lal'].map((unit) => (
                    <div key={unit}>
                      <label className="text-[10px] font-black text-zinc-500 uppercase mb-2 block ml-3">{unit}</label>
                      <input type="number" className="w-full bg-black/60 border-2 border-zinc-800 p-5 rounded-3xl text-center font-black text-2xl outline-none focus:border-[#D4AF37] text-white" value={calc[unit]} onChange={(e) => setCalc({...calc, [unit]: e.target.value})} />
                    </div>
                  ))}
                </div>
                <input type="number" placeholder="Making Charges (Rs)" className="w-full bg-black/60 border-2 border-zinc-800 p-6 rounded-3xl font-black text-lg outline-none focus:border-[#D4AF37] text-white mb-6" value={calc.making} onChange={(e) => setCalc({...calc, making: e.target.value})} />
                <div onClick={() => setCalc({...calc, vat: !calc.vat})} className="flex justify-between items-center p-6 bg-white/5 rounded-[2.2rem] cursor-pointer mb-10">
                    <span className="font-bold text-zinc-300">13% Govt VAT</span>
                    <div className={`w-12 h-6 rounded-full relative transition-all ${calc.vat ? 'bg-[#D4AF37]' : 'bg-zinc-700'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${calc.vat ? 'right-1' : 'left-1'}`} /></div>
                </div>
                <div className="bg-gradient-to-br from-[#D4AF37] to-yellow-700 p-10 rounded-[3.5rem] text-black text-center shadow-xl">
                  <p className="text-[11px] font-black uppercase tracking-[0.4em] mb-2 opacity-60">Estimated Total</p>
                  <h3 className="text-4xl font-black tracking-tighter">{formatRS(( ( (Number(calc.tola)||0) + (Number(calc.aana)||0)/16 + (Number(calc.lal)||0)/192 ) * (activeMetal === 'usd' ? current.gold : current[activeMetal]) + (Number(calc.making)||0) ) * (calc.vat ? 1.13 : 1))}</h3>
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4">
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-6 mb-4">
                  {SUPPORTED_CURRENCIES.map(c => (
                    <button key={c.code} onClick={() => setCurrCalc({...currCalc, activeCurr: c.code})} className={`px-5 py-3 rounded-2xl border flex items-center gap-2 whitespace-nowrap transition-all ${currCalc.activeCurr === c.code ? 'bg-green-500 border-green-400 text-black' : 'bg-white/5 border-white/10 text-zinc-400'}`}>
                      <span className="text-lg">{c.flag}</span><span className="text-[10px] font-black">{c.code}</span>
                    </button>
                  ))}
                </div>
                <div className="relative mb-8">
                  <label className="text-[10px] font-black text-zinc-500 uppercase mb-2 block ml-4">{currCalc.isNprToForeign ? 'Amount in NPR' : `Amount in ${currCalc.activeCurr}`}</label>
                  <input type="number" placeholder="0.00" className="w-full bg-black/60 border-2 border-zinc-800 p-8 rounded-[2.5rem] font-black text-3xl outline-none focus:border-green-500 text-white" value={currCalc.amount} onChange={(e) => setCurrCalc({...currCalc, amount: e.target.value})} />
                  <button onClick={() => setCurrCalc({...currCalc, isNprToForeign: !currCalc.isNprToForeign})} className="absolute right-6 top-[55px] p-4 bg-green-500 rounded-2xl shadow-lg active:scale-90 transition-all text-black"><ArrowRightLeft className="w-5 h-5" /></button>
                </div>
                <div className="bg-green-500 p-10 rounded-[3.5rem] text-black text-center shadow-xl">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 opacity-70">{currCalc.isNprToForeign ? `Estimated ${currCalc.activeCurr}` : 'Estimated NPR Equivalent'}</p>
                  <h3 className="text-4xl font-black tracking-tighter">
                    {(() => {
                        const latest = forexData[forexData.length - 1];
                        const rateObj = latest?.rates.find(r => r.currency.iso3 === currCalc.activeCurr);
                        if (!rateObj || !currCalc.amount) return '0.00';
                        const rate = parseFloat(rateObj.buy) / parseFloat(rateObj.currency.unit);
                        return currCalc.isNprToForeign ? (currCalc.amount / rate).toFixed(2) : `रू ${(currCalc.amount * rate).toLocaleString(undefined, {maximumFractionDigits: 2})}`;
                    })()}
                  </h3>
                </div>
              </div>
            )}
          </div>
        </main>
      )}

      <nav className="fixed bottom-12 left-10 right-10 h-20 bg-zinc-900/60 backdrop-blur-[50px] rounded-[3rem] border border-white/10 flex justify-around items-center px-4 z-50 shadow-2xl">
        <button onClick={() => setView('dashboard')} className={`flex flex-col items-center gap-1.5 px-12 py-3.5 rounded-[2.2rem] transition-all duration-500 ${view === 'dashboard' ? 'bg-white text-black' : 'text-zinc-500'}`}>
          <LayoutDashboard className="w-6 h-6" /><span className="text-[9px] font-black uppercase tracking-widest">Market</span>
        </button>
        <button onClick={() => setView('calculator')} className={`flex flex-col items-center gap-1.5 px-12 py-3.5 rounded-[2.2rem] transition-all duration-500 ${view === 'calculator' ? 'bg-white text-black' : 'text-zinc-500'}`}>
          <Calculator className="w-6 h-6" /><span className="text-[9px] font-black uppercase tracking-widest">Calculator</span>
        </button>
      </nav>
      <Analytics />
    </div>
  );
}