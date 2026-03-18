import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkJSON() {
  const { data, error } = await supabase
    .from('properties')
    .select('id, address')
    .in('id', [36122, 37031]);

  if (error) {
    console.error(error);
  } else {
    data.forEach(p => {
      console.log(`ID ${p.id}: ${JSON.stringify(p.address)}`);
    });
  }
}

checkJSON();
