const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const updateData = require('./update-data.js');

// 강제 실행 플래그(?force=true) 흉내내기
const mockReq = {
    query: { force: 'true' }
};

const mockRes = {
    status: (code) => ({
        json: (data) => console.log(`[Status ${code}]`, data)
    })
};

console.log("🚀 StockMate 전체 데이터 강제 복구 및 업데이트 시작...");
updateData(mockReq, mockRes).then(() => {
    console.log("✅ 모든 복구 작업이 종료되었습니다.");
    process.exit(0);
}).catch(err => {
    console.error("🔥 실행 오류:", err);
    process.exit(1);
});
