const { fetchTossInvestorTrends } = require('./lib/publicApi.cjs');

async function testToss() {
    console.log("🔍 [Toss API Test] 데이터 수집 테스트 시작...");
    try {
        const data = await fetchTossInvestorTrends();
        if (data && data.buy?.foreign?.list?.length > 0) {
            console.log("✅ 토스 API 수집 성공!");
            console.log("- 기준 시간:", data.updated_at_text);
            console.log("- 외국인 1위:", data.buy.foreign.list[0].name);
            console.log("- 개인 1위:", data.buy.individual.list[0].name);
        } else {
            console.log("❌ 데이터를 가져오지 못했습니다. API 경로가 틀렸거나 차단되었습니다.");
        }
    } catch (err) {
        console.error("❌ 에러 발생:", err.message);
    }
}

testToss();
