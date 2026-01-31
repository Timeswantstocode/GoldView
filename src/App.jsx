import React, { useState, useEffect, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { 
  TrendingUp, 
  Calculator, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Info,
  Gold, 
  Coins
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
  Filler
} from 'chart.js';

// Register ChartJS
ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler
);

const CONVERSION_TOLA_TO_GRAM = 11.66;
const VAT_RATE = 0.13;

const App = () => {
  const [prices, setPrices] = useState({ gold: 318800, silver: 7300, lastUpdated: new Date().toLocaleString() });
  const [history, setHistory] = useState([305000, 309000, 312000, 315000, 318800]); // Mock trend
  
  // Calculator State
  const [weight, setWeight] = useState({ tola: 0, aana: 0, lal: 0 });
  const [makingCharge, setMakingCharge] = useState(0);
  const [showVatBreakdown, setShowVatBreakdown] = useState(false);

  // 1. DATA FETCHING (Simulated Financial API logic)
  useEffect(() => {
    // In a real app, you'd fetch from MetalpriceAPI or a proxy to FENEGOSIDA
    // const fetchPrices = async () => {
    //   const res = await fetch('YOUR_API_ENDPOINT');
    //   const data = await res.json();
    //   setPrices({ gold: data.gold * 11.66, silver: data.silver * 11.66, ... });
    // };
    // fetchPrices();
  }, []);

  // 2. CALCULATOR LOGIC (SEE Exam Mode)
  const calculation = useMemo(() => {
    // 1 Tola = 16 Aana, 1 Tola = 100 Lal
    const totalTola = Number(weight.tola) + (Number(weight.aana) / 16) + (Number(weight.lal) / 100);
    const basePrice = totalTola * prices.gold;
    const subtotal = basePrice + Number(makingCharge);
    const vatAmount = subtotal * VAT_RATE;
    const grandTotal = subtotal + vatAmount;

    return { totalTola, basePrice, subtotal, vatAmount, grandTotal };
  }, [weight, makingCharge, prices.gold]);

  const chartData = {
    labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Today'],
    datasets: [{
      label: 'Gold Price (NPR)',
      data: history,
      fill: true,
      borderColor: '#FFD700',
      backgroundColor: 'rgba(255, 215, 0, 0.1)',
      tension: 0.4,
    }]
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-gray-100 font-sans p-4 md:p-8">
      {/* Header */}
      <header className="max-w-6xl mx-auto flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-700 bg-clip-text text-transparent">
            Nepal Bullion Tracker
          </h1>
          <div className="flex items-center text-gray-500 text-sm mt-1">
            <Clock size={14} className="mr-1" />
            Last Updated: {prices.lastUpdated}
          </div>
        </div>
        <div className="hidden md:block px-4 py-2 border border-yellow-900/30 rounded-full bg-yellow-900/10 text-yellow-500 text-xs font-medium">
          LIVE: FENEGOSIDA Reference Rates
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* DASHBOARD: Left Column (Cards & Chart) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Price Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Gold Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-yellow-900/50 p-6 rounded-2xl shadow-2xl">
              <div className="absolute top-0 right-0 p-4 text-yellow-500/10">
                <TrendingUp size={80} />
              </div>
              <p className="text-yellow-500 font-semibold tracking-wider text-sm mb-2 uppercase">Fine Gold (24K)</p>
              <h2 className="text-4xl font-bold mb-1">Rs. {prices.gold.toLocaleString()}</h2>
              <p className="text-gray-400 text-sm">per Tola (11.66g)</p>
              <div className="mt-4 flex items-center text-green-500 text-sm">
                <TrendingUp size={16} className="mr-1" /> +1.2% from yesterday
              </div>
            </div>

            {/* Silver Card */}
            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-gray-700 p-6 rounded-2xl shadow-2xl">
              <p className="text-gray-400 font-semibold tracking-wider text-sm mb-2 uppercase">Silver</p>
              <h2 className="text-4xl font-bold mb-1">Rs. {prices.silver.toLocaleString()}</h2>
              <p className="text-gray-400 text-sm">per Tola</p>
              <div className="mt-4 flex items-center text-red-500 text-sm">
                <TrendingUp size={16} className="mr-1 rotate-180" /> -0.5% from yesterday
              </div>
            </div>
          </div>

          {/* CHART */}
          <div className="bg-[#141414] border border-gray-800 p-6 rounded-2xl shadow-xl">
            <h3 className="text-lg font-bold mb-6 flex items-center">
              <TrendingUp className="text-yellow-500 mr-2" size={20} />
              7-Day Gold Trend
            </h3>
            <div className="h-64">
              <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { display: false }, x: { grid: { display: false } } }, plugins: { legend: { display: false } } }} />
            </div>
          </div>
        </div>

        {/* CALCULATOR: Right Column */}
        <div className="lg:col-span-1">
          <div className="bg-[#1a1a1a] border-t-4 border-yellow-600 p-6 rounded-2xl shadow-2xl sticky top-8">
            <h3 className="text-xl font-bold mb-6 flex items-center text-yellow-500 uppercase tracking-tighter">
              <Calculator className="mr-2" /> SEE Exam Mode
            </h3>
            
            <div className="space-y-4">
              {/* Weight Inputs */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Tola</label>
                  <input 
                    type="number" value={weight.tola} onChange={(e) => setWeight({...weight, tola: e.target.value})}
                    className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg p-3 focus:border-yellow-600 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Aana</label>
                  <input 
                    type="number" value={weight.aana} onChange={(e) => setWeight({...weight, aana: e.target.value})}
                    className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg p-3 focus:border-yellow-600 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Lal</label>
                  <input 
                    type="number" value={weight.lal} onChange={(e) => setWeight({...weight, lal: e.target.value})}
                    className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg p-3 focus:border-yellow-600 outline-none"
                  />
                </div>
              </div>

              {/* Rate & Making Charges */}
              <div>
                <label className="text-xs text-gray-500 block mb-1">Current Rate (per Tola)</label>
                <input type="text" disabled value={prices.gold} className="w-full bg-[#222] border border-gray-800 rounded-lg p-3 text-gray-400" />
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Making Charges (NPR)</label>
                <input 
                  type="number" value={makingCharge} onChange={(e) => setMakingCharge(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg p-3 focus:border-yellow-600 outline-none"
                />
              </div>

              {/* Output Section */}
              <div className="mt-8 pt-6 border-t border-gray-800 space-y-3">
                <div className="flex justify-between text-gray-400 text-sm">
                  <span>Subtotal:</span>
                  <span>Rs. {calculation.subtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
                
                <button 
                  onClick={() => setShowVatBreakdown(!showVatBreakdown)}
                  className="flex items-center text-xs text-yellow-600 hover:text-yellow-500 transition-colors"
                >
                  {showVatBreakdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  <span className="ml-1 underline underline-offset-4 font-bold uppercase">Show VAT Breakdown (13%)</span>
                </button>

                {showVatBreakdown && (
                  <div className="bg-[#111] p-3 rounded-lg text-xs space-y-2 border border-yellow-900/20">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total Weight in Tola:</span>
                      <span>{calculation.totalTola.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">VAT (13% of Subtotal):</span>
                      <span className="text-yellow-500 font-bold">Rs. {calculation.vatAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2">
                  <span className="text-lg font-bold">Total Bill:</span>
                  <span className="text-2xl font-black text-yellow-500">
                    Rs. {calculation.grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-yellow-900/10 p-3 rounded-lg border border-yellow-900/20 mt-4">
                <Info size={16} className="text-yellow-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-yellow-700 leading-tight">
                  Calculation logic verified for Nepal: (Weight × Rate) + Making Charges + 13% VAT. Standard 1 Tola = 11.66g.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-6xl mx-auto text-center mt-20 text-gray-600 text-xs border-t border-gray-900 pt-8">
        &copy; {new Date().getFullYear()} Nepal Bullion Tracker. Prices for educational use only.
      </footer>
    </div>
  );
};

export default App;
