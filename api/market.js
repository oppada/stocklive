// api/market.js
// Vercel Serverless Function for StockLive

const NodeCache = require('node-cache');

// Initialize cache outside of the handler to persist across invocations.
const kisCache = new NodeCache({ stdTTL: 60 });

// --- MOCK KIS API Service ---
// This logic is moved from the original express server.
const getKisToken = async () => {
  console.log('Fetching new KIS API token...');
  return 'mock-api-token-for-development';
};

const fetchThemeRankings = async (token) => {
  console.log(`Fetching theme rankings with token: ${token}`);
  return [
    { theme: '반도체', change: '+5.8%' },
    { theme: 'AI', change: '+4.2%' },
    { theme: '2차전지', change: '-1.5%' },
  ];
};

const fetchMarketRankings = async (token, type) => {
  console.log(`Fetching market ranking for '${type}' with token: ${token}`);
  const mockData = {
    volume: [
      { name: '삼성전자', price: '80,000', change: '+1.2%' },
      { name: 'SK하이닉스', price: '130,000', change: '+2.5%' },
    ],
    rising: [
      { name: '에코프로', price: '550,000', change: '+15.0%' },
      { name: 'POSCO홀딩스', price: '420,000', change: '+11.8%' },
    ],
    falling: [
      { name: '셀트리온', price: '170,000', change: '-7.2%' },
      { name: 'NAVER', price: '200,000', change: '-5.4%' },
    ],
  };
  return mockData[type] || [];
};
// --- End of MOCK ---

// The main serverless function handler
export default async function handler(req, res) {
  // Simple router based on the request URL
  const { url } = req;
  const urlParts = url.split('/');
  const route = urlParts[3]; // e.g., 'themes' or 'ranking'
  
  try {
    if (route === 'themes') {
      // Logic for /api/market/themes
      const cacheKey = 'themes';
      if (kisCache.has(cacheKey)) {
        console.log('Serving themes from cache.');
        return res.status(200).json(kisCache.get(cacheKey));
      }
      const token = await getKisToken();
      const data = await fetchThemeRankings(token);
      kisCache.set(cacheKey, data);
      console.log('Fetched new theme data and cached it.');
      return res.status(200).json(data);

    } else if (route === 'ranking') {
      // Logic for /api/market/ranking/:type
      const type = urlParts[4];
      if (!['volume', 'rising', 'falling'].includes(type)) {
        return res.status(400).json({ error: 'Invalid ranking type.' });
      }

      const cacheKey = `ranking_${type}`;
      if (kisCache.has(cacheKey)) {
        console.log(`Serving '${type}' ranking from cache.`);
        return res.status(200).json(kisCache.get(cacheKey));
      }

      const token = await getKisToken();
      const data = await fetchMarketRankings(token, type);
      kisCache.set(cacheKey, data);
      console.log(`Fetched new '${type}' ranking and cached it.`);
      return res.status(200).json(data);
    } else {
      return res.status(404).json({ error: 'Not Found' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
