/*
 * Copyright (c) 2024-2026 Timeswantstocode. All Rights Reserved.
 * This software is proprietary and may not be copied, modified, or distributed.
 * See LICENSE file for details.
 */

import React, { useState, useMemo, useEffect, useCallback, useRef, Suspense, lazy } from 'react';
import { 
  LayoutDashboard, Calculator, RefreshCcw, TrendingUp, 
  X, Calendar, Zap, Activity, Coins, ArrowRightLeft, Globe, ArrowDown, Bell,
  Menu, Share2, Languages, Plus, Trash2, TrendingDown, Clock, Download
} from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Helmet, HelmetProvider } from 'react-helmet-async';

const PriceChart = lazy(() => import('./components/PriceChart'));

const DATA_URL = "/data.json";
const FOREX_PROXY = "/api/forex";
const PRIMARY_DOMAIN = "https://www.goldview.tech/";
const SHARE_CARD_WIDTH = 600;
const SHARE_CARD_HEIGHT = 600;


const CURRENCY_LIST = [
  { code: 'USD', flag: '🇺🇸' }, { code: 'INR', flag: '🇮🇳' },
  { code: 'GBP', flag: '🇬🇧' }, { code: 'AUD', flag: '🇦🇺' },
  { code: 'JPY', flag: '🇯🇵' }, { code: 'KRW', flag: '🇰🇷' },
  { code: 'AED', flag: '🇦🇪' }, { code: 'EUR', flag: '🇪🇺' }
];

const STRUCTURED_DATA = JSON.stringify([
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "GoldView Nepal",
    "url": PRIMARY_DOMAIN,
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${PRIMARY_DOMAIN}?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  },
  {
    "@context": "https://schema.org",
    "@type": "FinancialService",
    "name": "GoldView Nepal",
    "url": PRIMARY_DOMAIN,
    "logo": `${PRIMARY_DOMAIN}logo512.webp`,
    "image": `${PRIMARY_DOMAIN}logo512.webp`,
    "description": "Official GoldView Nepal: Real-time 24K Gold, Silver and Forex rates in Nepal. Track gold prices today and calculate jewelry costs.",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Kathmandu",
      "addressCountry": "NP"
    },
    "priceRange": "रू",
    "applicationCategory": "FinanceApplication",
    "operatingSystem": "All",
    "keywords": "goldview nepal, gold price nepal, silver price nepal, live gold rate nepal"
  }
]);

const TRANSLATIONS = {
  en: {
    marketUpdate: "Nepali Rates",
    dashboard: "Market",
    calculator: "Calculator",
    myGold: "My Gold",
    priceTrend: "Price Trend",
    historicalPoint: "Historical Point",
    marketRate: "Market Rate",
    jewelry: "Jewelry",
    currency: "Currency",
    purchase: "Purchase",
    sellBack: "Sell Back",
    tola: "Tola",
    aana: "Aana",
    lal: "Lal",
    makingCharges: "Making Charges (रू)",
    includeVat: "Include 13% VAT",
    estimatedTotal: "Estimated Total",
    buybackValue: "Buyback Value (Market - 5%)",
    youSend: "YOU SEND",
    receiverGets: "RECEIVER GETS",
    payoutEstimate: "Payout Estimate",
    lastUpdated: "Last Updated",
    minutesAgo: "mins ago",
    justNow: "Just now",
    perTola: "per tola",
    liveMarketRate: "Live Market Rate",
    officialPeggedRate: "Official Pegged Rate",
    gold24K: "24K Gold",
    gold22K: "22K Gold",
    silver: "Pure Silver",
    share: "Share",
    refresh: "Refresh",
    settings: "Settings",
    language: "Language",
    addAsset: "Add Asset",
    assetName: "Asset Name (Optional)",
    weight: "Weight",
    purchasePrice: "Purchase Price",
    currentValue: "Current Value",
    profit: "Profit",
    loss: "Loss",
    noAssets: "No assets added yet.",
    save: "Save",
    cancel: "Cancel",
    shareTitle: "GoldView Nepal - Live Rates",
    totalValue: "Total Portfolio Value",
    unrealizedPL: "Unrealized P/L",
    downloadImage: "Download Image",
    generating: "Generating...",
    addToHomeScreen: "Add the app to home screen for better experience",
    howTo: "How?",
    enableAlertsIOS: "Enable Alerts on iOS",
    installGoldView: "Install GoldView",
    iosNotifDescription: "To receive price change notifications on your iPhone, you must add GoldView to your Home Screen:",
    iosInstallDescription: "Follow these steps to add GoldView to your iPhone:",
    androidInstallDescription: "Follow these steps to add GoldView to your Android device:",
    iosStep1: "Tap the Share icon",
    iosStep1Detail: "Tap the",
    shareIcon: "Share",
    iconInSafari: "icon in Safari",
    iosStep2: "Select",
    addToHomeScreenOption: "Add to Home Screen",
    androidStep1: "Tap the",
    threeDotsMenu: "three dots",
    menuInChrome: "(menu) in Chrome",
    androidStep2: "Select",
    installAppOption: "Install app",
    orOption: "or",
    step3: "Open the app from your home screen",
    gotIt: "Got it",
    notificationGranted: "Price alerts enabled! You'll be notified when rates change.",
    notificationWelcome: "Local alerts enabled!",
    currentRates: "Current Rates",
    selectCurrency: "Select Currency",
    delete: "Delete",
    confirmDelete: "Are you sure you want to delete this asset?"
  },
  ne: {
    marketUpdate: "नेपाली दर",
    dashboard: "बजार",
    calculator: "कैलकुलेटर",
    myGold: "मेरो सुन",
    priceTrend: "मूल्य प्रवृत्ति",
    historicalPoint: "ऐतिहासिक बिन्दु",
    marketRate: "बजार दर",
    jewelry: "गहना",
    currency: "मुद्रा",
    purchase: "खरिद",
    sellBack: "बिक्री",
    tola: "तोला",
    aana: "आना",
    lal: "लाल",
    makingCharges: "ज्याला (रू)",
    includeVat: "१३% भ्याट समावेश गर्नुहोस्",
    estimatedTotal: "अनुमानित जम्मा",
    buybackValue: "बाइबाक मूल्य (बजार - ५%)",
    youSend: "तपाईं पठाउनुहुन्छ",
    receiverGets: "प्राप्तकर्ताले पाउँछ",
    payoutEstimate: "भुक्तानी अनुमान",
    lastUpdated: "अन्तिम अपडेट",
    minutesAgo: "मिनेट अगाडि",
    justNow: "भर्खरै",
    perTola: "प्रति तोला",
    liveMarketRate: "प्रत्यक्ष बजार दर",
    officialPeggedRate: "आधिकारिक दर",
    gold24K: "२४ क्यारेट सुन",
    gold22K: "२२ क्यारेट सुन",
    silver: "चाँदी",
    share: "शेयर",
    refresh: "रिफ्रेश",
    settings: "सेटिङहरू",
    language: "भाषा",
    addAsset: "नयाँ सम्पत्ति थप्नुहोस्",
    assetName: "सम्पत्तिको नाम (वैकल्पिक)",
    weight: "तौल",
    purchasePrice: "खरिद मूल्य",
    currentValue: "हालको मूल्य",
    profit: "नाफा",
    loss: "घाटा",
    noAssets: "कुनै सम्पत्ति थपिएको छैन।",
    save: "बचत गर्नुहोस्",
    cancel: "रद्द गर्नुहोस्",
    shareTitle: "GoldView Nepal - सुन चाँदी दर",
    totalValue: "कुल पोर्टफोलियो मूल्य",
    unrealizedPL: "अवास्तविक नाफा/घाटा",
    downloadImage: "तस्वीर डाउनलोड गर्नुहोस्",
    generating: "बनाउँदै...",
    addToHomeScreen: "राम्रो अनुभवका लागि एपलाई होम स्क्रिनमा थप्नुहोस्",
    howTo: "कसरी?",
    enableAlertsIOS: "iOS मा सूचना सक्षम गर्नुहोस्",
    installGoldView: "GoldView स्थापना गर्नुहोस्",
    iosNotifDescription: "आफ्नो iPhone मा मूल्य परिवर्तन सूचनाहरू प्राप्त गर्न, तपाईंले GoldView लाई आफ्नो होम स्क्रिनमा थप्नु पर्छ:",
    iosInstallDescription: "आफ्नो iPhone मा GoldView थप्न यी चरणहरू पालना गर्नुहोस्:",
    androidInstallDescription: "आफ्नो Android उपकरणमा GoldView थप्न यी चरणहरू पालना गर्नुहोस्:",
    iosStep1: "शेयर आइकनमा ट्याप गर्नुहोस्",
    iosStep1Detail: "Safari मा",
    shareIcon: "शेयर",
    iconInSafari: "आइकनमा ट्याप गर्नुहोस्",
    iosStep2: "चयन गर्नुहोस्",
    addToHomeScreenOption: "होम स्क्रिनमा थप्नुहोस्",
    androidStep1: "Chrome मा",
    threeDotsMenu: "तीन थोप्ला",
    menuInChrome: "(मेनु) मा ट्याप गर्नुहोस्",
    androidStep2: "चयन गर्नुहोस्",
    installAppOption: "एप स्थापना गर्नुहोस्",
    orOption: "वा",
    step3: "आफ्नो होम स्क्रिनबाट एप खोल्नुहोस्",
    gotIt: "बुझे",
    notificationGranted: "मूल्य सूचना सक्षम गरियो! दर परिवर्तन हुँदा तपाईंलाई सूचित गरिनेछ।",
    notificationWelcome: "स्थानीय सूचना सक्षम गरियो!",
    currentRates: "हालको दरहरू",
    selectCurrency: "मुद्रा चयन गर्नुहोस्",
    delete: "हटाउनुहोस्",
    confirmDelete: "के तपाईं यो सम्पत्ति हटाउन चाहनुहुन्छ?"
  }
};

