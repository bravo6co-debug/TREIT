const { createClient } = require('@supabase/supabase-js');

// Supabase 설정 (환경변수에서 가져오기)
const supabaseUrl = 'https://qbdctgumggdtfewttela.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZGN0Z3VtZ2dkdGZld3R0ZWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NjIxMDEsImV4cCI6MjA3MjAzODEwMX0.WzbMhCyFDmibNhHjNBfpK70V8a1pF-ordZBLo63XKwE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser() {
  console.log('Checking for user: gamzon@kakao.com\n');
  
  try {
    // Check in auth.users (through auth API)
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.log('Note: Cannot check auth.users table (requires service role key)');
    }
    
    // Check in users table
    console.log('Checking users table...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'gamzon@kakao.com')
      .single();
    
    if (userError) {
      if (userError.code === 'PGRST116') {
        console.log('❌ User NOT found in users table');
        
        // Let's check all users to see what emails exist
        console.log('\n📋 Listing all users in the database:');
        const { data: allUsers, error: allError } = await supabase
          .from('users')
          .select('id, email, username, level, grade, created_at')
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (allUsers && allUsers.length > 0) {
          console.log('\nRecent users:');
          allUsers.forEach(user => {
            console.log(`- ${user.email} (Level ${user.level} ${user.grade}) - Created: ${new Date(user.created_at).toLocaleString()}`);
          });
        } else {
          console.log('No users found in the database');
        }
      } else {
        console.error('Error querying users table:', userError);
      }
    } else if (userData) {
      console.log('✅ User FOUND in users table!');
      console.log('\nUser Details:');
      console.log('- ID:', userData.id);
      console.log('- Email:', userData.email);
      console.log('- Username:', userData.username);
      console.log('- Full Name:', userData.full_name);
      console.log('- Level:', userData.level);
      console.log('- Grade:', userData.grade);
      console.log('- XP:', userData.xp);
      console.log('- Balance:', userData.balance);
      console.log('- Total Earnings:', userData.total_earnings);
      console.log('- Status:', userData.status);
      console.log('- Created:', new Date(userData.created_at).toLocaleString());
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

checkUser();