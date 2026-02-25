const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { fetchPublicIndicator, fetchNaverRankings, fetchNaverThemes } = require('./lib/publicApi.cjs');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

module.exports = async (req, res) => {
    // 1. 시간 판별 (KST)
    const now = new Date();
    const kstDate = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const hour = kstDate.getUTCHours(); 
    const minute = kstDate.getUTCMinutes();
    const day = kstDate.getUTCDay();

    const isForce = req.query && (req.query.force === 'true' || req.query.force === '1');
    const isLocal = process.env.NODE_ENV === 'development' || !process.env.VERCEL;
    const isWeekend = (day === 0 || day === 6);
    
    // 장 시간 판별 (로컬 환경이면 시간 상관없이 장 시간으로 간주하여 개발 편의 제공)
    const isKRMarketTime = isForce || isLocal || (!isWeekend && ((hour === 8 && minute >= 50) || (hour >= 9 && hour < 16)));
    const isUSMarketTime = isForce || isLocal || (!isWeekend && (hour >= 22 || hour < 6));
    
    // 토스는 5분마다 혹은 강제/로컬 실행 시
    const isTossTime = (minute % 5 === 0) || isForce || isLocal;

    console.log(`⏰ [Smart Cron] KST ${hour}:${minute} | Local:${isLocal}, KR:${isKRMarketTime}, Toss:${isTossTime}`);

    try {
        // --- 1. 지수 수집 ---
        const indicators = {
            '코스피': await fetchPublicIndicator('코스피', '^KS11'),
            '코스닥': await fetchPublicIndicator('코스닥', '^KQ11'),
            '다우산업': await fetchPublicIndicator('다우산업', 'DJI@DJI'),
            '나스닥': await fetchPublicIndicator('나스닥', '^IXIC'),
            'S&P500': await fetchPublicIndicator('S&P500', '^GSPC')
        };
        if (indicators['코스피'].price > 0) {
            await supabase.from('stock_data_cache').upsert({ id: 'market_indicators', data: indicators, updated_at: new Date() });
        }

        // --- 2. 랭킹 및 테마 ---
        if (isKRMarketTime) {
            const rankings = {
                gainer: await fetchNaverRankings('gainer'),
                loser: await fetchNaverRankings('loser'),
                volume: await fetchNaverRankings('volume'),
                value: await fetchNaverRankings('value')
            };
            for (const [type, data] of Object.entries(rankings)) {
                if (data && data.length > 0) await supabase.from('stock_data_cache').upsert({ id: `ranking_${type}`, data: data, updated_at: new Date() });
            }
            const naverThemes = await fetchNaverThemes();
            if (naverThemes && naverThemes.length > 0) {
                await supabase.from('stock_data_cache').upsert({ id: 'toss_themes', data: naverThemes, updated_at: new Date() });
                await supabase.from('stock_data_cache').upsert({ id: 'theme_ranking_results', data: naverThemes, updated_at: new Date() });
            }
        }

        // --- 3. 토스 수급 (데이터 유효성 검사 필수) ---
        if (isTossTime) {
            try {
                const collectInvestorTrend = require(path.join(__dirname, 'toss_investor_trend.js'));
                const investorData = await collectInvestorTrend(); 
                
                if (investorData && investorData.buy && investorData.buy.foreign.list && investorData.buy.foreign.list.length > 0) {
                    await supabase.from('stock_data_cache').upsert({ id: 'toss_investor_trend_all', data: investorData, updated_at: new Date() });
                    
                    const tasks = [];
                    ['buy', 'sell'].forEach(type => {
                        ['foreign', 'institution', 'individual'].forEach(inv => {
                            const sec = investorData[type][inv];
                            if (sec && sec.list && sec.list.length > 0) {
                                tasks.push(supabase.from('stock_data_cache').upsert({
                                    id: `toss_investor_${inv}_${type}`,
                                    data: { list: sec.list, updated_at_text: sec.time },
                                    updated_at: new Date()
                                }));
                            }
                        });
                    });
                    await Promise.all(tasks);
                    console.log("✅ 토스 데이터 업데이트 성공");
                } else {
                    console.warn("⚠️ 토스 수집 결과 유효하지 않음 (기존 데이터 유지)");
                }
            } catch (err) {
                console.error("❌ 토스 엔진 오류:", err.message);
            }
        }

        res.status(200).json({ success: true, mode: isKRMarketTime ? "Active" : "Sleep" });
    } catch (error) {
        console.error("❌ 전역 오류:", error.message);
        res.status(500).json({ error: error.message });
    }
};
