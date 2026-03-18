import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkHex() {
  const compareId = 37031;
  const givenAddress = '인천광역시 미추홀구 학익동 용현·학익 1블록 공동5BL';

  const { data, error } = await supabase
    .from('properties')
    .select('address')
    .eq('id', compareId)
    .single();

  if (error) {
    console.error(error);
    return;
  }

  const p37031Address = data.address;

  console.log('p37031 Hex (UTF-8):', Buffer.from(p37031Address, 'utf8').toString('hex'));
  console.log('Given Hex (UTF-8): ', Buffer.from(givenAddress, 'utf8').toString('hex'));
  
  console.log('p37031 Length:', p37031Address.length);
  console.log('Given Length: ', givenAddress.length);
  
  if (p37031Address === givenAddress) {
    console.log('MATCH!');
  } else {
    console.log('NO MATCH!');
  }
}

checkHex();
