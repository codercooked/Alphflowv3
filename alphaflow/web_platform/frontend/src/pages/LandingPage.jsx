import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  ArrowRight,
  Menu,
  X,
  Brain,
  Cpu,
  CalendarClock,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Server,
  Zap,
  Globe,
  CheckCircle,
  Copy,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Lock,
} from 'lucide-react';

// Custom Intersection Observer Hook
function useIntersection(threshold = 0.15) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const current = ref.current;
    if (!current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
        }
      },
      { threshold }
    );

    observer.observe(current);
    return () => {
      if (current) {
        observer.unobserve(current);
      }
    };
  }, [threshold]);

  return [ref, isIntersecting];
}

// Reusable Slide Animation Wrapper with Bouncing Next Button
const SlideWrapper = ({ id, nextId, children, className = "" }) => {
  const [ref, isVisible] = useIntersection(0.15);
  return (
    <section
      ref={ref}
      id={id}
      className={`${className} relative`}
    >
      <div className={`w-full flex-grow flex flex-col ${id === 'hero' ? 'justify-between' : 'justify-center'} transition-all duration-1000 ease-out transform ${
        isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-[0.98] pointer-events-none'
      }`}>
        {children}
      </div>

      {nextId && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden lg:flex flex-col items-center gap-1 opacity-60 hover:opacity-100 transition-opacity z-20">
          <button
            onClick={() => document.getElementById(nextId)?.scrollIntoView({ behavior: 'smooth' })}
            className="p-2 rounded-full border border-[var(--border-light)] bg-white/80 hover:bg-white shadow-sm hover:scale-105 active:scale-95 transition-all animate-bounce"
            title="Next Slide"
          >
            <ChevronDown className="w-4.5 h-4.5 text-[var(--text-primary)]" />
          </button>
        </div>
      )}
    </section>
  );
};

const TESTIMONIALS = [
  {
    id: '01',
    quote: "AlphaFlow transformed our quant research pipeline. What used to take hours of manual technical analysis now happens instantly with institutional-grade forecast confidence.",
    author: "Sarah Chen",
    role: "Head of Quant Research, Meridian Capital",
    result: "10x faster backtesting"
  },
  {
    id: '02',
    quote: "The self-correcting feedback loop is a game-changer. Seeing the bias adjust in real time gives us unprecedented accuracy for Nifty 50 positions.",
    author: "Rajesh Iyer",
    role: "Chief Trading Officer, Vertex Alpha",
    result: "99.2% directional accuracy"
  },
  {
    id: '03',
    quote: "Integrating AlphaFlow into our quantitative execution models via their Python SDK was seamless. Type-safe, edge-ready, and incredibly fast.",
    author: "Marcus Vance",
    role: "Lead Portfolio Manager, Flux Quantitative",
    result: "Sub-10ms execution latency"
  },
  {
    id: '04',
    quote: "We use the IPO subscription heat and GMP predictions to allocate our high-net-worth client bidding. The results have been stellar.",
    author: "Elena Rostova",
    role: "Managing Director, Nova Tech Wealth",
    result: "14.8% average listing gain"
  }
];

const INTEGRATIONS = [
  { name: 'yfinance', desc: 'Market Feeds' },
  { name: 'Zerodha Kite', desc: 'Broker Sync' },
  { name: 'Groww', desc: 'Portfolio Connect' },
  { name: 'Upstox API', desc: 'Direct Trading' },
  { name: 'AngelOne API', desc: 'Broker Sync' },
  { name: 'yahoofinance', desc: 'Global Data' },
  { name: 'Telegram API', desc: 'Signal Alerts' },
  { name: 'Slack Webhooks', desc: 'Team Alerts' },
  { name: 'PostgreSQL', desc: 'Data Cache' },
  { name: 'Redis', desc: 'Real-time PubSub' },
  { name: 'AWS Lambda', desc: 'Edge Compute' },
  { name: 'Dhan API', desc: 'Direct Trading' }
];

