const { fetchPublicIndicator, fetchNaverRankings, fetchNaverThemes, fetchInvestorTrends } = require('./lib/publicApi.cjs');
require('dotenv').config();

async function test() {
    console.log("🔍 [Test] 네이버 데이터 수집 테스트 시작...");
    try {
        const indicators = {
            '코스피': await fetchPublicIndicator('코스피', '^KS11'),
            '나스닥': await fetchPublicIndicator('나스닥', '^IXIC')
        };
        console.log("✅ 지수 데이터:", indicators);

        const investorData = {
            foreign_buy: await fetchInvestorTrends('buy', 'foreign'),
            institution_buy: await fetchInvestorTrends('buy', 'institution')
        };
        console.log("✅ 외국인 순매수 상위 1위:", investorData.foreign_buy[0]?.name || '없음');
        console.log("✅ 기관 순매수 상위 1위:", investorData.institution_buy[0]?.name || '없음');

        if (investorData.foreign_buy.length === 0) {
            console.log("⚠️ 외국인 데이터를 가져오지 못했습니다. 네이버 페이지 구조를 확인해야 할 수도 있습니다.");
        }
    } catch (err) {
        console.error("❌ 테스트 에러:", err.message);
    }
}

test();
