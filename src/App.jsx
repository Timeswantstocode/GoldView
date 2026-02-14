import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, registerables, Filler, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement } from 'chart.js';
import { LayoutDashboard, Calculator, RefreshCcw, TrendingUp, X, Calendar, Zap, Activity, Coins, ArrowRightLeft, Globe, ArrowDown, Share2, Info, Scale, CheckCircle2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Helmet, HelmetProvider } from 'react-helmet-async';

ChartJS.register(...registerables, Filler, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement);

const DATA_URL = "https://raw.githubusercontent.com/Timeswantstocode/GoldView/main/data.json";
const FOREX_PROXY = "/api/forex";

export default function App() {
  const [priceData, setPriceData] = useState(() => JSON.parse(localStorage.getItem('gv_v18_metal') || '[]'));
  const [forexHistory, setForexHistory] = useState(() => JSON.parse(localStorage.getItem('gv_v18_forex') || '[]'));
  const [loading, setLoading] = useState(priceData.length === 0);
  const [view, setView] = useState('dashboard');
  const [activeMetal, setActiveMetal] = useState('gold'); // gold, tejabi, silver, usd
  const [timeframe, setTimeframe] = useState(7);
  const [calcMode, setCalcMode] = useState('jewelry'); // jewelry, convert, loan
  const [calcType, setCalcType] = useState('buy'); // buy, sell
  const [calc, setCalc] = useState({ tola: '', aana: '', lal: '', making: '', vat: true });
  const [gramInput, setGramInput] = useState('');
  const [currCalc, setCurrCalc] = useState({ amount: '1', source: 'USD', isSwapped: false });
  const shareRef = useRef(null);

  useEffect(() => {
    fetch(`${DATA_URL}?t=${Date.now()}`).then(res => res.json()).then(json => {
        const processed = json.map(d => ({ ...d, tejabi: d.tejabi || Math.round(d.gold * 0.9167) }));
        setPriceData(processed);
        localStorage.setItem('gv_v18_metal', JSON.stringify(processed));
        setLoading(false);
    }).catch(() => setLoading(false));

    fetch(FOREX_PROXY).then(res => res.json()).then(json => {
        const transformed = json.data.payload.map(day => ({
          date: day.date,
          usdRate: parseFloat(day.rates.find(r => r.currency.iso3 === 'USD')?.buy || 0),
          rates: day.rates
        })).sort((a, b) => new Date(a.date) - new Date(b.date));
        setForexHistory(transformed);
        localStorage.setItem('gv_v18_forex', JSON.stringify(transformed));
    });
  }, []);

  // --- MARKET LOGIC ---
  const marketStatus = useMemo(() => {
    const npt = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Kathmandu"}));
    const day = npt.getDay(); 
    const hour = npt.getHours();
    if (day === 6) return { open: false, msg: "Saturday: Market Closed" };
    if (hour < 11 || hour >= 17) return { open: false, msg: "Closed (Opens 11 AM)" };
    return { open: true, msg: "Live: Market Open" };
  }, []);

  const sentiment = useMemo(() => {
    if (priceData.length < 15) return { label: "Neutral", color: "#94a3b8" };
    const curr = priceData[priceData.length-1].gold;
    const avg = priceData.slice(-15).reduce((a, b) => a + b.gold, 0) / 15;
    const diff = ((curr - avg) / avg) * 100;
    if (diff < -1.5) return { label: "Strong Buy", color: "#22c55e" };
    if (diff > 1.5) return { label: "Price High", color: "#ef4444" };
    return { label: "Stable Market", color: "#D4AF37" };
  }, [priceData]);

  const themeColor = useMemo(() => {
    if (view === 'calculator' && calcMode === 'convert') return '#22c55e';
    if (activeMetal === 'gold') return '#D4AF37';
    if (activeMetal === 'tejabi') return '#FFB800';
    if (activeMetal === 'silver') return '#94a3b8';
    return '#22c55e';
  }, [activeMetal, view, calcMode]);

  const formatRS = (num) => `रू ${Math.round(num || 0).toLocaleString()}`;

  const handleShare = async () => {
    const dataUrl = await toPng(shareRef.current, { cacheBust: true, backgroundColor: '#020202' });
    const link = document.createElement('a');
    link.download = `GoldView-${new Date().toISOString().split('T')[0]}.png`;
    link.href = dataUrl;
    link.click();
  };

  const convertGrams = (g) => {
    const totalLal = (Number(g) || 0) / 0.06075;
    return { t: Math.floor(totalLal / 192), a: Math.floor((totalLal % 192) / 12), l: Math.round(totalLal % 12) };
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><RefreshCcw className="w-10 h-10 animate-spin text-amber-500" /></div>;

  return (
    <HelmetProvider>
      <div className="min-h-screen bg-[#020202] text-zinc-100 font-sans pb-40 overflow-x-hidden relative">
        <Helmet><title>GoldView | Live Gold & Silver Price Nepal</title></Helmet>

        {/* --- APPLE HEADER --- */}
        <header className="p-8 pt-16 flex justify-between items-end relative z-10 sticky top-0 bg-black/40 backdrop-blur-3xl border-b border-white/5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: marketStatus.open ? '#22c55e' : '#ef4444', boxShadow: `0 0 10px ${marketStatus.open ? '#22c55e' : '#ef4444'}` }}></div>
              <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-50">{marketStatus.msg}</p>
            </div>
            <h1 className="text-4xl font-black tracking-tighter">GoldView</h1>
          </div>
          <div className="flex gap-3">
            <button onClick={handleShare} className="p-4 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all"><Share2 className="w-5 h-5" /></button>
            <button onClick={() => window.location.reload()} className="p-4 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all"><RefreshCcw className="w-5 h-5" style={{ color: themeColor }} /></button>
          </div>
        </header>

        {/* --- DASHBOARD --- */}
        {view === 'dashboard' && (
          <main className="px-6 space-y-6 animate-in fade-in duration-700" ref={shareRef}>
            {/* SENTIMENT BAR */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-5 flex items-center justify-between backdrop-blur-3xl shadow-xl">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white/5" style={{ color: sentiment.color }}><TrendingUp className="w-5 h-5" /></div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Market Sentiment</p>
               </div>
               <span className="px-4 py-1.5 rounded-full text-[10px] font-black" style={{ backgroundColor: `${sentiment.color}20`, color: sentiment.color, border: `1px solid ${sentiment.color}40` }}>{sentiment.label}</span>
            </div>

            <div className="space-y-4">
              {['gold', 'tejabi', 'silver', 'usd'].map((type) => {
                 const isActive = activeMetal === type;
                 const val = type === 'usd' ? (forexHistory[forexHistory.length-1]?.usdRate || 0) : (priceData[priceData.length-1]?.[type] || 0);
                 const meta = {
                   gold: { label: '24K Chhapawal Gold', grad: 'from-[#D4AF37]/40' },
                   tejabi: { label: '22K Tejabi Gold', grad: 'from-[#FFB800]/40' },
                   silver: { label: 'Pure Silver', grad: 'from-zinc-400/30' },
                   usd: { label: 'USD to NPR (NRB)', grad: 'from-[#22c55e]/40' }
                 }[type];
                 return (
                  <div key={type} onClick={() => setActiveMetal(type)}
                    className={`p-7 rounded-[2.8rem] border-[1.5px] transition-all duration-500 cursor-pointer bg-gradient-to-br backdrop-blur-3xl relative overflow-hidden ${
                      isActive ? `${meta.grad} border-white/20 scale-[1.02]` : 'border-white/5 bg-white/5 opacity-40'
                    }`}>
                    <div className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-60">{meta.label}</div>
                    <div className="text-4xl font-black tracking-tighter">
                      {type === 'usd' ? `रू ${val.toFixed(2)}` : formatRS(val)}
                    </div>
                  </div>
                 );
              })}
            </div>

            <section className="bg-white/5 border border-white/10 rounded-[3.5rem] p-9 backdrop-blur-3xl shadow-xl overflow-hidden relative">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-xl font-black tracking-tight flex items-center gap-3"><Activity className="w-5 h-5" style={{ color: themeColor }} /> Trend</h3>
                <div className="flex bg-white/5 rounded-full p-1 border border-white/10">
                  {[7, 30, 90].map(t => (<button key={t} onClick={() => setTimeframe(t)} className={`px-4 py-2 rounded-full text-[9px] font-black transition-all ${timeframe === t ? `text-black` : 'text-zinc-500'}`} style={timeframe === t ? { backgroundColor: themeColor } : {}}>{t}D</button>))}
                </div>
              </div>
              <div className="h-64 relative"><Line data={{
                labels: priceData.slice(-timeframe).map(d => d.date.split(' ')[0]),
                datasets: [{
                  data: priceData.slice(-timeframe).map(d => activeMetal === 'usd' ? d.usdRate : d[activeMetal]),
                  borderColor: themeColor, borderWidth: 4, tension: 0.4, pointRadius: 0, fill: true,
                  backgroundColor: (ctx) => {
                    const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 300);
                    g.addColorStop(0, `${themeColor}40`); g.addColorStop(1, 'transparent'); return g;
                  }
                }]
              }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: false }, scales: { x: { display: false }, y: { display: false } } }} /></div>
            </section>
          </main>
        )}

        {/* --- TOOLS --- */}
        {view === 'calculator' && (
          <main className="px-6 relative z-10 animate-in zoom-in-95 duration-500">
            <div className="bg-white/5 border border-white/10 rounded-[4rem] p-8 backdrop-blur-3xl shadow-xl">
              <div className="flex p-1 bg-black/40 rounded-[2rem] mb-10 border border-white/5">
                  <button onClick={() => setCalcMode('jewelry')} className={`flex-1 py-4 rounded-3xl text-[9px] font-black uppercase transition-all ${calcMode === 'jewelry' ? 'bg-white text-black' : 'text-zinc-500'}`}>Jewelry</button>
                  <button onClick={() => setCalcMode('convert')} className={`flex-1 py-4 rounded-3xl text-[9px] font-black uppercase transition-all ${calcMode === 'convert' ? 'bg-green-500 text-black' : 'text-zinc-500'}`}>Unit Converter</button>
                  <button onClick={() => setCalcMode('loan')} className={`flex-1 py-4 rounded-3xl text-[9px] font-black uppercase transition-all ${calcMode === 'loan' ? 'bg-amber-500 text-black' : 'text-zinc-500'}`}>Gold Loan</button>
              </div>

              {calcMode === 'jewelry' && (
                <div className="space-y-6">
                  {/* BUY SELL TOGGLE */}
                  <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5">
                    <button onClick={() => setCalcType('buy')} className={`flex-1 py-3 rounded-xl text-[10px] font-black ${calcType === 'buy' ? 'bg-zinc-800 text-green-400' : 'text-zinc-500'}`}>NEW PURCHASE</button>
                    <button onClick={() => setCalcType('sell')} className={`flex-1 py-3 rounded-xl text-[10px] font-black ${calcType === 'sell' ? 'bg-zinc-800 text-red-400' : 'text-zinc-500'}`}>SELL BACK</button>
                  </div>

                  <div className="flex gap-2">
                    {['gold', 'tejabi', 'silver'].map(m => (
                      <button key={m} onClick={() => setActiveMetal(m)} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase border transition-all ${activeMetal === m ? 'border-white/40 bg-white/10' : 'border-white/5 opacity-40'}`}>{m}</button>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {['tola', 'aana', 'lal'].map((unit) => (
                      <div key={unit}>
                        <label className="text-[9px] font-black opacity-40 uppercase mb-2 block ml-3 tracking-widest">{unit}</label>
                        <input type="number" className="w-full bg-black/60 border border-white/10 p-5 rounded-3xl text-center font-black text-2xl outline-none focus:border-white/30" value={calc[unit]} onChange={(e) => setCalc({...calc, [unit]: e.target.value})} placeholder="0" />
                      </div>
                    ))}
                  </div>

                  {calcType === 'buy' ? (
                    <>
                      <input type="number" placeholder="Making Charges (Total Rs)" className="w-full bg-black/60 border border-white/10 p-6 rounded-3xl font-black outline-none focus:border-white/30" value={calc.making} onChange={(e) => setCalc({...calc, making: e.target.value})} />
                      <div onClick={() => setCalc({...calc, vat: !calc.vat})} className="flex justify-between items-center p-6 bg-white/5 rounded-3xl border border-white/5 cursor-pointer">
                        <div className="flex items-center gap-3"><div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${calc.vat ? 'bg-amber-500 border-amber-500' : 'border-zinc-800'}`}>{calc.vat && <Zap className="w-3 h-3 text-black fill-black" />}</div><span className="font-bold text-[13px] text-zinc-300">Govt VAT (13%)</span></div>
                      </div>
                    </>
                  ) : (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex gap-3 items-center">
                      <Info className="w-4 h-4 text-red-400" />
                      <p className="text-[10px] opacity-70">A standard 5% deduction is applied for old gold exchange.</p>
                    </div>
                  )}

                  <div className="p-12 rounded-[3.5rem] text-black text-center shadow-2xl transition-all" style={{ background: `linear-gradient(135deg, ${themeColor}, #000 180%)`, color: 'white' }}>
                     <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-2 opacity-60">{calcType === 'buy' ? 'Total Cost' : 'Payout Estimate'}</p>
                     <h3 className="text-5xl font-black tracking-tighter">
                        {(() => {
                          const rate = priceData[priceData.length-1][activeMetal];
                          const weight = (Number(calc.tola)||0) + (Number(calc.aana)||0)/16 + (Number(calc.lal)||0)/192;
                          let total = weight * rate;
                          if (calcType === 'buy') {
                            total += (Number(calc.making)||0);
                            if (calc.vat) total *= 1.13;
                          } else {
                            total *= 0.95;
                          }
                          return formatRS(total);
                        })()}
                     </h3>
                  </div>
                </div>
              )}

              {calcMode === 'convert' && (
                <div className="space-y-10 animate-in fade-in duration-500 py-4">
                  <div className="text-center">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 block mb-6">Mass in Grams</label>
                    <input type="number" value={gramInput} onChange={(e) => setGramInput(e.target.value)} className="bg-transparent border-b-4 border-white/10 w-full text-center text-7xl font-black outline-none focus:border-green-500 transition-all pb-4" placeholder="0.0" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {Object.entries(convertGrams(gramInput)).map(([k, v]) => (
                      <div key={k} className="bg-white/5 rounded-[2rem] p-8 text-center border border-white/5">
                        <p className="text-4xl font-black mb-1">{v}</p>
                        <p className="text-[10px] font-black uppercase opacity-30">{k === 't' ? 'Tola' : k === 'a' ? 'Aana' : 'Lal'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {calcMode === 'loan' && (
                <div className="space-y-8 py-4 animate-in fade-in duration-500">
                  <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-3xl flex gap-4 items-center">
                    <Info className="w-6 h-6 text-amber-500 shrink-0" />
                    <p className="text-xs leading-relaxed opacity-80">Under Nepal Rastra Bank guidelines, banks provide up to **70% Loan-to-Value (LTV)** for gold loans.</p>
                  </div>
                  <div className="text-center p-12 bg-white/5 rounded-[3rem] border border-white/5">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4">Max Loan Eligibility</p>
                    <h4 className="text-5xl font-black tracking-tighter text-amber-500">
                      {(() => {
                        const rate = priceData[priceData.length-1].gold;
                        const weight = (Number(calc.tola)||0) + (Number(calc.aana)||0)/16 + (Number(calc.lal)||0)/192;
                        return formatRS(weight * rate * 0.70);
                      })()}
                    </h4>
                    <p className="text-[9px] mt-6 opacity-30 uppercase font-black">Estimate based on current Chhapawal rate</p>
                  </div>
                </div>
              )}
            </div>
          </main>
        )}

        <nav className="fixed bottom-12 left-10 right-10 h-20 bg-zinc-900/60 backdrop-blur-[50px] rounded-[3rem] border border-white/10 flex justify-around items-center px-4 z-50 shadow-2xl">
          <button onClick={() => setView('dashboard')} className={`flex flex-col items-center gap-1.5 px-12 py-3.5 rounded-[2.2rem] transition-all duration-300 ${view === 'dashboard' ? 'text-black shadow-lg shadow-white/5' : 'text-zinc-500'}`} style={view === 'dashboard' ? { backgroundColor: themeColor } : {}}>
            <LayoutDashboard className={`w-6 h-6 ${view === 'dashboard' ? 'fill-black' : ''}`} />
            <span className="text-[9px] font-black uppercase tracking-widest">Market</span>
          </button>
          <button onClick={() => setView('calculator')} className={`flex flex-col items-center gap-1.5 px-12 py-3.5 rounded-[2.2rem] transition-all duration-300 ${view === 'calculator' ? 'text-black shadow-lg shadow-white/5' : 'text-zinc-500'}`} style={view === 'calculator' ? { backgroundColor: themeColor } : {}}>
            <Calculator className={`w-6 h-6 ${view === 'calculator' ? 'fill-black' : ''}`} />
            <span className="text-[9px] font-black uppercase tracking-widest">Tools</span>
          </button>
        </nav>

        <footer className="mt-12 px-8 pb-12 text-zinc-600 text-[10px] leading-relaxed border-t border-white/5 pt-10 text-center">
          <p className="font-black uppercase tracking-[0.3em] text-zinc-500">GoldView Nepal • Designed by @Timeswantstocode</p>
        </footer>

        <Analytics />
        <SpeedInsights />
      </div>
    </HelmetProvider>
  );
}