const { createClient } = require('@supabase/supabase-js');
const { 
    fetchPublicIndicator, 
    fetchNaverRankings, 
    fetchNaverThemes 
} = require('./lib/publicApi.cjs');
const collectInvestorTrend = require('./toss_investor_trend.js'); // Puppeteer 방식 원복

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

/**
 * 현재 시간이 시장 운영 시간인지 확인 (KST 기준)
 */
function getMarketStatus() {
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstDate = new Date(now.getTime() + kstOffset);
    
    const day = kstDate.getUTCDay(); 
    const hours = kstDate.getUTCHours();
    const minutes = kstDate.getUTCMinutes();
    const timeValue = hours * 100 + minutes;

    const isWeekend = (day === 0 || day === 6);
    
    // 한국 장: 평일 08:50 ~ 16:00
    const isKoreaMarket = !isWeekend && (timeValue >= 850 && timeValue <= 1600);
    
    // 미국 장: 평일 22:30 ~ 익일 06:00
    const isUSMarket = (timeValue >= 2230 || timeValue <= 600);

    return {
        isKoreaMarket,
        isUSMarket,
        isWeekend,
        currentTime: timeValue,
        day,
        formattedTime: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    };
}

module.exports = async (req, res) => {
    const isForce = req.query && (req.query.force === 'true' || req.query.force === '1');
    const status = getMarketStatus();

    console.log(`⏰ [Smart Update] KST Time: ${status.currentTime}, KR Market: ${status.isKoreaMarket}, US Market: ${status.isUSMarket}`);

    // 장 운영 시간이 아니고 강제 실행도 아니면 종료
    if (!status.isKoreaMarket && !status.isUSMarket && !isForce) {
        console.log("😴 [Market Closed] 작업을 건너뜁니다.");
        return res.status(200).json({ success: true, message: "Market closed" });
    }

    try {
        // --- 1. 네이버 지수 데이터 ---
        const indicators = {
            '코스피': await fetchPublicIndicator('코스피', '^KS11'),
            '코스닥': await fetchPublicIndicator('코스닥', '^KQ11'),
            '다우산업': await fetchPublicIndicator('다우산업', 'DJI@DJI'),
            '나스닥': await fetchPublicIndicator('나스닥', '^IXIC'),
            'S&P500': await fetchPublicIndicator('S&P500', '^GSPC')
        };
        
        if (indicators['코스피']?.price > 0 || indicators['나스닥']?.price > 0) {
            await supabase.from('stock_data_cache').upsert({ 
                id: 'market_indicators', 
                data: indicators, 
                updated_at: new Date() 
            });
            console.log("✅ [Indicators] 지수 업데이트 완료.");
        }

        // --- 2. 한국 장 운영 시에만 랭킹 및 수급 데이터 업데이트 ---
        if (status.isKoreaMarket || isForce) {
            // 네이버 랭킹
            const gainer = await fetchNaverRankings('gainer');
            const loser = await fetchNaverRankings('loser');
            const volume = await fetchNaverRankings('volume');
            const value = await fetchNaverRankings('value');

            if (gainer.length > 0) {
                await Promise.all([
                    supabase.from('stock_data_cache').upsert({ id: 'ranking_gainer', data: gainer, updated_at: new Date() }),
                    supabase.from('stock_data_cache').upsert({ id: 'ranking_loser', data: loser, updated_at: new Date() }),
                    supabase.from('stock_data_cache').upsert({ id: 'ranking_volume', data: volume, updated_at: new Date() }),
                    supabase.from('stock_data_cache').upsert({ id: 'ranking_value', data: value, updated_at: new Date() })
                ]);
                console.log("✅ [Rankings] 4개 카테고리 업데이트 완료.");
            }

            // 네이버 테마
            const themes = await fetchNaverThemes();
            if (themes.length > 0) {
                await supabase.from('stock_data_cache').upsert({ 
                    id: 'toss_themes', 
                    data: themes, 
                    updated_at: new Date() 
                });
                console.log("✅ [Themes] 업데이트 완료.");
            }

            // 🚀 토스 수급 데이터 수집 (5분 주기로 제한하여 서버 부하 방지)
            const kstOffset = 9 * 60 * 60 * 1000;
            const kstDate = new Date(new Date().getTime() + kstOffset);
            const isTossTime = (kstDate.getUTCMinutes() % 5 === 0);
            
            if (isTossTime || isForce) {
                console.log(`🚀 [Toss] ${isForce ? '강제' : '5분 주기'} 수집 엔진 가동...`);
                try {
                    const investorData = await collectInvestorTrend();
                    
                    if (investorData && investorData.buy?.foreign?.list?.length > 0) {
                        // 프론트엔드 표시용 시간 추가
                        const nowKST = new Date(new Date().getTime() + (9 * 60 * 60 * 1000));
                        const dateStr = `${(nowKST.getUTCMonth() + 1).toString().padStart(2, '0')}.${nowKST.getUTCDate().toString().padStart(2, '0')}`;
                        const formattedTime = `${nowKST.getUTCHours().toString().padStart(2, '0')}:${nowKST.getUTCMinutes().toString().padStart(2, '0')}`;
                        investorData.updated_at_text = `${dateStr} ${formattedTime} 기준`;

                        await supabase.from('stock_data_cache').upsert({ 
                            id: 'toss_investor_trend_all', 
                            data: investorData, 
                            updated_at: new Date() 
                        });
                        console.log(`✅ [Toss] ${investorData.updated_at_text} 업데이트 성공.`);
                    }
                } catch (err) {
                    console.error("❌ [Toss Error]:", err.message);
                }
            } else {
                console.log("⏭️ [Toss] 5분 주기가 아닙니다. 수집을 건너뜁니다.");
            }
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.error("❌ [Global Update Error]:", error.message);
        res.status(500).json({ error: error.message });
    }
};