const getMetalMeta = (t) => ({
  gold: { label: t('gold24K'), sub: t('perTola'), grad: 'from-[#D4AF37]/50 to-[#D4AF37]/15' },
  tejabi: { label: t('gold22K'), sub: t('perTola'), grad: 'from-[#CD7F32]/50 to-[#CD7F32]/15' },
  silver: { label: t('silver'), sub: t('perTola'), grad: 'from-zinc-400/40 to-zinc-600/15' },
});

const getForexMeta = (t) => CURRENCY_LIST.reduce((acc, curr) => {
  const code = curr.code;
  acc[code.toLowerCase()] = {
    label: `${code} to NPR`,
    sub: code === 'INR' ? t('officialPeggedRate') : t('liveMarketRate'),
    grad: 'from-[#22c55e]/45 to-[#22c55e]/15'
  };
  return acc;
}, {});

const getMeta = (type, t) => getMetalMeta(t)[type] || getForexMeta(t)[type] || { label: type.toUpperCase(), sub: '', grad: '' };

const PriceCard = React.memo(({ type, isActive, diff, val, meta, onClick, formatValue, forexLoading }) => {
  const isForex = !['gold', 'tejabi', 'silver'].includes(type);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(type);
    }
  };

  return (
    <div
      onClick={() => onClick(type)}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Select ${meta.label}`}
      className={`p-7 rounded-[2.8rem] border-[1.5px] transition-all duration-300 cursor-pointer bg-gradient-to-br backdrop-blur-xl relative overflow-hidden focus-visible:ring-2 focus-visible:ring-white/50 outline-none ${
        isActive ? `${meta.grad} border-white/20 scale-[1.02]` : 'border-white/5 bg-white/5 opacity-60'
      }`}>
      <div className="flex justify-between items-start mb-2 text-[12px] font-black uppercase tracking-widest">
        <div className="flex flex-col gap-0.5">
          {isForex ? (
            <div className="flex items-center gap-2">
              <span>{meta.label}</span>
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
            </div>
          ) : (
            <span>{meta.label}</span>
          )}
          <p className="text-[10px] opacity-70">{meta.sub}</p>
        </div>
        {isForex && forexLoading ? <RefreshCcw className="w-3 h-3 text-green-500 animate-spin" /> :
        <div className={`px-2.5 py-1 rounded-xl border font-bold ${diff.isUp ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>{diff.val}</div>}
      </div>
      <div className="flex justify-between items-end text-4xl font-extrabold tracking-tighter">
        <h2>{formatValue(val, type)}</h2>
        {isActive && <TrendingUp className={`w-5 h-5 ${diff.isUp ? 'text-green-500' : 'text-red-500 rotate-180'}`} />}
      </div>
    </div>
  );
});

const JewelryResult = React.memo(({ themeColor, activeMetal, tradeMode, calc, latestPrice, formatRS }) => {
  const weight = (Number(calc.tola)||0) + (Number(calc.aana)||0)/16 + (Number(calc.lal)||0)/192;
  const result = tradeMode === 'sell' ? formatRS(weight * latestPrice * 0.95) : formatRS((weight * latestPrice + (Number(calc.making)||0)) * (calc.vat ? 1.13 : 1));
  const fontSize = result.length > 15 ? 'text-2xl' : result.length > 12 ? 'text-3xl' : result.length > 10 ? 'text-4xl' : 'text-5xl';
  return (
    <div className="p-8 sm:p-12 rounded-[3.5rem] text-black text-center shadow-2xl transition-all" style={{ background: `linear-gradient(135deg, ${themeColor}, ${activeMetal === 'gold' ? '#b8860b' : activeMetal === 'tejabi' ? '#8B4513' : '#4b5563'})` }}>
       <p className="text-[11px] font-black uppercase tracking-[0.4em] mb-2 opacity-60">{tradeMode === 'buy' ? 'Estimated Total' : 'Buyback Value (Market - 5%)'}</p>
       <h3 className={`${fontSize} font-black tracking-tighter break-all`}>{result}</h3>
    </div>
  );
});

const CurrencyResult = React.memo(({ forexHistory, currCalc, formatRS }) => {
  const latestRates = forexHistory[forexHistory.length - 1]?.rates || [];
  const rateData = latestRates.find(r => r.code === currCalc.source);
  const rawRate = parseFloat(rateData?.buy || 133);
  const unit = parseInt(rateData?.unit || 1);
  const amt = Number(currCalc.amount) || 0;
  const result = currCalc.isSwapped ? ((amt / rawRate) * unit).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : formatRS((amt / unit) * rawRate);
  const fontSize = result.length > 15 ? 'text-2xl' : result.length > 12 ? 'text-3xl' : result.length > 10 ? 'text-4xl' : 'text-5xl';
  return <h3 className={`${fontSize} font-black tracking-tighter relative z-10 break-all`}>{result}</h3>;
});

const getOrCreateTooltip = (chart) => {
  let tooltipEl = chart.canvas.parentNode.querySelector('div.gv-tooltip');
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'gv-tooltip';
    tooltipEl.style.background = 'rgba(10, 10, 10, 0.7)';
    tooltipEl.style.backdropFilter = 'blur(20px)';
    tooltipEl.style.WebkitBackdropFilter = 'blur(20px)';
    tooltipEl.style.borderRadius = '14px';
    tooltipEl.style.color = 'white';
    tooltipEl.style.opacity = 0;
    tooltipEl.style.pointerEvents = 'none';
    tooltipEl.style.position = 'absolute';
    tooltipEl.style.transform = 'translate(-50%, 0)';
    tooltipEl.style.transition = 'all .12s ease';
    tooltipEl.style.border = '1px solid rgba(255, 255, 255, 0.08)';
    tooltipEl.style.padding = '8px 12px';
    tooltipEl.style.zIndex = '100';
    tooltipEl.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
    chart.canvas.parentNode.appendChild(tooltipEl);
  }
  return tooltipEl;
};

const externalTooltipHandler = (context) => {
  const {chart, tooltip} = context;
  const tooltipEl = getOrCreateTooltip(chart);
  if (tooltip.opacity === 0) { tooltipEl.style.opacity = 0; return; }
  if (tooltip.body) {
    const titleLines = tooltip.title || [];
    const bodyLines = tooltip.body.map(b => b.lines);
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.flexDirection = 'column';
    div.style.alignItems = 'center';
    titleLines.forEach(title => {
      const span = document.createElement('span');
      span.style.fontSize = '8px';
      span.style.fontWeight = '800';
      span.style.textTransform = 'uppercase';
      span.style.display = 'block';
      span.style.marginBottom = '2px';
      span.style.opacity = '0.5';
      span.style.whiteSpace = 'nowrap';
      span.innerText = title;
      div.appendChild(span);
    });
    bodyLines.forEach((body) => {
      const span = document.createElement('span');
      span.style.fontSize = '14px';
      span.style.fontWeight = '900';
      span.style.letterSpacing = '-0.01em';
      span.style.whiteSpace = 'nowrap';
      span.innerText = body;
      div.appendChild(span);
    });
    while (tooltipEl.firstChild) { tooltipEl.firstChild.remove(); }
    tooltipEl.appendChild(div);
  }
  const {offsetLeft: positionX, offsetTop: positionY} = chart.canvas;
  tooltipEl.style.opacity = 1;
  tooltipEl.style.left = positionX + tooltip.caretX + 'px';
  tooltipEl.style.top = positionY + tooltip.caretY - 60 + 'px';
};

