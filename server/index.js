const express = require('express');
const cors = require('cors');
const NodeCache = require('node-cache');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 4000;

const kisPriceCache = new NodeCache({ stdTTL: 60 });
const kisTokenCache = new NodeCache({ stdTTL: 86400 });
const themeRankingCache = new NodeCache({ stdTTL: 300 }); // New cache for theme ranking results (5 minutes)

const KIS_APP_KEY = process.env.KIS_APP_KEY;
const KIS_SECRET_KEY = process.env.KIS_SECRET_KEY;
const KIS_BASE_URL = (process.env.KIS_BASE_URL || 'https://openapi.koreainvestment.com:9443').trim().replace(/\/$/, "");

let allKrxStocks = []; // Declare at top level

const stockCodeToNameMap = new Map(); 



let themesData = [];

try {

  const themesPath = path.join(__dirname, '../client/public/toss_real_150_themes.json');

  themesData = JSON.parse(fs.readFileSync(themesPath, 'utf8')).themes;

  themesData.forEach(t => t.stocks.forEach(s => stockCodeToNameMap.set(s.code, s.name)));

  console.log(`Loaded ${themesData.length} themes.`);

} catch (e) { console.error("Theme Load Error", e); }



try {

  const krxStocksPath = path.join(__dirname, '../all/krx_stocks.json');

  allKrxStocks = JSON.parse(fs.readFileSync(krxStocksPath, 'utf8'));

  allKrxStocks.forEach(s => stockCodeToNameMap.set(s.code, s.name));

  console.log(`Loaded ${allKrxStocks.length} stocks from krx_stocks.json.`);

} catch (e) { console.error("Error loading krx_stocks.json:", e); }





app.use(cors());
app.use(express.json());

const getKisToken = async () => {
  if (kisTokenCache.has('token')) return kisTokenCache.get('token');
  try {
    const response = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
      appkey: KIS_APP_KEY, appsecret: KIS_SECRET_KEY, grant_type: 'client_credentials'
    });
    const token = response.data.access_token;
    kisTokenCache.set('token', token, response.data.expires_in - 60);
    console.log("New Token Issued Successfully.");
    return token;
  } catch (error) { throw error; }
};

