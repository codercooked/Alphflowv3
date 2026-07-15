import {
  Trophy,
  Target,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  BarChart3,
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
  return '₹' + Number(val).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function formatPct(val) {
  if (val == null) return '—';
  return Number(val).toFixed(2) + '%';
}

function formatDate(val) {
  if (!val) return '—';
  try {
    return new Date(val).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return val;
  }
}

/* ─── Error Banner ─── */
function ErrorBanner({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="w-14 h-14 rounded-full bg-[#fef2f2] flex items-center justify-center mb-4">
        <AlertCircle className="w-7 h-7 text-[#ef4444]" />
      </div>
      <p className="text-[#1a1a2e] font-semibold text-lg mb-1">Unable to load track record</p>
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

/* ─── Section Card ─── */
function SectionCard({ title, icon: Icon, children }) {
  return (
    <div className="rounded-2xl border border-[var(--border-light)] bg-white/60 backdrop-blur-sm">
      {title && (
        <div className="px-6 py-4 border-b border-[var(--border-light)] flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5 text-[var(--accent-brand)]" />}
          <h3 className="font-semibold text-[var(--text-primary)]">{title}</h3>
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}

/* ─── Main Component ─── */
export default function TrackRecordPage() {
  const { data, loading, error, refetch } = useApi(() => api.getTrackRecord());

  const accuracy = data?.accuracy ?? data?.overall_accuracy;
  const totalPredictions = data?.total_predictions ?? data?.total;
  const avgError = data?.average_error ?? data?.avg_error;

  const tickerPerformance = Array.isArray(data?.ticker_performance)
    ? [...data.ticker_performance].sort(
        (a, b) => (b.win_rate ?? 0) - (a.win_rate ?? 0)
      )
    : [];

  const recentPredictions = Array.isArray(data?.recent_predictions)
    ? data.recent_predictions.slice(0, 30)
    : [];

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1a1a2e]">Track Record</h1>
            <p className="text-sm text-[#64748b] mt-1">
              Verified AI prediction accuracy and performance history
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

        {error ? (
          <ErrorBanner message={error?.message} onRetry={refetch} />
        ) : (
          <>
            {/* ─── Hero Stats ─── */}
            <div className="grid sm:grid-cols-3 gap-6">
              {/* Accuracy */}
              <div className="rounded-2xl border border-[#e5e7eb] bg-white p-8 text-center">
                {loading ? (
                  <div className="space-y-3 flex flex-col items-center">
                    <Skeleton className="h-14 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-[var(--accent-brand-light)] flex items-center justify-center mx-auto mb-4">
                      <Target className="w-7 h-7 text-[var(--accent-brand)]" />
                    </div>
                    <p className="text-4xl font-bold text-[var(--accent-brand)]">
                      {accuracy != null
                        ? typeof accuracy === 'number' && accuracy <= 1
                          ? (accuracy * 100).toFixed(1) + '%'
                          : formatPct(accuracy)
                        : '—'}
                    </p>
                    <p className="text-sm text-[#64748b] mt-1">
                      Prediction Accuracy
                    </p>
                  </>
                )}
              </div>

              {/* Total Predictions */}
              <div className="rounded-2xl border border-[#e5e7eb] bg-white p-8 text-center">
                {loading ? (
                  <div className="space-y-3 flex flex-col items-center">
                    <Skeleton className="h-14 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-[#eff6ff] flex items-center justify-center mx-auto mb-4">
                      <BarChart3 className="w-7 h-7 text-[#3b82f6]" />
                    </div>
                    <p className="text-4xl font-bold text-[#1a1a2e]">
                      {totalPredictions != null
                        ? Number(totalPredictions).toLocaleString()
                        : '—'}
                    </p>
                    <p className="text-sm text-[#64748b] mt-1">
                      Total Predictions
                    </p>
                  </>
                )}
              </div>

              {/* Avg Error */}
              <div className="rounded-2xl border border-[#e5e7eb] bg-white p-8 text-center">
                {loading ? (
                  <div className="space-y-3 flex flex-col items-center">
                    <Skeleton className="h-14 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-[#fffbeb] flex items-center justify-center mx-auto mb-4">
                      <TrendingUp className="w-7 h-7 text-[#f59e0b]" />
                    </div>
                    <p className="text-4xl font-bold text-[#1a1a2e]">
                      {avgError != null
                        ? typeof avgError === 'number' && avgError <= 1
                          ? (avgError * 100).toFixed(2) + '%'
                          : formatPct(avgError)
                        : '—'}
                    </p>
                    <p className="text-sm text-[#64748b] mt-1">
                      Average Error
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* ─── Per-Ticker Performance ─── */}
            {(loading || tickerPerformance.length > 0) && (
              <SectionCard title="Performance by Ticker" icon={Trophy}>
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs font-medium text-[#94a3b8] uppercase tracking-wider">
                          <th className="pr-4 py-3">Ticker</th>
                          <th className="px-4 py-3 text-right">Win Rate</th>
                          <th className="px-4 py-3 w-48 hidden sm:table-cell" />
                          <th className="px-4 py-3 text-right">Avg Error</th>
                          <th className="pl-4 py-3 text-right">Predictions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e5e7eb]">
                        {tickerPerformance.map((t, idx) => {
                          const winRate =
                            t.win_rate != null
                              ? typeof t.win_rate === 'number' && t.win_rate <= 1
                                ? t.win_rate * 100
                                : Number(t.win_rate)
                              : 0;

                          return (
                            <tr key={t.ticker || idx} className="hover:bg-[#fafafa]">
                              <td className="pr-4 py-3">
                                <span className="font-semibold text-[#1a1a2e]">
                                  {t.ticker || t.symbol}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="font-semibold text-[#1a1a2e]">
                                  {winRate.toFixed(1)}%
                                </span>
                              </td>
                              <td className="px-4 py-3 hidden sm:table-cell">
                                <div className="w-full h-2 rounded-full bg-[#f4f5f7]">
                                  <div
                                    className="h-2 rounded-full transition-all duration-500"
                                    style={{
                                      width: `${Math.min(winRate, 100)}%`,
                                      backgroundColor:
                                        winRate >= 80
                                          ? '#22c55e'
                                          : winRate >= 60
                                          ? '#f59e0b'
                                          : '#ef4444',
                                    }}
                                  />
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right text-[#64748b]">
                                {t.avg_error != null
                                  ? typeof t.avg_error === 'number' && t.avg_error <= 1
                                    ? (t.avg_error * 100).toFixed(2) + '%'
                                    : formatPct(t.avg_error)
                                  : '—'}
                              </td>
                              <td className="pl-4 py-3 text-right text-[#64748b]">
                                {t.total ?? t.predictions ?? '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>
            )}

            {/* ─── Recent Predictions ─── */}
            {(loading || recentPredictions.length > 0) && (
              <SectionCard title="Recent Predictions" icon={Target}>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(8)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs font-medium text-[#94a3b8] uppercase tracking-wider">
                          <th className="pr-4 py-3">Date</th>
                          <th className="px-4 py-3">Ticker</th>
                          <th className="px-4 py-3 text-right">Predicted</th>
                          <th className="px-4 py-3 text-right">Actual</th>
                          <th className="px-4 py-3 text-right">Error %</th>
                          <th className="pl-4 py-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e5e7eb]">
                        {recentPredictions.map((p, idx) => {
                          const isCorrect =
                            p.correct ??
                            p.status === 'correct' ??
                            (p.error_pct != null && Math.abs(Number(p.error_pct)) < 2);

                          return (
                            <tr
                              key={idx}
                              className={
                                isCorrect
                                  ? 'bg-[#f0fdf4]/50 hover:bg-[#f0fdf4]'
                                  : 'bg-[#fef2f2]/50 hover:bg-[#fef2f2]'
                              }
                            >
                              <td className="pr-4 py-3 text-[#64748b]">
                                {formatDate(p.date)}
                              </td>
                              <td className="px-4 py-3">
                                <span className="font-semibold text-[#1a1a2e]">
                                  {p.ticker || p.symbol}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-[#1a1a2e]">
                                {formatPrice(p.predicted_price ?? p.predicted)}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-[#1a1a2e]">
                                {formatPrice(p.actual_price ?? p.actual)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span
                                  className={`text-sm font-medium ${
                                    p.error_pct != null && Math.abs(Number(p.error_pct)) < 2
                                      ? 'text-[#22c55e]'
                                      : 'text-[#ef4444]'
                                  }`}
                                >
                                  {p.error_pct != null
                                    ? Math.abs(Number(p.error_pct)).toFixed(2) + '%'
                                    : '—'}
                                </span>
                              </td>
                              <td className="pl-4 py-3 text-center">
                                {isCorrect ? (
                                  <CheckCircle2 className="w-5 h-5 text-[#22c55e] mx-auto" />
                                ) : (
                                  <XCircle className="w-5 h-5 text-[#ef4444] mx-auto" />
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
