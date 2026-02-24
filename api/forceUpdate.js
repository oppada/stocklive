const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
// .env 파일 절대 경로 설정
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// KIS API 라이브러리 제거 (네이버 금융 사용)
const { fetchPublicIndicator, fetchNaverRankings, fetchNaverPrices } = require('./lib/publicApi.cjs');

// Supabase 설정
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function forceUpdate() {
    console.log("🚀 [StockMate] 네이버 기반 전체 데이터 강제 업데이트 시작...");

    try {
        const krxPath = path.join(__dirname, 'krx_stocks.json');
        const themesPath = path.join(__dirname, 'toss_stock_themes_local_v3.json');

        if (!fs.existsSync(krxPath) || !fs.existsSync(themesPath)) {
            throw new Error("필수 JSON 파일이 api 폴더에 없습니다.");
        }

        const allStocksList = JSON.parse(fs.readFileSync(krxPath, 'utf8'));
        const themesData = JSON.parse(fs.readFileSync(themesPath, 'utf8'));

        // 1. 시장 지수 수집 (Yahoo/Naver 하이브리드)
        console.log("📈 시장 지표 수집 중...");
        const indicators = {
            '코스피': await fetchPublicIndicator('코스피', '^KS11'),
            '코스닥': await fetchPublicIndicator('코스닥', '^KQ11'),
            '다우산업': await fetchPublicIndicator('다우산업', 'DJI@DJI'),
            '나스닥': await fetchPublicIndicator('나스닥', '^IXIC'),
            'S&P500': await fetchPublicIndicator('S&P500', '^GSPC')
        };

        // 2. 시장 랭킹 수집 (네이버 금융 크롤링 엔진 적용)
        console.log("📊 시장 랭킹 및 테마 수집 중...");
        const { fetchNaverRankings, fetchNaverThemes } = require('./lib/publicApi.cjs');

        const rankings = {
            gainer: await fetchNaverRankings('gainer') || [],
            loser: await fetchNaverRankings('loser') || [],
            volume: await fetchNaverRankings('volume') || [],
            value: await fetchNaverRankings('value') || []
        };

        const themeRankings = await fetchNaverThemes() || [];

        // 3. Supabase 업로드
        console.log("📤 Supabase 데이터베이스 업로드 중...");

        await supabase.from('stock_data_cache').upsert({ id: 'market_indicators', data: indicators, updated_at: new Date() });
        // all_stocks는 호환성을 위해 gainer 데이터를 기본으로 넣음 (KIS 전종목 조사는 중단)
        if (rankings.gainer && rankings.gainer.length > 0) {
            await supabase.from('stock_data_cache').upsert({ id: 'all_stocks', data: rankings.gainer, updated_at: new Date() });
        }
        await supabase.from('stock_data_cache').upsert({ id: 'theme_ranking_results', data: themeRankings, updated_at: new Date() });
        
        for (const [type, data] of Object.entries(rankings)) {
            if (data && data.length > 0) {
                await supabase.from('stock_data_cache').upsert({ id: `ranking_${type}`, data: data, updated_at: new Date() });
            }
        }

        console.log("🎉 테마 포함 모든 데이터 업데이트 완료!");

        console.log("🎉 전 종목 기반 자체 랭킹 생성 및 업데이트 완료!");

    } catch (error) {
        console.error("❌ 업데이트 중 오류 발생:", error);
    } finally {
        process.exit();
    }
}

forceUpdate();