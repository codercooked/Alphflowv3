import React, { useEffect, useRef, useMemo } from 'react';
import { createChart, ColorType, LineSeries } from 'lightweight-charts';

export default function MonteCarloChart({ data, height = 300 }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !data || !data.paths) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#5c5c64',
        fontFamily: "'Inter', -apple-system, sans-serif",
        fontSize: 10,
      },
      width: containerRef.current.clientWidth,
      height,
      grid: {
        vertLines: { color: 'rgba(229, 226, 218, 0.3)' },
        horzLines: { color: 'rgba(229, 226, 218, 0.3)' },
      },
      timeScale: {
        borderColor: 'rgba(229, 226, 218, 0.3)',
        timeVisible: true,
      },
      rightPriceScale: {
        borderColor: 'rgba(229, 226, 218, 0.3)',
      },
      crosshair: {
        vertLine: { labelBackgroundColor: '#1a1a2e' },
        horzLine: { labelBackgroundColor: '#1a1a2e' },
      }
    });

    const timePoints = data.time_points || [];
    // Start date is usually today
    const now = new Date();
    
    // Draw up to 10 random paths to avoid browser crash
    const pathsToShow = data.paths.slice(0, 15);
    
    pathsToShow.forEach((path, idx) => {
      const lineSeries = chart.addSeries(LineSeries, {
        color: `rgba(37, 99, 235, ${Math.max(0.1, 0.4 - (idx * 0.02))})`,
        lineWidth: 1,
        crosshairMarkerVisible: false,
        priceLineVisible: false,
      });

      const seriesData = path.map((price, i) => {
        const d = new Date(now.getTime() + (timePoints[i] || i) * 24 * 60 * 60 * 1000);
        return {
          time: d.toISOString().split('T')[0],
          value: price,
        };
      });
      lineSeries.setData(seriesData);
    });

    // Draw Mean Line
    if (data.mean_path) {
      const meanSeries = chart.addSeries(LineSeries, {
        color: '#10b981',
        lineWidth: 2,
        title: 'Expected',
      });
      meanSeries.setData(data.mean_path.map((price, i) => {
        const d = new Date(now.getTime() + (timePoints[i] || i) * 24 * 60 * 60 * 1000);
        return {
          time: d.toISOString().split('T')[0],
          value: price,
        };
      }));
    }

    chart.timeScale().fitContent();
    chartRef.current = chart;

    return () => {
      chart.remove();
    };
  }, [data, height]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (chartRef.current) chartRef.current.applyOptions({ width: entry.contentRect.width });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return <div ref={containerRef} className="w-full h-full" />;
}
