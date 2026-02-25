const { createClient } = require('@supabase/supabase-js');
const { fetchPublicIndicator, fetchNaverRankings, fetchNaverThemes } = require('./lib/publicApi.cjs');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

module.exports = async (req, res) => {
    const now = new Date();
    const kstDate = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const hour = kstDate.getUTCHours();
    const day = kstDate.getUTCDay();
    
    const isWeekend = (day === 0 || day === 6);
    const isKRMarketTime = !isWeekend && (hour >= 9 && hour < 16);
    const isUSMarketTime = !isWeekend && (hour >= 22 || hour < 6);

    console.log(`⏰ [Vercel Cron] 네이버 데이터 1분 주기 업데이트 시작...`);

    try {
        // 1. 네이버 지수 (24시간 가동)
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

        // 2. 네이버 랭킹 및 테마 (한국 장 시간에만)
        if (isKRMarketTime) {
            const rankings = {
                gainer: await fetchNaverRankings('gainer'),
                loser: await fetchNaverRankings('loser'),
                volume: await fetchNaverRankings('volume'),
                value: await fetchNaverRankings('value')
            };
            for (const [type, data] of Object.entries(rankings)) {
                if (data?.length > 5) await supabase.from('stock_data_cache').upsert({ id: `ranking_${type}`, data: data, updated_at: new Date() });
            }
            const naverThemes = await fetchNaverThemes();
            if (naverThemes?.length > 5) {
                await supabase.from('stock_data_cache').upsert({ id: 'toss_themes', data: naverThemes, updated_at: new Date() });
            }
        }

        res.status(200).json({ success: true, target: "Naver" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