export default function App() {
  const [priceData, setPriceData] = useState(() => JSON.parse(localStorage.getItem('gv_v18_metal') || '[]'));
  const [forexHistory, setForexHistory] = useState(() => JSON.parse(localStorage.getItem('gv_v18_forex') || '[]'));
  const [loading, setLoading] = useState(priceData.length === 0);
  const [forexLoading, setForexLoading] = useState(true);
  const [view, setView] = useState('dashboard');
  const [calcMode, setCalcMode] = useState('jewelry'); 
  const [tradeMode, setTradeMode] = useState('buy'); 
  const [activeMetal, setActiveMetal] = useState('gold'); 
  const [dashboardForex, setDashboardForex] = useState('usd');
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [timeframe, setTimeframe] = useState(7);
  const [calc, setCalc] = useState({ tola: '', aana: '', lal: '', making: '', vat: true });
  const [currCalc, setCurrCalc] = useState({ amount: '1', source: 'USD', isSwapped: false });
  const [notifStatus, setNotifStatus] = useState('default');
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [lang, setLang] = useState(() => localStorage.getItem('gv_lang') || 'en');
  const [showMenu, setShowMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [portfolio, setPortfolio] = useState(() => JSON.parse(localStorage.getItem('gv_portfolio') || '[]'));
  const [showPortfolioAdd, setShowPortfolioAdd] = useState(false);
  const [newAsset, setNewAsset] = useState({ type: 'gold', name: '', tola: '', aana: '', lal: '', pricePaid: '' });
  const [showGuide, setShowGuide] = useState(false);
  const [newlyAddedIndex, setNewlyAddedIndex] = useState(null);

  const chartRef = useRef(null);
  const shareCardRef = useRef(null);
  const highlightTimeoutRef = useRef(null);

  const t = useCallback((key) => TRANSLATIONS[lang][key] || key, [lang]);

  // Clean up highlight timeout when component unmounts
  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  // Memoize metadata to provide stable object references for PriceCard components.
  // This prevents unnecessary re-renders of the entire dashboard grid when
  // unrelated state (like chart timeframe or portfolio selections) changes.
  const allMeta = useMemo(() => ({
    ...getMetalMeta(t),
    ...getForexMeta(t)
  }), [t]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    fetch(DATA_URL).then(res => res.json()).then(json => {
        setPriceData(json);
        localStorage.setItem('gv_v18_metal', JSON.stringify(json));
        setLoading(false);
    }).catch(() => setLoading(false));

    fetch(FOREX_PROXY).then(res => res.json()).then(json => {
        const transformed = (json.rates || []).map(day => ({
          date: day.date,
          usdRate: parseFloat(day.currencies.find(c => c.code === 'USD')?.buy || 0),
          rates: day.currencies
        })).sort((a, b) => new Date(a.date) - new Date(b.date));
        setForexHistory(transformed);
        localStorage.setItem('gv_v18_forex', JSON.stringify(transformed));
        setForexLoading(false);
    }).catch((err) => {
        console.error("Forex fetch failed:", err);
        setForexLoading(false);
    });

    if ('Notification' in window) {
      setNotifStatus(Notification.permission);
    }
  }, []);

  const isIOS = useMemo(() => {
    return (/iPad|iPhone|iPod/.test(navigator.userAgent) || 
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) && 
           !window.MSStream;
  }, []);

  const isStandalone = useMemo(() => {
    return window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
  }, []);

  const handleNotificationRequest = async () => {
    // On iOS/iPadOS, Web Push is ONLY available when the app is added to the Home Screen (Standalone mode)
    if (isIOS && !isStandalone) {
      setShowIOSGuide(true);
      return;
    }

    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      alert("Notifications are not supported in this browser.");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotifStatus(permission);
      
      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.ready;
        const VAPID_PUBLIC_KEY = "BK4UiqZsmzcWoQR_JFmuAhQQ2R7JQEIxC83Tppc8VxBwd4a3mXztqyv31Q9XJ3Ab6Yq_aqbExGlNMX2NP2j5zAQ"; 
        
        if (VAPID_PUBLIC_KEY === "YOUR_VAPID_PUBLIC_KEY") {
          registration.showNotification(t('currentRates'), {
            body: t('notificationWelcome'),
            icon: "/logo512.webp",
            badge: "/logo512.webp",
            tag: 'welcome-notification'
          });
          return;
        }

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: VAPID_PUBLIC_KEY
        });

        await fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription)
        });
        
        registration.showNotification(t('currentRates'), {
          body: t('notificationGranted'),
          icon: "/logo512.webp",
          badge: "/logo512.webp",
          tag: 'welcome-notification'
        });
      }
    } catch (err) {
      console.error("Notification request failed:", err);
    }
  };

  const formatRS = useCallback((num) => `रू ${Math.round(num || 0).toLocaleString('en-IN')}`, []);
  const formatValue = useCallback((val, metal) => {
    const isForex = !['gold', 'tejabi', 'silver'].includes(metal);
    if (isForex) return `रू ${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return formatRS(val);
  }, [formatRS]);

  const themeColor = useMemo(() => {
    if (view === 'calculator' && calcMode === 'currency') return '#22c55e';
    if (view === 'portfolio') return '#D4AF37';
    if (activeMetal === 'gold') return '#D4AF37';
    if (activeMetal === 'tejabi') return '#CD7F32'; 
    if (activeMetal === 'silver') return '#94a3b8';
    return '#22c55e'; 
  }, [activeMetal, view, calcMode]);

  const activeDataList = useMemo(() => {
    if (['gold', 'tejabi', 'silver'].includes(activeMetal)) return priceData;
    return forexHistory;
  }, [activeMetal, forexHistory, priceData]);
  const filteredData = useMemo(() => activeDataList.slice(-timeframe), [activeDataList, timeframe]);

  const allDiffs = useMemo(() => {
    const latestMetal = priceData[priceData.length - 1] || {};
    const prevMetal = priceData[priceData.length - 2] || {};
    const latestForex = forexHistory[forexHistory.length - 1] || {};
    const prevForex = forexHistory[forexHistory.length - 2] || {};

    const latestRatesMap = (latestForex.rates || []).reduce((acc, r) => {
      acc[r.code.toLowerCase()] = r.buy / (r.unit || 1);
      return acc;
    }, {});
    const prevRatesMap = (prevForex.rates || []).reduce((acc, r) => {
      acc[r.code.toLowerCase()] = r.buy / (r.unit || 1);
      return acc;
    }, {});

    const calculate = (id) => {
      const isForex = !['gold', 'tejabi', 'silver'].includes(id);
      let currVal = 0, prevVal = 0;

      if (isForex) {
        if (id === 'usd') {
          currVal = latestForex.usdRate || 0;
          prevVal = prevForex.usdRate || 0;
        } else {
          currVal = latestRatesMap[id] || 0;
          prevVal = prevRatesMap[id] || 0;
        }
      } else {
        currVal = latestMetal[id] || 0;
        prevVal = prevMetal[id] || 0;
      }

      const diff = currVal - prevVal;
      return {
        val: `रू ${diff >= 0 ? '+' : ''}${diff.toLocaleString('en-IN', {
          minimumFractionDigits: isForex ? 2 : 0,
          maximumFractionDigits: isForex ? 2 : 0
        })}`,
        isUp: diff >= 0
      };
    };

    const diffs = {
      gold: calculate('gold'),
      tejabi: calculate('tejabi'),
      silver: calculate('silver'),
    };
    CURRENCY_LIST.forEach(c => {
      const code = c.code.toLowerCase();
      diffs[code] = calculate(code);
    });
    return diffs;
  }, [priceData, forexHistory]);

  const handleMetalClick = useCallback((type) => {
    setActiveMetal(type);
    if (!['gold', 'tejabi', 'silver'].includes(type)) {
      setDashboardForex(type);
    }
    setSelectedPoint(null);
  }, []);

  const handleCurrencyChange = useCallback((newCurr) => {
    setDashboardForex(newCurr);
    setActiveMetal(newCurr);
  }, []);

  const handleTimeframeChange = useCallback((t) => {
    setTimeframe(t);
    setSelectedPoint(null);
  }, []);

  const handleShare = async () => {
    if (!shareCardRef.current) return;
    setIsGenerating(true);
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(shareCardRef.current, { cacheBust: true, pixelRatio: 3, width: SHARE_CARD_WIDTH, height: SHARE_CARD_HEIGHT });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'goldview-rates.png', { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: t('shareTitle'),
          text: `Today's Gold & Silver rates in Nepal. Shared via GoldView.`
        });
      } else {
        const link = document.createElement('a');
        link.download = 'goldview-today-rates.png';
        link.href = dataUrl;
        link.click();
      }
    } catch (err) {
      console.error('Error generating share image:', err);
    } finally {
      setIsGenerating(false);
      setShowShareModal(false);
    }
  };

  const chartData = useMemo(() => ({
    labels: filteredData.map(d => {
        const date = new Date(d.date.replace(' ', 'T'));
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
    datasets: [{
      data: filteredData.map(d => {
        if (!['gold', 'tejabi', 'silver'].includes(activeMetal)) {
          if (activeMetal === 'usd') return d.usdRate;
          const rate = d.rates?.find(r => r.code.toLowerCase() === activeMetal.toLowerCase());
          return rate ? (rate.buy / (rate.unit || 1)) : 0;
        }
        return Number(d[activeMetal]) || 0;
      }),
      borderColor: themeColor,
      borderWidth: 4,
      fill: true,
      tension: 0.4,
      pointRadius: (ctx) => (selectedPoint?.index === ctx.dataIndex ? 8 : 0),
      pointHoverRadius: 10,
      pointBackgroundColor: '#fff',
      pointBorderWidth: 3,
      backgroundColor: (context) => {
        const {ctx, chartArea} = context.chart;
        if (!chartArea) return null;
        const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        g.addColorStop(0, `${themeColor}40`);
        g.addColorStop(1, 'transparent');
        return g;
      },
    }]
  }), [filteredData, activeMetal, selectedPoint, themeColor]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { 
        legend: false, 
        tooltip: { 
            enabled: false,
            external: externalTooltipHandler,
            callbacks: {
                label: (ctx) => formatValue(ctx.raw, activeMetal)
            }
        } 
    },
    scales: {
      x: {
        display: true,
        grid: { display: true, color: 'rgba(255, 255, 255, 0.04)', borderDash: [6, 6], drawTicks: false },
        ticks: { color: 'rgba(255, 255, 255, 0.25)', font: { size: 9, weight: '700' }, maxRotation: 0, maxTicksLimit: timeframe === 7 ? 7 : 8 }
      },
      y: { display: true, position: 'right', grid: { display: true, color: 'rgba(255, 255, 255, 0.08)', borderDash: [5, 5], drawBorder: false }, ticks: { display: false } }
    },
    onClick: (e, elements) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        const point = filteredData[index];
        let price;
        if (['gold', 'tejabi', 'silver'].includes(activeMetal)) {
          price = Number(point[activeMetal]) || 0;
        } else if (activeMetal === 'usd') {
          price = point.usdRate;
        } else {
          const rate = point.rates?.find(r => r.code.toLowerCase() === activeMetal.toLowerCase());
          price = rate ? (rate.buy / (rate.unit || 1)) : 0;
        }
        setSelectedPoint({ index, date: point.date, price });
      }
    }
  }), [filteredData, activeMetal, timeframe, formatValue]);

  const lastUpdatedBadge = useMemo(() => {
    if (!priceData.length) return null;
    const last = priceData[priceData.length - 1];
    const date = new Date(last.date.replace(' ', 'T'));
    const text = date.toLocaleDateString(lang === 'ne' ? 'ne-NP' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10 shrink-0">
        <Calendar className="w-3 h-3 text-zinc-400" />
        <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">{text}</span>
      </div>
    );
  }, [priceData, lang]);

  const dashboardView = useMemo(() => (
    <div style={{ display: view === 'dashboard' ? 'block' : 'none' }}>
      <main className="px-6 mt-14 space-y-6 relative z-10 animate-in fade-in duration-500 pb-20">
        <div className="flex justify-between items-center px-1">
           <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">{t('dashboard')}</h2>
           {lastUpdatedBadge}
        </div>
        <div className="space-y-4">
          {['gold', 'tejabi', 'silver', dashboardForex].map((type) => {
             let val = 0;
             if (type === 'usd') {
               val = forexHistory[forexHistory.length-1]?.usdRate || 0;
             } else if (!['gold', 'tejabi', 'silver'].includes(type)) {
               const rate = forexHistory[forexHistory.length-1]?.rates?.find(r => r.code.toLowerCase() === type.toLowerCase());
               val = rate ? (rate.buy / (rate.unit || 1)) : 0;
             } else {
               val = priceData[priceData.length-1]?.[type] || 0;
             }

             return (
              <PriceCard
                key={type}
                type={type}
                isActive={activeMetal === type}
                diff={allDiffs[type]}
                val={val}
                meta={allMeta[type] || { label: type.toUpperCase(), sub: '', grad: '' }}
                onClick={handleMetalClick}
                formatValue={formatValue}
                forexLoading={forexLoading}
              />
             );
          })}
        </div>

        <section className="bg-white/5 border border-white/10 rounded-[3.5rem] p-9 backdrop-blur-xl shadow-xl">
          <div className="flex justify-between items-start mb-8 px-1 w-full">
            <div className="flex flex-col gap-1">
              <h3 className="text-xl font-black tracking-tight flex items-center gap-3"><Activity className="w-5 h-5" style={{ color: themeColor }} /> {t('priceTrend')}</h3>
            </div>
            <div className="flex gap-2 bg-white/5 rounded-full p-1 border border-white/10">
              {[7, 30, 90].map((tf) => (<button key={tf} onClick={() => handleTimeframeChange(tf)} className={`px-4 py-2.5 rounded-full text-[11px] font-black transition-all focus-visible:ring-2 focus-visible:ring-white/50 outline-none ${timeframe === tf ? `text-black shadow-lg shadow-white/5` : 'text-zinc-400'}`} style={timeframe === tf ? { backgroundColor: themeColor } : {}}>{tf === 7 ? '7D' : tf === 30 ? '1M' : '3M'}</button>))}
            </div>
          </div>
          <div className="h-64 relative w-full">
            <Suspense fallback={<div className="w-full h-full bg-white/5 animate-pulse rounded-[2rem] flex items-center justify-center text-[10px] font-black text-zinc-600 uppercase tracking-widest">Loading Trend...</div>}>
              <PriceChart ref={chartRef} data={chartData} options={chartOptions} redraw={false} />
            </Suspense>
          </div>

          {/* Currency Selector - Only visible when forex is active */}
          {!['gold', 'tejabi', 'silver'].includes(activeMetal) && (
            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="flex flex-col gap-3">
                <label className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-400" style={{ color: themeColor }}>
                  <Globe className="w-3.5 h-3.5 inline mr-2" />
                  {t('selectCurrency')}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {CURRENCY_LIST.map((currency) => (
                    <button
                      key={currency.code}
                      onClick={() => handleCurrencyChange(currency.code.toLowerCase())}
                      className={`p-3 rounded-2xl text-xs font-black transition-all border-[1.5px] ${
                        activeMetal === currency.code.toLowerCase()
                          ? 'bg-green-500/20 border-green-500/40 text-green-400'
                          : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:border-white/20'
                      }`}
                      aria-label={`Select ${currency.code}`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-lg">{currency.flag}</span>
                        <span>{currency.code}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className={`mt-8 transition-all duration-500 overflow-hidden ${selectedPoint ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}>
            {selectedPoint && (
              <div className="bg-white/10 border-2 rounded-[2.8rem] p-7 flex flex-wrap gap-5 justify-between items-center w-full backdrop-blur-[40px] relative border-white/5" style={{ borderColor: `${themeColor}40` }}>
                <div className="flex items-center gap-5 flex-1 min-w-[220px]">
                  <div className="w-14 h-14 rounded-3xl flex items-center justify-center border shrink-0 bg-white/[0.03]" style={{ borderColor: `${themeColor}30` }}>
                    <Calendar className="w-7 h-7" style={{ color: themeColor }} />
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] mb-1" style={{ color: themeColor }}>{t('historicalPoint')}</p>
                    <p className="text-lg font-black text-white leading-tight">
                        {new Date(selectedPoint.date.replace(' ', 'T')).toLocaleDateString(lang === 'ne' ? 'ne-NP' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="text-[11px] font-black text-zinc-600 uppercase mb-1">{t('marketRate')}</p>
                    <p className="text-3xl font-black text-white">{formatValue(selectedPoint.price, activeMetal)}</p>
                  </div>
                  <button
                    onClick={() => setSelectedPoint(null)}
                    aria-label="Close details"
                    className="p-3 bg-white/5 rounded-full hover:bg-white/10 active:scale-90 focus-visible:ring-2 focus-visible:ring-white/50 outline-none transition-all border border-white/5">
                    <X className="w-5 h-5 text-zinc-400" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  ), [view, activeMetal, dashboardForex, allDiffs, priceData, forexHistory, forexLoading, themeColor, timeframe, chartData, chartOptions, selectedPoint, handleMetalClick, formatValue, handleCurrencyChange, handleTimeframeChange, t, lang]);

  const portfolioView = useMemo(() => {
    const latestPrices = priceData[priceData.length - 1] || {};
    const totalCurrentValue = portfolio.reduce((acc, asset) => {
      const currentPrice = latestPrices[asset.type] || 0;
      return acc + (asset.weight * currentPrice);
    }, 0);
    const totalPaid = portfolio.reduce((acc, asset) => acc + asset.pricePaid, 0);
    const totalPL = totalCurrentValue - totalPaid;

    return (
      <div style={{ display: view === 'portfolio' ? 'block' : 'none' }}>
        <main className="px-6 mt-14 space-y-6 relative z-10 animate-in fade-in duration-500 pb-20">
          <div className="bg-gradient-to-br from-[#D4AF37] to-[#8B4513] p-10 rounded-[3.5rem] text-black shadow-2xl relative overflow-hidden">
             <div className="relative z-10">
               <p className="text-[12px] font-black uppercase tracking-widest opacity-60 mb-2">{t('totalValue')}</p>
               <h2 className="text-4xl font-black tracking-tighter mb-6">{formatRS(totalCurrentValue)}</h2>
               <div className="flex items-center gap-6">
                 <div>
                   <p className="text-[10px] font-black uppercase opacity-60 mb-1">{t('unrealizedPL')}</p>
                   <p className={`text-xl font-black tracking-tight flex items-center gap-1 ${totalPL >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                     {totalPL >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                     {formatRS(totalPL)}
                   </p>
                 </div>
               </div>
             </div>
             <div className="absolute -right-8 -bottom-8 opacity-10">
               <Coins className="w-40 h-40" />
             </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center px-4">
               <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">{t('myGold')}</h3>
               <button
                onClick={() => setShowPortfolioAdd(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#D4AF37] text-black rounded-full font-black text-[12px] uppercase shadow-lg shadow-[#D4AF37]/20 active:scale-95 focus-visible:ring-2 focus-visible:ring-white/50 outline-none transition-all">
                 <Plus className="w-3 h-3" /> {t('addAsset')}
               </button>
            </div>

            {portfolio.length === 0 ? (
              <div className="p-12 text-center bg-white/5 rounded-[3rem] border border-white/5 border-dashed">
                <p className="text-zinc-400 font-bold italic">{t('noAssets')}</p>
              </div>
            ) : (
              portfolio.map((asset, index) => {
                const currentPrice = latestPrices[asset.type] || 0;
                const currentValue = asset.weight * currentPrice;
                const pl = currentValue - asset.pricePaid;
                const isNewlyAdded = index === newlyAddedIndex;
                return (
                  <div 
                    key={index} 
                    className={`bg-white/5 border rounded-[2.5rem] p-6 flex justify-between items-center transition-all duration-500 ${
                      isNewlyAdded 
                        ? 'border-[#D4AF37] border-2 shadow-lg shadow-[#D4AF37]/30 animate-pulse' 
                        : 'border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                       <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-white/5 border border-white/10`}>
                         <Coins className="w-6 h-6" style={{ color: asset.type === 'silver' ? '#94a3b8' : asset.type === 'tejabi' ? '#CD7F32' : '#D4AF37' }} />
                       </div>
                       <div>
                         <p className="text-[12px] font-black uppercase text-white">{asset.name || t(asset.type === 'gold' ? 'gold24K' : asset.type === 'tejabi' ? 'gold22K' : 'silver')}</p>
                         <p className="text-[12px] font-bold text-zinc-400">{asset.weight} {t('tola')}</p>
                       </div>
                    </div>
                    <div className="text-right flex items-center gap-6">
                       <div>
                         <p className="text-lg font-black text-white">{formatRS(currentValue)}</p>
                         <p className={`text-[12px] font-black ${pl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                           {pl >= 0 ? '+' : ''}{formatRS(pl)}
                         </p>
                       </div>
                       <button
                        onClick={() => {
                          if (window.confirm(t('confirmDelete'))) {
                            const newPortfolio = portfolio.filter((_, i) => i !== index);
                            setPortfolio(newPortfolio);
                            localStorage.setItem('gv_portfolio', JSON.stringify(newPortfolio));
                            // Clear highlight and timeout when deleting
                            if (highlightTimeoutRef.current) {
                              clearTimeout(highlightTimeoutRef.current);
                            }
                            setNewlyAddedIndex(null);
                          }
                        }}
                        aria-label={t('delete')}
                        className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 focus-visible:ring-2 focus-visible:ring-red-500/50 outline-none transition-all">
                         <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </main>

        {showPortfolioAdd && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowPortfolioAdd(false)} />
            <div className="bg-[#121212] border border-white/10 rounded-[3rem] p-8 max-w-sm w-full shadow-2xl space-y-6 relative z-10">
              <h3 className="text-xl font-black text-white tracking-tight">{t('addAsset')}</h3>
              <div className="space-y-4">
                <div className="flex p-1 bg-white/5 rounded-2xl mb-2 border border-white/5 w-fit mx-auto gap-1">
                  {['gold', 'tejabi', 'silver'].map(type => (
                    <button
                      key={type}
                      onClick={() => setNewAsset({...newAsset, type})}
                      style={{ backgroundColor: newAsset.type === type ? (type === 'gold' ? '#D4AF37' : type === 'tejabi' ? '#CD7F32' : '#94a3b8') : 'transparent' }}
                      className={`px-4 py-2.5 rounded-xl text-[11px] font-black uppercase transition-all ${newAsset.type === type ? 'text-black' : 'text-zinc-400'}`}>
                      {t(type === 'gold' ? 'gold24K' : type === 'tejabi' ? 'gold22K' : 'silver')}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="text-[12px] font-black text-zinc-400 uppercase mb-2 block ml-3">{t('assetName')}</label>
                  <input type="text" className="w-full bg-black/60 border-2 border-zinc-800 p-5 rounded-2xl font-black text-white outline-none focus:border-[#D4AF37]" value={newAsset.name} onChange={(e) => setNewAsset({...newAsset, name: e.target.value})} placeholder="" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {['tola', 'aana', 'lal'].map((unit) => (
                    <div key={unit}>
                      <label className="text-[12px] font-black text-zinc-400 uppercase mb-2 block ml-3 tracking-widest">{t(unit)}</label>
                      <input
                        type="number"
                        className="w-full bg-black/60 border-2 border-zinc-800 p-4 rounded-2xl text-center font-black text-white outline-none focus:border-[#D4AF37]"
                        value={newAsset[unit]}
                        onChange={(e) => setNewAsset({...newAsset, [unit]: e.target.value})}
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="text-[12px] font-black text-zinc-400 uppercase mb-2 block ml-3">{t('purchasePrice')} (रू)</label>
                  <input type="number" className="w-full bg-black/60 border-2 border-zinc-800 p-5 rounded-2xl font-black text-white outline-none focus:border-[#D4AF37]" value={newAsset.pricePaid} onChange={(e) => setNewAsset({...newAsset, pricePaid: e.target.value})} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowPortfolioAdd(false)} className="flex-1 py-4 bg-white/5 text-white font-black rounded-2xl active:scale-95 transition-all border border-white/5">{t('cancel')}</button>
                <button
                  onClick={() => {
                    const weight = parseFloat(newAsset.tola || 0) + parseFloat(newAsset.aana || 0)/16 + parseFloat(newAsset.lal || 0)/192;
                    if (!weight || !newAsset.pricePaid) return;
                    const asset = {
                      type: newAsset.type,
                      name: newAsset.name || '',
                      weight: weight,
                      pricePaid: parseFloat(newAsset.pricePaid),
                      date: new Date().toISOString()
                    };
                    const newPortfolio = [...portfolio, asset];
                    setPortfolio(newPortfolio);
                    localStorage.setItem('gv_portfolio', JSON.stringify(newPortfolio));
                    setNewlyAddedIndex(newPortfolio.length - 1);
                    setShowPortfolioAdd(false);
                    setNewAsset({ type: 'gold', name: '', tola: '', aana: '', lal: '', pricePaid: '' });
                    // Clear any existing timeout before setting a new one
                    if (highlightTimeoutRef.current) {
                      clearTimeout(highlightTimeoutRef.current);
                    }
                    highlightTimeoutRef.current = setTimeout(() => setNewlyAddedIndex(null), 3000);
                  }}
                  className="flex-1 py-4 bg-[#D4AF37] text-black font-black rounded-2xl active:scale-95 transition-all shadow-lg shadow-[#D4AF37]/20">{t('save')}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }, [view, portfolio, priceData, lang, t, newAsset, showPortfolioAdd, formatRS]);

  const calculatorView = useMemo(() => (
    <div style={{ display: view === 'calculator' ? 'block' : 'none' }}>
      <main className="px-6 mt-14 relative z-10 animate-in zoom-in-95 duration-500 pb-20">
        <div className="bg-white/5 border border-white/10 rounded-[4rem] p-8 backdrop-blur-xl shadow-xl">
          <div className="flex p-1 bg-black/40 rounded-3xl mb-10 border border-white/5">
              <button onClick={() => setCalcMode('jewelry')} style={calcMode === 'jewelry' ? { backgroundColor: themeColor } : {}} className={`flex-1 py-4 rounded-2xl text-[12px] font-black uppercase transition-all duration-500 focus-visible:ring-2 focus-visible:ring-white/50 outline-none ${calcMode === 'jewelry' ? 'text-black' : 'text-zinc-400'}`}>{t('jewelry')}</button>
              <button onClick={() => setCalcMode('currency')} className={`flex-1 py-4 rounded-2xl text-[12px] font-black uppercase transition-all duration-500 focus-visible:ring-2 focus-visible:ring-white/50 outline-none ${calcMode === 'currency' ? 'bg-[#22c55e] text-black' : 'text-zinc-400'}`}>{t('currency')}</button>
          </div>

          {calcMode === 'jewelry' ? (
            <div className="space-y-6">
              <div className="flex p-1 bg-black/40 rounded-[2rem] border border-white/5 mb-2">
                 <button onClick={() => setTradeMode('buy')} className={`flex-1 py-3 rounded-2xl text-[12px] font-black uppercase transition-all duration-300 focus-visible:ring-2 focus-visible:ring-white/50 outline-none ${tradeMode === 'buy' ? 'text-black' : 'text-zinc-400'}`} style={tradeMode === 'buy' ? { backgroundColor: '#22c55e' } : {}}>{t('purchase')}</button>
                 <button onClick={() => setTradeMode('sell')} className={`flex-1 py-3 rounded-2xl text-[12px] font-black uppercase transition-all duration-300 focus-visible:ring-2 focus-visible:ring-white/50 outline-none ${tradeMode === 'sell' ? 'text-black' : 'text-zinc-400'}`} style={tradeMode === 'sell' ? { backgroundColor: '#ef4444' } : {}}>{t('sellBack')}</button>
              </div>

              <div className="flex p-1 bg-white/5 rounded-2xl mb-8 border border-white/5 w-fit mx-auto gap-1">
                  {['gold', 'tejabi', 'silver'].map(metal => (<button key={metal} onClick={() => setActiveMetal(metal)} style={{ backgroundColor: activeMetal === metal ? (metal === 'gold' ? '#D4AF37' : metal === 'tejabi' ? '#CD7F32' : '#94a3b8') : 'transparent' }} className={`px-4 py-2.5 rounded-xl text-[11px] font-black uppercase transition-all focus-visible:ring-2 focus-visible:ring-white/50 outline-none ${activeMetal === metal ? 'text-black' : 'text-zinc-400'}`}>{t(metal === 'gold' ? 'gold24K' : metal === 'tejabi' ? 'gold22K' : 'silver')}</button>))}
              </div>
              <div className="mb-8 p-6 rounded-[2.2rem] border-2 flex items-center justify-between" style={{ borderColor: `${themeColor}80`, backgroundColor: `${themeColor}10` }}>
                <div className="flex items-center gap-4"><Coins className="w-8 h-8" style={{ color: themeColor }} /><p className="text-xl font-black uppercase text-white">{activeMetal === 'gold' ? t('gold24K') : activeMetal === 'tejabi' ? t('gold22K') : t('silver')}</p></div>
                <div className="text-right text-[12px] font-black text-zinc-400">{formatRS(priceData[priceData.length-1]?.[activeMetal === 'usd' ? 'gold' : activeMetal])}</div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {['tola', 'aana', 'lal'].map((unit) => (<div key={unit}><label className="text-[12px] font-black text-zinc-400 uppercase mb-2 block ml-3 tracking-[0.2em]">{t(unit)}</label>
                <input type="number" style={{ caretColor: themeColor }} className="w-full bg-black/60 border-2 border-zinc-800 px-2 py-5 rounded-3xl text-center font-black text-xl sm:text-2xl text-white outline-none focus:border-white/20" value={calc[unit]} onChange={(e) => setCalc({...calc, [unit]: e.target.value})} /></div>))}
              </div>

              {tradeMode === 'buy' && (
                <>
                  <input type="number" placeholder={t('makingCharges')} className="w-full bg-black/60 border-2 border-zinc-800 p-5 sm:p-6 rounded-3xl font-black text-base sm:text-lg outline-none text-white focus:border-white/20 animate-in fade-in slide-in-from-top-2" value={calc.making} onChange={(e) => setCalc({...calc, making: e.target.value})} />
                  <div className="flex items-center justify-between px-5 sm:px-6 py-4 bg-white/5 rounded-3xl border border-white/5">
                    <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">{t('includeVat')}</span>
                    <button
                      onClick={() => setCalc({...calc, vat: !calc.vat})}
                      role="switch"
                      aria-checked={calc.vat}
                      aria-label="Include 13% VAT"
                      className={`w-14 h-8 rounded-full transition-all relative focus-visible:ring-2 focus-visible:ring-white/50 outline-none ${calc.vat ? 'bg-green-500' : 'bg-zinc-700'}`}>
                      <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${calc.vat ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                </>
              )}

              <JewelryResult
                themeColor={themeColor}
                activeMetal={activeMetal}
                tradeMode={tradeMode}
                calc={calc}
                latestPrice={priceData[priceData.length-1]?.[activeMetal === 'usd' ? 'gold' : activeMetal] || 0}
                formatRS={formatRS}
              />
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-black/40 rounded-[3rem] p-7 border border-white/10 space-y-10">
                    <div className="flex items-start justify-between px-1">
                        <div className="flex-1 flex flex-col items-start gap-4">
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">{t('youSend')}</p>
                            <div className="flex flex-col items-center gap-1.5 w-fit">
                                <span className="text-4xl leading-none">{currCalc.isSwapped ? '🇳🇵' : CURRENCY_LIST.find(c => c.code === currCalc.source)?.flag}</span>
                                {currCalc.isSwapped ? <span className="text-[11px] font-black text-white mt-1">NPR</span> :
                                <select className="bg-transparent font-black text-[11px] text-white outline-none mt-1 text-center" value={currCalc.source} onChange={(e) => setCurrCalc({...currCalc, source: e.target.value})} aria-label="Select Source Currency">
                                    {CURRENCY_LIST.map(c => <option key={c.code} value={c.code} className="bg-zinc-900">{c.code}</option>)}
                                </select>}
                            </div>
                        </div>
                        <div className="px-4 pt-8">
                            <button
                              onClick={() => setCurrCalc({...currCalc, isSwapped: !currCalc.isSwapped})}
                              aria-label="Swap currencies"
                              className="p-4 bg-green-500/20 rounded-2xl active:rotate-180 focus-visible:ring-2 focus-visible:ring-green-500/50 outline-none transition-all border border-green-500/20 shadow-lg shadow-green-500/10">
                              <ArrowRightLeft className="w-5 h-5 text-green-500" />
                            </button>
                        </div>
                        <div className="flex-1 flex flex-col items-end gap-4 text-right">
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">{t('receiverGets')}</p>
                            <div className="flex flex-col items-center gap-1.5 w-fit ml-auto">
                                <span className="text-4xl leading-none">{!currCalc.isSwapped ? '🇳🇵' : CURRENCY_LIST.find(c => c.code === currCalc.source)?.flag}</span>
                                {!currCalc.isSwapped ? <span className="text-[11px] font-black text-white mt-1">NPR</span> :
                                <select className="bg-transparent font-black text-[11px] text-white outline-none mt-1 text-center" value={currCalc.source} onChange={(e) => setCurrCalc({...currCalc, source: e.target.value})} aria-label="Select Target Currency">
                                    {CURRENCY_LIST.map(c => <option key={c.code} value={c.code} className="bg-zinc-900">{c.code}</option>)}
                                </select>}
                            </div>
                        </div>
                    </div>
                    <div className="relative">
                        <input type="number" placeholder="Amount" className="w-full bg-black/60 border-2 border-zinc-800 p-6 sm:p-8 rounded-[2.5rem] font-black text-2xl sm:text-4xl outline-none focus:border-green-500 text-white text-center transition-all" value={currCalc.amount} onChange={(e) => setCurrCalc({...currCalc, amount: e.target.value})} />
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 opacity-20 hidden sm:block"><Globe className="w-8 h-8 text-[#22c55e]" /></div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-700 p-8 sm:p-12 rounded-[3.5rem] text-black text-center shadow-xl relative overflow-hidden group">
                   <div className="absolute top-4 right-6 text-7xl opacity-10 font-bold pointer-events-none">{currCalc.isSwapped ? CURRENCY_LIST.find(c => c.code === currCalc.source)?.flag : '🇳🇵'}</div>
                   <div className="flex flex-col items-center gap-2 mb-2 relative z-10">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-black/10 rounded-full border border-black/5">
                          <span className="text-[12px] font-black">{currCalc.isSwapped ? '🇳🇵 NPR' : `${CURRENCY_LIST.find(c => c.code === currCalc.source)?.flag} ${currCalc.source}`}</span>
                          <ArrowDown className="w-3 h-3 opacity-40" />
                          <span className="text-[12px] font-black bg-white/30 px-2 rounded-md">{currCalc.isSwapped ? `${CURRENCY_LIST.find(c => c.code === currCalc.source)?.flag} ${currCalc.source}` : '🇳🇵 NPR'}</span>
                      </div>
                      <p className="text-[11px] font-black uppercase tracking-[0.4em] opacity-60">{t('payoutEstimate')}</p>
                   </div>
                   <CurrencyResult
                    forexHistory={forexHistory}
                    currCalc={currCalc}
                    formatRS={formatRS}
                   />
                </div>
            </div>
          )}
        </div>
      </main>
    </div>
  ), [view, calcMode, tradeMode, activeMetal, calc, currCalc, priceData, forexHistory, themeColor, formatRS]);

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center text-[#D4AF37]">
      <RefreshCcw className="w-10 h-10 animate-spin" />
    </div>
  );

  return (
    <HelmetProvider>
      <div className="min-h-screen bg-[#020202] text-zinc-100 font-sans pb-40 overflow-x-hidden relative">
        <Helmet>
            <title>GoldView Nepal - Live Gold & Silver Prices in Nepal Today</title>
            <meta name="description" content="Official GoldView Nepal: Real-time 24K Gold, Silver and Forex rates in Nepal. Track your jewelry portfolio and calculate costs instantly." />
            <link rel="canonical" href="https://www.goldview.tech/"/>
            <meta name="robots" content="index, follow" />
            <script type="application/ld+json">{STRUCTURED_DATA}</script>
        </Helmet>

        <header className="px-4 sm:px-8 pt-12 sm:pt-16 flex justify-between items-end relative z-10">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full shadow-lg animate-pulse shrink-0" style={{ backgroundColor: themeColor, boxShadow: `0 0 10px ${themeColor}` }}></div>
              <p className="text-[12px] font-black uppercase tracking-[0.4em] transition-colors duration-500 truncate" style={{ color: themeColor }}>{t('marketUpdate')}</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <img src="/logo60.webp" alt="GoldView Logo" width="60" height="60" fetchpriority="high" className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl shadow-lg border border-white/10 shrink-0" />
              <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-white">GoldView</h1>
            </div>
          </div>
          <div className="flex gap-2 sm:gap-3 ml-2 shrink-0">
            <button
              onClick={() => setShowShareModal(true)}
              aria-label={t('share')}
              className="p-3 sm:p-4 bg-white/5 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white/10 active:scale-90 focus-visible:ring-2 focus-visible:ring-white/50 outline-none transition-all">
              <Share2 className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-400" />
            </button>
            <button
              onClick={handleNotificationRequest}
              aria-label="Enable notifications"
              className={`p-3 sm:p-4 bg-white/5 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white/10 active:scale-90 focus-visible:ring-2 focus-visible:ring-white/50 outline-none transition-all ${notifStatus === 'granted' ? 'border-[#D4AF37]/30' : ''}`}>
              <Bell className={`w-4 h-4 sm:w-5 sm:h-5 ${notifStatus === 'granted' ? 'text-[#D4AF37]' : 'text-zinc-400'}`} />
            </button>
            <button
              onClick={() => setShowMenu(!showMenu)}
              aria-label="Menu"
              className="p-3 sm:p-4 bg-white/5 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white/10 active:scale-90 focus-visible:ring-2 focus-visible:ring-white/50 outline-none transition-all">
              <Menu className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-400" />
            </button>
          </div>
        </header>

        {showMenu && (
          <div className="fixed inset-0 z-[110] animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMenu(false)} />
            <div className="absolute right-6 top-32 w-64 bg-[#121212] border border-white/10 rounded-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-top-4 duration-300">
              <div className="space-y-4">
                <button
                  onClick={() => { window.location.reload(); }}
                  className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all group">
                  <div className="flex items-center gap-3">
                    <RefreshCcw className="w-5 h-5 text-zinc-400 group-hover:rotate-180 transition-transform duration-500" />
                    <span className="text-sm font-bold text-white">{t('refresh')}</span>
                  </div>
                </button>
                <button
                  onClick={() => { setView('portfolio'); setShowMenu(false); }}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all group ${view === 'portfolio' ? 'bg-[#D4AF37]/20 border border-[#D4AF37]/30' : 'bg-white/5 hover:bg-white/10'}`}>
                  <div className="flex items-center gap-3">
                    <Coins className={`w-5 h-5 ${view === 'portfolio' ? 'text-[#D4AF37]' : 'text-zinc-400'}`} />
                    <span className={`text-sm font-bold ${view === 'portfolio' ? 'text-[#D4AF37]' : 'text-white'}`}>{t('myGold')}</span>
                  </div>
                </button>
                {!isStandalone && (
                  <div className="p-5 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-2xl space-y-3">
                    <p className="text-[12px] font-bold text-zinc-300 leading-tight">{t('addToHomeScreen')}</p>
                    <button
                      onClick={() => { setShowGuide(true); setShowMenu(false); }}
                      className="w-full py-2.5 bg-[#D4AF37] text-black text-[12px] font-black uppercase rounded-xl active:scale-95 transition-all">
                      {t('howTo')}
                    </button>
                  </div>
                )}
                <div className="p-4 bg-white/5 rounded-2xl space-y-3">
                  <div className="flex items-center gap-3 mb-1">
                    <Languages className="w-5 h-5 text-zinc-400" />
                    <span className="text-sm font-bold text-white">{t('language')}</span>
                  </div>
                  <div className="flex p-1 bg-black/40 rounded-xl border border-white/5">
                    <button
                      onClick={() => { setLang('en'); localStorage.setItem('gv_lang', 'en'); window.location.reload(); }}
                      className={`flex-1 py-2 rounded-lg text-[12px] font-black uppercase transition-all ${lang === 'en' ? 'bg-[#D4AF37] text-black' : 'text-zinc-400'}`}>EN</button>
                    <button
                      onClick={() => { setLang('ne'); localStorage.setItem('gv_lang', 'ne'); window.location.reload(); }}
                      className={`flex-1 py-2 rounded-lg text-[12px] font-black uppercase transition-all ${lang === 'ne' ? 'bg-[#D4AF37] text-black' : 'text-zinc-400'}`}>नेपाली</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {dashboardView}
        {calculatorView}
        {portfolioView}

        <div
          ref={shareCardRef}
          id="share-card-capture"
          style={{ width: `${SHARE_CARD_WIDTH}px`, height: `${SHARE_CARD_HEIGHT}px` }}
          className="fixed -left-[2000px] top-0 bg-black border-[12px] border-[#D4AF37]/20 rounded-none p-10 flex flex-col justify-between overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/15 to-transparent" />
          <div className="relative z-10">
            <div className="mb-10 text-center">
              <h2 className="text-6xl font-black tracking-tighter text-white">GoldView</h2>
              <p className="text-[#D4AF37] text-sm font-black tracking-[0.5em] uppercase mt-2">NEPALI RATES</p>
            </div>

            <div className="space-y-6 px-4">
               {['gold', 'tejabi', 'silver'].map(m => (
                 <div key={m} className="flex justify-between items-center border-b border-white/10 pb-4 gap-4">
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                       <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">{t(m === 'gold' ? 'gold24K' : m === 'tejabi' ? 'gold22K' : 'silver')}</p>
                       <p className="text-[10px] font-bold text-zinc-600">{t('perTola')}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                       <p className="text-4xl font-black text-white whitespace-nowrap">{formatRS(priceData[priceData.length-1]?.[m])}</p>
                       <p className={`text-[12px] font-black mt-0.5 ${allDiffs[m].isUp ? 'text-green-400' : 'text-red-400'}`}>{allDiffs[m].val}</p>
                    </div>
                 </div>
               ))}
            </div>
          </div>

          <div className="relative z-10 flex justify-between items-end border-t border-white/10 pt-6">
             <div>
               <p className="text-[12px] font-black text-zinc-400 uppercase mb-2">{new Date().toLocaleDateString(lang === 'ne' ? 'ne-NP' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
               <p className="text-[11px] font-black text-[#D4AF37] tracking-[0.4em] uppercase">WWW.GOLDVIEW.TECH</p>
             </div>
             <div className="w-16 h-16 bg-[#D4AF37]/20 flex items-center justify-center border border-[#D4AF37]/30">
                <TrendingUp className="w-8 h-8 text-[#D4AF37]" />
             </div>
          </div>
        </div>

        {showShareModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setShowShareModal(false)} />
            <div className="max-w-[400px] w-full space-y-8 relative z-10">
               <div className="aspect-square bg-black border-[8px] border-[#D4AF37]/20 rounded-none p-8 flex flex-col justify-between relative overflow-hidden shadow-2xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/15 to-transparent" />
                  <div className="relative z-10">
                    <div className="mb-8 text-center">
                      <h2 className="text-4xl font-black tracking-tighter text-white">GoldView</h2>
                      <p className="text-[#D4AF37] text-[10px] font-black tracking-[0.4em] uppercase mt-1">NEPALI RATES</p>
                    </div>

                    <div className="space-y-6">
                       {['gold', 'tejabi', 'silver'].map(m => (
                         <div key={m} className="flex justify-between items-center border-b border-white/10 pb-4">
                            <div className="flex flex-col">
                               <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t(m === 'gold' ? 'gold24K' : m === 'tejabi' ? 'gold22K' : 'silver')}</p>
                            </div>
                            <div className="text-right">
                               <p className="text-2xl font-black text-white">{formatRS(priceData[priceData.length-1]?.[m])}</p>
                            </div>
                         </div>
                       ))}
                    </div>
                  </div>

                  <div className="relative z-10 flex justify-between items-end border-t border-white/10 pt-6">
                     <p className="text-[9px] font-black text-[#D4AF37] tracking-[0.3em] uppercase">WWW.GOLDVIEW.TECH</p>
                     <TrendingUp className="w-5 h-5 text-[#D4AF37]" />
                  </div>
               </div>

               <div className="flex flex-col gap-3 px-4 sm:px-0">
                 <button
                  onClick={handleShare}
                  disabled={isGenerating}
                  className="w-full py-6 bg-[#D4AF37] text-black font-black rounded-[2rem] active:scale-95 transition-all shadow-xl shadow-[#D4AF37]/20 flex items-center justify-center gap-3">
                   {isGenerating ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                   {isGenerating ? t('generating') : t('downloadImage')}
                 </button>
                 <button onClick={() => setShowShareModal(false)} className="w-full py-6 bg-white/5 text-white font-black rounded-[2rem] border border-white/10">{t('cancel')}</button>
               </div>
            </div>
          </div>
        )}

        {(showIOSGuide || showGuide) && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => { setShowIOSGuide(false); setShowGuide(false); }} />
            <div className="bg-[#121212] border border-white/10 rounded-[3rem] p-8 max-w-sm w-full shadow-2xl space-y-6 text-center relative z-10">
              <div className="w-20 h-20 bg-[#D4AF37]/10 rounded-[2rem] flex items-center justify-center mx-auto border border-[#D4AF37]/20">
                {showIOSGuide ? <Bell className="w-10 h-10 text-[#D4AF37]" /> : (isIOS ? <Share2 className="w-10 h-10 text-[#D4AF37]" /> : <Download className="w-10 h-10 text-[#D4AF37]" />)}
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white tracking-tight">{showIOSGuide ? t('enableAlertsIOS') : t('installGoldView')}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  {showIOSGuide ? t('iosNotifDescription') :
                   (isIOS ? t('iosInstallDescription') : t('androidInstallDescription'))}
                </p>
              </div>
              <div className="space-y-4 text-left bg-white/5 p-6 rounded-3xl border border-white/5">
                {isIOS ? (
                  <>
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-black">1</div>
                      <p className="text-xs text-zinc-300 font-bold">{t('iosStep1Detail')} <span className="text-blue-400">{t('shareIcon')}</span> {t('iconInSafari')}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-black">2</div>
                      <p className="text-xs text-zinc-300 font-bold">{t('iosStep2')} <span className="text-white">"{t('addToHomeScreenOption')}"</span></p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-black">1</div>
                      <p className="text-xs text-zinc-300 font-bold">{t('androidStep1')} <span className="text-white">{t('threeDotsMenu')}</span> {t('menuInChrome')}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-black">2</div>
                      <p className="text-xs text-zinc-300 font-bold">{t('androidStep2')} <span className="text-white">"{t('installAppOption')}"</span> {t('orOption')} <span className="text-white">"{t('addToHomeScreenOption')}"</span></p>
                    </div>
                  </>
                )}
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-black">3</div>
                  <p className="text-xs text-zinc-300 font-bold">{t('step3')}</p>
                </div>
              </div>
              <button onClick={() => { setShowIOSGuide(false); setShowGuide(false); }} className="w-full py-5 bg-[#D4AF37] text-black font-black rounded-3xl active:scale-95 transition-all shadow-lg shadow-[#D4AF37]/20">{t('gotIt')}</button>
            </div>
          </div>
        )}

        <nav className="fixed bottom-12 left-10 right-10 h-20 bg-zinc-900/60 backdrop-blur-[50px] rounded-[3rem] border border-white/10 flex justify-around items-center px-4 z-50 shadow-2xl">
          <button onClick={() => setView('dashboard')} className={`flex flex-col items-center gap-1.5 px-12 py-3.5 rounded-[2.2rem] transition-all duration-300 focus-visible:ring-2 focus-visible:ring-white/50 outline-none ${view === 'dashboard' ? 'text-black shadow-lg shadow-white/5' : 'text-zinc-400'}`} style={view === 'dashboard' ? { backgroundColor: themeColor, boxShadow: `0 0 40px ${themeColor}40` } : {}}>
            <LayoutDashboard className={`w-6 h-6 ${view === 'dashboard' ? 'fill-black' : ''}`} />
            <span className="text-[11px] font-black uppercase tracking-widest">{t('dashboard')}</span>
          </button>
          <button onClick={() => { setView('calculator'); if(activeMetal === 'usd') setActiveMetal('gold'); }} className={`flex flex-col items-center gap-1.5 px-12 py-3.5 rounded-[2.2rem] transition-all duration-300 focus-visible:ring-2 focus-visible:ring-white/50 outline-none ${view === 'calculator' ? 'text-black shadow-lg shadow-white/5' : 'text-zinc-400'}`} style={view === 'calculator' ? { backgroundColor: themeColor, boxShadow: `0 0 40px ${themeColor}40` } : {}}>
            <Calculator className={`w-6 h-6 ${view === 'calculator' ? 'fill-black' : ''}`} />
            <span className="text-[11px] font-black uppercase tracking-widest">{t('calculator')}</span>
          </button>
        </nav>

        <footer className="mt-12 px-8 pb-12 text-zinc-500 text-[10px] leading-relaxed border-t border-white/5 pt-10">
          <h2 className="text-zinc-400 font-black mb-2 uppercase tracking-widest">GoldView Nepal - Live Gold & Silver Prices</h2>
          <p>GoldView provides real-time updates for <strong>24K Chhapawal Gold</strong>, <strong>22K Tejabi Gold</strong> and <strong>Pure Silver</strong> rates in Nepal.</p>
          <div className="mt-12 text-center">
            <p className="font-black uppercase tracking-[0.3em] text-zinc-400">Made by @Timeswantstocode</p>
          </div>
        </footer>

        <Analytics />
        <SpeedInsights />
      </div>
    </HelmetProvider>
  );
}
