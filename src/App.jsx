import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, registerables, Filler } from 'chart.js';
import priceData from '../data.json';

ChartJS.register(...registerables, Filler);

export default function App() {
  const [view, setView] = useState('dashboard');
  const [activeMetal, setActiveMetal] = useState('gold');
  const [calc, setCalc] = useState({ tola: '', aana: '', lal: '', making: '', vat: true });

  if (!priceData || priceData.length === 0) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-yellow-600">Loading Market Data...</div>;
  }

  const current = priceData[priceData.length - 1];
  const tejabiGold = Math.round(current.gold * 0.9715); // Standard 22K/Tejabi calculation

  const calculateTotal = () => {
    const totalTola = (Number(calc.tola) || 0) + (Number(calc.aana) || 0) / 16 + (Number(calc.lal) || 0) / 192;
    const rate = activeMetal === 'gold' ? current.gold : current.silver;
    const total = (totalTola * rate) + (Number(calc.making) || 0);
    return calc.vat ? total * 1.13 : total;
  };

  // Chart Configuration to match screenshot
  const chartData = {
    labels: priceData.slice(-30).map(d => d.date.split(' ')[0]),
    datasets: [{
      data: priceData.slice(-30).map(d => activeMetal === 'gold' ? d.gold : d.silver),
      borderColor: '#D4AF37',
      borderWidth: 3,
      pointRadius: 0,
      tension: 0.4,
      fill: true,
      backgroundColor: (context) => {
        const ctx = context.chart.ctx;
        const gradient = ctx.createLinearGradient(0, 0, 0, 200);
        gradient.addColorStop(0, 'rgba(212, 175, 55, 0.4)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        return gradient;
      },
    }]
  };

  const chartOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { display: false },
      y: { display: false }
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans pb-24">
      {/* Header */}
      <div className="p-6 pt-10">
        <p className="text-[#D4AF37] text-xs font-bold tracking-widest uppercase">Nepal Gold Tracker</p>
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Live Prices</h1>
          <button className="bg-zinc-800 p-2 rounded-full text-[#D4AF37]">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21v-5h5"/></svg>
          </button>
        </div>
        <p className="text-zinc-500 text-sm mt-1 flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          Last updated: {current.date}
        </p>
      </div>

      {view === 'dashboard' ? (
        <div className="px-5 space-y-4">
          {/* 24K Gold Card */}
          <div className="bg-gradient-to-br from-[#1e1a0a] to-[#0d0d0d] border border-[#D4AF37]/30 p-6 rounded-[2rem] relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[#D4AF37] font-semibold text-sm">24K Gold (Chhapawal)</p>
                <p className="text-zinc-500 text-xs">Pure Fine Gold</p>
              </div>
              <span className="bg-green-900/30 text-green-400 text-xs px-2 py-1 rounded-md font-bold">↗ +0.00%</span>
            </div>
            <h2 className="text-4xl font-bold mt-4">Rs. {current.gold.toLocaleString()}</h2>
            <p className="text-zinc-500 text-xs mt-1">per Tola (11.66g)</p>
          </div>

          {/* 22K Gold Card */}
          <div className="bg-[#121212] border border-zinc-800 p-6 rounded-[2rem]">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[#b08d2b] font-semibold text-sm">22K Gold (Tejabi)</p>
                <p className="text-zinc-500 text-xs">Hallmark Gold</p>
              </div>
              <span className="bg-green-900/30 text-green-400 text-xs px-2 py-1 rounded-md font-bold">↗ +0.00%</span>
            </div>
            <h2 className="text-3xl font-bold mt-3 text-zinc-200">Rs. {tejabiGold.toLocaleString()}</h2>
            <p className="text-zinc-500 text-xs mt-1">per Tola (11.66g)</p>
          </div>

          {/* Silver Card */}
          <div className="bg-[#15181c] border border-blue-900/20 p-6 rounded-[2rem]">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-zinc-300 font-semibold text-sm">Silver</p>
                <p className="text-zinc-500 text-xs">Pure Silver</p>
              </div>
              <span className="bg-green-900/30 text-green-400 text-xs px-2 py-1 rounded-md font-bold">↗ +0.00%</span>
            </div>
            <h2 className="text-3xl font-bold mt-3">Rs. {current.silver.toLocaleString()}</h2>
            <p className="text-zinc-500 text-xs mt-1">per Tola (11.66g)</p>
          </div>

          {/* Graph Section */}
          <div className="bg-[#111] rounded-[2rem] p-6 mt-6 border border-zinc-800">
            <div className="flex justify-between items-center mb-6">
              <p className="font-bold text-sm">30 Day Trend</p>
              <p className="text-zinc-500 text-xs uppercase tracking-tighter">Jan 31</p>
            </div>
            <div className="h-40">
              <Line data={chartData} options={chartOptions} />
            </div>
            <div className="flex justify-between mt-4 border-t border-zinc-800 pt-4">
              <div>
                <p className="text-zinc-500 text-[10px] uppercase">Low</p>
                <p className="text-sm font-bold">Rs. {(current.gold * 0.98).toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-zinc-500 text-[10px] uppercase">Change</p>
                <p className="text-sm font-bold text-green-400">+0.10%</p>
              </div>
              <div className="text-right">
                <p className="text-zinc-500 text-[10px] uppercase">High</p>
                <p className="text-sm font-bold">Rs. {(current.gold * 1.01).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Calculator View */
        <div className="px-5 space-y-4 animate-in fade-in slide-in-from-bottom-4">
           <div className="bg-zinc-900/50 p-6 rounded-[2rem] border border-zinc-800">
              <h3 className="text-[#D4AF37] font-bold mb-4">Price Calculator</h3>
              <div className="flex gap-2 mb-4">
                <button onClick={() => setActiveMetal('gold')} className={`flex-1 py-2 rounded-xl border ${activeMetal === 'gold' ? 'border-[#D4AF37] bg-[#D4AF37]/10' : 'border-zinc-800'}`}>Gold</button>
                <button onClick={() => setActiveMetal('silver')} className={`flex-1 py-2 rounded-xl border ${activeMetal === 'silver' ? 'border-zinc-300 bg-white/5' : 'border-zinc-800'}`}>Silver</button>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <input type="number" placeholder="Tola" className="bg-black p-3 rounded-xl border border-zinc-800" value={calc.tola} onChange={e => setCalc({...calc, tola: e.target.value})}/>
                <input type="number" placeholder="Aana" className="bg-black p-3 rounded-xl border border-zinc-800" value={calc.aana} onChange={e => setCalc({...calc, aana: e.target.value})}/>
                <input type="number" placeholder="Lal" className="bg-black p-3 rounded-xl border border-zinc-800" value={calc.lal} onChange={e => setCalc({...calc, lal: e.target.value})}/>
              </div>
              <input type="number" placeholder="Making Charge (Rs)" className="w-full bg-black p-3 rounded-xl border border-zinc-800 mb-4" value={calc.making} onChange={e => setCalc({...calc, making: e.target.value})}/>
              <div className="flex justify-between items-center mb-6">
                <span className="text-zinc-400">Add 13% VAT</span>
                <input type="checkbox" checked={calc.vat} onChange={() => setCalc({...calc, vat: !calc.vat})} className="accent-[#D4AF37] w-5 h-5"/>
              </div>
              <div className="bg-[#D4AF37] p-6 rounded-2xl text-black text-center">
                <p className="text-[10px] uppercase font-bold opacity-70 text-black">Total Estimated Amount</p>
                <p className="text-3xl font-black">Rs. {calculateTotal().toLocaleString()}</p>
              </div>
           </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0d0d0d]/80 backdrop-blur-xl border-t border-zinc-800 px-10 py-4 flex justify-between items-center">
        <button onClick={() => setView('dashboard')} className={`flex flex-col items-center gap-1 ${view === 'dashboard' ? 'text-[#D4AF37]' : 'text-zinc-500'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
          <span className="text-[10px] font-bold">Dashboard</span>
        </button>
        <button onClick={() => setView('calculator')} className={`flex flex-col items-center gap-1 ${view === 'calculator' ? 'text-[#D4AF37]' : 'text-zinc-500'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/></svg>
          <span className="text-[10px] font-bold">Calculator</span>
        </button>
      </div>
    </div>
  );
}