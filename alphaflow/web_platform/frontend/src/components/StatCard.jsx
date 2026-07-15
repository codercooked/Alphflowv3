import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function StatCard({
  label,
  value,
  suffix = '',
  icon = null,
  trend = null,
  trendValue = '',
}) {
  return (
    <div
      className="
        rounded-xl border border-[var(--border-light)] bg-white/60 backdrop-blur-sm p-5
        transition-all duration-200 hover:shadow-md
      "
    >
      <div className="flex items-start justify-between">
        {/* Icon */}
        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-brand-light)] text-[var(--accent-brand)]">
            {icon}
          </div>
        )}

        {/* Trend indicator */}
        {trend && (
          <div
            className={`
              flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium
              ${
                trend === 'up'
                  ? 'bg-[#f0fdf4] text-[#22c55e]'
                  : 'bg-[#fef2f2] text-[#ef4444]'
              }
            `}
          >
            {trend === 'up' ? (
              <ArrowUpRight size={14} />
            ) : (
              <ArrowDownRight size={14} />
            )}
            {trendValue}
          </div>
        )}
      </div>

      {/* Value */}
      <div className="mt-4">
        <p className="text-2xl font-bold tracking-tight text-[#1a1a2e]">
          {value}
          {suffix && (
            <span className="ml-1 text-base font-medium text-[#94a3b8]">
              {suffix}
            </span>
          )}
        </p>
        <p className="mt-1 text-sm text-[#64748b]">{label}</p>
      </div>
    </div>
  );
}
