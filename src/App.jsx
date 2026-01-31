import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, registerables } from 'chart.js';
import priceData from '../data.json';

ChartJS.register(...registerables);

export default function App() {
  const [activeTab, setActiveTab] = useState('gold');
  const [calc, setCalc] = useState({ tola: 0, aana: 0, lal: 0, making: 0, vat: true });
  const currentPrice = priceData[priceData.length - 1];

  const calculateTotal = () => {
    // Correct Weight Math: 1 Tola = 16 Aana, 1 Aana = 12 Lal
    const totalTola = parseFloat(calc.tola) + (calc.aana / 16) + (calc.lal / 192);
    const rate = activeTab === 'gold' ? currentPrice.gold : currentPrice.silver;
    const metalPrice = totalTola * rate;
    const withMaking = metalPrice + parseFloat(calc.making || 0);
    return calc.vat ? withMaking * 1.13 : withMaking;
  };

  const chartData = {
    labels: priceData.map(d => d.date),
    datasets: [{
      label: `${activeTab.toUpperCase()} Price`,
      data: priceData.map(d => activeTab === 'gold' ? d.gold : d.silver),
      borderColor: activeTab === 'gold' ? '#D4AF37' : '#C0C0C0',
      backgroundColor: 'rgba(212, 175, 55, 0.1)',
      fill: true,
      tension: 0.4
    }]
  };

  return (
    <div className="min-h-screen bg-black text-gray-100 p-4 font-sans">
      {/* Header */}
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-700 bg-clip-text text-transparent">
          GOLDVIEW
        </h1>
        <p className="text-xs tracking-widest text-gray-500 uppercase">Live Market Analytics</p>
      </header>

      {/* Price Cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div 
          onClick={() => setActiveTab('gold')}
          className={`p-4 rounded-2xl border-2 transition-all ${activeTab === 'gold' ? 'border-yellow-500 bg-yellow-950/20' : 'border-gray-800'}`}
        >
          <p className="text-gray-400 text-sm">Gold (Hallmark)</p>
          <p className="text-2xl font-bold">रू {currentPrice.gold.toLocaleString()}</p>
        </div>
        <div 
          onClick={() => setActiveTab('silver')}
          className={`p-4 rounded-2xl border-2 transition-all ${activeTab === 'silver' ? 'border-gray-400 bg-gray-900/40' : 'border-gray-800'}`}
        >
          <p className="text-gray-400 text-sm">Silver</p>
          <p className="text-2xl font-bold">रू {currentPrice.silver.toLocaleString()}</p>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-gray-900/50 p-4 rounded-3xl border border-gray-800 mb-8">
        <Line data={chartData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
      </div>

      {/* Calculator */}
      <div className="bg-gradient-to-b from-gray-900 to-black p-6 rounded-3xl border border-yellow-900/30">
        <h2 className="text-xl font-semibold mb-4 text-yellow-500">Weight Calculator</h2>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <input type="number" placeholder="Tola" className="bg-gray-800 p-3 rounded-xl" onChange={e => setCalc({...calc, tola: e.target.value})} />
          <input type="number" placeholder="Aana" className="bg-gray-800 p-3 rounded-xl" onChange={e => setCalc({...calc, aana: e.target.value})} />
          <input type="number" placeholder="Lal" className="bg-gray-800 p-3 rounded-xl" onChange={e => setCalc({...calc, lal: e.target.value})} />
        </div>
        <input type="number" placeholder="Making Charges (Rs)" className="w-full bg-gray-800 p-3 rounded-xl mb-4" onChange={e => setCalc({...calc, making: e.target.value})} />
        
        <div className="flex justify-between items-center mb-6">
          <span>Include 13% VAT</span>
          <button 
            onClick={() => setCalc({...calc, vat: !calc.vat})}
            className={`w-12 h-6 rounded-full transition-colors ${calc.vat ? 'bg-yellow-500' : 'bg-gray-700'}`}
          >
            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${calc.vat ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
        </div>

        <div className="text-center p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl">
          <p className="text-gray-400 text-sm">Total Estimated Bill</p>
          <p className="text-3xl font-bold text-yellow-500">रू {calculateTotal().toLocaleString(undefined, {maximumFractionDigits: 2})}</p>
        </div>
      </div>
    </div>
  );
}