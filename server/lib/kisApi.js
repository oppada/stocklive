const path = require('path');
const NodeCache = require('node-cache');
const axios = require('axios');
require('dotenv').config(); // Load environment variables here too for standalone testing or Vercel

const kisPriceCache = new NodeCache({ stdTTL: 60 }); // Cache for stock prices (60 seconds)
const kisTokenCache = new NodeCache({ stdTTL: 86400 }); // Cache for KIS token (24 hours)

const KIS_APP_KEY = process.env.KIS_APP_KEY;
const KIS_SECRET_KEY = process.env.KIS_SECRET_KEY;
const KIS_BASE_URL = (process.env.KIS_BASE_URL || 'https://openapi.koreainvestment.com:9443').trim().replace(/\/$/, "");

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

// stockCodeToNameMap is now passed as an argument
const fetchStockPrice = async (token, code, stockCodeToNameMap) => {
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

    const data = { 
      code, 
      price: parseInt(o.stck_prpr || '0'), 
      changeRate: parseFloat(o.prdy_ctrt || '0'), 
      volume: parseInt(String(o.acml_vol || '0').replace(/,/g, '')),
      tradeValue: parseInt(String(o.acml_tr_pbmn || '0').replace(/,/g, '')),
      name: stockCodeToNameMap.get(code) || o.hts_korp_isnm 
    };
    kisPriceCache.set(cacheKey, data);
    return data;
  } catch (e) { return null; }
};

const chunkedFetchStockPrices = async (token, codesToFetch, stockCodeToNameMap, chunkSize = 10, delayMs = 500) => {
  const allResults = [];
  for (let i = 0; i < codesToFetch.length; i += chunkSize) {
    if (!token) {
      console.error("No KIS token available during chunked fetch.");
      break;
    }
    const chunk = codesToFetch.slice(i, i + chunkSize);
    const promises = chunk.map(code => fetchStockPrice(token, code, stockCodeToNameMap)); // Pass stockCodeToNameMap
    const chunkResults = await Promise.all(promises);
    allResults.push(...chunkResults.filter(Boolean));
    if (i + chunkSize < codesToFetch.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  return allResults;
};

module.exports = {
    getKisToken,
    fetchStockPrice,
    chunkedFetchStockPrices
};