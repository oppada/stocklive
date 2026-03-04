require('dotenv').config();
const updateData = require('./update-data.js');

async function runLocalUpdate() {
    console.log("🚀 [Naver/Toss Update] 로컬 강제 업데이트 시작...");
    
    // Vercel 핸들러 형식을 모방하여 가상의 req, res 객체 전달
    const req = { query: { force: 'true' } };
    const res = {
        status: function(code) {
            console.log(`📡 Status: ${code}`);
            return this;
        },
        json: function(data) {
            console.log("✅ Update Result:", JSON.stringify(data, null, 2));
            return this;
        }
    };

    try {
        await updateData(req, res);
    } catch (err) {
        console.error("❌ Error running update:", err);
    }
}

runLocalUpdate();
