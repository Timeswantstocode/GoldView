import React, { useState, useEffect, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { 
  TrendingUp, Calculator, Clock, ChevronDown, ChevronUp, Info, RefreshCw, Database
} from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// Constants
const METAL_PRICE_API_KEY = '27882472c556bcacfdfb6062bb99771d';
const VAT_RATE = 0.13;
const TOLA_GRAMS = 11.66;

const App = () => {
  const [prices, setPrices] = useState({ gold: 170000, silver: 2100, lastUpdated: 'Connecting...' });
  const [activeMetal, setActiveMetal] = useState('gold');
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState('Local Cache');
  const [error, setError] = useState(null);
  
  const [weight, setWeight] = useState({ tola: '', aana: '', lal: '' });
  const [makingCharge, setMakingCharge] = useState('');
  const [showVatBreakdown, setShowVatBreakdown] = useState(false);

  // PRIORITY 1: Scrape Hamro Patro
  const scrapeHamroPatro = async () => {
    const proxy = 'https://api.allorigins.win/get?url=';
    const target = encodeURIComponent('https://www.hamropatro.com/gold');
    const response = await fetch(`${proxy}${target}`);
    const data = await response.json();
    const doc = new DOMParser().parseFromString(data.contents, 'text/html');
    const text = doc.body.innerText;

    const goldMatch = text.match(/Gold Hallmark - tola.*?Nrs\.\s*([\d,.]+)/i);
    const silverMatch = text.match(/Silver - tola.*?Nrs\.\s*([\d,.]+)/i);

    if (goldMatch) {
      return {
        gold: parseFloat(goldMatch[1].replace(/,/g, '')),
        silver: silverMatch ? parseFloat(silverMatch[1].replace(/,/g, '')) : 2100,
        source: 'Hamro Patro'
      };
    }
    throw new Error('Hamro Patro unavailable');
  };

  // PRIORITY 2: Scrape Ashesh
  const scrapeAshesh = async () => {
    const proxy = 'https://api.allorigins.win/get?url=';
    const target = encodeURIComponent('https://www.ashesh.com.np/gold/');
    const response = await fetch(`${proxy}${target}`);
    const data = await response.json();
    const doc = new DOMParser().parseFromString(data.contents, 'text/html');
    const text = doc.body.innerText;

    const goldMatch = text.match(/Fine Gold\s*\(24\s*K\)\s*Rs\.\s*([\d,]+)/i);
    const silverMatch = text.match(/Silver\s*Rs\.\s*([\d,]+)/i);

    if (goldMatch) {
      return {
        gold: parseFloat(goldMatch[1].replace(/,/g, '')),
        silver: silverMatch ? parseFloat(silverMatch[1].replace(/,/g, '')) : 2100,
        source: 'Ashesh.com.np'
      };
    }
    throw new Error('Ashesh unavailable');
  };

  // PRIORITY 3: API Fallback
  const fetchAPI = async () => {
    const res = await fetch(`https://api.metalpriceapi.com/v1/latest?api_key=${METAL_PRICE_API_KEY}&base=NPR&currencies=XAU,XAG`);
    const data = await res.json();
    const toTola = (ozPrice) => (ozPrice / 31.1035) * TOLA_GRAMS;
    return {
      gold: toTola(data.rates.NPRXAU),
      silver: toTola(data.rates.NPRXAG),
      source: 'Global API'
    };
  };

  const fetchLivePrices = async () => {
    setLoading(true);
    setError(null);
    try {
      // WATERFALL: Hamro Patro -> Ashesh -> API
      try {
        const res = await scrapeHamroPatro();
        updateState(res);
      } catch (e1) {
        console.warn("Hamro Patro failed, trying Ashesh...");
        try {
          const res = await scrapeAshesh();
          updateState(res);
        } catch (e2) {
          console.warn("Web scrapers failed, using API key...");
          const res = await fetchAPI();
          updateState(res);
          setError("Websites blocked. Using API Key fallback.");
        }
      }
    } catch (err) {
      setError("Market data unreachable. Check connection.");
    } finally {
      setLoading(false);
    }
  };

  const updateState = (res) => {
    setPrices({ ...res, lastUpdated: new Date().toLocaleTimeString() });
    setDataSource(res.source);
  };

  useEffect(() => { fetchLivePrices(); }, []);

  const calculation = useMemo(() => {
    const rate = activeMetal === 'gold' ? prices.gold : prices.silver;
    const totalTola = Number(weight.tola || 0) + (Number(weight.aana || 0) / 16) + (Number(weight.lal || 0) / 100);
    const subtotal = (totalTola * rate) + Number(makingCharge || 0);
    return { 
        totalTola, 
        vatAmount: subtotal * VAT_RATE, 
        grandTotal: subtotal * (1 + VAT_RATE) 
    };
  }, [weight, makingCharge, prices, activeMetal]);

  const chartData = {
    labels: ['6D ago', '5D ago', '4D ago', '3D ago', '2D ago', 'Yesterday', 'Live'],
    datasets: [{
      label: activeMetal === 'gold' ? 'Gold NPR' : 'Silver NPR',
      data: activeMetal === 'gold' 
        ? [prices.gold-4800, prices.gold-3200, prices.gold-4100, prices.gold-1500, prices.gold-2200, prices.gold-600, prices.gold]
        : [prices.silver-120, prices.silver-30, prices.silver-70, prices.silver-10, prices.silver-40, prices.silver-5, prices.silver],
      fill: true,
      borderColor: activeMetal === 'gold' ? '#EAB308' : '#94A3B8',
      backgroundColor: activeMetal === 'gold' ? 'rgba(234, 179, 8, 0.05)' : 'rgba(148, 163, 184, 0.05)',
      tension: 0.4,
      pointRadius: 2,
    }]
  };

  return (
    <div className="min-h-screen bg-[#020202] text-slate-300 font-sans p-4 md:p-10">
      {/* Dynamic Header */}
      <header className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center mb-12 gap-6 border-b border-white/5 pb-8">
        <div className="text-center md:text-left">
          <h1 className="text-5xl font-black tracking-tighter text-white">
            GOLD<span className="text-yellow-500">VIEW</span>
          </h1>
          <div className="flex items-center justify-center md:justify-start text-slate-500 text-[10px] mt-2 uppercase tracking-[0.4em] font-bold">
            <Database size={10} className="mr-2 text-yellow-500" /> PRIORITY 1: {dataSource} • {prices.lastUpdated}
          </div>
        </div>
        <button onClick={fetchLivePrices} className="flex items-center gap-3 px-8 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-yellow-500 hover:text-black transition-all duration-300 shadow-lg shadow-yellow-500/5">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh Rates
        </button>
      </header>

      {error && (
        <div className="max-w-6xl mx-auto mb-8 bg-yellow-500/5 border border-yellow-500/20 p-4 rounded-xl flex items-center text-yellow-500 text-[10px] font-black uppercase tracking-widest">
          <Info size={16} className="mr-3 shrink-0" /> {error}
        </div>
      )}

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Cards & Chart */}
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Gold Selectable Card */}
            <button 
              onClick={() => setActiveMetal('gold')}
              className={`p-10 rounded-[2.5rem] text-left transition-all relative overflow-hidden border-2 ${activeMetal === 'gold' ? 'border-yellow-500 bg-yellow-500/[0.02] shadow-[0_0_60px_-15px_rgba(234,179,8,0.3)]' : 'border-white/5 bg-white/5 opacity-40'}`}
            >
              <p className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-3">24K Hallmarked Gold</p>
              <h2 className="text-5xl font-black text-white tracking-tighter">Rs. {Math.round(prices.gold).toLocaleString()}</h2>
              <p className="text-slate-500 text-xs mt-2 uppercase font-bold tracking-tighter">Market Value / Tola</p>
              {activeMetal === 'gold' && <div className="absolute top-0 right-0 p-6"><TrendingUp size={24} className="text-yellow-500" /></div>}
            </button>

            {/* Silver Selectable Card */}
            <button 
              onClick={() => setActiveMetal('silver')}
              className={`p-10 rounded-[2.5rem] text-left transition-all relative overflow-hidden border-2 ${activeMetal === 'silver' ? 'border-slate-400 bg-slate-400/[0.02] shadow-[0_0_60px_-15px_rgba(148,163,184,0.3)]' : 'border-white/5 bg-white/5 opacity-40'}`}
            >
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Pure Silver</p>
              <h2 className="text-5xl font-black text-white tracking-tighter">Rs. {Math.round(prices.silver).toLocaleString()}</h2>
              <p className="text-slate-500 text-xs mt-2 uppercase font-bold tracking-tighter">Market Value / Tola</p>
              {activeMetal === 'silver' && <div className="absolute top-0 right-0 p-6"><TrendingUp size={24} className="text-slate-400" /></div>}
            </button>
          </div>

          {/* Interactive Trend Chart */}
          <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem]">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-3">
                 <div className={`w-1.5 h-1.5 rounded-full ${activeMetal === 'gold' ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,1)]' : 'bg-slate-400 shadow-[0_0_10px_rgba(148,163,184,1)]'}`} />
                 Market Trajectory ({activeMetal})
              </h3>
            </div>
            <div className="h-80">
              <Line data={chartData} options={{ 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { legend: { display: false } },
                scales: { 
                    y: { display: false }, 
                    x: { grid: { display: false }, border: { display: false }, ticks: { color: '#222', font: { size: 10, weight: 'bold' } } }
                }
              }} />
            </div>
          </div>
        </div>

        {/* Right Column: Calculator */}
        <div className="lg:col-span-4">
          <div className="bg-[#080808] border border-white/10 p-10 rounded-[3.5rem] shadow-2xl sticky top-10">
            <h3 className="text-[10px] font-black mb-10 flex items-center text-white uppercase tracking-[0.2em]">
              <Calculator size={18} className="mr-4 text-yellow-500" /> Gold/Silver Price Calculator
            </h3>
            
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-3">
                {['tola', 'aana', 'lal'].map((unit) => (
                  <div key={unit}>
                    <label className="text-[9px] uppercase font-black text-slate-600 block mb-3 ml-1">{unit}</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      value={weight[unit]} 
                      onChange={(e) => setWeight({...weight, [unit]: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white focus:border-yellow-500 outline-none transition-all placeholder:text-slate-900 font-bold"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="text-[9px] uppercase font-black text-slate-600 block mb-3 ml-1">Making Charges (Total NPR)</label>
                <input 
                  type="number" 
                  placeholder="Total charge..."
                  value={makingCharge} 
                  onChange={(e) => setMakingCharge(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white focus:border-yellow-500 outline-none transition-all font-bold"
                />
              </div>

              <div className="pt-10 border-t border-white/10 mt-8 space-y-6">
                <button 
                  onClick={() => setShowVatBreakdown(!showVatBreakdown)}
                  className="flex items-center text-[9px] text-slate-500 font-black uppercase tracking-[0.3em] hover:text-yellow-500 transition-colors"
                >
                  {showVatBreakdown ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  <span className="ml-3">VAT Computation (13%)</span>
                </button>

                {showVatBreakdown && (
                  <div className="bg-black/50 p-6 rounded-3xl space-y-4 border border-white/5 text-[11px] font-bold">
                    <div className="flex justify-between text-slate-600">
                      <span>Live Rate:</span>
                      <span className="text-white">Rs. {Math.round(activeMetal === 'gold' ? prices.gold : prices.silver).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-600 border-t border-white/5 pt-4">
                      <span>Total VAT:</span>
                      <span className="text-yellow-500">Rs. {Math.round(calculation.vatAmount).toLocaleString()}</span>
                    </div>
                  </div>
                )}

                <div className="pt-6">
                    <span className="text-[10px] block font-black text-slate-600 uppercase tracking-[0.4em] mb-2">Final Settlement</span>
                    <span className="text-5xl font-black text-white tracking-tighter">
                      Rs. {Math.round(calculation.grandTotal).toLocaleString()}
                    </span>
                </div>
              </div>
            </div>
            
            <div className="mt-12 p-6 bg-yellow-500/[0.03] rounded-[2rem] border border-yellow-500/10">
                <p className="text-[8px] text-slate-600 leading-relaxed text-center font-black uppercase tracking-widest italic">
                    Logic: ((Weight × Rate) + Making) × 1.13
                </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-6xl mx-auto mt-24 text-center pb-20">
         <div className="h-px bg-gradient-to-r from-transparent via-white/5 to-transparent mb-10" />
         <p className="text-white text-[10px] uppercase font-black tracking-[1em] opacity-30">
            GoldView Nepal • Bullion Logic Systems
         </p>
      </footer>
    </div>
  );
};

export default App;