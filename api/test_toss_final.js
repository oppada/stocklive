const axios = require('axios');

async function testTossRealAPI() {
    console.log("🔍 [Toss Real API Test] 실시간 수급 데이터 수집 시도...");
    
    // 토스증권의 실제 데이터 소스 후보군
    const urls = [
        'https://wapi.tossinvest.com/v1/charts/investor-trend/domestic',
        'https://api.tossinvest.com/v1/charts/investor-trend/domestic'
    ];

    for (const url of urls) {
        try {
            console.log(`📡 요청 중: ${url}`);
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
                    'Origin': 'https://tossinvest.com',
                    'Referer': 'https://tossinvest.com/'
                },
                timeout: 5000
            });

            if (response.data && (response.data.buy || response.data.retail)) {
                console.log("✅ [성공] 데이터를 가져왔습니다!");
                console.log("- 기준 시간:", response.data.baseTimeText || "확인 불가");
                const firstStock = (response.data.buy?.foreign?.[0] || response.data.buy?.retail?.[0]);
                console.log("- 첫 번째 종목:", firstStock?.stockName || "없음");
                return;
            }
        } catch (e) {
            console.log(`❌ 실패 (${url}):`, e.message);
        }
    }
    console.log("❗ 모든 API 경로가 차단되었거나 유효하지 않습니다.");
}

testTossRealAPI();
