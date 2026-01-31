import React, { useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, registerables, Filler } from 'chart.js';
import priceData from '../data.json';

ChartJS.register(...registerables, Filler);

export default function App() {
  const [view, setView] = useState('dashboard'); // 'dashboard' or 'calculator'
  const [activeMetal, setActiveMetal] = useState('gold'); // 'gold' or 'silver'
  const [calc, setCalc] = useState({ tola: '', aana: '', lal: '', making: '', vat: true });

  // Safety check for empty data
  if (!priceData || priceData.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-[#D4AF37]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37] mx-auto mb-4"></div>
          <p className="text-sm font-bold tracking-widest uppercase">Initializing GoldView...</p>
        </div>
      </div>
    );
  }

  const current = priceData[priceData.length - 1];
  const tejabiGold = Math.round(current.gold * 0.9915); // Standard 22K/Tejabi Gold approx.

  // Calculator Logic: 1 Tola = 16 Aana = 192 Lal
  const calculateTotal = () => {
    const totalTola = (Number(calc.tola) || 0) + (Number(calc.aana) || 0) / 16 + (Number(calc.lal) || 0) / 192;
    const rate = activeMetal === 'gold' ? current.gold : current.silver;
    const metalPrice = totalTola * rate;
    const makingCharge = Number(calc.making) || 0;
    const total = metalPrice + makingCharge;
    return calc.vat ? total * 1.13 : total;
  };

  // Chart Data Generation (Switchable between Gold and Silver)
  const chartData = useMemo(() => {
    const isGold = activeMetal === 'gold';
    const accentColor = isGold ? '#D4AF37' : '#94a3b8';
    const glowColor = isGold ? 'rgba(212, 175, 55, 0.3)' : 'rgba(148, 163, 184, 0.2)';

    return {
      labels: priceData.map(d => d.date.split(' ')[0].split('-').pop()), // Day only
      datasets: [{
        label: isGold ? 'Gold' : 'Silver',
        data: priceData.map(d => isGold ? d.gold : d.silver),
        borderColor: accentColor,
        borderWidth: 3,
        pointRadius: 0,
        pointHoverRadius: 6,
        tension: 0.4, // This makes it curvy like your screenshot
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
    interaction: { intersect: false, mode: 'index' },
    plugins: { legend: { display: false } },
    scales: {
      x: { 
        grid: { display: false },
        ticks: { color: '#444', font: { size: 10 } }
      },
      y: { 
        display: false,
        suggestedMin: (val) => val * 0.98 
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans pb-28 selection:bg-[#D4AF37]/30">
      
      {/* --- HEADER --- */}
      <header className="p-6 pt-12">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[#D4AF37] text-[10px] font-black tracking-[0.2em] uppercase mb-1">Nepal Gold Tracker</p>
            <h1 className="text-3xl font-extrabold tracking-tight italic">Live Prices</h1>
          </div>
          <button onClick={() => window.location.reload()} className="bg-zinc-900/80 p-3 rounded-2xl border border-zinc-800 text-[#D4AF37] active:scale-95 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21v-5h5"/></svg>
          </button>
        </div>
        <p className="text-zinc-500 text-xs mt-3 flex items-center gap-2 font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          Last updated: {current.date} • Live
        </p>
      </header>

      {view === 'dashboard' ? (
        <main className="px-5 space-y-4 animate-in fade-in duration-500">
          
          {/* 24K Gold Card - CLICKABLE */}
          <div 
            onClick={() => setActiveMetal('gold')}
            className={`transition-all duration-300 cursor-pointer p-6 rounded-[2.5rem] border-2 relative overflow-hidden ${activeMetal === 'gold' ? 'bg-gradient-to-br from-[#1c1809] to-black border-[#D4AF37]/50 ring-1 ring-[#D4AF37]/20' : 'bg-[#0f0f0f] border-zinc-900 opacity-60'}`}
          >
            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="text-[#D4AF37] font-bold text-xs uppercase tracking-wider">24K Gold (Chhapawal)</p>
                <p className="text-zinc-500 text-[10px] font-medium">Pure Fine Gold</p>
              </div>
              <span className="bg-green-500/10 text-green-400 text-[10px] px-2 py-1 rounded-lg font-black tracking-tighter">↗ +0.00%</span>
            </div>
            <h2 className="text-4xl font-black mt-5 tracking-tight">Rs. {current.gold.toLocaleString()}</h2>
            <p className="text-zinc-500 text-[10px] mt-1 font-bold italic uppercase opacity-60">per Tola (11.66g)</p>
          </div>

          {/* 22K Gold Card */}
          <div className="bg-[#0f0f0f] border border-zinc-900 p-6 rounded-[2.5rem] opacity-80">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[#b08d2b] font-bold text-xs uppercase tracking-wider">22K Gold (Tejabi)</p>
                <p className="text-zinc-500 text-[10px] font-medium">Hallmark Gold</p>
              </div>
              <span className="bg-green-500/10 text-green-400 text-[10px] px-2 py-1 rounded-lg font-black tracking-tighter">↗ +0.00%</span>
            </div>
            <h2 className="text-3xl font-black mt-4 text-zinc-300">Rs. {tejabiGold.toLocaleString()}</h2>
            <p className="text-zinc-500 text-[10px] mt-1 font-bold italic uppercase opacity-60">per Tola (11.66g)</p>
          </div>

          {/* Silver Card - CLICKABLE */}
          <div 
            onClick={() => setActiveMetal('silver')}
            className={`transition-all duration-300 cursor-pointer p-6 rounded-[2.5rem] border-2 ${activeMetal === 'silver' ? 'bg-gradient-to-br from-[#121417] to-black border-blue-400/30 ring-1 ring-blue-400/10' : 'bg-[#0f0f0f] border-zinc-900 opacity-60'}`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-zinc-300 font-bold text-xs uppercase tracking-wider">Silver</p>
                <p className="text-zinc-500 text-[10px] font-medium">Pure Silver (999)</p>
              </div>
              <span className="bg-green-500/10 text-green-400 text-[10px] px-2 py-1 rounded-lg font-black tracking-tighter">↗ +0.00%</span>
            </div>
            <h2 className="text-3xl font-black mt-4">Rs. {current.silver.toLocaleString()}</h2>
            <p className="text-zinc-500 text-[10px] mt-1 font-bold italic uppercase opacity-60">per Tola (11.66g)</p>
          </div>

          {/* Trend Chart */}
          <section className="bg-zinc-900/30 rounded-[2.5rem] p-7 mt-8 border border-zinc-800/50">
            <div className="flex justify-between items-center mb-8">
              <p className="font-black text-xs uppercase tracking-widest text-zinc-300">30 Day {activeMetal} Trend</p>
              <div className="bg-zinc-800 px-3 py-1 rounded-full text-[10px] font-black text-zinc-400">Nepal Market</div>
            </div>
            <div className="h-44">
              <Line data={chartData} options={chartOptions} />
            </div>
            <div className="flex justify-between mt-6 pt-6 border-t border-zinc-800/50">
              <div className="text-center">
                <p className="text-zinc-600 text-[9px] font-black uppercase mb-1">Low Range</p>
                <p className="text-sm font-black tracking-tight text-zinc-200">Rs. {(current[activeMetal] * 0.985).toLocaleString(undefined, {maximumFractionDigits:0})}</p>
              </div>
              <div className="text-center">
                <p className="text-zinc-600 text-[9px] font-black uppercase mb-1">Avg Volatility</p>
                <p className="text-sm font-black text-green-500">+0.10%</p>
              </div>
              <div className="text-center">
                <p className="text-zinc-600 text-[9px] font-black uppercase mb-1">High Range</p>
                <p className="text-sm font-black tracking-tight text-zinc-200">Rs. {(current[activeMetal] * 1.012).toLocaleString(undefined, {maximumFractionDigits:0})}</p>
              </div>
            </div>
          </section>

        </main>
      ) : (
        /* --- CALCULATOR VIEW --- */
        <main className="px-5 space-y-4 animate-in slide-in-from-bottom-10 duration-500">
           <div className="bg-zinc-900/40 p-8 rounded-[3rem] border border-zinc-800/50">
              <h3 className="text-[#D4AF37] font-black text-center text-lg mb-8 tracking-tight italic">Commercial Billing</h3>
              
              <div className="flex p-1 bg-black rounded-2xl mb-8 border border-zinc-900">
                <button onClick={() => setActiveMetal('gold')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${activeMetal === 'gold' ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20' : 'text-zinc-500'}`}>GOLD (24K)</button>
                <button onClick={() => setActiveMetal('silver')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${activeMetal === 'silver' ? 'bg-zinc-200 text-black' : 'text-zinc-500'}`}>SILVER</button>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-zinc-600 uppercase ml-2">Tola</label>
                  <input type="number" placeholder="0" className="w-full bg-black/50 p-4 rounded-2xl border border-zinc-800 text-center font-bold focus:border-[#D4AF37] outline-none transition-colors" value={calc.tola} onChange={e => setCalc({...calc, tola: e.target.value})}/>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-zinc-600 uppercase ml-2">Aana</label>
                  <input type="number" placeholder="0" className="w-full bg-black/50 p-4 rounded-2xl border border-zinc-800 text-center font-bold focus:border-[#D4AF37] outline-none transition-colors" value={calc.aana} onChange={e => setCalc({...calc, aana: e.target.value})}/>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-zinc-600 uppercase ml-2">Lal</label>
                  <input type="number" placeholder="0" className="w-full bg-black/50 p-4 rounded-2xl border border-zinc-800 text-center font-bold focus:border-[#D4AF37] outline-none transition-colors" value={calc.lal} onChange={e => setCalc({...calc, lal: e.target.value})}/>
                </div>
              </div>

              <div className="space-y-2 mb-8">
                <label className="text-[9px] font-black text-zinc-600 uppercase ml-2">Making Charges (NPR)</label>
                <input type="number" placeholder="Enter amount" className="w-full bg-black/50 p-4 rounded-2xl border border-zinc-800 font-bold focus:border-[#D4AF37] outline-none transition-colors" value={calc.making} onChange={e => setCalc({...calc, making: e.target.value})}/>
              </div>

              <div className="flex justify-between items-center mb-10 px-2">
                <div>
                  <p className="text-sm font-bold">Include VAT (13%)</p>
                  <p className="text-[10px] text-zinc-500 font-medium">Add Government Sales Tax</p>
                </div>
                <input type="checkbox" checked={calc.vat} onChange={() => setCalc({...calc, vat: !calc.vat})} className="w-6 h-6 rounded-lg accent-[#D4AF37] bg-black border-zinc-800 cursor-pointer"/>
              </div>

              <div className="bg-[#D4AF37] p-8 rounded-[2.5rem] text-black text-center shadow-2xl shadow-[#D4AF37]/20 relative overflow-hidden">
                <div className="relative z-10">
                  <p className="text-[10px] uppercase font-black tracking-widest opacity-60 mb-1">Final Invoice Amount</p>
                  <p className="text-4xl font-black tracking-tighter">रू {calculateTotal().toLocaleString(undefined, {maximumFractionDigits: 2})}</p>
                </div>
                <div className="absolute top-0 right-0 -mr-4 -mt-4 w-20 h-20 bg-black/5 rounded-full blur-2xl"></div>
              </div>
           </div>
        </main>
      )}

      {/* --- BOTTOM NAVIGATION BAR --- */}
      <nav className="fixed bottom-6 left-6 right-6 h-20 bg-zinc-900/80 backdrop-blur-2xl rounded-[2.5rem] border border-zinc-800/50 flex justify-around items-center px-4 shadow-2xl z-50">
        <button 
          onClick={() => setView('dashboard')} 
          className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${view === 'dashboard' ? 'text-[#D4AF37] scale-110' : 'text-zinc-600 hover:text-zinc-400'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill={view === 'dashboard' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="2"/><rect width="7" height="7" x="14" y="3" rx="2"/><rect width="7" height="7" x="14" y="14" rx="2"/><rect width="7" height="7" x="3" y="14" rx="2"/></svg>
          <span className="text-[9px] font-black uppercase tracking-widest">Market</span>
        </button>
        
        <div className="w-[1px] h-8 bg-zinc-800"></div>

        <button 
          onClick={() => setView('calculator')} 
          className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${view === 'calculator' ? 'text-[#D4AF37] scale-110' : 'text-zinc-600 hover:text-zinc-400'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill={view === 'calculator' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="3"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/></svg>
          <span className="text-[9px] font-black uppercase tracking-widest">Estimate</span>
        </button>
      </nav>

    </div>
  );
}