const priceHistory = [
  { Date: "2024-01-01T00:00:00", Open: 100, High: 110, Low: 90, Close: 105, Volume: 1000 },
  { date: "2024-01-02", open: 105, high: 115, low: 95, close: 110, volume: 1500 }
];

let sorted = [...priceHistory]
  .map((d) => {
    // If the backend returned in the new Apex format { x, y: [o, h, l, c] }
    if (d.x && Array.isArray(d.y)) {
      return {
        time: d.x,
        open: Number(d.y[0]),
        high: Number(d.y[1]),
        low: Number(d.y[2]),
        close: Number(d.y[3])
      };
    }
    // Fallback to old format
    const dateStr = d.date || d.Date;
    return {
      time: typeof dateStr === 'string' ? dateStr.split('T')[0] : dateStr,
      open: Number(d.open ?? d.Open),
      high: Number(d.high ?? d.High),
      low: Number(d.low ?? d.Low),
      close: Number(d.close ?? d.Close),
    };
  })
  .filter(d => d.time && !isNaN(d.close))
  .sort((a, b) => (a.time > b.time ? 1 : -1));

console.log(sorted);
