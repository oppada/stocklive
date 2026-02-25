const { createClient } = require('@supabase/supabase-js');
const { fetchPublicIndicator, fetchNaverRankings, fetchNaverThemes } = require('./lib/publicApi.cjs');
const path = require('path');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

module.exports = async (req, res) => {
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstDate = new Date(now.getTime() + kstOffset);
    const hour = kstDate.getUTCHours(); 
    const minute = kstDate.getUTCMinutes();

    const isForce = req.query && (req.query.force === 'true' || req.query.force === '1');
    const isLocal = !process.env.VERCEL;
    
    // 한국 장 시간: 08:50 ~ 16:30
    const isKRMarketTime = isForce || (hour >= 8 && hour < 17);
    const canRunToss = isForce || (isLocal && (minute % 5 === 0));

    console.log(`⏰ [Smart Cron] KST ${hour}:${minute} | Local:${isLocal}, Force:${isForce}`);

    try {
        // --- 1. 네이버 지수 (개별 타격) ---
        console.log("📈 지표 수집 시도...");
        const indicators = {
            '코스피': await fetchPublicIndicator('코스피', '^KS11'),
            '코스닥': await fetchPublicIndicator('코스닥', '^KQ11'),
            '다우산업': await fetchPublicIndicator('다우산업', 'DJI@DJI'),
            '나스닥': await fetchPublicIndicator('나스닥', '^IXIC'),
            'S&P500': await fetchPublicIndicator('S&P500', '^GSPC')
        };
        
        if (indicators['코스피'] && indicators['코스피'].price > 0) {
            console.log("🛠️ [DB] Saving: market_indicators");
            await supabase.from('stock_data_cache').upsert({ id: 'market_indicators', data: indicators, updated_at: new Date() });
        }

        // --- 2. 랭킹 및 테마 (개별 타격) ---
        if (isKRMarketTime) {
            console.log("📊 랭킹/테마 수집 시도...");
            const rankings = {
                gainer: await fetchNaverRankings('gainer'),
                loser: await fetchNaverRankings('loser'),
                volume: await fetchNaverRankings('volume'),
                value: await fetchNaverRankings('value')
            };
            
            for (const [type, data] of Object.entries(rankings)) {
                if (data && Array.isArray(data) && data.length > 5) {
                    console.log(`🛠️ [DB] Saving: ranking_${type}`);
                    await supabase.from('stock_data_cache').upsert({ id: `ranking_${type}`, data: data, updated_at: new Date() });
                }
            }

            const naverThemes = await fetchNaverThemes();
            if (naverThemes && naverThemes.length > 5) {
                console.log("🛠️ [DB] Saving: toss_themes");
                await supabase.from('stock_data_cache').upsert({ id: 'toss_themes', data: naverThemes, updated_at: new Date() });
            }
        }

        // --- 3. 토스 수급 (철벽 검증) ---
        if (canRunToss) {
            console.log("📡 [Toss JS] 데이터 수집 시작...");
            try {
                const collectInvestorTrend = require(path.join(__dirname, 'toss_investor_trend.js'));
                const investorData = await collectInvestorTrend(); 
                
                // 완벽한 데이터가 아니면 절대 저장하지 않음!
                if (investorData && investorData.buy?.foreign?.list?.length > 50) {
                    console.log("🛠️ [DB] Saving: toss_investor_trend_all (CRITICAL)");
                    await supabase.from('stock_data_cache').upsert({ 
                        id: 'toss_investor_trend_all', 
                        data: investorData, 
                        updated_at: new Date() 
                    });
                } else {
                    console.warn("⚠️ [Toss] 데이터 부족. 기존 행을 보존합니다.");
                }
            } catch (err) {
                console.error("❌ [Toss] 엔진 실행 오류:", err.message);
            }
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.error("❌ 전역 오류:", error.message);
        res.status(500).json({ error: error.message });
    }
};
