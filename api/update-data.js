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
    const isWeekend = (day === 0 || day === 6);
    
    // 한국 장 시간: 08:50 ~ 16:30
    const isKRMarketTime = isForce || (!isWeekend && ((hour === 8 && minute >= 50) || (hour >= 9 && hour < 16) || (hour === 16 && minute <= 30)));
    const isUSMarketTime = isForce || (!isWeekend && (hour >= 22 || hour < 6));
    
    // [최종] 토스 수집 조건: Vercel이든 로컬이든 5분 주기가 되면 무조건 시도!
    const canRunToss = isForce || (isKRMarketTime && (minute % 5 === 0));

    console.log(`⏰ [Smart Cron] KST ${hour}:${minute} | KR장:${isKRMarketTime}, Toss수집:${canRunToss}`);

    try {
        // --- 1. 네이버 지수 및 랭킹 (Vercel에서 1분마다 안정적으로 작동) ---
        if (isKRMarketTime || isUSMarketTime || isForce) {
            console.log("📈 지수/랭킹 수집 중...");
            const indicators = {
                '코스피': await fetchPublicIndicator('코스피', '^KS11'),
                '코스닥': await fetchPublicIndicator('코스닥', '^KQ11'),
                '다우산업': await fetchPublicIndicator('다우산업', 'DJI@DJI'),
                '나스닥': await fetchPublicIndicator('나스닥', '^IXIC'),
                'S&P500': await fetchPublicIndicator('S&P500', '^GSPC')
            };
            if (indicators['코스피'] && indicators['코스피'].price > 0) {
                await supabase.from('stock_data_cache').upsert({ id: 'market_indicators', data: indicators, updated_at: new Date() });
            }

            const rankings = {
                gainer: await fetchNaverRankings('gainer'),
                loser: await fetchNaverRankings('loser'),
                volume: await fetchNaverRankings('volume'),
                value: await fetchNaverRankings('value')
            };
            for (const [type, data] of Object.entries(rankings)) {
                if (data && data.length > 5) await supabase.from('stock_data_cache').upsert({ id: `ranking_${type}`, data: data, updated_at: new Date() });
            }

            const naverThemes = await fetchNaverThemes();
            if (naverThemes && naverThemes.length > 5) {
                await supabase.from('stock_data_cache').upsert({ id: 'toss_themes', data: naverThemes, updated_at: new Date() });
            }
        }

        // --- 2. 토스 투자자 수급 (완전 자동화 모드) ---
        if (canRunToss) {
            console.log("📡 [Toss JS] 자동 수집 시작 (Vercel/Local)...");
            try {
                const collectInvestorTrend = require(path.join(__dirname, 'toss_investor_trend.js'));
                const investorData = await collectInvestorTrend(); 
                
                // [방어 로직] 데이터가 확실히 존재할 때만 DB에 기록함 (증발 방지)
                if (investorData && investorData.buy?.foreign?.list?.length > 50) {
                    await supabase.from('stock_data_cache').upsert({ 
                        id: 'toss_investor_trend_all', 
                        data: investorData, 
                        updated_at: new Date() 
                    });
                    console.log("✅ Toss Data Sync Complete.");
                } else {
                    console.warn("⚠️ Toss data empty or incomplete. Existing data preserved.");
                }
            } catch (err) {
                console.error("❌ Toss Engine Error (May happen on Vercel):", err.message);
            }
        }

        res.status(200).json({ success: true, toss_triggered: canRunToss });
    } catch (error) {
        console.error("❌ Global Cron Error:", error.message);
        res.status(500).json({ error: error.message });
    }
};
