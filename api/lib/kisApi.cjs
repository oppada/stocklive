const path = require('path');
const NodeCache = require('node-cache');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const kisPriceCache = new NodeCache({ stdTTL: 60 }); // Cache for stock prices (60 seconds)
const kisTokenCache = new NodeCache({ stdTTL: 86400 }); // Cache for KIS token (24 hours)

// Supabase 클라이언트 초기화 (토큰 공유용)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const KIS_APP_KEY = process.env.KIS_APP_KEY;
const KIS_SECRET_KEY = process.env.KIS_SECRET_KEY;
const KIS_BASE_URL = (process.env.KIS_BASE_URL || 'https://openapi.koreainvestment.com:9443').trim().replace(/\/$/, "");

const getKisToken = async (retry = true) => {
  // 1. 메모리 캐시 확인
  if (kisTokenCache.has('token')) return kisTokenCache.get('token');

  try {
    // 2. 데이터베이스 캐시 확인 (Supabase)
    const { data: cached } = await supabase
      .from('stock_data_cache')
      .select('data')
      .eq('id', 'kis_token')
      .maybeSingle(); // single() 대신 maybeSingle() 사용

    if (cached && cached.data && cached.data.expires_at > Date.now()) {
      const token = cached.data.access_token;
      const remainingSec = Math.floor((cached.data.expires_at - Date.now()) / 1000);
      kisTokenCache.set('token', token, remainingSec > 60 ? remainingSec - 60 : remainingSec);
      console.log("♻️ Supabase 캐시에서 기존 토큰을 재사용합니다.");
      return token;
    }

    // 3. 신규 토큰 발급 요청
    console.log("📡 KIS API로부터 신규 토큰 발급을 요청합니다...");
    const response = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
      appkey: KIS_APP_KEY, appsecret: KIS_SECRET_KEY, grant_type: 'client_credentials'
    });
    
    const token = response.data.access_token;
    const expiresIn = response.data.expires_in;
    const expiresAt = Date.now() + (expiresIn * 1000);

    // 4. 메모리 및 데이터베이스 캐시 업데이트
    kisTokenCache.set('token', token, expiresIn - 60);
    await supabase.from('stock_data_cache').upsert({
      id: 'kis_token',
      data: { access_token: token, expires_at: expiresAt },
      updated_at: new Date()
    });

    console.log("✅ 신규 토큰 발급 및 Supabase 저장 완료.");
    return token;
  } catch (error) {
    // 1분당 1회 제한 에러 발생 시 대기 후 재시도
    if (error.response && error.response.data.error_code === 'EGW00133' && retry) {
      console.log("⚠️ 토큰 발급 제한에 걸렸습니다. 65초 후 자동으로 다시 시도합니다. 잠시만 기다려주세요...");
      await new Promise(resolve => setTimeout(resolve, 65000));
      return getKisToken(false); // 재시도 시에는 retry를 false로 설정하여 무한 루프 방지
    }

    const errorData = error.response ? error.response.data : error.message;
    console.error("❌ 토큰 발급 최종 에러:", errorData);
    throw error;
  }
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

