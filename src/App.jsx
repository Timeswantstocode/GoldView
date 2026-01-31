import React, { useState, useEffect, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { TrendingUp, Calculator, Clock, RefreshCw, ShieldCheck, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const VAT_RATE = 0.13;

const App = () => {
  const [prices, setPrices] = useState({ gold: 318800, silver: 7065, source: 'Initial', lastUpdated: '' });
  const [activeMetal, setActiveMetal] = useState('gold');
  const [loading, setLoading] = useState(true);
  const [weight, setWeight] = useState({ tola: '', aana: '', lal: '' });
  const [makingCharge, setMakingCharge] = useState('');
  const [showVat, setShowVat] = useState(false);

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
    } catch (e) {
      setPrices(prev => ({ ...prev, source: 'Offline Cache', lastUpdated: toBS() }));
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const calculation = useMemo(() => {
    const rate = activeMetal === 'gold' ? prices.gold : prices.silver;
    const totalTola = Number(weight.tola || 0) + (Number(weight.aana || 0) / 16) + (Number(weight.lal || 0) / 100);
    const subtotal = (totalTola * rate) + Number(makingCharge || 0);
    return { vat: subtotal * VAT_RATE, total: subtotal * (1 + VAT_RATE) };
  }, [weight, makingCharge, prices, activeMetal]);

  return (
    <div className="min-h-screen bg-[#020202] text-slate-300 font-sans p-4 md:p-10 selection:bg-yellow-500/30">
      <header className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center mb-12 border-b border-white/5 pb-10">
        <div className="text-center md:text-left">
          <h1 className="text-6xl font-black tracking-tighter text-white italic">GOLD<span className="text-yellow-500">VIEW</span></h1>
          <div className="flex items-center justify-center md:justify-start text-slate-500 text-[10px] mt-2 uppercase tracking-[0.4em] font-bold">
            <ShieldCheck size={12} className="mr-2 text-green-500" /> SOURCE: {prices.source} • {prices.lastUpdated}
          </div>
        </div>
        <button onClick={loadData} className="p-5 bg-white/5 rounded-2xl hover:bg-yellow-500 transition-all">
          <RefreshCw size={24} className={loading ? "animate-spin text-yellow-500" : ""} />
        </button>
      </header>

      {prices.source.includes('API') && (
        <div className="max-w-6xl mx-auto mb-8 bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-2xl flex items-center text-yellow-500 text-xs font-bold uppercase">
          <AlertTriangle size={16} className="mr-3" /> Scraper blocked by Federation. Using Duty-Adjusted API.
        </div>
      )}

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button onClick={() => setActiveMetal('gold')} className={`p-10 rounded-[3rem] text-left border-2 transition-all ${activeMetal === 'gold' ? 'border-yellow-500 bg-yellow-500/[0.03]' : 'border-white/5 opacity-40'}`}>
              <p className="text-[10px] font-black text-yellow-500 uppercase mb-3 tracking-widest">Fine Gold 24K</p>
              <h2 className="text-5xl font-black text-white tracking-tighter">Rs. {prices.gold.toLocaleString()}</h2>
            </button>
            <button onClick={() => setActiveMetal('silver')} className={`p-10 rounded-[3rem] text-left border-2 transition-all ${activeMetal === 'silver' ? 'border-slate-400 bg-slate-400/[0.03]' : 'border-white/5 opacity-40'}`}>
              <p className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Pure Silver</p>
              <h2 className="text-5xl font-black text-white tracking-tighter">Rs. {prices.silver.toLocaleString()}</h2>
            </button>
          </div>
          
          {/* Graph Placeholder */}
          <div className="bg-white/5 border border-white/10 p-10 rounded-[3.5rem] h-64 flex items-center justify-center text-slate-600 italic">
            Graph scaling to Rs. {activeMetal === 'gold' ? prices.gold.toLocaleString() : prices.silver.toLocaleString()}...
          </div>
        </div>

        <div className="lg:col-span-4">
          <div className="bg-[#0c0c0c] border border-white/10 p-10 rounded-[3.5rem] shadow-2xl">
            <h3 className="text-[10px] font-black mb-10 text-white uppercase tracking-[0.2em] flex items-center">
              <Calculator size={20} className="mr-3 text-yellow-500" /> Gold/Silver Price Calculator
            </h3>
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-2">
                {['tola', 'aana', 'lal'].map(u => (
                  <div key={u}>
                    <label className="text-[9px] uppercase font-bold text-slate-600 block mb-2">{u}</label>
                    <input type="number" value={weight[u]} onChange={e => setWeight({...weight, [u]: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-yellow-500" />
                  </div>
                ))}
              </div>
              <input type="number" placeholder="Making Charges" value={makingCharge} onChange={e => setMakingCharge(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white outline-none" />
              <div className="pt-8 border-t border-white/10">
                <span className="text-[10px] block font-black text-slate-500 uppercase mb-2">Grand Total</span>
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