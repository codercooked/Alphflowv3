const priceHistory = [
  {'x': '2023-06-26', 'y': [3205.0, 3213.9, 3173.0, 3189.65]},
  {'x': '2023-06-27', 'y': [3202.0, 3209.65, 3182.3, 3197.35]}
];

let sorted = [...priceHistory]
  .map((d) => {
    if (d.x && Array.isArray(d.y)) {
      return {
        time: d.x,
        open: Number(d.y[0]),
        high: Number(d.y[1]),
        low: Number(d.y[2]),
        close: Number(d.y[3])
      };
    }
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
