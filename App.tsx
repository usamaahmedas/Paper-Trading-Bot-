import React, { useState, useEffect, useRef } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  ShieldCheck, 
  Terminal, 
  History, 
  Play, 
  BrainCircuit,
  Bell,
  Wallet,
  Eye,
  EyeOff,
  Star,
  ChevronRight,
  TrendingUp as TrendingUpIcon,
  Gauge,
  Newspaper,
  Download
} from 'lucide-react';
import { createChart, ColorType, LineStyle, CandlestickSeries, LineSeries } from 'lightweight-charts';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function resolveUrl(urlStr: string): string {
  if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) {
    return urlStr;
  }
  return urlStr;
}

function safeFormatDate(val: any, formatStr: string = 'HH:mm:ss'): string {
  if (val === undefined || val === null || val === '') return 'N/A';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) {
      return 'N/A';
    }
    return format(d, formatStr);
  } catch (e) {
    return 'N/A';
  }
}

interface NewsHeadline {
  title: string;
  source: string;
  url: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

interface SentimentData {
  fearGreedIndex: number;
  fearGreedClass: string;
  socialSentimentScore: number;
  overallVerdict: string;
  newsHeadlines: NewsHeadline[];
  lastUpdated: number;
}

interface SignalData {
  price: number;
  rsi: number;
  ema200: number;
  score: number;
  reasons: string[];
  aiAnalysis: string;
  sentiment?: SentimentData;
}

interface TradingStatus {
  balance: number;
  currentPosition: any;
  trades: any[];
  adjustedTradeSizePct?: number;
  telegramStatus?: string;
  telegramError?: string;
  telegramToken?: string | null;
  telegramChatId?: string | null;
  debugLogs?: any[];
  currentLeverage?: number;
  currentRiskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  currentRiskReason?: string;
  effectiveStopLossPct?: number;
  maxAllowedLossUSDT?: number;
}

const ChartIndicators = ({ data, indicators }: { data: any[], indicators: any }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#1A1A1A',
      },
      grid: {
        vertLines: { color: 'rgba(26, 26, 26, 0.05)' },
        horzLines: { color: 'rgba(26, 26, 26, 0.05)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 350,
      timeScale: { borderColor: 'rgba(26, 26, 26, 0.1)' }
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    candleSeries.setData(data);

    if (indicators.ema) {
      const emaSeries = chart.addSeries(LineSeries, {
        color: '#3b82f6',
        lineWidth: 2,
        title: 'EMA 50',
      });
      emaSeries.setData(data.map(d => ({ time: d.time, value: d.ema50 })).filter(d => d.value !== null));
    }

    if (indicators.supertrend) {
       const upTrend = chart.addSeries(LineSeries, { color: '#10b981', lineWidth: 3, title: 'ST UP' });
       const downTrend = chart.addSeries(LineSeries, { color: '#ef4444', lineWidth: 3, title: 'ST DOWN' });
       
       upTrend.setData(data.map(d => ({ time: d.time, value: d.direction === 1 ? d.supertrend : null })).filter(d => d.value !== null));
       downTrend.setData(data.map(d => ({ time: d.time, value: d.direction === -1 ? d.supertrend : null })).filter(d => d.value !== null));
    }

    chart.timeScale().fitContent();

    let rsiChart: any = null;
    if (indicators.rsi && rsiContainerRef.current) {
      rsiChart = createChart(rsiContainerRef.current, {
        layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#1A1A1A' },
        grid: { vertLines: { visible: false }, horzLines: { color: 'rgba(26, 26, 26, 0.05)' } },
        width: rsiContainerRef.current.clientWidth,
        height: 80,
        timeScale: { visible: false }
      });

      const rsiLine = rsiChart.addSeries(LineSeries, { color: '#ff4400', lineWidth: 2 });
      rsiLine.setData(data.map(d => ({ time: d.time, value: d.rsi })).filter(d => d.value !== null));
      
      const upper = rsiChart.addSeries(LineSeries, { color: 'rgba(26,26,26,0.1)', lineWidth: 1, lineStyle: LineStyle.Dashed });
      upper.setData(data.map(d => ({ time: d.time, value: 70 })));
      const lower = rsiChart.addSeries(LineSeries, { color: 'rgba(26,26,26,0.1)', lineWidth: 1, lineStyle: LineStyle.Dashed });
      lower.setData(data.map(d => ({ time: d.time, value: 30 })));
      
      rsiChart.timeScale().fitContent();
    }

    const handleResize = () => {
      const width = chartContainerRef.current?.clientWidth || 0;
      chart.applyOptions({ width });
      if (rsiChart) rsiChart.applyOptions({ width });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      if (rsiChart) rsiChart.remove();
    };
  }, [data, indicators]);

  return (
    <div className="flex flex-col h-full">
      <div ref={chartContainerRef} className="flex-1" />
      {indicators.rsi && <div ref={rsiContainerRef} className="border-t border-[#1A1A1A]/5 mt-2 pt-2" />}
    </div>
  );
};

