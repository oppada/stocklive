const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

app.use(cors());
app.use(express.json());

// 전체 종목 데이터 로드 (검색용)
let allStocks = [];
try {
    const stocksPath = path.join(__dirname, '..', 'all', 'krx_stocks.json');
    if (fs.existsSync(stocksPath)) {
        allStocks = JSON.parse(fs.readFileSync(stocksPath, 'utf8'));
        console.log(`✅ Loaded ${allStocks.length} stocks for search.`);
    }
} catch (e) {
    console.error("❌ Failed to load stocks for search:", e.message);
}

// 종목 검색 API
app.get('/api/stocks/search', (req, res) => {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json([]);
    
    const results = allStocks.filter(s => 
        s.name.toLowerCase().includes(q.toLowerCase()) || 
        s.code.includes(q)
    ).slice(0, 20); // 최대 20개까지만 반환
    
    res.json(results);
});

// 통합 투자자 동향 API
app.get('/api/investor-trend/:type', async (req, res) => {
    const { type } = req.params; // buy, sell
    const investor = req.query.investor || 'foreign';
    try {
        const { data } = await supabase.from('stock_data_cache').select('data').eq('id', 'toss_investor_trend_all').single();
        const rootData = data?.data;
        if (rootData?.[type]?.[investor]) {
            const section = rootData[type][investor];
            return res.json({
                list: section.list || [],
                // 개별 섹션의 원본 시간(예: 오늘 13:57 기준)을 우선 사용
                updated_at_text: section.time || rootData.updated_at_text || ""
            });
        }
        res.json({ list: [], updated_at_text: "" });
    } catch (e) { res.json({ list: [], updated_at_text: "" }); }
});

// 지수 API
app.get('/api/market/indicators', async (req, res) => {
    try {
        const { data } = await supabase.from('stock_data_cache').select('data').eq('id', 'market_indicators').single();
        res.json(data?.data || {});
    } catch (e) { res.json({}); }
});

// 랭킹 API
app.get('/api/ranking/:type', async (req, res) => {
    try {
        const { data } = await supabase.from('stock_data_cache').select('data').eq('id', `ranking_${req.params.type}`).single();
        res.json(data?.data || []);
    } catch (e) { res.json([]); }
});

// 테마 API
app.get('/api/themes/top-performing', async (req, res) => {
    try {
        const { data } = await supabase.from('stock_data_cache').select('data').eq('id', 'toss_themes').single();
        res.json(data?.data || []);
    } catch (e) { res.json([]); }
});

app.get('/api/themes/:themeName/stocks', async (req, res) => {
    try {
        const { data: cached } = await supabase.from('stock_data_cache').select('data').eq('id', 'toss_themes').single();
        const theme = cached?.data?.find(t => (t.name === req.params.themeName || t.theme_name === req.params.themeName));
        if (theme?.no) {
            const { fetchNaverThemeStocks } = require('./lib/publicApi.cjs');
            return res.json(await fetchNaverThemeStocks(theme.no));
        }
        res.json([]);
    } catch (e) { res.json([]); }
});

app.get('/api/stocks/prices', async (req, res) => {
    try {
        const codes = (req.query.codes || "").split(',').filter(Boolean);
        const { fetchNaverPrices } = require('./lib/publicApi.cjs');
        const results = await fetchNaverPrices(codes);
        res.json(results.reduce((a, s) => ({ ...a, [s.code]: s }), {}));
    } catch (e) { res.json({}); }
});

app.get('/api/stocks/:code/detail', async (req, res) => {
    try {
        const { fetchNaverStockDetail } = require('./lib/publicApi.cjs');
        const detail = await fetchNaverStockDetail(req.params.code);
        if (detail) return res.json(detail);
        res.status(404).json({ error: 'Stock not found' });
    } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
});

app.get('/api/stocks/:code/charts', async (req, res) => {
    const { code } = req.params;
    const { timeframe = 'day' } = req.query; // day, week, month
    
    try {
        const { fetchNaverStockCharts } = require('./lib/publicApi.cjs');
        const data = await fetchNaverStockCharts(code, timeframe);
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch chart data' });
    }
});

app.get('/api/stocks/:code/hoga', async (req, res) => {
    const { code } = req.params;
    try {
        const { fetchNaverStockHoga } = require('./lib/publicApi.cjs');
        const data = await fetchNaverStockHoga(code);
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch hoga data' });
    }
});

app.get('/api/stocks/:code/investor-trend', async (req, res) => {
    const { code } = req.params;
    try {
        const { fetchNaverInvestorTrend } = require('./lib/publicApi.cjs');
        const data = await fetchNaverInvestorTrend(code);
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch investor trend' });
    }
});

module.exports = app;
if (require.main === module) app.listen(4000);