const fetchStockPrice = async (token, code) => {
  const cacheKey = `price_${code}`;
  if (kisPriceCache.has(cacheKey)) return kisPriceCache.get(cacheKey);
  try {
    const response = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price`, {
      headers: {
        'authorization': `Bearer ${token}`,
        'appkey': KIS_APP_KEY, 'appsecret': KIS_SECRET_KEY,
        'tr_id': 'FHKST01010100', 'custtype': 'P'
      },
      params: { 'FID_COND_MRKT_DIV_CODE': 'J', 'FID_INPUT_ISCD': code }
    });
    const o = response.data.output;
    if(!o) return null;

    // --- Start Debugging Logs ---
    console.log("Raw KIS API output for stock:", code, o);
    // console.log(`  acml_vol: '${o.acml_vol}', parsed: ${parseInt(o.acml_vol || '0')}`);
    // console.log(`  acml_tr_pbmn: '${o.acml_tr_pbmn}', parsed: ${parseInt(o.acml_tr_pbmn || '0')}`);
    // --- End Debugging Logs ---

                const data = { 

                  code, 

                  price: parseInt(o.stck_prpr || '0'), 

                  changeRate: parseFloat(o.prdy_ctrt || '0'), 

                  volume: parseInt(String(o.acml_vol || '0').replace(/,/g, '')),

                  tradeValue: parseInt(String(o.acml_tr_pbmn || '0').replace(/,/g, '')),

                  name: stockCodeToNameMap.get(code) || o.hts_korp_isnm 

                };    kisPriceCache.set(cacheKey, data);
    return data;
  } catch (e) { return null; }
};

const chunkedFetchStockPrices = async (token, codesToFetch, chunkSize = 10, delayMs = 500) => {
  const allResults = [];
  for (let i = 0; i < codesToFetch.length; i += chunkSize) {
    if (!token) {
      console.error("No KIS token available during chunked fetch.");
      break;
    }
    const chunk = codesToFetch.slice(i, i + chunkSize);
    const promises = chunk.map(code => fetchStockPrice(token, code));
    const chunkResults = await Promise.all(promises);
    allResults.push(...chunkResults.filter(Boolean));
    if (i + chunkSize < codesToFetch.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  return allResults;
};

// [수정] 테마 수익률 계산 라우트
app.get('/api/themes/top-performing', async (req, res) => {
  const cacheKey = 'theme_ranking_results';
  if (themeRankingCache.has(cacheKey)) {
    console.log("Returning theme ranking from cache.");
    return res.json(themeRankingCache.get(cacheKey));
  }

  try {
    const token = await getKisToken();
    // 1. Get all unique stock codes from all themes
    const allThemeStockCodes = Array.from(new Set(themesData.flatMap(t => t.stocks.map(s => s.code))));
    
    // 2. Fetch prices for all unique stock codes using chunking
    const allFetchedStocks = await chunkedFetchStockPrices(token, allThemeStockCodes, 10, 500); // 10 stocks per chunk, 500ms delay
    const priceMap = new Map(allFetchedStocks.map(r => [r.code, r]));

    // 3. Calculate avgChangeRate for each theme using the comprehensive priceMap
    const result = themesData.map(t => {
      const stocksWithPrices = t.stocks.map(s => priceMap.get(s.code)).filter(Boolean);
      const avg = stocksWithPrices.length ? stocksWithPrices.reduce((a, b) => a + b.changeRate, 0) / stocksWithPrices.length : 0;
      return { name: t.theme_name, avgChangeRate: avg, stocks: stocksWithPrices };
    }).sort((a, b) => b.avgChangeRate - a.avgChangeRate);

    themeRankingCache.set(cacheKey, result); // Cache the result
    res.json(result);
  } catch (e) {
    console.error("Failed to fetch top performing themes:", e);
    res.status(500).json([]);
  }
});

// [추가] 테마 상세 종목 조회 (프론트엔드 연동)
app.get('/api/themes/:themeName/stocks', async (req, res) => {
  const theme = themesData.find(t => t.theme_name === req.params.themeName);
  if (!theme) return res.status(404).json([]);
  try {
    const token = await getKisToken();
    // Filter for unique stock codes within the theme
    const uniqueStockCodes = Array.from(new Set(theme.stocks.map(s => s.code)));
    const results = await Promise.all(uniqueStockCodes.map(code => fetchStockPrice(token, code)));
    res.json(results.filter(Boolean).sort((a, b) => b.changeRate - a.changeRate));
  } catch (e) {
    console.error(`Failed to fetch stocks for theme ${req.params.themeName}:`, e);
    res.status(500).json([]);
  }
});

const fullStockDataCache = new NodeCache({ stdTTL: 600 }); // 10분 TTL

const fetchAllStockDataAndCache = async () => {
  console.log("Starting to fetch all stock data for ranking cache...");
  try {
    const token = await getKisToken();
    
    const allStockCodes = allKrxStocks.map(s => s.code);
    console.log(`Using ${allStockCodes.length} stock codes from krx_stocks.json to fetch data.`);

    const validResults = [];
    const chunkSize = 20; // Increased to 20 stocks at a time
    const totalStocks = allStockCodes.length;
    const startTime = Date.now();

    for (let i = 0; i < totalStocks; i += chunkSize) {
        if (!token) {
            console.error("No KIS token available, stopping stock data fetch.");
            break;
        }
        const chunk = allStockCodes.slice(i, i + chunkSize);
        const promises = chunk.map(code => fetchStockPrice(token, code));
        const chunkResults = await Promise.all(promises);
        validResults.push(...chunkResults.filter(Boolean));
        
        // Log progress every 100 stocks processed or at the end
        if ((i + chunkSize) % 100 === 0 || (i + chunkSize) >= totalStocks) {
            const processedCount = Math.min(i + chunkSize, totalStocks);
            const percentage = ((processedCount / totalStocks) * 100).toFixed(1);
            const elapsedTime = (Date.now() - startTime) / 1000; // seconds
            const estimatedTotalTime = (elapsedTime / processedCount) * totalStocks;
            const estimatedRemainingTime = estimatedTotalTime - elapsedTime;

            console.log(`Processed ${processedCount}/${totalStocks} stocks (${percentage}%), found ${validResults.length} valid stocks. Estimated remaining: ${estimatedRemainingTime.toFixed(1)}s`);
        }

        // Delay to avoid API rate limiting
        await new Promise(resolve => setTimeout(resolve, 500)); 
    }
    
    fullStockDataCache.set('all_stocks', validResults);
    console.log(`Successfully cached data for ${validResults.length} stocks. Ranking cache is now fully populated.`);
  } catch (error) {
    console.error("Failed to fetch and cache all stock data:", error);
  }
};

// Initial fetch and set interval for refreshing the cache every 3 minutes
fetchAllStockDataAndCache();
setInterval(fetchAllStockDataAndCache, 180000); // 180,000 ms = 3 minutes


app.get('/api/ranking/:type', async (req, res) => {
  const allStocks = fullStockDataCache.get('all_stocks');
  if (!allStocks) {
    // If cache is empty, either wait for it or send a "try again" message
    return res.status(503).json({ message: "Ranking data is currently being prepared. Please try again in a moment." });
  }

  let sortedStocks = [];
  const type = req.params.type;

  switch(type) {
    case 'gainer':
      sortedStocks = [...allStocks].sort((a, b) => b.changeRate - a.changeRate);
      break;
    case 'loser':
      sortedStocks = [...allStocks].sort((a, b) => a.changeRate - b.changeRate);
      break;
    case 'volume':
      sortedStocks = [...allStocks].sort((a, b) => b.volume - a.volume);
      break;
    case 'value':
      sortedStocks = [...allStocks].sort((a, b) => b.tradeValue - a.tradeValue);
      break;
    default:
      return res.status(404).send('Invalid ranking type');
  }
  
  res.json(sortedStocks.slice(0, 50));
});

app.get('/api/stocks/prices', async (req, res) => {
  const codes = (req.query.codes || "").split(',').filter(Boolean);
  try {
    const token = await getKisToken();
    const results = await Promise.all(codes.map(c => fetchStockPrice(token, c.trim())));
    res.json(results.filter(Boolean).reduce((a, s) => ({ ...a, [s.code]: s }), {}));
  } catch (e) { res.status(500).json({}); }
});

// --- Conditional Export/Listen for Vercel/Local Development ---
// If we are in a Vercel environment (process.env.VERCEL is typically true),
// or if we are loaded as a module (e.g., by Vercel), export the app.
// Otherwise, for local development, start listening on the port.
if (process.env.VERCEL || require.main !== module) {
  module.exports = app;
} else {
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}