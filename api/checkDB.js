const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkDB() {
    console.log("🔍 [최종 상태 점검] StockMate DB 상태...");
    const ids = ['market_indicators', 'ranking_gainer', 'toss_themes', 'toss_investor_trend_all'];

    for (const id of ids) {
        const { data, error } = await supabase.from('stock_data_cache').select('updated_at, data').eq('id', id).single();
        if (error) {
            console.log(`❌ [${id}]: 데이터 없음`);
        } else {
            // 개수 파악
            let count = 0;
            if (id === 'toss_investor_trend_all') {
                count = data.data?.buy?.foreign?.list?.length || 0;
            } else if (Array.isArray(data.data)) {
                count = data.data.length;
            } else {
                count = Object.keys(data.data || {}).length;
            }
            console.log(`✅ [${id}]: 정상 (업데이트: ${new Date(data.updated_at).toLocaleString()}, 데이터 개수: ${count})`);
        }
    }
}
checkDB();
