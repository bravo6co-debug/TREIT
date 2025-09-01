const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = promisify(exec);

// Database connection details
const supabaseUrl = 'https://fmcepybqdzuzqyvrmdel.supabase.co';
const projectRef = 'fmcepybqdzuzqyvrmdel';

async function executeWithSupabaseCli(sqlFile, description) {
  try {
    console.log(`🔧 Executing ${description} using Supabase CLI...`);
    
    // Use the Supabase CLI to execute SQL with connection string
    const supabasePath = path.join(__dirname, 'node_modules', 'supabase', 'bin', 'supabase.exe');
    const { stdout, stderr } = await execAsync(
      `"${supabasePath}" db remote exec --file "${sqlFile}" --db-url "postgresql://postgres.${projectRef}:${process.env.SUPABASE_SERVICE_ROLE_KEY}@aws-0-us-east-1.pooler.supabase.com:6543/postgres"`,
      { cwd: __dirname }
    );
    
    if (stdout) {
      console.log('✅ Output:', stdout);
    }
    
    if (stderr && !stderr.includes('new version')) { // Ignore version warnings
      console.log('⚠️  Warnings:', stderr);
    }
    
    console.log(`✅ Successfully executed ${description}`);
    return true;
  } catch (error) {
    console.error(`❌ Error executing ${description}:`, error.message);
    if (error.stdout) console.log('stdout:', error.stdout);
    if (error.stderr) console.log('stderr:', error.stderr);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Supabase SQL deployment...\n');
  
  // Load environment variables from .env.local
  require('dotenv').config({ path: '.env.local' });
  
  // Check if service role key is available
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    console.log('Please set the environment variable with your service role key');
    process.exit(1);
  }
  
  // First execute the drop statements
  console.log('1️⃣ Dropping existing triggers and functions...');
  const dropSuccess = await executeWithSupabaseCli(
    'temp-drop.sql',
    'drop statements'
  );
  
  if (!dropSuccess) {
    console.log('⚠️  Drop statements failed, but continuing with deployment...');
  }
  
  // Then execute the main SQL file
  console.log('\n2️⃣ Deploying updated auth triggers...');
  const deploySuccess = await executeWithSupabaseCli(
    'supabase-deploy/07-auth-triggers.sql',
    'auth triggers and functions'
  );
  
  if (deploySuccess) {
    console.log('\n🎉 Deployment completed successfully!');
    console.log('✅ Auth triggers and functions have been updated');
    
    // Clean up temporary file
    try {
      fs.unlinkSync('temp-drop.sql');
      console.log('🧹 Cleaned up temporary files');
    } catch (error) {
      // Ignore cleanup errors
    }
  } else {
    console.log('\n❌ Deployment failed!');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Deployment script error:', error);
  process.exit(1);
});