import React, { useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, registerables, Filler } from 'chart.js';
import priceData from '../data.json';

ChartJS.register(...registerables, Filler);

// --- Custom BS Conversion Engine ---
// Simplistic converter for 2026 AD -> 2082 BS
const getBSDate = (adDateStr) => {
  const adDate = new Date(adDateStr);
  const day = adDate.getDate();
  const month = adDate.getMonth() + 1; // 1-12
  
  // Static mapping for early 2082 BS
  const monthsBS = ["Baisakh", "Jestha", "Asar", "Shrawan", "Bhadra", "Ashoj", "Kattik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"];
  
  // Logic: Jan 31 2026 AD is roughly Magh 18 2082 BS
  if (month === 1) return `${day + 17} Magh 2082`;
  if (month === 2) return `${day + 18} Falgun 2082`;
  return adDateStr.split(' ')[0]; // Fallback
};

export default function App() {
  const [view, setView] = useState('dashboard');
  const [activeMetal, setActiveMetal] = useState('gold');
  const [calc, setCalc] = useState({ tola: '', aana: '', lal: '', making: '', vat: true });

  const current = priceData[priceData.length - 1];

  const calculateTotal = () => {
    const totalTola = (Number(calc.tola) || 0) + (Number(calc.aana) || 0) / 16 + (Number(calc.lal) || 0) / 192;
    const rate = activeMetal === 'gold' ? current.gold : current.silver;
    const total = (totalTola * rate) + (Number(calc.making) || 0);
    return calc.vat ? total * 1.13 : total;
  };

  const chartData = useMemo(() => {
    const isGold = activeMetal === 'gold';
    return {
      labels: priceData.map(d => d.date),
      datasets: [{
        data: priceData.map(d => isGold ? d.gold : d.silver),
        borderColor: isGold ? '#D4AF37' : '#94a3b8',
        borderWidth: 4,
        pointRadius: 4, // Shows dots for interaction
        pointBackgroundColor: isGold ? '#D4AF37' : '#94a3b8',
        tension: 0.4,
        fill: true,
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, isGold ? 'rgba(212, 175, 55, 0.4)' : 'rgba(148, 163, 184, 0.2)');
          gradient.addColorStop(1, 'rgba(0,0,0,0)');
          return gradient;
        },
      }]
    };
  }, [activeMetal]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1a1a1a',
        titleFont: { size: 12 },
        bodyFont: { size: 14, weight: 'bold' },
        callbacks: {
          title: (items) => getBSDate(items[0].label),
          label: (item) => `Rs. ${item.raw.toLocaleString()}`
        }
      }
    },
    scales: { x: { display: false }, y: { display: false } }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans pb-28">
      <header className="p-6 pt-12">
        <p className="text-[#D4AF37] text-[10px] font-black uppercase tracking-widest">Nepal Gold Tracker</p>
        <h1 className="text-3xl font-extrabold italic">Market Analytics</h1>
        <p className="text-zinc-500 text-xs mt-2">Today: {getBSDate(current.date)}</p>
      </header>

      {view === 'dashboard' ? (
        <main className="px-5 space-y-4">
          {/* Gold Card */}
          <div onClick={() => setActiveMetal('gold')} className={`p-6 rounded-[2.5rem] border-2 transition-all ${activeMetal === 'gold' ? 'bg-[#1c1809] border-[#D4AF37]' : 'bg-[#0f0f0f] border-zinc-900 opacity-60'}`}>
            <p className="text-[#D4AF37] font-bold text-xs uppercase">24K Fine Gold</p>
            <h2 className="text-4xl font-black mt-4 tracking-tighter">Rs. {current.gold.toLocaleString()}</h2>
            <p className="text-zinc-500 text-[10px] mt-2 font-bold uppercase tracking-widest">Tap to view trend</p>
          </div>

          {/* Silver Card */}
          <div onClick={() => setActiveMetal('silver')} className={`p-6 rounded-[2.5rem] border-2 transition-all ${activeMetal === 'silver' ? 'bg-[#121417] border-blue-400/30' : 'bg-[#0f0f0f] border-zinc-900 opacity-60'}`}>
            <p className="text-zinc-300 font-bold text-xs uppercase">Pure Silver (999)</p>
            <h2 className="text-3xl font-black mt-4 tracking-tighter">Rs. {current.silver.toLocaleString()}</h2>
            <p className="text-zinc-500 text-[10px] mt-2 font-bold uppercase tracking-widest">Tap to view trend</p>
          </div>

          {/* Interactive Chart */}
          <section className="bg-zinc-900/30 rounded-[2.5rem] p-7 border border-zinc-800/50">
            <div className="flex justify-between items-center mb-6">
              <p className="font-black text-xs uppercase tracking-widest text-[#D4AF37]">7-Day {activeMetal} Graph</p>
              <p className="text-[10px] text-zinc-500 uppercase">Tap dots for BS Date</p>
            </div>
            <div className="h-48">
              <Line data={chartData} options={chartOptions} />
            </div>
          </section>
        </main>
      ) : (
        /* Calculator */
        <main className="px-5">
           <div className="bg-zinc-900/40 p-8 rounded-[3rem] border border-zinc-800/50">
              <h3 className="text-[#D4AF37] font-black text-center mb-8 uppercase tracking-widest text-sm">Calculator</h3>
              <div className="grid grid-cols-3 gap-3 mb-6">
                <input type="number" placeholder="Tola" className="bg-black p-4 rounded-2xl border border-zinc-800 text-center font-bold" value={calc.tola} onChange={e => setCalc({...calc, tola: e.target.value})}/>
                <input type="number" placeholder="Aana" className="bg-black p-4 rounded-2xl border border-zinc-800 text-center font-bold" value={calc.aana} onChange={e => setCalc({...calc, aana: e.target.value})}/>
                <input type="number" placeholder="Lal" className="bg-black p-4 rounded-2xl border border-zinc-800 text-center font-bold" value={calc.lal} onChange={e => setCalc({...calc, lal: e.target.value})}/>
              </div>
              <input type="number" placeholder="Making Charge" className="w-full bg-black p-4 rounded-2xl border border-zinc-800 font-bold mb-6" value={calc.making} onChange={e => setCalc({...calc, making: e.target.value})}/>
              <div className="bg-[#D4AF37] p-8 rounded-[2.5rem] text-black text-center">
                <p className="text-[10px] uppercase font-black opacity-60 mb-1">Final Amount</p>
                <p className="text-3xl font-black tracking-tighter">रू {calculateTotal().toLocaleString()}</p>
              </div>
           </div>
        </main>
      )}

      {/* Nav */}
      <nav className="fixed bottom-6 left-6 right-6 h-20 bg-zinc-900/90 backdrop-blur-xl rounded-[2.5rem] border border-zinc-800 flex justify-around items-center px-4">
        <button onClick={() => setView('dashboard')} className={`text-[10px] font-black uppercase tracking-widest ${view === 'dashboard' ? 'text-[#D4AF37]' : 'text-zinc-600'}`}>Market</button>
        <button onClick={() => setView('calculator')} className={`text-[10px] font-black uppercase tracking-widest ${view === 'calculator' ? 'text-[#D4AF37]' : 'text-zinc-600'}`}>Bill</button>
      </nav>
    </div>
  );
}