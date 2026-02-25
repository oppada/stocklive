const { createClient } = require('@supabase/supabase-js');
const { fetchPublicIndicator, fetchNaverRankings, fetchNaverThemes } = require('./lib/publicApi.cjs');

// 로컬 환경과 Vercel 환경을 구분하여 서로 다른 권한(Service Key 등)을 쓸 수도 있지만, 
// 여기서는 로직으로 철저히 분리합니다.
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

module.exports = async (req, res) => {
    const isForce = req.query && (req.query.force === 'true' || req.query.force === '1');
    const isVercel = !!process.env.VERCEL;

    console.log(`⏰ [Smart Update] Mode: ${isVercel ? 'Vercel Server' : 'Local'}, Force: ${isForce}`);

    try {
        // --- 1. 네이버 데이터 (공통) ---
        // 지수 및 랭킹 업데이트는 서버/로컬 모두 수행
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

        // --- 2. 토스 데이터 (오직 로컬 또는 강제 실행 시에만) ---
        // Vercel 서버 자동 업데이트 시에는 이 블록이 아예 실행되지 않도록 물리적 차단!
        if (!isVercel || isForce) {
            console.log("🚀 [Toss] 수집 권한 승인. 작업을 시작합니다.");
            try {
                const collectInvestorTrend = require('./toss_investor_trend.js');
                const investorData = await collectInvestorTrend(); 
                
                if (investorData && investorData.buy?.foreign?.list?.length > 50) {
                    await supabase.from('stock_data_cache').upsert({ 
                        id: 'toss_investor_trend_all', 
                        data: investorData, 
                        updated_at: new Date() 
                    });
                    console.log("✅ [Toss] 업데이트 완료.");
                }
            } catch (err) {
                console.error("❌ [Toss] 로컬 엔진 에러:", err.message);
            }
        } else {
            console.log("⏭️ [Toss] 서버 환경입니다. 수집을 건너뜁니다 (기존 데이터 보존).");
        }

        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
