// server/index.js
// Project: StockLive - Stock Information & Community

// 1. Module Imports
const express = require('express');
const cors = require('cors');
const NodeCache = require('node-cache');
require('dotenv').config();

// 2. Initialization
const app = express();
const port = process.env.PORT || 4000;
// KIS API Cache: Cache results for 60 seconds to avoid rate limits, as specified.
const kisCache = new NodeCache({ stdTTL: 60 });

// 3. Middleware
app.use(cors());
app.use(express.json());

// --- MOCK KIS API Service ---
// In a real app, this would be in `/services/kisAPIService.js`
// This function simulates fetching an OAuth2 token from the KIS API.
const getKisToken = async () => {
  // Real implementation would use process.env.KIS_APP_KEY and process.env.KIS_SECRET_KEY
  // to make an actual API call.
  console.log('Fetching new KIS API token...');
  return 'mock-api-token-for-development';
};

// This function simulates fetching theme rankings.
const fetchThemeRankings = async (token) => {
  console.log(`Fetching theme rankings with token: ${token}`);
  // In a real scenario, this would make a request to the KIS API endpoint for themes.
  return [
    { theme: '반도체', change: '+5.8%' },
    { theme: 'AI', change: '+4.2%' },
    { theme: '2차전지', change: '-1.5%' },
  ];
};

// This function simulates fetching market rankings (volume, rising, falling).
const fetchMarketRankings = async (token, type) => {
  console.log(`Fetching market ranking for '${type}' with token: ${token}`);
  // Mock data based on type
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


// 4. API Routes
/**
 * @route GET /api/market/themes
 * @description Fetches real-time theme rankings from KIS API with caching.
 */
app.get('/api/market/themes', async (req, res) => {
  const cacheKey = 'themes';
  if (kisCache.has(cacheKey)) {
    console.log('Serving themes from cache.');
    return res.json(kisCache.get(cacheKey));
  }

  try {
    const token = await getKisToken();
    const data = await fetchThemeRankings(token);
    kisCache.set(cacheKey, data);
    console.log('Fetched new theme data and cached it.');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch theme rankings.' });
  }
});

/**
 * @route GET /api/market/ranking/:type
 * @description Fetches market rankings by type (volume, rising, falling) with caching.
 */
app.get('/api/market/ranking/:type', async (req, res) => {
  const { type } = req.params;
  if (!['volume', 'rising', 'falling'].includes(type)) {
    return res.status(400).json({ error: 'Invalid ranking type.' });
  }

  const cacheKey = `ranking_${type}`;
  if (kisCache.has(cacheKey)) {
    console.log(`Serving '${type}' ranking from cache.`);
    return res.json(kisCache.get(cacheKey));
  }

  try {
    const token = await getKisToken();
    const data = await fetchMarketRankings(token, type);
    kisCache.set(cacheKey, data);
    console.log(`Fetched new '${type}' ranking and cached it.`);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch ${type} ranking.` });
  }
});


// 5. Server Startup
app.listen(port, () => {
  console.log(`StockLive server running on http://localhost:${port}`);
});
