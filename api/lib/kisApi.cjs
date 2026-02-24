const path = require('path');
const NodeCache = require('node-cache');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// .env 파일 절대 경로 설정 (api 폴더 내 .env 로드)
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const kisPriceCache = new NodeCache({ stdTTL: 60 }); // Cache for stock prices (60 seconds)
const kisTokenCache = new NodeCache({ stdTTL: 86400 }); // Cache for KIS token (24 hours)

// Supabase 클라이언트 초기화 (토큰 공유용)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const KIS_APP_KEY = process.env.KIS_APP_KEY;
const KIS_SECRET_KEY = process.env.KIS_SECRET_KEY;
const KIS_BASE_URL = (process.env.KIS_BASE_URL || 'https://openapi.koreainvestment.com:9443').trim().replace(/\/$/, "");

const getKisToken = async (retry = true) => {
  console.log("🚫 KIS API 사용이 중단되었습니다. 토큰 발급을 시도하지 않습니다.");
  return "DISABLED_TOKEN";
};

const fetchStockPrice = async (token, code, stockCodeToNameMap) => {
  const cacheKey = `price_${code}`;
  if (kisPriceCache.has(cacheKey)) return kisPriceCache.get(cacheKey);
  try {
    const response = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price`, {
      headers: { 'authorization': `Bearer ${token}`, 'appkey': KIS_APP_KEY, 'appsecret': KIS_SECRET_KEY, 'tr_id': 'FHKST01010100', 'custtype': 'P' },
      params: { 'FID_COND_MRKT_DIV_CODE': 'J', 'FID_INPUT_ISCD': code }
    });
    const o = response.data.output;
    if(!o) return null;
    const data = { 
      code, price: parseInt(o.stck_prpr || '0'), changeRate: parseFloat(o.prdy_ctrt || '0'), 
      volume: parseInt(String(o.acml_vol || '0').replace(/,/g, '')),
      tradeValue: parseInt(String(o.acml_tr_pbmn || '0').replace(/,/g, '')),
      name: stockCodeToNameMap.get(code) || o.hts_korp_isnm 
    };
    kisPriceCache.set(cacheKey, data);
    return data;
  } catch (e) { return null; }
};

const fetchDomesticIndex = async (token, code) => {
  try {
    const response = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-index-price`, {
      headers: { 'authorization': `Bearer ${token}`, 'appkey': KIS_APP_KEY, 'appsecret': KIS_SECRET_KEY, 'tr_id': 'FHPST01010000', 'custtype': 'P' },
      params: { 'FID_COND_MRKT_DIV_CODE': 'U', 'FID_INPUT_ISCD': code },
      timeout: 10000
    });
    const o = response.data.output;
    if (o && o.bstp_nmix_prpr) {
      return { price: parseFloat(o.bstp_nmix_prpr), change: parseFloat(o.bstp_nmix_prdy_vrss), changeRate: parseFloat(o.bstp_nmix_prdy_ctrt) };
    }
    return null;
  } catch (e) { return null; }
};

const fetchOverseasIndex = async (token, symbol) => {
  try {
    const indexSymbol = symbol.startsWith('.') ? symbol : '.' + symbol;
    const response = await axios.get(`${KIS_BASE_URL}/uapi/overseas-price/v1/quotations/price`, {
      headers: { 'authorization': `Bearer ${token}`, 'appkey': KIS_APP_KEY, 'appsecret': KIS_SECRET_KEY, 'tr_id': 'FHKST03010100', 'custtype': 'P' },
      params: { 'FID_COND_MRKT_DIV_CODE': 'N', 'FID_INPUT_ISCD': indexSymbol },
      timeout: 10000
    });
    const o = response.data.output;
    if (o && o.ovrs_nmix_prpr) {
      return { price: parseFloat(o.ovrs_nmix_prpr), change: parseFloat(o.prdy_vrss), changeRate: parseFloat(o.prdy_ctrt) };
    }
    return null;
  } catch (e) { return null; }
};

const fetchExchangeRate = async (token) => {
  try {
    const response = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-daily-price`, {
      headers: { 'authorization': `Bearer ${token}`, 'appkey': KIS_APP_KEY, 'appsecret': KIS_SECRET_KEY, 'tr_id': 'FHPST04100000', 'custtype': 'P' },
      params: { 'FID_COND_MRKT_DIV_CODE': 'F', 'FID_INPUT_ISCD': 'USDKRW' },
      timeout: 10000
    });
    if (response.data.output && response.data.output.length > 0) {
      const o = response.data.output[0];
      return { price: parseFloat(o.stck_prpr), change: parseFloat(o.prdy_vrss), changeRate: parseFloat(o.prdy_ctrt) };
    }
    return null;
  } catch (e) { return null; }
};

const chunkedFetchStockPrices = async (token, codesToFetch, stockCodeToNameMap, chunkSize = 10, delayMs = 500) => {
  const allResults = [];
  for (let i = 0; i < codesToFetch.length; i += chunkSize) {
    if (!token) break;
    const chunk = codesToFetch.slice(i, i + chunkSize);
    const promises = chunk.map(code => fetchStockPrice(token, code, stockCodeToNameMap));
    const chunkResults = await Promise.all(promises);
    allResults.push(...chunkResults.filter(Boolean));
    if (i + chunkSize < codesToFetch.length) await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  return allResults;
};

module.exports = {
    getKisToken, fetchStockPrice, chunkedFetchStockPrices, 
    fetchDomesticIndex, fetchOverseasIndex, fetchExchangeRate
};