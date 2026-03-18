import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateAndVerify() {
  const targetId = 36122;
  const compareId = 37031;
  const newAddress = '인천광역시 미추홀구 학익동 용현·학익 1블록 공동5BL';

  console.log(`Updating address for ID ${targetId}...`);
  const { error: updateError } = await supabase
    .from('properties')
    .update({ address: newAddress })
    .eq('id', targetId);

  if (updateError) {
    console.error(`Error updating ID ${targetId}:`, updateError);
    return;
  }
  console.log(`Successfully updated ID ${targetId}.`);

  console.log(`Fetching property IDs ${targetId} and ${compareId} for verification...`);
  const { data, error: fetchError } = await supabase
    .from('properties')
    .select('id, address')
    .in('id', [targetId, compareId]);

  if (fetchError) {
    console.error('Error fetching properties:', fetchError);
    return;
  }

  const property36122 = data.find(p => p.id === targetId);
  const property37031 = data.find(p => p.id === compareId);

  if (property36122) {
    console.log(`Address of ${targetId}: ${property36122.address}`);
  } else {
    console.error(`Property ${targetId} not found in the refetched data.`);
  }

  if (property37031) {
    console.log(`Address of ${compareId}: ${property37031.address}`);
  } else {
    console.error(`Property ${compareId} not found in the refetched data.`);
  }

  if (property36122 && property37031) {
    if (property36122.address === property37031.address) {
      console.log('Verification SUCCESS: Both properties have the same address.');
    } else {
      console.log('Verification FAILURE: The addresses do not match.');
    }
  }
}

updateAndVerify();
