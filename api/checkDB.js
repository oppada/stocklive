const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkData() {
    console.log("🔍 Supabase 데이터 점검 시작...");
    
    const { data: indicators, error: err } = await supabase
        .from('stock_data_cache')
        .select('id, updated_at')
        .eq('id', 'market_indicators')
        .single();

    if (err) {
        console.error("❌ market_indicators 항목을 찾을 수 없습니다. (먼저 forceUpdate.js를 완료해야 합니다.)", err.message);
    } else {
        console.log("✅ market_indicators 발견! 마지막 업데이트:", indicators.updated_at);
    }

    const { data: allStocks } = await supabase
        .from('stock_data_cache')
        .select('id, updated_at')
        .eq('id', 'all_stocks')
        .single();

    if (allStocks) {
        console.log("✅ all_stocks 발견! 마지막 업데이트:", allStocks.updated_at);
    }

    process.exit();
}

checkData();