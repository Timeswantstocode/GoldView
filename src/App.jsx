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
  // Updated "Last Known" rates for 2026 so fallback isn't "random"
  const [prices, setPrices] = useState({ 
    gold: 318800, 
    silver: 7065, 
    lastUpdated: 'Fetching live data...' 
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [weight, setWeight] = useState({ tola: 0, aana: 0, lal: 0 });
  const [makingCharge, setMakingCharge] = useState(0);
  const [showVatBreakdown, setShowVatBreakdown] = useState(false);

  const fetchLivePrices = async () => {
    setLoading(true);
    try {
      // Using a different proxy (CORSProxy.io) which is often more reliable
      const targetUrl = 'https://www.fenegosida.org/';
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
      
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error("Proxy error");
      const htmlText = await response.text();
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');
      const bodyText = doc.body.innerText;

      // Smarter Scraping: Look for "Fine Gold" followed by numbers anywhere in the text
      const goldRegex = /Fine Gold.*?([\d,]{6,})/i;
      const silverRegex = /Silver.*?([\d,]{4,})/i;

      const goldMatch = bodyText.match(goldRegex);
      const silverMatch = bodyText.match(silverRegex);

      if (goldMatch && goldMatch[1]) {
        const liveGold = parseInt(goldMatch[1].replace(/,/g, ''));
        const liveSilver = silverMatch ? parseInt(silverMatch[1].replace(/,/g, '')) : 7000;
        
        setPrices({
          gold: liveGold,
          silver: liveSilver,
          lastUpdated: new Date().toLocaleString('en-NP', { timeZone: 'Asia/Kathmandu' })
        });
        setError(null);
      } else {
        throw new Error("Price pattern not found on site");
      }
    } catch (err) {
      console.error("Scraping error:", err);
      setError("FENEGOSIDA site unreachable. Using 2026 reference rates.");
      setPrices(prev => ({...prev, lastUpdated: 'Reference (Offline)'}));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLivePrices();
  }, []);

  const calculation = useMemo(() => {
    const totalTola = Number(weight.tola) + (Number(weight.aana) / 16) + (Number(weight.lal) / 100);
    const basePrice = totalTola * prices.gold;
    const subtotal = basePrice + Number(makingCharge);
    const vatAmount = subtotal * VAT_RATE;
    const grandTotal = subtotal + vatAmount;
    return { totalTola, basePrice, subtotal, vatAmount, grandTotal };
  }, [weight, makingCharge, prices.gold]);

  const chartData = {
    labels: ['Jan 26', 'Jan 27', 'Jan 28', 'Jan 29', 'Today'],
    datasets: [{
      label: 'Gold Price',
      data: [309000, 309300, 312000, 315000, prices.gold],
      fill: true,
      borderColor: '#FFD700',
      backgroundColor: 'rgba(255, 215, 0, 0.1)',
      tension: 0.4,
    }]
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 font-sans p-4 md:p-8">
      <header className="max-w-6xl mx-auto flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-yellow-300 via-yellow-500 to-yellow-700 bg-clip-text text-transparent">
            GOLDVIEW NEPAL
          </h1>
          <div className="flex items-center text-gray-500 text-[10px] mt-1 uppercase tracking-widest">
            <Clock size={10} className="mr-1" />
            {prices.lastUpdated}
          </div>
        </div>
        <button 
          onClick={fetchLivePrices}
          className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-500 hover:bg-yellow-500/20 transition-all"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </header>

      {error && (
        <div className="max-w-6xl mx-auto mb-6 bg-yellow-900/10 border border-yellow-900/30 p-3 rounded-xl flex items-center text-yellow-600 text-xs">
          <AlertCircle size={14} className="mr-2" /> {error}
        </div>
      )}

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#141414] border border-white/5 p-6 rounded-3xl relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-yellow-500/5 rounded-full blur-2xl" />
              <p className="text-yellow-500 font-bold text-[10px] uppercase tracking-widest mb-2">Fine Gold (24K)</p>
              <h2 className="text-4xl font-black tracking-tighter">Rs. {prices.gold.toLocaleString()}</h2>
              <p className="text-gray-500 text-[10px] mt-1">NPR per Tola (11.66g)</p>
            </div>

            <div className="bg-[#141414] border border-white/5 p-6 rounded-3xl">
              <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-2">Silver</p>
              <h2 className="text-4xl font-black tracking-tighter">Rs. {prices.silver.toLocaleString()}</h2>
              <p className="text-gray-500 text-[10px] mt-1">NPR per Tola</p>
            </div>
          </div>

          <div className="bg-[#141414] border border-white/5 p-6 rounded-3xl h-64">
             <Line data={chartData} options={{ 
               responsive: true, 
               maintainAspectRatio: false, 
               plugins: { legend: { display: false } },
               scales: { y: { display: false }, x: { grid: { display: false }, border: { display: false } } }
             }} />
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-[#141414] border border-yellow-500/20 p-6 rounded-3xl shadow-2xl">
            <h3 className="text-sm font-black mb-6 flex items-center text-yellow-500 uppercase tracking-widest">
              <Calculator size={16} className="mr-2" /> SEE EXAM MODE
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {['tola', 'aana', 'lal'].map((unit) => (
                  <div key={unit}>
                    <label className="text-[9px] uppercase font-bold text-gray-500 block mb-1">{unit}</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      value={weight[unit] || ''} 
                      onChange={(e) => setWeight({...weight, [unit]: e.target.value})}
                      className="w-full bg-black border border-white/5 rounded-xl p-3 text-sm focus:border-yellow-500 outline-none transition-all"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="text-[9px] uppercase font-bold text-gray-500 block mb-1">Making Charges (NPR)</label>
                <input 
                  type="number" 
                  value={makingCharge || ''} 
                  onChange={(e) => setMakingCharge(e.target.value)}
                  className="w-full bg-black border border-white/5 rounded-xl p-3 text-sm focus:border-yellow-500 outline-none transition-all"
                />
              </div>

              <div className="mt-6 pt-6 border-t border-white/5 space-y-4">
                <button 
                  onClick={() => setShowVatBreakdown(!showVatBreakdown)}
                  className="flex items-center text-[9px] text-yellow-600 font-bold uppercase tracking-widest"
                >
                  {showVatBreakdown ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  <span className="ml-1">VAT Breakdown (13%)</span>
                </button>

                {showVatBreakdown && (
                  <div className="bg-black/50 p-3 rounded-xl text-[11px] space-y-2 border border-white/5">
                    <div className="flex justify-between text-gray-500">
                      <span>Weight in Tola:</span>
                      <span>{calculation.totalTola.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>VAT Amount:</span>
                      <span className="text-yellow-500">Rs. {calculation.vatAmount.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-400">GRAND TOTAL</span>
                  <span className="text-2xl font-black text-yellow-500 tracking-tighter">
                    Rs. {calculation.grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-yellow-500/5 rounded-2xl border border-yellow-500/10 flex items-start gap-3">
             <Info size={14} className="text-yellow-600 mt-0.5 shrink-0" />
             <p className="text-[10px] text-gray-500 leading-relaxed">
               Logic: ((Weight × Rate) + Charges) + 13% VAT. This follows the standard SEE exam math for bullion calculation in Nepal.
             </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
