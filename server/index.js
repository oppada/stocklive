// server/index.js
// Project: StockLive - Stock Information & Community

// 1. Module Imports
const express = require('express');
const cors = require('cors');
const NodeCache = require('node-cache');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 2. Initialization
const app = express();
const port = process.env.PORT || 4000;

// KIS API Cache: Cache results for 60 seconds to avoid rate limits, as specified.
// Token cache has a longer TTL.
const kisPriceCache = new NodeCache({ stdTTL: 60 });
const kisTokenCache = new NodeCache({ stdTTL: 86400 }); // KIS token typically lasts 24 hours (86400 seconds)

// KIS API Credentials & Base URL
const KIS_APP_KEY = process.env.KIS_APP_KEY;
const KIS_SECRET_KEY = process.env.KIS_SECRET_KEY;
const KIS_BASE_URL = process.env.KIS_BASE_URL || 'https://openapi.koreainvestment.com:9443';

const stockCodeToNameMap = new Map(); // Global map for stock code to name

// Load themes data once at startup
let themesData = [];
try {
  const themesPath = path.join(__dirname, '../client/public/toss_real_150_themes.json');
  const rawData = fs.readFileSync(themesPath, 'utf8');
  const parsedData = JSON.parse(rawData);
  themesData = parsedData.themes; // Access the 'themes' array within the object
  console.log(`Loaded ${themesData.length} themes from ${themesPath}`);

  // Create a mapping from stock code to stock name for quick lookup
  themesData.forEach(theme => {
    theme.stocks.forEach(stock => {
      stockCodeToNameMap.set(stock.code, stock.name);
    });
  });
} catch (error) {
  console.error('Failed to load themes data:', error);
  process.exit(1); // Exit if essential themes data cannot be loaded
}


// 3. Middleware
app.use(cors());
app.use(express.json());

// --- KIS API Service Functions ---

/**
 * Fetches an OAuth2 token from the KIS API. Caches the token.
 * @returns {Promise<string>} The KIS API access token.
 */
const getKisToken = async () => {
  const cacheKey = 'kis_token';
  if (kisTokenCache.has(cacheKey)) {
    console.log('Serving KIS token from cache.');
    return kisTokenCache.get(cacheKey);
  }

  try {
    const response = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
      appkey: KIS_APP_KEY,
      appsecret: KIS_SECRET_KEY,
      grant_type: 'client_credentials',
    });

    const token = response.data.access_token;
    // KIS tokens typically expire in 24 hours. Set TTL slightly less for safety.
    kisTokenCache.set(cacheKey, token, response.data.expires_in - 60);
    console.log('Fetched new KIS API token and cached it.');
    return token;
  } catch (error) {
    console.error('Failed to fetch KIS API token:', error.response ? error.response.data : error.message);
    throw new Error('Failed to fetch KIS API token.');
  }
};

/**
 * Fetches real-time price data for a single stock from the KIS API. Caches the price data.
 * @param {string} token KIS API access token.
 * @param {string} stockCode The stock code (e.g., '005930' for Samsung Electronics).
 * @returns {Promise<object|null>} Stock price data or null if not found.
 */
