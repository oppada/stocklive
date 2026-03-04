require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { 
    fetchPublicIndicator, 
    fetchNaverRankings, 
    fetchNaverThemes 
} = require('./lib/publicApi.cjs');
const collectInvestorTrend = require('./toss_investor_trend.js'); // Puppeteer 복구

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

/**
 * 현재 한국 시간(KST) 기준 시장 운영 상태 확인
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
    const isKoreaMarket = !isWeekend && (timeValue >= 850 && timeValue <= 1605);
    const isUSMarket = (timeValue >= 2230 || timeValue <= 600);

    return {
        isKoreaMarket,
        isUSMarket,
        minutes: kstDate.getUTCMinutes(),
        formattedDate: `${kstDate.getUTCFullYear()}.${(kstDate.getUTCMonth() + 1).toString().padStart(2, '0')}.${now.getUTCDate().toString().padStart(2, '0')}`
    };
}

module.exports = async (req, res) => {
    const isForce = req.query && (req.query.force === 'true' || req.query.force === '1');
    const status = getMarketStatus();

    console.log(`⏰ [Smart Update] Market Check... KR: ${status.isKoreaMarket}, Force: ${isForce}`);

    if (!status.isKoreaMarket && !status.isUSMarket && !isForce) {
        return res.status(200).json({ success: true, message: "Market closed" });
    }

    try {
        // --- 1. 네이버 지수 데이터 (1분 주기) ---
        const indicators = await Promise.all([
            fetchPublicIndicator('코스피', '^KS11'),
            fetchPublicIndicator('코스닥', '^KQ11'),
            fetchPublicIndicator('다우산업', 'DJI@DJI'),
            fetchPublicIndicator('나스닥', '^IXIC'),
            fetchPublicIndicator('S&P500', '^GSPC')
        ]);
        
        const indicatorData = {
            '코스피': indicators[0], '코스닥': indicators[1],
            '다우산업': indicators[2], '나스닥': indicators[3], 'S&P500': indicators[4]
        };
        await supabase.from('stock_data_cache').upsert({ id: 'market_indicators', data: indicatorData, updated_at: new Date() });

        // --- 2. 한국 장 데이터 업데이트 ---
        if (status.isKoreaMarket || isForce) {
            // 랭킹 & 테마 (네이버 기반 - 매분)
            const [gainer, loser, volume, value, themes] = await Promise.all([
                fetchNaverRankings('gainer'), fetchNaverRankings('loser'),
                fetchNaverRankings('volume'), fetchNaverRankings('value'),
                fetchNaverThemes()
            ]);

            if (gainer.length > 0) {
                await Promise.all([
                    supabase.from('stock_data_cache').upsert({ id: 'ranking_gainer', data: gainer, updated_at: new Date() }),
                    supabase.from('stock_data_cache').upsert({ id: 'ranking_loser', data: loser, updated_at: new Date() }),
                    supabase.from('stock_data_cache').upsert({ id: 'ranking_volume', data: volume, updated_at: new Date() }),
                    supabase.from('stock_data_cache').upsert({ id: 'ranking_value', data: value, updated_at: new Date() }),
                    supabase.from('stock_data_cache').upsert({ id: 'toss_themes', data: themes, updated_at: new Date() })
                ]);
            }

            // 🚀 토스 수급 데이터 (Puppeteer 기반 - 10분 주기)
            const isTossTime = (status.minutes % 10 === 0);
            if (isTossTime || isForce) {
                console.log("🚀 [Toss] 수집 엔진 가동 (개인/외인/기관)...");
                const investorData = await collectInvestorTrend();
                
                if (investorData && investorData.buy?.foreign?.list?.length > 0) {
                    // 날짜 표시 일원화
                    investorData.updated_at_text = status.formattedDate;

                    await supabase.from('stock_data_cache').upsert({ 
                        id: 'toss_investor_trend_all', 
                        data: investorData, 
                        updated_at: new Date() 
                    });
                    console.log(`✅ [Toss Update Success] ${status.formattedDate}`);
                }
            }
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.error("❌ [Update Error]:", error.message);
        res.status(500).json({ error: error.message });
    }
};
