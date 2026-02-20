const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { getKisToken, chunkedFetchStockPrices } = require('./lib/kisApi.cjs');

// Supabase 설정
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

module.exports = async (req, res) => {
    // Vercel Cron Job 호출인지 확인 (보안을 위해 권장되나 필수 아님)
    // if (req.headers['x-vercel-cron'] !== '1') {
    //     return res.status(401).json({ error: 'Unauthorized' });
    // }

    console.log("⏰ [Cron] 주기적 데이터 업데이트 시작...");

    try {
        const krxPath = path.join(process.cwd(), 'api', 'krx_stocks.json');
        const themesPath = path.join(process.cwd(), 'api', 'toss_stock_themes_local_v3.json');

        if (!fs.existsSync(krxPath) || !fs.existsSync(themesPath)) {
            throw new Error("JSON 파일 로드 실패");
        }

        const allStocksList = JSON.parse(fs.readFileSync(krxPath, 'utf8'));
        const themesData = JSON.parse(fs.readFileSync(themesPath, 'utf8'));

        const token = await getKisToken();
        const allCodes = Array.from(new Set(allStocksList.map(s => s.code)));
        const stockCodeToNameMap = new Map();
        allStocksList.forEach(s => stockCodeToNameMap.set(s.code, s.name));
        themesData.forEach(t => t.stocks.forEach(s => stockCodeToNameMap.set(s.code, s.name)));

        // KIS API 속도 제한 준수: 10개씩 0.5초 간격 (Pro 환경 300초 내 완료 가능)
        const priceResults = await chunkedFetchStockPrices(token, allCodes, stockCodeToNameMap, 10, 500);
        
        const priceMap = new Map();
        priceResults.forEach(p => priceMap.set(p.code, p));

        const themeRankings = themesData.map(theme => {
            const stocksWithPrices = theme.stocks.map(s => {
                const p = priceMap.get(s.code);
                return p ? { ...s, ...p } : null;
            }).filter(Boolean);

            if (stocksWithPrices.length === 0) return null;
            const avgChangeRate = stocksWithPrices.reduce((sum, s) => sum + (s.changeRate || 0), 0) / stocksWithPrices.length;
            
            return {
                name: theme.theme_name,
                avgChangeRate,
                stocks: stocksWithPrices.sort((a, b) => b.changeRate - a.changeRate)
            };
        }).filter(Boolean).sort((a, b) => b.avgChangeRate - a.avgChangeRate);

        // Supabase 캐시 업데이트
        await supabase.from('stock_data_cache').upsert({ id: 'all_stocks', data: priceResults, updated_at: new Date() });
        await supabase.from('stock_data_cache').upsert({ id: 'theme_ranking_results', data: themeRankings, updated_at: new Date() });

        console.log("✅ [Cron] 업데이트 완료!");
        res.status(200).json({ success: true, updated: priceResults.length });

    } catch (error) {
        console.error("❌ [Cron] 오류:", error.message);
        res.status(500).json({ error: error.message });
    }
};