const fetchStockPrice = async (token, stockCode, retries = 3) => {
  const cacheKey = `stock_price_${stockCode}`;
  if (kisPriceCache.has(cacheKey)) {
    return kisPriceCache.get(cacheKey);
  }

  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price`, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          authorization: `Bearer ${token}`,
          appkey: KIS_APP_KEY,
          appsecret: KIS_SECRET_KEY,
          tr_id: 'FHKST01010100', // Changed tr_id to match original client code
          custtype: 'P', // Ensure custtype is here too if it was removed in a previous step
        },
        params: {
          FID_COND_MRKT_DIV_CODE: 'J',
          FID_INPUT_ISCD: stockCode,
        },
        timeout: 5000, // Increase timeout to 5 seconds
      });

      if (response.data && response.data.output) {
        const output = response.data.output;
        console.log(`Successfully fetched data for ${stockCode}:`, output); // DEBUGGING: Log full output for success
        const stockData = {
          code: stockCode,
          price: parseInt(output.stck_prpr || '0'),
          change: parseInt(output.prdy_vrss || '0'),
          changeRate: parseFloat(output.prdy_ctrt || '0'),
          name: stockCodeToNameMap.get(stockCode) || (typeof output.hts_korp_isnm === 'string' ? output.hts_korp_isnm : stockCode).trim(), // Prioritize map lookup, then KIS API, then stockCode
          tradeVolume: parseInt(output.acml_vol || '0'), // Ensure default to 0
          tradeValue: parseInt(output.acml_tr_pbmn || '0'), // Ensure default to 0
        };
        kisPriceCache.set(cacheKey, stockData);
        return stockData;
      }
      console.error(`KIS API returned no output for ${stockCode}:`, response.data); // Log full response if no output
      return null;
    } catch (error) {
      const isNetworkError = error.code === 'ECONNRESET' || error.message.includes('socket hang up') || axios.isAxiosError(error) && error.code === 'ETIMEDOUT';
      if (isNetworkError && i < retries - 1) {
        console.warn(`Attempt ${i + 1} failed for ${stockCode} due to network error. Retrying in 1000ms...`);
        await new Promise(res => setTimeout(res, 1000)); // Wait 1000ms before retrying
      } else {
        console.error(`Final KIS API fetch for ${stockCode} failed:`);
        console.error('Error Status:', error.response ? error.response.status : 'N/A');
        console.error('Error Data:', error.response ? error.response.data : error.message);
        return null;
      }
    }
  }
};

/**
 * Calculates the average change rate for a given theme.
 * @param {Array<object>} stocksInTheme Array of stock data objects.
 * @returns {number} Average change rate for the theme.
 */
const calculateThemeAvgChangeRate = (stocksInTheme) => {
  if (!stocksInTheme || stocksInTheme.length === 0) {
    return 0;
  }
  const totalChangeRate = stocksInTheme.reduce((sum, stock) => sum + (stock.changeRate || 0), 0);
  return totalChangeRate / stocksInTheme.length;
};


// 4. API Routes
/**
 * @route GET /api/themes/top-performing
 * @description Fetches real-time theme rankings from KIS API, calculates average change rates, and sorts them.
 */
app.get('/api/themes/top-performing', async (req, res) => {
  const cacheKey = 'top_performing_themes';
  if (kisPriceCache.has(cacheKey)) { // Using price cache for this too, as it's general purpose
    console.log('Serving top performing themes from cache.');
    return res.json(kisPriceCache.get(cacheKey));
  }

  try {
    const token = await getKisToken();
    if (!token) {
      return res.status(500).json({ error: 'KIS API token not available.' });
    }

    // Collect all unique stock codes from all themes
    const allUniqueStockCodes = new Set();
    themesData.forEach(theme => {
      theme.stocks.forEach(stock => allUniqueStockCodes.add(stock.code));
    });

    // Fetch prices in parallel chunks to balance speed and rate-limiting
    const stockCodes = Array.from(allUniqueStockCodes);
    const chunkSize = 10;
    const allStockPrices = [];
    for (let i = 0; i < stockCodes.length; i += chunkSize) {
        const chunk = stockCodes.slice(i, i + chunkSize);
        console.log(`Fetching chunk ${i/chunkSize + 1}/${Math.ceil(stockCodes.length/chunkSize)}...`);
        const chunkPromises = chunk.map(code => fetchStockPrice(token, code));
        const chunkPrices = await Promise.all(chunkPromises);
        allStockPrices.push(...chunkPrices);
        await new Promise(resolve => setTimeout(resolve, 500)); // Increase delay between chunks to 500ms
    }

    // Map stock codes to their price data for quick lookup
    const stockPricesMap = new Map();
    allStockPrices.forEach(stock => {
      if (stock) stockPricesMap.set(stock.code, stock);
    });

    // Calculate average change rate for each theme
    const themesWithAvg = themesData.map(theme => {
      const stocksInThemeWithPrices = theme.stocks.map(stock => stockPricesMap.get(stock.code)).filter(Boolean);
      const avgChangeRate = calculateThemeAvgChangeRate(stocksInThemeWithPrices);
      return {
        name: theme.theme_name, // Fix: Use theme_name from the JSON file
        stocks: stocksInThemeWithPrices, // Include stocks with their prices for the client
        avgChangeRate: avgChangeRate,
      };
    });

    // Sort themes by average change rate (descending)
    themesWithAvg.sort((a, b) => b.avgChangeRate - a.avgChangeRate);

    // Cache the result for a shorter period if needed, or stick to default 60s
    kisPriceCache.set(cacheKey, themesWithAvg);
    console.log('Fetched and processed new top performing themes data and cached it.');
    res.json(themesWithAvg);
  } catch (error) {
    console.error('Failed to fetch top performing themes:', error);
    res.status(500).json({ error: 'Failed to fetch top performing themes.' });
  }
});

/**
 * @route GET /api/themes/:themeName/stocks
 * @description Fetches stocks for a specific theme, with real-time price data and sorted by change rate.
 */
app.get('/api/themes/:themeName/stocks', async (req, res) => {
  const themeName = decodeURIComponent(req.params.themeName);
  const cacheKey = `theme_stocks_${themeName}`;

  if (kisPriceCache.has(cacheKey)) {
    console.log(`Serving stocks for theme '${themeName}' from cache.`);
    return res.json(kisPriceCache.get(cacheKey));
  }

  try {
    const theme = themesData.find(t => t.theme_name === themeName);
    if (!theme) {
      return res.status(404).json({ error: 'Theme not found.' });
    }

    const token = await getKisToken();
    if (!token) {
      return res.status(500).json({ error: 'KIS API token not available.' });
    }

    // Fetch prices for stocks in this specific theme
    const stockPricePromises = theme.stocks.map(stock => fetchStockPrice(token, stock.code));
    const stocksWithPrices = (await Promise.all(stockPricePromises)).filter(Boolean);

    // Sort stocks by change rate (descending)
    stocksWithPrices.sort((a, b) => b.changeRate - a.changeRate);

    kisPriceCache.set(cacheKey, stocksWithPrices);
    console.log(`Fetched and processed stocks for theme '${themeName}' and cached it.`);
    console.log(`Sending stocks for theme '${themeName}' to frontend:`, stocksWithPrices); // DEBUGGING
    res.json(stocksWithPrices);
  } catch (error) {
    console.error(`Failed to fetch stocks for theme '${themeName}':`, error);
    res.status(500).json({ error: `Failed to fetch stocks for theme '${themeName}'.` });
  }
});

/**
 * @route GET /api/stocks/prices
 * @description Fetches real-time price data for a list of stock codes.
 *              Query parameter: `codes` (comma-separated stock codes).
 */
app.get('/api/stocks/prices', async (req, res) => {
  const { codes } = req.query; // codes will be a comma-separated string
  if (!codes) {
    return res.status(400).json({ error: 'Stock codes are required (e.g., ?codes=005930,000660).' });
  }

  const stockCodes = codes.split(',');
  const cacheKey = `multiple_stock_prices_${stockCodes.join('_')}`;

  if (kisPriceCache.has(cacheKey)) {
    console.log(`Serving prices for multiple stocks from cache: ${stockCodes.join(', ')}.`);
    return res.json(kisPriceCache.get(cacheKey));
  }

  try {
    const token = await getKisToken();
    if (!token) {
      return res.status(500).json({ error: 'KIS API token not available.' });
    }

    const stockPricePromises = stockCodes.map(code => fetchStockPrice(token, code.trim()));
    const allStockPrices = (await Promise.all(stockPricePromises)).filter(Boolean);

    // Convert array of stock objects to a map for easier client-side consumption
    const stockPricesMap = allStockPrices.reduce((map, stock) => {
      map[stock.code] = stock;
      return map;
    }, {});

    kisPriceCache.set(cacheKey, stockPricesMap);
    console.log(`Fetched and cached prices for multiple stocks: ${stockCodes.join(', ')}.`);
    console.log(`Sending multiple stock prices to frontend:`, stockPricesMap); // DEBUGGING
    res.json(stockPricesMap);
  } catch (error) {
    console.error(`Failed to fetch prices for multiple stocks (${stockCodes.join(', ')}):`, error);
    res.status(500).json({ error: `Failed to fetch prices for multiple stocks.` });
  }
});

// Remove old mock routes
// app.get('/api/market/themes', ...);
// app.get('/api/market/ranking/:type', ...);


// 5. Server Startup
app.listen(port, () => {
  console.log(`StockLive server running on http://localhost:${port}`);
  // Initial token fetch to ensure it's ready
  getKisToken().catch(err => console.error('Initial KIS token fetch failed:', err.message));
});
