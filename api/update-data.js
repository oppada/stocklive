const { createClient } = require('@supabase/supabase-js');
const { fetchPublicIndicator, fetchNaverRankings } = require('./lib/publicApi.cjs');

// Supabase 설정
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

module.exports = async (req, res) => {
    console.log("⏰ [Cron] 네이버 기반 데이터 업데이트 시작...");

    try {
        // 1. 시장 지수 수집 (네이버/ETF 하이브리드)
        console.log("📈 시장 지표 수집 중...");
        const indicators = {
            '코스피': await fetchPublicIndicator('코스피', '^KS11'),
            '코스닥': await fetchPublicIndicator('코스닥', '^KQ11'),
            '다우산업': await fetchPublicIndicator('다우산업', 'DJI@DJI'),
            '나스닥': await fetchPublicIndicator('나스닥', '^IXIC'),
            'S&P500': await fetchPublicIndicator('S&P500', '^GSPC')
        };

        // 2. 주요 랭킹 수집 (네이버 금융 Top 50)
        console.log("📊 시장 랭킹 수집 중 (RISE, FALL, VOLUME, VALUE)...");
        const rankings = {
            gainer: await fetchNaverRankings('gainer'),
            loser: await fetchNaverRankings('loser'),
            volume: await fetchNaverRankings('volume'),
            value: await fetchNaverRankings('value')
        };

        // 3. Supabase 캐시 업데이트 (랭킹 데이터를 통합 저장하거나 분리 저장)
        // 기존 랭킹 API 엔드포인트 호환성을 위해 all_stocks 아이디에 gainer 리스트를 대표로 넣거나 구조 개선
        await supabase.from('stock_data_cache').upsert({ id: 'market_indicators', data: indicators, updated_at: new Date() });
        
        // 각 타입별로 개별 캐싱 (프론트엔드에서 골라 쓰기 편하게)
        for (const [type, data] of Object.entries(rankings)) {
            await supabase.from('stock_data_cache').upsert({ 
                id: `ranking_${type}`, 
                data: data, 
                updated_at: new Date() 
            });
        }

        // 기존 코드와의 호환성을 위해 'all_stocks'에도 통합 데이터 저장 (필요시)
        const allSorted = [...rankings.gainer];
        await supabase.from('stock_data_cache').upsert({ id: 'all_stocks', data: allSorted, updated_at: new Date() });

        console.log("✅ [Cron] 네이버 데이터 업데이트 완료!");
        res.status(200).json({ success: true });

    } catch (error) {
        console.error("❌ [Cron] 오류:", error.message);
        res.status(500).json({ error: error.message });
    }
};