const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const NodeCache = require('node-cache');
require('dotenv').config();

// KIS API 라이브러리 (파일 경로가 정확한지 확인하세요)
const { getKisToken, fetchStockPrice, chunkedFetchStockPrices } = require('./lib/kisApi.cjs');

const app = express();
const port = process.env.PORT || 4000;

// Supabase 클라이언트 설정
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 데이터 및 맵 초기화
let allKrxStocks = [];
let themesData = [];
const stockCodeToNameMap = new Map();

// [파일 로드] 로컬 JSON 데이터 읽기
try {
    const themesPath = path.join(__dirname, 'toss_real_150_themes.json');
    if (fs.existsSync(themesPath)) {
        const rawData = JSON.parse(fs.readFileSync(themesPath, 'utf8'));
        themesData = rawData.themes || [];
        themesData.forEach(t => t.stocks.forEach(s => stockCodeToNameMap.set(s.code, s.name)));
        console.log(`✅ Loaded ${themesData.length} themes.`);
    }
} catch (e) { console.error("❌ Theme Load Error", e); }

try {
    const krxStocksPath = path.join(__dirname, 'krx_stocks.json');
    if (fs.existsSync(krxStocksPath)) {
        allKrxStocks = JSON.parse(fs.readFileSync(krxStocksPath, 'utf8'));
        allKrxStocks.forEach(s => stockCodeToNameMap.set(s.code, s.name));
        console.log(`✅ Loaded ${allKrxStocks.length} stocks from krx_stocks.json.`);
    }
} catch (e) { console.error("❌ Error loading krx_stocks.json:", e); }

app.use(cors());
app.use(express.json());

// --- API 라우트 영역 ---

// 1. 테마 수익률 순위 조회 (Supabase 캐시 사용)
app.get('/api/themes/top-performing', async (req, res) => {
    const cacheKey = 'theme_ranking_results';
    
    // Supabase에서 캐시된 데이터 먼저 확인
    const { data: cachedThemeData, error: fetchThemeError } = await supabase
        .from('stock_data_cache')
        .select('data')
        .eq('id', cacheKey)
        .single();

    if (!fetchThemeError && cachedThemeData && cachedThemeData.data) {
        return res.json(cachedThemeData.data);
    }

    // 캐시가 없으면 실시간 계산 (Vercel에서 실행 시 10초 제한 주의)
    try {
        const token = await getKisToken();
        const allThemeStockCodes = Array.from(new Set(themesData.flatMap(t => t.stocks.map(s => s.code))));
        
        // 데이터가 많으므로 청크 단위로 호출
        const allFetchedStocks = await chunkedFetchStockPrices(token, allThemeStockCodes, stockCodeToNameMap, 10, 500);
        const priceMap = new Map(allFetchedStocks.map(r => [r.code, r]));

        const result = themesData.map(t => {
            const stocksWithPrices = t.stocks.map(s => priceMap.get(s.code)).filter(Boolean);
            const avg = stocksWithPrices.length ? stocksWithPrices.reduce((a, b) => a + b.changeRate, 0) / stocksWithPrices.length : 0;
            return { name: t.theme_name, avgChangeRate: avg, stocks: stocksWithPrices };
        }).sort((a, b) => b.avgChangeRate - a.avgChangeRate);

        // 결과 Supabase에 저장 (캐싱)
        await supabase.from('stock_data_cache').upsert({ id: cacheKey, data: result });
        
        res.json(result);
    } catch (e) {
        console.error("Failed to fetch top performing themes:", e);
        res.status(500).json([]);
    }
});

// 2. 특정 테마 내 종목 상세 조회
app.get('/api/themes/:themeName/stocks', async (req, res) => {
    const theme = themesData.find(t => t.theme_name === req.params.themeName);
    if (!theme) return res.status(404).json([]);
    
    try {
        const token = await getKisToken();
        const uniqueStockCodes = Array.from(new Set(theme.stocks.map(s => s.code)));
        const results = await Promise.all(uniqueStockCodes.map(code => fetchStockPrice(token, code, stockCodeToNameMap)));
        res.json(results.filter(Boolean).sort((a, b) => b.changeRate - a.changeRate));
    } catch (e) {
        res.status(500).json([]);
    }
});

