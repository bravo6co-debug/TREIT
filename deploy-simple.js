const fs = require('fs');

// Manual SQL execution using fetch API
const SUPABASE_URL = 'https://fmcepybqdzuzqyvrmdel.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('❌ Please set SUPABASE_SERVICE_ROLE_KEY environment variable');
  console.error('You can set it by running:');
  console.error('set SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here');
  process.exit(1);
}

async function executeRawSQL(sql) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function main() {
  try {
    console.log('🚀 Starting SQL execution...\n');
    console.log(`Connecting to: ${SUPABASE_URL}`);
    console.log(`Service role key: ${SERVICE_ROLE_KEY.substring(0, 20)}...\n`);
    
    // First, execute drop statements
    console.log('1️⃣ Dropping existing triggers and functions...');
    const dropSql = `
-- Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS initialize_user_on_insert ON public.users;

-- Drop existing functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_business() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_signup() CASCADE;
DROP FUNCTION IF EXISTS public.initialize_user_level() CASCADE;
`;

    console.log('Executing drop statements...');
    const dropResult = await executeRawSQL(dropSql);
    
    if (dropResult.success) {
      console.log('✅ Drop statements executed successfully');
    } else {
      console.log(`⚠️  Drop statements failed: ${dropResult.error}`);
      console.log('Continuing with deployment...');
    }
    
    // Then read and execute the main SQL file
    console.log('\n2️⃣ Executing main SQL file...');
    const mainSql = fs.readFileSync('supabase-deploy/07-auth-triggers.sql', 'utf8');
    
    console.log('Executing auth triggers and functions...');
    const deployResult = await executeRawSQL(mainSql);
    
    if (deployResult.success) {
      console.log('✅ Auth triggers and functions deployed successfully');
      console.log('\n🎉 Deployment completed successfully!');
    } else {
      console.log(`❌ Deployment failed: ${deployResult.error}`);
      throw new Error(deployResult.error);
    }
    
  } catch (error) {
    console.error('❌ Script error:', error.message);
    process.exit(1);
  }
}

main();