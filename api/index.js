const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// KIS API 라이브러리
const { getKisToken, fetchStockPrice, chunkedFetchStockPrices } = require('./lib/kisApi.cjs');

const app = express();

// Supabase 클라이언트 설정
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 데이터 및 맵 초기화
let themesData = [];
const stockCodeToNameMap = new Map();

// JSON 데이터 읽기 (Vercel 환경에 맞춰 경로 수정)
try {
    const themesPath = path.join(process.cwd(), 'api', 'toss_stock_themes_local_v3.json');
    const krxPath = path.join(process.cwd(), 'api', 'krx_stocks.json');

    // 1. 전체 종목 리스트에서 이름 매핑
    if (fs.existsSync(krxPath)) {
        const krxData = JSON.parse(fs.readFileSync(krxPath, 'utf8'));
        krxData.forEach(s => stockCodeToNameMap.set(s.code, s.name));
    }

    // 2. 테마 데이터 로딩 및 이름 매핑 보완
    if (fs.existsSync(themesPath)) {
        const rawData = JSON.parse(fs.readFileSync(themesPath, 'utf8'));
        themesData = Array.isArray(rawData) ? rawData : (rawData.themes || []);
        themesData.forEach(t => {
            if (t.stocks && Array.isArray(t.stocks)) {
                t.stocks.forEach(s => stockCodeToNameMap.set(s.code, s.name));
            }
        });
        console.log(`✅ Loaded ${themesData.length} themes and mapped ${stockCodeToNameMap.size} total stocks.`);
    }
} catch (e) { console.error("❌ Data Load Error", e); }

app.use(cors());
app.use(express.json());

// --- API 라우트 ---

app.get('/api/themes/top-performing', async (req, res) => {
    try {
        const { data: cachedThemeData } = await supabase
            .from('stock_data_cache')
            .select('data')
            .eq('id', 'theme_ranking_results')
            .single();

        if (cachedThemeData) return res.json(cachedThemeData.data);
        res.json([]);
    } catch (e) { res.status(500).json([]); }
});

// 특정 테마의 종목 리스트 조회 라우트 추가
app.get('/api/themes/:themeName/stocks', async (req, res) => {
    const themeName = req.params.themeName;
    try {
        const { data: cachedThemeData } = await supabase
            .from('stock_data_cache')
            .select('data')
            .eq('id', 'theme_ranking_results')
            .single();

        if (!cachedThemeData) return res.json([]);

        // 캐시 데이터에서 해당 테마 이름과 일치하는 항목 찾기
        const theme = cachedThemeData.data.find(t => t.name === themeName);
        
        if (theme && theme.stocks) {
            res.json(theme.stocks);
        } else {
            res.json([]);
        }
    } catch (e) { 
        console.error("❌ Theme Stocks Fetch Error:", e);
        res.status(500).json([]); 
    }
});

app.get('/api/market/indicators', async (req, res) => {
    try {
        const { data: cachedData } = await supabase
            .from('stock_data_cache')
            .select('data')
            .eq('id', 'market_indicators')
            .single();

        if (cachedData) return res.json(cachedData.data);
        res.json({});
    } catch (e) { res.status(500).json({}); }
});

app.get('/api/ranking/:type', async (req, res) => {
    const type = req.params.type; // gainer, loser, volume, value
    try {
        // 네이버 기반 랭킹 캐시 데이터 가져오기
        const { data: cachedData } = await supabase
            .from('stock_data_cache')
            .select('data')
            .eq('id', `ranking_${type}`)
            .single();

        if (cachedData) return res.json(cachedData.data);
        
        // 데이터가 없을 경우 all_stocks에서 폴백
        const { data: allStocks } = await supabase
            .from('stock_data_cache')
            .select('data')
            .eq('id', 'all_stocks')
            .single();

        if (!allStocks) return res.json([]);
        res.json(allStocks.data.slice(0, 50));
    } catch (e) { res.status(500).json([]); }
});

app.get('/api/stocks/prices', async (req, res) => {
    const codes = (req.query.codes || "").split(',').filter(Boolean);
    try {
        // 한투 API 대신 네이버 금융 엔진 활용
        const { fetchNaverPrices } = require('./lib/publicApi.cjs');
        const results = await fetchNaverPrices(codes);
        res.json(results.reduce((a, s) => ({ ...a, [s.code]: s }), {}));
    } catch (e) { res.status(500).json({}); }
});

// Vercel 핵심: app 객체를 직접 내보냄
module.exports = app;

// 로컬 서버 실행 (npm start용)
if (require.main === module) {
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
        console.log(`🚀 StockMate Backend Server running on http://localhost:${PORT}`);
    });
}