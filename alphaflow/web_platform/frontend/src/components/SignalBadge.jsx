import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const SIGNAL_CONFIG = {
  BUY: {
    bg: 'bg-[#f0fdf4]',
    text: 'text-[#16a34a]',
    border: 'border-[#bbf7d0]',
    icon: TrendingUp,
  },
  'STRONG BUY': {
    bg: 'bg-[#f0fdf4]',
    text: 'text-[#16a34a]',
    border: 'border-[#86efac]',
    icon: TrendingUp,
  },
  SELL: {
    bg: 'bg-[#fef2f2]',
    text: 'text-[#dc2626]',
    border: 'border-[#fecaca]',
    icon: TrendingDown,
  },
  'STRONG SELL': {
    bg: 'bg-[#fef2f2]',
    text: 'text-[#dc2626]',
    border: 'border-[#fca5a5]',
    icon: TrendingDown,
  },
  HOLD: {
    bg: 'bg-[#fffbeb]',
    text: 'text-[#d97706]',
    border: 'border-[#fde68a]',
    icon: Minus,
  },
};

export default function SignalBadge({ signal }) {
  let cleanSignal = signal?.toUpperCase() || 'HOLD';
  if (cleanSignal.includes('BUY')) {
    cleanSignal = cleanSignal.includes('SOVEREIGN') || cleanSignal.includes('STRONG') ? 'STRONG BUY' : 'BUY';
  } else if (cleanSignal.includes('SELL')) {
    cleanSignal = cleanSignal.includes('SOVEREIGN') || cleanSignal.includes('STRONG') ? 'STRONG SELL' : 'SELL';
  } else {
    cleanSignal = 'HOLD';
  }
  
  const config = SIGNAL_CONFIG[cleanSignal] || SIGNAL_CONFIG.HOLD;
  const Icon = config.icon;

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full border px-3 py-1
        text-xs font-semibold leading-none select-none
        ${config.bg} ${config.text} ${config.border}
      `}
    >
      <Icon size={12} strokeWidth={2.5} />
      {signal?.toUpperCase() || 'HOLD'}
    </span>
  );
}
