import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, registerables, Filler, Tooltip } from 'chart.js';

ChartJS.register(...registerables, Filler, Tooltip);

const DATA_URL = "https://raw.githubusercontent.com/Timeswantstocode/GoldView/main/data.json";

// 1. DUMMY DATA (Fallback if GitHub is empty or link fails)
const DUMMY_DATA = [
  { "date": "2024-05-15 11:00:00", "gold": 138000, "silver": 1700 },
  { "date": "2024-05-16 11:00:00", "gold": 138500, "silver": 1710 },
  { "date": "2024-05-17 11:00:00", "gold": 139000, "silver": 1730 },
  { "date": "2024-05-18 11:00:00", "gold": 137500, "silver": 1705 },
  { "date": "2024-05-19 11:00:00", "gold": 138200, "silver": 1720 },
  { "date": "2024-05-20 11:00:00", "gold": 140000, "silver": 1740 },
  { "date": "2024-05-21 11:00:00", "gold": 141000, "silver": 1750 }
];

const formatDate = (dateStr) => {
  const date = new Date(dateStr.replace(' ', 'T'));
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
};

const getShortDate = (dateStr) => {
  const date = new Date(dateStr.replace(' ', 'T'));
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function App() {
  const [priceData, setPriceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('dashboard');
  const [activeMetal, setActiveMetal] = useState('gold');
  const [calc, setCalc] = useState({ tola: '', aana: '', lal: '', making: '', vat: true });
  const [selectedPoint, setSelectedPoint] = useState(null);
  const chartRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${DATA_URL}?t=${new Date().getTime()}`);
        if (!response.ok) throw new Error("404 Not Found");
        const json = await response.json();
        
        if (json && json.length > 0) {
          setPriceData(json);
        } else {
          setPriceData(DUMMY_DATA);
        }
      } catch (error) {
        console.warn("Using Dummy Data because GitHub file is not ready yet.");
        setPriceData(DUMMY_DATA);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading || priceData.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-[#D4AF37]">
        <div className="text-center animate-pulse font-black uppercase">Loading GoldView...</div>
      </div>
    );
  }

  const last7Days = priceData.slice(-7);
  const current = priceData[priceData.length - 1];
  const currentTime = new Date(current.date.replace(' ', 'T'));
  const timeString = currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const getStats = (metal) => {
    const values = last7Days.map(d => metal === 'gold' ? d.gold : d.silver);
    const low = Math.min(...values);
    const high = Math.max(...values);
    const first = values[0];
    const last = values[values.length - 1];
    const change = first > 0 ? ((last - first) / first * 100).toFixed(2) : 0;
    return { low, high, change };
  };

  const goldStats = getStats('gold');
  const silverStats = getStats('silver');

  const calculateTotal = () => {
    const totalTola = (Number(calc.tola) || 0) + (Number(calc.aana) || 0) / 16 + (Number(calc.lal) || 0) / 192;
    const rate = activeMetal === 'gold' ? current.gold : current.silver;
    const metalPrice = totalTola * rate;
    const total = metalPrice + (Number(calc.making) || 0);
    return calc.vat ? total * 1.13 : total;
  };

  const chartData = useMemo(() => {
    const isGold = activeMetal === 'gold';
    const accent = isGold ? '#D4AF37' : '#94a3b8';
    return {
      labels: last7Days.map(d => d.date),
      datasets: [{
        data: last7Days.map(d => isGold ? d.gold : d.silver),
        borderColor: accent,
        borderWidth: 3,
        pointRadius: 0,
        tension: 0.4,
        fill: true,
        backgroundColor: 'rgba(212, 175, 55, 0.1)'
      }]
    };
  }, [activeMetal, priceData]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans pb-32">
      <header className="p-5 pt-10">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[#D4AF37] text-[10px] font-bold uppercase tracking-[0.15em]">Nepal Gold Tracker</p>
            <h1 className="text-2xl font-bold mt-1">Live Prices</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-zinc-500 text-xs">Last updated: {timeString}</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-green-500 text-xs">Live</span>
              </span>
            </div>
          </div>
        </div>
      </header>

      {view === 'dashboard' ? (
        <main className="px-4 space-y-3">
          {/* Gold Card */}
          <div onClick={() => setActiveMetal('gold')} className={`p-5 rounded-2xl border transition-all ${activeMetal === 'gold' ? 'border-[#D4AF37]/50 bg-[#1a1508]' : 'border-zinc-800/50 bg-[#111]'}`}>
            <p className="text-[#D4AF37] font-semibold text-sm">24K Gold (Chhapawal)</p>
            <h2 className="text-3xl font-bold mt-3">Rs. {current.gold.toLocaleString()}</h2>
            <p className="text-zinc-600 text-xs">per Tola (11.66g)</p>
          </div>

          {/* Silver Card */}
          <div onClick={() => setActiveMetal('silver')} className={`p-5 rounded-2xl border transition-all ${activeMetal === 'silver' ? 'border-slate-400/30 bg-[#12141a]' : 'border-zinc-800/50 bg-[#111]'}`}>
            <p className="text-slate-300 font-semibold text-sm">Silver</p>
            <h2 className="text-3xl font-bold mt-3">Rs. {current.silver.toLocaleString()}</h2>
            <p className="text-zinc-600 text-xs">per Tola (11.66g)</p>
          </div>

          {/* Chart */}
          <section className="bg-[#111] rounded-2xl p-5 border border-zinc-800/50 mt-4">
            <p className="font-semibold text-sm text-zinc-300 mb-4">7 Day Trend</p>
            <div className="h-44">
              <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } }} />
            </div>
            <div className="flex justify-between mt-4">
              <div className="text-center">
                <p className="text-zinc-500 text-[10px] uppercase">Low</p>
                <p className="text-blue-400 text-sm font-semibold">Rs. {goldStats.low.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-zinc-500 text-[10px] uppercase">High</p>
                <p className="text-green-400 text-sm font-semibold">Rs. {goldStats.high.toLocaleString()}</p>
              </div>
            </div>
          </section>
        </main>
      ) : (
        <main className="px-4">
          <div className="bg-[#111] p-6 rounded-2xl border border-zinc-800/50">
            <h3 className="text-[#D4AF37] font-bold text-center mb-8 uppercase text-sm">Calculator</h3>
            <div className="grid grid-cols-3 gap-3 mb-5">
              <input type="number" placeholder="Tola" className="bg-black p-3 rounded-xl border border-zinc-800 text-center" value={calc.tola} onChange={e => setCalc({...calc, tola: e.target.value})}/>
              <input type="number" placeholder="Aana" className="bg-black p-3 rounded-xl border border-zinc-800 text-center" value={calc.aana} onChange={e => setCalc({...calc, aana: e.target.value})}/>
              <input type="number" placeholder="Lal" className="bg-black p-3 rounded-xl border border-zinc-800 text-center" value={calc.lal} onChange={e => setCalc({...calc, lal: e.target.value})}/>
            </div>
            <div className="bg-[#D4AF37] p-6 rounded-2xl text-black text-center">
              <p className="text-3xl font-bold">रू {calculateTotal().toLocaleString()}</p>
            </div>
          </div>
        </main>
      )}

      {/* Navigation */}
      <nav className="fixed bottom-6 left-4 right-4 h-16 bg-[#111]/95 rounded-2xl border border-zinc-800 flex justify-around items-center">
        <button onClick={() => setView('dashboard')} className={`text-xs font-bold ${view === 'dashboard' ? 'text-[#D4AF37]' : 'text-zinc-500'}`}>Dashboard</button>
        <button onClick={() => setView('calculator')} className={`text-xs font-bold ${view === 'calculator' ? 'text-[#D4AF37]' : 'text-zinc-500'}`}>Calculator</button>
      </nav>
    </div>
  );
}