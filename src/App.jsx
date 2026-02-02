import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, registerables, Filler, Tooltip } from 'chart.js';

ChartJS.register(...registerables, Filler, Tooltip);

const DATA_URL = "https://raw.githubusercontent.com/Timeswantstocode/GoldView/main/data.json";

// Dummy data as a fallback
const DUMMY_DATA = [
  { "date": "2024-05-20 11:00:00", "gold": 140000, "silver": 1740 },
  { "date": "2024-05-21 11:00:00", "gold": 141000, "silver": 1750 }
];

export default function App() {
  const [priceData, setPriceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('dashboard');
  const [activeMetal, setActiveMetal] = useState('gold');
  const [calc, setCalc] = useState({ tola: '', aana: '', lal: '', making: '', vat: true });
  const chartRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${DATA_URL}?t=${new Date().getTime()}`);
        if (!response.ok) throw new Error("Data not found");
        const json = await response.json();
        setPriceData(Array.isArray(json) && json.length > 0 ? json : DUMMY_DATA);
      } catch (error) {
        console.warn("Using dummy data");
        setPriceData(DUMMY_DATA);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // 1. Loading State
  if (loading || !priceData || priceData.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-[#D4AF37]">
        <div className="text-center animate-pulse font-bold uppercase tracking-widest">
          Loading Gold View...
        </div>
      </div>
    );
  }

  // 2. Safety variables (Optional Chaining prevents crashes)
  const current = priceData[priceData.length - 1] || DUMMY_DATA[0];
  const last7Days = priceData.slice(-7);
  
  const safeDate = (dateStr) => {
    try {
      const d = new Date(dateStr?.replace(' ', 'T') || new Date());
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } catch (e) { return "11:00 AM"; }
  };

  const getStats = (metal) => {
    try {
      const values = last7Days.map(d => Number(metal === 'gold' ? d.gold : d.silver) || 0);
      return {
        low: Math.min(...values) || 0,
        high: Math.max(...values) || 0,
        change: values.length > 1 ? (((values[values.length-1] - values[0]) / values[0]) * 100).toFixed(2) : "0.00"
      };
    } catch (e) { return { low: 0, high: 0, change: "0.00" }; }
  };

  const goldStats = getStats('gold');
  const silverStats = getStats('silver');
  const currentStats = activeMetal === 'gold' ? goldStats : silverStats;

  const calculateTotal = () => {
    const totalTola = (Number(calc.tola) || 0) + (Number(calc.aana) || 0) / 16 + (Number(calc.lal) || 0) / 192;
    const rate = Number(activeMetal === 'gold' ? current?.gold : current?.silver) || 0;
    const metalPrice = totalTola * rate;
    const total = metalPrice + (Number(calc.making) || 0);
    return calc.vat ? total * 1.13 : total;
  };

  const chartData = {
    labels: last7Days.map(d => d.date?.split(' ')[0] || ""),
    datasets: [{
      data: last7Days.map(d => Number(activeMetal === 'gold' ? d.gold : d.silver) || 0),
      borderColor: activeMetal === 'gold' ? '#D4AF37' : '#94a3b8',
      fill: true,
      backgroundColor: 'rgba(212, 175, 55, 0.05)',
      tension: 0.4,
      pointRadius: 0
    }]
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans pb-32">
      <header className="p-6 pt-10">
        <p className="text-[#D4AF37] text-[10px] font-bold uppercase tracking-widest">Nepal Gold Tracker</p>
        <h1 className="text-2xl font-bold">Live Prices</h1>
        <p className="text-zinc-500 text-xs mt-1">Updated: {safeDate(current?.date)}</p>
      </header>

      {view === 'dashboard' ? (
        <main className="px-4 space-y-4">
          {/* Gold Card */}
          <div onClick={() => setActiveMetal('gold')} className={`p-5 rounded-2xl border transition-all ${activeMetal === 'gold' ? 'border-[#D4AF37] bg-[#1a1508]' : 'border-zinc-800 bg-[#111]'}`}>
            <div className="flex justify-between items-start">
              <span className="text-[#D4AF37] text-sm font-bold">24K Gold</span>
              <span className={`text-xs font-bold ${Number(goldStats.change) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {goldStats.change}%
              </span>
            </div>
            <h2 className="text-3xl font-bold mt-2">Rs. {(Number(current?.gold) || 0).toLocaleString()}</h2>
            <p className="text-zinc-500 text-[10px] mt-1">Per Tola (11.66g)</p>
          </div>

          {/* Silver Card */}
          <div onClick={() => setActiveMetal('silver')} className={`p-5 rounded-2xl border transition-all ${activeMetal === 'silver' ? 'border-slate-400 bg-[#12141a]' : 'border-zinc-800 bg-[#111]'}`}>
            <div className="flex justify-between items-start">
              <span className="text-slate-300 text-sm font-bold">Silver</span>
              <span className={`text-xs font-bold ${Number(silverStats.change) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {silverStats.change}%
              </span>
            </div>
            <h2 className="text-3xl font-bold mt-2">Rs. {(Number(current?.silver) || 0).toLocaleString()}</h2>
            <p className="text-zinc-500 text-[10px] mt-1">Per Tola (11.66g)</p>
          </div>

          {/* Trend Chart */}
          <div className="bg-[#111] p-5 rounded-2xl border border-zinc-800">
            <p className="text-xs font-bold text-zinc-400 mb-4 uppercase">7 Day Trend</p>
            <div className="h-40">
              <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: false }, scales: { x: { display: false }, y: { display: false } } }} />
            </div>
            <div className="flex justify-between mt-4 pt-4 border-t border-zinc-800">
              <div className="text-center">
                <p className="text-[9px] text-zinc-500 uppercase">Low</p>
                <p className="text-xs font-bold text-blue-400">Rs. {currentStats.low.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-zinc-500 uppercase">High</p>
                <p className="text-xs font-bold text-green-400">Rs. {currentStats.high.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </main>
      ) : (
        <main className="px-4">
          {/* Calculator */}
          <div className="bg-[#111] p-6 rounded-2xl border border-zinc-800">
            <div className="flex gap-2 mb-6">
              <button onClick={() => setActiveMetal('gold')} className={`flex-1 py-3 rounded-xl font-bold text-xs ${activeMetal === 'gold' ? 'bg-[#D4AF37] text-black' : 'bg-zinc-800 text-zinc-500'}`}>GOLD</button>
              <button onClick={() => setActiveMetal('silver')} className={`flex-1 py-3 rounded-xl font-bold text-xs ${activeMetal === 'silver' ? 'bg-slate-400 text-black' : 'bg-zinc-800 text-zinc-500'}`}>SILVER</button>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <input type="number" placeholder="Tola" className="bg-black border border-zinc-800 p-3 rounded-xl text-center outline-none" value={calc.tola} onChange={e => setCalc({...calc, tola: e.target.value})} />
              <input type="number" placeholder="Aana" className="bg-black border border-zinc-800 p-3 rounded-xl text-center outline-none" value={calc.aana} onChange={e => setCalc({...calc, aana: e.target.value})} />
              <input type="number" placeholder="Lal" className="bg-black border border-zinc-800 p-3 rounded-xl text-center outline-none" value={calc.lal} onChange={e => setCalc({...calc, lal: e.target.value})} />
            </div>
            <div className="flex justify-between items-center bg-[#D4AF37] p-6 rounded-2xl text-black">
              <span className="font-bold text-sm uppercase">Total</span>
              <span className="text-2xl font-black">रू {Math.round(calculateTotal()).toLocaleString()}</span>
            </div>
          </div>
        </main>
      )}

      {/* Nav */}
      <nav className="fixed bottom-6 left-6 right-6 h-16 bg-[#111]/90 backdrop-blur-md rounded-2xl border border-zinc-800 flex justify-around items-center">
        <button onClick={() => setView('dashboard')} className={`text-[10px] font-bold uppercase tracking-tighter ${view === 'dashboard' ? 'text-[#D4AF37]' : 'text-zinc-500'}`}>Dashboard</button>
        <button onClick={() => setView('calculator')} className={`text-[10px] font-bold uppercase tracking-tighter ${view === 'calculator' ? 'text-[#D4AF37]' : 'text-zinc-500'}`}>Calculator</button>
      </nav>
    </div>
  );
}