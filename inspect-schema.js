const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://qbdctgumggdtfewttela.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZGN0Z3VtZ2dkdGZld3R0ZWxhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQ2MjEwMSwiZXhwIjoyMDcyMDM4MTAxfQ.QFDGPTVs0sbX_j-BbA-0bsFigw6pKF4TBLBXpprMadQ'
);

async function inspectSchema() {
  try {
    console.log('🔍 Inspecting users table schema in detail...\n');
    
    // First, let's see if there's a 'balance' column that shouldn't exist
    console.log('1️⃣ Checking all columns...');
    const { data: columns, error: colError } = await supabase.rpc('exec', { 
      sql: `
        SELECT 
          column_name, 
          data_type, 
          column_default,
          is_nullable,
          is_generated,
          generation_expression
        FROM information_schema.columns 
        WHERE table_name = 'users' 
          AND table_schema = 'public'
        ORDER BY ordinal_position;
      `
    });
    
    if (columns && columns.length > 0) {
      console.log('Found columns:');
      columns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
        if (col.column_default) console.log(`    Default: ${col.column_default}`);
        if (col.generation_expression) console.log(`    Generated: ${col.generation_expression}`);
      });
      
      // Check if balance column exists
      const balanceCol = columns.find(col => col.column_name === 'balance');
      if (balanceCol) {
        console.log('\n⚠️  Found "balance" column - this might be the issue!');
        console.log('Details:', balanceCol);
      } else {
        console.log('\n✅ No "balance" column found');
      }
    } else {
      console.log('❌ Could not fetch columns:', colError);
    }
    
    // Check constraints that might reference balance
    console.log('\n2️⃣ Checking constraints...');
    const { data: constraints, error: constError } = await supabase.rpc('exec', { 
      sql: `
        SELECT 
          tc.constraint_name,
          tc.constraint_type,
          cc.check_clause,
          kcu.column_name
        FROM information_schema.table_constraints tc
        LEFT JOIN information_schema.check_constraints cc 
          ON tc.constraint_name = cc.constraint_name
        LEFT JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'users' 
          AND tc.table_schema = 'public';
      `
    });
    
    if (constraints && constraints.length > 0) {
      console.log('Found constraints:');
      constraints.forEach(constraint => {
        console.log(`  - ${constraint.constraint_name} (${constraint.constraint_type})`);
        if (constraint.check_clause) console.log(`    Check: ${constraint.check_clause}`);
        if (constraint.column_name) console.log(`    Column: ${constraint.column_name}`);
      });
      
      // Look for constraints referencing balance
      const balanceConstraints = constraints.filter(c => 
        (c.check_clause && c.check_clause.includes('balance')) ||
        (c.column_name && c.column_name.includes('balance'))
      );
      
      if (balanceConstraints.length > 0) {
        console.log('\n⚠️  Found constraints referencing balance:', balanceConstraints);
      }
    } else {
      console.log('No constraints found or error:', constError);
    }
    
    // Check indexes
    console.log('\n3️⃣ Checking indexes...');
    const { data: indexes, error: idxError } = await supabase.rpc('exec', { 
      sql: `
        SELECT 
          indexname,
          indexdef
        FROM pg_indexes 
        WHERE tablename = 'users' 
          AND schemaname = 'public';
      `
    });
    
    if (indexes && indexes.length > 0) {
      console.log('Found indexes:');
      indexes.forEach(idx => {
        console.log(`  - ${idx.indexname}`);
        console.log(`    Definition: ${idx.indexdef}`);
        
        if (idx.indexdef.includes('balance')) {
          console.log('    ⚠️  This index references balance!');
        }
      });
    } else {
      console.log('No indexes found or error:', idxError);
    }
    
    // Try to see the actual table definition
    console.log('\n4️⃣ Attempting to get table definition...');
    const { data: tableDef, error: defError } = await supabase.rpc('exec', { 
      sql: `
        SELECT 
          pg_get_tabledef('public.users'::regclass) AS table_definition;
      `
    });
    
    if (tableDef && tableDef.length > 0) {
      console.log('Table definition:');
      console.log(tableDef[0].table_definition);
    } else {
      console.log('Could not get table definition:', defError);
    }
    
  } catch (error) {
    console.error('Error during inspection:', error);
  }
  
  process.exit(0);
}

inspectSchema();