const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();

// Supabase 설정
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

app.use(cors());
app.use(express.json());

// --- API 라우트 ---

// 1. 테마 랭킹
app.get('/api/themes/top-performing', async (req, res) => {
    try {
        const { data: cachedThemeData } = await supabase.from('stock_data_cache').select('data').eq('id', 'toss_themes').single();
        if (cachedThemeData) return res.json(cachedThemeData.data);
        
        const { data: oldData } = await supabase.from('stock_data_cache').select('data').eq('id', 'theme_ranking_results').single();
        if (oldData) return res.json(oldData.data);
        res.json([]);
    } catch (e) { res.status(500).json([]); }
});

// 2. 특정 테마 종목 (실시간 크롤링 로직 추가)
app.get('/api/themes/:themeName/stocks', async (req, res) => {
    const themeName = req.params.themeName;
    try {
        const { data: cachedThemeData } = await supabase.from('stock_data_cache').select('data').eq('id', 'toss_themes').single();
        if (!cachedThemeData) return res.json([]);

        const theme = cachedThemeData.data.find(t => (t.name === themeName || t.theme_name === themeName));
        
        if (theme) {
            // 이미 종목 리스트가 포함되어 있다면 반환
            if (theme.stocks && theme.stocks.length > 0) return res.json(theme.stocks);
            
            // 네이버 테마 번호(no)가 있다면 실시간으로 긁어옴
            if (theme.no) {
                const { fetchNaverThemeStocks } = require('./lib/publicApi.cjs');
                const stocks = await fetchNaverThemeStocks(theme.no);
                return res.json(stocks);
            }
        }
        res.json([]);
    } catch (e) { res.status(500).json([]); }
});

// 3. 시장 지수 (티커)
app.get('/api/market/indicators', async (req, res) => {
    try {
        const { data: cachedData } = await supabase.from('stock_data_cache').select('data').eq('id', 'market_indicators').single();
        if (cachedData) return res.json(cachedData.data);
        res.json({});
    } catch (e) { res.status(500).json({}); }
});

// 4. 시장 랭킹 (급상승 등)
app.get('/api/ranking/:type', async (req, res) => {
    const type = req.params.type;
    try {
        const { data: cachedData } = await supabase.from('stock_data_cache').select('data').eq('id', `ranking_${type}`).single();
        if (cachedData) return res.json(cachedData.data);
        res.json([]);
    } catch (e) { res.status(500).json([]); }
});

// 5. 투자자별 매매 동향 (핵심 수정!)
app.get('/api/investor-trend/:type', async (req, res) => {
    const type = req.params.type; // buy, sell
    const investor = req.query.investor || 'foreign'; // foreign, institution, individual
    try {
        const { data: cachedData } = await supabase.from('stock_data_cache').select('data').eq('id', 'toss_investor_trend_all').single();

        if (cachedData && cachedData.data[type] && cachedData.data[type][investor]) {
            const section = cachedData.data[type][investor];
            // list와 time을 명확하게 객체로 묶어서 반환
            return res.json({
                list: section.list || [],
                updated_at_text: section.time || ""
            });
        }

        // 개별 캐시 폴백
        const { data: fallback } = await supabase.from('stock_data_cache').select('data').eq('id', `toss_investor_${investor}_${type}`).single();
        if (fallback) return res.json(fallback.data);

        res.json({ list: [], updated_at_text: "" });
    } catch (e) {
        console.error("❌ API Error:", e);
        res.status(500).json({ list: [], updated_at_text: "" });
    }
});

// 6. 실시간 주가 (네이버 활용)
app.get('/api/stocks/prices', async (req, res) => {
    const codes = (req.query.codes || "").split(',').filter(Boolean);
    try {
        const { fetchNaverPrices } = require('./lib/publicApi.cjs');
        const results = await fetchNaverPrices(codes);
        res.json(results.reduce((a, s) => ({ ...a, [s.code]: s }), {}));
    } catch (e) { res.status(500).json({}); }
});

module.exports = app;

if (require.main === module) {
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => console.log(`🚀 Server on ${PORT}`));
}
