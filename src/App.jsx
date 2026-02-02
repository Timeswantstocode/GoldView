import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, registerables, Filler, Tooltip } from 'chart.js';

ChartJS.register(...registerables, Filler, Tooltip);

// URL to your live data on GitHub
const DATA_URL = "https://raw.githubusercontent.com/Timeswantstocode/GoldView/main/data.json";

const getBSDate = (adDateStr) => {
  if (!adDateStr) return "";
  const adDate = new Date(adDateStr.replace(' ', 'T'));
  const day = adDate.getDate();
  const month = adDate.getMonth() + 1;
  
  if (month === 1) {
    if (day < 14) return `${day + 17} Poush 2082`;
    return `${day - 13} Magh 2082`;
  }
  if (month === 2) {
    if (day < 13) return `${day + 18} Magh 2082`;
    return `${day - 12} Falgun 2082`;
  }
  return adDateStr.split(' ')[0];
};

const formatDate = (dateStr) => {
  const date = new Date(dateStr.replace(' ', 'T'));
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
};

const getShortDate = (dateStr) => {
  const date = new Date(dateStr.replace(' ', 'T'));
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function App() {
  const [priceData, setPriceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('dashboard');
  const [activeMetal, setActiveMetal] = useState('gold');
  const [calc, setCalc] = useState({ tola: '', aana: '', lal: '', making: '', vat: true });
  const [selectedPoint, setSelectedPoint] = useState(null);
  const chartRef = useRef(null);

  // FETCH LIVE DATA
  useEffect(() => {
    const fetchData = async () => {
      try {
        // We add a timestamp (?t=...) to prevent the browser from caching old data
        const response = await fetch(`${DATA_URL}?t=${new Date().getTime()}`);
        const json = await response.json();
        setPriceData(json);
        setLoading(false);
      } catch (error) {
        console.error("Error loading gold data:", error);
      }
    };
    fetchData();
  }, []);

  if (loading || !priceData || priceData.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-[#D4AF37]">
        <div className="text-center animate-pulse font-black tracking-widest uppercase">
          Initializing GoldView...
        </div>
      </div>
    );
  }

  const last7Days = priceData.slice(-7);
  const current = priceData[priceData.length - 1];
  const currentTime = new Date(current.date.replace(' ', 'T'));
  const timeString = currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const getStats = (metal) => {
    const values = last7Days.map(d => metal === 'gold' ? d.gold : d.silver);
    const low = Math.min(...values);
    const high = Math.max(...values);
    const first = values[0];
    const last = values[values.length - 1];
    const change = first > 0 ? ((last - first) / first * 100).toFixed(2) : 0;
    return { low, high, change };
  };

  const goldStats = getStats('gold');
  const silverStats = getStats('silver');

  const calculateTotal = () => {
    const totalTola = (Number(calc.tola) || 0) + (Number(calc.aana) || 0) / 16 + (Number(calc.lal) || 0) / 192;
    const rate = activeMetal === 'gold' ? current.gold : current.silver;
    const metalPrice = totalTola * rate;
    const total = metalPrice + (Number(calc.making) || 0);
    return calc.vat ? total * 1.13 : total;
  };

  const chartData = useMemo(() => {
    const isGold = activeMetal === 'gold';
    const accent = isGold ? '#D4AF37' : '#94a3b8';
    const shadow = isGold ? 'rgba(212, 175, 55, 0.4)' : 'rgba(148, 163, 184, 0.3)';

    return {
      labels: last7Days.map(d => d.date),
      datasets: [{
        data: last7Days.map(d => isGold ? d.gold : d.silver),
        borderColor: accent,
        borderWidth: 3,
        pointRadius: 0,
        pointHoverRadius: 8,
        pointHoverBackgroundColor: accent,
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
        tension: 0.4,
        fill: true,
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 200);
          gradient.addColorStop(0, shadow);
          gradient.addColorStop(1, 'rgba(0,0,0,0)');
          return gradient;
        },
      }]
    };
  }, [activeMetal, priceData]); // Added priceData to memo dependencies

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    onClick: (event, elements) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        const dataPoint = last7Days[index];
        const price = activeMetal === 'gold' ? dataPoint.gold : dataPoint.silver;
        setSelectedPoint({
          date: formatDate(dataPoint.date),
          price: price,
          index: index
        });
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(30, 30, 30, 0.95)',
        titleColor: '#D4AF37',
        bodyColor: '#fff',
        titleFont: { size: 11, weight: 'bold' },
        bodyFont: { size: 14, weight: 'bold' },
        padding: 12,
        cornerRadius: 12,
        displayColors: false,
        callbacks: {
          title: (items) => formatDate(items[0].label),
          label: (item) => `रू ${item.raw.toLocaleString()} per Tola`
        }
      }
    },
    scales: {
      x: {
        display: true,
        grid: { display: false },
        ticks: {
          color: '#666',
          font: { size: 10 },
          callback: function(value, index) {
            return getShortDate(last7Days[index].date);
          }
        },
        border: { display: false }
      },
      y: { display: false }
    }
  };

  const currentStats = activeMetal === 'gold' ? goldStats : silverStats;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans pb-32">
      
      <header className="p-5 pt-10">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[#D4AF37] text-[10px] font-bold uppercase tracking-[0.15em]">Nepal Gold Tracker</p>
            <h1 className="text-2xl font-bold mt-1">Live Prices</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-zinc-500 text-xs">Last updated: {timeString}</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-green-500 text-xs">Live</span>
              </span>
            </div>
          </div>
          <button 
             onClick={() => window.location.reload()}
             className="w-10 h-10 bg-[#D4AF37]/10 rounded-full flex items-center justify-center border border-[#D4AF37]/30">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
              <path d="M21 3v5h-5"/>
            </svg>
          </button>
        </div>
      </header>

      {view === 'dashboard' ? (
        <main className="px-4 space-y-3">
          
          <div 
            onClick={() => setActiveMetal('gold')}
            className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer ${
              activeMetal === 'gold' 
                ? 'bg-gradient-to-br from-[#1a1508] to-[#0f0f0f] border-[#D4AF37]/50' 
                : 'bg-[#111] border-zinc-800/50 opacity-70'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[#D4AF37] font-semibold text-sm">24K Gold (Chhapawal)</p>
                <p className="text-zinc-500 text-xs mt-0.5">Pure Fine Gold</p>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                Number(goldStats.change) >= 0 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                <span className="text-[10px]">↗</span>
                {Number(goldStats.change) >= 0 ? '+' : ''}{goldStats.change}%
              </span>
            </div>
            <h2 className="text-3xl font-bold mt-3">Rs. {current.gold.toLocaleString()}</h2>
            <p className="text-zinc-600 text-xs mt-1">per Tola (11.66g)</p>
          </div>

          <div 
            onClick={() => setActiveMetal('silver')}
            className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer ${
              activeMetal === 'silver' 
                ? 'bg-gradient-to-br from-[#12141a] to-[#0f0f0f] border-slate-400/30' 
                : 'bg-[#111] border-zinc-800/50 opacity-70'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-300 font-semibold text-sm">Silver</p>
                <p className="text-zinc-500 text-xs mt-0.5">Pure Silver</p>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                Number(silverStats.change) >= 0 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                <span className="text-[10px]">↗</span>
                {Number(silverStats.change) >= 0 ? '+' : ''}{silverStats.change}%
              </span>
            </div>
            <h2 className="text-3xl font-bold mt-3">Rs. {current.silver.toLocaleString()}</h2>
            <p className="text-zinc-600 text-xs mt-1">per Tola (11.66g)</p>
          </div>

          <section className="bg-[#111] rounded-2xl p-5 border border-zinc-800/50 mt-4">
            <div className="flex justify-between items-center mb-4">
              <p className="font-semibold text-sm text-zinc-300">7 Day Trend</p>
              <p className="text-xs text-zinc-500">{getShortDate(current.date)}</p>
            </div>
            
            <div className="h-44 relative">
              <Line ref={chartRef} data={chartData} options={chartOptions} />
            </div>

            {selectedPoint && (
              <div className="mt-4 bg-zinc-900/80 rounded-xl p-4 border border-zinc-700/50">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-zinc-400 text-xs uppercase">{selectedPoint.date}</p>
                    <p className="text-2xl font-bold text-[#D4AF37] mt-1">
                      रू {selectedPoint.price.toLocaleString()}
                    </p>
                    <p className="text-green-500 text-xs mt-1 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                      per Tola
                    </p>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setSelectedPoint(null); }}
                    className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center"
                  >
                    <span className="text-zinc-400 text-lg">×</span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-between mt-4 pt-4 border-t border-zinc-800/50">
              <div className="text-center">
                <p className="text-zinc-500 text-[10px] uppercase">Low</p>
                <p className="text-blue-400 font-semibold text-sm mt-1">Rs. {currentStats.low.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-zinc-500 text-[10px] uppercase">Change</p>
                <p className={`font-semibold text-sm mt-1 ${Number(currentStats.change) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {Number(currentStats.change) >= 0 ? '+' : ''}{currentStats.change}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-zinc-500 text-[10px] uppercase">High</p>
                <p className="text-green-400 font-semibold text-sm mt-1">Rs. {currentStats.high.toLocaleString()}</p>
              </div>
            </div>
          </section>

        </main>
      ) : (
        <main className="px-4">
          {/* ... [Calculated code stays the same as your original] ... */}
          <div className="bg-[#111] p-6 rounded-2xl border border-zinc-800/50">
            <h3 className="text-[#D4AF37] font-bold text-center mb-8 uppercase tracking-wider text-sm">Price Calculator</h3>
            {/* ... rest of calculator UI ... */}
            <div className="flex gap-2 mb-6">
              <button onClick={() => setActiveMetal('gold')} className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${activeMetal === 'gold' ? 'bg-[#D4AF37] text-black' : 'bg-zinc-800 text-zinc-400'}`}>Gold</button>
              <button onClick={() => setActiveMetal('silver')} className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${activeMetal === 'silver' ? 'bg-slate-400 text-black' : 'bg-zinc-800 text-zinc-400'}`}>Silver</button>
            </div>
            
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-zinc-500 uppercase ml-1">Tola</label>
                <input type="number" placeholder="0" className="w-full bg-black p-3 rounded-xl border border-zinc-800 text-center font-semibold outline-none focus:border-[#D4AF37] transition-colors" value={calc.tola} onChange={e => setCalc({...calc, tola: e.target.value})}/>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-zinc-500 uppercase ml-1">Aana</label>
                <input type="number" placeholder="0" className="w-full bg-black p-3 rounded-xl border border-zinc-800 text-center font-semibold outline-none focus:border-[#D4AF37] transition-colors" value={calc.aana} onChange={e => setCalc({...calc, aana: e.target.value})}/>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-zinc-500 uppercase ml-1">Lal</label>
                <input type="number" placeholder="0" className="w-full bg-black p-3 rounded-xl border border-zinc-800 text-center font-semibold outline-none focus:border-[#D4AF37] transition-colors" value={calc.lal} onChange={e => setCalc({...calc, lal: e.target.value})}/>
              </div>
            </div>

            <div className="space-y-2 mb-6">
              <label className="text-[10px] font-semibold text-zinc-500 uppercase ml-1">Making Charges (Rs)</label>
              <input type="number" placeholder="Enter amount..." className="w-full bg-black p-4 rounded-xl border border-zinc-800 font-semibold outline-none focus:border-[#D4AF37] transition-colors" value={calc.making} onChange={e => setCalc({...calc, making: e.target.value})}/>
            </div>

            <div className="flex justify-between items-center mb-6 px-1">
              <p className="text-sm font-medium">Include 13% VAT</p>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={calc.vat} onChange={() => setCalc({...calc, vat: !calc.vat})} className="sr-only peer"/>
                <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D4AF37]"></div>
              </label>
            </div>

            <div className="bg-gradient-to-r from-[#D4AF37] to-[#b8960c] p-6 rounded-2xl text-black text-center">
              <p className="text-[10px] uppercase font-semibold opacity-70 mb-1">Total Amount</p>
              <p className="text-3xl font-bold">रू {calculateTotal().toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
            </div>
          </div>
        </main>
      )}

      <nav className="fixed bottom-6 left-4 right-4 h-16 bg-[#111]/95 backdrop-blur-xl rounded-2xl border border-zinc-800 flex justify-around items-center shadow-2xl z-50">
        <button onClick={() => setView('dashboard')} className={`flex flex-col items-center gap-1 transition-all px-8 py-2 rounded-xl ${view === 'dashboard' ? 'text-[#D4AF37] bg-[#D4AF37]/10' : 'text-zinc-500'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
          <span className="text-[10px] font-semibold">Dashboard</span>
        </button>
        <button onClick={() => setView('calculator')} className={`flex flex-col items-center gap-1 transition-all px-8 py-2 rounded-xl ${view === 'calculator' ? 'text-[#D4AF37] bg-[#D4AF37]/10' : 'text-zinc-500'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/></svg>
          <span className="text-[10px] font-semibold">Calculator</span>
        </button>
      </nav>
    </div>
  );
}