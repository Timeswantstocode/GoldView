import React, { useState, useEffect, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { TrendingUp, Calculator, Clock, RefreshCw, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const VAT_RATE = 0.13;

const App = () => {
  const [prices, setPrices] = useState({ gold: 0, silver: 0, lastUpdated: '', source: 'Loading...' });
  const [activeMetal, setActiveMetal] = useState('gold');
  const [loading, setLoading] = useState(true);
  const [weight, setWeight] = useState({ tola: '', aana: '', lal: '' });
  const [makingCharge, setMakingCharge] = useState('');
  const [showVat, setShowVat] = useState(false);

  // Simple AD to BS conversion for display
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
      // Use cache buster to prevent old data on iPhone
      const response = await fetch(`https://raw.githubusercontent.com/Timeswantstocode/GoldView/main/data.json?t=${Date.now()}`);
      const data = await response.json();
      setPrices({
        gold: data.gold,
        silver: data.silver,
        source: data.source,
        lastUpdated: toBS(data.date)
      });
    } catch (e) {
      console.error("Data file not found yet.");
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const calculation = useMemo(() => {
    const rate = activeMetal === 'gold' ? prices.gold : prices.silver;
    const totalTola = Number(weight.tola || 0) + (Number(weight.aana || 0) / 16) + (Number(weight.lal || 0) / 100);
    const subtotal = (totalTola * rate) + Number(makingCharge || 0);
    return { 
      vat: subtotal * VAT_RATE, 
      total: subtotal * (1 + VAT_RATE) 
    };
  }, [weight, makingCharge, prices, activeMetal]);

  const chartData = {
    labels: ['18 Magh', '19 Magh', '20 Magh', '21 Magh', '22 Magh', '23 Magh', 'Today'],
    datasets: [{
      label: activeMetal === 'gold' ? 'Gold Price' : 'Silver Price',
      data: activeMetal === 'gold' 
        ? [prices.gold-2000, prices.gold-1500, prices.gold-2500, prices.gold-800, prices.gold-1200, prices.gold-400, prices.gold]
        : [prices.silver-80, prices.silver-30, prices.silver-50, prices.silver-10, prices.silver-25, prices.silver-5, prices.silver],
      fill: true,
      borderColor: activeMetal === 'gold' ? '#F59E0B' : '#94A3B8',
      backgroundColor: activeMetal === 'gold' ? 'rgba(245, 158, 11, 0.05)' : 'rgba(148, 163, 184, 0.05)',
      tension: 0.4,
      pointRadius: 6,
      pointHoverRadius: 10,
    }]
  };

  return (
    <div className="min-h-screen bg-[#020202] text-slate-200 p-4 md:p-10 font-sans">
      <header className="max-w-6xl mx-auto flex justify-between items-center mb-10 border-b border-white/5 pb-8">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-white italic">GOLD<span className="text-yellow-500">VIEW</span></h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
            <ShieldCheck size={10} className="inline mr-1 text-green-500" /> {prices.source} • {prices.lastUpdated}
          </p>
        </div>
        <button onClick={loadData} className="p-4 bg-white/5 rounded-2xl hover:bg-yellow-500 hover:text-black transition-all">
          <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
        </button>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Cards & Graph */}
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button onClick={() => setActiveMetal('gold')} className={`p-8 rounded-[2.5rem] text-left transition-all border-2 ${activeMetal === 'gold' ? 'border-yellow-500 bg-yellow-500/5' : 'border-white/5 opacity-40'}`}>
              <p className="text-[10px] font-black text-yellow-500 uppercase mb-2">Fine Gold 24K</p>
              <h2 className="text-4xl font-black text-white tracking-tighter">Rs. {prices.gold.toLocaleString()}</h2>
            </button>
            <button onClick={() => setActiveMetal('silver')} className={`p-8 rounded-[2.5rem] text-left transition-all border-2 ${activeMetal === 'silver' ? 'border-slate-400 bg-slate-400/5' : 'border-white/5 opacity-40'}`}>
              <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Pure Silver</p>
              <h2 className="text-4xl font-black text-white tracking-tighter">Rs. {prices.silver.toLocaleString()}</h2>
            </button>
          </div>

          <div className="bg-white/5 border border-white/10 p-8 rounded-[3rem] h-[380px]">
            <Line data={chartData} options={{
              responsive: true, maintainAspectRatio: false,
              plugins: { 
                legend: { display: false },
                tooltip: { 
                  backgroundColor: '#000', 
                  padding: 15,
                  titleFont: { size: 12 },
                  bodyFont: { size: 16, weight: 'bold' },
                  callbacks: { label: (ctx) => `Rs. ${ctx.parsed.y.toLocaleString()}` }
                } 
              },
              scales: { y: { display: false }, x: { grid: { display: false }, border: { display: false } } }
            }} />
          </div>
        </div>

        {/* Right: Calculator */}
        <div className="lg:col-span-4">
          <div className="bg-[#0c0c0c] border border-white/10 p-8 rounded-[3rem] shadow-2xl">
            <h3 className="text-[11px] font-black mb-8 text-white uppercase tracking-widest flex items-center">
              <Calculator size={16} className="mr-3 text-yellow-500" /> Gold/Silver Price Calculator
            </h3>
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-2">
                {['tola', 'aana', 'lal'].map(u => (
                  <div key={u}>
                    <label className="text-[9px] uppercase font-bold text-slate-600 block mb-2 ml-1">{u}</label>
                    <input type="number" value={weight[u]} onChange={e => setWeight({...weight, [u]: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-yellow-500 font-bold" />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-[9px] uppercase font-bold text-slate-600 block mb-2 ml-1">Making Charges (NPR)</label>
                <input type="number" placeholder="Total charge..." value={makingCharge} onChange={e => setMakingCharge(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-yellow-500 font-bold" />
              </div>
              <div className="pt-8 border-t border-white/10">
                <button onClick={() => setShowVat(!showVat)} className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center">
                   {showVat ? <ChevronUp size={14} /> : <ChevronDown size={14} />} VAT Breakdown
                </button>
                {showVat && (
                  <div className="bg-black/50 p-4 rounded-2xl border border-white/5 mb-4 text-[11px] font-bold text-slate-400">
                    <div className="flex justify-between mb-2"><span>13% VAT:</span><span className="text-yellow-500">Rs. {Math.round(calculation.vat).toLocaleString()}</span></div>
                  </div>
                )}
                <span className="text-[10px] block font-bold text-slate-500 uppercase tracking-widest mb-1">Final Amount</span>
                <h2 className="text-4xl font-black text-white tracking-tighter">Rs. {Math.round(calculation.total).toLocaleString()}</h2>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
