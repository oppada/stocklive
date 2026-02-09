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

const KIS_APP_KEY = process.env.KIS_APP_KEY;
const KIS_SECRET_KEY = process.env.KIS_SECRET_KEY;
const KIS_BASE_URL = (process.env.KIS_BASE_URL || 'https://openapi.koreainvestment.com:9443').trim().replace(/\/$/, "");

const stockCodeToNameMap = new Map(); 

const RANKING_CONFIG = {
  gainer: { 
    path: '/uapi/domestic-stock/v1/ranking/updown-rate',
    trId: 'FHPST01880000',
    params: { 'FID_COND_MRKT_DIV_CODE': 'J', 'FID_COND_SCR_DIV_CODE': '20176', 'FID_PRC_CLS_CODE': '0', 'FID_INPUT_ISCD': '0000', 'FID_RANK_SORT_CLS_CODE': '0' }
  },
  loser: { 
    path: '/uapi/domestic-stock/v1/ranking/updown-rate',
    trId: 'FHPST01880000',
    params: { 'FID_COND_MRKT_DIV_CODE': 'J', 'FID_COND_SCR_DIV_CODE': '20176', 'FID_PRC_CLS_CODE': '0', 'FID_INPUT_ISCD': '0000', 'FID_RANK_SORT_CLS_CODE': '1' }
  },
  volume: {
    path: '/uapi/domestic-stock/v1/ranking/volume-rank',
    trId: 'FHPST01710000',
    params: { 'FID_COND_MRKT_DIV_CODE': 'J', 'FID_COND_SCR_DIV_CODE': '20171', 'FID_INPUT_ISCD': '0000', 'FID_DIV_CLS_CODE': '0', 'FID_BLNG_CLS_CODE': '0', 'FID_TRGT_EXCL_CLS_CODE': '0', 'FID_TRGT_CLS_CODE': '0', 'FID_VOL_CNT': '0' }
  },
  value: {
    path: '/uapi/domestic-stock/v1/ranking/trade-pbmn',
    trId: 'FHPST01820000',
    params: { 'FID_COND_MRKT_DIV_CODE': 'J', 'FID_COND_SCR_DIV_CODE': '20182', 'FID_INPUT_ISCD': '0000', 'FID_DIV_CLS_CODE': '0', 'FID_BLNG_CLS_CODE': '0', 'FID_TRGT_EXCL_CLS_CODE': '0', 'FID_TRGT_CLS_CODE': '0' }
  }
};

let themesData = [];
try {
  const themesPath = path.join(__dirname, '../client/public/toss_real_150_themes.json');
  themesData = JSON.parse(fs.readFileSync(themesPath, 'utf8')).themes;
  themesData.forEach(t => t.stocks.forEach(s => stockCodeToNameMap.set(s.code, s.name)));
  console.log(`Loaded ${themesData.length} themes.`);
} catch (e) { console.error("Theme Load Error"); }

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
    const data = { code, price: parseInt(o.stck_prpr), changeRate: parseFloat(o.prdy_ctrt), name: stockCodeToNameMap.get(code) || o.hts_korp_isnm };
    kisPriceCache.set(cacheKey, data);
    return data;
  } catch (e) { return null; }
};

// [수정] 테마 수익률 계산 라우트
app.get('/api/themes/top-performing', async (req, res) => {
  try {
    const token = await getKisToken();
    const codes = Array.from(new Set(themesData.flatMap(t => t.stocks.map(s => s.code)))).slice(0, 30);
    const results = await Promise.all(codes.map(c => fetchStockPrice(token, c)));
    const priceMap = new Map(results.filter(Boolean).map(r => [r.code, r]));

    const result = themesData.map(t => {
      const stocks = t.stocks.map(s => priceMap.get(s.code)).filter(Boolean);
      const avg = stocks.length ? stocks.reduce((a, b) => a + b.changeRate, 0) / stocks.length : 0;
      return { name: t.theme_name, avgChangeRate: avg, stocks: stocks };
    }).sort((a, b) => b.avgChangeRate - a.avgChangeRate);

    res.json(result);
  } catch (e) { res.status(500).json([]); }
});

// [추가] 테마 상세 종목 조회 (프론트엔드 연동)
app.get('/api/themes/:themeName/stocks', async (req, res) => {
  const theme = themesData.find(t => t.theme_name === req.params.themeName);
  if (!theme) return res.status(404).json([]);
  try {
    const token = await getKisToken();
    const results = await Promise.all(theme.stocks.map(s => fetchStockPrice(token, s.code)));
    res.json(results.filter(Boolean));
  } catch (e) { res.status(500).json([]); }
});

app.get('/api/ranking/:type', async (req, res) => {
  const config = RANKING_CONFIG[req.params.type];
  if (!config) return res.status(404).send('Invalid type');
  try {
    const token = await getKisToken();
    const response = await axios.get(`${KIS_BASE_URL}${config.path}`, {
      headers: {
        'authorization': `Bearer ${token}`,
        'appkey': KIS_APP_KEY, 'appsecret': KIS_SECRET_KEY,
        'tr_id': config.trId, 'custtype': 'P', 'tr_cont': ''
      },
      params: config.params
    });
    const raw = response.data.output || response.data.output1 || [];
    res.json(raw.map(i => ({
      name: stockCodeToNameMap.get(i.mksc_shrn_iscd || i.stck_shrn_iscd) || i.hts_kor_isnm,
      code: i.mksc_shrn_iscd || i.stck_shrn_iscd,
      price: parseInt(i.stck_prpr || '0'),
      changeRate: parseFloat(i.prdy_ctrt || '0')
    })));
  } catch (error) { 
    console.error(`Ranking 404 At: ${KIS_BASE_URL}${config.path}`);
    res.json([]); 
  }
});

app.get('/api/stocks/prices', async (req, res) => {
  const codes = (req.query.codes || "").split(',').filter(Boolean);
  try {
    const token = await getKisToken();
    const results = await Promise.all(codes.map(c => fetchStockPrice(token, c.trim())));
    res.json(results.filter(Boolean).reduce((a, s) => ({ ...a, [s.code]: s }), {}));
  } catch (e) { res.status(500).json({}); }
});

module.exports = app;