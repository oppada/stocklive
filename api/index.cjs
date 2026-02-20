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
    const themesPath = path.join(process.cwd(), 'api', 'toss_real_150_themes.json');
    if (fs.existsSync(themesPath)) {
        const rawData = JSON.parse(fs.readFileSync(themesPath, 'utf8'));
        themesData = rawData.themes || [];
        themesData.forEach(t => t.stocks.forEach(s => stockCodeToNameMap.set(s.code, s.name)));
    }
} catch (e) { console.error("❌ Theme Load Error", e); }

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

app.get('/api/ranking/:type', async (req, res) => {
    try {
        const { data: cachedData } = await supabase
            .from('stock_data_cache')
            .select('data')
            .eq('id', 'all_stocks')
            .single();

        if (!cachedData) return res.json([]);
        
        const allStocks = cachedData.data;
        const type = req.params.type;
        let sorted = [...allStocks];

        if (type === 'gainer') sorted.sort((a, b) => b.changeRate - a.changeRate);
        else if (type === 'loser') sorted.sort((a, b) => a.changeRate - b.changeRate);
        else if (type === 'volume') sorted.sort((a, b) => b.volume - a.volume);
        else if (type === 'value') sorted.sort((a, b) => b.tradeValue - a.tradeValue);

        res.json(sorted.slice(0, 50));
    } catch (e) { res.status(500).json([]); }
});

app.get('/api/stocks/prices', async (req, res) => {
    const codes = (req.query.codes || "").split(',').filter(Boolean);
    try {
        const token = await getKisToken();
        const results = await Promise.all(codes.map(c => fetchStockPrice(token, c.trim(), stockCodeToNameMap)));
        res.json(results.filter(Boolean).reduce((a, s) => ({ ...a, [s.code]: s }), {}));
    } catch (e) { res.status(500).json({}); }
});

// Vercel 핵심: app 객체를 직접 내보냄
module.exports = app;

// 로컬 서버 실행 (npm start용)
if (require.main === module) {
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
        console.log(`🚀 StockLive Backend Server running on http://localhost:${PORT}`);
    });
}