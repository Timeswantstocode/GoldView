import React, { useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, registerables, Filler } from 'chart.js';
import priceData from '../data.json';

ChartJS.register(...registerables, Filler);

export default function App() {
  const [view, setView] = useState('dashboard');
  const [activeMetal, setActiveMetal] = useState('gold');
  const [calc, setCalc] = useState({ tola: '', aana: '', lal: '', making: '', vat: true });

  // --- SAFETY GUARD: Prevents White Screen if data.json is empty ---
  const current = useMemo(() => {
    if (priceData && priceData.length > 0) {
      return priceData[priceData.length - 1];
    }
    return null;
  }, []);

  if (!current) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-center p-10">
        <div>
          <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h1 className="text-[#D4AF37] font-black tracking-tighter text-xl">GOLDVIEW</h1>
          <p className="text-zinc-500 text-xs mt-2 uppercase tracking-widest">Waiting for Market Data...</p>
        </div>
      </div>
    );
  }
  // --- END SAFETY GUARD ---

  const tejabiGold = Math.round(current.gold * 0.9915);

  const calculateTotal = () => {
    const totalTola = (Number(calc.tola) || 0) + (Number(calc.aana) || 0) / 16 + (Number(calc.lal) || 0) / 192;
    const rate = activeMetal === 'gold' ? current.gold : current.silver;
    const metalPrice = totalTola * rate;
    const makingCharge = Number(calc.making) || 0;
    const total = metalPrice + makingCharge;
    return calc.vat ? total * 1.13 : total;
  };

  const chartData = useMemo(() => {
    const isGold = activeMetal === 'gold';
    const accentColor = isGold ? '#D4AF37' : '#94a3b8';
    const glowColor = isGold ? 'rgba(212, 175, 55, 0.3)' : 'rgba(148, 163, 184, 0.2)';

    return {
      labels: priceData.map(d => d.date.split(' ')[0].split('-').pop()),
      datasets: [{
        label: isGold ? 'Gold' : 'Silver',
        data: priceData.map(d => isGold ? d.gold : d.silver),
        borderColor: accentColor,
        borderWidth: 3,
        pointRadius: 0,
        tension: 0.4,
        fill: true,
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 250);
          gradient.addColorStop(0, glowColor);
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
          return gradient;
        },
      }]
    };
  }, [activeMetal]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { display: false }, y: { display: false } }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans pb-28">
      <header className="p-6 pt-12">
        <p className="text-[#D4AF37] text-[10px] font-black tracking-[0.2em] uppercase">Nepal Gold Tracker</p>
        <h1 className="text-3xl font-extrabold tracking-tight italic">Live Prices</h1>
        <p className="text-zinc-500 text-xs mt-3 flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          Last updated: {current.date}
        </p>
      </header>

      {view === 'dashboard' ? (
        <main className="px-5 space-y-4">
          <div onClick={() => setActiveMetal('gold')} className={`transition-all p-6 rounded-[2.5rem] border-2 ${activeMetal === 'gold' ? 'bg-[#1c1809] border-[#D4AF37]/50' : 'bg-[#0f0f0f] border-zinc-900 opacity-60'}`}>
            <p className="text-[#D4AF37] font-bold text-xs uppercase">24K Gold (Chhapawal)</p>
            <h2 className="text-4xl font-black mt-4 tracking-tight text-white">Rs. {current.gold.toLocaleString()}</h2>
          </div>

          <div className="bg-[#0f0f0f] border border-zinc-900 p-6 rounded-[2.5rem] opacity-80">
            <p className="text-[#b08d2b] font-bold text-xs uppercase">22K Gold (Tejabi)</p>
            <h2 className="text-3xl font-black mt-3 text-zinc-300">Rs. {tejabiGold.toLocaleString()}</h2>
          </div>

          <div onClick={() => setActiveMetal('silver')} className={`transition-all p-6 rounded-[2.5rem] border-2 ${activeMetal === 'silver' ? 'bg-[#121417] border-blue-400/30' : 'bg-[#0f0f0f] border-zinc-900 opacity-60'}`}>
            <p className="text-zinc-300 font-bold text-xs uppercase">Silver</p>
            <h2 className="text-3xl font-black mt-3">Rs. {current.silver.toLocaleString()}</h2>
          </div>

          <section className="bg-zinc-900/30 rounded-[2.5rem] p-7 border border-zinc-800/50">
            <p className="font-black text-xs uppercase tracking-widest text-zinc-400 mb-6">30 Day {activeMetal} Trend</p>
            <div className="h-44"><Line data={chartData} options={chartOptions} /></div>
          </section>
        </main>
      ) : (
        <main className="px-5 space-y-4">
           <div className="bg-zinc-900/40 p-8 rounded-[3rem] border border-zinc-800/50">
              <h3 className="text-[#D4AF37] font-black text-center text-lg mb-8 italic">Commercial Billing</h3>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <input type="number" placeholder="Tola" className="bg-black p-4 rounded-2xl border border-zinc-800 text-center font-bold" value={calc.tola} onChange={e => setCalc({...calc, tola: e.target.value})}/>
                <input type="number" placeholder="Aana" className="bg-black p-4 rounded-2xl border border-zinc-800 text-center font-bold" value={calc.aana} onChange={e => setCalc({...calc, aana: e.target.value})}/>
                <input type="number" placeholder="Lal" className="bg-black p-4 rounded-2xl border border-zinc-800 text-center font-bold" value={calc.lal} onChange={e => setCalc({...calc, lal: e.target.value})}/>
              </div>
              <input type="number" placeholder="Making Charge" className="w-full bg-black p-4 rounded-2xl border border-zinc-800 mb-8" value={calc.making} onChange={e => setCalc({...calc, making: e.target.value})}/>
              <div className="bg-[#D4AF37] p-8 rounded-[2.5rem] text-black text-center">
                <p className="text-[10px] uppercase font-black opacity-60">Final Amount</p>
                <p className="text-4xl font-black">रू {calculateTotal().toLocaleString()}</p>
              </div>
           </div>
        </main>
      )}

      <nav className="fixed bottom-6 left-6 right-6 h-20 bg-zinc-900/80 backdrop-blur-2xl rounded-[2.5rem] border border-zinc-800/50 flex justify-around items-center px-4">
        <button onClick={() => setView('dashboard')} className={`flex flex-col items-center gap-1 ${view === 'dashboard' ? 'text-[#D4AF37]' : 'text-zinc-600'}`}>
          <span className="text-[9px] font-black uppercase">Market</span>
        </button>
        <button onClick={() => setView('calculator')} className={`flex flex-col items-center gap-1 ${view === 'calculator' ? 'text-[#D4AF37]' : 'text-zinc-600'}`}>
          <span className="text-[9px] font-black uppercase">Estimate</span>
        </button>
      </nav>
    </div>
  );
}