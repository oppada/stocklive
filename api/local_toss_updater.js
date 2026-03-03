const path = require('path');
const fs = require('fs');
// Load .env from the same folder
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { createClient } = require('@supabase/supabase-js');
const collectInvestorTrend = require('./toss_investor_trend.js');

// Initialize Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const DELAY_MINUTES = 10;

/**
 * Local Automation: Toss Investor Trend Only
 * Runs every 10 minutes to update the 'toss_investor_trend_all' cache in Supabase.
 * This script is intended to run locally since Vercel has Puppeteer/Selenium constraints.
 */
async function updateTossOnly() {
    const now = new Date();
    const timestamp = now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    console.log(`
[${timestamp}] 🚀 Toss 투자자 동향 수집 및 DB 업데이트 시작...`);

    try {
        // 1. Toss 데이터 수집 (Puppeteer)
        const investorData = await collectInvestorTrend();

        if (investorData && investorData.buy?.foreign?.list?.length > 0) {
            // 개별 섹션의 시간이 수집되었으므로, 대표 업데이트 텍스트를 수집된 값 중 하나로 설정
            investorData.updated_at_text = investorData.buy.foreign.time || investorData.buy.institution.time || "";

            // 2. Supabase DB 업데이트
            const { error } = await supabase.from('stock_data_cache').upsert({ 
                id: 'toss_investor_trend_all', 
                data: investorData, 
                updated_at: new Date() 
            });

            if (error) throw error;

            console.log(`✅ [성공] Toss 데이터가 성공적으로 Supabase에 업데이트되었습니다.`);
        } else {
            console.warn(`⚠️ [경고] 수집된 데이터가 없거나 비어 있습니다.`);
        }
    } catch (err) {
        console.error(`❌ [오류] 업데이트 실패:`, err.message);
    }

    console.log(`⏳ ${DELAY_MINUTES}분 후 다음 업데이트가 진행됩니다... (종료: Ctrl+C)`);
}

// 초기 실행 및 타이머 설정
console.log("==========================================");
console.log("   StockMate Toss Investor Data Automator   ");
console.log("==========================================");
console.log(`- 실행 주기: ${DELAY_MINUTES}분`);
console.log(`- 대상 데이터: toss_investor_trend_all`);
console.log("- 대상 DB: Supabase (stock_data_cache table)");
console.log("==========================================");

// 1. 첫 실행
updateTossOnly();

// 2. 10분마다 반복 실행
setInterval(updateTossOnly, DELAY_MINUTES * 60 * 1000);
