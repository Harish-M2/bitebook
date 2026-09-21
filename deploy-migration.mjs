import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error('❌ ERROR: SUPABASE_SERVICE_ROLE_KEY not set');
  console.error('\nTo deploy, first get your service role key from Supabase:');
  console.error('1. Go to https://app.supabase.com');
  console.error('2. Select your project');
  console.error('3. Settings → API → Service Role Key (copy it)');
  console.error('\nThen run:');
  console.error('export SUPABASE_SERVICE_ROLE_KEY="paste-key-here"');
  console.error('node deploy-migration.mjs');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function deployMigration() {
  try {
    const sql = fs.readFileSync('supabase/migrations/0035_menu_items.sql', 'utf-8');
    
    console.log('📝 Reading migration file...');
    console.log('File size:', sql.length, 'bytes');
    
    // Execute the full SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('❌ Deployment failed:', error.message);
      process.exit(1);
    }
    
    console.log('✅ Migration deployed successfully!');
    console.log('\n📋 New tables created:');
    console.log('   ✓ menu_items');
    console.log('   ✓ menu_fetch_log');
    console.log('   ✓ menu_budget');
    console.log('\n🔧 Next steps:');
    console.log('   1. Deploy Edge Function: npm run deploy:functions');
    console.log('   2. Start dev server: npm run dev');
    console.log('   3. Test menu loading in app');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

deployMigration();
