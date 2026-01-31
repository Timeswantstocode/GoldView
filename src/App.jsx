import React, { useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, registerables, Filler, Tooltip } from 'chart.js';
import priceData from '../data.json';

ChartJS.register(...registerables, Filler, Tooltip);

// --- Precise BS Date Engine for 2082 BS ---
const getBSDate = (adDateStr) => {
  if (!adDateStr) return "";
  const adDate = new Date(adDateStr.replace(' ', 'T'));
  const day = adDate.getDate();
  const month = adDate.getMonth() + 1;
  
  // Logic for Jan/Feb 2026 AD -> Magh/Falgun 2082 BS
  if (month === 1) { // January
    if (day < 14) return `${day + 17} Poush 2082`;
    return `${day - 13} Magh 2082`;
  }
  if (month === 2) { // February
    if (day < 13) return `${day + 18} Magh 2082`;
    return `${day - 12} Falgun 2082`;
  }
  return adDateStr.split(' ')[0]; // Fallback
};

export default function App() {
  const [view, setView] = useState('dashboard');
  const [activeMetal, setActiveMetal] = useState('gold');
  const [calc, setCalc] = useState({ tola: '', aana: '', lal: '', making: '', vat: true });

  // Fallback if data is not yet loaded
  if (!priceData || priceData.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-[#D4AF37]">
        <div className="text-center animate-pulse font-black tracking-widest uppercase">
          Initializing GoldView...
        </div>
      </div>
    );
  }

  const current = priceData[priceData.length - 1];

  // Bill Calculation Logic
  const calculateTotal = () => {
    const totalTola = (Number(calc.tola) || 0) + (Number(calc.aana) || 0) / 16 + (Number(calc.lal) || 0) / 192;
    const rate = activeMetal === 'gold' ? current.gold : current.silver;
    const metalPrice = totalTola * rate;
    const total = metalPrice + (Number(calc.making) || 0);
    return calc.vat ? total * 1.13 : total;
  };

  // Chart Configuration
  const chartData = useMemo(() => {
    const isGold = activeMetal === 'gold';
    const accent = isGold ? '#D4AF37' : '#94a3b8';
    const shadow = isGold ? 'rgba(212, 175, 55, 0.3)' : 'rgba(148, 163, 184, 0.2)';

    return {
      labels: priceData.map(d => d.date),
      datasets: [{
        data: priceData.map(d => isGold ? d.gold : d.silver),
        borderColor: accent,
        borderWidth: 4,
        pointRadius: 5,
        pointBackgroundColor: accent,
        pointHoverRadius: 8,
        tension: 0.4,
        fill: true,
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, shadow);
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
        backgroundColor: '#111',
        titleColor: '#D4AF37',
        titleFont: { size: 12, weight: 'bold' },
        bodyFont: { size: 14 },
        padding: 12,
        displayColors: false,
        callbacks: {
          title: (items) => getBSDate(items[0].label),
          label: (item) => `Rs. ${item.raw.toLocaleString()}`
        }
      }
    },
    scales: { x: { display: false }, y: { display: false } }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans pb-32">
      
      {/* HEADER */}
      <header className="p-6 pt-12 flex justify-between items-start">
        <div>
          <p className="text-[#D4AF37] text-[10px] font-black uppercase tracking-[0.2em]">Nepal Gold Tracker</p>
          <h1 className="text-3xl font-black italic tracking-tighter">GoldView</h1>
          <p className="text-zinc-500 text-xs font-bold mt-1">Today: {getBSDate(current.date)}</p>
        </div>
        <div className="bg-green-500/10 text-green-500 text-[10px] px-3 py-1 rounded-full border border-green-500/20 font-black animate-pulse">
          LIVE
        </div>
      </header>

      {view === 'dashboard' ? (
        <main className="px-5 space-y-4">
          
          {/* GOLD CARD */}
          <div 
            onClick={() => setActiveMetal('gold')}
            className={`p-6 rounded-[2.5rem] border-2 transition-all duration-300 ${activeMetal === 'gold' ? 'bg-[#1c1809] border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.1)]' : 'bg-[#0f0f0f] border-zinc-900 opacity-60 scale-95'}`}
          >
            <div className="flex justify-between items-center">
              <p className="text-[#D4AF37] font-black text-xs uppercase tracking-widest">24K Fine Gold</p>
              <span className="text-green-400 text-xs font-black">↗ 0.00%</span>
            </div>
            <h2 className="text-4xl font-black mt-4 tracking-tighter">Rs. {current.gold.toLocaleString()}</h2>
            <p className="text-zinc-600 text-[10px] mt-2 font-bold uppercase tracking-widest">Tap to view 7-day trend</p>
          </div>

          {/* SILVER CARD */}
          <div 
            onClick={() => setActiveMetal('silver')}
            className={`p-6 rounded-[2.5rem] border-2 transition-all duration-300 ${activeMetal === 'silver' ? 'bg-[#121417] border-blue-400/30 shadow-[0_0_20px_rgba(148,163,184,0.1)]' : 'bg-[#0f0f0f] border-zinc-900 opacity-60 scale-95'}`}
          >
            <div className="flex justify-between items-center">
              <p className="text-zinc-300 font-black text-xs uppercase tracking-widest">Pure Silver (999)</p>
              <span className="text-green-400 text-xs font-black">↗ 0.00%</span>
            </div>
            <h2 className="text-4xl font-black mt-4 tracking-tighter">Rs. {current.silver.toLocaleString()}</h2>
            <p className="text-zinc-600 text-[10px] mt-2 font-bold uppercase tracking-widest">Tap to view 7-day trend</p>
          </div>

          {/* INTERACTIVE GRAPH */}
          <section className="bg-zinc-900/20 rounded-[2.5rem] p-7 border border-zinc-800/50 mt-8">
            <div className="flex justify-between items-center mb-6">
              <p className="font-black text-xs uppercase tracking-[0.2em] text-[#D4AF37]">7-Day {activeMetal} Graph</p>
              <p className="text-[10px] text-zinc-500 font-bold uppercase">Interactive</p>
            </div>
            <div className="h-48">
              <Line data={chartData} options={chartOptions} />
            </div>
          </section>

        </main>
      ) : (
        /* CALCULATOR VIEW */
        <main className="px-5">
           <div className="bg-zinc-900/40 p-8 rounded-[3rem] border border-zinc-800/50">
              <h3 className="text-[#D4AF37] font-black text-center mb-10 uppercase tracking-widest text-sm italic">Commercial Estimator</h3>
              
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-600 uppercase ml-2">Tola</label>
                  <input type="number" placeholder="0" className="w-full bg-black p-4 rounded-2xl border border-zinc-800 text-center font-bold outline-none focus:border-[#D4AF37]" value={calc.tola} onChange={e => setCalc({...calc, tola: e.target.value})}/>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-600 uppercase ml-2">Aana</label>
                  <input type="number" placeholder="0" className="w-full bg-black p-4 rounded-2xl border border-zinc-800 text-center font-bold outline-none focus:border-[#D4AF37]" value={calc.aana} onChange={e => setCalc({...calc, aana: e.target.value})}/>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-600 uppercase ml-2">Lal</label>
                  <input type="number" placeholder="0" className="w-full bg-black p-4 rounded-2xl border border-zinc-800 text-center font-bold outline-none focus:border-[#D4AF37]" value={calc.lal} onChange={e => setCalc({...calc, lal: e.target.value})}/>
                </div>
              </div>

              <div className="space-y-2 mb-8">
                <label className="text-[10px] font-black text-zinc-600 uppercase ml-2">Making Charges (Rs)</label>
                <input type="number" placeholder="Enter amount..." className="w-full bg-black p-5 rounded-2xl border border-zinc-800 font-bold outline-none focus:border-[#D4AF37]" value={calc.making} onChange={e => setCalc({...calc, making: e.target.value})}/>
              </div>

              <div className="flex justify-between items-center mb-10 px-2">
                <p className="text-sm font-bold">Incl. 13% VAT</p>
                <input type="checkbox" checked={calc.vat} onChange={() => setCalc({...calc, vat: !calc.vat})} className="w-6 h-6 rounded-lg accent-[#D4AF37] cursor-pointer"/>
              </div>

              <div className="bg-[#D4AF37] p-8 rounded-[2.5rem] text-black text-center shadow-xl shadow-[#D4AF37]/10">
                <p className="text-[10px] uppercase font-black opacity-60 mb-1">Final Invoice Amount</p>
                <p className="text-4xl font-black tracking-tighter">रू {calculateTotal().toLocaleString(undefined, {maximumFractionDigits: 2})}</p>
              </div>
           </div>
        </main>
      )}

      {/* BOTTOM NAV */}
      <nav className="fixed bottom-8 left-8 right-8 h-20 bg-zinc-900/90 backdrop-blur-2xl rounded-[2.5rem] border border-zinc-800 flex justify-around items-center px-10 shadow-2xl z-50">
        <button 
          onClick={() => setView('dashboard')} 
          className={`flex flex-col items-center gap-1 transition-all ${view === 'dashboard' ? 'text-[#D4AF37] scale-110' : 'text-zinc-600 hover:text-zinc-400'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
          <span className="text-[9px] font-black uppercase tracking-widest">Market</span>
        </button>
        <button 
          onClick={() => setView('calculator')} 
          className={`flex flex-col items-center gap-1 transition-all ${view === 'calculator' ? 'text-[#D4AF37] scale-110' : 'text-zinc-600 hover:text-zinc-400'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 2H8a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z"/><path d="M8 6h8"/><path d="M10 14h4"/><path d="M10 18h4"/><path d="M10 10h4"/></svg>
          <span className="text-[9px] font-black uppercase tracking-widest">Bill</span>
        </button>
      </nav>

    </div>
  );
}