const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function clearCache() {
    console.log("🧹 Supabase 주식 데이터 캐시 전체 삭제 중...");
    try {
        const { error } = await supabase
            .from('stock_data_cache')
            .delete()
            .neq('id', 'keep_this_if_needed'); // 전체 삭제를 위한 트릭

        if (error) throw error;
        console.log("✅ 모든 캐시 데이터가 삭제되었습니다.");
    } catch (e) {
        console.error("❌ 삭제 실패:", e.message);
    }
}

clearCache();
