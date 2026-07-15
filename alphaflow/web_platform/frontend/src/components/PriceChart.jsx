import React, { useEffect, useRef, useCallback } from 'react';
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

  const initChart = useCallback(() => {
    if (!containerRef.current) return;

    // Cleanup existing chart
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
          style: 3, // dashed
          labelBackgroundColor: '#1a1a2e',
        },
        horzLine: {
          color: '#94a3b8',
          width: 1,
          style: 3,
          labelBackgroundColor: '#1a1a2e',
        },
      },
      rightPriceScale: {
        borderColor: mergedColors.gridColor,
      },
      timeScale: {
        borderColor: mergedColors.gridColor,
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: { vertTouchDrag: false },
    });

    // Add series based on type
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
      // line
      series = chart.addSeries(LineSeries, {
        color: mergedColors.lineColor,
        lineWidth: 2,
      });
    }

    // Format prices with ₹
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

    try {
      if (data.length > 0) {
        series.setData(data);
        chart.timeScale().fitContent();
      }
    } catch (err) {
      console.error("PriceChart data error:", err);
    }

    chartRef.current = chart;
    seriesRef.current = series;
  }, [type, height, data, mergedColors]);

  // Initialize chart
  useEffect(() => {
    initChart();
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }
    };
  }, [initChart]);

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
