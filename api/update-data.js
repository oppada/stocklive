const { createClient } = require('@supabase/supabase-js');
const { 
    fetchPublicIndicator, 
    fetchNaverRankings, 
    fetchNaverThemes,
    fetchInvestorTrends // 네이버 안정 경로 사용
} = require('./lib/publicApi.cjs');

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
    const isKoreaMarket = !isWeekend && (timeValue >= 850 && timeValue <= 1600);
    const isUSMarket = (timeValue >= 2230 || timeValue <= 600);

    return {
        isKoreaMarket,
        isUSMarket,
        formattedTime: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
        dateStr: `${(kstDate.getUTCMonth() + 1).toString().padStart(2, '0')}.${kstDate.getUTCDate().toString().padStart(2, '0')}`
    };
}

module.exports = async (req, res) => {
    const isForce = req.query && (req.query.force === 'true' || req.query.force === '1');
    const status = getMarketStatus();

    if (!status.isKoreaMarket && !status.isUSMarket && !isForce) {
        return res.status(200).json({ success: true, message: "Market closed" });
    }

    try {
        // --- 1. 지수 데이터 (1분 주기) ---
        const indicators = {
            '코스피': await fetchPublicIndicator('코스피', '^KS11'),
            '코스닥': await fetchPublicIndicator('코스닥', '^KQ11'),
            '다우산업': await fetchPublicIndicator('다우산업', 'DJI@DJI'),
            '나스닥': await fetchPublicIndicator('나스닥', '^IXIC'),
            'S&P500': await fetchPublicIndicator('S&P500', '^GSPC')
        };
        await supabase.from('stock_data_cache').upsert({ id: 'market_indicators', data: indicators, updated_at: new Date() });

        // --- 2. 한국 장 데이터 (1분 주기 완전 자동화) ---
        if (status.isKoreaMarket || isForce) {
            // 랭킹 & 테마
            const [gainer, loser, volume, value, themes] = await Promise.all([
                fetchNaverRankings('gainer'), fetchNaverRankings('loser'),
                fetchNaverRankings('volume'), fetchNaverRankings('value'),
                fetchNaverThemes()
            ]);

            await Promise.all([
                supabase.from('stock_data_cache').upsert({ id: 'ranking_gainer', data: gainer, updated_at: new Date() }),
                supabase.from('stock_data_cache').upsert({ id: 'ranking_loser', data: loser, updated_at: new Date() }),
                supabase.from('stock_data_cache').upsert({ id: 'ranking_volume', data: volume, updated_at: new Date() }),
                supabase.from('stock_data_cache').upsert({ id: 'ranking_value', data: value, updated_at: new Date() }),
                supabase.from('stock_data_cache').upsert({ id: 'toss_themes', data: themes, updated_at: new Date() })
            ]);

            // 수급 데이터 (네이버 기반 1분 자동화)
            const nowKST = new Date(new Date().getTime() + (9 * 60 * 60 * 1000));
            const fullDateStr = `${nowKST.getUTCFullYear()}.${(nowKST.getUTCMonth() + 1).toString().padStart(2, '0')}.${nowKST.getUTCDate().toString().padStart(2, '0')}`;
            const updatedAtText = fullDateStr; // 시간 제거, 날짜만 표시

            const investorData = {
                updated_at_text: updatedAtText,
                buy: {
                    foreign: { list: await fetchInvestorTrends('buy', 'foreign') },
                    institution: { list: await fetchInvestorTrends('buy', 'institution') },
                    individual: { list: [] } 
                },
                sell: {
                    foreign: { list: await fetchInvestorTrends('sell', 'foreign') },
                    institution: { list: await fetchInvestorTrends('sell', 'institution') },
                    individual: { list: [] }
                }
            };

            await supabase.from('stock_data_cache').upsert({ 
                id: 'toss_investor_trend_all', 
                data: investorData, 
                updated_at: new Date() 
            });
            console.log(`✅ [All Updated] ${updatedAtText}`);
        }

        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
