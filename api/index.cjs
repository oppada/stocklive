const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 4000;

const { getKisToken, fetchStockPrice, chunkedFetchStockPrices } = require('./lib/kisApi.cjs');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const NodeCache = require('node-cache');



const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let allKrxStocks = []; // Declare at top level
const stockCodeToNameMap = new Map();

let themesData = [];

try {
  const themesPath = path.join(__dirname, 'toss_real_150_themes.json');
  themesData = JSON.parse(fs.readFileSync(themesPath, 'utf8')).themes;
  themesData.forEach(t => t.stocks.forEach(s => stockCodeToNameMap.set(s.code, s.name)));
  console.log(`Loaded ${themesData.length} themes.`);
} catch (e) { console.error("Theme Load Error", e); }

try {
  const krxStocksPath = path.join(__dirname, 'krx_stocks.json');
  allKrxStocks = JSON.parse(fs.readFileSync(krxStocksPath, 'utf8'));
  allKrxStocks.forEach(s => stockCodeToNameMap.set(s.code, s.name)); // Ensure map is populated for local fetches
  console.log(`Loaded ${allKrxStocks.length} stocks from krx_stocks.json.`);
} catch (e) { console.error("Error loading krx_stocks.json:", e); }

app.use(cors());
app.use(express.json());







// [수정] 테마 수익률 계산 라우트
app.get('/api/themes/top-performing', async (req, res) => {
  const cacheKey = 'theme_ranking_results';
  const { data: cachedThemeData, error: fetchThemeError } = await supabase
    .from('stock_data_cache')
    .select('data')
    .eq('id', cacheKey)
    .single();

  if (!fetchThemeError && cachedThemeData && cachedThemeData.data) {
    console.log("Returning theme ranking from Supabase cache.");
    return res.json(cachedThemeData.data);
  }

  try {
    const token = await getKisToken();
    // 1. Get all unique stock codes from all themes
    const allThemeStockCodes = Array.from(new Set(themesData.flatMap(t => t.stocks.map(s => s.code))));
    
    // 2. Fetch prices for all unique stock codes using chunking
    const allFetchedStocks = await chunkedFetchStockPrices(token, allThemeStockCodes, stockCodeToNameMap, 10, 500); // 10 stocks per chunk, 500ms delay
    const priceMap = new Map(allFetchedStocks.map(r => [r.code, r]));

    // 3. Calculate avgChangeRate for each theme using the comprehensive priceMap
    const result = themesData.map(t => {
      const stocksWithPrices = t.stocks.map(s => priceMap.get(s.code)).filter(Boolean);
      const avg = stocksWithPrices.length ? stocksWithPrices.reduce((a, b) => a + b.changeRate, 0) / stocksWithPrices.length : 0;
      return { name: t.theme_name, avgChangeRate: avg, stocks: stocksWithPrices };
    }).sort((a, b) => b.avgChangeRate - a.avgChangeRate);

    const { data: upsertThemeData, error: upsertThemeError } = await supabase
        .from('stock_data_cache')
        .upsert({ id: cacheKey, data: result })
        .select();

    if (upsertThemeError) {
        console.error("Error upserting theme ranking to Supabase:", upsertThemeError);
    } else {
        console.log("Successfully upserted theme ranking to Supabase:", upsertThemeData);
    }
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
    const results = await Promise.all(uniqueStockCodes.map(code => fetchStockPrice(token, code, stockCodeToNameMap)));
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
    const chunkSize = 10; // Increased to 20 stocks at a time
    const totalStocks = allStockCodes.length;
    const startTime = Date.now();

    for (let i = 0; i < totalStocks; i += chunkSize) {
        if (!token) {
            console.error("No KIS token available, stopping stock data fetch.");
            break;
        }
        const chunk = allStockCodes.slice(i, i + chunkSize);
        const promises = chunk.map(code => fetchStockPrice(token, code, stockCodeToNameMap));
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
        await new Promise(resolve => setTimeout(resolve, 250)); 
    }
    
    const { data: upsertData, error: upsertError } = await supabase
      .from('stock_data_cache')
      .upsert({ id: 'all_stocks', data: validResults })
      .select();

    if (upsertError) {
      console.error("Error upserting all_stocks to Supabase:", upsertError);
    } else {
      console.log("Successfully upserted all_stocks to Supabase:", upsertData);
    }
    console.log(`Successfully cached data for ${validResults.length} stocks. Ranking cache is now fully populated.`);
  } catch (error) {
    console.error("Failed to fetch and cache all stock data:", error);
  }
};

// Initial fetch and set interval for refreshing the cache every 3 minutes
// fetchAllStockDataAndCache();
// setInterval(fetchAllStockDataAndCache, 180000); // 180,000 ms = 3 minutes


app.get('/api/ranking/:type', async (req, res) => {
  const { data: cachedData, error: fetchError } = await supabase
    .from('stock_data_cache')
    .select('data')
    .eq('id', 'all_stocks')
    .single();

  if (fetchError || !cachedData || !cachedData.data) {
    console.error("Error fetching all_stocks from Supabase or no data:", fetchError);
    return res.json([]); // Return empty if error or no data
  }
  const allStocks = cachedData.data;

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
    const results = await Promise.all(codes.map(c => fetchStockPrice(token, c.trim(), stockCodeToNameMap)));
    res.json(results.filter(Boolean).reduce((a, s) => ({ ...a, [s.code]: s }), {}));
  } catch (e) { res.status(500).json({}); }
});

// New endpoint for Vercel Cron Job to trigger cache update
app.get('/api/cron/update-ranking-cache', async (req, res) => {
  try {
    await fetchAllStockDataAndCache();
    res.status(200).json({ message: "Stock ranking cache updated successfully." });
  } catch (error) {
    console.error("Error updating stock ranking cache via cron:", error);
    res.status(500).json({ error: "Failed to update stock ranking cache." });
  }
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