const { createClient } = require('@supabase/supabase-js');
const { 
    fetchPublicIndicator, 
    fetchNaverRankings, 
    fetchNaverThemes, 
    fetchInvestorTrends 
} = require('./lib/publicApi.cjs');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

/**
 * 현재 시간이 시장 운영 시간인지 확인 (KST 기준)
 */
function getMarketStatus() {
    const now = new Date();
    // UTC -> KST (9시간 차이)
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstDate = new Date(now.getTime() + kstOffset);
    
    const day = kstDate.getUTCDay(); // 0: 일, 1: 월, ..., 6: 토
    const hours = kstDate.getUTCHours();
    const minutes = kstDate.getUTCMinutes();
    const timeValue = hours * 100 + minutes;

    const isWeekend = (day === 0 || day === 6);
    
    // 한국 장: 평일 08:50 ~ 16:00 (여유 시간 포함)
    const isKoreaMarket = !isWeekend && (timeValue >= 850 && timeValue <= 1600);
    
    // 미국 장: 평일 22:30 ~ 익일 06:00
    const isUSMarket = (timeValue >= 2230 || timeValue <= 600);

    return {
        isKoreaMarket,
        isUSMarket,
        isWeekend,
        currentTime: timeValue,
        day
    };
}

module.exports = async (req, res) => {
    const isForce = req.query && (req.query.force === 'true' || req.query.force === '1');
    const status = getMarketStatus();

    console.log(`⏰ [Smart Update] KST Time: ${status.currentTime}, KR Market: ${status.isKoreaMarket}, US Market: ${status.isUSMarket}`);

    // 장 운영 시간이 아니고 강제 실행도 아니면 종료
    if (!status.isKoreaMarket && !status.isUSMarket && !isForce) {
        console.log("😴 [Market Closed] 수집을 건너뜁니다.");
        return res.status(200).json({ success: true, message: "Market closed" });
    }

    try {
        // --- 1. 지수 데이터 (미국 장 또는 한국 장 공통) ---
        const indicators = {
            '코스피': await fetchPublicIndicator('코스피', '^KS11'),
            '코스닥': await fetchPublicIndicator('코스닥', '^KQ11'),
            '다우산업': await fetchPublicIndicator('다우산업', 'DJI@DJI'),
            '나스닥': await fetchPublicIndicator('나스닥', '^IXIC'),
            'S&P500': await fetchPublicIndicator('S&P500', '^GSPC')
        };
        
        if (indicators['나스닥']?.price > 0 || indicators['코스피']?.price > 0) {
            await supabase.from('stock_data_cache').upsert({ 
                id: 'market_indicators', 
                data: indicators, 
                updated_at: new Date() 
            });
            console.log("✅ [Indicators] 업데이트 완료.");
        }

        // --- 2. 한국 장 운영 시에만 랭킹 및 수급 데이터 업데이트 ---
        if (status.isKoreaMarket || isForce) {
            // 랭킹
            const rankings = {
                gainer: await fetchNaverRankings('gainer'),
                loser: await fetchNaverRankings('loser'),
                volume: await fetchNaverRankings('volume'),
                value: await fetchNaverRankings('value')
            };
            await supabase.from('stock_data_cache').upsert({ 
                id: 'naver_rankings', 
                data: rankings, 
                updated_at: new Date() 
            });

            // 테마
            const themes = await fetchNaverThemes();
            await supabase.from('stock_data_cache').upsert({ 
                id: 'naver_themes', 
                data: themes, 
                updated_at: new Date() 
            });

            // 투자자 수급 (외인, 기관, 개인)
            // 네이버는 공식 '개인 순매수 리스트'를 제공하지 않으므로, 
            // 거래량 상위 종목 중 투자자 매매동향을 합산하여 개인 수급을 추정하거나 
            // 랭킹 종목들의 상세 수급을 긁어옵니다. (여기서는 외인/기관 중심으로 우선 복구)
            const investorData = {
                buy: {
                    foreign: { list: await fetchInvestorTrends('buy', 'foreign') },
                    institution: { list: await fetchInvestorTrends('buy', 'institution') },
                    individual: { list: [] } // 개인은 향후 네이버 모바일 API 분석 후 추가 시도
                },
                sell: {
                    foreign: { list: await fetchInvestorTrends('sell', 'foreign') },
                    institution: { list: await fetchInvestorTrends('sell', 'institution') },
                    individual: { list: [] }
                }
            };

            // 만약 개인 데이터가 꼭 필요하다면, 기존에 사용자님이 로컬에서 긁은 
            // toss_investor_data.json의 형식을 보존하며 외인/기관만 실시간으로 덮어씁니다.
            if (investorData.buy.foreign.list.length > 0) {
                await supabase.from('stock_data_cache').upsert({ 
                    id: 'toss_investor_trend_all', 
                    data: investorData, 
                    updated_at: new Date() 
                });
                console.log("✅ [InvestorTrends] 업데이트 완료.");
            }
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.error("❌ [Update Error]:", error.message);
        res.status(500).json({ error: error.message });
    }
};
