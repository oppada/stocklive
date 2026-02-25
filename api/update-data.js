const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { fetchPublicIndicator, fetchNaverRankings, fetchNaverThemes } = require('./lib/publicApi.cjs');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

module.exports = async (req, res) => {
    // 1. 한국 시간(KST) 계산
    const now = new Date();
    const kstDate = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const hour = kstDate.getUTCHours(); 
    const minute = kstDate.getUTCMinutes();
    const day = kstDate.getUTCDay();

    const isForce = req.query && (req.query.force === 'true' || req.query.force === '1');
    const isWeekend = (day === 0 || day === 6);
    
    // 한국 장 시간 판별: 08:50 ~ 16:00
    const isKRMarketTime = isForce || (!isWeekend && ((hour === 8 && minute >= 50) || (hour >= 9 && hour < 16)));
    const isUSMarketTime = isForce || (!isWeekend && (hour >= 22 || hour < 6));
    
    // 토스 수집 조건: 5분 주기 (0, 5, 10, 15...) 또는 강제 실행
    const isTossTime = (minute % 5 === 0) || isForce;

    console.log(`⏰ [Smart Cron] KST ${hour}:${minute} | KR장:${isKRMarketTime}, Toss실행:${isTossTime}`);

    try {
        // --- 1. 네이버 지수 (티커) ---
        if (isKRMarketTime || isUSMarketTime || isForce) {
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
        }

        // --- 2. 네이버 랭킹 및 테마 ---
        if (isKRMarketTime || isForce) {
            const rankings = {
                gainer: await fetchNaverRankings('gainer'),
                loser: await fetchNaverRankings('loser'),
                volume: await fetchNaverRankings('volume'),
                value: await fetchNaverRankings('value')
            };
            for (const [type, data] of Object.entries(rankings)) {
                if (data && data.length > 10) {
                    await supabase.from('stock_data_cache').upsert({ id: `ranking_${type}`, data: data, updated_at: new Date() });
                }
            }
            const naverThemes = await fetchNaverThemes();
            if (naverThemes && naverThemes.length > 5) {
                await supabase.from('stock_data_cache').upsert({ id: 'toss_themes', data: naverThemes, updated_at: new Date() });
                await supabase.from('stock_data_cache').upsert({ id: 'theme_ranking_results', data: naverThemes, updated_at: new Date() });
            }
        }

        // --- 3. 토스 투자자 수급 (5분 주기 보호 모드) ---
        if (isTossTime) {
            console.log("📡 [Toss JS] 자동 수집 가동...");
            try {
                const collectInvestorTrend = require(path.join(__dirname, 'toss_investor_trend.js'));
                const investorData = await collectInvestorTrend(); 
                
                // 데이터 유효성 검사: 외국인 종목이 최소 50개 이상은 되어야 정상으로 간주
                const isDataValid = investorData && 
                                    investorData.buy && 
                                    investorData.buy.foreign && 
                                    investorData.buy.foreign.list && 
                                    investorData.buy.foreign.list.length > 50;

                if (isDataValid) {
                    await supabase.from('stock_data_cache').upsert({ id: 'toss_investor_trend_all', data: investorData, updated_at: new Date() });
                    const tasks = [];
                    ['buy', 'sell'].forEach(type => {
                        ['foreign', 'institution', 'individual'].forEach(inv => {
                            const sec = investorData[type][inv];
                            if (sec && sec.list) {
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
                    console.warn("⚠️ 토스 데이터가 불완전함 (0개 또는 부족). 업데이트를 스킵하고 기존 데이터를 유지합니다.");
                }
            } catch (err) {
                console.error("❌ 토스 엔진 실행 실패:", err.message);
            }
        }

        res.status(200).json({ success: true, mode: isKRMarketTime ? "Market_Open" : "Market_Closed" });
    } catch (error) {
        console.error("❌ 전역 크론 오류:", error.message);
        res.status(500).json({ error: error.message });
    }
};