// 국내 지수 조회 (코스피: 0001, 코스닥: 1001)
const fetchDomesticIndex = async (token, code) => {
  try {
    // 일반 주식 현재가 조회 API로 우회 시도
    const response = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price`, {
      headers: {
        'authorization': `Bearer ${token}`,
        'appkey': KIS_APP_KEY, 'appsecret': KIS_SECRET_KEY,
        'tr_id': 'FHKST01010100', 'custtype': 'P'
      },
      params: { 'FID_COND_MRKT_DIV_CODE': 'J', 'FID_INPUT_ISCD': code }
    });
    
    const o = response.data.output;
    if (!o) {
      // 주식 조회가 안되면 업종 지수 조배 API로 다시 시도 (헤더 최소화)
      const resIdx = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-index-price`, {
        headers: {
          'authorization': `Bearer ${token}`,
          'appkey': KIS_APP_KEY, 'appsecret': KIS_SECRET_KEY,
          'tr_id': 'FHPST01010000', 'custtype': 'P'
        },
        params: { 'FID_COND_MRKT_DIV_CODE': 'U', 'FID_INPUT_ISCD': code }
      });
      const io = resIdx.data.output;
      if (!io) return null;
      return {
        price: parseFloat(io.bstp_nmix_prpr || '0'),
        change: parseFloat(io.bstp_nmix_prdy_vrss || '0'),
        changeRate: parseFloat(io.bstp_nmix_prdy_ctrt || '0')
      };
    }

    return {
      price: parseFloat(o.stck_prpr || '0'),
      change: parseFloat(o.prdy_vrss || '0'),
      changeRate: parseFloat(o.prdy_ctrt || '0')
    };
  } catch (e) { return null; }
};

// 해외 지수 및 환율 조회 (나스닥: NAS@IXIC, S&P500: SNI@SPX, 환율: FX@USDKRW 등)
const fetchOverseasIndex = async (token, fullCode) => {
  try {
    let [excd, symbol] = fullCode.split('@');
    if (!symbol) { symbol = excd; excd = (symbol === 'USDKRW') ? 'FX' : 'NAS'; }

    // --- 전략 1: 검증된 통합 조회 API (HHDFS00000300) - 나스닥 등에 효과적 ---
    const tryStrategy1 = async (e, s) => {
      try {
        const res = await axios.get(`${KIS_BASE_URL}/uapi/overseas-price/v1/quotations/price`, {
          headers: {
            'authorization': `Bearer ${token}`,
            'appkey': KIS_APP_KEY, 'appsecret': KIS_SECRET_KEY,
            'tr_id': 'HHDFS00000300', 'custtype': 'P'
          },
          params: { 'FID_COND_MRKT_DIV_CODE': e, 'FID_INPUT_ISCD': s }
        });
        if (res.data.output && res.data.output.last) {
          const o = res.data.output;
          return {
            price: parseFloat(o.last || '0'),
            change: parseFloat(o.diff || '0'),
            changeRate: parseFloat(o.rate || '0')
          };
        }
      } catch (err) { return null; }
      return null;
    };

    // --- 전략 2: 지수 전용 API (FHKST03010100) - S&P500 등에 효과적 ---
    const tryStrategy2 = async (s) => {
      try {
        // 심볼 보정 (지수는 보통 .으로 시작)
        const testSym = s.startsWith('.') ? s : '.' + s;
        const res = await axios.get(`${KIS_BASE_URL}/uapi/overseas-price/v1/quotations/inquire-price-index`, {
          headers: {
            'authorization': `Bearer ${token}`,
            'appkey': KIS_APP_KEY, 'appsecret': KIS_SECRET_KEY,
            'tr_id': 'FHKST03010100', 'custtype': 'P'
          },
          params: { 'FID_COND_MRKT_DIV_CODE': 'I', 'FID_INPUT_ISCD': testSym }
        });
        if (res.data.output && res.data.output.ovrs_nmix_prpr) {
          const o = res.data.output;
          return {
            price: parseFloat(o.ovrs_nmix_prpr || '0'),
            change: parseFloat(o.prdy_vrss || '0'),
            changeRate: parseFloat(o.prdy_ctrt || '0')
          };
        }
      } catch (err) { return null; }
      return null;
    };

    // 순차적 시도
    let result = await tryStrategy1(excd, symbol); // 우선 나스닥 방식 시도
    if (!result) result = await tryStrategy2(symbol); // 지수 전용 방식 시도
    if (!result) result = await tryStrategy1('', symbol); // 시장코드 없이 시도 (환율 등)

    return result;
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
    chunkedFetchStockPrices,
    fetchDomesticIndex,
    fetchOverseasIndex
};