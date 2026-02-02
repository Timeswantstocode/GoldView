import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { 
  Chart as ChartJS, registerables, Filler, Tooltip, 
  Legend, CategoryScale, LinearScale, PointElement, LineElement 
} from 'chart.js';
import { 
  LayoutDashboard, Calculator, RefreshCcw, TrendingUp, 
  ChevronRight, X, Info, Calendar 
} from 'lucide-react';

ChartJS.register(...registerables, Filler, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement);

const DATA_URL = "https://raw.githubusercontent.com/Timeswantstocode/GoldView/main/data.json";

// Fallback for initial load
const DUMMY_DATA = [{ "date": "2024-01-30 11:00:00", "gold": 318000, "silver": 7000 }];

export default function App() {
  const [priceData, setPriceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('dashboard');
  const [activeMetal, setActiveMetal] = useState('gold');
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [calc, setCalc] = useState({ tola: '', aana: '', lal: '', making: '', vat: true });
  const chartRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${DATA_URL}?t=${Date.now()}`);
        const json = await res.json();
        setPriceData(Array.isArray(json) ? json : DUMMY_DATA);
      } catch (e) {
        setPriceData(DUMMY_DATA);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Formatters
  const formatRS = (num) => `रू ${Math.round(num).toLocaleString()}`;
  const formatDateFull = (str) => {
    const d = new Date(str?.replace(' ', 'T'));
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  if (loading || priceData.length === 0) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCcw className="w-8 h-8 text-[#D4AF37] animate-spin" />
          <p className="text-[#D4AF37] font-bold tracking-widest text-xs uppercase">Initializing GoldView</p>
        </div>
      </div>
    );
  }

  const current = priceData[priceData.length - 1];
  const last7Days = priceData.slice(-7);

  // Stats Logic
  const getStats = (metal) => {
    const values = last7Days.map(d => Number(d[metal]) || 0);
    const low = Math.min(...values);
    const high = Math.max(...values);
    const change = values.length > 1 ? (((values[values.length-1] - values[0]) / values[0]) * 100).toFixed(2) : "0.00";
    return { low, high, change };
  };

  const goldStats = getStats('gold');
  const silverStats = getStats('silver');
  const currentStats = activeMetal === 'gold' ? goldStats : silverStats;

  // Chart Configuration
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
      pointHoverRadius: 8,
      fill: true,
      tension: 0.4,
      backgroundColor: (context) => {
        const ctx = context.chart.ctx;
        const gradient = ctx.createLinearGradient(0, 0, 0, 200);
        gradient.addColorStop(0, activeMetal === 'gold' ? 'rgba(212, 175, 55, 0.2)' : 'rgba(148, 163, 184, 0.1)');
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
        setSelectedPoint({
          index,
          date: point.date,
          price: point[activeMetal]
        });
      }
    },
    plugins: {
      legend: false,
      tooltip: {
        enabled: true,
        backgroundColor: '#111',
        titleColor: '#D4AF37',
        bodyColor: '#fff',
        padding: 12,
        displayColors: false,
        callbacks: {
          title: (items) => formatDateFull(items[0].label),
          label: (item) => `Price: ${formatRS(item.raw)}`
        }
      }
    },
    scales: {
      x: { display: false },
      y: { display: false }
    }
  };

  const calculateTotal = () => {
    const totalTola = (Number(calc.tola) || 0) + (Number(calc.aana) || 0) / 16 + (Number(calc.lal) || 0) / 192;
    const rate = current[activeMetal];
    const base = (totalTola * rate) + (Number(calc.making) || 0);
    return calc.vat ? base * 1.13 : base;
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#e0e0e0] font-sans selection:bg-[#D4AF37]/30">
      
      {/* Header */}
      <header className="p-6 pt-12 flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
            <p className="text-[#D4AF37] text-[10px] font-black uppercase tracking-[0.2em]">Live Market • NPT</p>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Market View</h1>
        </div>
        <button onClick={() => window.location.reload()} className="p-3 bg-zinc-900 rounded-full border border-zinc-800 active:scale-95 transition-all">
          <RefreshCcw className="w-5 h-5 text-[#D4AF37]" />
        </button>
      </header>

      {view === 'dashboard' ? (
        <main className="px-5 pb-32 space-y-4">
          
          {/* Metal Toggle Cards */}
          <div className="grid grid-cols-1 gap-3">
            {[
              { id: 'gold', label: '24K Chhapawal Gold', stats: goldStats, color: 'border-[#D4AF37] bg-[#0d0c08]' },
              { id: 'silver', label: 'Pure Silver', stats: silverStats, color: 'border-zinc-700 bg-[#0c0c0d]' }
            ].map(metal => (
              <div 
                key={metal.id}
                onClick={() => { setActiveMetal(metal.id); setSelectedPoint(null); }}
                className={`p-5 rounded-3xl border-2 transition-all duration-300 relative overflow-hidden group ${
                  activeMetal === metal.id ? metal.color : 'border-zinc-900 bg-zinc-900/30'
                }`}
              >
                <div className="flex justify-between items-start relative z-10">
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${activeMetal === metal.id ? 'text-[#D4AF37]' : 'text-zinc-500'}`}>
                      {metal.label}
                    </p>
                    <h2 className="text-3xl font-black">{formatRS(current[metal.id])}</h2>
                  </div>
                  <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold ${
                    Number(metal.stats.change) >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                  }`}>
                    <TrendingUp className={`w-3 h-3 ${Number(metal.stats.change) < 0 && 'rotate-180'}`} />
                    {metal.stats.change}%
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-zinc-500 text-[10px] font-medium uppercase tracking-tight">
                  <span>Per Tola (11.66g)</span>
                  <ChevronRight className={`w-4 h-4 transition-transform ${activeMetal === metal.id ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0'}`} />
                </div>
              </div>
            ))}
          </div>

          {/* Price History Section */}
          <section className="mt-8">
            <div className="flex justify-between items-end mb-4 px-1">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  Price History <TrendingUp className="w-4 h-4 text-green-500" />
                </h3>
                <p className="text-zinc-500 text-[11px]">Click on chart to view details</p>
              </div>
              <div className="bg-zinc-900 px-3 py-1.5 rounded-full text-[10px] font-bold text-[#D4AF37] border border-zinc-800">
                LAST 7 DAYS
              </div>
            </div>

            {/* Selection Overlay (The part you requested) */}
            {selectedPoint && (
              <div className="bg-[#15130d] border border-[#D4AF37]/30 rounded-2xl p-4 mb-4 animate-in fade-in slide-in-from-top-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#D4AF37]/10 rounded-lg">
                      <Calendar className="w-4 h-4 text-[#D4AF37]" />
                    </div>
                    <div>
                      <p className="text-[9px] text-zinc-500 uppercase font-black">Selected Date</p>
                      <p className="text-sm font-bold">{formatDateFull(selectedPoint.date)}</p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    <div>
                      <p className="text-[9px] text-zinc-500 uppercase font-black text-right">Price</p>
                      <p className="text-lg font-black text-[#D4AF37]">{formatRS(selectedPoint.price)}</p>
                    </div>
                    <button onClick={() => setSelectedPoint(null)} className="p-1 bg-zinc-800 rounded-full hover:bg-zinc-700">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Interactive Graph */}
            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2.5rem] p-6 relative">
              <div className="h-56">
                <Line ref={chartRef} data={chartData} options={chartOptions} />
              </div>
              
              <div className="flex justify-between mt-6 pt-6 border-t border-zinc-800/50">
                <div className="text-center">
                  <p className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Lowest</p>
                  <p className="text-sm font-bold text-blue-400">{formatRS(currentStats.low)}</p>
                </div>
                <div className="text-center px-6 border-x border-zinc-800/50">
                  <p className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Range</p>
                  <p className={`text-sm font-bold ${Number(currentStats.change) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {currentStats.change}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Highest</p>
                  <p className="text-sm font-bold text-green-500">{formatRS(currentStats.high)}</p>
                </div>
              </div>
            </div>
          </section>
        </main>
      ) : (
        <main className="px-5 pb-32">
          {/* Calculator View */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-[#D4AF37]/10 rounded-2xl">
                <Calculator className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Gold Calculator</h2>
                <p className="text-zinc-500 text-xs">Based on current market rate</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              {['tola', 'aana', 'lal'].map((unit) => (
                <div key={unit} className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">{unit}</label>
                  <input 
                    type="number" 
                    placeholder="0"
                    className="w-full bg-black border border-zinc-800 p-4 rounded-2xl text-center font-bold focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none transition-all"
                    value={calc[unit]}
                    onChange={(e) => setCalc({...calc, [unit]: e.target.value})}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Making Charges (Rs)</label>
                <input 
                  type="number" 
                  placeholder="Enter amount..."
                  className="w-full bg-black border border-zinc-800 p-4 rounded-2xl font-bold focus:border-[#D4AF37] outline-none"
                  value={calc.making}
                  onChange={(e) => setCalc({...calc, making: e.target.value})}
                />
              </div>

              <div className="flex justify-between items-center p-4 bg-zinc-900 rounded-2xl">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-zinc-500" />
                  <span className="text-sm font-medium">Include 13% VAT</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={calc.vat} 
                  onChange={() => setCalc({...calc, vat: !calc.vat})}
                  className="w-6 h-6 accent-[#D4AF37]"
                />
              </div>
            </div>

            <div className="mt-8 bg-gradient-to-br from-[#D4AF37] to-[#b8960c] p-8 rounded-[2rem] text-black text-center shadow-[0_20px_40px_rgba(212,175,55,0.2)]">
              <p className="text-[10px] font-black uppercase opacity-60 mb-2 tracking-widest">Total Valuation</p>
              <h3 className="text-4xl font-black">{formatRS(calculateTotal())}</h3>
              <p className="text-[10px] mt-2 font-bold opacity-60">Rates updated live from FENEGOSIDA</p>
            </div>
          </div>
        </main>
      )}

      {/* Modern Bottom Navigation */}
      <nav className="fixed bottom-8 left-6 right-6 h-20 bg-zinc-900/80 backdrop-blur-2xl rounded-3xl border border-zinc-800/50 flex justify-around items-center px-4 shadow-2xl z-50">
        <button 
          onClick={() => setView('dashboard')} 
          className={`flex flex-col items-center gap-1.5 transition-all px-8 py-3 rounded-2xl ${
            view === 'dashboard' ? 'bg-[#D4AF37]/10 text-[#D4AF37]' : 'text-zinc-500'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] font-black uppercase tracking-tighter">Dashboard</span>
        </button>
        <button 
          onClick={() => setView('calculator')} 
          className={`flex flex-col items-center gap-1.5 transition-all px-8 py-3 rounded-2xl ${
            view === 'calculator' ? 'bg-[#D4AF37]/10 text-[#D4AF37]' : 'text-zinc-500'
          }`}
        >
          <Calculator className="w-5 h-5" />
          <span className="text-[10px] font-black uppercase tracking-tighter">Calculator</span>
        </button>
      </nav>
    </div>
  );
}