const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// KIS API 라이브러리 (기존 라이브러리 재사용)
const { getKisToken, fetchStockPrice, chunkedFetchStockPrices } = require('./lib/kisApi.cjs');

// Supabase 설정
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function forceUpdate() {
    console.log("🚀 [StockMate] 전체 데이터 강제 업데이트를 시작합니다...");

    try {
        // 1. 파일 읽기
        const krxPath = path.join(__dirname, 'krx_stocks.json');
        const themesPath = path.join(__dirname, 'toss_stock_themes_local_v3.json');

        if (!fs.existsSync(krxPath) || !fs.existsSync(themesPath)) {
            throw new Error("필수 JSON 파일이 api 폴더에 없습니다.");
        }

        const allStocksList = JSON.parse(fs.readFileSync(krxPath, 'utf8'));
        const themesData = JSON.parse(fs.readFileSync(themesPath, 'utf8'));

        console.log(`📂 로드 완료: 전체 종목 ${allStocksList.length}개, 테마 ${themesData.length}개`);

        // 2. KIS 토큰 발급
        const token = await getKisToken();
        console.log("🔑 KIS API 토큰 발급 성공.");

        // 3. 종목 코드 추출 (중복 제거)
        const allCodes = Array.from(new Set(allStocksList.map(s => s.code)));
        const stockCodeToNameMap = new Map();
        allStocksList.forEach(s => stockCodeToNameMap.set(s.code, s.name));
        themesData.forEach(t => t.stocks.forEach(s => stockCodeToNameMap.set(s.code, s.name)));

        console.log(`🔍 총 ${allCodes.length}개 종목의 실시간 가격 조회를 시작합니다 (청크 단위 처리)...`);

        // 4. 실시간 가격 조회 (KIS API 호출 제한 준수: 10개씩 0.5초 간격)
        // 전체 종목이 많으므로 시간이 걸립니다.
        const priceResults = await chunkedFetchStockPrices(token, allCodes, stockCodeToNameMap, 10, 500);
        console.log(`✅ 가격 조회 완료: ${priceResults.length}개 종목 데이터 수집됨`);

        const priceMap = new Map();
        priceResults.forEach(p => priceMap.set(p.code, p));

        // 5. 테마별 평균 등락률 계산
        console.log("📊 테마별 순위 계산 중...");
        const themeRankings = themesData.map(theme => {
            const stocksWithPrices = theme.stocks.map(s => {
                const p = priceMap.get(s.code);
                return p ? { ...s, ...p } : null;
            }).filter(Boolean);

            if (stocksWithPrices.length === 0) return null;

            const avgChangeRate = stocksWithPrices.reduce((sum, s) => sum + (s.changeRate || 0), 0) / stocksWithPrices.length;
            
            return {
                name: theme.theme_name,
                avgChangeRate,
                stocks: stocksWithPrices.sort((a, b) => b.changeRate - a.changeRate)
            };
        }).filter(Boolean).sort((a, b) => b.avgChangeRate - a.avgChangeRate);

        // 6. Supabase 업로드
        console.log("📤 Supabase 데이터베이스 업로드 중...");

        // (1) 전체 종목 데이터 캐시 (all_stocks)
        const { error: err1 } = await supabase
            .from('stock_data_cache')
            .upsert({ id: 'all_stocks', data: priceResults, updated_at: new Date() });

        if (err1) throw err1;
        console.log("✨ 'all_stocks' 업데이트 완료.");

        // (2) 테마 랭킹 데이터 캐시 (theme_ranking_results)
        const { error: err2 } = await supabase
            .from('stock_data_cache')
            .upsert({ id: 'theme_ranking_results', data: themeRankings, updated_at: new Date() });

        if (err2) throw err2;
        console.log("✨ 'theme_ranking_results' 업데이트 완료.");

        console.log("🎉 모든 업데이트 작업이 성공적으로 완료되었습니다!");

    } catch (error) {
        console.error("❌ 업데이트 중 오류 발생:", error);
    } finally {
        process.exit();
    }
}

forceUpdate();