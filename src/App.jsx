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

  const goldStats = getStats('gold');
  const tejabiStats = getStats('tejabi');
  const silverStats = getStats('silver');
  const currentStats = activeMetal === 'gold' ? goldStats : activeMetal === 'tejabi' ? tejabiStats : silverStats;

  const chartData = {
    labels: last7Days.map(d => d.date),
    datasets: [{
      data: last7Days.map(d => Number(d[activeMetal]) || 0),
      borderColor: activeMetal === 'gold' ? '#D4AF37' : activeMetal === 'tejabi' ? '#b8860b' : '#94a3b8',
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
        callbacks: {
          title: (items) => formatDateFull(items[0].label),
          label: (item) => `Rate: ${formatRS(item.raw)}`
        }
      }
    },
    scales: { x: { display: false }, y: { display: false } }
  };

  const calculateTotal = () => {
    const totalTola = (Number(calc.tola) || 0) + (Number(calc.aana) || 0) / 16 + (Number(calc.lal) || 0) / 192;
    const rate = Number(current[activeMetal]) || 0;
    const base = (totalTola * rate) + (Number(calc.making) || 0);
    return calc.vat ? base * 1.13 : base;
  };

  if (loading) return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
      <RefreshCcw className="w-8 h-8 text-[#D4AF37] animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans pb-24">
      
      <header className="p-6 pt-12 flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-3 h-3 text-[#D4AF37] fill-[#D4AF37]" />
            <p className="text-[#D4AF37] text-[10px] font-black uppercase tracking-widest">Nepal Gold Tracker</p>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Live Prices</h1>
        </div>
        <button onClick={() => window.location.reload()} className="w-12 h-12 bg-zinc-900 rounded-2xl border border-zinc-800 flex items-center justify-center active:scale-90 transition-transform">
          <RefreshCcw className="w-5 h-5 text-[#D4AF37]" />
        </button>
      </header>

      {view === 'dashboard' ? (
        <main className="px-5 space-y-4">
          
          {/* Prices Grid */}
          {[
            { id: 'gold', label: '24K Gold (Chhapawal)', stats: goldStats, color: 'border-[#D4AF37] bg-[#1a160a]' },
            { id: 'tejabi', label: '22K Gold (Tejabi)', stats: tejabiStats, color: 'border-yellow-700/50 bg-[#141108]' },
            { id: 'silver', label: 'Pure Silver', stats: silverStats, color: 'border-zinc-700 bg-zinc-900/40' }
          ].map((item) => (
            <div 
              key={item.id}
              onClick={() => { setActiveMetal(item.id); setSelectedPoint(null); }}
              className={`p-5 rounded-[1.8rem] border-2 transition-all cursor-pointer relative overflow-hidden ${
                activeMetal === item.id ? item.color : 'border-zinc-900 bg-zinc-900/20 opacity-60'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-black uppercase text-zinc-400">{item.label}</span>
                <div className={`flex items-center gap-1 text-xs font-bold ${Number(item.stats.change) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                   {item.stats.change}%
                </div>
              </div>
              <h2 className="text-3xl font-black">{formatRS(current[item.id])}</h2>
              <p className="text-zinc-600 text-[10px] font-bold mt-1">PER TOLA (11.66g)</p>
            </div>
          ))}

          {/* Chart Section */}
          <div className="pt-4">
            <h3 className="text-lg font-bold mb-4 px-1">7-Day Trend</h3>
            
            {selectedPoint && (
              <div className="bg-[#1c1910] border border-[#D4AF37]/30 rounded-3xl p-5 mb-5 flex justify-between items-center animate-in slide-in-from-top-4">
                <div>
                  <p className="text-[9px] font-black text-zinc-500 uppercase">Selected Date</p>
                  <p className="text-sm font-bold">{formatDateFull(selectedPoint.date)}</p>
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
              <div className="h-56">
                <Line data={chartData} options={chartOptions} />
              </div>
              <div className="flex justify-between mt-6 pt-6 border-t border-zinc-800/50">
                <div className="text-center">
                  <p className="text-[9px] font-black text-zinc-500 uppercase">Lowest</p>
                  <p className="text-sm font-bold text-blue-400">{formatRS(currentStats.low)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-black text-zinc-500 uppercase">Highest</p>
                  <p className="text-sm font-bold text-green-500">{formatRS(currentStats.high)}</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      ) : (
        <main className="px-5 pb-32">
          {/* Calculator */}
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-[2.5rem] p-8">
            <div className="flex items-center gap-4 mb-8">
              <Calculator className="w-6 h-6 text-[#D4AF37]" />
              <h2 className="text-2xl font-bold uppercase tracking-tight">Calculator</h2>
            </div>
            
            <div className="grid grid-cols-3 gap-3 mb-6">
              {['tola', 'aana', 'lal'].map((unit) => (
                <div key={unit}>
                  <label className="text-[9px] font-black text-zinc-500 uppercase mb-1 block ml-1">{unit}</label>
                  <input 
                    type="number" 
                    placeholder="0"
                    className="w-full bg-black border border-zinc-800 p-4 rounded-2xl text-center font-bold outline-none focus:border-[#D4AF37]"
                    value={calc[unit]}
                    onChange={(e) => setCalc({...calc, [unit]: e.target.value})}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-4 mb-8">
              <input 
                type="number" 
                placeholder="Making Charges (Rs)"
                className="w-full bg-black border border-zinc-800 p-4 rounded-2xl font-bold outline-none focus:border-[#D4AF37]"
                value={calc.making}
                onChange={(e) => setCalc({...calc, making: e.target.value})}
              />
              <div className="flex justify-between items-center p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
                <span className="text-sm font-bold text-zinc-400">Include 13% VAT</span>
                <input type="checkbox" checked={calc.vat} onChange={() => setCalc({...calc, vat: !calc.vat})} className="w-6 h-6 accent-[#D4AF37]"/>
              </div>
            </div>

            <div className="bg-[#D4AF37] p-8 rounded-[2rem] text-black text-center shadow-xl">
              <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">Total Valuation</p>
              <h3 className="text-4xl font-black">{formatRS(calculateTotal())}</h3>
            </div>
          </div>
        </main>
      )}

      {/* Navigation */}
      <nav className="fixed bottom-6 left-6 right-6 h-20 bg-zinc-900/90 backdrop-blur-xl rounded-[2rem] border border-zinc-800/50 flex justify-around items-center px-4 z-50">
        <button 
          onClick={() => setView('dashboard')}
          className={`flex flex-col items-center gap-1 px-8 py-3 rounded-2xl transition-all ${view === 'dashboard' ? 'bg-[#D4AF37]/10 text-[#D4AF37]' : 'text-zinc-500'}`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[9px] font-black uppercase">Dashboard</span>
        </button>
        <button 
          onClick={() => setView('calculator')}
          className={`flex flex-col items-center gap-1 px-8 py-3 rounded-2xl transition-all ${view === 'calculator' ? 'bg-[#D4AF37]/10 text-[#D4AF37]' : 'text-zinc-500'}`}
        >
          <Calculator className="w-5 h-5" />
          <span className="text-[9px] font-black uppercase">Calculator</span>
        </button>
      </nav>
    </div>
  );
}