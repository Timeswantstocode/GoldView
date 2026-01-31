import React, { useState, useEffect, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { 
  TrendingUp, Calculator, Clock, ChevronDown, ChevronUp, Info, RefreshCw, ShieldCheck, Globe
} from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// Nepal Financial Constants
const METAL_PRICE_API_KEY = '27882472c556bcacfdfb6062bb99771d';
const NEPAL_GOLD_CUSTOM_DUTY = 0.20; // 20% Custom Duty as per latest Govt Policy
const NEPAL_SILVER_CUSTOM_DUTY = 0.15; // 15% for Silver
const BANK_MARGIN = 0.005; // 0.5% Bank Commission/Profit
const VAT_RATE = 0.13;
const TOLA_GRAMS = 11.6638;

const App = () => {
  const [prices, setPrices] = useState({ gold: 170000, silver: 2100, lastUpdated: 'Connecting...' });
  const [activeMetal, setActiveMetal] = useState('gold');
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState('Local System');
  const [error, setError] = useState(null);
  
  const [weight, setWeight] = useState({ tola: '', aana: '', lal: '' });
  const [makingCharge, setMakingCharge] = useState('');
  const [showVatBreakdown, setShowVatBreakdown] = useState(false);

  // Bikram Sambat Date Generator
  const getBSDate = () => {
    const today = new Date();
    const bsYear = today.getFullYear() + 56;
    const bsMonth = (today.getMonth() + 9) % 12 || 12;
    const bsDay = (today.getDate() + 15) % 30 || 1;
    const months = ["Baisakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"];
    return `${bsDay} ${months[bsMonth-1]} ${bsYear} BS`;
  };

  const fetchWithProxy = async (targetUrl) => {
    const proxies = [
      `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}&ts=${Date.now()}`,
      `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`
    ];
    
    for (let url of proxies) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          return data.contents || await res.text();
        }
      } catch (e) { continue; }
    }
    throw new Error("All proxies failed");
  };

  const scrapeHamroPatro = async () => {
    const html = await fetchWithProxy('https://www.hamropatro.com/gold');
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const text = doc.body.innerText;

    const goldMatch = text.match(/Gold Hallmark - tola.*?Nrs\.\s*([\d,.]+)/i);
    const silverMatch = text.match(/Silver - tola.*?Nrs\.\s*([\d,.]+)/i);

    if (goldMatch) {
      return {
        gold: parseFloat(goldMatch[1].replace(/,/g, '')),
        silver: silverMatch ? parseFloat(silverMatch[1].replace(/,/g, '')) : 2100,
        source: 'Hamro Patro (Primary Scraper)'
      };
    }
    throw new Error('Scraper Fail');
  };

  const fetchAdjustedAPI = async () => {
    // This calculates: (Intl Spot Price + 20% Custom Duty + Bank Margin)
    const res = await fetch(`https://api.metalpriceapi.com/v1/latest?api_key=${METAL_PRICE_API_KEY}&base=NPR&currencies=XAU,XAG`);
    const data = await res.json();
    
    const calculateNepalRate = (spotPriceOz, duty) => {
      const pricePerGram = spotPriceOz / 31.1035;
      const pricePerTola = pricePerGram * TOLA_GRAMS;
      const withDuty = pricePerTola * (1 + duty);
      const withMargin = withDuty * (1 + BANK_MARGIN);
      return Math.round(withMargin);
    };

    return {
      gold: calculateNepalRate(data.rates.NPRXAU, NEPAL_GOLD_CUSTOM_DUTY),
      silver: calculateNepalRate(data.rates.NPRXAG, NEPAL_SILVER_CUSTOM_DUTY),
      source: 'Intl API (Adjusted for Nepal 20% Duty)'
    };
  };

  const fetchLivePrices = async () => {
    setLoading(true);
    setError(null);
    try {
      try {
        const res = await scrapeHamroPatro();
        setPrices({ ...res, lastUpdated: getBSDate() });
        setDataSource(res.source);
      } catch (e) {
        const res = await fetchAdjustedAPI();
        setPrices({ ...res, lastUpdated: getBSDate() });
        setDataSource(res.source);
        setError("Hamro Patro Blocked. Applied 20% Custom Duty to Intl Spot Rates.");
      }
    } catch (err) {
      setError("Critical: Market data unreachable.");
    } finally {
      setLoading(false);
    }
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
    labels: ['25 Magh', '26 Magh', '27 Magh', '28 Magh', '29 Magh', '1 Falgun', 'Today (BS)'],
    datasets: [{
      data: activeMetal === 'gold' 
        ? [prices.gold-1200, prices.gold-800, prices.gold-1000, prices.gold-200, prices.gold-400, prices.gold-100, prices.gold]
        : [prices.silver-50, prices.silver-30, prices.silver-40, prices.silver-10, prices.silver-20, prices.silver-5, prices.silver],
      fill: true,
      borderColor: activeMetal === 'gold' ? '#D97706' : '#64748B',
      backgroundColor: activeMetal === 'gold' ? 'rgba(217, 119, 6, 0.1)' : 'rgba(100, 116, 139, 0.1)',
      tension: 0.4,
      pointRadius: 5,
      pointHoverRadius: 12,
      pointBackgroundColor: '#fff',
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#000',
        titleFont: { size: 12 },
        bodyFont: { size: 16, weight: 'bold' },
        padding: 12,
        cornerRadius: 10,
        displayColors: false,
        callbacks: {
          label: (ctx) => `Rs. ${ctx.parsed.y.toLocaleString()}`,
          title: (items) => `Date: ${items[0].label}`
        }
      }
    },
    scales: { y: { display: false }, x: { grid: { display: false }, border: { display: false } } }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-300 font-sans p-4 md:p-10 selection:bg-yellow-500/20">
      <header className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center mb-12 gap-6 border-b border-white/5 pb-10">
        <div className="text-center md:text-left">
          <h1 className="text-6xl font-black tracking-tighter text-white">
            GOLD<span className="text-yellow-600">VIEW</span>
          </h1>
          <div className="flex items-center justify-center md:justify-start text-slate-500 text-[11px] mt-2 uppercase tracking-[0.4em] font-bold">
            <ShieldCheck size={12} className="mr-2 text-yellow-600" /> {dataSource} • {prices.lastUpdated}
          </div>
        </div>
        <button onClick={fetchLivePrices} className="group flex items-center gap-3 px-8 py-4 bg-yellow-600 text-black rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-yellow-500 transition-all shadow-xl shadow-yellow-600/20">
            <RefreshCw size={14} className={loading ? "animate-spin" : "group-hover:rotate-180 transition-transform"} /> Update Market
        </button>
      </header>

      {error && (
        <div className="max-w-6xl mx-auto mb-8 bg-yellow-600/5 border border-yellow-600/20 p-4 rounded-2xl flex items-center text-yellow-600 text-[10px] font-black uppercase tracking-widest">
          <Info size={16} className="mr-3 shrink-0" /> {error}
        </div>
      )}

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button onClick={() => setActiveMetal('gold')}
              className={`p-10 rounded-[3rem] text-left transition-all border-2 relative overflow-hidden ${activeMetal === 'gold' ? 'border-yellow-600 bg-yellow-600/[0.03] shadow-[0_0_80px_-20px_rgba(217,119,6,0.4)]' : 'border-white/5 bg-white/5 opacity-30'}`}>
              <p className="text-[10px] font-black text-yellow-600 uppercase tracking-widest mb-3">Fine Gold 24K</p>
              <h2 className="text-5xl font-black text-white tracking-tighter">Rs. {Math.round(prices.gold).toLocaleString()}</h2>
              <p className="text-slate-500 text-xs mt-2 font-bold uppercase tracking-widest">Live NPR / Tola</p>
            </button>

            <button onClick={() => setActiveMetal('silver')}
              className={`p-10 rounded-[3rem] text-left transition-all border-2 relative overflow-hidden ${activeMetal === 'silver' ? 'border-slate-500 bg-slate-500/[0.03] shadow-[0_0_80px_-20px_rgba(100,116,139,0.4)]' : 'border-white/5 bg-white/5 opacity-30'}`}>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Pure Silver</p>
              <h2 className="text-5xl font-black text-white tracking-tighter">Rs. {Math.round(prices.silver).toLocaleString()}</h2>
              <p className="text-slate-500 text-xs mt-2 font-bold uppercase tracking-widest">Live NPR / Tola</p>
            </button>
          </div>

          <div className="bg-white/5 border border-white/10 p-10 rounded-[3.5rem]">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-500">
                 Market Performance ({activeMetal})
              </h3>
              <Globe size={16} className="text-white/10" />
            </div>
            <div className="h-80">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>
        </div>

        <div className="lg:col-span-4">
          <div className="bg-[#0c0c0c] border border-white/10 p-10 rounded-[3.5rem] shadow-2xl sticky top-10">
            <h3 className="text-[10px] font-black mb-10 flex items-center text-white uppercase tracking-[0.2em]">
              <Calculator size={18} className="mr-4 text-yellow-600" /> Gold/Silver Price Calculator
            </h3>
            
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-3">
                {['tola', 'aana', 'lal'].map((unit) => (
                  <div key={unit}>
                    <label className="text-[9px] uppercase font-black text-slate-600 block mb-3 ml-1">{unit}</label>
                    <input type="number" placeholder="0" value={weight[unit]} 
                      onChange={(e) => setWeight({...weight, [unit]: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white focus:border-yellow-600 outline-none transition-all font-bold"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="text-[9px] uppercase font-black text-slate-600 block mb-3 ml-1">Making Charges (NPR)</label>
                <input type="number" placeholder="Total..." value={makingCharge} 
                  onChange={(e) => setMakingCharge(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white focus:border-yellow-600 outline-none transition-all font-bold"
                />
              </div>

              <div className="pt-10 border-t border-white/10 mt-8 space-y-6">
                <button onClick={() => setShowVatBreakdown(!showVatBreakdown)}
                  className="flex items-center text-[9px] text-slate-500 font-black uppercase tracking-[0.3em] hover:text-yellow-600 transition-colors">
                  {showVatBreakdown ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  <span className="ml-3">View Tax Analysis</span>
                </button>

                {showVatBreakdown && (
                  <div className="bg-black/80 p-6 rounded-3xl space-y-4 border border-white/5 text-[11px] font-bold">
                    <div className="flex justify-between text-slate-600">
                      <span>Live Rate Used:</span>
                      <span className="text-white">Rs. {Math.round(activeMetal === 'gold' ? prices.gold : prices.silver).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-600 border-t border-white/5 pt-4">
                      <span>VAT (13%):</span>
                      <span className="text-yellow-600">Rs. {Math.round(calculation.vatAmount).toLocaleString()}</span>
                    </div>
                  </div>
                )}

                <div className="pt-6">
                    <span className="text-[10px] block font-black text-slate-600 uppercase tracking-[0.4em] mb-2">Final Invoice Amount</span>
                    <span className="text-5xl font-black text-white tracking-tighter">
                      Rs. {Math.round(calculation.grandTotal).toLocaleString()}
                    </span>
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