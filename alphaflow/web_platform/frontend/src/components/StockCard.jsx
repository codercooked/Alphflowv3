import React from 'react';
import SignalBadge from './SignalBadge';

function formatPrice(price) {
  if (price == null) return '—';
  return Number(price).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function ScoreRing({ score }) {
  const radius = 16;
  const stroke = 3;
  const normalizedRadius = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  const progress = Math.min(Math.max(score, 0), 100);
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const color =
    score >= 70 ? '#22c55e' : score >= 40 ? '#d97706' : '#ef4444';

  return (
    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center">
      <svg height={(radius * 2).toFixed(2)} width={(radius * 2).toFixed(2)} className="-rotate-90">
        <circle
          stroke="#e5e7eb"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius.toFixed(2)}
          cx={radius.toFixed(2)}
          cy={radius.toFixed(2)}
        />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference.toFixed(2)} ${circumference.toFixed(2)}`}
          strokeDashoffset={strokeDashoffset.toFixed(2)}
          r={normalizedRadius.toFixed(2)}
          cx={radius.toFixed(2)}
          cy={radius.toFixed(2)}
          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
        />
      </svg>
      <span
        className="absolute text-[10px] font-bold"
        style={{ color }}
      >
        {score}
      </span>
    </div>
  );
}

export default function StockCard({
  symbol,
  name,
  price,
  change,
  score,
  signal,
  onClick,
}) {
  const isPositive = change >= 0;

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`
        flex items-center gap-4 rounded-xl border border-[#e5e7eb] bg-white px-4 py-3.5
        transition-all duration-200
        ${onClick ? 'cursor-pointer hover:shadow-md active:scale-[0.995]' : ''}
      `}
    >
      {/* Left: Stock info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-[#1a1a2e]">
            {symbol?.replace('.NS', '')}
          </span>
          {signal && <SignalBadge signal={signal} />}
        </div>
        <p className="mt-0.5 truncate text-xs text-[#94a3b8]">{name}</p>
      </div>

      {/* Score ring */}
      {score != null && <ScoreRing score={score} />}

      {/* Right: Price + Change */}
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold text-[#1a1a2e]">
          ₹{formatPrice(price)}
        </p>
        <p
          className={`mt-0.5 text-xs font-medium ${
            isPositive ? 'text-[#22c55e]' : 'text-[#ef4444]'
          }`}
        >
          {isPositive ? '+' : ''}
          {change?.toFixed(2)}%
        </p>
      </div>
    </div>
  );
}
