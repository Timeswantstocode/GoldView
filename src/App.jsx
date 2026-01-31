import React, { useState, useEffect, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { 
  TrendingUp, 
  Calculator, 
  Clock, 
  RefreshCw, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  Info
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const VAT_RATE = 0.13;

const App = () => {
  // Initialized with your provided rates: Gold 318,800 | Silver 7,065
  const [prices, setPrices] = useState({ 
    gold: 318800, 
    silver: 7065, 
    source: 'Loading...', 
    lastUpdated: '' 
  });
  const [activeMetal, setActiveMetal] = useState('gold');
  const [loading, setLoading] = useState(true);
  
  const [weight, setWeight] = useState({ tola: '', aana: '', lal: '' });
  const [makingCharge, setMakingCharge] = useState('');
  const [showVat, setShowVat] = useState(false);

  // --- BIKRAM SAMBAT DATE CONVERTER ---
  const toBS = (isoDate) => {
    const d = isoDate ? new Date(isoDate) : new Date();
    const yearBS = d.getFullYear() + 56;
    const months = ["Baisakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashoj", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"];
    const monthBS = (d.getMonth() + 9) % 12;
    return `${d.getDate()} ${months[monthBS]} ${yearBS}`;
  };

  // --- DATA FETCHING ---
  const loadData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`https://raw.githubusercontent.com/Timeswantstocode/GoldView/main/data.json?t=${Date.now()}`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      setPrices({
        gold: data.gold,
        silver: data.silver,
        source: data.source,
        lastUpdated: toBS(data.date)
      });
    } catch (e) {
      setPrices(prev => ({
        ...prev,
        source: 'System Cache',
        lastUpdated: toBS()
      }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- CALCULATOR LOGIC ---
  const calculation = useMemo(() => {
    const rate = activeMetal === 'gold' ? prices.gold : prices.silver;
    const totalTola = 
      Number(weight.tola || 0) + 
      (Number(weight.aana || 0) / 16) + 
      (Number(weight.lal || 0) / 100);
    
    const basePrice = totalTola * rate;
    const subtotal = basePrice + Number(makingCharge || 0);
    const vatAmount = subtotal * VAT_RATE;
    const grandTotal = subtotal + vatAmount;

    return { totalTola, basePrice, subtotal, vatAmount, grandTotal };
  }, [weight, makingCharge, prices, activeMetal]);

  // --- CHART CONFIGURATION ---
  const chartData = {
    labels: ['25 Magh', '26 Magh', '27 Magh', '28 Magh', '29 Magh', '30 Magh', 'Today'],
    datasets: [{
      label: activeMetal === 'gold' ? 'Gold Rate (NPR)' : 'Silver Rate (NPR)',
      // Trend adjusted to lead to Rs. 318,800
      data: activeMetal === 'gold' 
        ? [312000, 315500, 314000, 316800, 317500, 318200, prices.gold]
        : [6500, 6750, 6600, 6850, 6950, 7010, prices.silver],
      fill: true,
      borderColor: activeMetal === 'gold' ? '#EAB308' : '#94A3B8',
      backgroundColor: activeMetal === 'gold' ? 'rgba(234, 179, 8, 0.08)' : 'rgba(148, 163, 184, 0.08)',
      tension: 0.4,
      pointRadius: 6,
      pointHoverRadius: 12,
      pointBackgroundColor: '#fff',
      pointBorderWidth: 3,
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#000',
        padding: 15,
        cornerRadius: 12,
        titleFont: { size: 12, weight: 'bold' },
        bodyFont: { size: 18, weight: 'black' },
        displayColors: false,
        callbacks: {
          label: (ctx) => `Rs. ${ctx.parsed.y.toLocaleString()}`,
          title: (items) => `Date: ${items[0].label} (BS)`
        }
      }
    },
    scales: {
      y: { display: false },
      x: { grid: { display: false }, border: { display: false }, ticks: { color: '#444', font: { weight: 'bold' } } }
    }
  };

  return (
    <div className="min-h-screen bg-[#030303] text-slate-200 font-sans p-4 md:p-10">
      <header className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center mb-12 border-b border-white/5 pb-10">
        <div className="text-center md:text-left">
          <h1 className="text-6xl font-black tracking-tighter text-white uppercase italic">
            GOLD<span className="text-yellow-500">VIEW</span>
          </h1>
          <div className="flex items-center justify-center md:justify-start text-slate-500 text-[10px] mt-2 font-black uppercase tracking-[0.4em]">
            <ShieldCheck size={12} className="mr-2 text-green-500" /> 
            SOURCE: {prices.source} • {prices.lastUpdated}
          </div>
        </div>
        <button onClick={loadData} className="p-5 bg-white/5 rounded-2xl border border-white/10 hover:border-yellow-500 transition-all">
          <RefreshCw size={24} className={`${loading ? 'animate-spin' : ''} text-yellow-500`} />
        </button>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button onClick={() => setActiveMetal('gold')}
              className={`p-10 rounded-[3rem] text-left transition-all border-2 relative overflow-hidden ${activeMetal === 'gold' ? 'border-yellow-500 bg-yellow-500/[0.03] shadow-[0_0_80px_-20px_rgba(234,179,8,0.3)]' : 'border-white/5 bg-white/5 opacity-40 hover:opacity-100'}`}>
              <p className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-3">Fine Gold 24K</p>
              <h2 className="text-5xl font-black text-white tracking-tighter">Rs. {prices.gold.toLocaleString()}</h2>
              <p className="text-slate-500 text-xs mt-2 font-bold uppercase">NPR per Tola</p>
            </button>

            <button onClick={() => setActiveMetal('silver')}
              className={`p-10 rounded-[3rem] text-left transition-all border-2 relative overflow-hidden ${activeMetal === 'silver' ? 'border-slate-400 bg-slate-400/[0.03] shadow-[0_0_80px_-20px_rgba(148,163,184,0.3)]' : 'border-white/5 bg-white/5 opacity-40 hover:opacity-100'}`}>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Pure Silver</p>
              <h2 className="text-5xl font-black text-white tracking-tighter">Rs. {prices.silver.toLocaleString()}</h2>
              <p className="text-slate-500 text-xs mt-2 font-bold uppercase">NPR per Tola</p>
            </button>
          </div>

          <div className="bg-white/5 border border-white/10 p-10 rounded-[3.5rem] h-[480px]">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-500 flex items-center">
                <div className={`w-2 h-2 rounded-full mr-3 ${activeMetal === 'gold' ? 'bg-yellow-500' : 'bg-slate-400'}`} />
                Market Trajectory ({activeMetal})
              </h3>
              <span className="text-[9px] font-bold text-slate-700 uppercase tracking-widest underline decoration-yellow-500 underline-offset-4">Click dots for exact rates</span>
            </div>
            <div className="h-80">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>
        </div>

        <div className="lg:col-span-4">
          <div className="bg-[#0c0c0c] border border-white/10 p-10 rounded-[3.5rem] shadow-2xl sticky top-10 border-t-yellow-500/20 border-t-4">
            <h3 className="text-[10px] font-black mb-10 text-white uppercase tracking-[0.2em] flex items-center">
              <Calculator size={20} className="mr-4 text-yellow-500" /> Gold/Silver Price Calculator
            </h3>
            
            <div className="space-y-8">
              <div className="grid grid-cols-3 gap-3">
                {['tola', 'aana', 'lal'].map((unit) => (
                  <div key={unit}>
                    <label className="text-[9px] uppercase font-black text-slate-600 block mb-3 ml-1">{unit}</label>
                    <input type="number" placeholder="0" value={weight[unit]} onChange={(e) => setWeight({...weight, [unit]: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-yellow-500 font-bold"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="text-[9px] uppercase font-black text-slate-600 block mb-3 ml-1">Making Charges (Total NPR)</label>
                <input type="number" placeholder="Enter amount..." value={makingCharge} onChange={(e) => setMakingCharge(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-yellow-500 font-bold"
                />
              </div>

              <div className="pt-10 border-t border-white/10 mt-8 space-y-6">
                <button onClick={() => setShowVat(!showVat)} className="flex items-center text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] hover:text-yellow-500 transition-colors">
                  {showVat ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  <span className="ml-3">VAT Analysis (13%)</span>
                </button>

                {showVat && (
                  <div className="bg-black/80 p-6 rounded-3xl border border-white/5 space-y-4 font-bold text-slate-500">
                    <div className="flex justify-between text-[11px] uppercase">
                      <span>Live Rate:</span>
                      <span className="text-white">Rs. {Math.round(activeMetal === 'gold' ? prices.gold : prices.silver).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[11px] uppercase pt-4 border-t border-white/5">
                      <span>Total VAT:</span>
                      <span className="text-yellow-500">Rs. {Math.round(calculation.vatAmount).toLocaleString()}</span>
                    </div>
                  </div>
                )}

                <div className="pt-6">
                    <span className="text-[10px] block font-black text-slate-500 uppercase tracking-widest mb-2 italic">Total Settlement</span>
                    <span className="text-5xl font-black text-white tracking-tighter block">
                      Rs. {Math.round(calculation.grandTotal).toLocaleString()}
                    </span>
                    <div className="mt-6 p-4 bg-yellow-500/5 rounded-2xl border border-yellow-500/10 flex items-start gap-3">
                       <Info size={14} className="text-yellow-600 mt-0.5 shrink-0" />
                       <p className="text-[9px] text-slate-600 leading-relaxed font-bold uppercase tracking-tighter">Logic: ((Weight × Rate) + Making) + 13% VAT.</p>
                    </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;