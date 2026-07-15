import { useState } from 'react';
import {
  CalendarClock,
  RefreshCw,
  AlertCircle,
  Clock,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Filter,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';

/* ─── Helpers ─── */
function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-[#e5e7eb]/60 ${className}`} />;
}

function formatPrice(val) {
  if (val == null) return '—';
  return '₹' + Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function formatDate(val) {
  if (!val) return '—';
  try {
    return new Date(val).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return val;
  }
}

/* ─── Status badge config ─── */
const STATUS_CONFIG = {
  open: {
    label: 'Open',
    bg: 'bg-[#f0fdf4]',
    text: 'text-[#22c55e]',
    border: 'border-[#bbf7d0]',
    dot: 'bg-[#22c55e]',
  },
  upcoming: {
    label: 'Upcoming',
    bg: 'bg-[#fffbeb]',
    text: 'text-[#f59e0b]',
    border: 'border-[#fde68a]',
    dot: 'bg-[#f59e0b]',
  },
  listed: {
    label: 'Listed',
    bg: 'bg-[#eff6ff]',
    text: 'text-[#3b82f6]',
    border: 'border-[#bfdbfe]',
    dot: 'bg-[#3b82f6]',
  },
  closed: {
    label: 'Closed',
    bg: 'bg-[#f4f5f7]',
    text: 'text-[#94a3b8]',
    border: 'border-[#e5e7eb]',
    dot: 'bg-[#94a3b8]',
  },
};

function getStatusConfig(status) {
  const key = (status || '').toLowerCase();
  return STATUS_CONFIG[key] || STATUS_CONFIG.closed;
}

/* ─── Tabs ─── */
const TABS = ['All', 'Upcoming', 'Open', 'Listed', 'Closed'];

/* ─── Error Banner ─── */
function ErrorBanner({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="w-14 h-14 rounded-full bg-[#fef2f2] flex items-center justify-center mb-4">
        <AlertCircle className="w-7 h-7 text-[#ef4444]" />
      </div>
      <p className="text-[#1a1a2e] font-semibold text-lg mb-1">Unable to load IPO data</p>
      <p className="text-[#64748b] text-sm mb-6 text-center max-w-md">
        {message || 'Please try again later.'}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1a1a2e] text-white text-sm font-medium hover:bg-[#1a1a2e]/90 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      )}
    </div>
  );
}

/* ─── IPO Card ─── */
function IPOCard({ ipo }) {
  const sc = getStatusConfig(ipo.status);

  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 hover:shadow-lg hover:shadow-black/5 transition-all duration-300">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <h3 className="text-base font-semibold text-[#1a1a2e] leading-snug">
          {ipo.company_name || 'Unknown Company'}
        </h3>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shrink-0 ${sc.bg} ${sc.text} ${sc.border}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
          {sc.label}
        </span>
      </div>

      {/* Price band */}
      {ipo.price_band && (
        <div className="mb-4">
          <p className="text-xs text-[#94a3b8] mb-1">Price Band</p>
          <p className="text-lg font-bold text-[#1a1a2e]">
            {typeof ipo.price_band === 'string'
              ? ipo.price_band
              : `${formatPrice(ipo.price_band?.min)} – ${formatPrice(ipo.price_band?.max)}`}
          </p>
        </div>
      )}

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {ipo.open_date && (
          <div>
            <p className="text-xs text-[#94a3b8] mb-0.5">Open Date</p>
            <p className="text-sm font-medium text-[#1a1a2e]">{formatDate(ipo.open_date)}</p>
          </div>
        )}
        {ipo.close_date && (
          <div>
            <p className="text-xs text-[#94a3b8] mb-0.5">Close Date</p>
            <p className="text-sm font-medium text-[#1a1a2e]">{formatDate(ipo.close_date)}</p>
          </div>
        )}
        {ipo.listing_date && (
          <div>
            <p className="text-xs text-[#94a3b8] mb-0.5">Listing Date</p>
            <p className="text-sm font-medium text-[#1a1a2e]">{formatDate(ipo.listing_date)}</p>
          </div>
        )}
        {ipo.lot_size && (
          <div>
            <p className="text-xs text-[#94a3b8] mb-0.5">Lot Size</p>
            <p className="text-sm font-medium text-[#1a1a2e]">{ipo.lot_size} shares</p>
          </div>
        )}
      </div>

      {/* GMP & Subscription */}
      <div className="flex flex-wrap gap-3">
        {ipo.gmp != null && (
          <div className="px-3 py-2 rounded-xl bg-[var(--accent-brand-light)] border border-[var(--border-light)]">
            <p className="text-xs text-[var(--text-secondary)] mb-0.5">GMP</p>
            <p className="text-sm font-bold text-[var(--accent-brand)]">
              {typeof ipo.gmp === 'number' ? formatPrice(ipo.gmp) : ipo.gmp}
            </p>
          </div>
        )}
        {ipo.subscription_times != null && (
          <div className="px-3 py-2 rounded-xl bg-[#eff6ff] border border-[#bfdbfe]">
            <p className="text-xs text-[#64748b] mb-0.5">Subscribed</p>
            <p className="text-sm font-bold text-[#3b82f6]">
              {ipo.subscription_times}x
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
export default function IPOPage() {
  const [activeTab, setActiveTab] = useState('All');
  const { data, loading, error, refetch } = useApi(() => api.getIPOData());

  const allIPOs = Array.isArray(data) ? data : data?.ipos ?? [];

  const filteredIPOs =
    activeTab === 'All'
      ? allIPOs
      : allIPOs.filter(
          (ipo) =>
            (ipo.status || '').toLowerCase() === activeTab.toLowerCase()
        );

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1a1a2e]">IPO Tracker</h1>
            <p className="text-sm text-[#64748b] mt-1">
              Track upcoming, open, and recently listed IPOs
            </p>
          </div>
          {!loading && (
            <button
              onClick={refetch}
              className="p-2.5 rounded-lg hover:bg-[#f4f5f7] text-[#64748b] transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#f4f5f7] overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab
                  ? 'bg-white text-[#1a1a2e] shadow-sm'
                  : 'text-[#64748b] hover:text-[#1a1a2e]'
              }`}
            >
              {tab}
              {tab !== 'All' && (
                <span className="ml-1.5 text-xs text-[#94a3b8]">
                  {allIPOs.filter(
                    (ipo) =>
                      (ipo.status || '').toLowerCase() === tab.toLowerCase()
                  ).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {error ? (
          <ErrorBanner message={error?.message} onRetry={refetch} />
        ) : loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-64 w-full rounded-2xl" />
            ))}
          </div>
        ) : filteredIPOs.length === 0 ? (
          <div className="text-center py-20">
            <CalendarClock className="w-12 h-12 text-[#94a3b8] mx-auto mb-4" />
            <p className="text-lg font-semibold text-[#1a1a2e] mb-1">
              No {activeTab === 'All' ? '' : activeTab.toLowerCase()} IPOs
            </p>
            <p className="text-sm text-[#64748b]">
              {activeTab === 'All'
                ? 'No IPO data is available at this time.'
                : `There are no ${activeTab.toLowerCase()} IPOs right now. Check back later.`}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredIPOs.map((ipo, idx) => (
              <IPOCard key={ipo.company_name || idx} ipo={ipo} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
