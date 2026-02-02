import React, { useState, useMemo, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { 
  Chart as ChartJS, registerables, Filler, Tooltip, 
  Legend, CategoryScale, LinearScale, PointElement, LineElement 
} from 'chart.js';
import { 
  LayoutDashboard, Calculator, RefreshCcw, TrendingUp, 
  X, Calendar, Info, Zap, ChevronRight, Activity
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
    const fetchData = async () => {
      try {
        const res = await fetch(`${DATA_URL}?t=${Date.now()}`);
        const json = await res.json();
        setPriceData(Array.isArray(json) ? json : []);
      } catch (e) {
        console.error("Fetch error");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatRS = (num) => `रू ${Math.round(num || 0).toLocaleString()}`;
  const formatDateFull = (str) => {
    if (!str) return "";
    const d = new Date(str.replace(' ', 'T'));
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  const last7Days = useMemo(() => priceData.slice(-7), [priceData]);
  const current = priceData[priceData.length - 1] || { gold: 0, silver: 0, tejabi: 0, date: "" };

  const getStats = (metal) => {
    const values = last7Days.map(d => Number(d[metal]) || 0);
    if (values.length === 0) return { low: 0, high: 0, change: "0.00" };
    const low = Math.min(...values);
    const high = Math.max(...values);
    const change = values.length > 1 ? (((values[values.length-1] - values[0]) / values[0]) * 100).toFixed(2) : "0.00";
    return { low, high, change };
  };

  const currentStats = getStats(activeMetal);

  const chartData = {
    labels: last7Days.map(d => d.date),
    datasets: [{
      data: last7Days.map(d => Number(d[activeMetal]) || 0),
      borderColor: activeMetal === 'gold' ? '#D4AF37' : activeMetal === 'tejabi' ? '#b8860b' : '#94a3b8',
      borderWidth: 4,
      pointBackgroundColor: activeMetal === 'gold' ? '#D4AF37' : '#94a3b8',
      pointBorderColor: '#000',
      pointBorderWidth: 3,
      pointRadius: (ctx) => (selectedPoint?.index === ctx.dataIndex ? 10 : 0),
      pointHoverRadius: 12,
      fill: true,
      tension: 0.45,
      backgroundColor: (context) => {
        const ctx = context.chart.ctx;
        const gradient = ctx.createLinearGradient(0, 0, 0, 350);
        gradient.addColorStop(0, activeMetal === 'gold' ? 'rgba(212, 175, 55, 0.3)' : 'rgba(148, 163, 184, 0.2)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        return gradient;
      },
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    onClick: (e, elements) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        const point = last7Days[index];
        setSelectedPoint({ index, date: point.date, price: point[activeMetal] });
      }
    },
    plugins: {
      legend: false,
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(20, 20, 20, 0.9)',
        padding: 12,
        titleFont: { size: 13, weight: 'bold' },
        bodyFont: { size: 15 },
        displayColors: false,
        callbacks: {
          title: (items) => formatDateFull(items[0].label),
          label: (item) => `${formatRS(item.raw)}`
        }
      }
    },
    scales: { x: { display: false }, y: { display: false } }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <RefreshCcw className="w-10 h-10 text-[#D4AF37] animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-[#D4AF37]/30 pb-32">
      {/* BACKGROUND MESH GRADIENT */}
      <div className="fixed inset-0 pointer-events-none opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#D4AF37]/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-zinc-800/20 blur-[100px] rounded-full"></div>
      </div>

      {/* Header */}
      <header className="p-8 pt-12 flex justify-between items-center relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2.5 h-2.5 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.8)] animate-pulse"></span>
            <p className="text-[#D4AF37] text-[11px] font-black uppercase tracking-[0.25em]">Market Live • NPT</p>
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">Market View</h1>
        </div>
        <button onClick={() => window.location.reload()} className="w-12 h-12 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 flex items-center justify-center active:scale-90 transition-all shadow-xl">
          <RefreshCcw className="w-5 h-5 text-[#D4AF37]" />
        </button>
      </header>

      {view === 'dashboard' ? (
        <main className="px-6 space-y-5 relative z-10">
          
          {/* Prices Grid */}
          <div className="grid grid-cols-1 gap-4">
            {[
              { id: 'gold', label: '24K Gold (Chhapawal)', color: 'from-[#D4AF37]/20 to-[#D4AF37]/5', border: 'border-[#D4AF37]/40', text: 'text-[#D4AF37]' },
              { id: 'tejabi', label: '22K Gold (Tejabi)', color: 'from-[#b8860b]/20 to-[#b8860b]/5', border: 'border-yellow-900/40', text: 'text-yellow-600' },
              { id: 'silver', label: 'Pure Silver', color: 'from-zinc-400/10 to-zinc-400/5', border: 'border-zinc-700/50', text: 'text-zinc-400' }
            ].map((item) => {
                const stats = getStats(item.id);
                return (
                  <div 
                    key={item.id}
                    onClick={() => { setActiveMetal(item.id); setSelectedPoint(null); }}
                    className={`p-6 rounded-[2.2rem] border-2 transition-all duration-500 cursor-pointer relative overflow-hidden bg-gradient-to-br shadow-2xl ${
                      activeMetal === item.id ? `${item.color} ${item.border} scale-[1.02]` : 'border-white/5 bg-white/5 opacity-40 grayscale-[0.5]'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${item.text}`}>{item.label}</span>
                      <div className={`flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-lg bg-black/40 ${Number(stats.change) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        <TrendingUp className={`w-3 h-3 ${Number(stats.change) < 0 ? 'rotate-180' : ''}`} /> {stats.change}%
                      </div>
                    </div>
                    <h2 className="text-4xl font-black tracking-tighter mb-1">{formatRS(current[item.id])}</h2>
                    <div className="flex justify-between items-center text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                      <span>Per Tola (11.66g)</span>
                      <ChevronRight className={`w-4 h-4 transition-transform ${activeMetal === item.id ? 'translate-x-0' : '-translate-x-4 opacity-0'}`} />
                    </div>
                  </div>
                );
            })}
          </div>

          {/* Chart Section */}
          <section className="mt-10">
            <div className="flex justify-between items-center mb-6 px-1">
              <h3 className="text-xl font-bold flex items-center gap-2">Trend Analysis <Activity className="w-5 h-5 text-[#D4AF37]" /></h3>
              <span className="text-[10px] font-black bg-[#D4AF37]/10 text-[#D4AF37] px-4 py-1.5 rounded-full border border-[#D4AF37]/20 uppercase">Last 7 Days</span>
            </div>

            <div className="bg-gradient-to-b from-white/10 to-transparent border border-white/10 backdrop-blur-xl rounded-[3rem] p-8 shadow-3xl">
              <div className="h-64 relative">
                <Line data={chartData} options={chartOptions} />
              </div>
              
              <div className="flex justify-between mt-10 pt-8 border-t border-white/5">
                <div className="text-center">
                  <p className="text-[10px] font-black text-zinc-600 uppercase mb-1.5">Weekly Low</p>
                  <p className="text-base font-bold text-blue-400">{formatRS(currentStats.low)}</p>
                </div>
                <div className="text-center px-10 border-x border-white/5">
                  <p className="text-[10px] font-black text-zinc-600 uppercase mb-1.5">Volatility</p>
                  <p className={`text-base font-bold ${Number(currentStats.change) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {currentStats.change}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black text-zinc-600 uppercase mb-1.5">Weekly High</p>
                  <p className="text-base font-bold text-green-500">{formatRS(currentStats.high)}</p>
                </div>
              </div>
            </div>

            {/* SELECTED DATE BOX - REDESIGNED & POSITIONED BELOW GRAPH */}
            {selectedPoint && (
              <div className="mt-8 bg-gradient-to-r from-[#1a1810] to-zinc-900 border-2 border-[#D4AF37]/30 rounded-[2.5rem] p-6 flex justify-between items-center animate-in slide-in-from-bottom-6 duration-500 shadow-2xl relative z-20">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-[#D4AF37]/15 rounded-3xl flex items-center justify-center border border-[#D4AF37]/20">
                    <Calendar className="w-7 h-7 text-[#D4AF37]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.2em] mb-1">Historical Data</p>
                    <p className="text-lg font-bold text-white leading-tight">{formatDateFull(selectedPoint.date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                   <div className="text-right">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Price Point</p>
                    <p className="text-3xl font-black bg-gradient-to-r from-[#D4AF37] to-yellow-600 bg-clip-text text-transparent">{formatRS(selectedPoint.price)}</p>
                   </div>
                   <button onClick={() => setSelectedPoint(null)} className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center hover:bg-zinc-700 transition-colors">
                     <X className="w-5 h-5 text-zinc-400" />
                   </button>
                </div>
              </div>
            )}
          </section>
        </main>
      ) : (
        <main className="px-6 relative z-10 animate-in fade-in zoom-in-95 duration-500">
          <div className="bg-gradient-to-b from-white/10 to-transparent border border-white/10 backdrop-blur-2xl rounded-[3.5rem] p-10 shadow-3xl">
            <div className="flex items-center gap-5 mb-12">
              <div className="w-14 h-14 bg-[#D4AF37]/20 rounded-[2rem] flex items-center justify-center border border-[#D4AF37]/30 shadow-inner">
                <Calculator className="w-7 h-7 text-[#D4AF37]" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Price Estimator</h2>
                <p className="text-zinc-500 text-sm">Real-time valuation engine</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-8">
              {['tola', 'aana', 'lal'].map((unit) => (
                <div key={unit}>
                  <label className="text-[11px] font-black text-zinc-500 uppercase mb-2 block ml-2 tracking-widest">{unit}</label>
                  <input 
                    type="number" 
                    placeholder="0"
                    className="w-full bg-black/40 border-2 border-zinc-800 p-5 rounded-3xl text-center font-black text-xl outline-none focus:border-[#D4AF37] transition-all"
                    value={calc[unit]}
                    onChange={(e) => setCalc({...calc, [unit]: e.target.value})}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-5 mb-10">
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-black text-zinc-500 uppercase ml-2 tracking-widest">Making Charges (Rs)</label>
                <input 
                  type="number" 
                  placeholder="Enter custom amount..."
                  className="w-full bg-black/40 border-2 border-zinc-800 p-5 rounded-3xl font-bold outline-none focus:border-[#D4AF37] placeholder:text-zinc-700"
                  value={calc.making}
                  onChange={(e) => setCalc({...calc, making: e.target.value})}
                />
              </div>
              <div 
                onClick={() => setCalc({...calc, vat: !calc.vat})}
                className="flex justify-between items-center p-6 bg-white/5 rounded-3xl border border-white/5 cursor-pointer active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${calc.vat ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-zinc-700'}`}>
                    {calc.vat && <Zap className="w-3.5 h-3.5 text-black fill-black" />}
                  </div>
                  <span className="font-bold text-zinc-300">Apply 13% Goverment VAT</span>
                </div>
                <Info className="w-5 h-5 text-zinc-600" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-[#D4AF37] via-yellow-500 to-yellow-600 p-10 rounded-[3rem] text-black text-center shadow-[0_25px_60px_rgba(212,175,55,0.4)] relative overflow-hidden group">
               <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
               <p className="text-[11px] font-black uppercase tracking-[0.3em] mb-2 opacity-60">Final Estimated Total</p>
               <h3 className="text-5xl font-black tracking-tighter">
                  {formatRS(( ( (Number(calc.tola)||0) + (Number(calc.aana)||0)/16 + (Number(calc.lal)||0)/192 ) * current[activeMetal] + (Number(calc.making)||0) ) * (calc.vat ? 1.13 : 1))}
               </h3>
            </div>
          </div>
        </main>
      )}

      {/* Modern Floating Bottom Navbar */}
      <nav className="fixed bottom-10 left-8 right-8 h-20 bg-zinc-900/60 backdrop-blur-[30px] rounded-[2.5rem] border border-white/10 flex justify-around items-center px-4 z-50 shadow-[0_30px_60px_rgba(0,0,0,0.8)]">
        <button 
          onClick={() => { setView('dashboard'); setSelectedPoint(null); }}
          className={`flex flex-col items-center gap-1.5 px-10 py-3.5 rounded-[1.8rem] transition-all duration-500 ${
            view === 'dashboard' ? 'bg-[#D4AF37] text-black shadow-[0_0_25px_rgba(212,175,55,0.4)]' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <LayoutDashboard className={`w-6 h-6 ${view === 'dashboard' ? 'fill-black' : ''}`} />
          <span className="text-[10px] font-black uppercase tracking-tighter">Market</span>
        </button>
        <button 
          onClick={() => { setView('calculator'); setSelectedPoint(null); }}
          className={`flex flex-col items-center gap-1.5 px-10 py-3.5 rounded-[1.8rem] transition-all duration-500 ${
            view === 'calculator' ? 'bg-[#D4AF37] text-black shadow-[0_0_25px_rgba(212,175,55,0.4)]' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Calculator className={`w-6 h-6 ${view === 'calculator' ? 'fill-black' : ''}`} />
          <span className="text-[10px] font-black uppercase tracking-tighter">Calc</span>
        </button>
      </nav>

    </div>
  );
}