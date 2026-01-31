import React, { useState, useEffect, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { 
  TrendingUp, Calculator, Clock, ChevronDown, ChevronUp, Info, AlertCircle, RefreshCw
} from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const VAT_RATE = 0.13;

const App = () => {
  // Default prices (in case scraping fails)
  const [prices, setPrices] = useState({ gold: 118000, silver: 1400, lastUpdated: 'Loading...' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Calculator State
  const [weight, setWeight] = useState({ tola: 0, aana: 0, lal: 0 });
  const [makingCharge, setMakingCharge] = useState(0);
  const [showVatBreakdown, setShowVatBreakdown] = useState(false);

  // --- SCRAPER LOGIC ---
  const fetchLivePrices = async () => {
    setLoading(true);
    try {
      // We use 'allorigins' as a proxy to bypass CORS security
      const proxyUrl = 'https://api.allorigins.win/get?url=';
      const targetUrl = encodeURIComponent('https://www.fenegosida.org/');
      
      const response = await fetch(`${proxyUrl}${targetUrl}`);
      const data = await response.json();
      
      // We parse the HTML string returned by the proxy
      const parser = new DOMParser();
      const doc = parser.parseFromString(data.contents, 'text/html');
      
      // FENEGOSIDA uses specific classes/tags for prices. 
      // This logic finds the text "Fine Gold" and "Silver" then gets the price next to it.
      const priceItems = doc.querySelectorAll('.rate-list li');
      let liveGold = 0;
      let liveSilver = 0;

      priceItems.forEach(item => {
        const text = item.innerText || "";
        if (text.includes('Fine Gold')) {
          liveGold = parseInt(text.replace(/[^0-9]/g, ''));
        }
        if (text.includes('Silver')) {
          liveSilver = parseInt(text.replace(/[^0-9]/g, ''));
        }
      });

      if (liveGold > 0) {
        setPrices({
          gold: liveGold,
          silver: liveSilver,
          lastUpdated: new Date().toLocaleString('en-NP', { timeZone: 'Asia/Kathmandu' })
        });
        setError(null);
      } else {
        throw new Error("Could not find price data on page.");
      }
    } catch (err) {
      console.error("Scraping error:", err);
      setError("Failed to fetch live prices. Using last known rates.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLivePrices();
  }, []);

  // --- CALCULATOR LOGIC ---
  const calculation = useMemo(() => {
    const totalTola = Number(weight.tola) + (Number(weight.aana) / 16) + (Number(weight.lal) / 100);
    const basePrice = totalTola * prices.gold;
    const subtotal = basePrice + Number(makingCharge);
    const vatAmount = subtotal * VAT_RATE;
    const grandTotal = subtotal + vatAmount;

    return { totalTola, basePrice, subtotal, vatAmount, grandTotal };
  }, [weight, makingCharge, prices.gold]);

  // Mock Trend Graph Data
  const chartData = {
    labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Today'],
    datasets: [{
      label: 'Gold Price',
      data: [prices.gold - 2000, prices.gold - 1500, prices.gold - 500, prices.gold - 800, prices.gold],
      fill: true,
      borderColor: '#FFD700',
      backgroundColor: 'rgba(255, 215, 0, 0.1)',
      tension: 0.4,
    }]
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-gray-100 font-sans p-4 md:p-8">
      <header className="max-w-6xl mx-auto flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-700 bg-clip-text text-transparent">
            GoldView Nepal
          </h1>
          <div className="flex items-center text-gray-500 text-xs mt-1">
            <Clock size={12} className="mr-1" />
            Live from FENEGOSIDA: {prices.lastUpdated}
          </div>
        </div>
        <button 
          onClick={fetchLivePrices}
          className="p-2 bg-yellow-600/10 border border-yellow-600/20 rounded-full text-yellow-500 hover:bg-yellow-600/20 transition-all"
        >
          <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
        </button>
      </header>

      {error && (
        <div className="max-w-6xl mx-auto mb-6 bg-red-900/20 border border-red-900/50 p-3 rounded-lg flex items-center text-red-500 text-sm">
          <AlertCircle size={16} className="mr-2" /> {error}
        </div>
      )}

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Gold Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-yellow-900/50 p-6 rounded-2xl">
              <p className="text-yellow-500 font-semibold tracking-wider text-sm mb-2 uppercase">Fine Gold (24K)</p>
              <h2 className="text-4xl font-bold mb-1">Rs. {prices.gold.toLocaleString()}</h2>
              <p className="text-gray-400 text-xs">per Tola</p>
            </div>

            {/* Silver Card */}
            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-gray-700 p-6 rounded-2xl">
              <p className="text-gray-400 font-semibold tracking-wider text-sm mb-2 uppercase">Silver</p>
              <h2 className="text-4xl font-bold mb-1">Rs. {prices.silver.toLocaleString()}</h2>
              <p className="text-gray-400 text-xs">per Tola</p>
            </div>
          </div>

          <div className="bg-[#141414] border border-gray-800 p-6 rounded-2xl h-64">
            <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
          </div>
        </div>

        {/* CALCULATOR */}
        <div className="lg:col-span-1">
          <div className="bg-[#1a1a1a] border-t-4 border-yellow-600 p-6 rounded-2xl shadow-2xl">
            <h3 className="text-xl font-bold mb-6 flex items-center text-yellow-500 uppercase tracking-tighter">
              <Calculator className="mr-2" /> SEE Exam Mode
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {['tola', 'aana', 'lal'].map((unit) => (
                  <div key={unit}>
                    <label className="text-[10px] uppercase text-gray-500 block mb-1">{unit}</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      value={weight[unit] || ''} 
                      onChange={(e) => setWeight({...weight, [unit]: e.target.value})}
                      className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg p-3 focus:border-yellow-600 outline-none"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="text-[10px] uppercase text-gray-500 block mb-1">Making Charges (NPR)</label>
                <input 
                  type="number" 
                  value={makingCharge || ''} 
                  onChange={(e) => setMakingCharge(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg p-3 focus:border-yellow-600 outline-none"
                />
              </div>

              <div className="mt-8 pt-6 border-t border-gray-800 space-y-3">
                <button 
                  onClick={() => setShowVatBreakdown(!showVatBreakdown)}
                  className="flex items-center text-[10px] text-yellow-600 font-bold uppercase"
                >
                  {showVatBreakdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  <span className="ml-1 underline">Show VAT Breakdown (13%)</span>
                </button>

                {showVatBreakdown && (
                  <div className="bg-[#111] p-3 rounded-lg text-xs space-y-2 border border-yellow-900/20">
                    <div className="flex justify-between text-gray-500">
                      <span>Base Price:</span>
                      <span>Rs. {calculation.basePrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>VAT (13%):</span>
                      <span className="text-yellow-500">Rs. {calculation.vatAmount.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2">
                  <span className="text-lg font-bold">Total:</span>
                  <span className="text-2xl font-black text-yellow-500">
                    Rs. {calculation.grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
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