// 3. 전종목 랭킹 조회 (Gainer, Loser, Volume 등)
app.get('/api/ranking/:type', async (req, res) => {
    const { data: cachedData, error: fetchError } = await supabase
        .from('stock_data_cache')
        .select('data')
        .eq('id', 'all_stocks')
        .single();

    if (fetchError || !cachedData || !cachedData.data) {
        return res.json([]);
    }
    
    const allStocks = cachedData.data;
    let sortedStocks = [];
    const type = req.params.type;

    switch(type) {
        case 'gainer': sortedStocks = [...allStocks].sort((a, b) => b.changeRate - a.changeRate); break;
        case 'loser': sortedStocks = [...allStocks].sort((a, b) => a.changeRate - b.changeRate); break;
        case 'volume': sortedStocks = [...allStocks].sort((a, b) => b.volume - a.volume); break;
        case 'value': sortedStocks = [...allStocks].sort((a, b) => b.tradeValue - a.tradeValue); break;
        default: return res.status(404).send('Invalid ranking type');
    }
    
    res.json(sortedStocks.slice(0, 50));
});

// 4. 개별 종목 현재가 조회 (Marquee 및 관심종목용)
app.get('/api/stocks/prices', async (req, res) => {
    const codes = (req.query.codes || "").split(',').filter(Boolean);
    try {
        const token = await getKisToken();
        const results = await Promise.all(codes.map(c => fetchStockPrice(token, c.trim(), stockCodeToNameMap)));
        res.json(results.filter(Boolean).reduce((a, s) => ({ ...a, [s.code]: s }), {}));
    } catch (e) { res.status(500).json({}); }
});

// 5. [중요] 캐시 업데이트 트리거 (Vercel Cron 또는 수동 호출용)
// 이 함수가 실행될 때 3분간의 수집 로직이 돌아갑니다.
const fetchAllStockDataAndCache = async () => {
    console.log("🚀 Starting background cache update...");
    try {
        const token = await getKisToken();
        const allStockCodes = allKrxStocks.map(s => s.code);
        const validResults = [];
        const chunkSize = 10;

        for (let i = 0; i < allStockCodes.length; i += chunkSize) {
            const chunk = allStockCodes.slice(i, i + chunkSize);
            const chunkResults = await Promise.all(chunk.map(code => fetchStockPrice(token, code, stockCodeToNameMap)));
            validResults.push(...chunkResults.filter(Boolean));
            
            // API 제한을 피하기 위한 짧은 대기
            await new Promise(r => setTimeout(r, 200)); 
            
            // 로그 (Vercel Logs에서 확인 가능)
            if (i % 100 === 0) console.log(`Progress: ${i}/${allStockCodes.length}`);
        }
        
        // Supabase에 최종 결과물 덮어쓰기
        await supabase.from('stock_data_cache').upsert({ id: 'all_stocks', data: validResults });
        console.log("✅ Cache update completed!");
    } catch (error) {
        console.error("❌ Cache update failed:", error);
    }
};

app.get('/api/cron/update-ranking-cache', async (req, res) => {
    // 주의: 이 요청은 시간이 오래 걸리므로 Vercel에서 즉시 응답을 주고 
    // 백그라운드에서 실행하게 하려면 별도의 서버가 필요할 수 있습니다.
    // 하지만 일단 호출 시 실행되도록 구성합니다.
    fetchAllStockDataAndCache(); 
    res.status(200).json({ message: "Update triggered" });
});

// --- Vercel 환경 설정 ---
if (process.env.VERCEL || require.main !== module) {
    module.exports = app;
} else {
    app.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
    });
}