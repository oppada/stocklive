const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { fetchPublicIndicator, fetchNaverRankings, fetchNaverThemes } = require('./lib/publicApi.cjs');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

module.exports = async (req, res) => {
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstDate = new Date(now.getTime() + kstOffset);
    const hour = kstDate.getUTCHours(); 
    const minute = kstDate.getUTCMinutes();
    const day = kstDate.getUTCDay();

    const isForce = req.query && (req.query.force === 'true' || req.query.force === '1');
    const isLocal = !process.env.VERCEL;
    const isWeekend = (day === 0 || day === 6);
    
    const isKRMarketTime = isForce || (!isWeekend && ((hour === 8 && minute >= 50) || (hour >= 9 && hour < 16)));
    const isUSMarketTime = isForce || (!isWeekend && (hour >= 22 || hour < 6));
    const isTossTime = (minute % 5 === 0) || isForce;

    console.log(`⏰ Smart Cron: KST ${hour}:${minute} (KR장:${isKRMarketTime}, Toss:${isTossTime})`);

    try {
        // 1. 네이버 지수
        if (isKRMarketTime || isUSMarketTime || isForce) {
            const indicators = {
                '코스피': await fetchPublicIndicator('코스피', '^KS11'),
                '코스닥': await fetchPublicIndicator('코스닥', '^KQ11'),
                '다우산업': await fetchPublicIndicator('다우산업', 'DJI@DJI'),
                '나스닥': await fetchPublicIndicator('나스닥', '^IXIC'),
                'S&P500': await fetchPublicIndicator('S&P500', '^GSPC')
            };
            if (indicators['코스피']?.price > 0) {
                await supabase.from('stock_data_cache').upsert({ id: 'market_indicators', data: indicators, updated_at: new Date() });
            }
        }

        // 2. 랭킹 및 테마
        if (isKRMarketTime || isForce) {
            const rankings = {
                gainer: await fetchNaverRankings('gainer'),
                loser: await fetchNaverRankings('loser'),
                volume: await fetchNaverRankings('volume'),
                value: await fetchNaverRankings('value')
            };
            for (const [type, data] of Object.entries(rankings)) {
                if (data?.length > 0) await supabase.from('stock_data_cache').upsert({ id: `ranking_${type}`, data: data, updated_at: new Date() });
            }
            const naverThemes = await fetchNaverThemes();
            if (naverThemes?.length > 0) {
                await supabase.from('stock_data_cache').upsert({ id: 'toss_themes', data: naverThemes, updated_at: new Date() });
            }
        }

        // 3. 토스 수급 (이 환경에서만 실행)
        if (isTossTime && isLocal) {
            console.log("📡 Collecting Toss Data...");
            const collectInvestorTrend = require(path.join(__dirname, 'toss_investor_trend.js'));
            const investorData = await collectInvestorTrend(); 
            
            if (investorData?.buy?.foreign?.list?.length > 0) {
                // 통합본 하나만 확실히 저장 (에러 최소화)
                await supabase.from('stock_data_cache').upsert({ 
                    id: 'toss_investor_trend_all', 
                    data: investorData, 
                    updated_at: new Date() 
                });
                console.log("✅ Toss Data synced to 'toss_investor_trend_all'");
            }
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.error("❌ Cron Error:", error.message);
        res.status(500).json({ error: error.message });
    }
};
