import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, CrosshairMode, CandlestickSeries, AreaSeries, LineSeries } from 'lightweight-charts';

const DEFAULT_COLORS = {
  lineColor: '#2563eb',
  areaTopColor: 'rgba(37, 99, 235, 0.28)',
  areaBottomColor: 'rgba(37, 99, 235, 0.02)',
  upColor: '#10b981',
  downColor: '#ef4444',
  wickUpColor: '#10b981',
  wickDownColor: '#ef4444',
  backgroundColor: 'transparent', // let grid background show
  textColor: '#5c5c64',
  gridColor: 'rgba(229, 226, 218, 0.3)',
};

export default function PriceChart({
  data = [],
  type = 'candlestick',
  height = 400,
  colors = {},
}) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);

  const mergedColors = React.useMemo(() => ({ ...DEFAULT_COLORS, ...colors }), [JSON.stringify(colors)]);
  useEffect(() => {
    if (!containerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      seriesRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: mergedColors.backgroundColor },
        textColor: mergedColors.textColor,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        fontSize: 12,
      },
      width: containerRef.current.clientWidth,
      height,
      grid: {
        vertLines: { color: mergedColors.gridColor },
        horzLines: { color: mergedColors.gridColor },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#94a3b8',
          width: 1,
          style: 3,
          labelBackgroundColor: '#1a1a2e',
        },
        horzLine: {
          color: '#94a3b8',
          width: 1,
          style: 3,
          labelBackgroundColor: '#1a1a2e',
        },
      },
      rightPriceScale: { borderColor: mergedColors.gridColor },
      timeScale: {
        borderColor: mergedColors.gridColor,
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: { vertTouchDrag: false },
    });

    let series;
    if (type === 'candlestick') {
      series = chart.addSeries(CandlestickSeries, {
        upColor: mergedColors.upColor,
        downColor: mergedColors.downColor,
        borderDownColor: mergedColors.downColor,
        borderUpColor: mergedColors.upColor,
        wickDownColor: mergedColors.wickDownColor,
        wickUpColor: mergedColors.wickUpColor,
      });
    } else if (type === 'area') {
      series = chart.addSeries(AreaSeries, {
        lineColor: mergedColors.lineColor,
        topColor: mergedColors.areaTopColor,
        bottomColor: mergedColors.areaBottomColor,
        lineWidth: 2,
      });
    } else {
      series = chart.addSeries(LineSeries, {
        color: mergedColors.lineColor,
        lineWidth: 2,
      });
    }

    series.applyOptions({
      priceFormat: {
        type: 'custom',
        formatter: (price) =>
          '₹' +
          price.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
      },
    });

    chartRef.current = chart;
    seriesRef.current = series;

    return () => {
      chart.remove();
      if (chartRef.current === chart) {
        chartRef.current = null;
        seriesRef.current = null;
      }
    };
  }, [type, height, mergedColors]);

  useEffect(() => {
    if (!chartRef.current || !seriesRef.current) return;

    try {
      seriesRef.current.setData(data);
      if (data.length > 0) {
        chartRef.current.timeScale().fitContent();
      }
    } catch (err) {
      console.error("PriceChart data error:", err);
    }
  }, [data]);

  // ResizeObserver for auto-resize
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (chartRef.current) {
          const { width, height } = entry.contentRect;
          chartRef.current.applyOptions({ width, height });
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={`w-full overflow-hidden rounded-xl border border-[#e5e7eb] bg-white ${height === '100%' ? 'h-full' : ''}`}
      style={height === '100%' ? {} : { height }}
    />
  );
}