export default function App() {
  const [signals, setSignals] = useState<SignalData | null>(null);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [prevPrice, setPrevPrice] = useState<number | null>(null);
  const [tickerData, setTickerData] = useState<any>(null);
  const [status, setStatus] = useState<TradingStatus>({ balance: 10000, currentPosition: null, trades: [] });
  const [activeTab, setActiveTab] = useState<'ledger' | 'diagnostics'>('ledger');
  const [backtest, setBacktest] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [indicators, setIndicators] = useState({
    ema: true,
    supertrend: true,
    rsi: true
  });

  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [alertForm, setAlertForm] = useState({ price: '', direction: 'UP' });
  const [config, setConfig] = useState<any>({ 
    stopLossPct: 1.5, 
    takeProfitPct: 3.0, 
    tradeSizePct: 2.0,
    isAutoTradingEnabled: true,
    enableShorts: true,
    buyThreshold: 75,
    sellThreshold: 25,
    shortEntryThreshold: 25,
    shortExitThreshold: 75,
    cooldownMinutes: 15,
    trailingStopPct: 1.0,
    sizingMode: 'fixed',
    baseBalance: 10000.0,
    volatilityRefPct: 1.5,
    sizingMinPct: 0.5,
    sizingMaxPct: 10.0,
    leverage: 1,
    feePct: 0.05,
  });

  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', content: string}[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [showHeadlineModal, setShowHeadlineModal] = useState(false);

  const [resetState, setResetState] = useState({ active: false, password: '', error: '' });

  const handleResetLedger = async () => {
    try {
      const res = await fetch(resolveUrl('/api/trading/ledger/reset'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetState.password })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Server error resetting ledger');
      }
      const data = await res.json();
      setStatus(prev => ({ ...prev, balance: data.balance, trades: data.trades }));
      setResetState({ active: false, password: '', error: '' });
    } catch (err: any) {
      setResetState(prev => ({ ...prev, error: err.message || 'Error occurred during reset' }));
    }
  };

  const handleExportCSV = () => {
    if (!status.trades || status.trades.length === 0) return;

    // Rich quantitative headers representing professional trade audits
    const headers = [
      'Trade ID', 
      'Symbol', 
      'Direction', 
      'Leverage Used', 
      'Position Size (USDT)', 
      'Date Opened', 
      'Date Closed', 
      'Entry Price ($)', 
      'Exit Price ($)', 
      'Stop Loss ($)', 
      'Take Profit ($)', 
      'Exit Reason', 
      'Gross PnL ($)', 
      'Net PnL ($)', 
      'Running Balance ($)'
    ];

    const rows = status.trades.map((t, index) => {
      const id = t.id || `TX_${index + 1}`;
      const symbol = t.symbol || 'BTCUSDT';
      const direction = t.direction || t.type || 'N/A';
      const leverage = t.leverageUsed !== undefined ? t.leverageUsed : '1';
      const posSize = t.positionSize !== undefined ? t.positionSize.toFixed(2) : (t.amount !== undefined && t.entryPrice !== undefined ? (t.amount * t.entryPrice).toFixed(2) : '0.00');
      const dateOpened = t.dateOpened ? t.dateOpened : safeFormatDate(t.timestamp, 'yyyy-MM-dd HH:mm:ss');
      const dateClosed = t.dateClosed ? t.dateClosed : safeFormatDate(t.timestamp, 'yyyy-MM-dd HH:mm:ss');
      const entryPrice = t.entryPrice !== undefined ? t.entryPrice.toFixed(2) : '0.00';
      const exitPrice = t.exitPrice !== undefined && t.exitPrice !== null ? t.exitPrice.toFixed(2) : '--';
      const stopLoss = t.stopLoss !== undefined ? t.stopLoss.toFixed(2) : '--';
      const takeProfit = t.takeProfit !== undefined ? t.takeProfit.toFixed(2) : '--';
      const exitReason = t.exitReason || 'Signal';
      const grossPnl = t.grossPnl !== undefined ? t.grossPnl.toFixed(2) : (t.pnl || 0).toFixed(2);
      const netPnl = t.netPnl !== undefined ? t.netPnl.toFixed(2) : (t.pnl || 0).toFixed(2);
      const runningBalance = t.runningBalance !== undefined ? t.runningBalance.toFixed(2) : '--';

      return [
        id,
        symbol,
        direction,
        leverage,
        posSize,
        dateOpened,
        dateClosed,
        entryPrice,
        exitPrice,
        stopLoss,
        takeProfit,
        exitReason,
        grossPnl,
        netPnl,
        runningBalance
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `alphatrade_execution_ledger_${safeFormatDate(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const askAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    
    const msg = chatMessage;
    setChatMessage('');
    setChatHistory(prev => [...prev, { role: 'user', content: msg }]);
    setIsChatLoading(true);
    
    try {
      const res = await fetch(resolveUrl('/api/ai/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg })
      });
      const data = await res.json();
      setChatHistory(prev => [...prev, { role: 'ai', content: data.response }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'ai', content: "SYSTEM_ERROR: Neural feedback loop detected." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch(resolveUrl('/api/trading/config'));
      const data = await res.json();
      setConfig(data);
    } catch (err) {
      console.error('Config error:', err);
    }
  };

  const updateConfig = async (newConfig: any) => {
    try {
      const res = await fetch(resolveUrl('/api/trading/config'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      const data = await res.json();
      setConfig(data);
    } catch (err) {
      console.error('Update config error:', err);
    }
  };

  const fetchAlerts = async () => {
    try {
      const res = await fetch(resolveUrl('/api/trading/alerts'));
      const data = await res.json();
      setAlerts(data);
    } catch (err) {
      console.error('Alerts error:', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch(resolveUrl('/api/trading/notifications'));
      const data = await res.json();
      setNotifications(data);
    } catch (err) {
      console.error('Notifications error:', err);
    }
  };

  const createAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertForm.price) return;
    try {
      await fetch(resolveUrl('/api/trading/alerts'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertForm)
      });
      setAlertForm({ price: '', direction: 'UP' });
      fetchAlerts();
    } catch (err) {
      console.error('Failed to create alert');
    }
  };

  const deleteAlert = async (id: string) => {
    try {
      await fetch(resolveUrl(`/api/trading/alerts/${id}`), { method: 'DELETE' });
      fetchAlerts();
    } catch (err) {
      console.error('Failed to delete alert');
    }
  };

  const markNotificationsRead = async () => {
    try {
      await fetch(resolveUrl('/api/trading/notifications/read'), { method: 'POST' });
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark read');
    }
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch(resolveUrl('/api/trading/status'));
      if (!res.ok) throw new Error(`Status error: ${res.status}`);
      const data = await res.json();
      if (data && typeof data === 'object') {
        setStatus({
          balance: typeof data.balance === 'number' ? data.balance : 10000,
          currentPosition: data.currentPosition || null,
          trades: Array.isArray(data.trades) ? data.trades : [],
          adjustedTradeSizePct: data.adjustedTradeSizePct,
          telegramStatus: data.telegramStatus,
          telegramError: data.telegramError,
          telegramToken: data.telegramToken,
          telegramChatId: data.telegramChatId,
          debugLogs: data.debugLogs,
          currentLeverage: data.currentLeverage,
          currentRiskLevel: data.currentRiskLevel,
          currentRiskReason: data.currentRiskReason,
          effectiveStopLossPct: data.effectiveStopLossPct,
          maxAllowedLossUSDT: data.maxAllowedLossUSDT
        });
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    }
  };

  const fetchSignals = async () => {
    try {
      const res = await fetch(resolveUrl('/api/trading/signals'));
      if (!res.ok) throw new Error(`Signals error: ${res.status}`);
      const data = await res.json();
      setSignals(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(resolveUrl('/api/trading/history'));
      if (!res.ok) throw new Error(`History error: ${res.status}`);
      const data = await res.json();
      setHistory(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    }
  };

  const runBacktest = async () => {
    setLoading(true);
    try {
      const res = await fetch(resolveUrl('/api/trading/backtest'));
      const data = await res.json();
      setBacktest(data);
    } finally {
      setLoading(false);
    }
  };

  const executeTrade = async (type: 'LONG' | 'SHORT' | 'EXIT') => {
    if (currentPrice === 0) return;
    const price = currentPrice;
    await fetch(resolveUrl('/api/trading/execute'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, price })
    });
    fetchStatus();
  };

  useEffect(() => {
    fetchStatus();
    fetchSignals();
    fetchHistory();
    fetchAlerts();
    fetchNotifications();
    fetchConfig();
    const interval = setInterval(() => {
      fetchSignals();
      fetchStatus();
      fetchHistory();
      fetchAlerts();
      fetchNotifications();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@ticker');
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const newPrice = parseFloat(data.c);
      setTickerData(data);
      setLivePrice(current => {
        if (current !== newPrice) {
          setPrevPrice(current);
        }
        return newPrice;
      });
    };

    ws.onerror = (err) => console.error('WS Error:', err);
    
    return () => ws.close();
  }, []);

  const toggleIndicator = (key: keyof typeof indicators) => {
    setIndicators(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const currentPrice = livePrice || signals?.price || 0;

  const unrealizedPnL = status.currentPosition && currentPrice 
    ? (currentPrice - status.currentPosition.entryPrice) * status.currentPosition.amount 
    : 0;
  const pnlPercentage = status.currentPosition && currentPrice && status.currentPosition.entryPrice !== 0
    ? ((currentPrice - status.currentPosition.entryPrice) / status.currentPosition.entryPrice) * 100
    : 0;

  const completedTrades = status.trades || [];
  const totalTradesCount = completedTrades.length;
  const netPnLTotal = completedTrades.reduce((acc, t) => acc + (t.netPnl !== undefined ? t.netPnl : (t.pnl || 0)), 0);
  const winRatePercent = totalTradesCount > 0 
    ? (completedTrades.filter(t => (t.netPnl !== undefined ? t.netPnl : (t.pnl || 0)) > 0).length / totalTradesCount) * 100 
    : 0;

  // Best & Worst Trade calculation
  let bestTrade = 0;
  let worstTrade = 0;
  completedTrades.forEach(t => {
    const val = t.netPnl !== undefined ? t.netPnl : (t.pnl || 0);
    if (val > bestTrade) bestTrade = val;
    if (val < worstTrade) worstTrade = val;
  });

  // Average Win vs Average Loss calculation
  const winsArray = completedTrades.map(t => t.netPnl !== undefined ? t.netPnl : (t.pnl || 0)).filter(p => p > 0);
  const lossesArray = completedTrades.map(t => t.netPnl !== undefined ? t.netPnl : (t.pnl || 0)).filter(p => p < 0);
  const avgWin = winsArray.length > 0 ? winsArray.reduce((acc, w) => acc + w, 0) / winsArray.length : 0;
  const avgLoss = lossesArray.length > 0 ? lossesArray.reduce((acc, l) => acc + l, 0) / lossesArray.length : 0;

  // Consecutive Wins & Losses streaks
  let maxConsecutiveWins = 0;
  let maxConsecutiveLosses = 0;
  let currentConsecWins = 0;
  let currentConsecLosses = 0;

  completedTrades.forEach(t => {
    const val = t.netPnl !== undefined ? t.netPnl : (t.pnl || 0);
    if (val > 0) {
      currentConsecWins++;
      currentConsecLosses = 0;
      if (currentConsecWins > maxConsecutiveWins) maxConsecutiveWins = currentConsecWins;
    } else if (val < 0) {
      currentConsecLosses++;
      currentConsecWins = 0;
      if (currentConsecLosses > maxConsecutiveLosses) maxConsecutiveLosses = currentConsecLosses;
    }
  });

  // Backward compatibility variables
  const totalRealizedPnL = netPnLTotal;
  const winRate = winRatePercent;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] font-sans border-8 border-[#1A1A1A]">
      {/* Navigation / Header */}
      <header id="main-header" className="p-8 flex justify-between items-end border-b-2 border-[#1A1A1A]">
        <div>
          <p className="text-xs uppercase tracking-widest font-black mb-1 opacity-60">System Protocol // 001</p>
          <h1 className="text-7xl font-black tracking-tighter leading-none uppercase flex items-center gap-4">
            AlphaTrade<span className="text-[#FF4400]">.Qty</span>
            <div className="relative group ml-4">
              <button 
                onClick={markNotificationsRead}
                className={cn(
                  "p-2 border-2 border-[#1A1A1A] transition-all hover:bg-[#1A1A1A] hover:text-white",
                  unreadCount > 0 && "bg-[#FF4400] text-white animate-pulse"
                )}>
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-black text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-[#F5F2ED] font-black">
                    {unreadCount}
                  </span>
                )}
              </button>
              
              {/* Notifications Dropdown */}
              <div className="absolute top-full left-0 mt-2 w-80 bg-white border-2 border-[#1A1A1A] shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] z-50 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all p-4">
                <p className="text-[10px] uppercase font-black border-b-2 border-[#1A1A1A] pb-2 mb-2">Protocol Notifications</p>
                <div className="max-h-60 overflow-y-auto space-y-2 thin-scrollbar">
                  {notifications.map(n => (
                    <div key={n.id} className={cn("p-2 border border-[#1A1A1A]/10 text-[10px] leading-tight", !n.read && "bg-orange-50 font-bold")}>
                      <p>{n.message}</p>
                      <p className="text-[8px] opacity-40 mt-1">{safeFormatDate(n.timestamp, 'HH:mm:ss')}</p>
                    </div>
                  ))}
                  {notifications.length === 0 && <p className="text-[10px] opacity-40 italic text-center py-4">Logs Clear</p>}
                </div>
              </div>
            </div>
          </h1>
        </div>
        <div className="text-right hidden md:block">
          <p className="text-xs uppercase tracking-widest font-black mb-1 opacity-60">Active Pair</p>
          <p className="text-4xl font-serif italic">BTC / USDT</p>
        </div>
      </header>

      <main id="main-content" className="max-w-full grid grid-cols-12 gap-0 border-b-2 border-[#1A1A1A]">
        
        {/* Left Section: Account & Stats */}
        <section id="account-stats" className="col-span-12 lg:col-span-3 border-b-2 lg:border-b-0 lg:border-r-2 border-[#1A1A1A] p-8 flex flex-col justify-between bg-white/30">
          <div>
            <div className="mb-12">
              <p className="text-xs uppercase tracking-widest font-black opacity-40 mb-4">Account Liquidity</p>
              <div className="flex items-baseline gap-2">
                <p className="text-6xl font-serif leading-none italic">
                  ${status?.balance !== undefined && status?.balance !== null ? status.balance.toLocaleString() : "10,000"}
                </p>
                <p className="text-2xl font-sans font-bold">.00</p>
              </div>

              {status.currentPosition && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "mt-4 p-3 border-2 border-[#1A1A1A] bg-white flex justify-between items-center",
                    unrealizedPnL >= 0 ? "text-emerald-600" : "text-[#FF4400]"
                  )}>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase opacity-60">Unrealized PnL</span>
                    <motion.span 
                      key={`pnl-${unrealizedPnL}`}
                      animate={{ 
                        opacity: [1, 0.25, 0.95, 0.4, 1],
                        scale: [1, 1.02, 0.99, 1.01, 1] 
                      }}
                      transition={{ 
                        duration: 0.25, 
                        times: [0, 0.2, 0.4, 0.7, 1],
                        ease: "easeInOut" 
                      }}
                      className="font-mono font-bold text-lg block origin-left"
                    >
                      {unrealizedPnL >= 0 ? '+' : ''}${unrealizedPnL.toFixed(2)}
                    </motion.span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black uppercase opacity-60">Yield</span>
                    <motion.span 
                      key={`yield-${pnlPercentage}`}
                      animate={{ 
                        opacity: [1, 0.25, 0.95, 0.4, 1],
                        scale: [1, 1.02, 0.99, 1.01, 1] 
                      }}
                      transition={{ 
                        duration: 0.25, 
                        times: [0, 0.2, 0.4, 0.7, 1],
                        ease: "easeInOut" 
                      }}
                      className="font-mono font-bold block origin-right"
                    >
                      {pnlPercentage >= 0 ? '+' : ''}{pnlPercentage.toFixed(2)}%
                    </motion.span>
                  </div>
                </motion.div>
              )}
              
              <p className="text-sm mt-3 text-[#FF4400] font-mono font-bold tracking-tighter">
                PAPER TRADING ACTIVE // {status.currentPosition ? 'POSITION OPEN' : 'LISTENING'}
              </p>
            </div>

            <div className="space-y-6 pt-8 border-t-2 border-[#1A1A1A]/10">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-black tracking-widest">Signal Score</span>
                <span className="font-mono border-b-2 border-[#1A1A1A] px-2 font-bold text-xl">{signals?.score}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-black tracking-widest text-[#FF4400]">RSI Index</span>
                <span className="font-mono border-b-2 border-[#1A1A1A] px-2 font-bold">{signals?.rsi?.toFixed(1) || '0.0'}</span>
              </div>
              
              <div className="pt-4 border-t border-[#1A1A1A]/10">
                <p className="text-[10px] uppercase font-black opacity-40 mb-3">Indicator Toggle</p>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => toggleIndicator('ema')}
                    className={cn(
                      "px-2 py-1 text-[10px] font-black uppercase tracking-tighter border-2 transition-all flex items-center gap-1",
                      indicators.ema ? "bg-[#1A1A1A] text-white border-[#1A1A1A]" : "bg-transparent text-[#1A1A1A] border-[#1A1A1A]"
                    )}>
                    {indicators.ema ? <Eye className="w-3 h-3"/> : <EyeOff className="w-3 h-3"/>} EMA 50
                  </button>
                  <button 
                    onClick={() => toggleIndicator('supertrend')}
                    className={cn(
                      "px-2 py-1 text-[10px] font-black uppercase tracking-tighter border-2 transition-all flex items-center gap-1",
                      indicators.supertrend ? "bg-[#1A1A1A] text-white border-[#1A1A1A]" : "bg-transparent text-[#1A1A1A] border-[#1A1A1A]"
                    )}>
                    {indicators.supertrend ? <Eye className="w-3 h-3"/> : <EyeOff className="w-3 h-3"/>} Supertrend
                  </button>
                  <button 
                    onClick={() => toggleIndicator('rsi')}
                    className={cn(
                      "px-2 py-1 text-[10px] font-black uppercase tracking-tighter border-2 transition-all flex items-center gap-1",
                      indicators.rsi ? "bg-[#1A1A1A] text-white border-[#1A1A1A]" : "bg-transparent text-[#1A1A1A] border-[#1A1A1A]"
                    )}>
                    {indicators.rsi ? <Eye className="w-3 h-3"/> : <EyeOff className="w-3 h-3"/>} RSI
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#1A1A1A]/10 mt-8">
            <p className="text-[10px] uppercase font-black opacity-40 mb-3 uppercase tracking-widest">Active Surveillance</p>
            <div className="max-h-[150px] overflow-y-auto space-y-2 thin-scrollbar mb-4">
              {alerts.filter(a => a.status === 'PENDING').map(alert => (
                <div key={alert.id} className="p-2 border border-[#1A1A1A] bg-white/40 flex justify-between items-center group">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase opacity-60">Price {alert.direction}</span>
                    <span className="text-xs font-mono font-bold">${alert.targetPrice.toLocaleString()}</span>
                  </div>
                  <button 
                    onClick={() => deleteAlert(alert.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[#FF4400] hover:text-white border border-[#1A1A1A]">
                    <EyeOff className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {alerts.filter(a => a.status === 'PENDING').length === 0 && (
                <p className="text-[10px] opacity-40 italic py-4 text-center border-2 border-dashed border-[#1A1A1A]/10">No Active Alerts</p>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-[#1A1A1A]/10 mt-auto">
            <p className="text-[10px] uppercase font-black opacity-40 mb-3 tracking-widest">Active System Ledger Summary</p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="p-2.5 border-2 border-[#1A1A1A] bg-white/50 flex flex-col justify-between">
                <span className="text-[8px] uppercase font-black opacity-50 block leading-tight">Total PnL (Net)</span>
                <span className={cn("font-mono text-sm font-bold", netPnLTotal >= 0 ? "text-emerald-600" : "text-[#FF4400]")}>
                  {netPnLTotal >= 0 ? '+' : ''}${netPnLTotal.toFixed(2)}
                </span>
              </div>
              <div className="p-2.5 border-2 border-[#1A1A1A] bg-white/50 flex flex-col justify-between">
                <span className="text-[8px] uppercase font-black opacity-50 block leading-tight">Win Rate</span>
                <span className="font-mono text-sm font-bold text-[#1A1A1A]">
                  {winRatePercent.toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2 border border-[#1A1A1A]/40 bg-white/30 flex flex-col justify-between">
                <span className="text-[7px] uppercase font-black opacity-55 leading-tight">Total Trades</span>
                <span className="font-mono text-[11px] font-bold">{totalTradesCount}</span>
              </div>
              <div className="p-2 border border-[#1A1A1A]/40 bg-white/30 flex flex-col justify-between">
                <span className="text-[7px] uppercase font-black opacity-55 leading-tight">Best Trade</span>
                <span className="font-mono text-[11px] text-emerald-600 font-bold">{bestTrade > 0 ? `+$${bestTrade.toFixed(1)}` : '--'}</span>
              </div>
              <div className="p-2 border border-[#1A1A1A]/40 bg-white/30 flex flex-col justify-between">
                <span className="text-[7px] uppercase font-black opacity-55 leading-tight">Worst Trade</span>
                <span className="font-mono text-[11px] text-[#FF4400] font-bold">{worstTrade < 0 ? `-$${Math.abs(worstTrade).toFixed(1)}` : '--'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
              <div className="p-2 border border-[#1A1A1A]/40 bg-white/30 flex flex-col justify-between">
                <span className="text-[7px] uppercase font-black opacity-55 leading-tight">Avg Win vs Avg Loss</span>
                <span className="font-mono text-[9px] font-bold text-zinc-750">
                  <span className="text-emerald-600">+{avgWin > 0 ? `$${avgWin.toFixed(1)}` : '$0.0'}</span>
                  <span className="mx-1 opacity-30">/</span>
                  <span className="text-[#FF4400]">{avgLoss < 0 ? `-$${Math.abs(avgLoss).toFixed(1)}` : '$0.0'}</span>
                </span>
              </div>
              <div className="p-2 border border-[#1A1A1A]/40 bg-white/30 flex flex-col justify-between">
                <span className="text-[7px] uppercase font-black opacity-55 leading-tight">Max Streaks (W/L)</span>
                <span className="font-mono text-[9px] font-bold text-zinc-750">
                  <span className="text-emerald-600">{maxConsecutiveWins}W</span>
                  <span className="mx-1 opacity-30">/</span>
                  <span className="text-[#FF4400]">{maxConsecutiveLosses}L</span>
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[#1A1A1A] text-[#F5F2ED] p-6 -mx-8 -mb-8 mt-12 border-t border-zinc-800">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  status.telegramStatus === 'CONNECTED' ? "bg-emerald-500 animate-pulse" :
                  status.telegramStatus === 'FAILED' ? "bg-[#FF4400]" : "bg-yellow-500 animate-pulse"
                )}></div>
                <span className="text-[10px] uppercase tracking-widest font-black">Telegram Uplink</span>
              </div>
              <span className={cn(
                "text-[8px] font-mono font-black border px-1.5 py-0.5 rounded-sm",
                status.telegramStatus === 'CONNECTED' ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" :
                status.telegramStatus === 'FAILED' ? "text-[#FF4400] border-red-500/30 bg-red-500/10" :
                "text-yellow-400 border-yellow-500/30 bg-yellow-500/10"
              )}>
                {status.telegramStatus || 'WAITING'}
              </span>
            </div>

            <div className="space-y-2 text-[10px] font-mono leading-tight">
              {/* Credentials / Config display */}
              <div className="bg-white/5 p-2 rounded border border-white/5 space-y-1 text-[9px] opacity-80">
                <div className="flex justify-between">
                  <span className="opacity-50">BOT TOKEN:</span>
                  <span className="font-bold">{status.telegramToken || 'NOT_CONFIGURED'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-50">CHAT ID:</span>
                  <span className="font-bold">{status.telegramChatId || 'NOT_CONFIGURED'}</span>
                </div>
              </div>

              {/* Error or Success notification status */}
              {status.telegramStatus === 'CONNECTED' && (
                <div className="text-emerald-400 bg-emerald-500/5 p-2 rounded border border-emerald-500/10">
                  <span className="font-bold font-sans">✓ Connection Verified:</span>
                  <p className="mt-1 opacity-75 text-[9px]">Startup message 'AlphaTrade Bot is Online ✅' transmitted successfully.</p>
                </div>
              )}

              {status.telegramStatus === 'FAILED' && (
                <div className="text-[#FF4400] bg-red-500/10 p-2 rounded border border-red-500/20 text-[9px]">
                  <span className="font-bold font-sans">✗ Connection Failed:</span>
                  <p className="mt-1 font-mono break-all opacity-90 leading-normal">{status.telegramError || 'Handshake timeout or invalid credentials.'}</p>
                </div>
              )}

              {(!status.telegramStatus || status.telegramStatus === 'WAITING') && (
                <p className="opacity-40 italic">[SYSTEM] RUNNING CRYPTOGRAPHIC INTERNET HANDSHAKE...</p>
              )}

              {/* Latest Action telemetry log */}
              <div className="border-t border-white/5 pt-2 mt-2">
                <span className="text-[8px] uppercase tracking-wider opacity-35">Last Transmission:</span>
                {status.trades && status.trades.length > 0 ? (
                  status.trades.slice(-1).map((t, index) => (
                    <div key={t.id || index} className="opacity-60 text-[9px] mt-1 text-zinc-300">
                      [{safeFormatDate(t.timestamp, 'HH:mm:ss')}] NOTIFY: {t.direction || t.type} @ ${t.entryPrice.toFixed(0)} (Net: ${(t.netPnl !== undefined ? t.netPnl : (t.pnl || 0)).toFixed(2)})
                    </div>
                  ))
                ) : (
                  <p className="opacity-40 text-[9px] mt-0.5">No transmissions processed yet.</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Middle Section: Visualization */}
        <section id="market-visualization" className="col-span-12 lg:col-span-6 border-b-2 lg:border-b-0 lg:border-r-2 border-[#1A1A1A] p-0 flex flex-col min-h-[500px]">
          <div className="p-8 border-b-2 border-[#1A1A1A] bg-white/20">
             <div className="flex justify-between items-start mb-2">
                <p className="text-xs uppercase tracking-widest font-black opacity-40">Market Volatility Pulse</p>
                {tickerData && (
                  <div className="flex gap-4">
                    <div className="text-right">
                       <p className="text-[9px] uppercase font-black opacity-40">24h Change</p>
                       <p className={cn("text-[10px] font-mono font-bold", parseFloat(tickerData.P) >= 0 ? "text-emerald-600" : "text-[#FF4400]")}>
                          {parseFloat(tickerData.P) >= 0 ? '+' : ''}{tickerData.P}%
                       </p>
                    </div>
                    <div className="text-right">
                       <p className="text-[9px] uppercase font-black opacity-40">24h Volume</p>
                       <p className="text-[10px] font-mono font-bold">{(parseFloat(tickerData.v) / 1000).toFixed(1)}K BTC</p>
                    </div>
                  </div>
                )}
             </div>
             <div className={cn(
               "text-5xl font-serif italic tracking-tighter flex items-center gap-4 transition-colors duration-200",
               prevPrice && livePrice && livePrice > prevPrice ? "text-emerald-600" : 
               prevPrice && livePrice && livePrice < prevPrice ? "text-[#FF4400]" : "text-[#1A1A1A]"
             )}>
                ${(livePrice || signals?.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className={cn(
                  "text-xs font-sans not-italic font-black px-2 py-1 rounded-sm border-2",
                  (signals?.score || 0) > 40 ? "border-emerald-600 text-emerald-600" : "border-[#FF4400] text-[#FF4400]"
                )}>
                  {(signals?.score || 0) > 40 ? 'BULLISH' : 'BEARISH'}
                </span>
             </div>
          </div>
          
          <div className="flex-1 bg-white/10 p-4">
             {history.length > 0 ? (
               <ChartIndicators data={history} indicators={indicators} />
             ) : (
               <div className="h-full flex items-center justify-center text-[10px] font-black uppercase text-slate-400">Loading Market Stream...</div>
             )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 border-t-2 border-[#1A1A1A] bg-white/40">
             <div className="p-6 border-r-2 border-[#1A1A1A] flex flex-col justify-between">
                <div>
                  <p className="text-[10px] uppercase font-black opacity-40 mb-2 flex items-center gap-2">
                    <BrainCircuit className="w-3.5 h-3.5 text-emerald-600" /> Intelligence Insight
                  </p>
                  <div className="h-20 overflow-y-auto thin-scrollbar">
                    <p className="text-[11px] font-bold leading-tight italic opacity-80">
                      {signals?.aiAnalysis || "AlphaTrade AI: Synthesizing real-time price-action and candlestick structural correlations..."}
                    </p>
                  </div>
                </div>
                <div className="text-[8px] font-mono opacity-40 mt-2 uppercase">
                  SYS_MODEL_EMULATION: SUCCESSFUL
                </div>
             </div>

             <div className="p-6 border-r-2 border-[#1A1A1A] bg-[#FAF8F5] flex flex-col justify-between">
                <div>
                  <p className="text-[10px] uppercase font-black opacity-40 mb-2 flex items-center gap-2">
                    <Gauge className="w-3.5 h-3.5 text-[#FF4400]" /> Sentiment Intelligence
                  </p>
                  
                  {signals?.sentiment ? (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center bg-white border border-[#1A1A1A]/10 p-1.5 rounded-sm">
                        <span className="text-[9px] font-mono font-black uppercase opacity-60">Fear & Greed</span>
                        <span className={cn(
                          "text-[10px] font-mono font-black px-1.5 py-0.5 rounded-sm",
                          signals.sentiment.fearGreedIndex >= 70 ? "bg-emerald-100 text-emerald-800" :
                          signals.sentiment.fearGreedIndex <= 30 ? "bg-red-100 text-red-800" : "bg-orange-100 text-orange-800"
                        )}>
                          {signals.sentiment.fearGreedIndex} - {signals.sentiment.fearGreedClass}
                        </span>
                      </div>

                      <div className="flex justify-between items-center bg-white border border-[#1A1A1A]/10 p-1.5 rounded-sm">
                        <span className="text-[9px] font-mono font-black uppercase opacity-60">Social Volume</span>
                        <span className="text-[10px] font-mono font-bold text-slate-800">
                          {signals.sentiment.socialSentimentScore}% {signals.sentiment.overallVerdict}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[9px] font-mono opacity-50 italic py-2">
                      Gathering global public sentiment stream...
                    </div>
                  )}
                </div>
                
                {signals?.sentiment?.newsHeadlines && (
                  <div className="mt-2 border-t border-[#1A1A1A]/5 pt-2">
                    <button 
                      onClick={() => setShowHeadlineModal(true)}
                      className="text-[9px] font-black uppercase text-emerald-600 hover:text-[#FF4400] transition-colors flex items-center gap-1">
                      📰 Live Headlines ({signals.sentiment.newsHeadlines.length}) →
                    </button>
                  </div>
                )}
             </div>

              <div className="p-6 flex flex-col justify-center gap-2 bg-[#F5F2ED]">
                <p className="text-[10px] uppercase font-black opacity-40 mb-1 font-mono tracking-widest text-center">
                  Terminal Uplink
                </p>
                {!status.currentPosition ? (
                  <div className="flex gap-2">
                    <button 
                      disabled={(signals?.score || 0) < config.buyThreshold}
                      onClick={() => executeTrade('LONG')}
                      className={cn(
                        "flex-1 py-4 text-[10px] font-black uppercase tracking-widest bg-emerald-500 text-white border-b-4 border-r-4 border-emerald-800 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]",
                        (signals?.score || 0) < config.buyThreshold && "opacity-50 grayscale"
                      )}>
                      EXECUTE LONG
                    </button>
                    <button 
                      disabled={(signals?.score || 0) > config.shortEntryThreshold}
                      onClick={() => executeTrade('SHORT')}
                      className={cn(
                        "flex-1 py-4 text-[10px] font-black uppercase tracking-widest bg-[#FF4400] text-white border-b-4 border-r-4 border-orange-950 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]",
                        (signals?.score || 0) > config.shortEntryThreshold && "opacity-50 grayscale"
                      )}>
                      EXECUTE SHORT
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => executeTrade('EXIT')}
                    className="w-full py-4 text-xs font-black uppercase tracking-widest bg-black text-white border-b-4 border-r-4 border-[#1A1A1A] shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
                    LIQUIDATE {status.currentPosition.type} POSITION
                  </button>
                )}
              </div>
          </div>

          {/* Execution Ledger & System Diagnostic Console */}
          <div className="border-t-2 border-[#1A1A1A] flex-1 bg-white/50 overflow-hidden flex flex-col">
            <div className="border-b-2 border-[#1A1A1A] bg-[#1A1A1A] text-[#F5F2ED] flex justify-between items-stretch whitespace-nowrap overflow-x-auto gap-2">
              <div className="flex">
                <button
                  type="button"
                  id="tab-btn-ledger"
                  onClick={() => setActiveTab('ledger')}
                  className={cn(
                    "px-4 md:px-6 py-3.5 text-[10px] uppercase font-black tracking-widest border-r-2 border-[#1A1A1A] transition-all cursor-pointer",
                    activeTab === 'ledger' ? "bg-white text-[#1A1A1A]" : "bg-[#1A1A1A] text-[#F5F2ED]/60 hover:text-white"
                  )}
                >
                  Execution Ledger ({status.trades?.length || 0})
                </button>
                <button
                  type="button"
                  id="tab-btn-diagnostics"
                  onClick={() => setActiveTab('diagnostics')}
                  className={cn(
                    "px-4 md:px-6 py-3.5 text-[10px] uppercase font-black tracking-widest border-r-2 border-[#1A1A1A] transition-all cursor-pointer flex items-center gap-2",
                    activeTab === 'diagnostics' ? "bg-white text-[#1A1A1A]" : "bg-[#1A1A1A] text-[#F5F2ED]/60 hover:text-white"
                  )}
                >
                  Diagnostic Console
                  <span className="px-1.5 py-0.5 rounded-full text-[8px] bg-[#FF4400] text-white font-mono font-black animate-pulse">1m LIVE</span>
                </button>
              </div>
              <div className="flex items-center gap-3 pr-4 py-2 self-center">
                {activeTab === 'ledger' && (
                  <>
                    <button
                      onClick={handleExportCSV}
                      disabled={!status.trades || status.trades.length === 0}
                      className={cn(
                        "flex items-center gap-1 text-[8px] font-mono font-black uppercase px-2 py-1 border transition-all active:scale-95 cursor-pointer",
                        (!status.trades || status.trades.length === 0)
                          ? "bg-[#1A1A1A] text-zinc-650 border-[#1A1A1A] cursor-not-allowed opacity-40"
                          : "bg-[#FF4400] text-white border-[#FF4400] hover:bg-[#FAF8F5] hover:text-[#1A1A1A] hover:border-[#FAF8F5] shadow-[2px_2px_0px_0px_rgba(255,255,255,0.1)] active:shadow-none"
                      )}
                      title={(!status.trades || status.trades.length === 0) ? "No trade data available to export" : "Export trade history to CSV"}
                    >
                      <Download className="w-2.5 h-2.5" />
                      Export CSV
                    </button>
                    <a
                      href={resolveUrl('/api/export-zip')}
                      className="flex items-center gap-1 text-[8px] font-mono font-black uppercase px-2 py-1 border bg-blue-600 text-white border-blue-600 hover:bg-white hover:text-blue-600 hover:border-white transition-all active:scale-95 cursor-pointer shadow-[2px_2px_0px_0px_rgba(255,255,255,0.1)]"
                      title="Download full project repository as ZIP for Railway deployment"
                    >
                      <Download className="w-2.5 h-2.5" />
                      Railway ZIP
                    </a>
                  </>
                )}
                <span className="text-[9px] font-mono opacity-50 tracking-widest hidden sm:inline">REAL_TIME_FEED_STATION_001</span>
              </div>
            </div>
            
            {activeTab === 'diagnostics' ? (
              <div id="diagnostic-console-root" className="flex-1 overflow-y-auto thin-scrollbar bg-[#111111] text-[#00FF55] font-mono text-[10px] p-4 space-y-4">
                <div className="text-[11px] font-black text-zinc-400 border-b border-zinc-800 pb-2 flex justify-between items-center whitespace-nowrap gap-2">
                  <span>🛰️ DIALECTIC TELEMETRY STREAM LOG (CAP: 100 RECORDS)</span>
                  <span className="text-[9px] text-[#00FF55] font-mono font-bold uppercase">Leverage Active: {config?.leverage || 1}x</span>
                </div>
                {status.debugLogs && status.debugLogs.length > 0 ? (
                  status.debugLogs.map((log: any, idx: number) => {
                    const logTime = new Date(log.timestamp).toLocaleTimeString();
                    const ema200Status = log.price >= log.ema200 ? 'ABOVE EMA200' : 'BELOW EMA200';
                    return (
                      <div key={log.id || idx} className="border-b border-zinc-900 pb-3 hover:bg-zinc-900/40 p-2 rounded transition-colors duration-150">
                        <div className="flex items-center justify-between text-zinc-400 mb-1.5">
                          <span className="text-[#00ff55] font-black">[{logTime}] ENGINE_CYCLE_CHECK // SUCCESS</span>
                          <span className={cn(
                            "text-[8px] uppercase font-black px-1.5 py-0.5 rounded-sm border",
                            log.triggered ? "bg-emerald-950 text-[#00ff55] border-emerald-800" : "bg-zinc-900 text-zinc-400 border-zinc-800"
                          )}>
                            {log.triggered ? 'TRIGGERED_TRADE' : 'STANDBY'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-zinc-300 bg-black/60 p-2 border border-zinc-900 rounded-sm mb-2">
                          <div>
                            <span className="text-zinc-500 text-[9px]">SIGNAL SCORE:</span>{' '}
                            <span className="text-white font-bold text-[10px]">{log.score || 0}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 text-[9px]">RSI VALUE:</span>{' '}
                            <span className="text-white font-bold">{log.rsi ? log.rsi.toFixed(2) : 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 text-[9px]">EMA200 STATUS:</span>{' '}
                            <span className={cn("font-bold", log.price >= log.ema200 ? "text-emerald-400" : "text-amber-500")}>
                              {ema200Status} (${log.ema200 ? log.ema200.toFixed(1) : 'N/A'})
                            </span>
                          </div>
                          <div>
                            <span className="text-zinc-500 text-[9px]">SUPERTREND:</span>{' '}
                            <span className={cn("font-semibold", log.trend === 1 ? "text-emerald-400" : "text-red-400")}>
                              {log.trend === 1 ? 'Bullish (1)' : 'Bearish (-1)'}
                            </span>
                          </div>
                          <div>
                            <span className="text-zinc-500 text-[9px]">H4 HTF TREND:</span>{' '}
                            <span className={cn("font-semibold", log.h4Trend === 1 ? "text-emerald-400" : "text-[#FF4400]")}>
                              {log.h4Trend === 1 ? 'Bullish (1)' : 'Bearish (-1)'}
                            </span>
                          </div>
                          <div>
                            <span className="text-zinc-500 text-[9px]">LVG LEVEL:</span>{' '}
                            <span className="text-[#00ff55] font-black">{log.leverage || 1}x</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-zinc-500 text-[9px]">SCORE NEEDED:</span>{' '}
                            <span className="text-[#00ff55] font-semibold text-[9px]">{log.requiredScore}</span>
                          </div>
                        </div>

                        <div className="text-[10px] pl-1">
                          <span className="text-[#FF4400] font-black">⚙️ SYSTEM_DECISION:</span>{' '}
                          <span className="text-white">{log.reason || 'Scanning market indicators...'}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-16 text-zinc-500 italic">
                    🛰️ SCANNING BINANCE websocket stream...
                    <p className="text-[9px] mt-1 opacity-75">No diagnostic cycles persisted yet. The auto-trading engine processes signals every 60 seconds.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto thin-scrollbar bg-[#FDFBF7]">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-[#E5E1D8] z-10">
                    <tr className="border-b border-[#1A1A1A]">
                      <th className="p-2 text-[8px] font-black uppercase text-[#1A1A1A] border-r border-[#1A1A1A]/10">Asset</th>
                      <th className="p-2 text-[8px] font-black uppercase text-[#1A1A1A] border-r border-[#1A1A1A]/10">Dir</th>
                      <th className="p-2 text-[8px] font-black uppercase text-[#1A1A1A] border-r border-[#1A1A1A]/10">Size ($)</th>
                      <th className="p-2 text-[8px] font-black uppercase text-[#1A1A1A] border-r border-[#1A1A1A]/10">Lvg</th>
                      <th className="p-2 text-[8px] font-black uppercase text-[#1A1A1A] border-r border-[#1A1A1A]/10">Entry</th>
                      <th className="p-2 text-[8px] font-black uppercase text-[#1A1A1A] border-r border-[#1A1A1A]/10">Exit</th>
                      <th className="p-2 text-[8px] font-black uppercase text-[#1A1A1A] border-r border-[#1A1A1A]/10">SL</th>
                      <th className="p-2 text-[8px] font-black uppercase text-[#1A1A1A] border-r border-[#1A1A1A]/10">TP</th>
                      <th className="p-2 text-[8px] font-black uppercase text-[#1A1A1A] border-r border-[#1A1A1A]/10">Reason</th>
                      <th className="p-2 text-[8px] font-black uppercase text-[#1A1A1A] border-r border-[#1A1A1A]/10">Net PnL</th>
                      <th className="p-2 text-[8px] font-black uppercase text-[#1A1A1A]">Closed</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-[9px]">
                    {/* Active Position Row */}
                    {status.currentPosition && (
                      <tr className="border-b border-[#1A1A1A] bg-orange-50/70 animate-pulse">
                        <td className="p-2 border-r border-[#1A1A1A]/10 font-bold">BTCUSDT</td>
                        <td className={cn("p-2 font-black border-r border-[#1A1A1A]/10 text-[10px]", status.currentPosition.type === 'LONG' ? 'text-emerald-600' : 'text-[#FF4400]')}>
                          OPEN_{status.currentPosition.type}
                        </td>
                        <td className="p-2 border-r border-[#1A1A1A]/10 font-bold">
                          ${(status.currentPosition.amount * status.currentPosition.entryPrice).toFixed(1)}
                        </td>
                        <td className="p-2 border-r border-[#1A1A1A]/10">{(status.currentPosition.leverageUsed || config.leverage || 1)}x</td>
                        <td className="p-2 border-r border-[#1A1A1A]/10">${status.currentPosition.entryPrice.toFixed(1)}</td>
                        <td className="p-2 border-r border-[#1A1A1A]/10 opacity-40 font-bold">--</td>
                        <td className="p-2 border-r border-[#1A1A1A]/10 text-red-700/80">${status.currentPosition.stopLoss.toFixed(1)}</td>
                        <td className="p-2 border-r border-[#1A1A1A]/10 text-emerald-800/80">${status.currentPosition.takeProfit.toFixed(1)}</td>
                        <td className="p-2 border-r border-[#1A1A1A]/10 italic">Awaiting SL/TP</td>
                        <td className={cn("p-2 border-r border-[#1A1A1A]/10 font-bold", unrealizedPnL >= 0 ? "text-emerald-600" : "text-[#FF4400]")}>
                          {unrealizedPnL >= 0 ? '+' : ''}{unrealizedPnL.toFixed(2)}
                        </td>
                        <td className="p-2 opacity-60 font-black">ACTIVE</td>
                      </tr>
                    )}
                    {/* Historical Trades representing the persist trade_history.json ledger */}
                    {status.trades && status.trades.slice().reverse().map((t, i) => {
                      const direction = t.direction || t.type || 'N/A';
                      const leverage = t.leverageUsed !== undefined ? t.leverageUsed : '1';
                      const posSize = t.positionSize !== undefined ? t.positionSize : (t.amount !== undefined && t.entryPrice !== undefined ? t.amount * t.entryPrice : 0);
                      const isWin = (t.netPnl !== undefined ? t.netPnl : (t.pnl || 0)) >= 0;
                      const dateClosed = t.dateClosed ? t.dateClosed : safeFormatDate(t.timestamp, 'HH:mm:ss');
                      const labelClosed = dateClosed.length > 10 ? dateClosed.substring(11, 19) : dateClosed; // Just show clock HH:mm:ss to prevent wrapping

                      return (
                        <tr key={t.id || i} className="border-b border-[#1A1A1A]/5 hover:bg-white transition-colors">
                          <td className="p-2 border-r border-[#1A1A1A]/10 font-bold text-zinc-650">BTCUSDT</td>
                          <td className={cn("p-2 font-black border-r border-[#1A1A1A]/10", direction === 'LONG' ? "text-emerald-800" : "text-[#FF4400]")}>
                            {direction}
                          </td>
                          <td className="p-2 border-r border-[#1A1A1A]/10">${posSize.toFixed(0)}</td>
                          <td className="p-2 border-r border-[#1A1A1A]/10">{leverage}x</td>
                          <td className="p-2 border-r border-[#1A1A1A]/10 font-bold">${t.entryPrice.toFixed(1)}</td>
                          <td className="p-2 border-r border-[#1A1A1A]/10 font-bold">${t.exitPrice?.toFixed(1) || '--'}</td>
                          <td className="p-2 border-r border-[#1A1A1A]/10 opacity-70">${t.stopLoss?.toFixed(1) || '--'}</td>
                          <td className="p-2 border-r border-[#1A1A1A]/10 opacity-70">${t.takeProfit?.toFixed(1) || '--'}</td>
                          <td className="p-2 border-r border-[#1A1A1A]/10 uppercase text-[8px] font-bold opacity-60">{t.exitReason || 'Signal'}</td>
                          <td className={cn("p-2 border-r border-[#1A1A1A]/10 font-bold", isWin ? "text-emerald-600" : "text-[#FF4400]")}>
                            {isWin ? '+' : ''}{(t.netPnl !== undefined ? t.netPnl : (t.pnl || 0)).toFixed(2)}
                          </td>
                          <td className="p-2 opacity-50 font-black">{labelClosed}</td>
                        </tr>
                      );
                    })}
                    {(!status.trades || status.trades.length === 0) && !status.currentPosition && (
                      <tr>
                        <td colSpan={11} className="p-8 text-center italic opacity-40 text-[9px]">
                          NO PROTOCOL EXECUTIONS FOUND // STANDBY FOR SIGNAL
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Right Section: Metrics & Matrix */}
        <section id="trading-engine" className="col-span-12 lg:col-span-3 p-8 flex flex-col justify-between bg-white bg-opacity-50">
          <div>
            <h3 className="text-xs uppercase font-black tracking-widest mb-8 border-b-4 border-[#1A1A1A] pb-2">Execution Matrix</h3>
            <div className="space-y-6">
              <div className="flex flex-col">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-[10px] uppercase font-black opacity-60">Buy Score</span>
                  <span className="text-xs font-mono font-bold leading-none">
                    {signals?.score !== undefined ? `${signals.score}%` : '50%'}
                  </span>
                </div>
                <div className="h-6 bg-[#E5E1D8] border-2 border-[#1A1A1A] p-0.5 overflow-hidden">
                  <motion.div 
                    initial={{ width: '0%' }}
                    animate={{ width: `${signals?.score !== undefined ? Math.max(0, Math.min(100, signals.score)) : 50}%` }}
                    className="h-full bg-[#1A1A1A]" 
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-black opacity-60 mb-2">Signal Logic</span>
                  <div className="flex flex-col gap-1">
                    {signals?.reasons?.map((r, i) => (
                      <div key={i} className="text-[9px] font-bold uppercase tracking-tighter flex items-center gap-1">
                        <div className="w-1 h-1 bg-orange-600"></div>
                        {r}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t-2 border-[#1A1A1A]/10 mt-4">
                  <h4 className="text-[10px] uppercase font-black tracking-widest mb-4">Set Price Alert</h4>
                  <form onSubmit={createAlert} className="space-y-3">
                    <div className="flex gap-2">
                      <input 
                        type="number"
                        placeholder="Target Price"
                        value={alertForm.price}
                        onChange={(e) => setAlertForm({...alertForm, price: e.target.value})}
                        className="flex-1 bg-white border-2 border-[#1A1A1A] px-2 py-1.5 text-xs font-mono font-bold focus:outline-none focus:bg-orange-50"
                      />
                      <select 
                        value={alertForm.direction}
                        onChange={(e) => setAlertForm({...alertForm, direction: e.target.value as any})}
                        className="bg-white border-2 border-[#1A1A1A] px-1 text-[10px] font-black uppercase"
                      >
                        <option value="UP">UP</option>
                        <option value="DOWN">DN</option>
                      </select>
                    </div>
                    <button 
                      type="submit"
                      className="w-full bg-[#1A1A1A] text-white py-2.5 text-[10px] font-black uppercase tracking-widest hover:bg-[#FF4400] transition-colors flex items-center justify-center gap-2 border-b-2 border-r-2 border-black active:translate-y-px active:translate-x-px active:border-none">
                      <Bell className="w-3 h-3" /> Arm Alert Protocol
                    </button>
                  </form>
                </div>

                {/* Autonomous Protocol Settings */}
                <div className="pt-6 border-t-2 border-[#1A1A1A]/10 mt-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-[10px] uppercase font-black tracking-widest flex items-center gap-2">
                       <Play className={cn("w-3 h-3", config.isAutoTradingEnabled ? "text-emerald-500" : "text-[#FF4400]")} /> Autonomous Protocol
                    </h4>
                    <button 
                      onClick={() => updateConfig({ isAutoTradingEnabled: !config.isAutoTradingEnabled })}
                      className={cn(
                        "px-3 py-1 text-[9px] font-black uppercase border-2 transition-all",
                        config.isAutoTradingEnabled 
                          ? "bg-emerald-500 text-white border-emerald-600 animate-pulse" 
                          : "bg-white text-[#1A1A1A] border-[#1A1A1A]/20"
                      )}>
                      {config.isAutoTradingEnabled ? 'Engaged' : 'Disconnected'}
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex flex-col">
                      <div className="flex justify-between mb-1">
                        <span className="text-[9px] uppercase font-black opacity-60 font-mono">Long Entry Threshold</span>
                        <span className="text-[10px] font-black text-emerald-600">{config.buyThreshold}%</span>
                      </div>
                      <input 
                        type="range"
                        min="50"
                        max="95"
                        step="1"
                        value={config.buyThreshold}
                        onChange={(e) => updateConfig({ buyThreshold: e.target.value })}
                        className="w-full accent-emerald-500 h-1"
                      />
                    </div>

                    <div className="flex flex-col">
                      <div className="flex justify-between mb-1 items-center">
                        <span className="text-[9px] uppercase font-black opacity-60 font-mono">Short Engine</span>
                        <button 
                          onClick={() => updateConfig({ enableShorts: !config.enableShorts })}
                          className={cn(
                            "px-2 py-0.5 text-[8px] font-black uppercase border",
                            config.enableShorts ? "bg-black text-white" : "bg-white text-black opacity-50"
                          )}>
                          {config.enableShorts ? 'ENABLED' : 'DISABLED'}
                        </button>
                      </div>
                      {config.enableShorts && (
                        <>
                          <div className="flex justify-between mt-2 mb-1">
                            <span className="text-[9px] uppercase font-black opacity-60 font-mono">Short Entry Threshold</span>
                            <span className="text-[10px] font-black text-[#FF4400]">{config.shortEntryThreshold}%</span>
                          </div>
                          <input 
                            type="range"
                            min="5"
                            max="50"
                            step="1"
                            value={config.shortEntryThreshold}
                            onChange={(e) => updateConfig({ shortEntryThreshold: e.target.value })}
                            className="w-full accent-[#FF4400] h-1"
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dynamic Leverage System Status */}
                <div className="pt-6 border-t-2 border-[#1A1A1A]/10 mt-4">
                  <h4 className="text-[10px] uppercase font-black tracking-widest mb-4 flex items-center gap-2">
                    <Gauge className="w-3 h-3 text-[#FF4400]" /> Dynamic Leverage System
                  </h4>
                  <div className={cn(
                    "border-2 border-[#1A1A1A] p-3 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]",
                    status.currentRiskLevel === 'LOW' ? "bg-emerald-50/70" :
                    status.currentRiskLevel === 'MEDIUM' ? "bg-amber-50/70" : "bg-red-50/70"
                  )}>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div className="bg-white/80 p-2 border border-[#1A1A1A]/10 rounded font-sans">
                        <span className="text-[8px] font-mono uppercase opacity-50 block font-normal">Leverage Level</span>
                        <span className="text-lg font-black font-sans text-zinc-900">
                          {status.currentLeverage !== undefined ? `${status.currentLeverage}x` : '1x'}
                        </span>
                      </div>
                      <div className="bg-white/80 p-2 border border-[#1A1A1A]/10 rounded font-sans">
                        <span className="text-[8px] font-mono uppercase opacity-50 block font-normal">Risk Matrix</span>
                        <span className={cn(
                          "text-[9px] font-black px-1.5 py-0.5 rounded-sm inline-block mt-0.5",
                          status.currentRiskLevel === 'LOW' ? "bg-emerald-100 text-emerald-800" :
                          status.currentRiskLevel === 'MEDIUM' ? "bg-amber-100 text-amber-800" : "bg-red-100 text-[#FF4400]"
                        )}>
                          {status.currentRiskLevel || 'HIGH (DEFAULT)'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-[9px] font-mono">
                      <div className="flex justify-between border-b border-[#1A1A1A]/5 pb-1">
                        <span className="opacity-60 uppercase">Stop Loss Adjust:</span>
                        <span className="font-bold text-[#FF4400]">
                          -{status.effectiveStopLossPct !== undefined ? status.effectiveStopLossPct.toFixed(2) : '1.55'}%
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-[#1A1A1A]/5 pb-1">
                        <span className="opacity-60 uppercase">Max Account Risk:</span>
                        <span className="font-bold text-zinc-950">
                          2.00% (Max Loss: ${status.maxAllowedLossUSDT !== undefined ? status.maxAllowedLossUSDT.toFixed(2) : '200.00'})
                        </span>
                      </div>
                      <div className="flex flex-col pt-1">
                        <span className="opacity-60 uppercase mb-0.5">Algorithm Status:</span>
                        <span className="opacity-95 leading-normal text-[8.5px] font-bold text-zinc-800 bg-white/70 p-1.5 rounded font-sans border border-[#1A1A1A]/5">
                          {status.currentRiskReason || 'Awaiting initial signal feed...'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AlphaTrade AI Assistant */}
                <div className="pt-6 border-t-2 border-[#1A1A1A]/10 mt-4">
                  <h4 className="text-[10px] uppercase font-black tracking-widest mb-4 flex items-center gap-2">
                    <BrainCircuit className="w-3 h-3 text-emerald-600" /> AlphaTrade Assistant
                  </h4>
                  <div className="bg-white border-2 border-[#1A1A1A] p-3 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] flex flex-col h-[200px]">
                    <div className="flex-1 overflow-y-auto space-y-2 mb-3 thin-scrollbar">
                      {chatHistory.length === 0 && (
                        <p className="text-[9px] opacity-40 italic">Ask me about the protocol or market dynamics.</p>
                      )}
                      {chatHistory.map((chat, i) => (
                        <div key={i} className={cn("text-[10px] leading-tight p-2 border", 
                          chat.role === 'user' ? "bg-orange-50 border-[#1A1A1A]/10 text-right ml-4" : "bg-emerald-50 border-[#1A1A1A]/10 text-left mr-4"
                        )}>
                          <span className="font-black uppercase opacity-40 block mb-1 text-[8px]">{chat.role === 'user' ? 'USER_QUERY' : 'ALPHA_AI'}</span>
                          {chat.content}
                        </div>
                      ))}
                      {isChatLoading && (
                        <div className="p-2 opacity-50 text-[8px] font-black uppercase animate-pulse">Processing...</div>
                      )}
                    </div>
                    <form onSubmit={askAi} className="flex gap-2">
                      <input 
                        type="text"
                        placeholder="Ask Gemini..."
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        className="flex-1 bg-[#F5F2ED] border border-[#1A1A1A] px-2 py-1 text-[10px] font-bold focus:outline-none"
                      />
                      <button 
                        type="submit"
                        className="px-2 py-1 bg-[#1A1A1A] text-white text-[9px] font-black uppercase hover:bg-[#FF4400]">
                        SEND
                      </button>
                    </form>
                  </div>
                </div>

                {/* Risk Control Settings */}
                <div className="pt-6 border-t-2 border-[#1A1A1A]/10 mt-4">
                  <h4 className="text-[10px] uppercase font-black tracking-widest mb-4 flex items-center gap-2">
                    <ShieldCheck className="w-3 h-3 text-[#FF4400]" /> Risk Protocol
                  </h4>
                  <div className="space-y-4">
                    <div className="flex flex-col">
                      <div className="flex justify-between mb-1">
                        <span className="text-[9px] uppercase font-black opacity-60 font-mono">Stop Loss</span>
                        <span className="text-[10px] font-black text-[#FF4400] bg-[#FF4400]/10 px-1">-{config.stopLossPct.toFixed(1)}%</span>
                      </div>
                      <input 
                        type="range"
                        min="0.1"
                        max="10"
                        step="0.1"
                        value={config.stopLossPct}
                        onChange={(e) => updateConfig({ stopLossPct: e.target.value })}
                        className="w-full accent-[#1A1A1A] h-1"
                      />
                    </div>

                    <div className="flex flex-col">
                      <div className="flex justify-between mb-1">
                        <span className="text-[9px] uppercase font-black opacity-60 font-mono">Take Profit</span>
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-600/10 px-1">+{config.takeProfitPct.toFixed(1)}%</span>
                      </div>
                      <input 
                        type="range"
                        min="0.1"
                        max="20"
                        step="0.1"
                        value={config.takeProfitPct}
                        onChange={(e) => updateConfig({ takeProfitPct: e.target.value })}
                        className="w-full accent-[#1A1A1A] h-1"
                      />
                    </div>

                    <div className="flex flex-col">
                      <div className="flex justify-between mb-1">
                        <span className="text-[9px] uppercase font-black opacity-60 font-mono">Allocation</span>
                        <span className="text-[10px] font-black opacity-80">{config.tradeSizePct.toFixed(1)}% of Account</span>
                      </div>
                      <input 
                        type="range"
                        min="0.5"
                        max="50"
                        step="0.5"
                        value={config.tradeSizePct}
                        onChange={(e) => updateConfig({ tradeSizePct: e.target.value })}
                        className="w-full accent-[#1A1A1A] h-1"
                      />
                    </div>

                    {/* Sizing Mode selection */}
                    <div className="flex flex-col pt-2 border-t border-dotted border-[#1A1A1A]/20">
                      <div className="flex justify-between mb-1">
                        <span className="text-[9px] uppercase font-black opacity-60 font-mono">Position Sizing Engine</span>
                        <span className="text-[9px] font-mono font-black border border-current px-1 rounded-sm uppercase bg-[#1A1A1A] text-white">
                          {(config.sizingMode || 'fixed').toUpperCase()}
                        </span>
                      </div>
                      
                      {/* Interactive toggle tabs for Sizing Mode */}
                      <div className="grid grid-cols-4 gap-1 mb-2 bg-[#F2EFE9] p-0.5 border border-[#1A1A1A]">
                        {[
                          { id: 'fixed', label: 'Fixed' },
                          { id: 'balance', label: 'Balance' },
                          { id: 'volatility', label: 'Volatility' },
                          { id: 'hybrid', label: 'Hybrid' },
                        ].map((m) => {
                          const active = (config.sizingMode || 'fixed') === m.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => updateConfig({ sizingMode: m.id })}
                              className={cn(
                                "text-[8px] font-mono font-black uppercase py-1 text-center border transition-all active:scale-95",
                                active 
                                  ? "bg-[#1A1A1A] text-[#FAF8F5] border-[#1A1A1A]" 
                                  : "text-zinc-650 hover:bg-[#FAF8F5]/55 border-transparent bg-transparent"
                              )}
                            >
                              {m.label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Live status readout if dynamic sizing mode is selected */}
                      {config.sizingMode && config.sizingMode !== 'fixed' && status.adjustedTradeSizePct !== undefined && (
                        <div className="bg-[#FF4400]/5 border border-[#FF4400]/20 p-2 mb-2 rounded-sm text-[9px] font-mono leading-tight space-y-1">
                          <p className="font-bold text-[#FF4400] flex justify-between">
                            <span>ADJUSTED TRADE SIZE Pct:</span>
                            <span>{status.adjustedTradeSizePct.toFixed(2)}%</span>
                          </p>
                          <p className="opacity-60 text-[8px]">
                            {config.sizingMode === 'balance' && "Scales higher with positive compounding, smaller on account drawdown."}
                            {config.sizingMode === 'volatility' && `Scales smaller under high ATR, larger during stable low volatility.`}
                            {config.sizingMode === 'hybrid' && `Adapts using both equity drawdown safety and asset volatility ATR.`}
                          </p>
                        </div>
                      )}

                      {/* Dependent settings: Balance Scaling */}
                      {(config.sizingMode === 'balance' || config.sizingMode === 'hybrid') && (
                        <div className="flex flex-col mb-2 pl-2 border-l-2 border-[#1A1A1A]/30">
                          <div className="flex justify-between mb-0.5">
                            <span className="text-[8px] uppercase tracking-wider font-bold opacity-50">Reference Base Balance</span>
                            <span className="text-[9px] font-mono font-bold">${(config.baseBalance || 10000).toLocaleString()}</span>
                          </div>
                          <input 
                            type="number"
                            min="100"
                            max="1000000"
                            step="100"
                            value={config.baseBalance || 10000}
                            onChange={(e) => updateConfig({ baseBalance: parseFloat(e.target.value) || 10000 })}
                            className="w-full text-[10px] font-mono border border-[#1A1A1A] px-1.5 py-0.5 bg-white text-zinc-800"
                          />
                        </div>
                      )}

                      {/* Dependent settings: Volatility ATR Scaling */}
                      {(config.sizingMode === 'volatility' || config.sizingMode === 'hybrid') && (
                        <div className="flex flex-col mb-2 pl-2 border-l-2 border-[#1A1A1A]/30">
                          <div className="flex justify-between mb-0.5">
                            <span className="text-[8px] uppercase tracking-wider font-bold opacity-50">Volatility Reference (ATR %)</span>
                            <span className="text-[9px] font-mono font-bold">{(config.volatilityRefPct || 1.5).toFixed(2)}%</span>
                          </div>
                          <input 
                            type="range"
                            min="0.2"
                            max="5.0"
                            step="0.1"
                            value={config.volatilityRefPct || 1.5}
                            onChange={(e) => updateConfig({ volatilityRefPct: parseFloat(e.target.value) })}
                            className="w-full accent-[#1A1A1A] h-1"
                          />
                          <p className="text-[7px] italic opacity-40 leading-none mt-1">
                            Current volatilities above this value decrease trade sizing fraction dynamically.
                          </p>
                        </div>
                      )}

                      {/* Sizing Constraint Bounds (Min/Max limit sliders) */}
                      {config.sizingMode !== 'fixed' && (
                        <div className="grid grid-cols-2 gap-2 mt-1 pl-2 border-l-2 border-[#1A1A1A]/30 mb-2">
                          <div className="flex flex-col">
                            <div className="flex justify-between mb-0.5">
                              <span className="text-[8px] uppercase font-mono opacity-50">Min Pct Bound</span>
                              <span className="text-[8px] font-mono font-bold">{(config.sizingMinPct || 0.5).toFixed(1)}%</span>
                            </div>
                            <input 
                              type="range"
                              min="0.1"
                              max="5.0"
                              step="0.1"
                              value={config.sizingMinPct || 0.5}
                              onChange={(e) => updateConfig({ sizingMinPct: parseFloat(e.target.value) })}
                              className="w-full accent-[#1A1A1A] h-1"
                            />
                          </div>
                          <div className="flex flex-col">
                            <div className="flex justify-between mb-0.5">
                              <span className="text-[8px] uppercase font-mono opacity-50">Max Pct Bound</span>
                              <span className="text-[8px] font-mono font-bold">{(config.sizingMaxPct || 10.0).toFixed(1)}%</span>
                            </div>
                            <input 
                              type="range"
                              min="2.0"
                              max="20.0"
                              step="0.5"
                              value={config.sizingMaxPct || 10.0}
                              onChange={(e) => updateConfig({ sizingMaxPct: parseFloat(e.target.value) })}
                              className="w-full accent-[#1A1A1A] h-1"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col">
                      <div className="flex justify-between mb-1">
                        <span className="text-[9px] uppercase font-black opacity-60 font-mono">Trade Cooldown</span>
                        <span className="text-[10px] font-black opacity-80">{config.cooldownMinutes} MIN</span>
                      </div>
                      <input 
                        type="range"
                        min="1"
                        max="240"
                        step="1"
                        value={config.cooldownMinutes}
                        onChange={(e) => updateConfig({ cooldownMinutes: e.target.value })}
                        className="w-full accent-[#1A1A1A] h-1"
                      />
                    </div>
                    
                    <div className="flex flex-col">
                      <div className="flex justify-between mb-1">
                        <span className="text-[9px] uppercase font-black opacity-60 font-mono">Trailing Stop</span>
                        <span className="text-[10px] font-black text-blue-600 bg-blue-600/10 px-1">{config.trailingStopPct.toFixed(1)}%</span>
                      </div>
                      <input 
                        type="range"
                        min="0.2"
                        max="5"
                        step="0.1"
                        value={config.trailingStopPct}
                        onChange={(e) => updateConfig({ trailingStopPct: e.target.value })}
                        className="w-full accent-[#1A1A1A] h-1"
                      />
                    </div>

                    {/* Leverage Slider */}
                    <div className="flex flex-col border-t border-dotted border-[#1A1A1A]/20 pt-2">
                      <div className="flex justify-between mb-1">
                        <span className="text-[9px] uppercase font-black opacity-60 font-mono font-bold text-zinc-750">Position Leverage</span>
                        <span className="text-[10px] font-black text-[#FF4400] bg-[#FF4400]/10 px-1">{config.leverage || 1}x</span>
                      </div>
                      <input 
                        type="range"
                        min="1"
                        max="50"
                        step="1"
                        value={config.leverage || 1}
                        onChange={(e) => updateConfig({ leverage: parseInt(e.target.value) })}
                        className="w-full accent-[#1A1A1A] h-1"
                      />
                    </div>

                    {/* Fee Rate Input */}
                    <div className="flex flex-col">
                      <div className="flex justify-between mb-1">
                        <span className="text-[9px] uppercase font-black opacity-60 font-mono font-bold text-zinc-750">Transaction Fee Rate (Broker)</span>
                        <span className="text-[10px] font-black text-zinc-650">{(config.feePct !== undefined ? config.feePct : 0.05).toFixed(3)}%</span>
                      </div>
                      <div className="flex gap-2">
                        <input 
                          type="range"
                          min="0.00"
                          max="1.00"
                          step="0.01"
                          value={config.feePct !== undefined ? config.feePct : 0.05}
                          onChange={(e) => updateConfig({ feePct: parseFloat(e.target.value) })}
                          className="flex-1 accent-[#1A1A1A] h-1 mt-2"
                        />
                        <input
                          type="number"
                          min="0.0"
                          max="10.0"
                          step="0.01"
                          value={config.feePct !== undefined ? config.feePct : 0.05}
                          onChange={(e) => updateConfig({ feePct: parseFloat(e.target.value) || 0 })}
                          className="w-[50px] text-right font-mono text-[9px] border border-[#1A1A1A] px-1 bg-white text-zinc-850"
                        />
                      </div>
                    </div>

                    {/* Ledger Database Control (Reset Ledger with Password verification) */}
                    <div className="flex flex-col border-t-2 border-[#1A1A1A] pt-3 mt-2 bg-[#FF4400]/5 p-2 border-dashed border-[#FF4400]/30 rounded">
                      <span className="text-[9px] uppercase font-black text-[#FF4400] font-mono leading-none mb-1">Database Administration</span>
                      <p className="text-[8px] opacity-60 mb-2 font-mono">Purge history & reset running balance to $10,000.</p>
                      
                      {!resetState.active ? (
                        <button
                          type="button"
                          onClick={() => setResetState(prev => ({ ...prev, active: true }))}
                          className="w-full bg-[#FF4400] text-[#FAF8F5] py-1 text-[9px] font-black uppercase hover:bg-[#1A1A1A] hover:text-[#FAF8F5] transition-all">
                          Reset System Ledger
                        </button>
                      ) : (
                        <div className="space-y-1.5">
                          <input
                            type="password"
                            placeholder="Enter administrative password..."
                            value={resetState.password}
                            onChange={(e) => setResetState(prev => ({ ...prev, password: e.target.value }))}
                            className="w-full text-[9px] font-mono border border-red-400 px-1.5 py-0.5 bg-white text-[#1A1A1A]"
                          />
                          {resetState.error && (
                            <p className="text-[7px] text-[#FF4400] font-mono leading-none">{resetState.error}</p>
                          )}
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={handleResetLedger}
                              className="flex-1 bg-black text-[#FAF8F5] py-1 text-[8px] font-black uppercase hover:bg-red-655 text-center">
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setResetState({ active: false, password: '', error: '' })}
                              className="bg-white text-zinc-700 border border-zinc-300 py-1 px-2 text-[8px] font-black uppercase">
                              Exit
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <p className="text-[8px] italic opacity-40 leading-tight border-l-2 border-[#1A1A1A] pl-2">
                      PARAM_RELOAD: RISK_ADJUSTMENTS_PERSISTED_TO_ENGINE_CORE
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 space-y-4">
             <div className="p-6 border-4 border-[#1A1A1A] bg-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-5">
                   <Activity className="w-12 h-12" />
                </div>
                <p className="text-[10px] uppercase font-black opacity-40 mb-1">Backtest Results</p>
                {backtest ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                       <p className="text-xs font-black uppercase">Net PnL</p>
                       <p className={cn("text-2xl font-serif italic", backtest.netPnl > 0 ? "text-emerald-700" : "text-[#FF4400]")}>
                         {backtest.netPnl > 0 ? `+$${backtest.netPnl.toFixed(0)}` : `-$${Math.abs(backtest.netPnl).toFixed(0)}`}
                       </p>
                    </div>
                    <div>
                       <p className="text-xs font-black uppercase">Ratio</p>
                       <p className="text-2xl font-serif italic">{backtest.winRate.toFixed(0)}%</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs font-bold italic opacity-60 py-2 uppercase tracking-tighter">Engine Idle. Awaiting simulation trigger.</p>
                )}
             </div>

             <button 
               onClick={runBacktest}
               disabled={loading}
               className="w-full bg-[#1A1A1A] text-white py-5 font-black uppercase text-sm tracking-[0.2em] transform transition hover:bg-[#FF4400] active:scale-95 flex items-center justify-center gap-3">
               {loading && <Activity className="w-4 h-4 animate-spin" />}
               Run Simulation
             </button>
          </div>
        </section>
      </main>

      <footer className="h-14 flex items-center px-8 bg-[#1A1A1A] text-[#F5F2ED] overflow-hidden">
        <div className="flex gap-12 text-[10px] uppercase tracking-widest font-black overflow-hidden whitespace-nowrap">
          <span className="opacity-40 animate-pulse">Status: Listening_To_Stream</span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FF4400]"></span>
            Risk Matrix: {config.tradeSizePct.toFixed(1)}% Trade / {config.stopLossPct.toFixed(1)}% SL / {config.takeProfitPct.toFixed(1)}% TP
          </span>
          <span className="hidden md:inline">Latency: <span className="font-mono">14ms</span></span>
          <span className="hidden lg:inline opacity-60 text-[#FF4400]">Engine: AlphaTrade v0.8.4-Quant_Experimental</span>
        </div>
        <div className="ml-auto font-mono text-[10px] hidden sm:block">
          UTC {safeFormatDate(new Date(), 'yyyy-MM-dd HH:mm:ss')}
        </div>
      </footer>

      {/* Dynamic News Headline Overlay */}
      {showHeadlineModal && signals?.sentiment?.newsHeadlines && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#FAF8F5] border-4 border-[#1A1A1A] max-w-lg w-full p-6 shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] relative flex flex-col">
            <button 
              onClick={() => setShowHeadlineModal(false)}
              className="absolute top-4 right-4 border-2 border-[#1A1A1A] px-2 py-1 text-xs font-black uppercase hover:bg-black hover:text-white transition-colors">
              [CLOSE]
            </button>
            
            <div className="flex items-center gap-2 mb-6 border-b-4 border-[#1A1A1A] pb-3">
              <Newspaper className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="text-sm uppercase font-black tracking-widest text-[#1A1A1A]">Sentiment Intelligence Hub</h3>
                <p className="text-[9px] font-mono opacity-50 uppercase text-[#1A1A1A]">Google-Grounded Live News Aggregator</p>
              </div>
            </div>

            <div className="space-y-4 max-h-[350px] overflow-y-auto thin-scrollbar pr-1">
              {signals.sentiment.newsHeadlines.map((news, i) => (
                <div key={i} className="bg-white border-2 border-[#1A1A1A] p-3.5 hover:shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] transition-all">
                  <div className="flex justify-between items-start gap-3 mb-1.5">
                    <span className="text-[8px] font-mono font-black uppercase text-[#1A1A1A]/40 bg-zinc-100 px-1 border border-zinc-300">
                      {news.source}
                    </span>
                    <span className={cn(
                      "text-[8px] font-mono font-black uppercase px-2 rounded-full",
                      news.sentiment === 'bullish' ? 'bg-emerald-100 text-emerald-800' :
                      news.sentiment === 'bearish' ? 'bg-red-100 text-red-800' : 'bg-zinc-100 text-zinc-600'
                    )}>
                      {news.sentiment}
                    </span>
                  </div>
                  <h4 className="text-xs font-black leading-snug text-[#1A1A1A]">
                    {news.title}
                  </h4>
                  {news.url && (
                    <a 
                      href={news.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2 text-[9px] font-mono font-black text-emerald-600 hover:underline">
                      READ ORIGINAL SOURCE ↗
                    </a>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-[#1A1A1A]/20 pt-4 flex justify-between items-center text-[8px] font-mono opacity-50 uppercase text-[#1A1A1A]">
              <span>Sentiment Score: {signals.sentiment.socialSentimentScore}%</span>
              <span>Verdict: {signals.sentiment.overallVerdict}</span>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
