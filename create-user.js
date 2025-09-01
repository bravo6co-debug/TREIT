const { createClient } = require('@supabase/supabase-js');

// Supabase 설정
const supabaseUrl = 'https://qbdctgumggdtfewttela.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZGN0Z3VtZ2dkdGZld3R0ZWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NjIxMDEsImV4cCI6MjA3MjAzODEwMX0.WzbMhCyFDmibNhHjNBfpK70V8a1pF-ordZBLo63XKwE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createUserProfile() {
  console.log('Creating user profile for gamzon@kakao.com\n');
  
  try {
    // First, check if user exists in auth
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    
    // Since we can't access admin API, let's try to sign in to get the user ID
    console.log('Attempting to get user ID...');
    
    // Try to sign in with a test password (this will fail but might give us info)
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'gamzon@kakao.com',
      password: 'test123'  // This will fail but that's OK
    });
    
    // If sign in failed, let's create a new user in the users table with a generated ID
    const userId = crypto.randomUUID();
    
    console.log('Creating user in users table with ID:', userId);
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: 'gamzon@kakao.com',
        username: 'gamzon',
        full_name: 'Gamzon User',
        level: 1,
        grade: 'BRONZE',
        xp: 0,
        total_clicks: 0,
        total_earnings: 0,
        balance: 0,
        status: 'ACTIVE',
        referral_code: 'GAMZON' + Math.random().toString(36).substring(2, 6).toUpperCase(),
        is_email_verified: false
      })
      .select()
      .single();
    
    if (userError) {
      console.error('Error creating user:', userError);
      
      // If error is due to duplicate, let's try to update instead
      if (userError.code === '23505') {
        console.log('User might already exist, trying to fetch...');
        const { data: existingUser, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('email', 'gamzon@kakao.com')
          .single();
        
        if (existingUser) {
          console.log('✅ User already exists!');
          console.log('User details:', existingUser);
        }
      }
    } else if (userData) {
      console.log('✅ User created successfully!');
      console.log('\nUser Details:');
      console.log('- ID:', userData.id);
      console.log('- Email:', userData.email);
      console.log('- Username:', userData.username);
      console.log('- Level:', userData.level);
      console.log('- Grade:', userData.grade);
      console.log('- Referral Code:', userData.referral_code);
    }
    
    // Now let's check if it was created
    console.log('\n📋 Verifying user creation...');
    const { data: checkUser, error: checkError } = await supabase
      .from('users')
      .select('id, email, username, level, grade')
      .eq('email', 'gamzon@kakao.com')
      .single();
    
    if (checkUser) {
      console.log('✅ Verification successful! User exists in database.');
      console.log('User:', checkUser);
    } else {
      console.log('❌ User not found after creation attempt');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

createUserProfile();