import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const targetId = 36122;
  const compareId = 37031;
  const givenAddress = '인천광역시 미추홀구 학익동 용현·학익 1블록 공동5BL';

  const { data, error } = await supabase
    .from('properties')
    .select('id, address')
    .in('id', [targetId, compareId]);

  if (error) {
    console.error(error);
    return;
  }

  const p36122 = data.find(p => p.id === targetId);
  const p37031 = data.find(p => p.id === compareId);

  console.log(`p36122 address matches given: ${p36122.address === givenAddress}`);
  console.log(`p37031 address matches given: ${p37031.address === givenAddress}`);
  console.log(`p36122 address matches p37031: ${p36122.address === p37031.address}`);
  
  console.log(`p37031 address: [${p37031.address}]`);
  console.log(`given address:  [${givenAddress}]`);
}

check();
