const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function buildUrl(path) {
  if (!API_BASE) {
    return path;
  }

  return `${API_BASE}${path}`;
}

async function request(url, options) {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(body || `Request failed with status ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
      throw new Error('Unable to reach the server. Please check your connection.');
    }

    throw err;
  }
}

function post(path, data) {
  return request(buildUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export const api = {
  getMarketStatus: () => request(buildUrl('/api/market_status')),

  analyzeStock: (ticker) => post('/api/analyze', { ticker }),

  getTickerData: () => request(buildUrl('/api/ticker_data')),

  getTop10Predictions: () => request(buildUrl('/api/top10_predictions')),

  getIPOData: () => request(buildUrl('/api/ipo_data')),

  getTrackRecord: () => request(buildUrl('/api/track-record')),

  getNews: () => request(buildUrl('/api/news_analysis')),

  chat: (message) => post('/api/chat', { message }),

  getOptions: (ticker) => request(buildUrl(`/api/options/${ticker}`)),
};
