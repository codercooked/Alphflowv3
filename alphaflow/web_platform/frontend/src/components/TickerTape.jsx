import React from 'react';

const tickerKeyframes = `
@keyframes ticker-scroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
`;

function formatPrice(price) {
  if (price == null) return '—';
  return Number(price).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function TickerItem({ stock }) {
  const isPositive = stock.changePercent >= 0;

  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-4 text-xs">
      <span className="font-semibold text-[#1a1a2e]">
        {stock.symbol?.replace('.NS', '')}
      </span>
      <span className="text-[#64748b]">₹{formatPrice(stock.price)}</span>
      <span
        className={`font-medium ${
          isPositive ? 'text-[#22c55e]' : 'text-[#ef4444]'
        }`}
      >
        {isPositive ? '+' : ''}
        {stock.change?.toFixed(2)}{' '}
        ({isPositive ? '+' : ''}
        {stock.changePercent?.toFixed(2)}%)
      </span>
      <span className="ml-2 text-[#d1d5db]">·</span>
    </span>
  );
}

export default function TickerTape({ stocks = [] }) {
  if (!stocks.length) return null;

  // Duplicate for seamless infinite scroll
  const doubled = [...stocks, ...stocks];

  return (
    <>
      <style>{tickerKeyframes}</style>
      <div className="h-10 w-full overflow-hidden border-b border-[#e5e7eb] bg-[#fafafa]">
        <div
          className="group flex h-full items-center"
          style={{
            animation: `ticker-scroll ${stocks.length * 3}s linear infinite`,
            width: 'max-content',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.animationPlayState = 'paused';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.animationPlayState = 'running';
          }}
        >
          {doubled.map((stock, i) => (
            <TickerItem key={`${stock.symbol}-${i}`} stock={stock} />
          ))}
        </div>
      </div>
    </>
  );
}
