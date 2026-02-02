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

  // 1. Optimized Data Fetching
  useEffect(() => {
    let isMounted = true;
    fetch(`${DATA_URL}?t=${Date.now()}`)
      .then(res => res.json())
      .then(json => {
        if (isMounted) {
          setPriceData(Array.isArray(json) ? json : []);
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
    return () => { isMounted = false };
  }, []);

  // 2. Memoized Formatters & Stats (Stops Lag)
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

  // 3. High Performance Chart Configuration
  const chartData = useMemo(() => ({
    labels: last7Days.map(d => d.date),
    datasets: [{
      data: last7Days.map(d => Number(d[activeMetal]) || 0),
      borderColor: activeMetal === 'gold' ? '#D4AF37' : activeMetal === 'tejabi' ? '#b8860b' : '#94a3b8',
      borderWidth: 3,
      fill: true,
      tension: 0.4,
      pointRadius: (ctx) => (selectedPoint?.index === ctx.dataIndex ? 8 : 0),
      backgroundColor: (context) => {
        const ctx = context.chart.ctx;
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, activeMetal === 'gold' ? 'rgba(212, 175, 55, 0.2)' : 'rgba(148, 163, 184, 0.15)');
        gradient.addColorStop(1, 'transparent');
        return gradient;
      },
    }]
  }), [last7Days, activeMetal, selectedPoint]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400 }, // Faster animations
    plugins: { legend: false, tooltip: { enabled: false } }, // Custom UI handles this
    scales: { x: { display: false }, y: { display: false } },
    onClick: (e, elements) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        const point = last7Days[index];
        setSelectedPoint({ index, date: point.date, price: point[activeMetal] });
      }
    }
  };

  const totalValuation = useMemo(() => {
    const totalTola = (Number(calc.tola) || 0) + (Number(calc.aana) || 0) / 16 + (Number(calc.lal) || 0) / 192;
    const rate = Number(current[activeMetal]) || 0;
    const base = (totalTola * rate) + (Number(calc.making) || 0);
    return calc.vat ? base * 1.13 : base;
  }, [calc, current, activeMetal]);

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <RefreshCcw className="w-8 h-8 text-[#D4AF37] animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans pb-32 overflow-x-hidden">
      
      {/* Background Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#D4AF37]/5 blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="p-8 pt-12 flex justify-between items-center relative z-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">Market View</h1>
          <p className="text-[#D4AF37] text-[10px] font-black uppercase tracking-[0.2em] mt-1">Live from Nepal</p>
        </div>
        <button onClick={() => window.location.reload()} className="w-12 h-12 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center">
          <RefreshCcw className="w-5 h-5 text-[#D4AF37]" />
        </button>
      </header>

      {view === 'dashboard' ? (
        <main className="px-6 space-y-4 relative z-10 animate-in fade-in duration-300">
          
          {/* Metal Cards */}
          {[
            { id: 'gold', label: '24K Gold (Chhapawal)', color: 'border-[#D4AF37]', bg: 'bg-[#D4AF37]/5', text: 'text-[#D4AF37]' },
            { id: 'tejabi', label: '22K Gold (Tejabi)', color: 'border-yellow-700', bg: 'bg-yellow-900/5', text: 'text-yellow-600' },
            { id: 'silver', label: 'Pure Silver', color: 'border-zinc-700', bg: 'bg-zinc-400/5', text: 'text-zinc-400' }
          ].map((item) => {
            const isActive = activeMetal === item.id;
            return (
              <div 
                key={item.id}
                onClick={() => { setActiveMetal(item.id); setSelectedPoint(null); }}
                className={`p-5 rounded-[2rem] border-2 transition-all duration-300 cursor-pointer relative ${
                  isActive ? `${item.color} ${item.bg} scale-[1.02]` : 'border-white/5 bg-white/5 opacity-50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-[10px] font-black uppercase ${item.text}`}>{item.label}</span>
                  {isActive && <TrendingUp className="w-4 h-4 text-green-500" />}
                </div>
                <h2 className="text-4xl font-black mt-1">{formatRS(current[item.id])}</h2>
              </div>
            );
          })}

          {/* Chart Section */}
          <section className="mt-8 bg-white/5 border border-white/10 rounded-[2.5rem] p-6 backdrop-blur-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">Trend Analysis</h3>
              <div className="text-[10px] font-black bg-black/40 px-3 py-1 rounded-full text-zinc-400 border border-white/5">7D DATA</div>
            </div>
            <div className="h-56 relative">
              <Line data={chartData} options={chartOptions} />
            </div>
            
            {/* Stats Bar */}
            <div className="flex justify-between mt-8 pt-6 border-t border-white/5">
              <div className="text-center">
                <p className="text-[9px] font-black text-zinc-600 uppercase">Weekly Low</p>
                <p className="text-sm font-bold text-blue-400">{formatRS(currentStats.low)}</p>
              </div>
              <div className="text-center px-6 border-x border-white/5">
                <p className="text-[9px] font-black text-zinc-600 uppercase">Change</p>
                <p className={`text-sm font-bold ${Number(currentStats.change) >= 0 ? 'text-green-500' : 'text-red-500'}`}>{currentStats.change}%</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] font-black text-zinc-600 uppercase">Weekly High</p>
                <p className="text-sm font-bold text-green-500">{formatRS(currentStats.high)}</p>
              </div>
            </div>

            {/* Selected Date Overlay Below Chart */}
            {selectedPoint && (
              <div className="mt-6 bg-gradient-to-r from-zinc-900 to-[#1a1812] border-2 border-[#D4AF37]/30 rounded-[2rem] p-5 flex justify-between items-center animate-in slide-in-from-bottom-4 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#D4AF37]/10 rounded-2xl flex items-center justify-center border border-[#D4AF37]/20">
                    <Calendar className="w-6 h-6 text-[#D4AF37]" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Selected Record</p>
                    <p className="text-sm font-bold">{new Date(selectedPoint.date.replace(' ', 'T')).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <p className="text-[9px] font-black text-zinc-500 uppercase">Rate</p>
                    <p className="text-xl font-black text-[#D4AF37]">{formatRS(selectedPoint.price)}</p>
                  </div>
                  <button onClick={() => setSelectedPoint(null)} className="p-1.5 bg-zinc-800 rounded-full">
                    <X className="w-4 h-4 text-zinc-400" />
                  </button>
                </div>
              </div>
            )}
          </section>
        </main>
      ) : (
        <main className="px-6 relative z-10 animate-in zoom-in-95 duration-300">
          <div className="bg-white/5 border border-white/10 rounded-[3rem] p-8 backdrop-blur-xl">
            
            {/* CALCULATOR METAL INDICATOR (NEW) */}
            <div className={`mb-8 p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${
              activeMetal === 'gold' ? 'border-[#D4AF37] bg-[#D4AF37]/10' :
              activeMetal === 'tejabi' ? 'border-yellow-700 bg-yellow-900/10' :
              'border-zinc-700 bg-zinc-400/10'
            }`}>
              <div className="flex items-center gap-3">
                <Coins className={`w-6 h-6 ${activeMetal === 'gold' ? 'text-[#D4AF37]' : 'text-zinc-400'}`} />
                <div>
                  <p className="text-[10px] font-black text-zinc-500 uppercase">Calculating For</p>
                  <p className="text-lg font-black uppercase">{activeMetal === 'gold' ? '24K Chhapawal Gold' : activeMetal === 'tejabi' ? '22K Tejabi Gold' : 'Pure Silver'}</p>
                </div>
              </div>
              <div className="text-right font-black text-sm text-zinc-400">
                Rate: {formatRS(current[activeMetal])}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {['tola', 'aana', 'lal'].map((unit) => (
                <div key={unit}>
                  <label className="text-[10px] font-black text-zinc-500 uppercase block ml-1 mb-2 tracking-widest">{unit}</label>
                  <input 
                    type="number" 
                    placeholder="0"
                    className="w-full bg-black border border-zinc-800 p-4 rounded-2xl text-center font-black text-xl outline-none focus:border-[#D4AF37] transition-all"
                    value={calc[unit]}
                    onChange={(e) => setCalc({...calc, [unit]: e.target.value})}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-4 mb-10">
              <input 
                type="number" 
                placeholder="Making Charges (Rs)"
                className="w-full bg-black border border-zinc-800 p-5 rounded-3xl font-bold outline-none focus:border-[#D4AF37]"
                value={calc.making}
                onChange={(e) => setCalc({...calc, making: e.target.value})}
              />
              <div 
                onClick={() => setCalc({...calc, vat: !calc.vat})}
                className="flex justify-between items-center p-5 bg-white/5 rounded-2xl border border-white/5 cursor-pointer active:scale-95 transition-all"
              >
                <span className="text-sm font-bold text-zinc-300">Include 13% Government VAT</span>
                <div className={`w-10 h-6 rounded-full transition-all relative ${calc.vat ? 'bg-[#D4AF37]' : 'bg-zinc-800'}`}>
                   <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${calc.vat ? 'left-5' : 'left-1'}`} />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-[#D4AF37] to-yellow-600 p-8 rounded-[2.5rem] text-black text-center shadow-[0_20px_40px_rgba(212,175,55,0.3)]">
               <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-60">Estimated Valuation</p>
               <h3 className="text-4xl font-black">{formatRS(totalValuation)}</h3>
            </div>
          </div>
        </main>
      )}

      {/* Floating Bottom Nav */}
      <nav className="fixed bottom-8 left-8 right-8 h-20 bg-zinc-900/60 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 flex justify-around items-center px-4 z-50 shadow-2xl">
        <button 
          onClick={() => setView('dashboard')}
          className={`flex flex-col items-center gap-1.5 px-10 py-3.5 rounded-3xl transition-all duration-300 ${
            view === 'dashboard' ? 'bg-[#D4AF37] text-black' : 'text-zinc-500'
          }`}
        >
          <LayoutDashboard className="w-6 h-6" />
          <span className="text-[9px] font-black uppercase tracking-tighter">Market</span>
        </button>
        <button 
          onClick={() => setView('calculator')}
          className={`flex flex-col items-center gap-1.5 px-10 py-3.5 rounded-3xl transition-all duration-300 ${
            view === 'calculator' ? 'bg-[#D4AF37] text-black' : 'text-zinc-500'
          }`}
        >
          <Calculator className="w-6 h-6" />
          <span className="text-[9px] font-black uppercase tracking-tighter">Calc</span>
        </button>
      </nav>

    </div>
  );
}