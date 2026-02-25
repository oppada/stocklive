const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { fetchPublicIndicator, fetchNaverRankings, fetchNaverThemes } = require('./lib/publicApi.cjs');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

module.exports = async (req, res) => {
    // 1. 한국 시간(KST) 기반 상태 판별
    const now = new Date();
    const kst = new Date(now.getTime() + (9 * 60 * 60 * 1000)); 
    const day = kst.getUTCDay(); // 0:일, 1:월...
    const hour = kst.getUTCHours();
    const minute = kst.getUTCMinutes();
    
    const isWeekend = (day === 0 || day === 6);
    // 한국 장: 08:50 ~ 16:00 (전후 여유 포함)
    const isKRMarketTime = !isWeekend && ((hour === 8 && minute >= 50) || (hour >= 9 && hour < 16));
    // 미국 장: 22:30 ~ 05:30 (서머타임 고려 여유)
    const isUSMarketTime = !isWeekend && (hour >= 22 || hour < 6);
    
    const isTossTime = isKRMarketTime && (minute % 5 === 0);

    console.log(`⏰ [Smart Cron] KST ${hour}:${minute} (KR장:${isKRMarketTime}, US장:${isUSMarketTime}, Toss:${isTossTime})`);

    try {
        // --- 1단계: 글로벌 지수 업데이트 (US장 또는 KR장 시간에 1분마다) ---
        if (isKRMarketTime || isUSMarketTime) {
            console.log("📈 실시간 지표(Ticker) 수집 중...");
            const indicators = {
                '코스피': await fetchPublicIndicator('코스피', '^KS11'),
                '코스닥': await fetchPublicIndicator('코스닥', '^KQ11'),
                '다우산업': await fetchPublicIndicator('다우산업', 'DJI@DJI'),
                '나스닥': await fetchPublicIndicator('나스닥', '^IXIC'),
                'S&P500': await fetchPublicIndicator('S&P500', '^GSPC')
            };
            await supabase.from('stock_data_cache').upsert({ id: 'market_indicators', data: indicators, updated_at: new Date() });
        }

        // --- 2단계: 한국 장 랭킹 및 테마 (KR장 시간에만 1분마다) ---
        if (isKRMarketTime) {
            console.log("📊 네이버 랭킹 및 테마 수집 중...");
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
            if (naverThemes.length > 0) {
                await supabase.from('stock_data_cache').upsert({ id: 'toss_themes', data: naverThemes, updated_at: new Date() });
                await supabase.from('stock_data_cache').upsert({ id: 'theme_ranking_results', data: naverThemes, updated_at: new Date() });
            }
            
            if (rankings.gainer.length > 0) {
                await supabase.from('stock_data_cache').upsert({ id: 'all_stocks', data: rankings.gainer, updated_at: new Date() });
            }
        }

        // --- 3단계: 토스 투자자 수급 (KR장 시간 중 5분마다) ---
        if (isTossTime) {
            console.log("📡 [Toss JS] 자동 수집 가동...");
            try {
                const collectInvestorTrend = require('./toss_investor_trend.js');
                const investorData = await collectInvestorTrend(); 
                if (investorData) {
                    await supabase.from('stock_data_cache').upsert({ id: 'toss_investor_trend_all', data: investorData, updated_at: new Date() });
                    // 개별 섹션 분리 저장 로직
                    const tasks = [];
                    ['buy', 'sell'].forEach(type => {
                        ['foreign', 'institution', 'individual'].forEach(inv => {
                            if (investorData[type] && investorData[type][inv]) {
                                const sec = investorData[type][inv];
                                tasks.push(supabase.from('stock_data_cache').upsert({
                                    id: `toss_investor_${inv}_${type}`,
                                    data: { list: sec.list, updated_at_text: sec.time },
                                    updated_at: new Date()
                                }));
                            }
                        });
                    });
                    await Promise.all(tasks);
                }
            } catch (err) {
                console.warn("⚠️ Toss 수집 실패 (로컬 JSON 폴백):", err.message);
            }
        }

        // 장 마감 후 휴식 시간에는 최소한의 응답만
        if (!isKRMarketTime && !isUSMarketTime) {
            console.log("😴 시장 휴장 시간입니다. 수집을 건너뜁니다.");
        }

        res.status(200).json({ success: true, mode: isKRMarketTime ? "KR_Market" : (isUSMarketTime ? "US_Market" : "Sleep") });
    } catch (error) {
        console.error("❌ 크론 오류:", error.message);
        res.status(500).json({ error: error.message });
    }
};
