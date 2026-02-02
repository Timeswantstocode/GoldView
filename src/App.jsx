import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { 
  Chart as ChartJS, registerables, Filler, Tooltip, 
  Legend, CategoryScale, LinearScale, PointElement, LineElement 
} from 'chart.js';
import { 
  LayoutDashboard, Calculator, RefreshCcw, TrendingUp, 
  ChevronRight, X, Calendar, Info, Zap
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

  const formatRS = (num) => `रू ${Math.round(num).toLocaleString()}`;
  
  const formatDateFull = (str) => {
    if (!str) return "";
    const d = new Date(str.replace(' ', 'T'));
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  const last7Days = useMemo(() => priceData.slice(-7), [priceData]);
  const current = priceData[priceData.length - 1] || { gold: 0, silver: 0, date: "" };

  const getStats = (metal) => {
    const values = last7Days.map(d => Number(d[metal]) || 0);
    if (values.length === 0) return { low: 0, high: 0, change: "0.00" };
    const low = Math.min(...values);
    const high = Math.max(...values);
    const change = values.length > 1 ? (((values[values.length-1] - values[0]) / values[0]) * 100).toFixed(2) : "0.00";
    return { low, high, change };
  };

  const goldStats = getStats('gold');
  const silverStats = getStats('silver');
  const currentStats = activeMetal === 'gold' ? goldStats : silverStats;

  const chartData = {
    labels: last7Days.map(d => d.date),
    datasets: [{
      data: last7Days.map(d => d[activeMetal]),
      borderColor: activeMetal === 'gold' ? '#D4AF37' : '#94a3b8',
      borderWidth: 3,
      pointBackgroundColor: activeMetal === 'gold' ? '#D4AF37' : '#94a3b8',
      pointBorderColor: '#000',
      pointBorderWidth: 2,
      pointRadius: (ctx) => (selectedPoint?.index === ctx.dataIndex ? 8 : 0),
      pointHoverRadius: 10,
      fill: true,
      tension: 0.4,
      backgroundColor: (context) => {
        const ctx = context.chart.ctx;
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, activeMetal === 'gold' ? 'rgba(212, 175, 55, 0.25)' : 'rgba(148, 163, 184, 0.15)');
        gradient.addColorStop(1, 'transparent');
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
        backgroundColor: '#18181b',
        titleFont: { size: 12, weight: 'bold' },
        bodyFont: { size: 14 },
        padding: 12,
        displayColors: false,
        callbacks: {
          title: (items) => formatDateFull(items[0].label),
          label: (item) => `Price: ${formatRS(item.raw)}`
        }
      }
    },
    scales: { x: { display: false }, y: { display: false } }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
      <RefreshCcw className="w-8 h-8 text-[#D4AF37] animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans">
      
      {/* Top Header */}
      <header className="p-6 pt-12 flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-3 h-3 text-[#D4AF37] fill-[#D4AF37]" />
            <p className="text-[#D4AF37] text-[10px] font-black uppercase tracking-widest">Live GoldView • NP</p>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Market Rates</h1>
        </div>
        <button onClick={() => window.location.reload()} className="w-12 h-12 bg-zinc-900 rounded-2xl border border-zinc-800 flex items-center justify-center active:scale-90 transition-transform">
          <RefreshCcw className="w-5 h-5 text-[#D4AF37]" />
        </button>
      </header>

      {view === 'dashboard' ? (
        <main className="px-5 pb-32 animate-in fade-in duration-500">
          
          {/* Prices Grid */}
          <div className="grid grid-cols-1 gap-4 mb-8">
            <div 
              onClick={() => setActiveMetal('gold')}
              className={`p-6 rounded-[2rem] border-2 transition-all cursor-pointer relative overflow-hidden ${
                activeMetal === 'gold' ? 'border-[#D4AF37] bg-[#1a160a]' : 'border-zinc-900 bg-zinc-900/40'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <span className={`text-[10px] font-black uppercase p-1 px-2 rounded-md ${activeMetal === 'gold' ? 'bg-[#D4AF37] text-black' : 'bg-zinc-800 text-zinc-400'}`}>24K Gold</span>
                <div className={`flex items-center gap-1 text-xs font-bold ${Number(goldStats.change) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  <TrendingUp className="w-3 h-3" /> {goldStats.change}%
                </div>
              </div>
              <h2 className="text-4xl font-black mb-1">{formatRS(current.gold)}</h2>
              <p className="text-zinc-500 text-[10px] font-bold">PER TOLA (11.66g) • FINE GOLD</p>
            </div>

            <div 
              onClick={() => setActiveMetal('silver')}
              className={`p-6 rounded-[2rem] border-2 transition-all cursor-pointer ${
                activeMetal === 'silver' ? 'border-zinc-400 bg-zinc-800/50' : 'border-zinc-900 bg-zinc-900/40'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <span className={`text-[10px] font-black uppercase p-1 px-2 rounded-md ${activeMetal === 'silver' ? 'bg-zinc-200 text-black' : 'bg-zinc-800 text-zinc-400'}`}>Silver</span>
                <div className={`flex items-center gap-1 text-xs font-bold ${Number(silverStats.change) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  <TrendingUp className="w-3 h-3" /> {silverStats.change}%
                </div>
              </div>
              <h2 className="text-4xl font-black mb-1">{formatRS(current.silver)}</h2>
              <p className="text-zinc-500 text-[10px] font-bold">PER TOLA • PURE SILVER</p>
            </div>
          </div>

          {/* Chart Header */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold">7-Day History</h3>
            <span className="text-[10px] font-black bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-full text-zinc-400">DAILY TREND</span>
          </div>

          {/* Chart Area */}
          <section className="relative">
            {selectedPoint && (
              <div className="bg-[#1c1910] border border-[#D4AF37]/30 rounded-3xl p-5 mb-5 flex justify-between items-center animate-in slide-in-from-top-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-[#D4AF37]" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-zinc-500 uppercase">Selected Date</p>
                    <p className="text-sm font-bold text-zinc-100">{formatDateFull(selectedPoint.date)}</p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-4">
                   <div>
                    <p className="text-[9px] font-black text-zinc-500 uppercase">Rate</p>
                    <p className="text-xl font-black text-[#D4AF37]">{formatRS(selectedPoint.price)}</p>
                   </div>
                   <button onClick={() => setSelectedPoint(null)} className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center">
                     <X className="w-4 h-4" />
                   </button>
                </div>
              </div>
            )}

            <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-[2.5rem] p-6">
              <div className="h-60">
                <Line data={chartData} options={chartOptions} />
              </div>
              <div className="flex justify-between mt-8 pt-6 border-t border-zinc-800/50">
                <div className="text-center">
                  <p className="text-[9px] font-black text-zinc-500 uppercase mb-1">Lowest</p>
                  <p className="text-sm font-bold text-blue-400">{formatRS(currentStats.low)}</p>
                </div>
                <div className="text-center px-8 border-x border-zinc-800/50">
                  <p className="text-[9px] font-black text-zinc-500 uppercase mb-1">Change</p>
                  <p className={`text-sm font-bold ${Number(currentStats.change) >= 0 ? 'text-green-500' : 'text-red-500'}`}>{currentStats.change}%</p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-black text-zinc-500 uppercase mb-1">Highest</p>
                  <p className="text-sm font-bold text-green-500">{formatRS(currentStats.high)}</p>
                </div>
              </div>
            </div>
          </section>

        </main>
      ) : (
        <main className="px-5 pb-32 animate-in fade-in duration-500">
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-[2.5rem] p-8">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 bg-[#D4AF37]/10 rounded-2xl flex items-center justify-center">
                <Calculator className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <h2 className="text-2xl font-bold">Price Calculator</h2>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {['tola', 'aana', 'lal'].map((unit) => (
                <div key={unit} className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">{unit}</label>
                  <input 
                    type="number" 
                    placeholder="0"
                    className="w-full bg-black border border-zinc-800 p-4 rounded-2xl text-center font-bold outline-none focus:border-[#D4AF37] transition-colors"
                    value={calc[unit]}
                    onChange={(e) => setCalc({...calc, [unit]: e.target.value})}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-4 mb-8">
               <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Making Charges (Rs)</label>
                  <input 
                    type="number" 
                    placeholder="Enter amount..."
                    className="w-full bg-black border border-zinc-800 p-4 rounded-2xl font-bold outline-none focus:border-[#D4AF37]"
                    value={calc.making}
                    onChange={(e) => setCalc({...calc, making: e.target.value})}
                  />
               </div>
               <div className="flex justify-between items-center p-5 bg-zinc-900/50 rounded-2xl border border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-zinc-500" />
                    <span className="text-sm font-bold">Include 13% VAT</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={calc.vat} 
                    onChange={() => setCalc({...calc, vat: !calc.vat})}
                    className="w-6 h-6 accent-[#D4AF37]"
                  />
               </div>
            </div>

            <div className="bg-[#D4AF37] p-8 rounded-[2.5rem] text-black text-center shadow-[0_20px_50px_rgba(212,175,55,0.2)]">
               <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-60">Estimate Valuation</p>
               <h3 className="text-4xl font-black">{formatRS(( ( (Number(calc.tola)||0) + (Number(calc.aana)||0)/16 + (Number(calc.lal)||0)/192 ) * current[activeMetal] + (Number(calc.making)||0) ) * (calc.vat ? 1.13 : 1))}</h3>
            </div>
          </div>
        </main>
      )}

      {/* Bottom Navbar */}
      <nav className="fixed bottom-8 left-6 right-6 h-20 bg-zinc-900/80 backdrop-blur-xl rounded-[2rem] border border-zinc-800 flex justify-around items-center px-4 z-50 shadow-2xl">
        <button 
          onClick={() => setView('dashboard')}
          className={`flex flex