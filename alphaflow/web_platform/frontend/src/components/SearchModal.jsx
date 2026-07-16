import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, X } from 'lucide-react';

const STOCKS = [
  { symbol: 'RELIANCE.NS', name: 'Reliance Industries' },
  { symbol: 'TCS.NS', name: 'Tata Consultancy Services' },
  { symbol: 'HDFCBANK.NS', name: 'HDFC Bank' },
  { symbol: 'INFY.NS', name: 'Infosys' },
  { symbol: 'HINDUNILVR.NS', name: 'Hindustan Unilever' },
  { symbol: 'ICICIBANK.NS', name: 'ICICI Bank' },
  { symbol: 'SBIN.NS', name: 'State Bank of India' },
  { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel' },
  { symbol: 'ITC.NS', name: 'ITC' },
  { symbol: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank' },
  { symbol: 'LT.NS', name: 'Larsen & Toubro' },
  { symbol: 'AXISBANK.NS', name: 'Axis Bank' },
  { symbol: 'BAJFINANCE.NS', name: 'Bajaj Finance' },
  { symbol: 'MARUTI.NS', name: 'Maruti Suzuki' },
  { symbol: 'TITAN.NS', name: 'Titan Company' },
  { symbol: 'SUNPHARMA.NS', name: 'Sun Pharma' },
  { symbol: 'TATAMOTORS.NS', name: 'Tata Motors' },
  { symbol: 'WIPRO.NS', name: 'Wipro' },
  { symbol: 'ULTRACEMCO.NS', name: 'UltraTech Cement' },
  { symbol: 'HCLTECH.NS', name: 'HCL Technologies' },
  { symbol: 'ADANIENT.NS', name: 'Adani Enterprises' },
  { symbol: 'ADANIPORTS.NS', name: 'Adani Ports' },
  { symbol: 'ASIANPAINT.NS', name: 'Asian Paints' },
  { symbol: 'BAJAJFINSV.NS', name: 'Bajaj Finserv' },
  { symbol: 'COALINDIA.NS', name: 'Coal India' },
  { symbol: 'DRREDDY.NS', name: 'Dr. Reddys Labs' },
  { symbol: 'EICHERMOT.NS', name: 'Eicher Motors' },
  { symbol: 'GRASIM.NS', name: 'Grasim Industries' },
  { symbol: 'HDFCLIFE.NS', name: 'HDFC Life Insurance' },
  { symbol: 'HEROMOTOCO.NS', name: 'Hero MotoCorp' },
  { symbol: 'INDUSINDBK.NS', name: 'IndusInd Bank' },
  { symbol: 'JSWSTEEL.NS', name: 'JSW Steel' },
  { symbol: 'M&M.NS', name: 'Mahindra & Mahindra' },
  { symbol: 'NESTLEIND.NS', name: 'Nestle India' },
  { symbol: 'NTPC.NS', name: 'NTPC' },
  { symbol: 'ONGC.NS', name: 'Oil & Natural Gas Corp' },
  { symbol: 'POWERGRID.NS', name: 'Power Grid Corp' },
  { symbol: 'SBILIFE.NS', name: 'SBI Life Insurance' },
  { symbol: 'TATACONSUM.NS', name: 'Tata Consumer Products' },
  { symbol: 'TATASTEEL.NS', name: 'Tata Steel' },
  { symbol: 'TECHM.NS', name: 'Tech Mahindra' },
  { symbol: 'DIVISLAB.NS', name: 'Divis Laboratories' },
  { symbol: 'CIPLA.NS', name: 'Cipla' },
  { symbol: 'APOLLOHOSP.NS', name: 'Apollo Hospitals' },
  { symbol: 'BRITANNIA.NS', name: 'Britannia Industries' },
  { symbol: 'BAJAJ-AUTO.NS', name: 'Bajaj Auto' },
  { symbol: 'HINDALCO.NS', name: 'Hindalco Industries' },
  { symbol: 'BPCL.NS', name: 'Bharat Petroleum' },
  { symbol: 'TRENT.NS', name: 'Trent' },
  { symbol: 'SHRIRAMFIN.NS', name: 'Shriram Finance' },
];

export default function SearchModal({ open, onClose, onSelect }) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return STOCKS;
    const q = query.toLowerCase();
    return STOCKS.filter(
      (s) =>
        s.symbol.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q)
    );
  }, [query]);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [filtered]);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      // Small delay so the modal has rendered
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [open]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.children[activeIndex];
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const handleSelect = useCallback(
    (symbol) => {
      onSelect?.(symbol);
      onClose?.();
    },
    [onSelect, onClose]
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[activeIndex]) {
          handleSelect(filtered[activeIndex].symbol);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      }
    },
    [filtered, activeIndex, handleSelect, onClose]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-3 pt-[12vh] sm:p-4 sm:pt-[15vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        style={{
          animation: 'searchFadeIn 150ms ease-out',
        }}
      />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-[min(42rem,100vw-1.5rem)] overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: 'searchScaleIn 150ms ease-out',
        }}
      >
        {/* Search Input */}
        <div className="flex items-center gap-2.5 border-b border-[#e5e7eb] px-3 py-3 sm:px-4">
          <Search size={18} className="shrink-0 text-[#94a3b8]" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search stocks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-sm text-[#1a1a2e] outline-none placeholder:text-[#94a3b8]"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="shrink-0 rounded-md p-0.5 text-[#94a3b8] transition-colors hover:text-[#64748b]"
            >
              <X size={16} />
            </button>
          )}
          <kbd className="hidden shrink-0 rounded-md border border-[#e5e7eb] bg-[#f4f5f7] px-1.5 py-0.5 text-[10px] font-medium text-[#94a3b8] sm:inline-block">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[#94a3b8]">
              No stocks found for "{query}"
            </div>
          ) : (
            filtered.map((stock, i) => (
              <button
                key={stock.symbol}
                onClick={() => handleSelect(stock.symbol)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  i === activeIndex
                    ? 'bg-[#f0f7e6]'
                    : 'hover:bg-[#f4f5f7]'
                }`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f4f5f7] text-xs font-bold text-[#1a1a2e]">
                  {stock.symbol.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#1a1a2e]">
                    {stock.symbol.replace('.NS', '')}
                  </p>
                  <p className="truncate text-xs text-[#94a3b8]">
                    {stock.name}
                  </p>
                </div>
                {i === activeIndex && (
                  <kbd className="shrink-0 rounded-md border border-[#e5e7eb] bg-[#f4f5f7] px-1.5 py-0.5 text-[10px] text-[#94a3b8]">
                    ↵
                  </kbd>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center gap-3 border-t border-[#e5e7eb] px-3 py-2 text-[10px] text-[#94a3b8] sm:px-4">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-[#e5e7eb] bg-[#f4f5f7] px-1 py-0.5">↑↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-[#e5e7eb] bg-[#f4f5f7] px-1 py-0.5">↵</kbd>
            select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-[#e5e7eb] bg-[#f4f5f7] px-1 py-0.5">esc</kbd>
            close
          </span>
        </div>
      </div>

      {/* Inline keyframes */}
      <style>{`
        @keyframes searchFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes searchScaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
