const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

app.use(cors());
app.use(express.json());

// 통합 투자자 동향 API
app.get('/api/investor-trend/:type', async (req, res) => {
    const { type } = req.params; // buy, sell
    const investor = req.query.investor || 'foreign';
    try {
        const { data } = await supabase.from('stock_data_cache').select('data').eq('id', 'toss_investor_trend_all').single();
        if (data?.data?.[type]?.[investor]) {
            const section = data.data[type][investor];
            return res.json({
                list: section.list || [],
                updated_at_text: section.time || ""
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

module.exports = app;
if (require.main === module) app.listen(4000);
