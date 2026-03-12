const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkThemes() {
    const { data } = await supabase.from('stock_data_cache').select('data').eq('id', 'toss_themes').single();
    if (data && data.data) {
        const theme = data.data.find(t => t.name.includes('피팅') || t.name.includes('밸브'));
        console.log('Found theme:', JSON.stringify(theme, null, 2));
        
        // Also check if there's any theme with '/' in the name
        const slashThemes = data.data.filter(t => t.name.includes('/'));
        console.log('Themes with slashes:', slashThemes.map(t => t.name));
    } else {
        console.log('No theme data found');
    }
}

checkThemes();