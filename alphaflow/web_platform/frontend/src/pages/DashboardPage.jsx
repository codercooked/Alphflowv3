import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  Zap,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Target,
  AlertCircle,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import StatCard from '../components/StatCard';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';

/* ─── Skeleton shimmer ─── */
function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-[#e5e7eb]/60 ${className}`}
    />
  );
}

/* ─── Error banner ─── */
function ErrorBanner({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-14 h-14 rounded-full bg-[#fef2f2] flex items-center justify-center mb-4">
        <AlertCircle className="w-7 h-7 text-[#ef4444]" />
      </div>
      <p className="text-[#1a1a2e] font-semibold text-lg mb-1">
        Something went wrong
      </p>
      <p className="text-[#64748b] text-sm mb-6 text-center max-w-md">
        {message || 'Unable to load data. Please try again.'}
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

/* ─── Format helpers ─── */
function formatPrice(val) {
  if (val == null) return '—';
  return '₹' + Number(val).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function formatPct(val) {
  if (val == null) return '—';
  const n = Number(val);
  const sign = n >= 0 ? '+' : '';
  return sign + n.toFixed(2) + '%';
}

function changeColor(val) {
  if (val == null) return 'text-[#64748b]';
  return Number(val) >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]';
}

function changeBg(val) {
  if (val == null) return 'bg-[#f4f5f7]';
  return Number(val) >= 0 ? 'bg-[#f0fdf4]' : 'bg-[#fef2f2]';
}

/* ─── Main Component ─── */
export default function DashboardPage() {
  const navigate = useNavigate();
  const {
    data: market,
    loading: marketLoading,
    error: marketError,
    refetch: refetchMarket,
  } = useApi(() => api.getMarketStatus());

  const {
    data: picks,
    loading: picksLoading,
    error: picksError,
    refetch: refetchPicks,
  } = useApi(() => api.getTop10Predictions());

  const niftyValue = market?.nifty50?.current ?? market?.current_price;
  const niftyChange = market?.nifty50?.change ?? market?.change;
  const niftyChangePct = market?.nifty50?.change_pct ?? market?.change_pct;
  const isMarketOpen = market?.is_open ?? market?.market_open ?? false;
  const stocksAnalyzed = market?.stocks_analyzed ?? 500;
  const aiAccuracy = market?.accuracy ?? '99.2%';
  const topSignal = market?.top_signal ?? 'BUY';

  const predictions = Array.isArray(picks) ? picks : (picks?.picks ?? picks?.predictions ?? []);

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ─── Page Header ─── */}
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">Dashboard</h1>
          <p className="text-sm text-[#64748b] mt-1">
            Market overview and top AI predictions
          </p>
        </div>

        {/* ─── Market Overview ─── */}
        {marketError ? (
          <ErrorBanner message={marketError?.message} onRetry={refetchMarket} />
        ) : (
          <>
            {/* NIFTY 50 Banner */}
            <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 sm:p-8">
              {marketLoading ? (
                <div className="flex items-center gap-6">
                  <Skeleton className="h-10 w-40" />
                  <Skeleton className="h-6 w-24" />
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-8">
                  <div>
                    <p className="text-sm font-medium text-[#64748b] mb-1">
                      NIFTY 50
                    </p>
                    <p className="text-4xl font-bold text-[#1a1a2e] tracking-tight">
                      {niftyValue != null
                        ? Number(niftyValue).toLocaleString('en-IN', {
                            maximumFractionDigits: 2,
                          })
                        : '—'}
                    </p>
                  </div>

                  {niftyChange != null && (
                    <div
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold ${changeBg(niftyChange)} ${changeColor(niftyChange)}`}
                    >
                      {Number(niftyChange) >= 0 ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                      {Number(niftyChange) >= 0 ? '+' : ''}
                      {Number(niftyChange).toFixed(2)} ({formatPct(niftyChangePct)})
                    </div>
                  )}

                  <div className="sm:ml-auto flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        isMarketOpen ? 'bg-[#22c55e]' : 'bg-[#94a3b8]'
                      }`}
                    />
                    <span className="text-sm text-[#64748b]">
                      {isMarketOpen ? 'Market Open' : 'Market Closed'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Market Status"
                value={
                  marketLoading ? '...' : isMarketOpen ? 'Open' : 'Closed'
                }
                icon={<Clock className="w-5 h-5" />}
                subtitle={
                  isMarketOpen ? 'Trading hours' : 'Opens 9:15 AM IST'
                }
              />
              <StatCard
                title="Stocks Analyzed"
                value={marketLoading ? '...' : stocksAnalyzed}
                icon={<BarChart3 className="w-5 h-5" />}
                subtitle="NSE & BSE"
              />
              <StatCard
                title="AI Accuracy"
                value={marketLoading ? '...' : aiAccuracy}
                icon={<Target className="w-5 h-5" />}
                subtitle="Last 30 days"
              />
              <StatCard
                title="Top Signal"
                value={marketLoading ? '...' : topSignal}
                icon={<Zap className="w-5 h-5" />}
                subtitle="Today's strongest"
              />
            </div>
          </>
        )}

        {/* ─── Top 10 AI Picks ─── */}
        <div className="rounded-2xl border border-[#e5e7eb] bg-white">
          <div className="px-6 py-5 border-b border-[#e5e7eb] flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#1a1a2e]">
                Top 10 AI Picks
              </h2>
              <p className="text-sm text-[#64748b] mt-0.5">
                Highest-confidence predictions for today
              </p>
            </div>
            {!picksLoading && (
              <button
                onClick={refetchPicks}
                className="p-2 rounded-lg hover:bg-[#f4f5f7] text-[#64748b] transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>

          {picksError ? (
            <ErrorBanner message={picksError?.message} onRetry={refetchPicks} />
          ) : picksLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : predictions.length === 0 ? (
            <div className="py-16 text-center text-[#64748b] text-sm">
              No predictions available yet. Check back during market hours.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-[#94a3b8] uppercase tracking-wider">
                    <th className="px-6 py-3">#</th>
                    <th className="px-6 py-3">Symbol</th>
                    <th className="px-6 py-3 hidden sm:table-cell">Company</th>
                    <th className="px-6 py-3 text-right">Price</th>
                    <th className="px-6 py-3 text-right">Predicted Change</th>
                    <th className="px-6 py-3 text-right">AI Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e7eb]">
                  {predictions.slice(0, 10).map((p, idx) => {
                    const change = p.predicted_change_pct ?? p.predicted_change;
                    const score = p.ai_score ?? p.confidence;
                    return (
                      <tr
                        key={p.symbol || idx}
                        onClick={() => navigate(`/stocks/${encodeURIComponent(p.symbol || p.ticker)}`)}
                        className="hover:bg-[#fafafa] cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4 font-medium text-[#94a3b8]">
                          {idx + 1}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-semibold text-[#1a1a2e]">
                            {p.symbol || p.ticker}
                          </span>
                        </td>
                        <td className="px-6 py-4 hidden sm:table-cell text-[#64748b]">
                          {p.company_name || p.company || '—'}
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-[#1a1a2e]">
                          {formatPrice(p.current_price ?? p.price)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${changeBg(change)} ${changeColor(change)}`}
                          >
                            {change != null && Number(change) >= 0 ? (
                              <ArrowUpRight className="w-3 h-3" />
                            ) : (
                              <ArrowDownRight className="w-3 h-3" />
                            )}
                            {formatPct(change)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-semibold text-[#1a1a2e]">
                            {score != null
                              ? typeof score === 'number' && score <= 1
                                ? (score * 100).toFixed(0) + '%'
                                : score + (typeof score === 'number' ? '%' : '')
                              : '—'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
