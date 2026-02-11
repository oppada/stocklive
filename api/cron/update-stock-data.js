const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') }); // Load from project root .env

// Supabase Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// KIS API Configuration
const KIS_APP_KEY = process.env.KIS_APP_KEY;
const KIS_SECRET_KEY = process.env.KIS_SECRET_KEY;
const KIS_BASE_URL = (process.env.KIS_BASE_URL || 'https://openapi.koreainvestment.com:9443').trim().replace(/\/$/, "");

// NodeCache for KIS token (short-lived, so in-memory is fine for a single execution)
const NodeCache = require('node-cache');
const kisTokenCache = new NodeCache({ stdTTL: 86400 }); // 24 hours

let allKrxStocks = [];
try {
  const krxStocksPath = path.join(__dirname, '../../client/public/krx_stocks.json');
  allKrxStocks = JSON.parse(fs.readFileSync(krxStocksPath, 'utf8'));
  console.log(`Loaded ${allKrxStocks.length} stocks from krx_stocks.json.`);
} catch (e) {
  console.error("Error loading krx_stocks.json:", e);
  // Exit if essential data is missing
  process.exit(1); 
}

const getKisToken = async () => {
  if (kisTokenCache.has('token')) return kisTokenCache.get('token');
  try {
    const response = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
      appkey: KIS_APP_KEY, appsecret: KIS_SECRET_KEY, grant_type: 'client_credentials'
    });
    const token = response.data.access_token;
    kisTokenCache.set('token', token, response.data.expires_in - 60);
    console.log("New Token Issued Successfully in Cron.");
    return token;
  } catch (error) {
    console.error("Error getting KIS token in Cron:", error.message);
    throw error;
  }
};

const fetchStockPrice = async (token, code) => {
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
    if (!o) return null;

    // The stockCodeToNameMap is not directly available here in the cron job,
    // so we'll just use o.hts_korp_isnm directly. The full name mapping is
    // less critical for the cron job's purpose of populating price data.
    // If exact name from krx_stocks.json is needed, consider passing it or reloading map.
    const nameFromKrx = allKrxStocks.find(s => s.code === code)?.name;

    const data = {
      code,
      price: parseInt(o.stck_prpr || '0'),
      changeRate: parseFloat(o.prdy_ctrt || '0'),
      volume: parseInt(String(o.acml_vol || '0').replace(/,/g, '')),
      tradeValue: parseInt(String(o.acml_tr_pbmn || '0').replace(/,/g, '')),
      name: nameFromKrx || o.hts_korp_isnm || code // Prefer name from krx_stocks.json, then KIS, then code
    };
    return data;
  } catch (e) {
    console.error(`Error fetching price for ${code}:`, e.message);
    return null;
  }
};

// This cron job will be responsible for updating both 'all_stocks' and 'theme_ranking_results'
const updateStockData = async () => {
  console.log("Cron Job: Starting updateStockData...");
  try {
    const token = await getKisToken();
    if (!token) {
      console.error("Cron Job: Failed to get KIS token, exiting.");
      return;
    }

    // --- Update 'all_stocks' data ---
    const allStockCodes = allKrxStocks.map(s => s.code);
    console.log(`Cron Job: Using ${allStockCodes.length} stock codes to fetch data.`);

    const validResults = [];
    const chunkSize = 10;
    const delayMs = 250; // Use the optimized delayMs
    const totalStocks = allStockCodes.length;
    const startTime = Date.now();

    for (let i = 0; i < totalStocks; i += chunkSize) {
      const chunk = allStockCodes.slice(i, i + chunkSize);
      const promises = chunk.map(code => fetchStockPrice(token, code));
      const chunkResults = await Promise.all(promises);
      validResults.push(...chunkResults.filter(Boolean));

      const processedCount = Math.min(i + chunkSize, totalStocks);
      const percentage = ((processedCount / totalStocks) * 100).toFixed(1);
      const elapsedTime = (Date.now() - startTime) / 1000;
      const estimatedTotalTime = (elapsedTime / processedCount) * totalStocks;
      const estimatedRemainingTime = estimatedTotalTime - elapsedTime;
      console.log(`Cron Job: Processed ${processedCount}/${totalStocks} stocks (${percentage}%), found ${validResults.length} valid stocks. Estimated remaining: ${estimatedRemainingTime.toFixed(1)}s`);

      if (i + chunkSize < totalStocks) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    const { data: upsertAllStocksData, error: upsertAllStocksError } = await supabase
      .from('stock_data_cache')
      .upsert({ id: 'all_stocks', data: validResults })
      .select();

    if (upsertAllStocksError) {
      console.error("Cron Job: Error upserting all_stocks to Supabase:", upsertAllStocksError);
    } else {
      console.log("Cron Job: Successfully upserted all_stocks to Supabase.");
    }

    // --- Update 'theme_ranking_results' data ---
    // Note: To avoid re-reading toss_real_150_themes.json in every cron run,
    // consider making themesData global or cached, similar to allKrxStocks.
    // For now, reload it.
    let themesData = [];
    try {
      const themesPath = path.join(__dirname, '../../client/public/toss_real_150_themes.json');
      themesData = JSON.parse(fs.readFileSync(themesPath, 'utf8')).themes;
    } catch (e) {
      console.error("Cron Job: Theme Load Error during ranking update", e);
      themesData = []; // Ensure themesData is an array even on error
    }

    const allThemeStockCodes = Array.from(new Set(themesData.flatMap(t => t.stocks.map(s => s.code))));
    const allThemeStocksWithPrices = await Promise.all(
        allThemeStockCodes.map(code => fetchStockPrice(token, code))
    );
    const priceMap = new Map(allThemeStocksWithPrices.filter(Boolean).map(r => [r.code, r]));

    const themeRankingResult = themesData.map(t => {
        const stocksWithPrices = t.stocks.map(s => priceMap.get(s.code)).filter(Boolean);
        const avg = stocksWithPrices.length ? stocksWithPrices.reduce((a, b) => a + b.changeRate, 0) / stocksWithPrices.length : 0;
        return { name: t.theme_name, avgChangeRate: avg, stocks: stocksWithPrices };
    }).sort((a, b) => b.avgChangeRate - a.avgChangeRate);

    const { data: upsertThemeRankingData, error: upsertThemeRankingError } = await supabase
        .from('stock_data_cache')
        .upsert({ id: 'theme_ranking_results', data: themeRankingResult })
        .select();

    if (upsertThemeRankingError) {
        console.error("Cron Job: Error upserting theme_ranking_results to Supabase:", upsertThemeRankingError);
    } else {
        console.log("Cron Job: Successfully upserted theme_ranking_results to Supabase.");
    }

  } catch (error) {
    console.error("Cron Job: updateStockData failed:", error);
  }
  console.log("Cron Job: Finished updateStockData.");
};


// Vercel Serverless Function handler
module.exports = async (req, res) => {
  if (req.method === 'GET') { // Vercel Cron Jobs typically send a GET request
    // Optional: Add a secret token check to prevent unauthorized execution
    // if (req.headers['x-api-key'] !== process.env.CRON_SECRET_KEY) {
    //   return res.status(401).send('Unauthorized');
    // }

    await updateStockData();
    res.status(200).send('Stock data update cron job executed successfully.');
  } else {
    res.status(405).send('Method Not Allowed');
  }
};