const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const updateData = require('./update-data.js');

// 가짜 응답 객체
const mockRes = {
    status: (code) => ({
        json: (data) => console.log(`[Status ${code}]`, data)
    })
};

console.log("🚀 StockMate 토스 통합 데이터 강제 업데이트 실행 중...");
updateData({}, mockRes).then(() => {
    console.log("🏁 작업이 종료되었습니다.");
    process.exit(0);
}).catch(err => {
    console.error("🔥 실행 오류:", err);
    process.exit(1);
});
