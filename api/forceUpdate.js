const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
// .env 파일 절대 경로 설정
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// KIS API 라이브러리 (기존 라이브러리 유지하되 랭킹은 공공/네이버 사용)
const { getKisToken, fetchStockPrice, chunkedFetchStockPrices } = require('./lib/kisApi.cjs');
const { fetchPublicIndicator, fetchNaverRankings } = require('./lib/publicApi.cjs');

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

        // 1. KIS 토큰 (개별 종목 조회를 위해 유지)
        const token = await getKisToken();

        // 2. 시장 지수 수집 (Yahoo/Naver 하이브리드)
        console.log("📈 시장 지표 수집 중...");
        const indicators = {
            '코스피': await fetchPublicIndicator('코스피', '^KS11'),
            '코스닥': await fetchPublicIndicator('코스닥', '^KQ11'),
            '나스닥': await fetchPublicIndicator('나스닥', '^IXIC'),
            'S&P500': await fetchPublicIndicator('S&P500', '^GSPC'),
            '반도체': await fetchPublicIndicator('반도체', '^SOX'),
            '달러환율': await fetchPublicIndicator('달러환율', 'USDKRW=X')
        };

        // 3. 종목 코드 추출 및 가격 수집 (KIS API - 전 종목 데이터용)
        const allCodes = Array.from(new Set(allStocksList.map(s => s.code)));
        const stockCodeToNameMap = new Map();
        allStocksList.forEach(s => stockCodeToNameMap.set(s.code, s.name));
        
        console.log(`🔍 총 ${allCodes.length}개 종목 가격 조회 (청크 처리)...`);
        const priceResults = await chunkedFetchStockPrices(token, allCodes, stockCodeToNameMap, 10, 500);

        // 4. 시장 랭킹 수집 (네이버 금융 크롤링 엔진 적용)
        console.log("📊 시장 랭킹 및 테마 수집 중...");
        const { fetchNaverRankingsByScraping, fetchNaverThemes } = require('./lib/publicApi.cjs');

        const rankings = {
            gainer: await fetchNaverRankingsByScraping('gainer'),
            loser: await fetchNaverRankingsByScraping('loser'),
            volume: await fetchNaverRankingsByScraping('volume'),
            value: await fetchNaverRankingsByScraping('value')
        };

        const themeRankings = await fetchNaverThemes();

        // 5. Supabase 업로드
        console.log("📤 Supabase 데이터베이스 업로드 중...");

        await supabase.from('stock_data_cache').upsert({ id: 'market_indicators', data: indicators, updated_at: new Date() });
        await supabase.from('stock_data_cache').upsert({ id: 'all_stocks', data: priceResults, updated_at: new Date() });
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