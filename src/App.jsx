import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import { 
  Chart as ChartJS, registerables, Filler, Tooltip, 
  Legend, CategoryScale, LinearScale, PointElement, LineElement 
} from 'chart.js';
import { 
  LayoutDashboard, Calculator, RefreshCcw, TrendingUp, 
  X, Calendar, Zap, Activity, Coins, ArrowRightLeft, Globe, ChevronRight
} from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';

ChartJS.register(...registerables, Filler, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement);

const DATA_URL = "https://raw.githubusercontent.com/Timeswantstocode/GoldView/main/data.json";
const FOREX_PROXY = "/api/forex";

export default function App() {
  const [priceData, setPriceData] = useState([]);
  const [forexHistory, setForexHistory] = useState([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [metalRes, forexRes] = await Promise.all([
          fetch(`${DATA_URL}?t=${Date.now()}`).then(res => res.json()),
          fetch(FOREX_PROXY).then(res => res.json())
        ]);

        setPriceData(Array.isArray(metalRes) ? metalRes : []);
        const transformedForex = forexRes.data.payload.map(day => ({
          date: day.date,
          usdRate: parseFloat(day.rates.find(r => r.currency.iso3 === 'USD')?.buy || 0),
          rates: day.rates
        })).reverse();
        
        setForexHistory(transformedForex);
        setLoading(false);
      } catch (err) {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatRS = useCallback((num) => `रू ${Math.round(num || 0).toLocaleString()}`, []);
  
  const activeDataList = useMemo(() => activeMetal === 'usd' ? forexHistory : priceData, [activeMetal, forexHistory, priceData]);
  const filteredData = useMemo(() => activeDataList.slice(-timeframe), [activeDataList, timeframe]);
  
  const current = useMemo(() => {
    if (activeMetal === 'usd') return { usd: forexHistory[forexHistory.length - 1]?.usdRate || 0 };
    return priceData[priceData.length - 1] || {};
  }, [priceData, forexHistory, activeMetal]);

  const getDayDiff = (id) => {
    const currVal = id === 'usd' ? (forexHistory[forexHistory.length - 1]?.usdRate || 0) : (priceData[priceData.length - 1]?.[id] || 0);
    const prevVal = id === 'usd' ? (forexHistory[forexHistory.length - 2]?.usdRate || 0) : (priceData[priceData.length - 2]?.[id] || 0);
    const diff = currVal - prevVal;
    return { val: `Rs. ${diff >= 0 ? '+' : ''}${diff.toLocaleString(undefined, {minimumFractionDigits: id === 'usd' ? 2 : 0})}`, isUp: diff >= 0 };
  };

  const currentStats = useMemo(() => {
    const values = filteredData.map(d => activeMetal === 'usd' ? d.usdRate : Number(d[activeMetal]) || 0);
    if (values.length === 0) return { low: 0, high: 0, change: "0.00" };
    const low = Math.min(...values);
    const high = Math.max(...values);
    const change = values.length > 1 ? (((values[values.length-1] - values[0]) / values[0]) * 100).toFixed(2) : "0.00";
    return { low, high, change };
  }, [filteredData, activeMetal]);

  const accentColor = useMemo(() => {
    if (activeMetal === 'gold') return '#D4AF37';
    if (activeMetal === 'silver') return '#94a3b8';
    return '#22c55e';
  }, [activeMetal]);

  const chartData = useMemo(() => ({
    labels: filteredData.map(d => d.date),
    datasets: [{
      label: activeMetal.toUpperCase(),
      data: filteredData.map(d => activeMetal === 'usd' ? d.usdRate : Number(d[activeMetal]) || 0),
      borderColor: accentColor,
      borderWidth: 4,
      fill: true,
      tension: 0.4,
      pointRadius: (ctx) => (selectedPoint?.index === ctx.dataIndex ? 10 : 0),
      backgroundColor: (context) => {
        const {ctx, chartArea} = context.chart;
        if (!chartArea) return null;
        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        gradient.addColorStop(0, `${accentColor}40`);
        gradient.addColorStop(1, 'transparent');
        return gradient;
      },
    }]
  }), [filteredData, activeMetal, selectedPoint, accentColor]);

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
            <div className="w-2 h-2 rounded-full shadow-[0_0_12px_rgba(255,255,255,0.4)] animate-pulse" style={{ backgroundColor: accentColor }}></div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em]" style={{ color: accentColor }}>Market Update</p>
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-white">GoldView</h1>
        </div>
        <button onClick={() => window.location.reload()} className="p-4 bg-white/5 backdrop-blur-3xl rounded-3xl border border-white/10 active:scale-90 transition-all">
          <RefreshCcw className="w-5 h-5" style={{ color: accentColor }} />
        </button>
      </header>

      {view === 'dashboard' ? (
        <main className="px-6 space-y-6 relative z-10 animate-in fade-in duration-700">
          <div className="space-y-4">
            {[
              { id: 'gold', label: '24K Chhapawal Gold', sub: 'per tola', grad: 'from-[#D4AF37]/50 to-[#D4AF37]/15', border: 'border-[#D4AF37]/40' },
              { id: 'silver', label: 'Pure Silver', sub: 'per tola', grad: 'from-zinc-400/40 to-zinc-600/15', border: 'border-zinc-500/30' },
              { id: 'usd', label: 'USD to NPR', sub: 'Source: NRB Official', grad: 'from-[#22c55e]/45 to-[#22c55e]/15', border: 'border-[#22c55e]/40' }
            ].map((item) => {
              const isActive = activeMetal === item.id;
              const diff = getDayDiff(item.id);
              const val = item.id === 'usd' ? (forexHistory[forexHistory.length-1]?.usdRate || 0) : (priceData[priceData.length-1]?.[item.id] || 0);
              return (
                <div key={item.id} onClick={() => { setActiveMetal(item.id); setSelectedPoint(null); }}
                  className={`p-7 rounded-[2.8rem] border-[1.5px] transition-all duration-500 cursor-pointer bg-gradient-to-br backdrop-blur-3xl relative overflow-hidden ${
                    isActive ? `${item.grad} ${item.border} scale-[1.03]` : 'border-white/5 bg-white/5 opacity-40'
                  }`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-white' : 'text-zinc-500'}`}>{item.label}</span>
                        <p className="text-[8px] font-bold opacity-50 uppercase mt-0.5 tracking-tighter">{item.sub}</p>
                    </div>
                    <div className={`px-2.5 py-1 rounded-xl text-[9px] font-black border backdrop-blur-md ${diff.isUp ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                      {diff.val}
                    </div>
                  </div>
                  <div className="flex justify-between items-end">
                    <h2 className={`text-4xl font-black tracking-tighter ${isActive ? 'text-white' : 'text-zinc-400'}`}>
                        {item.id === 'usd' ? `रू ${val.toFixed(2)}` : formatRS(val)}
                    </h2>
                    {isActive && <TrendingUp className={`w-5 h-5 ${diff.isUp ? 'text-green-500' : 'text-red-500 rotate-180'}`} />}
                  </div>
                </div>
              );
            })}
          </div>

          <section className="bg-white/5 border border-white/10 rounded-[3.5rem] p-9 backdrop-blur-3xl shadow-xl">
            <div className="flex justify-between items-center mb-8 px-1">
              <h3 className="text-xl font-black tracking-tight flex items-center gap-3">
                <Activity className="w-5 h-5" style={{ color: accentColor }} /> Price Trend
              </h3>
              <div className="flex bg-white/5 rounded-full p-1 border border-white/10">
                {[7, 30, 90].map((t) => (
                  <button key={t} onClick={() => { setTimeframe(t); setSelectedPoint(null); }}
                    className={`px-3 py-1.5 rounded-full text-[9px] font-black transition-all ${timeframe === t ? `text-black shadow-lg` : 'text-zinc-500'}`}
                    style={timeframe === t ? { backgroundColor: accentColor } : {}}>
                    {t === 7 ? '7D' : t === 30 ? '1M' : '3M'}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-64 relative">
              <Line ref={chartRef} data={chartData} options={{
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: false },
                scales: { x: { display: false }, y: { display: false } },
                onClick: (e, elements) => {
                    if (elements.length > 0) {
                      const index = elements[0].index;
                      const point = filteredData[index];
                      setSelectedPoint({ index, date: point.date, price: activeMetal === 'usd' ? point.usdRate : point[activeMetal] });
                    }
                }
              }} />
            </div>
            <div className="flex justify-between mt-10 pt-8 border-t border-white/10">
              <div className="text-center">
                <p className="text-[9px] font-black text-zinc-600 uppercase mb-2 tracking-widest">Low</p>
                <p className="text-base font-black text-blue-400">{activeMetal === 'usd' ? currentStats.low.toFixed(2) : formatRS(currentStats.low)}</p>
              </div>
              <div className="text-center px-8 border-x border-white/10">
                <p className="text-[9px] font-black text-zinc-600 uppercase mb-2 tracking-widest">Change</p>
                <p className={`text-base font-black ${Number(currentStats.change) >= 0 ? 'text-green-500' : 'text-red-500'}`}>{currentStats.change}%</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] font-black text-zinc-600 uppercase mb-2 tracking-widest">High</p>
                <p className="text-base font-black text-green-500">{activeMetal === 'usd' ? currentStats.high.toFixed(2) : formatRS(currentStats.high)}</p>
              </div>
            </div>
          </section>
        </main>
      ) : (
        <main className="px-6 relative z-10 animate-in zoom-in-95 duration-500">
          <div className="bg-white/5 border border-white/10 rounded-[4rem] p-8 backdrop-blur-3xl shadow-xl">
            <div className="flex p-1 bg-black/40 rounded-3xl mb-10 border border-white/5">
                <button onClick={() => setCalcMode('jewelry')} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${calcMode === 'jewelry' ? 'bg-[#D4AF37] text-black' : 'text-zinc-500'}`}>Jewelry</button>
                <button onClick={() => setCalcMode('currency')} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${calcMode === 'currency' ? 'bg-[#22c55e] text-black' : 'text-zinc-500'}`}>Currency</button>
            </div>

            {calcMode === 'jewelry' ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Internal Metal Selector for Calculator */}
                <div className="flex p-1 bg-white/5 rounded-2xl mb-8 border border-white/5 w-fit mx-auto">
                    {['gold', 'silver'].map(metal => (
                        <button key={metal} onClick={() => setActiveMetal(metal)}
                          className={`px-8 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeMetal === metal ? (metal === 'gold' ? 'bg-[#D4AF37] text-black' : 'bg-zinc-400 text-black') : 'text-zinc-500'}`}>
                          {metal}
                        </button>
                    ))}
                </div>

                <div className={`mb-8 p-6 rounded-[2.2rem] border-2 flex items-center justify-between transition-all duration-700 ${
                  activeMetal === 'gold' ? 'border-[#D4AF37] bg-[#D4AF37]/10' : 'border-zinc-700 bg-zinc-400/10'
                }`}>
                  <div className="flex items-center gap-4">
                    <Coins className={`w-8 h-8 ${activeMetal === 'gold' ? 'text-[#D4AF37]' : 'text-zinc-400'}`} />
                    <div>
                      <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Pricing Mode</p>
                      <p className="text-xl font-black uppercase text-white tracking-tight">{activeMetal === 'gold' ? '24K Chhapawal' : 'Pure Silver'}</p>
                    </div>
                  </div>
                  <div className="text-right text-[10px] font-black text-zinc-500 uppercase">{formatRS(priceData[priceData.length-1]?.[activeMetal === 'usd' ? 'gold' : activeMetal])}</div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-8">
                  {['tola', 'aana', 'lal'].map((unit) => (
                    <div key={unit}>
                      <label className="text-[10px] font-black text-zinc-500 uppercase mb-2 block ml-3 tracking-[0.2em]">{unit}</label>
                      <input type="number" className="w-full bg-black/60 border-2 border-zinc-800 p-5 rounded-3xl text-center font-black text-2xl outline-none focus:border-[#D4AF37] transition-all text-white"
                        value={calc[unit]} onChange={(e) => setCalc({...calc, [unit]: e.target.value})} />
                    </div>
                  ))}
                </div>

                <div className="space-y-6 mb-12">
                  <input type="number" placeholder="Making Charges (Rs)" className="w-full bg-black/60 border-2 border-zinc-800 p-6 rounded-3xl font-black text-lg outline-none focus:border-[#D4AF37] text-white"
                    value={calc.making} onChange={(e) => setCalc({...calc, making: e.target.value})} />
                  <div onClick={() => setCalc({...calc, vat: !calc.vat})} className="flex justify-between items-center p-6 bg-white/5 rounded-[2.2rem] border border-white/5 cursor-pointer active:scale-[0.98] transition-all">
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${calc.vat ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-zinc-800'}`}>
                        {calc.vat && <Zap className="w-3.5 h-3.5 text-black fill-black" />}
                      </div>
                      <span className="font-bold text-zinc-300">13% Govt VAT</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[#D4AF37] via-yellow-500 to-yellow-600 p-12 rounded-[3.5rem] text-black text-center shadow-xl">
                   <p className="text-[11px] font-black uppercase tracking-[0.4em] mb-2 opacity-60">Estimated Total</p>
                   <h3 className="text-5xl font-black tracking-tighter">
                      {formatRS(( ( (Number(calc.tola)||0) + (Number(calc.aana)||0)/16 + (Number(calc.lal)||0)/192 ) * (priceData[priceData.length-1]?.[activeMetal === 'usd' ? 'gold' : activeMetal]) + (Number(calc.making)||0) ) * (calc.vat ? 1.13 : 1))}
                   </h3>
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                  <div className="flex items-center gap-4 bg-black/60 p-6 rounded-[2.5rem] border-2 border-zinc-800">
                    <Globe className="w-8 h-8 text-green-500" />
                    <div className="flex-1">
                      <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Source</p>
                      <select className="bg-transparent font-black text-xl text-white outline-none w-full" value={currCalc.source} onChange={(e) => setCurrCalc({...currCalc, source: e.target.value})}>
                        {currencyList.map(c => <option key={c.code} value={c.code} className="bg-zinc-900">{c.flag} {c.code}</option>)}
                      </select>
                    </div>
                    <button onClick={() => setCurrCalc({...currCalc, isSwapped: !currCalc.isSwapped})} className="p-4 bg-green-500/20 rounded-2xl"><ArrowRightLeft className="w-5 h-5 text-green-500" /></button>
                    <div className="flex-1 text-right">
                      <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Destination</p>
                      <p className="font-black text-xl text-white">🇳🇵 NPR</p>
                    </div>
                  </div>
                  <input type="number" placeholder="Enter Amount" className="w-full bg-black/60 border-2 border-zinc-800 p-8 rounded-[2.5rem] font-black text-4xl outline-none focus:border-green-500 text-white text-center"
                    value={currCalc.amount} onChange={(e) => setCurrCalc({...currCalc, amount: e.target.value})} />
                  <div className="bg-gradient-to-br from-green-500 to-green-700 p-12 rounded-[3.5rem] text-black text-center shadow-xl">
                     <p className="text-[11px] font-black uppercase tracking-[0.4em] mb-2 opacity-60">{currCalc.isSwapped ? `NPR to ${currCalc.source}` : `${currCalc.source} to NPR`}</p>
                     <h3 className="text-5xl font-black tracking-tighter">
                        {(() => {
                          const latestRates = forexHistory[forexHistory.length - 1]?.rates || [];
                          const rateData = latestRates.find(r => r.currency.iso3 === currCalc.source);
                          const rate = parseFloat(rateData?.buy || 133);
                          const res = currCalc.isSwapped ? (Number(currCalc.amount) / rate) : (Number(currCalc.amount) * rate);
                          return currCalc.isSwapped ? res.toFixed(2) : formatRS(res);
                        })()}
                     </h3>
                  </div>
              </div>
            )}
          </div>
        </main>
      )}

      <nav className="fixed bottom-12 left-10 right-10 h-20 bg-zinc-900/60 backdrop-blur-[50px] rounded-[3rem] border border-white/10 flex justify-around items-center px-4 z-50">
        <button onClick={() => setView('dashboard')} className={`flex flex-col items-center gap-1.5 px-12 py-3.5 rounded-[2.2rem] transition-all duration-500 ${view === 'dashboard' ? 'text-black' : 'text-zinc-500'}`}
          style={view === 'dashboard' ? { backgroundColor: accentColor, boxShadow: `0 0 40px ${accentColor}40` } : {}}>
          <LayoutDashboard className={`w-6 h-6 ${view === 'dashboard' ? 'fill-black' : ''}`} />
          <span className="text-[9px] font-black uppercase tracking-widest">Market</span>
        </button>
        <button onClick={() => { setView('calculator'); if(activeMetal === 'usd') setActiveMetal('gold'); }} className={`flex flex-col items-center gap-1.5 px-12 py-3.5 rounded-[2.2rem] transition-all duration-500 ${view === 'calculator' ? 'text-black' : 'text-zinc-500'}`}
          style={view === 'calculator' ? { backgroundColor: accentColor, boxShadow: `0 0 40px ${accentColor}40` } : {}}>
          <Calculator className={`w-6 h-6 ${view === 'calculator' ? 'fill-black' : ''}`} />
          <span className="text-[9px] font-black uppercase tracking-widest">Calculator</span>
        </button>
      </nav>
      <Analytics />
    </div>
  );
}