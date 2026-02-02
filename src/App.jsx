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
  const yesterday = useMemo(() => priceData[priceData.length - 2] || current, [priceData, current]);

  // Logic for the Top Right Value Difference (Day-over-Day)
  const getDayDiff = (metal) => {
    const diff = (current[metal] || 0) - (yesterday[metal] || 0);
    const sign = diff >= 0 ? '+' : '';
    return { 
      val: `Rs. ${sign}${diff.toLocaleString()}`,
      isUp: diff >= 0
    };
  };

  const currentStats = useMemo(() => {
    const values = last7Days.map(d => Number(d[activeMetal]) || 0);
    if (values.length === 0) return { low: 0, high: 0, change: "0.00" };
    const low = Math.min(...values);
    const high = Math.max(...values);
    const change = values.length > 1 ? (((values[values.length-1] - values[0]) / values[0]) * 100).toFixed(2) : "0.00";
    return { low, high, change };
  }, [last7Days, activeMetal]);

  const accentColor = activeMetal === 'gold' ? '#D4AF37' : '#94a3b8';

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
        gradient.addColorStop(0, activeMetal === 'gold' ? 'rgba(212, 175, 55, 0.4)' : 'rgba(148, 163, 184, 0.3)');
        gradient.addColorStop(1, 'transparent');
        return gradient;
      },
    }]
  }), [last7Days, activeMetal, selectedPoint, accentColor]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: false, tooltip: { enabled: false } },
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
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <RefreshCcw className="w-10 h-10 text-[#D4AF37] animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020202] text-zinc-100 font-sans pb-40 overflow-x-hidden relative">
      
      {/* CLOUDY LIQUID BACKGROUND - SMOOTH TRANSITIONS */}
      <div className={`fixed inset-0 pointer-events-none transition-opacity duration-1000 z-0 ${activeMetal === 'gold' ? 'opacity-100' : 'opacity-0'}`}>
        <div className="absolute top-[-15%] left-[-10%] w-[80%] h-[70%] bg-[#D4AF37]/15 blur-[140px] rounded-full" />
        <div className="absolute bottom-[5%] right-[-10%] w-[60%] h-[60%] bg-[#b8860b]/10 blur-[120px] rounded-full" />
      </div>
      <div className={`fixed inset-0 pointer-events-none transition-opacity duration-1000 z-0 ${activeMetal === 'silver' ? 'opacity-100' : 'opacity-0'}`}>
        <div className="absolute top-[-10%] left-[-5%] w-[80%] h-[70%] bg-blue-600/10 blur-[140px] rounded-full" />
        <div className="absolute bottom-[10%] right-[-10%] w-[60%] h-[60%] bg-zinc-500/10 blur-[120px] rounded-full" />
      </div>

      <header className="p-8 pt-16 flex justify-between items-end relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full shadow-[0_0_15px_rgba(34,197,94,0.8)] animate-pulse"></div>
            <p className="text-[#D4AF37] text-[11px] font-black uppercase tracking-[0.35em]">Live Market</p>
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-white">GoldView</h1>
        </div>
        <button onClick={() => window.location.reload()} className="p-4 bg-white/5 backdrop-blur-3xl rounded-3xl border border-white/10 shadow-2xl active:scale-90 transition-all">
          <RefreshCcw className="w-5 h-5 text-[#D4AF37]" />
        </button>
      </header>

      {view === 'dashboard' ? (
        <main className="px-6 space-y-6 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          {/* METAL BUTTONS - REMOVED TEJABI - ADDED TOP RIGHT VALUE DIFF */}
          <div className="space-y-4">
            {[
              { id: 'gold', label: '24K Chhapawal Gold', grad: 'from-[#D4AF37]/30 to-[#D4AF37]/5', border: 'border-[#D4AF37]/40', glow: 'shadow-[#D4AF37]/20', icon: 'text-[#D4AF37]' },
              { id: 'silver', label: 'Pure Silver Tola', grad: 'from-zinc-400/20 to-zinc-600/5', border: 'border-zinc-500/30', glow: 'shadow-zinc-500/10', icon: 'text-zinc-400' }
            ].map((item) => {
              const isActive = activeMetal === item.id;
              const diff = getDayDiff(item.id);
              return (
                <div 
                  key={item.id}
                  onClick={() => { setActiveMetal(item.id); setSelectedPoint(null); }}
                  className={`p-7 rounded-[2.8rem] border-[1.5px] transition-all duration-700 cursor-pointer bg-gradient-to-br backdrop-blur-3xl shadow-2xl relative overflow-hidden ${
                    isActive ? `${item.grad} ${item.border} ${item.glow} scale-[1.03]` : 'border-white/5 bg-white/5 opacity-40'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[11px] font-black uppercase tracking-widest ${isActive ? 'text-white' : 'text-zinc-500'}`}>{item.label}</span>
                    
                    {/* NEW: TOP RIGHT PRICE DIFF BOX */}
                    <div className={`px-2.5 py-1 rounded-xl text-[10px] font-black border backdrop-blur-md shadow-lg ${
                      diff.isUp ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
                    }`}>
                      {diff.val}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-end">
                    <h2 className={`text-4xl font-black tracking-tighter ${isActive ? 'text-white' : 'text-zinc-400'}`}>{formatRS(current[item.id])}</h2>
                    {isActive && <TrendingUp className={`w-5 h-5 ${diff.isUp ? 'text-green-500' : 'text-red-500 rotate-180'}`} />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* CLOUDY GLASS CHART BOX */}
          <section className="bg-white/5 border border-white/10 rounded-[3.5rem] p-9 backdrop-blur-3xl shadow-[0_30px_60px_rgba(0,0,0,0.4)]">
            <div className="flex justify-between items-center mb-8 px-1">
              <h3 className="text-xl font-black tracking-tight flex items-center gap-3">
                <Activity className="w-5 h-5 text-[#D4AF37]" /> Trend Analysis
              </h3>
              <span className="text-[10px] font-black bg-white/5 px-4 py-1.5 rounded-full border border-white/10 text-zinc-400 tracking-[0.2em] uppercase">7 Day</span>
            </div>
            
            <div className="h-64 relative">
              <Line data={chartData} options={chartOptions} />
            </div>

            <div className="flex justify-between mt-10 pt-8 border-t border-white/10">
              <div className="text-center">
                <p className="text-[10px] font-black text-zinc-600 uppercase mb-2">Weekly Low</p>
                <p className="text-base font-black text-blue-400">{formatRS(currentStats.low)}</p>
              </div>
              <div className="text-center px-10 border-x border-white/10">
                <p className="text-[10px] font-black text-zinc-600 uppercase mb-2">Change</p>
                <p className={`text-base font-black ${Number(currentStats.change) >= 0 ? 'text-green-500' : 'text-red-500'}`}>{currentStats.change}%</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black text-zinc-600 uppercase mb-2">Weekly High</p>
                <p className="text-base font-black text-green-500">{formatRS(currentStats.high)}</p>
              </div>
            </div>

            {/* ADAPTIVE SELECTED DATE BOX (BELOW CHART) */}
            {selectedPoint && (
              <div className="mt-8 bg-black/40 border-2 border-[#D4AF37]/50 rounded-[2.8rem] p-7 flex flex-wrap gap-5 justify-between items-center animate-in slide-in-from-bottom-8 duration-500 backdrop-blur-3xl min-w-fit shadow-3xl">
                <div className="flex items-center gap-5 flex-1 min-w-[200px]">
                  <div className="w-16 h-16 bg-[#D4AF37]/20 rounded-3xl flex items-center justify-center border border-[#D4AF37]/30 shrink-0">
                    <Calendar className="w-8 h-8 text-[#D4AF37]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.3em] mb-1">Price Record</p>
                    <p className="text-xl font-black text-white leading-tight">
                      {new Date(selectedPoint.date.replace(' ', 'T')).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="text-[10px] font-black text-zinc-500 uppercase mb-1">Market Rate</p>
                    <p className="text-3xl font-black bg-gradient-to-r from-[#D4AF37] to-yellow-600 bg-clip-text text-transparent leading-none">
                      {formatRS(selectedPoint.price)}
                    </p>
                  </div>
                  <button onClick={() => setSelectedPoint(null)} className="p-3 bg-zinc-800 rounded-full hover:bg-zinc-700 transition-all active:scale-90">
                    <X className="w-5 h-5 text-zinc-400" />
                  </button>
                </div>
              </div>
            )}
          </section>
        </main>
      ) : (
        <main className="px-6 relative z-10 animate-in zoom-in-95 duration-500">
          {/* CALCULATOR REMAINING SAME GRADIENT STYLE PER REQUEST */}
          <div className="bg-white/5 border border-white/10 rounded-[4rem] p-10 backdrop-blur-3xl shadow-3xl">
            <div className={`mb-10 p-6 rounded-[2.2rem] border-2 flex items-center justify-between transition-all duration-700 ${
              activeMetal === 'gold' ? 'border-[#D4AF37] bg-[#D4AF37]/10' : 'border-zinc-700 bg-zinc-400/10'
            }`}>
              <div className="flex items-center gap-4">
                <Coins className={`w-8 h-8 ${activeMetal === 'gold' ? 'text-[#D4AF37]' : 'text-zinc-400'}`} />
                <div>
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Active Calculator</p>
                  <p className="text-xl font-black uppercase text-white">{activeMetal === 'gold' ? '24K Chhapawal' : 'Pure Silver'}</p>
                </div>
              </div>
              <div className="text-right text-xs font-black text-zinc-500">{formatRS(current[activeMetal])}</div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              {['tola', 'aana', 'lal'].map((unit) => (
                <div key={unit}>
                  <label className="text-[11px] font-black text-zinc-500 uppercase mb-2 block ml-3 tracking-widest">{unit}</label>
                  <input 
                    type="number" 
                    className="w-full bg-black/60 border-2 border-zinc-800 p-5 rounded-3xl text-center font-black text-2xl outline-none focus:border-[#D4AF37] transition-all text-white"
                    value={calc[unit]}
                    onChange={(e) => setCalc({...calc, [unit]: e.target.value})}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-6 mb-12">
              <input 
                type="number" 
                placeholder="Making Charges (Rs)"
                className="w-full bg-black/60 border-2 border-zinc-800 p-6 rounded-3xl font-black text-lg outline-none focus:border-[#D4AF37] text-white"
                value={calc.making}
                onChange={(e) => setCalc({...calc, making: e.target.value})}
              />
              <div 
                onClick={() => setCalc({...calc, vat: !calc.vat})}
                className="flex justify-between items-center p-6 bg-white/5 rounded-[2.2rem] border border-white/5 cursor-pointer active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${calc.vat ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-zinc-800'}`}>
                    {calc.vat && <Zap className="w-3.5 h-3.5 text-black fill-black" />}
                  </div>
                  <span className="font-bold text-zinc-300">13% Nepal Government VAT</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#D4AF37] via-yellow-500 to-yellow-600 p-12 rounded-[3.5rem] text-black text-center shadow-[0_30px_70px_rgba(212,175,55,0.4)] relative overflow-hidden group">
               <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
               <p className="text-[12px] font-black uppercase tracking-[0.4em] mb-2 opacity-60">Total Estimated Valuation</p>
               <h3 className="text-5xl font-black tracking-tighter">
                  {formatRS(( ( (Number(calc.tola)||0) + (Number(calc.aana)||0)/16 + (Number(calc.lal)||0)/192 ) * current[activeMetal] + (Number(calc.making)||0) ) * (calc.vat ? 1.13 : 1))}
               </h3>
            </div>
          </div>
        </main>
      )}

      {/* THEMED FLOATING NAV */}
      <nav className="fixed bottom-12 left-10 right-10 h-20 bg-zinc-900/60 backdrop-blur-[50px] rounded-[3rem] border border-white/10 flex justify-around items-center px-4 z-50 shadow-[0_40px_80px_rgba(0,0,0,0.8)]">
        <button 
          onClick={() => { setView('dashboard'); setSelectedPoint(null); }}
          className={`flex flex-col items-center gap-1.5 px-12 py-3.5 rounded-[2.2rem] transition-all duration-700 ${
            view === 'dashboard' 
            ? `text-black shadow-[0_0_40px_rgba(212,175,55,0.4)] ${activeMetal === 'gold' ? 'bg-[#D4AF37]' : 'bg-zinc-400'}` 
            : 'text-zinc-500 hover:text-white'
          }`}
        >
          <LayoutDashboard className={`w-6 h-6 ${view === 'dashboard' ? 'fill-black' : ''}`} />
          <span className="text-[10px] font-black uppercase tracking-widest">Market</span>
        </button>
        <button 
          onClick={() => { setView('calculator'); setSelectedPoint(null); }}
          className={`flex flex-col items-center gap-1.5 px-12 py-3.5 rounded-[2.2rem] transition-all duration-700 ${
            view === 'calculator' 
            ? `text-black shadow-[0_0_40px_rgba(212,175,55,0.4)] ${activeMetal === 'gold' ? 'bg-[#D4AF37]' : 'bg-zinc-400'}` 
            : 'text-zinc-500 hover:text-white'
          }`}
        >
          <Calculator className={`w-6 h-6 ${view === 'calculator' ? 'fill-black' : ''}`} />
          <span className="text-[10px] font-black uppercase tracking-widest">Calculator</span>
        </button>
      </nav>

    </div>
  );
}