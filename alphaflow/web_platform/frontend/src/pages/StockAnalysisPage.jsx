import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  Target,
  Shield,
  BarChart3,
  Cpu,
  Activity,
  Search,
  Newspaper,
  Coins,
  Lock,
  Calendar,
  Award,
  Maximize,
  Minimize,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import SignalBadge from '../components/SignalBadge';
import PriceChart from '../components/PriceChart';
import MonteCarloChart from '../components/MonteCarloChart';
import { api } from '../lib/api';

/* ─── Autocomplete suggestions ─── */
const POPULAR_TICKERS = [
  { symbol: 'RELIANCE.NS', name: 'Reliance Industries', sector: 'Energy' },
  { symbol: 'TCS.NS', name: 'Tata Consultancy Services', sector: 'IT Services' },
  { symbol: 'HDFCBANK.NS', name: 'HDFC Bank', sector: 'Banking' },
  { symbol: 'ICICIBANK.NS', name: 'ICICI Bank', sector: 'Banking' },
  { symbol: 'INFY.NS', name: 'Infosys', sector: 'IT Services' },
  { symbol: 'SBIN.NS', name: 'State Bank of India', sector: 'Banking' },
  { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel', sector: 'Telecom' },
  { symbol: 'ITC.NS', name: 'ITC Limited', sector: 'FMCG' },
  { symbol: 'TATAMOTORS.NS', name: 'Tata Motors', sector: 'Automotive' },
  { symbol: 'ZOMATO.NS', name: 'Zomato Limited', sector: 'Internet' },
  { symbol: 'HAL.NS', name: 'Hindustan Aeronautics', sector: 'Aerospace' },
  { symbol: '^NSEI', name: 'Nifty 50 Index', sector: 'Index' },
  { symbol: '^BSESN', name: 'Sensex Index', sector: 'Index' },
  { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', sector: 'Semiconductors' },
  { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Automotive' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Internet' }
];

/* ─── Formatting Helpers ─── */
function formatPrice(val, symbol = '') {
  if (val == null) return '—';
  const isUSD = !symbol.endsWith('.NS') && symbol !== '^NSEI' && symbol !== '^BSESN' && symbol.length <= 5 && symbol !== 'RELIANCE' && symbol !== 'TCS' && symbol !== 'HDFCBANK' && symbol !== 'INFY' && symbol !== 'SBIN';
  return (isUSD ? '$' : '₹') + Number(val).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function formatPct(val) {
  if (val == null) return '—';
  const n = Number(val);
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}

function changeColor(val) {
  if (val == null) return 'text-[var(--text-secondary)]';
  return Number(val) >= 0 ? 'text-emerald-600' : 'text-rose-600';
}

function changeBg(val) {
  if (val == null) return 'bg-neutral-100';
  return Number(val) >= 0 ? 'bg-emerald-50 border border-emerald-100' : 'bg-rose-50 border border-rose-100';
}

/* ─── Skeleton Loader ─── */
function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-neutral-200/80 ${className}`} />;
}

/* ─── Custom Layout Card ─── */
function SectionCard({ title, icon: Icon, rightAction, children, className = '', contentClassName = '' }) {
  return (
    <div className={`rounded-xl border border-[var(--border-light)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col sm:p-6 ${className}`}>
      {title && (
        <div className="mb-4 flex shrink-0 flex-col gap-3 border-b border-[var(--border-light)] pb-4 sm:mb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="w-4.5 h-4.5 text-[var(--accent-brand)]" />}
            <h3 className="font-bold text-xs uppercase tracking-wider text-[var(--text-primary)]">{title}</h3>
          </div>
          {rightAction}
        </div>
      )}
      <div className={`flex-1 min-h-0 ${contentClassName}`}>{children}</div>
    </div>
  );
}

/* ─── Prepare chart data based on timeframe ─── */
function prepareChartData(priceHistory, chartType = 'candlestick', timeframe = 'all') {
  if (!Array.isArray(priceHistory) || priceHistory.length === 0) return [];
  
  let sorted = [...priceHistory]
    .map((d) => {
      // If the backend returned in the new Apex format { x, y: [o, h, l, c] }
      if (d.x && Array.isArray(d.y)) {
        return {
          time: d.x,
          open: Number(d.y[0]),
          high: Number(d.y[1]),
          low: Number(d.y[2]),
          close: Number(d.y[3])
        };
      }
      // Fallback to old format
      const dateStr = d.date || d.Date;
      return {
        time: typeof dateStr === 'string' ? dateStr.split('T')[0] : dateStr,
        open: Number(d.open ?? d.Open),
        high: Number(d.high ?? d.High),
        low: Number(d.low ?? d.Low),
        close: Number(d.close ?? d.Close),
      };
    })
    .filter(d => d.time && !isNaN(d.close))
    .sort((a, b) => (a.time > b.time ? 1 : -1));

  // Deduplicate by time (Lightweight Charts crashes on duplicate times)
  const uniqueSorted = [];
  let lastTime = null;
  for (const item of sorted) {
    if (item.time !== lastTime) {
      uniqueSorted.push(item);
      lastTime = item.time;
    }
  }
  sorted = uniqueSorted;

  // Filter based on timeframe
  if (timeframe === '1M') {
    sorted = sorted.slice(-30);
  } else if (timeframe === '1W') {
    sorted = sorted.slice(-7);
  } else if (timeframe === '1Y') {
    sorted = sorted.slice(-250);
  }

  if (chartType === 'candlestick') {
    return sorted;
  } else {
    // line/area charts expect { time, value }
    return sorted.map(d => ({
      time: d.time,
      value: d.close
    }));
  }
}

export default function StockAnalysisPage() {
  const { ticker: routeTicker } = useParams();
  const navigate = useNavigate();

  // Active state
  const activeTicker = routeTicker || 'RELIANCE.NS';
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [chartType, setChartType] = useState('candlestick'); // 'candlestick' | 'area'
  const [timeframe, setTimeframe] = useState('all'); // '1W' | '1M' | '1Y' | 'all'
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'technicals' | 'fundamentals' | 'accuracy'
  const [isChartFullscreen, setIsChartFullscreen] = useState(false);

  // Data states
  const [rawStockData, setRawStockData] = useState(null);
  const [rawOptionsData, setRawOptionsData] = useState(null);
  const [newsFeed, setNewsFeed] = useState([]);
  const [tickerList, setTickerList] = useState([]);

  // Load states
  const [loading, setLoading] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [error, setError] = useState(null);
  const requestIdRef = useRef(0);

  // Fetch Nifty Quick Watchlist details
  useEffect(() => {
    api.getTickerData()
      .then(res => {
        if (Array.isArray(res)) setTickerList(res);
      })
      .catch(err => console.error("Watchlist fetch failed:", err));
  }, []);

  // Fetch full analysis data, options analysis, and news feed
  const fetchData = async (tickerSymbol) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    setRawStockData(null);
    setRawOptionsData(null);
    setNewsFeed([]);
    setLoadingOptions(false);
    
    try {
      // 1. Fetch analysis data
      const analysis = await api.analyzeStock(tickerSymbol);
      if (requestId !== requestIdRef.current) return;
      if (analysis && analysis.error) {
        throw new Error(analysis.error);
      }
      setRawStockData(analysis);

      // 2. Fetch options chain in parallel (don't fail the page if options 404s)
      setLoadingOptions(true);
      try {
        const options = await api.getOptions(tickerSymbol);
        if (requestId !== requestIdRef.current) return;
        setRawOptionsData(options);
      } catch (optErr) {
        console.log("No options data available for this ticker");
      } finally {
        if (requestId === requestIdRef.current) {
          setLoadingOptions(false);
        }
      }

      // 3. Fetch live news feed
      try {
        const news = await api.getNews();
        if (requestId !== requestIdRef.current) return;
        if (Array.isArray(news)) {
          setNewsFeed(news);
        }
      } catch (newsErr) {
        console.error("News fetch failed:", newsErr);
      }

    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      console.error(err);
      setError(err.message || 'Unable to fetch stock indicators.');
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData(activeTicker);
  }, [activeTicker]);

  // Handle stock switch
  const handleSelectStock = (symbol) => {
    setSearchQuery('');
    setShowDropdown(false);
    navigate(`/stocks/${encodeURIComponent(symbol)}`);
  };

  // Autocomplete Filter
  const filteredSuggestions = POPULAR_TICKERS.filter(item =>
    item.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Dynamic calculations and normalization to align backend and frontend keys
  let priceChangeVal = rawStockData?.price_change;
  let priceChangePctVal = rawStockData?.price_change_pct;
  
  if (priceChangeVal == null && rawStockData) {
    const hist = rawStockData.history || rawStockData.price_history;
    if (Array.isArray(hist) && hist.length >= 2) {
      const lastPrice = rawStockData.current_price;
      const prevItem = hist[hist.length - 2];
      let prevClose = null;
      if (prevItem.y && Array.isArray(prevItem.y)) {
        prevClose = Number(prevItem.y[3]);
      } else if (prevItem.close != null) {
        prevClose = Number(prevItem.close);
      }
      
      if (prevClose && lastPrice) {
        priceChangeVal = lastPrice - prevClose;
        priceChangePctVal = (priceChangeVal / prevClose) * 100;
      }
    }
  }

  // Final normalized stockData object used in render JSX
  const stockData = rawStockData ? {
    ...rawStockData,
    company_name: rawStockData.name ?? rawStockData.company_name,
    price_change: priceChangeVal,
    price_change_pct: priceChangePctVal
  } : null;

  const signal = stockData?.trade_signal;
  
  const rawPrediction = stockData?.prediction;
  const prediction = rawPrediction ? {
    ...rawPrediction,
    predicted_close: rawPrediction.close ?? rawPrediction.predicted_close,
    predicted_change_pct: rawPrediction.price_range?.upside_pct ?? rawPrediction.predicted_change_pct,
    tv_consensus: rawPrediction.advanced_pipeline?.tradingview_consensus,
    model_predictions: rawPrediction.model_predictions ?? (rawPrediction.advanced_pipeline?.bma_weights ? 
      Object.entries(rawPrediction.advanced_pipeline.bma_weights).map(([name, weight]) => ({
        model_name: name,
        weight: weight
      })) : null)
  } : null;
  
  const tech = stockData?.technicals ?? stockData?.technical_indicators;
  
  const rawMc = stockData?.monte_carlo;
  const mc = rawMc ? {
    ...rawMc,
    lower_bound: rawMc.ci_95_low ?? rawMc.lower_bound,
    expected_price: rawMc.mean_price ?? rawMc.expected_price,
    upper_bound: rawMc.ci_95_high ?? rawMc.upper_bound,
    simulations: rawMc.n_simulations ?? rawMc.simulations
  } : null;

  // Normalize options strategy parameters and avoid rendering object crash
  const optionsData = rawOptionsData ? {
    ...rawOptionsData,
    recommendation: rawOptionsData.recommendation ? {
      ...rawOptionsData.recommendation,
      strategy_name: rawOptionsData.recommendation.strategy ?? rawOptionsData.recommendation.strategy_name,
      reason: rawOptionsData.recommendation.reasoning ?? rawOptionsData.recommendation.reason,
      max_profit: rawOptionsData.recommendation.expected_value_at_target ? `₹${rawOptionsData.recommendation.expected_value_at_target}` : (rawOptionsData.recommendation.max_profit || 'Unlimited'),
      max_loss: rawOptionsData.recommendation.max_loss ? `₹${rawOptionsData.recommendation.max_loss}` : (rawOptionsData.recommendation.max_loss || 'Capped'),
      risk_reward: rawOptionsData.recommendation.risk_reward?.ratio ? `1 : ${rawOptionsData.recommendation.risk_reward.ratio}` : (typeof rawOptionsData.recommendation.risk_reward === 'string' ? rawOptionsData.recommendation.risk_reward : '1 : 2.5')
    } : null
  } : null;

  const fundamentals = stockData?.fundamentals ?? {};
  const upcomingEvents = stockData?.upcoming_events ?? [];
  
  // Extract and default fundamentals metrics to prevent undefined reference crashes
  const marketCap = fundamentals.market_cap ?? 'N/A';
  const pe = fundamentals.pe_ratio ?? fundamentals.pe ?? 'N/A';
  const pb = fundamentals.price_to_book ?? fundamentals.pb ?? 'N/A';
  const roe = fundamentals.return_on_equity ?? fundamentals.roe ?? 'N/A';
  const divYield = fundamentals.dividend_yield ?? fundamentals.dividendYield ?? 'N/A';
  const debtEquity = fundamentals.debt_to_equity ?? fundamentals.debtEquity ?? 'N/A';
  const accuracy = stockData?.accuracy ?? {};
  const performance = stockData?.performance ?? {};
  const chartAnalysis = stockData?.chart_analysis ?? {};

  const avgAccuracy = accuracy.avg ?? accuracy.avg_accuracy ?? 'N/A';
  const maeVal = accuracy.mae ?? 'N/A';
  const rmseVal = accuracy.rmse ?? 'N/A';
  const dirAccuracy = accuracy.direction_accuracy ?? 'N/A';
  const accuracyHistory = (accuracy.history ?? []).map(item => {
    const dateStr = item.day ?? item.date ?? 'N/A';
    const score = item.acc_score ?? (item.predicted && item.actual ? (100 - Math.abs((item.predicted - item.actual) / item.actual) * 100) : 100);
    const errorVal = item.error_pct ?? (100 - score);
    const correctDir = item.correct_direction ?? (score >= 98.0);
    return {
      date: dateStr,
      predicted: item.predicted,
      actual: item.actual,
      error_pct: errorVal,
      correct_direction: correctDir
    };
  });

  const chartData = stockData ? prepareChartData(stockData.history || stockData.price_history, chartType, timeframe) : [];

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6 lg:px-6 xl:px-8">
        <div className="grid grid-cols-1 gap-6 items-start xl:grid-cols-12 xl:gap-8">
          
          {/* ─── LEFT COLUMN: Search & Watchlist Sidebar (lg:col-span-3) ─── */}
          <div className="order-2 space-y-6 xl:order-1 xl:col-span-3">
            
            {/* Search Input Widget */}
            <div className="relative">
              <div className="relative flex items-center bg-white border border-[var(--border-light)] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.02)] px-3.5 py-2.5">
                <Search className="w-4 h-4 text-neutral-400 mr-2.5" />
                <input
                  type="text"
                  placeholder="Search NSE/BSE stocks..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  className="w-full bg-transparent outline-none border-none text-xs font-semibold placeholder-neutral-400 text-[var(--text-primary)]"
                />
                {searchQuery && (
                  <button 
                    onClick={() => { setSearchQuery(''); setShowDropdown(false); }}
                    className="text-xs text-neutral-400 hover:text-neutral-600 font-bold px-1"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Suggestions Dropdown */}
              {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[var(--border-light)] rounded-xl shadow-lg z-30 max-h-64 overflow-y-auto py-2">
                  <div className="px-3 py-1.5 text-[9px] font-mono text-neutral-400 uppercase tracking-wider border-b border-[var(--border-light)] mb-1">
                    Autocomplete Suggestions
                  </div>
                  {filteredSuggestions.length > 0 ? (
                    filteredSuggestions.map((item) => (
                      <button
                        key={item.symbol}
                        onClick={() => handleSelectStock(item.symbol)}
                        className="w-full text-left px-4 py-2 hover:bg-neutral-50 flex items-center justify-between transition-colors"
                      >
                        <div>
                          <p className="text-xs font-bold text-[var(--text-primary)]">{item.symbol.replace('.NS', '')}</p>
                          <p className="text-[10px] text-neutral-400">{item.name}</p>
                        </div>
                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded">
                          {item.sector}
                        </span>
                      </button>
                    ))
                  ) : searchQuery ? (
                    <button
                      onClick={() => handleSelectStock(searchQuery.toUpperCase())}
                      className="w-full text-left px-4 py-3 hover:bg-neutral-50 flex items-center gap-2 text-xs text-[var(--text-primary)] font-bold transition-colors"
                    >
                      Search custom symbol "{searchQuery.toUpperCase()}"
                    </button>
                  ) : null}
                </div>
              )}
            </div>

            {/* Quick Indices & Watchlist */}
            <div className="bg-white border border-[var(--border-light)] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
              <div className="pb-3 border-b border-[var(--border-light)] flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-widest">NIFTY WATCHLIST</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {tickerList.length > 0 ? (
                  tickerList.map((tick) => (
                    <button
                      key={tick.symbol}
                      onClick={() => handleSelectStock(tick.symbol === 'NSEI' ? '^NSEI' : tick.symbol === 'BSESN' ? '^BSESN' : tick.symbol + '.NS')}
                      className={`w-full p-2.5 rounded-lg border text-left flex items-center justify-between transition-all hover:scale-102 ${
                        activeTicker.replace('.NS', '').replace('^', '') === tick.symbol 
                          ? 'border-[var(--text-primary)] bg-neutral-50 font-bold' 
                          : 'border-transparent hover:bg-neutral-50/50'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold text-[var(--text-primary)]">{tick.symbol}</p>
                        <p className="text-[9px] text-neutral-400 font-mono">Spot Rate</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-[var(--text-primary)]">{formatPrice(tick.price, tick.symbol)}</p>
                        <p className={`text-[10px] font-semibold font-mono ${tick.change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {formatPct(tick.change)}
                        </p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* ─── RIGHT COLUMN: Charts, News, & AI Predictions (lg:col-span-9) ─── */}
          <div className="order-1 min-w-0 space-y-6 xl:order-2 xl:col-span-9">

            {/* Error view */}
            {error ? (
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-8 text-center space-y-4">
                <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
                <h3 className="text-sm font-bold text-rose-800 uppercase tracking-wider">Analysis pipeline error</h3>
                <p className="text-xs text-rose-600 max-w-md mx-auto">{error}</p>
                <button
                  onClick={() => fetchData(activeTicker)}
                  className="px-5 py-2.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retry Fetch
                </button>
              </div>
            ) : (
              <>
                {/* 1. Header Information Block */}
                <div className="rounded-xl border border-[var(--border-light)] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                  {loading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-6 w-48" />
                      <Skeleton className="h-10 w-32" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ) : (
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2.5">
                          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] leading-none">
                            {stockData?.company_name || activeTicker}
                          </h1>
                          <span className="px-2 py-0.5 rounded bg-neutral-100 text-[10px] font-mono font-bold text-[var(--text-secondary)] uppercase tracking-wider border border-[var(--border-light)]">
                            {stockData?.ticker || activeTicker}
                          </span>
                        </div>

                        <div className="flex items-end gap-3 flex-wrap pt-1">
                          <span className="text-3xl sm:text-4xl font-bold font-mono text-[var(--text-primary)] leading-none tracking-tight">
                            {formatPrice(stockData?.current_price, activeTicker)}
                          </span>
                          
                          {stockData?.price_change != null && (
                            <span className={`inline-flex items-center gap-0.5 px-2.5 py-1 rounded text-xs font-bold leading-none font-mono ${changeBg(stockData.price_change)} ${changeColor(stockData.price_change)}`}>
                              {Number(stockData.price_change) >= 0 ? '+' : ''}
                              {Number(stockData.price_change).toFixed(2)} ({formatPct(stockData.price_change_pct)})
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col md:items-end gap-4">
                        {/* Target Price Highlight */}
                        {prediction?.predicted_close != null && (
                          <div className="bg-gradient-to-r from-[var(--accent-brand)] to-blue-700 text-white px-4 py-2.5 rounded-lg shadow-sm border border-blue-800 flex items-center gap-3">
                            <div>
                              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-blue-100 opacity-90">AI Target Close</p>
                              <p className="text-2xl font-bold font-mono leading-none mt-1 shadow-sm">{formatPrice(prediction.predicted_close, activeTicker)}</p>
                            </div>
                            {prediction.predicted_change_pct != null && (
                              <div className={`px-2 py-1 rounded text-xs font-bold font-mono ${prediction.predicted_change_pct >= 0 ? 'bg-emerald-500/20 text-emerald-100' : 'bg-rose-500/20 text-rose-100'}`}>
                                {formatPct(prediction.predicted_change_pct)}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Trade Signal Badge */}
                        {signal?.action && (
                          <div className="flex flex-col md:items-end gap-1.5">
                            <SignalBadge signal={signal.action} confidence={signal.confidence} />
                            <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest">REAL-TIME FORECAST SIGNAL</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Tabs Navigation */}
                <div className="flex gap-3 overflow-x-auto border-b border-[var(--border-light)] pb-px text-sm font-medium sm:gap-6">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`pb-3.5 border-b-2 font-bold tracking-tight uppercase text-xs transition-all flex items-center gap-2 whitespace-nowrap ${
                      activeTab === 'overview'
                        ? 'border-[var(--accent-brand)] text-[var(--accent-brand)]'
                        : 'border-transparent text-neutral-400 hover:text-neutral-600'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" /> Overview & Charts
                  </button>
                  <button
                    onClick={() => setActiveTab('technicals')}
                    className={`pb-3.5 border-b-2 font-bold tracking-tight uppercase text-xs transition-all flex items-center gap-2 whitespace-nowrap ${
                      activeTab === 'technicals'
                        ? 'border-[var(--accent-brand)] text-[var(--accent-brand)]'
                        : 'border-transparent text-neutral-400 hover:text-neutral-600'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" /> Advanced Technicals
                  </button>
                  <button
                    onClick={() => setActiveTab('fundamentals')}
                    className={`pb-3.5 border-b-2 font-bold tracking-tight uppercase text-xs transition-all flex items-center gap-2 whitespace-nowrap ${
                      activeTab === 'fundamentals'
                        ? 'border-[var(--accent-brand)] text-[var(--accent-brand)]'
                        : 'border-transparent text-neutral-400 hover:text-neutral-600'
                    }`}
                  >
                    <Coins className="w-4 h-4" /> Key Fundamentals
                  </button>
                  <button
                    onClick={() => setActiveTab('accuracy')}
                    className={`pb-3.5 border-b-2 font-bold tracking-tight uppercase text-xs transition-all flex items-center gap-2 whitespace-nowrap ${
                      activeTab === 'accuracy'
                        ? 'border-[var(--accent-brand)] text-[var(--accent-brand)]'
                        : 'border-transparent text-neutral-400 hover:text-neutral-600'
                    }`}
                  >
                    <Award className="w-4 h-4" /> Backtests & Accuracy
                  </button>
                </div>

                {/* Tab Content Panel */}
                {activeTab === 'overview' && (
                  <div className="space-y-6 mt-2">
                    <div className={isChartFullscreen ? "fixed inset-0 z-[100] flex flex-col bg-neutral-900/50 p-2 backdrop-blur-sm sm:p-6 md:p-12" : ""}>
                      <SectionCard
                        title="Interactive Price Chart"
                        className={isChartFullscreen ? "flex-1 flex flex-col shadow-2xl border-none ring-1 ring-black/5" : ""}
                        contentClassName={isChartFullscreen ? "flex-1 min-h-0 relative" : ""}
                        icon={BarChart3}
                        rightAction={
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                            <div className="flex rounded border border-[var(--border-light)] overflow-hidden bg-neutral-50 p-0.5">
                              <button
                                onClick={() => setChartType('candlestick')}
                                className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-colors ${
                                  chartType === 'candlestick' ? 'bg-white text-[var(--text-primary)] shadow-sm' : 'text-neutral-400 hover:text-neutral-600'
                                }`}
                              >
                                Candle
                              </button>
                              <button
                                onClick={() => setChartType('area')}
                                className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-colors ${
                                  chartType === 'area' ? 'bg-white text-[var(--text-primary)] shadow-sm' : 'text-neutral-400 hover:text-neutral-600'
                                }`}
                              >
                                Line
                              </button>
                            </div>
                            <div className="flex items-center gap-1.5 border-l border-[var(--border-light)] pl-3 sm:pl-4">
                              {['1W', '1M', '1Y', 'all'].map((tf) => (
                                <button
                                  key={tf}
                                  onClick={() => setTimeframe(tf)}
                                  className={`px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded transition-all ${
                                    timeframe === tf ? 'bg-[var(--text-primary)] text-white font-bold' : 'text-neutral-400 hover:bg-neutral-50 hover:text-neutral-600'
                                  }`}
                                >
                                  {tf}
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={() => setIsChartFullscreen(!isChartFullscreen)}
                              className="ml-1 rounded p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-[var(--text-primary)] sm:ml-2"
                            >
                              {isChartFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                            </button>
                          </div>
                        }
                      >
                        {loading ? (
                          <Skeleton className="h-full w-full min-h-[320px]" />
                        ) : chartData.length > 0 ? (
                          <div className={isChartFullscreen ? "absolute inset-0" : "h-80 w-full relative"}>
                            <PriceChart data={chartData} type={chartType === 'candlestick' ? 'candlestick' : 'area'} height={isChartFullscreen ? '100%' : 320} />
                          </div>
                        ) : (
                          <div className="py-20 text-center text-neutral-400 text-xs font-mono">
                            No price history data points processed for this ticker.
                          </div>
                        )}
                      </SectionCard>
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      {/* Prediction panel */}
                      <SectionCard title="AI Predictive Core" icon={Cpu}>
                        {loading ? (
                          <div className="space-y-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-16 w-full" />
                          </div>
                        ) : prediction ? (
                          <div className="space-y-6">
                            <div>
                              <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest mb-1.5">Target Close (Tomorrow)</p>
                              <p className="text-3xl font-bold font-mono text-[var(--text-primary)] leading-none tracking-tight">
                                {formatPrice(prediction.predicted_close, activeTicker)}
                              </p>
                              {prediction.predicted_change_pct != null && (
                                <p className={`text-xs font-bold font-mono mt-2 ${changeColor(prediction.predicted_change_pct)}`}>
                                  {formatPct(prediction.predicted_change_pct)} expected change tomorrow
                                </p>
                              )}
                            </div>

                            {prediction.tv_consensus && prediction.tv_consensus.summary && (
                              <div className="border-t border-[var(--border-light)] pt-4 space-y-2">
                                <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">TradingView Consensus</p>
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-1 rounded text-[10px] font-bold font-mono ${prediction.tv_consensus.summary.RECOMMENDATION.includes('BUY') ? 'bg-emerald-50 text-emerald-700' : prediction.tv_consensus.summary.RECOMMENDATION.includes('SELL') ? 'bg-rose-50 text-rose-700' : 'bg-neutral-100 text-neutral-700'}`}>
                                    {prediction.tv_consensus.summary.RECOMMENDATION.replace('_', ' ')}
                                  </span>
                                  <span className="text-xs font-mono text-neutral-500">
                                    (Buy: {prediction.tv_consensus.summary.BUY}, Sell: {prediction.tv_consensus.summary.SELL}, Neutral: {prediction.tv_consensus.summary.NEUTRAL})
                                  </span>
                                </div>
                              </div>
                            )}

                            {prediction.model_predictions ? (
                              <div className="border-t border-[var(--border-light)] pt-4 space-y-3">
                                <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">Model Ensemble Weights</p>
                                <div className="grid grid-cols-1 gap-2 text-[10px] font-mono sm:grid-cols-2">
                                  {prediction.model_predictions.map((m, idx) => (
                                    <div key={idx} className="p-2 border border-[var(--border-light)] bg-neutral-50/50 rounded-lg">
                                      <p className="font-bold text-[var(--text-primary)] capitalize">{m.model_name.replace('_', ' ')}</p>
                                      <p className="text-neutral-400 text-[9px] mt-0.5">Weight: {(m.weight * 100).toFixed(1)}%</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <p className="text-neutral-400 text-[10px] font-mono">No sub-model details available.</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-neutral-400 text-xs font-mono text-center py-6">No target models registered.</p>
                        )}
                      </SectionCard>

                      {/* Options recommendations */}
                      <SectionCard title="Options strategy advisor" icon={Coins}>
                        {loadingOptions ? (
                          <div className="space-y-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-16 w-full" />
                          </div>
                        ) : optionsData?.recommendation ? (
                          <div className="space-y-5">
                            <div className="p-4 rounded-xl bg-neutral-50 border border-[var(--border-light)] text-left space-y-2">
                              <span className="px-2 py-0.5 rounded bg-[var(--text-primary)] text-white text-[9px] font-mono font-bold uppercase tracking-widest">
                                RECOMMENDED STRATEGY
                              </span>
                              <h4 className="font-bold text-sm text-[var(--text-primary)]">{optionsData.recommendation.strategy_name}</h4>
                              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{optionsData.recommendation.reason}</p>
                            </div>

                            <div className="grid grid-cols-1 gap-3 text-xs font-mono sm:grid-cols-2">
                              <div className="p-2.5 rounded border border-[var(--border-light)] bg-white">
                                <span className="text-[10px] text-neutral-400 uppercase">Max profit</span>
                                <p className="font-bold text-emerald-600 mt-1">{optionsData.recommendation.max_profit || 'Unlimited'}</p>
                              </div>
                              <div className="p-2.5 rounded border border-[var(--border-light)] bg-white">
                                <span className="text-[10px] text-neutral-400 uppercase">Max loss</span>
                                <p className="font-bold text-rose-600 mt-1">{optionsData.recommendation.max_loss || 'Capped'}</p>
                              </div>
                            </div>

                            {optionsData.recommendation.risk_reward && (
                              <div className="flex items-center justify-between text-xs border-t border-[var(--border-light)] pt-3 font-mono">
                                <span className="text-neutral-400 uppercase">Risk-Reward ratio</span>
                                <span className="font-bold text-[var(--text-primary)]">{optionsData.recommendation.risk_reward}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="py-8 text-center space-y-2">
                            <Lock className="w-5 h-5 text-neutral-400 mx-auto" />
                            <p className="text-neutral-400 text-xs font-mono">No recommended options strategy found for this ticker asset.</p>
                            <p className="text-[10px] text-neutral-400">Options recommendations are generated during active trend indicators.</p>
                          </div>
                        )}
                      </SectionCard>
                    </div>

                    {/* Monte Carlo Simulation */}
                    {mc && mc.sample_paths && (
                      <div className="w-full">
                        <MonteCarloChart data={mc} />
                      </div>
                    )}

                    {/* News Sentiment */}
                    <SectionCard title="Live Market News & Sentiment Analyser" icon={Newspaper}>
                      {loading ? (
                        <div className="space-y-4">
                          {[1, 2].map(i => (
                            <div key={i} className="flex gap-4">
                              <Skeleton className="h-16 w-full" />
                            </div>
                          ))}
                        </div>
                      ) : newsFeed.length > 0 ? (
                        <div className="space-y-4.5 max-h-96 overflow-y-auto pr-1">
                          {newsFeed.map((item, index) => (
                            <a
                              key={index}
                              href={item.link || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block p-3.5 rounded-lg border border-[var(--border-light)] hover:border-neutral-400 hover:shadow-sm bg-white transition-all text-left space-y-2 group"
                            >
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-[9px] font-mono font-bold text-neutral-400 uppercase tracking-widest">
                                  {item.source} · {item.timestamp}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider border ${
                                  item.sentiment === 'Bullish'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : item.sentiment === 'Bearish'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : 'bg-neutral-50 text-neutral-600 border-neutral-200'
                                }`}>
                                  {item.sentiment} ({item.score || 50}%)
                                </span>
                              </div>
                              <h4 className="font-bold text-xs text-[var(--text-primary)] leading-tight group-hover:text-black transition-colors">
                                {item.headline}
                              </h4>
                              {item.summary && (
                                <p className="text-[10px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                                  {item.summary}
                                </p>
                              )}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <div className="py-12 text-center text-neutral-400 text-xs font-mono">
                          No news feed registered for this ticker asset.
                        </div>
                      )}
                    </SectionCard>
                  </div>
                )}

                {activeTab === 'technicals' && (
                  <div className="space-y-6 mt-2">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      {/* Support & Resistance Card */}
                      <SectionCard title="Chart Pattern & Range Boundaries" icon={TrendingUp}>
                        <div className="space-y-6 text-xs font-mono">
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="p-3 border border-[var(--border-light)] bg-rose-50/20 rounded-lg">
                              <span className="text-[9px] text-rose-600 uppercase font-bold tracking-wider">Support Level</span>
                              <p className="text-base font-bold text-rose-700 mt-1">
                                {chartAnalysis.support_level ? formatPrice(chartAnalysis.support_level, activeTicker) : 'N/A'}
                              </p>
                              {chartAnalysis.distance_to_support != null && (
                                <p className="text-[9px] text-neutral-400 mt-1">
                                  Distance: {Number(chartAnalysis.distance_to_support).toFixed(2)}%
                                </p>
                              )}
                            </div>
                            <div className="p-3 border border-[var(--border-light)] bg-emerald-50/20 rounded-lg">
                              <span className="text-[9px] text-emerald-600 uppercase font-bold tracking-wider">Resistance Level</span>
                              <p className="text-base font-bold text-emerald-700 mt-1">
                                {chartAnalysis.resistance_level ? formatPrice(chartAnalysis.resistance_level, activeTicker) : 'N/A'}
                              </p>
                              {chartAnalysis.distance_to_resistance != null && (
                                <p className="text-[9px] text-neutral-400 mt-1">
                                  Distance: {Number(chartAnalysis.distance_to_resistance).toFixed(2)}%
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Range gauge bar */}
                          {chartAnalysis.support_level && chartAnalysis.resistance_level && (
                            <div className="space-y-1.5 pt-2">
                              <div className="flex justify-between text-[9px] text-neutral-400">
                                <span>SUPPORT</span>
                                <span>CURRENT PRICE</span>
                                <span>RESISTANCE</span>
                              </div>
                              <div className="h-2 rounded bg-neutral-100 relative overflow-hidden border border-neutral-200">
                                <div 
                                  className="h-full bg-[var(--accent-brand)] rounded" 
                                  style={{
                                    width: `${Math.min(100, Math.max(0, 
                                      ((stockData?.current_price - chartAnalysis.support_level) / (chartAnalysis.resistance_level - chartAnalysis.support_level)) * 100
                                    ))}%`
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Insights list */}
                          {chartAnalysis.insights && chartAnalysis.insights.length > 0 && (
                            <div className="border-t border-[var(--border-light)] pt-4 space-y-2">
                              <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest">Chart Analysis Insights</span>
                              <ul className="list-disc list-inside space-y-1 text-neutral-600 text-[10px] leading-relaxed">
                                {chartAnalysis.insights.map((ins, idx) => (
                                  <li key={idx} className="marker:text-[var(--accent-brand)]">{ins}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </SectionCard>

                      {/* GARCH & Kalman Volatility watch */}
                      <SectionCard title="Volatility Regime & VIX Watch" icon={Shield}>
                        <div className="space-y-4 font-mono text-xs">
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="p-3 border border-[var(--border-light)] bg-neutral-50 rounded-lg">
                              <span className="text-[9px] text-neutral-400 uppercase">GARCH Volatility</span>
                              <p className="font-bold text-[var(--text-primary)] mt-1">
                                {prediction?.advanced_pipeline?.garch_vol ? `${(prediction.advanced_pipeline.garch_vol * 100).toFixed(2)}%` : 'N/A'}
                              </p>
                            </div>
                            <div className="p-3 border border-[var(--border-light)] bg-neutral-50 rounded-lg">
                              <span className="text-[9px] text-neutral-400 uppercase">Regime Shift (ADX)</span>
                              <p className={`font-bold mt-1 uppercase ${prediction?.market_regime === 'BEAR_VOLATILE' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {prediction?.market_regime || 'NORMAL'}
                              </p>
                            </div>
                            <div className="p-3 border border-[var(--border-light)] bg-neutral-50 rounded-lg">
                              <span className="text-[9px] text-neutral-400 uppercase">VIX Index Level</span>
                              <p className="font-bold text-[var(--text-primary)] mt-1">
                                {prediction?.vix_level ? Number(prediction.vix_level).toFixed(2) : 'N/A'}
                              </p>
                            </div>
                            <div className="p-3 border border-[var(--border-light)] bg-neutral-50 rounded-lg">
                              <span className="text-[9px] text-neutral-400 uppercase">Confidence Coeff</span>
                              <p className="font-bold text-[var(--text-primary)] mt-1">
                                {prediction?.confidence_multiplier ? `x${Number(prediction.confidence_multiplier).toFixed(2)}` : 'x1.00'}
                              </p>
                            </div>
                          </div>

                          <div className="border-t border-[var(--border-light)] pt-3.5 space-y-2">
                            <div className="flex justify-between text-[10px]">
                              <span className="text-neutral-400 uppercase">Kalman Adjusted Price</span>
                              <span className="font-bold text-[var(--text-primary)]">
                                {prediction?.kalman_price ? formatPrice(prediction.kalman_price, activeTicker) : 'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between text-[10px]">
                              <span className="text-neutral-400 uppercase">Systemic Correction Bias</span>
                              <span className={`font-bold ${Number(prediction?.correction_bias || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {prediction?.correction_bias ? `${Number(prediction.correction_bias).toFixed(2)}%` : '0.00%'}
                              </span>
                            </div>
                            <div className="flex justify-between text-[10px]">
                              <span className="text-neutral-400 uppercase">Intraday Live Adjustment</span>
                              <span className={`font-bold ${prediction?.live_adjusted ? 'text-emerald-600' : 'text-neutral-400'}`}>
                                {prediction?.intraday_adjustment ? formatPrice(prediction.intraday_adjustment, activeTicker) : 'None'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </SectionCard>
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      {/* Technical Indicators List */}
                      <SectionCard title="Technical indicators log" icon={Activity}>
                        {tech && Object.keys(tech).length > 0 ? (
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {Object.entries(tech).map(([key, val]) => (
                              <div key={key} className="p-3 rounded-lg border border-[var(--border-light)] bg-neutral-50/30 flex items-center justify-between">
                                <span className="text-[9px] font-mono font-bold text-neutral-400 uppercase tracking-wide">
                                  {key.replace(/_/g, ' ')}
                                </span>
                                <span className="text-xs font-bold text-[var(--text-primary)] font-mono">
                                  {typeof val === 'number' ? val.toFixed(2) : String(val)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-neutral-400 text-xs font-mono text-center py-6">No indicators found.</p>
                        )}
                      </SectionCard>

                      {/* Monte Carlo Simulator */}
                      <SectionCard title="Monte Carlo Range Simulator" icon={Shield}>
                        {mc ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-2 text-center font-mono sm:grid-cols-3">
                              <div className="p-3.5 border border-[var(--border-light)] bg-neutral-50/50 rounded-lg">
                                <span className="text-[9px] text-neutral-400 uppercase">Lower Bound</span>
                                <p className="text-sm font-bold text-rose-600 mt-1">{formatPrice(mc.lower_bound, activeTicker)}</p>
                              </div>
                              <div className="p-3.5 border border-[var(--border-light)] bg-neutral-50/50 rounded-lg">
                                <span className="text-[9px] text-neutral-400 uppercase">Expectation</span>
                                <p className="text-sm font-bold text-[var(--text-primary)] mt-1">{formatPrice(mc.expected_price, activeTicker)}</p>
                              </div>
                              <div className="p-3.5 border border-[var(--border-light)] bg-emerald-50 border-emerald-100 rounded-lg">
                                <span className="text-[9px] text-emerald-600 uppercase">Upper Bound</span>
                                <p className="text-sm font-bold text-emerald-600 mt-1">{formatPrice(mc.upper_bound, activeTicker)}</p>
                              </div>
                            </div>

                            <div className="text-[10px] font-mono text-neutral-400 text-center border-t border-[var(--border-light)] pt-3">
                              Based on {Number(mc.simulations || 5000).toLocaleString()} probability path simulations.
                            </div>
                          </div>
                        ) : (
                          <p className="text-neutral-400 text-xs font-mono text-center py-6">No simulations log found.</p>
                        )}
                      </SectionCard>
                    </div>
                  </div>
                )}

                {activeTab === 'fundamentals' && (
                  <div className="space-y-6 mt-2">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                      {/* Summary Fundamentals cards */}
                      <div className="md:col-span-2">
                        <SectionCard title="Equity Fundamentals & Ratios" icon={Coins}>
                          <div className="grid grid-cols-1 gap-4 text-xs font-mono sm:grid-cols-2 lg:grid-cols-3">
                            <div className="p-3 border border-[var(--border-light)] rounded-xl bg-neutral-50/30">
                              <span className="text-[9px] text-neutral-400 uppercase">Market Capitalization</span>
                              <p className="text-sm font-bold text-[var(--text-primary)] mt-1">{marketCap}</p>
                            </div>
                            <div className="p-3 border border-[var(--border-light)] rounded-xl bg-neutral-50/30">
                              <span className="text-[9px] text-neutral-400 uppercase">Price-to-Earnings (P/E)</span>
                              <p className="text-sm font-bold text-[var(--text-primary)] mt-1">{typeof pe === 'number' ? pe.toFixed(2) : pe}</p>
                            </div>
                            <div className="p-3 border border-[var(--border-light)] rounded-xl bg-neutral-50/30">
                              <span className="text-[9px] text-neutral-400 uppercase">Price-to-Book (P/B)</span>
                              <p className="text-sm font-bold text-[var(--text-primary)] mt-1">{typeof pb === 'number' ? pb.toFixed(2) : pb}</p>
                            </div>
                            <div className="p-3 border border-[var(--border-light)] rounded-xl bg-neutral-50/30">
                              <span className="text-[9px] text-neutral-400 uppercase">Return on Equity (ROE)</span>
                              <p className="text-sm font-bold text-[var(--text-primary)] mt-1">{typeof roe === 'number' ? `${roe.toFixed(2)}%` : roe}</p>
                            </div>
                            <div className="p-3 border border-[var(--border-light)] rounded-xl bg-neutral-50/30">
                              <span className="text-[9px] text-neutral-400 uppercase">Dividend Yield</span>
                              <p className="text-sm font-bold text-[var(--text-primary)] mt-1">{typeof divYield === 'number' ? `${divYield.toFixed(2)}%` : divYield}</p>
                            </div>
                            <div className="p-3 border border-[var(--border-light)] rounded-xl bg-neutral-50/30">
                              <span className="text-[9px] text-neutral-400 uppercase">Debt-to-Equity Ratio</span>
                              <p className="text-sm font-bold text-[var(--text-primary)] mt-1">{typeof debtEquity === 'number' ? debtEquity.toFixed(2) : debtEquity}</p>
                            </div>
                            <div className="p-3 border border-[var(--border-light)] rounded-xl bg-neutral-50/30">
                              <span className="text-[9px] text-neutral-400 uppercase">Earnings Per Share (EPS)</span>
                              <p className="text-sm font-bold text-[var(--text-primary)] mt-1">
                                {fundamentals.eps != null ? `₹${fundamentals.eps}` : (fundamentals.eps_annualized != null ? `₹${fundamentals.eps_annualized}` : 'N/A')}
                              </p>
                            </div>
                            <div className="p-3 border border-[var(--border-light)] rounded-xl bg-neutral-50/30">
                              <span className="text-[9px] text-neutral-400 uppercase">Quick Liquidity Ratio</span>
                              <p className="text-sm font-bold text-[var(--text-primary)] mt-1">{fundamentals.quick_ratio ?? fundamentals.current_ratio ?? 'N/A'}</p>
                            </div>
                            <div className="p-3 border border-[var(--border-light)] rounded-xl bg-neutral-50/30">
                              <span className="text-[9px] text-neutral-400 uppercase">Profit Margin (Net)</span>
                              <p className="text-sm font-bold text-[var(--text-primary)] mt-1">
                                {fundamentals.profit_margin != null ? `${(fundamentals.profit_margin * 100).toFixed(2)}%` : 'N/A'}
                              </p>
                            </div>
                          </div>
                        </SectionCard>
                      </div>

                      {/* Upcoming Events card */}
                      <div className="md:col-span-1">
                        <SectionCard title="Corporate Events" icon={Calendar}>
                          {upcomingEvents.length > 0 ? (
                            <div className="space-y-3 font-mono text-xs">
                              {upcomingEvents.map((evt, idx) => (
                                <div key={idx} className="p-3 rounded-lg border border-[var(--border-light)] bg-white text-left space-y-1.5">
                                  <div className="flex justify-between items-center">
                                    <span className="px-2 py-0.5 rounded bg-[var(--accent-brand-light)] text-[var(--accent-brand)] text-[8px] font-bold uppercase tracking-wider">
                                      {evt.type || 'Event'}
                                    </span>
                                    <span className="text-[10px] text-neutral-400">{evt.date}</span>
                                  </div>
                                  <p className="font-bold text-[var(--text-primary)] leading-tight">{evt.description ?? `${evt.type} Announcement`}</p>
                                  {evt.days_until != null && (
                                    <p className="text-[9px] text-neutral-400">
                                      Remaining: <span className="font-bold text-[var(--text-primary)]">{evt.days_until} days</span>
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="py-12 text-center text-neutral-400 text-xs font-mono">
                              No upcoming corporate events detected.
                            </div>
                          )}
                        </SectionCard>
                      </div>
                    </div>

                    {/* Analyst target ranges */}
                    {fundamentals.analyst_target_mean && (
                      <SectionCard title="Analyst Targets vs Current Price" icon={Target}>
                        <div className="space-y-4 font-mono text-xs">
                          <div className="grid grid-cols-1 gap-2 text-center sm:grid-cols-2 md:grid-cols-4">
                            <div className="p-3.5 border border-[var(--border-light)] bg-neutral-50/50 rounded-lg">
                              <span className="text-[9px] text-neutral-400 uppercase">Low target</span>
                              <p className="text-sm font-bold text-rose-600 mt-1">{formatPrice(fundamentals.analyst_target_low, activeTicker)}</p>
                            </div>
                            <div className="p-3.5 border border-[var(--border-light)] bg-neutral-50/50 rounded-lg">
                              <span className="text-[9px] text-neutral-400 uppercase font-bold text-[var(--accent-brand)]">Current Price</span>
                              <p className="text-sm font-bold text-[var(--accent-brand)] mt-1">{formatPrice(stockData?.current_price, activeTicker)}</p>
                            </div>
                            <div className="p-3.5 border border-[var(--border-light)] bg-neutral-50/50 rounded-lg">
                              <span className="text-[9px] text-neutral-400 uppercase">Mean Target</span>
                              <p className="text-sm font-bold text-[var(--text-primary)] mt-1">{formatPrice(fundamentals.analyst_target_mean, activeTicker)}</p>
                            </div>
                            <div className="p-3.5 border border-[var(--border-light)] bg-neutral-50/50 rounded-lg">
                              <span className="text-[9px] text-neutral-400 uppercase">High Target</span>
                              <p className="text-sm font-bold text-emerald-600 mt-1">{formatPrice(fundamentals.analyst_target_high, activeTicker)}</p>
                            </div>
                          </div>

                          {/* visual progress targets */}
                          <div className="space-y-1.5 pt-2">
                            <div className="flex justify-between text-[9px] text-neutral-400">
                              <span>LOW: {formatPrice(fundamentals.analyst_target_low, activeTicker)}</span>
                              <span>MEAN: {formatPrice(fundamentals.analyst_target_mean, activeTicker)}</span>
                              <span>HIGH: {formatPrice(fundamentals.analyst_target_high, activeTicker)}</span>
                            </div>
                            <div className="h-2 rounded bg-neutral-100 relative overflow-hidden border border-neutral-200">
                              <div 
                                className="h-full bg-emerald-500 rounded" 
                                style={{
                                  width: `${Math.min(100, Math.max(0, 
                                    ((stockData?.current_price - fundamentals.analyst_target_low) / (fundamentals.analyst_target_high - fundamentals.analyst_target_low)) * 100
                                  ))}%`
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </SectionCard>
                    )}
                  </div>
                )}

                {activeTab === 'accuracy' && (
                  <div className="space-y-6 mt-2">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
                      {/* Metrics Cards */}
                      <div className="p-4 rounded-xl border border-[var(--border-light)] bg-white text-center font-mono space-y-1">
                        <span className="text-[9px] text-neutral-400 uppercase">Walker backtest accuracy</span>
                        <p className="text-2xl font-bold text-[var(--text-primary)]">{avgAccuracy !== 'N/A' ? `${avgAccuracy}%` : 'N/A'}</p>
                      </div>
                      <div className="p-4 rounded-xl border border-[var(--border-light)] bg-white text-center font-mono space-y-1">
                        <span className="text-[9px] text-neutral-400 uppercase">Directional Success</span>
                        <p className="text-2xl font-bold text-[var(--text-primary)]">{dirAccuracy !== 'N/A' ? `${dirAccuracy}%` : 'N/A'}</p>
                      </div>
                      <div className="p-4 rounded-xl border border-[var(--border-light)] bg-white text-center font-mono space-y-1">
                        <span className="text-[9px] text-neutral-400 uppercase">Mean Abs Error (MAE)</span>
                        <p className="text-2xl font-bold text-[var(--text-primary)]">{maeVal}</p>
                      </div>
                      <div className="p-4 rounded-xl border border-[var(--border-light)] bg-white text-center font-mono space-y-1">
                        <span className="text-[9px] text-neutral-400 uppercase">RMSE Score</span>
                        <p className="text-2xl font-bold text-[var(--text-primary)]">{rmseVal}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                      {/* Walk forward backtest log */}
                      <div className="md:col-span-2">
                        <SectionCard title="Walk-Forward backtest log (Last 20 Days)" icon={Award}>
                          {accuracyHistory.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left font-mono text-xs">
                                <thead>
                                  <tr className="border-b border-[var(--border-light)] pb-2 text-[10px] text-neutral-400 uppercase">
                                    <th className="py-2.5 font-bold">Date</th>
                                    <th className="py-2.5 font-bold">Predicted Close</th>
                                    <th className="py-2.5 font-bold">Actual Close</th>
                                    <th className="py-2.5 font-bold">Absolute Error</th>
                                    <th className="py-2.5 font-bold">Direction</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border-light)]">
                                  {accuracyHistory.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-neutral-50/50 transition-colors">
                                      <td className="py-2.5 text-neutral-500">{item.date}</td>
                                      <td className="py-2.5 font-bold text-[var(--text-primary)]">{formatPrice(item.predicted, activeTicker)}</td>
                                      <td className="py-2.5 font-bold text-[var(--text-primary)]">{formatPrice(item.actual, activeTicker)}</td>
                                      <td className="py-2.5 text-neutral-500">
                                        {item.error_pct != null ? `${Number(item.error_pct).toFixed(2)}%` : 'N/A'}
                                      </td>
                                      <td className="py-2.5">
                                        {item.correct_direction ? (
                                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-bold uppercase">
                                            Correct
                                          </span>
                                        ) : (
                                          <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[9px] font-bold uppercase">
                                            Miss
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="py-12 text-center text-neutral-400 text-xs font-mono">
                              No backtest run registered for this ticker asset.
                            </div>
                          )}
                        </SectionCard>
                      </div>

                      {/* Historical Returns / performance */}
                      <div className="md:col-span-1">
                        <SectionCard title="Equity Return Yields" icon={TrendingUp}>
                          {performance && Object.keys(performance).length > 0 ? (
                            <div className="space-y-2.5 font-mono text-xs">
                              {Object.entries(performance).map(([period, val]) => (
                                <div key={period} className="flex justify-between items-center p-3.5 border border-[var(--border-light)] bg-neutral-50/20 rounded-xl">
                                  <span className="text-[10px] text-neutral-400 uppercase font-bold">{period} Return</span>
                                  <span className={`font-bold ${Number(val) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {Number(val) >= 0 ? '+' : ''}
                                    {Number(val).toFixed(2)}%
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="py-12 text-center text-neutral-400 text-xs font-mono">
                              No performance history yields found.
                            </div>
                          )}
                        </SectionCard>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

          </div>

        </div>
      </div>
    </AppLayout>
  );
}
