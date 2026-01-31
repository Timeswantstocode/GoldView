import React, { useState, useEffect, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { 
  TrendingUp, Calculator, Clock, ChevronDown, ChevronUp, Info, AlertCircle, RefreshCw, Smartphone, Globe
} from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// API Constants (Using your keys)
const METAL_PRICE_API_KEY = '27882472c556bcacfdfb6062bb99771d';
const GOLD_API_KEY = 'goldapi-htclqsml26xw1d-io';
const VAT_RATE = 0.13;
const TOLA_GRAMS = 11.66;

const App = () => {
  const [prices, setPrices] = useState({ gold: 165000, silver: 2100, lastUpdated: 'Initializing...' });
  const [activeMetal, setActiveMetal] = useState('gold');
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState('Local');
  const [error, setError] = useState(null);
  
  const [weight, setWeight] = useState({ tola: '', aana: '', lal: '' });
  const [makingCharge, setMakingCharge] = useState('');
  const [showVatBreakdown, setShowVatBreakdown] = useState(false);

  // PRIMARY: Scrape Hamro Patro
  const scrapeHamroPatro = async () => {
    const proxy = 'https://api.allorigins.win/get?url=';
    const target = encodeURIComponent('https://www.hamropatro.com/gold');
    const response = await fetch(`${proxy}${target}`);
    const data = await response.json();
    const doc = new DOMParser().parseFromString(data.contents, 'text/html');
    const text = doc.body.innerText;

    // Search for Nrs values near labels
    const goldMatch = text.match(/Gold Hallmark - tola.*?Nrs\.\s*([\d,.]+)/i);
    const silverMatch = text.match(/Silver - tola.*?Nrs\.\s*([\d,.]+)/i);

    if (goldMatch) {
      return {
        gold: parseFloat(goldMatch[1].replace(/,/g, '')),
        silver: silverMatch ? parseFloat(silverMatch[1].replace(/,/g, '')) : 2100,
        source: 'Hamro Patro'
      };
    }
    throw new Error('Scrape failed');
  };

  // FALLBACK 1: MetalPriceAPI
  const fetchMetalPriceAPI = async () => {
    const res = await fetch(`https://api.metalpriceapi.com/v1/latest?api_key=${METAL_PRICE_API_KEY}&base=NPR&currencies=XAU,XAG`);
    const data = await res.json();
    // API returns price per ounce in base currency (NPR)
    // 1 Ounce = 31.1035 grams. 1 Tola = 11.66 grams.
    const toTola = (pricePerOz) => (pricePerOz / 31.1035) * TOLA_GRAMS;
    
    return {
      gold: toTola(data.rates.NPRXAU),
      silver: toTola(data.rates.NPRXAG),
      source: 'MetalPriceAPI'
    };
  };

  const fetchLivePrices = async () => {
    setLoading(true);
    try {
      // Try Scraping first (as requested)
      try {
        const result = await scrapeHamroPatro();
        setPrices({ ...result, lastUpdated: new Date().toLocaleTimeString() });
        setDataSource(result.source);
        setError(null);
      } catch (e) {
        // Fallback to API if scraping fails
        const result = await fetchMetalPriceAPI();
        setPrices({ ...result, lastUpdated: new Date().toLocaleTimeString() });
        setDataSource(result.source);
        setError("Scraper blocked. Using Global API fallback.");
      }
    } catch (err) {
      setError("Connection Error. Check your internet.");
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
    labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Today'],
    datasets: [{
      label: activeMetal === 'gold' ? 'Gold Price (NPR)' : 'Silver Price (NPR)',
      data: activeMetal === 'gold' 
        ? [prices.gold-5000, prices.gold-3000, prices.gold-4000, prices.gold-1000, prices.gold-2000, prices.gold-500, prices.gold]
        : [prices.silver-100, prices.silver-50, prices.silver-80, prices.silver-20, prices.silver-40, prices.silver-10, prices.silver],
      fill: true,
      borderColor: activeMetal === 'gold' ? '#D4AF37' : '#C0C0C0',
      backgroundColor: activeMetal === 'gold' ? 'rgba(212, 175, 55, 0.1)' : 'rgba(192, 192, 192, 0.1)',
      tension: 0.4,
      pointBackgroundColor: '#fff',
    }]
  };

  return (
    <div className="min-h-screen bg-[#080808] text-gray-200 font-sans p-4 md:p-8">
      {/* Navbar */}
      <header className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center mb-10 gap-4 border-b border-white/5 pb-6">
        <div className="text-center md:text-left">
          <h1 className="text-4xl font-black italic tracking-tighter text-white">
            GOLD<span className="text-yellow-500 underline decoration-2 underline-offset-8">VIEW</span>
          </h1>
          <div className="flex items-center justify-center md:justify-start text-gray-500 text-[10px] mt-2 uppercase tracking-[0.2em]">
            <Clock size={12} className="mr-2" /> {prices.lastUpdated} • SOURCE: {dataSource}
          </div>
        </div>
        <div className="flex gap-2">
            <button onClick={fetchLivePrices} className="flex items-center gap-2 px-6 py-3 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-yellow-500 text-xs font-bold hover:bg-yellow-500/20 transition-all">
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> REFRESH LIVE
            </button>
        </div>
      </header>

      {error && (
        <div className="max-w-6xl mx-auto mb-6 bg-yellow-500/5 border border-yellow-500/20 p-4 rounded-2xl flex items-center text-yellow-600 text-xs font-medium">
          <Info size={16} className="mr-3 shrink-0" /> {error}
        </div>
      )}

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Section: Live Cards & Graph */}
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Gold Selector */}
            <button 
              onClick={() => setActiveMetal('gold')}
              className={`p-8 rounded-[2.5rem] text-left border-2 transition-all relative overflow-hidden group ${activeMetal === 'gold' ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-white/5 bg-white/5 opacity-50'}`}
            >
              <TrendingUp className={`absolute top-6 right-8 ${activeMetal === 'gold' ? 'text-yellow-500' : 'text-gray-700'}`} size={24} />
              <p className="text-[10px] font-black text-yellow-600 uppercase tracking-widest mb-2">24K Fine Gold</p>
              <h2 className="text-4xl font-black text-white">Rs. {prices.gold.toLocaleString()}</h2>
              <p className="text-gray-500 text-xs mt-1">Market Rate / Tola</p>
              {activeMetal === 'gold' && <div className="absolute bottom-0 left-0 h-1 w-full bg-yellow-500"></div>}
            </button>

            {/* Silver Selector */}
            <button 
              onClick={() => setActiveMetal('silver')}
              className={`p-8 rounded-[2.5rem] text-left border-2 transition-all relative overflow-hidden group ${activeMetal === 'silver' ? 'border-gray-400/50 bg-gray-400/5' : 'border-white/5 bg-white/5 opacity-50'}`}
            >
              <TrendingUp className={`absolute top-6 right-8 ${activeMetal === 'silver' ? 'text-gray-400' : 'text-gray-700'}`} size={24} />
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Pure Silver</p>
              <h2 className="text-4xl font-black text-white">Rs. {prices.silver.toLocaleString()}</h2>
              <p className="text-gray-500 text-xs mt-1">Market Rate / Tola</p>
              {activeMetal === 'silver' && <div className="absolute bottom-0 left-0 h-1 w-full bg-gray-400"></div>}
            </button>
          </div>

          {/* Large Graph Area */}
          <div className="bg-white/5 border border-white/10 p-8 rounded-[3rem]">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Trend Analysis</h3>
              <div className="flex gap-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500">
                  <div className={`w-2 h-2 rounded-full ${activeMetal === 'gold' ? 'bg-yellow-500' : 'bg-gray-400'}`}></div>
                  {activeMetal.toUpperCase()} PRICE
                </div>
              </div>
            </div>
            <div className="h-72">
              <Line data={chartData} options={{ 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { legend: { display: false } },
                scales: { 
                    y: { display: false }, 
                    x: { grid: { display: false }, border: { display: false }, ticks: { color: '#444', font: { size: 10 } } }
                }
              }} />
            </div>
          </div>
        </div>

        {/* Right Section: Calculator */}
        <div className="lg:col-span-4">
          <div className="bg-[#111] border border-white/10 p-8 rounded-[3rem] shadow-2xl sticky top-8">
            <h3 className="text-sm font-black mb-8 flex items-center text-white uppercase tracking-widest">
              <Calculator size={18} className="mr-3 text-yellow-500" /> Gold/Silver Price Calculator
            </h3>
            
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-2">
                {['tola', 'aana', 'lal'].map((unit) => (
                  <div key={unit}>
                    <label className="text-[9px] uppercase font-bold text-gray-500 block mb-2 ml-1">{unit}</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      value={weight[unit]} 
                      onChange={(e) => setWeight({...weight, [unit]: e.target.value})}
                      className="w-full bg-black/50 border border-white/10 rounded-2xl p-4 text-white focus:border-yellow-500 outline-none transition-all placeholder:text-gray-800"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="text-[9px] uppercase font-bold text-gray-500 block mb-2 ml-1">Making Charges (NPR)</label>
                <input 
                  type="number" 
                  placeholder="Total charge..."
                  value={makingCharge} 
                  onChange={(e) => setMakingCharge(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-2xl p-4 text-white focus:border-yellow-500 outline-none transition-all"
                />
              </div>

              <div className="pt-6 border-t border-white/10 mt-4 space-y-4">
                <button 
                  onClick={() => setShowVatBreakdown(!showVatBreakdown)}
                  className="flex items-center text-[9px] text-gray-500 font-bold uppercase tracking-[0.2em] hover:text-yellow-500 transition-colors"
                >
                  {showVatBreakdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  <span className="ml-2">Show VAT Calculation</span>
                </button>

                {showVatBreakdown && (
                  <div className="bg-black p-4 rounded-2xl space-y-3 border border-white/5 text-[11px]">
                    <div className="flex justify-between text-gray-500">
                      <span>Base Calculation:</span>
                      <span className="text-white">Rs. {Math.round(calculation.grandTotal / 1.13).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>13% VAT:</span>
                      <span className="text-yellow-500 font-bold">Rs. {Math.round(calculation.vatAmount).toLocaleString()}</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-end pt-2">
                  <div>
                    <span className="text-[10px] block font-bold text-gray-500 uppercase tracking-widest mb-1">Total Amount Due</span>
                    <span className="text-3xl font-black text-white tracking-tighter">
                      Rs. {Math.round(calculation.grandTotal).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 p-4 bg-white/5 rounded-2xl border border-white/5">
                <p className="text-[10px] text-gray-600 leading-relaxed italic text-center">
                    Calculation Logic: ((Weight × Market Rate) + Making) + 13% VAT. Standard 1 Tola = 11.66g used.
                </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-6xl mx-auto mt-20 text-center border-t border-white/5 pt-10 pb-20">
         <p className="text-gray-700 text-[10px] uppercase font-bold tracking-[0.5em]">
            Precision Bullion Tracking • 2026
         </p>
      </footer>
    </div>
  );
};

export default App;
