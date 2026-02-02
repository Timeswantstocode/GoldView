import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Line } from 'react-chartjs-2';
import { 
  Chart as ChartJS, registerables, Filler, Tooltip, 
  Legend, CategoryScale, LinearScale, PointElement, LineElement 
} from 'chart.js';
import { 
  LayoutDashboard, Calculator, RefreshCcw, TrendingUp, 
  X, Calendar, Info, Zap, ChevronRight, Activity, Coins
} from 'lucide-react';

ChartJS.register(...registerables, Filler, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement);

const DATA_URL = "https://raw.githubusercontent.com/Timeswantstocode/GoldView/main/data.json";

export default function App() {
  const [priceData, setPriceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('dashboard');
  const [activeMetal, setActiveMetal] = useState('gold');
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [calc, setCalc] = useState({ tola: '', aana: '', lal: '', making: '', vat: true });

  useEffect(() => {
    fetch(`${DATA_URL}?t=${Date.now()}`)
      .then(res => res.json())
      .then(json => {
        setPriceData(Array.isArray(json) ? json : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const formatRS = useCallback((num) => `रू ${Math.round(num || 0).toLocaleString()}`, []);
  
  const last7Days = useMemo(() => priceData.slice(-7), [priceData]);
  const current = useMemo(() => priceData[priceData.length - 1] || {}, [priceData]);

  const currentStats = useMemo(() => {
    const values = last7Days.map(d => Number(d[activeMetal]) || 0);
    if (values.length === 0) return { low: 0, high: 0, change: "0.00" };
    const low = Math.min(...values);
    const high = Math.max(...values);
    const change = values.length > 1 ? (((values[values.length-1] - values[0]) / values[0]) * 100).toFixed(2) : "0.00";
    return { low, high, change };
  }, [last7Days, activeMetal]);

  // COLOR LOGIC FOR THEMES
  const accentColor = activeMetal === 'gold' ? '#D4AF37' : activeMetal === 'tejabi' ? '#b8860b' : '#94a3b8';

  const chartData = useMemo(() => ({
    labels: last7Days.map(d => d.date),
    datasets: [{
      data: last7Days.map(d => Number(d[activeMetal]) || 0),
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
        const ctx = context.chart.ctx;
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, activeMetal === 'gold' ? 'rgba(212, 175, 55, 0.35)' : 'rgba(148, 163, 184, 0.25)');
        gradient.addColorStop(1, 'transparent');
        return gradient;
      },
    }]
  }), [last7Days, activeMetal, selectedPoint, accentColor]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false, // THIS FIXES INTERACTIVITY - allows clicking the column
    },
    plugins: {
      legend: false,
      tooltip: { enabled: false } // We use our own Selection Box below
    },
    scales: { x: { display: false }, y: { display: false } },
    onClick: (e, elements) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        const point = last7Days[index];
        setSelectedPoint({ index, date: point.date, price: point[activeMetal] });
      }
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020202] flex items-center justify-center">
      <RefreshCcw className="w-10 h-10 text-[#D4AF37] animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020202] text-zinc-100 font-sans pb-40 overflow-x-hidden relative transition-colors duration-700">
      
      {/* IMPROVED MESH GRADIENTS */}
      <div className="fixed inset-0 pointer-events-none">
        <div className={`absolute top-[-10%] left-[-10%] w-[70%] h-[60%] blur-[120px] transition-colors duration-1000 ${activeMetal === 'gold' ? 'bg-[#D4AF37]/20' : 'bg-blue-600/10'}`} />
        <div className="absolute bottom-0 right-[-10%] w-[50%] h-[50%] bg-purple-900/10 blur-[100px]" />
      </div>

      <header className="p-8 pt-14 flex justify-between items-end relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full shadow-[0_0_15px_rgba(34,197,94,0.8)] animate-pulse"></div>
            <p className="text-[#D4AF37] text-[11px] font-black uppercase tracking-[0.3em]">Market Real-time</p>
          </div>
          <h1 className="text-4xl font-black tracking-tighter bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">GoldView</h1>
        </div>
        <button onClick={() => window.location.reload()} className="p-4 bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl active:scale-90 transition-all">
          <RefreshCcw className="w-5 h-5 text-[#D4AF37]" />
        </button>
      </header>

      {view === 'dashboard' ? (
        <main className="px-6 space-y-6 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          {/* PRICES SECTION */}
          <div className="space-y-3">
            {[
              { id: 'gold', label: '24K Chhapawal Gold', grad: 'from-[#D4AF37]/40 to-[#D4AF37]/5', border: 'border-[#D4AF37]/60' },
              { id: 'tejabi', label: '22K Tejabi Gold', grad: 'from-yellow-700/30 to-yellow-900/5', border: 'border-yellow-700/50' },
              { id: 'silver', label: 'Pure Silver Tola', grad: 'from-zinc-400/20 to-zinc-600/5', border: 'border-zinc-500/40' }
            ].map((item) => {
              const isActive = activeMetal === item.id;
              return (
                <div 
                  key={item.id}
                  onClick={() => { setActiveMetal(item.id); setSelectedPoint(null); }}
                  className={`p-6 rounded-[2.5rem] border-2 transition-all duration-500 cursor-pointer bg-gradient-to-br shadow-2xl relative overflow-hidden ${
                    isActive ? `${item.grad} ${item.border} scale-[1.03] z-20` : 'border-white/5 bg-white/5 opacity-40 grayscale-[0.4]'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-[11px] font-black uppercase tracking-widest ${isActive ? 'text-white' : 'text-zinc-500'}`}>{item.label}</span>
                    {isActive && <TrendingUp className="w-5 h-5 text-green-500 drop-shadow-lg" />}
                  </div>
                  <h2 className={`text-4xl font-black tracking-tighter ${isActive ? 'text-white' : 'text-zinc-400'}`}>{formatRS(current[item.id])}</h2>
                  <div className={`mt-2 text-[10px] font-bold uppercase tracking-widest opacity-60 ${isActive ? 'text-[#D4AF37]' : ''}`}>Nepal Federation Rate</div>
                </div>
              );
            })}
          </div>

          {/* CHART BOX */}
          <section className="bg-gradient-to-b from-white/15 to-transparent border border-white/10 rounded-[3rem] p-8 backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#D4AF37]" /> Trend Analysis
              </h3>
              <span className="text-[10px] font-black bg-[#D4AF37]/20 text-[#D4AF37] px-4 py-1.5 rounded-full border border-[#D4AF37]/30 tracking-widest uppercase">7 Day</span>
            </div>
            
            <div className="h-64 relative">
              <Line data={chartData} options={chartOptions} />
            </div>

            <div className="flex justify-between mt-10 pt-8 border-t border-white/10">
              <div className="text-center">
                <p className="text-[10px] font-black text-zinc-600 uppercase mb-2">Weekly Low</p>
                <p className="text-base font-black text-blue-400">{formatRS(currentStats.low)}</p>
              </div>
              <div className="text-center px-8 border-x border-white/10">
                <p className="text-[10px] font-black text-zinc-600 uppercase mb-2">Volatility</p>
                <p className={`text-base font-black ${Number(currentStats.change) >= 0 ? 'text-green-500' : 'text-red-500'}`}>{currentStats.change}%</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black text-zinc-600 uppercase mb-2">Weekly High</p>
                <p className="text-base font-black text-green-500">{formatRS(currentStats.high)}</p>
              </div>
            </div>

            {/* ADAPTIVE SELECTED DATE BOX (BELOW CHART) */}
            {selectedPoint && (
              <div className="mt-8 bg-gradient-to-br from-zinc-900 to-black border-2 border-[#D4AF37]/50 rounded-[2.5rem] p-6 flex flex-wrap gap-5 justify-between items-center animate-in slide-in-from-bottom-8 duration-500 shadow-3xl min-h-fit">
                <div className="flex items-center gap-5 flex-1 min-w-full sm:min-w-fit">
                  <div className="w-14 h-14 bg-[#D4AF37]/20 rounded-3xl flex items-center justify-center border border-[#D4AF37]/30 shrink-0">
                    <Calendar className="w-7 h-7 text-[#D4AF37]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.25em] mb-1">Price Record</p>
                    <p className="text-lg font-bold text-white leading-tight">
                      {new Date(selectedPoint.date.replace(' ', 'T')).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between w-full sm:w-auto gap-6 pt-4 sm:pt-0 border-t sm:border-t-0 border-white/5">
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] font-black text-zinc-500 uppercase mb-1">Market Rate</p>
                    <p className="text-3xl font-black bg-gradient-to-r from-[#D4AF37] to-yellow-600 bg-clip-text text-transparent">
                      {formatRS(selectedPoint.price)}
                    </p>
                  </div>
                  <button onClick={() => setSelectedPoint(null)} className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center shadow-lg border border-white/5 active:scale-90 transition-all">
                    <X className="w-5 h-5 text-zinc-400" />
                  </button>
                </div>
              </div>
            )}
          </section>
        </main>
      ) : (
        <main className="px-6 relative z-10 animate-in zoom-in-95 duration-500">
          <div className="bg-gradient-to-b from-white/10 to-transparent border border-white/10 rounded-[3.5rem] p-10 backdrop-blur-3xl shadow-3xl">
            
            {/* CALCULATOR METAL INDICATOR */}
            <div className={`mb-10 p-5 rounded-3xl border-2 flex items-center justify-between transition-all duration-500 ${
              activeMetal === 'gold' ? 'border-[#D4AF37] bg-[#D4AF37]/10' :
              activeMetal === 'tejabi' ? 'border-yellow-700 bg-yellow-900/10' :
              'border-zinc-700 bg-zinc-400/10'
            }`}>
              <div className="flex items-center gap-4">
                <Coins className={`w-8 h-8 ${activeMetal === 'gold' ? 'text-[#D4AF37]' : 'text-zinc-400'}`} />
                <div>
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Active Mode</p>
                  <p className="text-xl font-black uppercase text-white">{activeMetal === 'gold' ? '24K Chhapawal' : activeMetal === 'tejabi' ? '22K Tejabi' : 'Pure Silver'}</p>
                </div>
              </div>
              <div className="text-right text-xs font-bold text-zinc-500">
                Rate: {formatRS(current[activeMetal])}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              {['tola', 'aana', 'lal'].map((unit) => (
                <div key={unit}>
                  <label className="text-[11px] font-black text-zinc-500 uppercase mb-2 block ml-2 tracking-widest">{unit}</label>
                  <input 
                    type="number" 
                    placeholder="0"
                    className="w-full bg-black/60 border-2 border-zinc-800 p-5 rounded-3xl text-center font-black text-2xl outline-none focus:border-[#D4AF37] transition-all text-white"
                    value={calc[unit]}
                    onChange={(e) => setCalc({...calc, [unit]: e.target.value})}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-5 mb-10">
              <input 
                type="number" 
                placeholder="Making Charges (Rs)"
                className="w-full bg-black/60 border-2 border-zinc-800 p-6 rounded-3xl font-black text-lg outline-none focus:border-[#D4AF37] text-white"
                value={calc.making}
                onChange={(e) => setCalc({...calc, making: e.target.value})}
              />
              <div 
                onClick={() => setCalc({...calc, vat: !calc.vat})}
                className="flex justify-between items-center p-6 bg-white/5 rounded-[2rem] border border-white/5 cursor-pointer transition-all active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${calc.vat ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-zinc-800'}`}>
                    {calc.vat && <Zap className="w-3 h-3 text-black fill-black" />}
                  </div>
                  <span className="font-bold text-zinc-300">13% Government VAT</span>
                </div>
                <Info className="w-5 h-5 text-zinc-600" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#D4AF37] via-yellow-500 to-yellow-600 p-10 rounded-[3rem] text-black text-center shadow-[0_30px_60px_rgba(212,175,55,0.4)] relative overflow-hidden group">
               <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
               <p className="text-[11px] font-black uppercase tracking-[0.3em] mb-2 opacity-60">Total Estimated Value</p>
               <h3 className="text-5xl font-black tracking-tighter">
                  {formatRS(( ( (Number(calc.tola)||0) + (Number(calc.aana)||0)/16 + (Number(calc.lal)||0)/192 ) * current[activeMetal] + (Number(calc.making)||0) ) * (calc.vat ? 1.13 : 1))}
               </h3>
            </div>
          </div>
        </main>
      )}

      {/* FLOATING NAV WITH THEMED GLOW */}
      <nav className="fixed bottom-10 left-8 right-8 h-20 bg-zinc-900/70 backdrop-blur-[40px] rounded-[2.5rem] border border-white/10 flex justify-around items-center px-4 z-50 shadow-[0_30px_60px_rgba(0,0,0,0.8)]">
        <button 
          onClick={() => { setView('dashboard'); setSelectedPoint(null); }}
          className={`flex flex-col items-center gap-1.5 px-10 py-3.5 rounded-[1.8rem] transition-all duration-500 ${
            view === 'dashboard' 
            ? `text-black shadow-[0_0_30px_rgba(212,175,55,0.4)] ${activeMetal === 'gold' ? 'bg-[#D4AF37]' : activeMetal === 'tejabi' ? 'bg-yellow-600' : 'bg-zinc-400'}` 
            : 'text-zinc-500 hover:text-white'
          }`}
        >
          <LayoutDashboard className={`w-6 h-6 ${view === 'dashboard' ? 'fill-black' : ''}`} />
          <span className="text-[10px] font-black uppercase tracking-tighter">Market</span>
        </button>
        <button 
          onClick={() => { setView('calculator'); setSelectedPoint(null); }}
          className={`flex flex-col items-center gap-1.5 px-10 py-3.5 rounded-[1.8rem] transition-all duration-500 ${
            view === 'calculator' 
            ? `text-black shadow-[0_0_30px_rgba(212,175,55,0.4)] ${activeMetal === 'gold' ? 'bg-[#D4AF37]' : activeMetal === 'tejabi' ? 'bg-yellow-600' : 'bg-zinc-400'}` 
            : 'text-zinc-500 hover:text-white'
          }`}
        >
          <Calculator className={`w-6 h-6 ${view === 'calculator' ? 'fill-black' : ''}`} />
          <span className="text-[10px] font-black uppercase tracking-tighter">Calculator</span>
        </button>
      </nav>

    </div>
  );
}