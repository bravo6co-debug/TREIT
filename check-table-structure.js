const { createClient } = require('@supabase/supabase-js');

// Supabase 설정
const supabaseUrl = 'https://qbdctgumggdtfewttela.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZGN0Z3VtZ2dkdGZld3R0ZWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NjIxMDEsImV4cCI6MjA3MjAzODEwMX0.WzbMhCyFDmibNhHjNBfpK70V8a1pF-ordZBLo63XKwE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableStructure() {
  console.log('Checking users table structure...\n');
  
  try {
    // Try to insert a minimal user to see what columns exist
    console.log('Testing minimal user creation...');
    
    const testData = {
      id: crypto.randomUUID(),
      email: 'test_' + Date.now() + '@test.com'
    };
    
    const { data, error } = await supabase
      .from('users')
      .insert(testData)
      .select();
    
    if (error) {
      console.log('Error details:', error);
      
      // Try to get any existing user to see the structure
      console.log('\nTrying to fetch any user to see table structure...');
      const { data: anyUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .limit(1);
      
      if (fetchError) {
        console.log('Fetch error:', fetchError);
      } else if (anyUser) {
        console.log('Sample user structure:', anyUser);
      } else {
        console.log('No users found, but query succeeded');
      }
    } else {
      console.log('Test user created:', data);
      
      // Clean up test user
      await supabase
        .from('users')
        .delete()
        .eq('id', testData.id);
    }
    
    // Try a simple insert with just required fields
    console.log('\n\nAttempting to create gamzon user with minimal fields...');
    
    const gamzonData = {
      id: crypto.randomUUID(),
      email: 'gamzon@kakao.com',
      username: 'gamzon'
    };
    
    const { data: gamzonUser, error: gamzonError } = await supabase
      .from('users')
      .insert(gamzonData)
      .select()
      .single();
    
    if (gamzonError) {
      console.log('Error creating gamzon:', gamzonError);
    } else {
      console.log('✅ Gamzon user created successfully!');
      console.log('User data:', gamzonUser);
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
  
  process.exit(0);
}

checkTableStructure();