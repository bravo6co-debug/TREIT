const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://qbdctgumggdtfewttela.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZGN0Z3VtZ2dkdGZld3R0ZWxhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQ2MjEwMSwiZXhwIjoyMDcyMDM4MTAxfQ.QFDGPTVs0sbX_j-BbA-0bsFigw6pKF4TBLBXpprMadQ'
);

async function diagnoseProblem() {
  console.log('🔍 Diagnosing database state...\n');
  
  try {
    // 1. Check table columns
    console.log('1️⃣ Checking users table columns...');
    const { data: columns, error: colError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'users')
      .eq('table_schema', 'public')
      .order('ordinal_position');
    
    if (columns) {
      console.log('Users table columns:');
      columns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(not null)'} ${col.column_default ? `default: ${col.column_default}` : ''}`);
      });
    } else {
      console.log('❌ Could not fetch column info:', colError);
    }
    
    // 2. Check for functions that might reference balance
    console.log('\n2️⃣ Checking for problematic functions...');
    try {
      // Disable the failing trigger temporarily
      console.log('Attempting to disable triggers...');
      
      // Direct SQL to check triggers
      const triggerQuery = `
        SELECT 
          trigger_name,
          event_manipulation,
          action_statement,
          action_timing,
          event_object_table
        FROM information_schema.triggers 
        WHERE event_object_table = 'users'
          AND trigger_schema = 'public'
        ORDER BY trigger_name;
      `;
      
      const { data: triggersResult } = await supabase.rpc('exec', { 
        sql: triggerQuery 
      });
      
      if (triggersResult) {
        console.log('Active triggers on users table:', triggersResult);
      }
      
    } catch (e) {
      console.log('Could not check triggers via RPC:', e.message);
    }
    
    // 3. Try to insert with minimal required fields only
    console.log('\n3️⃣ Testing minimal insert (bypassing triggers)...');
    
    // First, let's try to disable triggers temporarily
    try {
      await supabase.rpc('exec', { 
        sql: 'ALTER TABLE users DISABLE TRIGGER ALL;' 
      });
      console.log('✅ Triggers disabled');
      
      // Now try insert
      const testData = {
        auth_uid: '00000000-0000-0000-0000-000000000000',
        email: 'trigger-test@test.com',
        nickname: 'triggertest'
      };
      
      const { data: insertResult, error: insertError } = await supabase
        .from('users')
        .insert(testData)
        .select();
      
      if (insertError) {
        console.log('❌ Insert failed even with triggers disabled:', insertError);
      } else {
        console.log('✅ Insert succeeded with triggers disabled!');
        console.log('Result:', insertResult);
        
        // Clean up
        await supabase.from('users').delete().eq('email', 'trigger-test@test.com');
      }
      
      // Re-enable triggers
      await supabase.rpc('exec', { 
        sql: 'ALTER TABLE users ENABLE TRIGGER ALL;' 
      });
      console.log('✅ Triggers re-enabled');
      
    } catch (e) {
      console.log('❌ Error in trigger management:', e.message);
    }
    
    // 4. Check what the current schema actually deployed looks like
    console.log('\n4️⃣ Checking current schema against different versions...');
    
    // List actual tables to understand what's deployed
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');
    
    if (tables) {
      console.log('Current tables:');
      tables.forEach(table => console.log(`  - ${table.table_name}`));
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
  
  console.log('\n🏁 Diagnosis complete');
  process.exit(0);
}

diagnoseProblem();