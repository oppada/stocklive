const { fetchNaverRankings, fetchNaverThemes } = require('./lib/publicApi.cjs');
require('dotenv').config();

async function testRankings() {
    console.log("🔍 [Ranking Test] 데이터 수집 테스트 시작...");
    try {
        const gainers = await fetchNaverRankings('gainer');
        console.log("📊 급상승 종목 1위:");
        console.log(`- 종목명: ${gainers[0]?.name}`);
        console.log(`- 현재가: ${gainers[0]?.price}`);
        console.log(`- 전일비: ${gainers[0]?.change}`);
        console.log(`- 등락률: ${gainers[0]?.changeRate}%`);

        if (!gainers[0]?.change || gainers[0]?.change === 0) {
            console.log("⚠️ 전일비 데이터가 0입니다. 파싱 로직 확인이 필요합니다.");
        } else {
            console.log("✅ 전일비 데이터 수집 성공!");
        }
    } catch (err) {
        console.error("❌ 에러:", err.message);
    }
}

testRankings();