export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'annual'
  const [currentSlide, setCurrentSlide] = useState(0);
  const [copiedText, setCopiedText] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  const SECTIONS = ['hero', 'features', 'how-it-works', 'infrastructure', 'performance', 'integrations', 'developers', 'testimonials', 'pricing', 'cta'];
  const [activeSection, setActiveSection] = useState('hero');

  useEffect(() => {
    const handleScrollListener = () => {
      const scrollPos = window.scrollY + window.innerHeight / 3;
      for (const sectionId of SECTIONS) {
        const el = document.getElementById(sectionId);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };
    window.addEventListener('scroll', handleScrollListener);
    return () => window.removeEventListener('scroll', handleScrollListener);
  }, []);

  // Simulated Live Metrics Dashboard States
  const [apiRequests, setApiRequests] = useState(1420580);
  const [latency, setLatency] = useState(32.4);
  const [uptime, setUptime] = useState(99.99);
  const [activeUsers, setActiveUsers] = useState(148);
  const [liveTime, setLiveTime] = useState(null);
  const [hoverCoords, setHoverCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // Typing effect state
  const words = ['analysis.', 'insights.', 'learning.'];
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Simulated live candlestick/line chart points with volume heights for HeroVisual widget (20 high-density points)
  const [candles, setCandles] = useState(() => {
    const initial = [];
    let prevClose = 110;
    for (let i = 0; i < 20; i++) {
      const change = (Math.random() - 0.47) * 12;
      const close = Math.max(40, Math.min(160, prevClose + change));
      const open = prevClose;
      const high = Math.min(open, close) - Math.random() * 6;
      const low = Math.max(open, close) + Math.random() * 6;
      const vol = Math.floor(Math.random() * 22) + 6;
      initial.push({
        open,
        close,
        high,
        low,
        vol,
        x: 10 + i * 20
      });
      prevClose = close;
    }
    return initial;
  });

  useEffect(() => {
    setLiveTime(new Date().toLocaleTimeString());
    const clockInterval = setInterval(() => {
      setLiveTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setCoords({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Update typing text
  useEffect(() => {
    let timer;
    const fullWord = words[currentWordIndex];
    const typingSpeed = isDeleting ? 50 : 100;

    if (!isDeleting && currentText === fullWord) {
      timer = setTimeout(() => setIsDeleting(true), 2000);
    } else if (isDeleting && currentText === '') {
      setIsDeleting(false);
      setCurrentWordIndex((prev) => (prev + 1) % words.length);
    } else {
      timer = setTimeout(() => {
        setCurrentText((prev) =>
          isDeleting
            ? fullWord.substring(0, prev.length - 1)
            : fullWord.substring(0, prev.length + 1)
        );
      }, typingSpeed);
    }
    return () => clearTimeout(timer);
  }, [currentText, isDeleting, currentWordIndex]);

  // Tick the live price on the active (last) candle close
  useEffect(() => {
    const timer = setInterval(() => {
      setCandles(prev => {
        const next = [...prev];
        const lastIdx = next.length - 1;
        if (lastIdx < 0) return prev;
        const last = { ...next[lastIdx] };

        // Tick close price slightly
        const tick = (Math.random() - 0.48) * 3;
        last.close = Math.max(30, Math.min(170, last.close + tick));

        // Update high/low bounds (SVG coordinates: lower value means higher price)
        if (last.close < last.high) last.high = last.close;
        if (last.close > last.low) last.low = last.close;

        next[lastIdx] = last;
        return next;
      });
    }, 300);
    return () => clearInterval(timer);
  }, []);

  // Update live dashboard indicators and shift candles forward
  useEffect(() => {
    const interval = setInterval(() => {
      setApiRequests(prev => prev + Math.floor(Math.random() * 4) + 1);
      setLatency(prev => {
        const next = prev + (Math.random() * 2 - 1) * 0.4;
        return parseFloat(Math.max(28, Math.min(38, next)).toFixed(1));
      });
      setActiveUsers(prev => {
        const diff = Math.random() > 0.5 ? 1 : -1;
        return Math.max(140, Math.min(160, prev + diff));
      });

      // Shift candles left and add a new one
      setCandles(prev => {
        const next = [...prev];
        const last = next[next.length - 1];
        next.shift();

        const newOpen = last.close;
        const drift = (Math.random() * 14 - 7.5);
        const newClose = newOpen + drift;
        const newHigh = Math.min(newOpen, newClose) - Math.random() * 8;
        const newLow = Math.max(newOpen, newClose) + Math.random() * 8;
        const newVol = Math.floor(Math.random() * 25) + 8;

        next.push({
          open: newOpen,
          close: Math.max(30, Math.min(170, newClose)),
          high: Math.max(20, Math.min(180, newHigh)),
          low: Math.max(30, Math.min(190, newLow)),
          vol: newVol,
          x: 390
        });

        return next.map((c, i) => ({ ...c, x: 10 + i * 20 }));
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const copyCode = () => {
    navigator.clipboard.writeText("pip install alphaflow-sdk");
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleScroll = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Prediction line coordinates based on last candle close
  const lastPoint = candles[candles.length - 1];
  const predPath = `M ${lastPoint.x.toFixed(2)} ${lastPoint.close.toFixed(2)} L ${(lastPoint.x + 20).toFixed(2)} ${(lastPoint.close - 12).toFixed(2)}`;

  // Generate a trailing technical indicator (EMA) path
  const emaPoints = candles.map((c, i) => {
    if (i === 0) return { x: c.x, y: c.close };
    const y = candles[i - 1].close * 0.65 + c.close * 0.35;
    return { x: c.x, y };
  });
  const emaPath = emaPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');

  // SVG Area Paths
  const linePath = candles.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(2)} ${c.close.toFixed(2)}`).join(' ');
  const areaPath = `${linePath} L ${lastPoint.x.toFixed(2)} 200 L ${candles[0].x.toFixed(2)} 200 Z`;

  // Net direction color
  const isNetUp = lastPoint.close <= candles[0].close; // smaller Y means higher price
  const chartColor = isNetUp ? '#10b981' : '#ef4444';
  const chartGradient = isNetUp ? 'url(#green-grad)' : 'url(#red-grad)';

  const handleSvgMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 400;
    const y = ((e.clientY - rect.top) / rect.height) * 200;
    setHoverCoords({ x, y });
  };

  // Snapping crosshair point logic
  const hoveredIndex = Math.max(
    0,
    Math.min(
      candles.length - 1,
      Math.round((hoverCoords.x - 10) / 20)
    )
  );
  const hoveredPoint = candles[hoveredIndex];
  const activePoint = isHovered ? hoveredPoint : lastPoint;

  return (
    <div className="min-h-screen bg-transparent text-[var(--text-primary)] relative overflow-hidden font-sans selection:bg-[var(--accent-brand)] selection:text-white">
      {/* Interactive cursor spotlight */}
      <div 
        className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-300 opacity-60 hidden md:block"
        style={{
          background: `radial-gradient(800px circle at ${coords.x}px ${coords.y}px, rgba(18, 19, 22, 0.04), transparent 40%)`
        }}
      />
      {/* Floating Dot Navigation Panel */}
      <div className="fixed right-4 lg:right-6 top-1/2 -translate-y-1/2 z-50 hidden md:flex flex-col gap-3.5 bg-white/60 backdrop-blur-md p-2.5 rounded-full border border-[var(--border-light)] shadow-md">
        {SECTIONS.map((sec) => (
          <button
            key={sec}
            onClick={() => document.getElementById(sec)?.scrollIntoView({ behavior: 'smooth' })}
            className={`group relative h-2.5 w-2.5 rounded-full transition-all duration-300 ${
              activeSection === sec 
                ? 'bg-black scale-125' 
                : 'bg-neutral-300 hover:bg-neutral-600'
            }`}
            title={sec}
          >
            {/* Floating text label on hover */}
            <span className="absolute right-6 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded bg-black text-white text-[9px] font-mono uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md">
              {sec.replace('-', ' ')}
            </span>
          </button>
        ))}
      </div>

      {/* ─── 1. Navigation Bar ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-primary)]/80 backdrop-blur-md border-b border-[var(--border-light)]">
        <div className="max-w-full mx-auto px-6 lg:px-16">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded bg-[var(--accent-brand)] flex items-center justify-center transition-transform duration-500 group-hover:rotate-12">
                <TrendingUp className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="text-base font-bold text-[var(--text-primary)] tracking-tight">
                AlphaFlow<span className="text-[10px] align-super font-normal text-[var(--text-secondary)]">TM</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <button onClick={() => handleScroll('features')} className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                Capabilities
              </button>
              <button onClick={() => handleScroll('how-it-works')} className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                How it works
              </button>
              <button onClick={() => handleScroll('developers')} className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                Developers
              </button>
              <button onClick={() => handleScroll('pricing')} className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                Pricing
              </button>
              <div className="h-4 w-px bg-[var(--border-light)]" />
              <Link to="/dashboard" className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)] hover:text-neutral-600 transition-colors">
                Sign in
              </Link>
              <Link to="/dashboard" className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-[var(--accent-brand)] text-white text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-all hover:scale-102 active:scale-98 shadow-sm">
                Start Analyzing
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileOpen && (
          <div className="md:hidden bg-[var(--bg-primary)] border-t border-[var(--border-light)] px-6 py-4 space-y-4">
            <button onClick={() => { handleScroll('features'); setMobileOpen(false); }} className="block text-left w-full text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Capabilities</button>
            <button onClick={() => { handleScroll('how-it-works'); setMobileOpen(false); }} className="block text-left w-full text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">How it works</button>
            <button onClick={() => { handleScroll('developers'); setMobileOpen(false); }} className="block text-left w-full text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Developers</button>
            <button onClick={() => { handleScroll('pricing'); setMobileOpen(false); }} className="block text-left w-full text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Pricing</button>
            <div className="border-t border-[var(--border-light)] pt-4 flex flex-col gap-3">
              <Link to="/dashboard" className="block text-center text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)] py-2">
                Sign in
              </Link>
              <Link to="/dashboard" className="block text-center px-5 py-2.5 rounded bg-[var(--accent-brand)] text-white text-xs font-bold uppercase tracking-wider">
                Start Analyzing
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ─── 2. Hero Section ─── */}
      <SlideWrapper id="hero" nextId="features" className="min-h-screen flex flex-col justify-between pt-20 pb-0 px-6 lg:px-16 max-w-full mx-auto border-b border-[var(--border-light)] relative z-10">
        <div className="grid lg:grid-cols-12 gap-12 items-center w-full my-auto">
          {/* Left Column: Headline and Content */}
          <div className="lg:col-span-6 space-y-8 text-left -translate-y-4 lg:-translate-y-12">
            <h1 className="text-6xl sm:text-8xl lg:text-[7rem] xl:text-[7.5rem] font-normal text-[var(--text-primary)] leading-[0.85] tracking-tighter font-serif animate-[slideUp_0.6s_ease-out]">
              A platform for
              <br />
              <span className="font-serif italic text-neutral-400">
                {currentText}
                <span className="border-r-2 border-[var(--text-primary)] animate-pulse ml-1"></span>
              </span>
            </h1>

            <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-xl leading-relaxed animate-[slideUp_0.8s_ease-out]">
              Your toolkit to stop guessing and start outperforming. Securely analyze, build, deploy, and execute AI-powered stock forecasts.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-2 animate-[slideUp_1s_ease-out]">
              <Link to="/dashboard" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded bg-[var(--accent-brand)] text-white font-bold text-xs uppercase tracking-wider hover:bg-neutral-800 transition-all hover:scale-102 active:scale-98 shadow-sm">
                Start Free Trial
              </Link>
              <button onClick={() => handleScroll('how-it-works')} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded border border-[var(--border-light)] bg-white/40 text-[var(--text-primary)] font-bold text-xs uppercase tracking-wider hover:border-[var(--text-primary)] hover:bg-[var(--bg-secondary)]/55 transition-all hover:scale-102 active:scale-98">
                Watch Demo
              </button>
            </div>

            {/* Social Proof Stats Grid */}
            <div className="pt-12 grid grid-cols-2 sm:grid-cols-5 gap-6 border-t border-[var(--border-light)] text-left animate-[fadeIn_1.2s_ease-out]">
              <div className="space-y-1">
                <p className="text-sm sm:text-base font-bold text-[var(--text-primary)] font-sans">99.2% Accuracy</p>
                <p className="text-[9px] font-mono text-[var(--text-secondary)] uppercase tracking-wider">EXPECTED PRECISION</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm sm:text-base font-bold text-[var(--text-primary)] font-sans">1.42% Low MAPE</p>
                <p className="text-[9px] font-mono text-[var(--text-secondary)] uppercase tracking-wider">MEAN ERROR RATE</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm sm:text-base font-bold text-[var(--text-primary)] font-sans">94.8% Win Rate</p>
                <p className="text-[9px] font-mono text-[var(--text-secondary)] uppercase tracking-wider">CORRECT PREDICTIONS</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm sm:text-base font-bold text-[var(--text-primary)] font-sans">5-Year Backtest</p>
                <p className="text-[9px] font-mono text-[var(--text-secondary)] uppercase tracking-wider">HISTORICAL VALIDATION</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm sm:text-base font-bold text-[var(--text-primary)] font-sans">Sub-30s Inference</p>
                <p className="text-[9px] font-mono text-[var(--text-secondary)] uppercase tracking-wider">REAL-TIME FEEDS</p>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Prediction Terminal widget (Enlarged to col-span-6 and max-w-3xl) */}
          <div className="lg:col-span-6 w-full flex justify-center lg:justify-end animate-[fadeIn_1.2s_ease-out]">
            <div className="w-full max-w-3xl rounded-xl border-2 border-black bg-white/80 backdrop-blur-md shadow-xl overflow-hidden flex flex-col text-[var(--text-primary)]">
              {/* macOS window title bar */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-light)] bg-neutral-50/70">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]/80" />
                </div>
                <span className="text-[10px] font-mono text-[var(--text-muted)] font-bold">alpha_engine_v3.sh</span>
              </div>
              <div className="p-4 space-y-4">
                {/* Legend Header */}
                <div className="flex items-center justify-between border-b border-[var(--border-light)] pb-2 font-mono text-[9px] text-[var(--text-secondary)]">
                  <div className="flex gap-2">
                    <span className="text-[var(--text-primary)] font-bold">RELIANCE.NS</span>
                    <span className={activePoint.close <= activePoint.open ? 'text-[#10b981]' : 'text-[#ef4444]'}>
                      C: ₹{((200 - activePoint.close) * 12.5).toFixed(2)}
                    </span>
                    <span className="text-[var(--border-light)]">|</span>
                    <span className="text-[var(--text-muted)]">
                      O: ₹{((200 - activePoint.open) * 12.5).toFixed(0)}
                    </span>
                  </div>
                  <span>BIAS: -0.04% (KALMAN: ACTIVE)</span>
                </div>
                
                {/* SVG Graph rendering live terminal line segments (Increased height to h-80 and light bg-white/20) */}
                <div 
                  className="h-80 w-full relative bg-white/20 backdrop-blur-sm rounded border border-black overflow-hidden cursor-crosshair"
                  onMouseMove={handleSvgMouseMove}
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                >
                  <svg viewBox="0 0 400 200" className="w-full h-full">
                    {/* Gradients */}
                    <defs>
                      <linearGradient id="green-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="red-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Grid lines (cell grids mapped to 400 width) */}
                    <line x1="0" y1="50" x2="400" y2="50" stroke="var(--border-subtle)" strokeWidth="0.5" strokeDasharray="2,4" />
                    <line x1="0" y1="100" x2="400" y2="100" stroke="var(--border-subtle)" strokeWidth="0.5" strokeDasharray="2,4" />
                    <line x1="0" y1="150" x2="400" y2="150" stroke="var(--border-subtle)" strokeWidth="0.5" strokeDasharray="2,4" />
                    <line x1="80" y1="0" x2="80" y2="200" stroke="var(--border-subtle)" strokeWidth="0.5" strokeDasharray="2,4" />
                    <line x1="160" y1="0" x2="160" y2="200" stroke="var(--border-subtle)" strokeWidth="0.5" strokeDasharray="2,4" />
                    <line x1="240" y1="0" x2="240" y2="200" stroke="var(--border-subtle)" strokeWidth="0.5" strokeDasharray="2,4" />
                    <line x1="320" y1="0" x2="320" y2="200" stroke="var(--border-subtle)" strokeWidth="0.5" strokeDasharray="2,4" />

                    {/* Y-Axis Labels (Pushed to the right of 400px width) */}
                    <text x="370" y="45" fill="var(--text-muted)" fontSize="8" fontFamily="monospace">₹2.4K</text>
                    <text x="370" y="95" fill="var(--text-muted)" fontSize="8" fontFamily="monospace">₹2.3K</text>
                    <text x="370" y="145" fill="var(--text-muted)" fontSize="8" fontFamily="monospace">₹2.2K</text>

                    {/* Volume Bar Charts at Bottom */}
                    {candles.map((c, idx) => {
                      const isUp = idx === 0 || c.close <= candles[idx - 1].close;
                      const color = isUp ? '#10b981' : '#ef4444';
                      const volHeight = c.vol || 20;
                      return (
                        <rect
                          key={`vol-${idx}`}
                          x={(c.x - 3).toFixed(2)}
                          y={(200 - volHeight).toFixed(2)}
                          width="6"
                          height={volHeight.toFixed(2)}
                          fill={color}
                          opacity="0.12"
                        />
                      );
                    })}

                    {/* Trailing EMA Technical Indicator (Smooth trail) */}
                    <path d={emaPath} fill="none" stroke="#eab308" strokeWidth="1.2" strokeOpacity="0.4" />

                    {/* Gradient Area underfill */}
                    <path d={areaPath} fill={chartGradient} />

                    {/* Continuous Stock Price Line */}
                    <path d={linePath} fill="none" stroke={chartColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

                    {/* Prediction path line */}
                    <path d={predPath} fill="none" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="3,3" />
                    <circle cx={(lastPoint.x + 20).toFixed(2)} cy={(lastPoint.close - 12).toFixed(2)} r="3" fill="#06b6d4" />

                    {/* Glowing active price marker on the last node */}
                    <circle cx={lastPoint.x.toFixed(2)} cy={lastPoint.close.toFixed(2)} r="5" fill={chartColor} className="animate-ping opacity-75" />
                    <circle cx={lastPoint.x.toFixed(2)} cy={lastPoint.close.toFixed(2)} r="3" fill={chartColor} />

                    {/* Interactive Snapping Crosshair Lines */}
                    {isHovered && (
                      <g>
                        {/* Snapped vertical line */}
                        <line
                          x1={activePoint.x.toFixed(2)}
                          y1="0"
                          x2={activePoint.x.toFixed(2)}
                          y2="200"
                          stroke="var(--text-muted)"
                          strokeWidth="0.5"
                          strokeDasharray="2,2"
                          strokeOpacity="0.6"
                        />
                        {/* Snapped horizontal line (Extending full 400px width) */}
                        <line
                          x1="0"
                          y1={activePoint.close.toFixed(2)}
                          x2="400"
                          y2={activePoint.close.toFixed(2)}
                          stroke="var(--text-muted)"
                          strokeWidth="0.5"
                          strokeDasharray="2,2"
                          strokeOpacity="0.6"
                        />
                        {/* Snapped marker dot */}
                        <circle cx={activePoint.x.toFixed(2)} cy={activePoint.close.toFixed(2)} r="4" fill="white" stroke={chartColor} strokeWidth="1.5" />

                        {/* Floating coordinate box Y-axis target readout (Pushed to x=350) */}
                        <rect
                          x="350"
                          y={(activePoint.close - 6).toFixed(2)}
                          width="50"
                          height="12"
                          fill="var(--text-primary)"
                          stroke="var(--border-light)"
                          strokeWidth="0.5"
                          rx="2"
                        />
                        <text
                          x="354"
                          y={(activePoint.close + 3).toFixed(2)}
                          fill="white"
                          fontSize="7"
                          fontFamily="monospace"
                        >
                          ₹{((200 - activePoint.close) * 12.5).toFixed(2)}
                        </text>
                      </g>
                    )}
                  </svg>
                  {/* Floating forecast badge */}
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded border border-cyan-200 bg-cyan-50/50 text-[8px] font-mono font-bold text-cyan-700 flex items-center gap-1">
                    <span className="h-1 w-1 rounded-full bg-cyan-500 animate-pulse" />
                    AI TARGET SIGNAL
                  </div>
                </div>

                {/* Terminal outputs (CLI Container) */}
                <div className="p-3 bg-[var(--bg-secondary)]/60 rounded border border-[var(--border-light)] font-mono text-[9px] text-[var(--text-secondary)] space-y-1">
                  <p className="text-[var(--text-primary)] font-bold">$ ./alphaflow_feed --ticker=RELIANCE.NS</p>
                  <p>Inference rate: 0.04s (GARCH active)</p>
                  <p className="text-[#10b981] font-bold">Ensemble Kalman Filter bias corrected: +0.12%</p>
                  <p className="text-cyan-700 font-bold">Forecast target close: ₹{((200 - lastPoint.close) * 12.5).toFixed(2)}</p>
                </div>

                {/* ─── Compact Terminal Stock Ticker Marquee ─── */}
                <div className="overflow-hidden border-t border-[var(--border-light)] pt-2 bg-[var(--bg-secondary)]/30 relative">
                  <div 
                    className="flex whitespace-nowrap gap-12 font-mono text-[8px] uppercase tracking-widest text-[var(--text-secondary)]"
                    style={{
                      animation: 'marquee-scroll 25s linear infinite',
                      width: 'max-content'
                    }}
                  >
                    {[
                      'RELIANCE.NS: 99.42% ACCURACY · SIGNAL BUY',
                      'TCS.NS: 98.92% ACCURACY · SIGNAL HOLD',
                      'HDFCBANK.NS: 99.12% ACCURACY · SIGNAL BUY',
                      'SBIN.NS: 99.35% ACCURACY · SIGNAL BUY',
                      'INFY.NS: 98.74% ACCURACY · SIGNAL HOLD',
                      'SYSTEM STATUS: OPERATIONAL',
                      'FEED LOOP: BIAS CORRECTED'
                    ].map((text, idx) => (
                      <span key={idx} className="flex items-center gap-2">
                        <span className="h-1 w-1 rounded-full bg-[var(--text-primary)]" />
                        {text}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Infinite Accuracy & Signal Marquee ─── */}
        <div className="w-full overflow-hidden border-t border-b border-[var(--border-light)] py-3 bg-[var(--bg-secondary)]/10 backdrop-blur-sm -mx-6 lg:-mx-16 px-6 lg:px-16 mt-auto">
          <div 
            className="flex whitespace-nowrap gap-12 font-mono text-[10px] uppercase tracking-widest text-[var(--text-secondary)]"
            style={{
              animation: 'marquee-scroll 30s linear infinite',
              width: 'max-content'
            }}
          >
            {[
              'RELIANCE.NS: 99.42% ACCURACY · SIGNAL BUY',
              'TCS.NS: 98.92% ACCURACY · SIGNAL HOLD',
              'HDFCBANK.NS: 99.12% ACCURACY · SIGNAL BUY',
              'SBIN.NS: 99.35% ACCURACY · SIGNAL BUY',
              'INFY.NS: 98.74% ACCURACY · SIGNAL HOLD',
              'SYSTEM STATUS: ALL OPERATIONAL',
              'SIGNAL FEEDBACK LOOP: BIAS CORRECTED',
              'RELIANCE.NS: 99.42% ACCURACY · SIGNAL BUY',
              'TCS.NS: 98.92% ACCURACY · SIGNAL HOLD',
              'HDFCBANK.NS: 99.12% ACCURACY · SIGNAL BUY',
              'SBIN.NS: 99.35% ACCURACY · SIGNAL BUY',
              'INFY.NS: 98.74% ACCURACY · SIGNAL HOLD',
              'SYSTEM STATUS: ALL OPERATIONAL',
              'SIGNAL FEEDBACK LOOP: BIAS CORRECTED'
            ].map((text, i) => (
              <span key={i} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--text-primary)]" />
                {text}
              </span>
            ))}
          </div>
        </div>
      </SlideWrapper>

      {/* ─── 3. Capabilities Section (#features) ─── */}
      <SlideWrapper id="features" nextId="how-it-works" className="min-h-screen flex flex-col justify-center py-24 px-6 lg:px-16 border-b border-[var(--border-light)] bg-[var(--bg-secondary)]/10">
        <div className="max-w-full mx-auto">
          <div className="mb-16 text-left">
            <h2 className="text-3xl sm:text-5xl font-normal text-[var(--text-primary)] font-serif">
              Everything you need.
              <span className="font-serif italic text-neutral-400 block">Nothing you don't.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Card 1 */}
            <div className="group p-8 rounded border border-[var(--border-light)] bg-white/40 hover:bg-white/95 hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <span className="font-mono text-xs font-bold text-[var(--text-muted)]">01</span>
                <Zap className="w-5 h-5 text-[var(--text-secondary)] group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-3">Instant Forecasting</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Ingest live NSE/BSE feeds to predict daily close targets. Our neural networks process complex technical metrics to output clean expected ranges.
              </p>
            </div>

            {/* Card 2 */}
            <div className="group p-8 rounded border border-[var(--border-light)] bg-white/40 hover:bg-white/95 hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <span className="font-mono text-xs font-bold text-[var(--text-muted)]">02</span>
                <Cpu className="w-5 h-5 text-[var(--text-secondary)] group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-3">Self-Correcting Core</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Automatically adjusts forecasting bias in real time. Fuses predictive neural core modules with control-theory Kalman Filter updates.
              </p>
            </div>

            {/* Card 3 */}
            <div className="group p-8 rounded border border-[var(--border-light)] bg-white/40 hover:bg-white/95 hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <span className="font-mono text-xs font-bold text-[var(--text-muted)]">03</span>
                <CalendarClock className="w-5 h-5 text-[var(--text-secondary)] group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-3">Alternative Data Logs</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Tracks upcoming IPO Grey Market Premium (GMP) updates and subscription metrics to calculate statistical listing gains automatically.
              </p>
            </div>

            {/* Card 4 */}
            <div className="group p-8 rounded border border-[var(--border-light)] bg-white/40 hover:bg-white/95 hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <span className="font-mono text-xs font-bold text-[var(--text-muted)]">04</span>
                <ShieldCheck className="w-5 h-5 text-[var(--text-secondary)] group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-3">Credential Security</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                AES-256 broker credential encryption and SOC 2 compliance mapping. Secure OAuth connection bridges for direct signal execution.
              </p>
            </div>
          </div>
        </div>
      </SlideWrapper>

      {/* ─── 4. How It Works Section (#how-it-works) ─── */}
      <SlideWrapper id="how-it-works" nextId="infrastructure" className="min-h-screen flex flex-col justify-center py-24 px-6 lg:px-16 max-w-full mx-auto border-b border-[var(--border-light)]">
        <div className="grid md:grid-cols-12 gap-12 items-start">
          <div className="md:col-span-5 space-y-6">
            <h2 className="text-3xl sm:text-5xl font-normal text-[var(--text-primary)] font-serif leading-tight">
              Three steps.
              <span className="font-serif italic text-neutral-400 block">Infinite possibilities.</span>
            </h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Query forecasts, synthesize actionable buy/sell signals, and deploy automated execution setups globally with zero server overhead.
            </p>
          </div>

          <div className="md:col-span-7 space-y-10">
            {/* Step 1 */}
            <div className="flex gap-6 border-b border-[var(--border-light)] pb-8">
              <span className="font-mono text-xs font-bold px-2 py-1 h-fit rounded border border-[var(--border-light)] bg-[var(--bg-secondary)]">I</span>
              <div>
                <h4 className="text-base font-bold text-[var(--text-primary)]">Connect your tickers</h4>
                <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">
                  Select your targeted watchlist or import portfolios. We sync with live Technical Analysis and exchange data sources instantly.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-6 border-b border-[var(--border-light)] pb-8">
              <span className="font-mono text-xs font-bold px-2 py-1 h-fit rounded border border-[var(--border-light)] bg-[var(--bg-secondary)]">II</span>
              <div>
                <h4 className="text-base font-bold text-[var(--text-primary)]">Synthesize signals</h4>
                <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">
                  Our self-correcting neural core evaluates model configurations, scales volatility matrices, and flags clear target paths.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-6 pb-2">
              <span className="font-mono text-xs font-bold px-2 py-1 h-fit rounded border border-[var(--border-light)] bg-[var(--bg-secondary)]">III</span>
              <div>
                <h4 className="text-base font-bold text-[var(--text-primary)]">Execute trade paths</h4>
                <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">
                  Ship execution updates directly to your brokers or set webhook relays to auto-trigger trades within 30 seconds.
                </p>
              </div>
            </div>

            {/* Python Code Block */}
            <div className="mt-6 rounded overflow-hidden border border-[var(--border-light)] bg-neutral-900 shadow-sm text-left">
              <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800 bg-neutral-950">
                <span className="text-[10px] font-mono text-neutral-400 font-bold">analyze.py</span>
                <button onClick={copyCode} className="text-neutral-400 hover:text-white transition-colors flex items-center gap-1">
                  <Copy className="w-3 h-3" />
                  <span className="text-[9px] font-mono">{copiedText ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-4 font-mono text-xs text-neutral-200 overflow-x-auto leading-relaxed">
                <code>
                  <span className="text-blue-400">from</span> alphaflow <span className="text-blue-400">import</span> Engine
                  <br /><br />
                  engine = <span className="text-amber-400">Engine</span>(api_key=<span className="text-emerald-400">'your_api_key'</span>)
                  <br />
                  analysis = engine.<span className="text-amber-400">analyze</span>(
                  <br />
                  &nbsp;&nbsp;ticker=<span className="text-emerald-400">'RELIANCE.NS'</span>,
                  <br />
                  &nbsp;&nbsp;mode=<span className="text-emerald-400">'ensemble'</span>
                  <br />
                  )
                  <br />
                  <span className="text-blue-400">print</span>(analysis.trade_signal)
                </code>
              </pre>
            </div>
          </div>
        </div>
      </SlideWrapper>

      {/* ─── 5. Accuracy & Reliability Section (#infrastructure) ─── */}
      <SlideWrapper id="infrastructure" nextId="performance" className="min-h-screen flex flex-col justify-center py-24 px-6 lg:px-16 border-b border-[var(--border-light)] bg-[var(--bg-secondary)]/10">
        <div className="max-w-full mx-auto grid md:grid-cols-12 gap-12 items-start">
          <div className="md:col-span-5 space-y-6">
            <h2 className="text-3xl sm:text-5xl font-normal text-[var(--text-primary)] font-serif leading-tight">
              Accuracy & reliability.
            </h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              AlphaFlow delivers institutional-grade forecasting precision. Our self-correcting Kalman filter continuously validates predicted prices against actual market closes, keeping average error levels under 1.42% MAPE.
            </p>

            {/* Metrics column stack */}
            <div className="space-y-4 pt-4 border-t border-[var(--border-light)]">
              <div>
                <p className="text-3xl font-bold font-mono text-[var(--text-primary)]">99.2%</p>
                <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Directional Win Rate</p>
              </div>
              <div>
                <p className="text-3xl font-bold font-mono text-[var(--text-primary)]">1.42%</p>
                <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Avg Prediction Error (MAPE)</p>
              </div>
              <div>
                <p className="text-3xl font-bold font-mono text-[var(--text-primary)]">99.99%</p>
                <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Signal Pipeline Reliability</p>
              </div>
            </div>
          </div>

          {/* Ensemble Model Weights Panel */}
          <div className="md:col-span-7 p-6 rounded border border-[var(--border-light)] bg-white/70 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--border-light)] pb-4">
              <span className="text-xs font-bold text-[var(--text-secondary)] font-mono">ENSEMBLE SYSTEM STATS</span>
              <span className="flex items-center gap-1.5 text-[9px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                BIAS LOOP CALIBRATED
              </span>
            </div>

            {/* Dynamic model weight readings */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 font-mono text-[11px] leading-relaxed text-[var(--text-secondary)]">
              <div className="p-3 bg-[var(--bg-secondary)]/50 rounded border border-[var(--border-subtle)]">
                <p>28% Model Weight</p>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)]/50 rounded border border-[var(--border-subtle)]">
                <p className="font-bold text-[var(--text-primary)]">LSTM Network</p>
                <p>22% Model Weight</p>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)]/50 rounded border border-[var(--border-subtle)]">
                <p className="font-bold text-[var(--text-primary)]">Transformer Node</p>
                <p>16% Model Weight</p>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)]/50 rounded border border-[var(--border-subtle)]">
                <p className="font-bold text-[var(--text-primary)]">Kalman Correction</p>
                <p>Active -0.12% Bias Offset</p>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)]/50 rounded border border-[var(--border-subtle)]">
                <p className="font-bold text-[var(--text-primary)]">GARCH Scale</p>
                <p>Active Regime Lock</p>
              </div>
            </div>
          </div>
        </div>
      </SlideWrapper>

      {/* ─── 6. Live Metrics Dashboard Section (#performance) ─── */}
      <SlideWrapper id="performance" nextId="integrations" className="min-h-screen flex flex-col justify-center py-24 px-6 lg:px-16 max-w-full mx-auto border-b border-[var(--border-light)]">
        <div className="max-w-4xl mx-auto text-center space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl sm:text-5xl font-normal text-[var(--text-primary)] font-serif">
              Performance you can track.
            </h2>
          </div>

          <div className="p-6 sm:p-8 rounded border border-[var(--border-light)] bg-white/70 shadow-sm text-left space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-light)]">
              <span className="font-mono text-xs font-bold text-[var(--text-secondary)]">ACTIVE ENGINE READOUT | {liveTime || '--:--:--'}</span>
              <span className="text-[10px] font-mono text-[var(--text-muted)] font-bold">REAL-TIME FORECAST FEED</span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-4 bg-[var(--bg-secondary)]/40 rounded border border-[var(--border-subtle)]">
                <p className="text-[10px] font-mono text-[var(--text-secondary)] uppercase tracking-wider mb-2">Predictions Computed Today</p>
                <p className="text-2xl font-bold font-mono text-[var(--text-primary)]">
                  {apiRequests.toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-[var(--bg-secondary)]/40 rounded border border-[var(--border-subtle)]">
                <p className="text-[10px] font-mono text-[var(--text-secondary)] uppercase tracking-wider mb-2">Directional Win-Rate</p>
                <p className="text-2xl font-bold font-mono text-[var(--text-primary)]">
                  94.82%
                </p>
              </div>
              <div className="p-4 bg-[var(--bg-secondary)]/40 rounded border border-[var(--border-subtle)]">
                <p className="text-[10px] font-mono text-[var(--text-secondary)] uppercase tracking-wider mb-2">Forecast Inference Speed</p>
                <p className="text-2xl font-bold font-mono text-[var(--text-primary)]">
                  {latency.toFixed(1)}ms
                </p>
              </div>
              <div className="p-4 bg-[var(--bg-secondary)]/40 rounded border border-[var(--border-subtle)]">
                <p className="text-[10px] font-mono text-[var(--text-secondary)] uppercase tracking-wider mb-2">Active Portfolio Bridges</p>
                <p className="text-2xl font-bold font-mono text-[var(--text-primary)]">
                  {(activeUsers * 12).toLocaleString()} accounts
                </p>
              </div>
            </div>
          </div>
        </div>
      </SlideWrapper>

      {/* ─── 7. Integrations & Security Section (#integrations) ─── */}
      <SlideWrapper id="integrations" nextId="developers" className="min-h-screen flex flex-col justify-center py-24 px-6 lg:px-16 border-b border-[var(--border-light)] bg-[var(--bg-secondary)]/10">
        <div className="max-w-full mx-auto grid lg:grid-cols-12 gap-12 items-start">
          {/* Left Column: Broker Integrations */}
          <div className="lg:col-span-5 space-y-6">
            <h2 className="text-3xl sm:text-5xl font-normal text-[var(--text-primary)] font-serif leading-tight">
              Works with brokers
              <span className="font-serif italic text-neutral-400 block">you already use.</span>
            </h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Pre-built broker bridges. Connect your watchlist and execute trades in minutes.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              {INTEGRATIONS.map((int, i) => (
                <div key={i} className="p-3 rounded border border-[var(--border-light)] bg-white/70 hover:bg-white/95 hover:border-[var(--text-primary)] transition-all duration-300 text-left">
                  <p className="font-mono text-[10px] font-bold text-[var(--text-primary)]">{int.name}</p>
                  <p className="text-[9px] text-[var(--text-muted)] mt-0.5">{int.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Security */}
          <div className="lg:col-span-7 space-y-6 lg:border-l lg:border-[var(--border-light)] lg:pl-12">
            <h2 className="text-3xl sm:text-5xl font-normal text-[var(--text-primary)] font-serif leading-tight">
              Security is
              <span className="font-serif italic text-neutral-400 block">non-negotiable.</span>
            </h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Your broker API credentials and strategy parameters are protected by multiple compliance safeguards.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-5 rounded border border-[var(--border-light)] bg-white/45 shadow-sm">
                <Lock className="w-4.5 h-4.5 text-[var(--text-secondary)] mb-3" />
                <h4 className="font-bold text-xs text-[var(--text-primary)] mb-1">SOC 2 Safeguarded</h4>
                <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
                  Independently audited data control processes with continuous logging to protect configuration files.
                </p>
              </div>
              <div className="p-5 rounded border border-[var(--border-light)] bg-white/45 shadow-sm">
                <ShieldCheck className="w-4.5 h-4.5 text-[var(--text-secondary)] mb-3" />
                <h4 className="font-bold text-xs text-[var(--text-primary)] mb-1">End-to-end encryption</h4>
                <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
                  AES-256 encryption protects your stored credentials, with TLS 1.3 securing all real-time API transactions.
                </p>
              </div>
              <div className="p-5 rounded border border-[var(--border-light)] bg-white/45 shadow-sm">
                <Server className="w-4.5 h-4.5 text-[var(--text-secondary)] mb-3" />
                <h4 className="font-bold text-xs text-[var(--text-primary)] mb-1">Zero-trust architecture</h4>
                <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
                  Every request and execution webhook is strictly authenticated and validated. Zero credential bypass.
                </p>
              </div>
              <div className="p-5 rounded border border-[var(--border-light)] bg-white/45 shadow-sm">
                <Globe className="w-4.5 h-4.5 text-[var(--text-secondary)] mb-3" />
                <h4 className="font-bold text-xs text-[var(--text-primary)] mb-1">Compliance Alignment</h4>
                <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
                  Full compliance with major international database security guidelines and broker credential storage protocols.
                </p>
              </div>
            </div>
          </div>
        </div>
      </SlideWrapper>

      {/* ─── 9. Developers Section (#developers) ─── */}
      <SlideWrapper id="developers" nextId="testimonials" className="min-h-screen flex flex-col justify-center py-24 px-6 lg:px-16 border-b border-[var(--border-light)] bg-[var(--bg-secondary)]/10">
        <div className="max-w-full mx-auto grid md:grid-cols-12 gap-12 items-start">
          <div className="md:col-span-5 space-y-6">
            <h2 className="text-3xl sm:text-5xl font-normal text-[var(--text-primary)] font-serif leading-tight">
              Built by quants.
              <span className="font-serif italic text-neutral-400 block">For quants.</span>
            </h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              A thoughtfully designed Python SDK that gets out of your way. Query signals, backtest models, and configure webhooks instantly.
            </p>

            <div className="grid grid-cols-2 gap-6 pt-4">
              <div>
                <p className="font-bold text-sm text-[var(--text-primary)]">Python native</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">Full type definitions and clean data models.</p>
              </div>
              <div>
                <p className="font-bold text-sm text-[var(--text-primary)]">Zero config</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">Sensible network defaults that just work.</p>
              </div>
              <div>
                <p className="font-bold text-sm text-[var(--text-primary)]">Edge ready</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">Ingests feeds: Node, Python notebooks, web servers.</p>
              </div>
              <div>
                <p className="font-bold text-sm text-[var(--text-primary)]">Lightweight</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">Highly optimized with zero bloated dependencies.</p>
              </div>
            </div>
          </div>

          <div className="md:col-span-7 space-y-6">
            {/* Terminal install block */}
            <div className="rounded overflow-hidden border border-[var(--border-light)] bg-neutral-900 shadow-sm text-left">
              <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800 bg-neutral-950">
                <span className="text-[10px] font-mono text-neutral-400 font-bold">terminal</span>
                <button onClick={copyCode} className="text-neutral-400 hover:text-white transition-colors flex items-center gap-1">
                  <Copy className="w-3 h-3" />
                  <span className="text-[9px] font-mono">{copiedText ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-4 font-mono text-xs text-neutral-200 overflow-x-auto leading-relaxed">
                <code>
                  <span className="text-neutral-400"># Install the Python SDK</span>
                  <br />
                  pip install alphaflow-sdk
                  <br />
                  <span className="text-neutral-400"># or npm install @alphaflow/sdk for JS</span>
                </code>
              </pre>
            </div>

            <div className="flex items-center gap-6 font-mono text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-wider pl-1">
              <a href="#" className="hover:text-[var(--text-secondary)] flex items-center gap-1">Read the Docs <ArrowRight className="w-3 h-3" /></a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--text-secondary)]">View on GitHub</a>
            </div>
          </div>
        </div>
      </SlideWrapper>

      {/* ─── 10. Testimonials/Social Proof Section (#testimonials) ─── */}
      <SlideWrapper id="testimonials" nextId="pricing" className="min-h-screen flex flex-col justify-center py-24 px-6 lg:px-16 max-w-full mx-auto border-b border-[var(--border-light)]">
        <div className="grid md:grid-cols-12 gap-12 items-start">
          <div className="md:col-span-5 space-y-6">
            <h2 className="text-3xl sm:text-5xl font-normal text-[var(--text-primary)] font-serif leading-tight">
              What people say.
            </h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Read how fund managers and quants utilize AlphaFlow forecasts to construct strategies and beat benchmarks.
            </p>

            {/* Trusted Teams logos placeholder */}
            <div className="pt-6 border-t border-[var(--border-light)]">
              <p className="text-[9px] font-mono font-bold text-[var(--text-muted)] uppercase tracking-widest mb-4">TRUSTED BY FORWARD-THINKING TEAMS</p>
              <div className="grid grid-cols-2 gap-4 font-mono text-[10px] font-bold text-[var(--text-secondary)] uppercase">
                <span>Meridian Labs</span>
                <span>Flux Systems</span>
                <span>Beacon AI</span>
                <span>Prism Analytics</span>
                <span>Nova Tech</span>
                <span>Quantum Corp</span>
              </div>
            </div>
          </div>

          <div className="md:col-span-7 p-8 rounded border border-[var(--border-light)] bg-white/70 shadow-sm text-left space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--border-light)] pb-4">
              <span className="font-mono text-xs font-bold text-[var(--text-muted)]">
                {TESTIMONIALS[currentSlide].id} / 04
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setCurrentSlide(prev => (prev === 0 ? 3 : prev - 1))}
                  className="p-1 rounded border border-[var(--border-light)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-[var(--text-primary)]" />
                </button>
                <button
                  onClick={() => setCurrentSlide(prev => (prev === 3 ? 0 : prev + 1))}
                  className="p-1 rounded border border-[var(--border-light)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-[var(--text-primary)]" />
                </button>
              </div>
            </div>

            <p className="text-lg font-serif italic text-[var(--text-primary)] leading-relaxed">
              "{TESTIMONIALS[currentSlide].quote}"
            </p>

            <div className="flex items-center justify-between pt-4 border-t border-[var(--border-light)]">
              <div>
                <p className="text-sm font-bold text-[var(--text-primary)]">
                  {TESTIMONIALS[currentSlide].author}
                </p>
                <p className="text-[10px] font-mono text-[var(--text-secondary)] uppercase mt-0.5">
                  {TESTIMONIALS[currentSlide].role}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider block">Key result</span>
                <span className="text-sm font-bold font-serif text-[var(--text-primary)]">{TESTIMONIALS[currentSlide].result}</span>
              </div>
            </div>
          </div>
        </div>
      </SlideWrapper>

      {/* ─── 11. Pricing Section (#pricing) ─── */}
      <SlideWrapper id="pricing" nextId="cta" className="min-h-screen flex flex-col justify-center py-24 px-6 lg:px-16 border-b border-[var(--border-light)] bg-[var(--bg-secondary)]/10">
        <div className="max-w-full mx-auto text-center space-y-12">
          <div className="max-w-xl mx-auto space-y-4">
            <h2 className="text-3xl sm:text-5xl font-normal text-[var(--text-primary)] font-serif">
              Simple, transparent pricing
            </h2>
            <p className="text-sm text-[var(--text-secondary)] font-medium">
              Start free and scale as you grow. No hidden fees, no surprises.
            </p>

            {/* Monthly / Annual Toggle */}
            <div className="flex items-center justify-center gap-3 pt-4">
              <span className={`text-xs font-semibold ${billingCycle === 'monthly' ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>Monthly Billing</span>
              <button
                onClick={() => setBillingCycle(prev => (prev === 'monthly' ? 'annual' : 'monthly'))}
                className="w-10 h-6 rounded-full bg-[var(--accent-brand)] p-0.5 transition-colors relative flex items-center"
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${billingCycle === 'annual' ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-semibold ${billingCycle === 'annual' ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>Annual Billing</span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[var(--text-primary)] text-white uppercase tracking-wider">Save 17%</span>
              </div>
            </div>
          </div>

          {/* Pricing cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto text-left">
            {/* Starter */}
            <div className="p-8 rounded border border-[var(--border-light)] bg-white/40 flex flex-col justify-between">
              <div className="space-y-4">
                <span className="text-[10px] font-mono font-bold text-[var(--text-muted)] uppercase tracking-widest">STARTER</span>
                <p className="text-4xl font-mono font-bold text-[var(--text-primary)]">
                  ₹0
                </p>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-medium">
                  For individual quants configuring watchlist indicators and basic queries.
                </p>
                <div className="h-px bg-[var(--border-light)]" />
                <ul className="space-y-2 text-xs text-[var(--text-secondary)] font-medium">
                  <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-[var(--text-primary)]" /> Up to 3 watchlists</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-[var(--text-primary)]" /> 10 daily API forecasts</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-[var(--text-primary)]" /> Basic Nifty 50 metrics</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-[var(--text-primary)]" /> Community support channels</li>
                </ul>
              </div>
              <Link to="/dashboard" className="w-full text-center mt-8 px-5 py-2.5 rounded border border-[var(--border-light)] text-[var(--text-primary)] font-bold text-xs uppercase tracking-wider hover:bg-[var(--bg-secondary)] transition-all">
                Start Free
              </Link>
            </div>

            {/* Pro */}
            <div className="p-8 rounded border-2 border-[var(--text-primary)] bg-white relative flex flex-col justify-between shadow-md">
              <span className="absolute -top-3 right-6 px-2.5 py-0.5 rounded bg-[var(--text-primary)] text-white text-[9px] font-mono uppercase tracking-widest font-bold">
                MOST POPULAR
              </span>
              <div className="space-y-4">
                <span className="text-[10px] font-mono font-bold text-[var(--text-primary)] uppercase tracking-widest">PRO</span>
                <p className="text-4xl font-mono font-bold text-[var(--text-primary)]">
                  {billingCycle === 'annual' ? '₹1,650' : '₹1,990'}
                  <span className="text-xs font-mono text-[var(--text-secondary)] font-normal"> / month</span>
                </p>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-medium">
                  For active traders requiring unlimited watchlists and automated API feeds.
                </p>
                <div className="h-px bg-[var(--border-light)]" />
                <ul className="space-y-2 text-xs text-[var(--text-primary)] font-semibold">
                  <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-[var(--text-primary)]" /> Unlimited watchlist metrics</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-[var(--text-primary)]" /> 1,000 API forecasts / day</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-[var(--text-primary)]" /> Advanced real-time signals</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-[var(--text-primary)]" /> Priority developer support</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-[var(--text-primary)]" /> Webhook execution targets</li>
                </ul>
              </div>
              <Link to="/dashboard" className="w-full text-center mt-8 px-5 py-2.5 rounded bg-[var(--accent-brand)] text-white font-bold text-xs uppercase tracking-wider hover:bg-neutral-800 transition-all">
                Start Trial
              </Link>
            </div>

            {/* Enterprise */}
            <div className="p-8 rounded border border-[var(--border-light)] bg-white/40 flex flex-col justify-between">
              <div className="space-y-4">
                <span className="text-[10px] font-mono font-bold text-[var(--text-muted)] uppercase tracking-widest">ENTERPRISE</span>
                <p className="text-4xl font-mono font-bold text-[var(--text-primary)]">
                  Custom
                </p>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-medium">
                  For institutions requiring guaranteed SLA targets and custom compute nodes.
                </p>
                <div className="h-px bg-[var(--border-light)]" />
                <ul className="space-y-2 text-xs text-[var(--text-secondary)] font-medium">
                  <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-[var(--text-primary)]" /> Everything in Pro tier</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-[var(--text-primary)]" /> Dedicated 24/7 quant support</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-[var(--text-primary)]" /> Guaranteed SLA response times</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-[var(--text-primary)]" /> Custom data feed integrations</li>
                </ul>
              </div>
              <Link to="/dashboard" className="w-full text-center mt-8 px-5 py-2.5 rounded border border-[var(--border-light)] text-[var(--text-primary)] font-bold text-xs uppercase tracking-wider hover:bg-[var(--bg-secondary)] transition-all">
                Contact Sales
              </Link>
            </div>
          </div>
          <p className="text-[10px] font-mono text-[var(--text-muted)] uppercase pt-4 font-bold">All plans include automatic updates, HTTPS, and DDoS protection. Compare all features</p>
        </div>
      </SlideWrapper>

      {/* ─── 12. Final CTA Section (#cta) ─── */}
      <SlideWrapper id="cta" nextId={null} className="min-h-screen flex flex-col justify-center py-28 px-6 lg:px-16">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-4xl sm:text-6xl font-normal text-[var(--text-primary)] font-serif">
            Ready to build
            <span className="font-serif italic text-neutral-400 block">something great?</span>
          </h2>
          <p className="text-[var(--text-secondary)] text-sm max-w-md mx-auto leading-relaxed">
            Join thousands of traders querying signals with AlphaFlow. Start free, scale infinitely.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link to="/dashboard" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded bg-[var(--accent-brand)] text-white font-bold text-xs uppercase tracking-wider hover:bg-neutral-800 transition-all">
              Start Analyzing Free
            </Link>
            <Link to="/dashboard" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded border border-[var(--border-light)] bg-white/40 text-[var(--text-primary)] font-bold text-xs uppercase tracking-wider hover:bg-[var(--bg-secondary)] transition-all">
              Talk to Sales
            </Link>
          </div>
          <p className="text-[10px] font-mono text-[var(--text-muted)] uppercase">NO CREDIT CARD REQUIRED</p>
        </div>
      </SlideWrapper>

      {/* ─── 13. Footer ─── */}
      <footer className="border-t border-[var(--border-light)] bg-[var(--bg-primary)]/85 relative z-10">
        <div className="max-w-full mx-auto px-6 lg:px-16 py-16">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8 items-start mb-12">
            {/* Tagline */}
            <div className="col-span-2 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-[var(--accent-brand)] flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-[var(--text-primary)]">AlphaFlow</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-xs">
                The self-correcting AI stock forecasting engine. Build, backtest, and scale quantitative models with latency-first APIs.
              </p>
            </div>

            {/* Product link list */}
            <div>
              <p className="text-[10px] font-mono font-bold text-[var(--text-primary)] uppercase tracking-wider mb-4">Product</p>
              <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
                <li><button onClick={() => handleScroll('features')} className="hover:text-[var(--text-primary)]">Capabilities</button></li>
                <li><button onClick={() => handleScroll('how-it-works')} className="hover:text-[var(--text-primary)]">How it works</button></li>
                <li><button onClick={() => handleScroll('pricing')} className="hover:text-[var(--text-primary)]">Pricing</button></li>
                <li><button onClick={() => handleScroll('integrations')} className="hover:text-[var(--text-primary)]">Integrations</button></li>
              </ul>
            </div>

            {/* Developers link list */}
            <div>
              <p className="text-[10px] font-mono font-bold text-[var(--text-primary)] uppercase tracking-wider mb-4">Developers</p>
              <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
                <li><a href="#" className="hover:text-[var(--text-primary)]">Documentation</a></li>
                <li><a href="#" className="hover:text-[var(--text-primary)]">API Reference</a></li>
                <li><a href="#" className="hover:text-[var(--text-primary)]">SDK Kit</a></li>
                <li><a href="#" className="hover:text-[var(--text-primary)] flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Status</a></li>
              </ul>
            </div>

            {/* Company link list */}
            <div>
              <p className="text-[10px] font-mono font-bold text-[var(--text-primary)] uppercase tracking-wider mb-4">Company</p>
              <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
                <li><a href="#" className="hover:text-[var(--text-primary)]">About Us</a></li>
                <li><a href="#" className="hover:text-[var(--text-primary)]">Blog Feed</a></li>
                <li><a href="#" className="hover:text-[var(--text-primary)] flex items-center gap-1.5">Careers <span className="text-[9px] font-mono font-bold text-neutral-500 bg-neutral-900 border border-neutral-800 px-1 py-0.5 rounded">HIRING</span></a></li>
                <li><a href="#" className="hover:text-[var(--text-primary)]">Contact</a></li>
              </ul>
            </div>

            {/* Legal link list */}
            <div>
              <p className="text-[10px] font-mono font-bold text-[var(--text-primary)] uppercase tracking-wider mb-4">Legal</p>
              <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
                <li><a href="#" className="hover:text-[var(--text-primary)]">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-[var(--text-primary)]">Terms of Use</a></li>
                <li><a href="#" className="hover:text-[var(--text-primary)]">Security Audits</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-[var(--border-light)] flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[10px] font-mono text-[var(--text-muted)] uppercase">
              © {new Date().getFullYear()} AlphaFlow. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              <a href="#" className="hover:text-[var(--text-primary)]">Twitter</a>
              <a href="#" className="hover:text-[var(--text-primary)]">GitHub</a>
              <a href="#" className="hover:text-[var(--text-primary)]">LinkedIn</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
