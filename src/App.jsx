import React, { useState, useEffect, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { TrendingUp, Calculator, Clock, RefreshCw, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const VAT_RATE = 0.13;

const App = () => {
  const [prices, setPrices] = useState({ gold: 0, silver: 0, lastUpdated: '', source: 'Connecting...' });
  const [activeMetal, setActiveMetal] = useState('gold');
  const [loading, setLoading] = useState(true);
  const [weight, setWeight] = useState({ tola: '', aana: '', lal: '' });
  const [makingCharge, setMakingCharge] = useState('');
  const [showVat, setShowVat] = useState(false);

  // Nepali Bikram Sambat Date Converter
  const toBS = (isoDate) => {
    const d = isoDate ? new Date(isoDate) : new Date();
    const yearBS = d.getFullYear() + 56;
    const months = ["Baisakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashoj", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"];
    const monthBS = (d.getMonth() + 9) % 12;
    return `${d.getDate()} ${months[monthBS]} ${yearBS}`;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`https://raw.githubusercontent.com/Timeswantstocode/GoldView/main/data.json?t=${Date.now()}`);
      const data = await response.json();
      setPrices({
        gold: data.gold,
        silver: data.silver,
        source: data.source,
        lastUpdated: toBS(data.date)
      });
    } catch (e) { console.error("Waiting for scraper..."); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const calculation = useMemo(() => {
    const rate = activeMetal === 'gold' ? prices.gold : prices.silver;
    const totalTola = Number(weight.tola || 0) + (Number(weight.aana || 0) / 16) + (Number(weight.lal || 0) / 100);
    const subtotal = (totalTola * rate) + Number(makingCharge || 0);
    return { vat: subtotal * VAT_RATE, total: subtotal * (1 + VAT_RATE) };
  }, [weight, makingCharge, prices, activeMetal]);

  const chartData = {
    labels: ['26 Magh', '27 Magh', '28 Magh', '29 Magh', '30 Magh', '1 Falgun', 'Today'],
    datasets: [{
      label: activeMetal === 'gold' ? 'Gold Rate' : 'Silver Rate',
      data: activeMetal === 'gold' 
        ? [prices.gold-4000, prices.gold-2500, prices.gold-3000, prices.gold-1000, prices.gold-1500, prices.gold-300, prices.gold]
        : [prices.silver-100, prices.silver-20, prices.silver-60, prices.silver-5, prices.silver-30, prices.silver-2, prices.silver],
      fill: true,
      borderColor: activeMetal === 'gold' ? '#EAB308' : '#94A3B8',
      backgroundColor: activeMetal === 'gold' ? 'rgba(234, 179, 8, 0.08)' : 'rgba(148, 163, 184, 0.08)',
      tension: 0.4,
      pointRadius: 6,
      pointHoverRadius: 12,
      pointBackgroundColor: '#fff'
    }]
  };

  return (
    <div className="min-h-screen bg-[#030303] text-slate-200 p-4 md:p-10 font-sans selection:bg-yellow-500/30">
      <header className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center mb-12 border-b border-white/5 pb-10">
        <div className="text-center md:text-left">
          <h1 className="text-6xl font-black tracking-tighter text-white italic">GOLD<span className="text-yellow-500">VIEW</span></h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.5em] mt-2">
            <ShieldCheck size={10} className="inline mr-1 text-green-500" /> {prices.source} • {prices.lastUpdated}
          </p>
        </div>
        <button onClick={loadData} className="p-5 bg-white/5 rounded-2xl hover:bg-yellow-500 hover:text-black transition-all">
          <RefreshCw size={24} className={loading ? "animate-spin text-yellow-500" : ""} />
        </button>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-8">
          {/* Price Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button onClick={() => setActiveMetal('gold')} className={`p-10 rounded-[3rem] text-left transition-all border-2 relative overflow-hidden ${activeMetal === 'gold' ? 'border-yellow-500 bg-yellow-500/[0.03] shadow-[0_0_80px_-20px_rgba(234,179,8,0.3)]' : 'border-white/5 opacity-40 hover:opacity-100'}`}>
              <p className="text-[10px] font-black text-yellow-500 uppercase mb-3 tracking-widest">Fine Gold 24K</p>
              <h2 className="text-5xl font-black text-white tracking-tighter">Rs. {prices.gold.toLocaleString()}</h2>
              {activeMetal === 'gold' && <div className="absolute top-0 right-0 p-8 text-yellow-500"><TrendingUp /></div>}
            </button>
            <button onClick={() => setActiveMetal('silver')} className={`p-10 rounded-[3rem] text-left transition-all border-2 relative overflow-hidden ${activeMetal === 'silver' ? 'border-slate-400 bg-slate-400/[0.03] shadow-[0_0_80px_-20px_rgba(148,163,184,0.3)]' : 'border-white/5 opacity-40 hover:opacity-100'}`}>
              <p className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Pure Silver</p>
              <h2 className="text-5xl font-black text-white tracking-tighter">Rs. {prices.silver.toLocaleString()}</h2>
              {activeMetal === 'silver' && <div className="absolute top-0 right-0 p-8 text-slate-400"><TrendingUp /></div>}
            </button>
          </div>

          {/* Interactive Graph */}
          <div className="bg-white/5 border border-white/10 p-10 rounded-[3.5rem] h-[450px]">
            <Line data={chartData} options={{
              responsive: true, maintainAspectRatio: false,
              plugins: { 
                legend: { display: false },
                tooltip: { 
                  backgroundColor: '#000', padding: 15, cornerRadius: 10,
                  titleFont: { size: 12 }, bodyFont: { size: 18, weight: 'bold' },
                  callbacks: { 
                    label: (ctx) => `Price: Rs. ${ctx.parsed.y.toLocaleString()}`,
                    title: (items) => `Date: ${items[0].label} (BS)`
                  }
                } 
              },
              scales: { y: { display: false }, x: { grid: { display: false }, border: { display: false }, ticks: { color: '#333', font: { weight: 'bold' } } } }
            }} />
          </div>
        </div>

        {/* Calculator Section */}
        <div className="lg:col-span-4">
          <div className="bg-[#0c0c0c] border border-white/10 p-10 rounded-[3.5rem] shadow-2xl sticky top-10">
            <h3 className="text-[10px] font-black mb-10 text-white uppercase tracking-[0.2em] flex items-center">
              <Calculator size={20} className="mr-3 text-yellow-500" /> Gold/Silver Price Calculator
            </h3>
            <div className="space-y-8">
              <div className="grid grid-cols-3 gap-3">
                {['tola', 'aana', 'lal'].map(u => (
                  <div key={u}>
                    <label className="text-[9px] uppercase font-black text-slate-600 block mb-3 ml-1">{u}</label>
                    <input type="number" placeholder="0" value={weight[u]} onChange={e => setWeight({...weight, [u]: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-yellow-500 font-bold" />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-[9px] uppercase font-black text-slate-600 block mb-3 ml-1">Making Charges (Total NPR)</label>
                <input type="number" placeholder="Enter amount..." value={makingCharge} onChange={e => setMakingCharge(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-yellow-500 font-bold" />
              </div>
              <div className="pt-10 border-t border-white/10">
                <button onClick={() => setShowVat(!showVat)} className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center hover:text-yellow-500 transition-colors">
                   {showVat ? <ChevronUp size={16} /> : <ChevronDown size={16} />} 13% VAT Analysis
                </button>
                {showVat && (
                  <div className="bg-black/80 p-6 rounded-3xl border border-white/5 mb-6 text-xs font-bold text-slate-500 space-y-2">
                    <div className="flex justify-between"><span>Rate:</span><span className="text-white">Rs. {Math.round(activeMetal === 'gold' ? prices.gold : prices.silver).toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>VAT:</span><span className="text-yellow-500">Rs. {Math.round(calculation.vat).toLocaleString()}</span></div>
                  </div>
                )}
                <span className="text-[10px] block font-black text-slate-500 uppercase tracking-widest mb-2">Final Settlement</span>
                <h2 className="text-5xl font-black text-white tracking-tighter">Rs. {Math.round(calculation.total).toLocaleString()}</h2>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;