const { createClient } = require('@supabase/supabase-js');

// Supabase 설정
const supabaseUrl = 'https://qbdctgumggdtfewttela.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZGN0Z3VtZ2dkdGZld3R0ZWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NjIxMDEsImV4cCI6MjA3MjAzODEwMX0.WzbMhCyFDmibNhHjNBfpK70V8a1pF-ordZBLo63XKwE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createGamzonUser() {
  console.log('Creating user profile for gamzon@kakao.com\n');
  
  try {
    // First check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'gamzon@kakao.com')
      .single();
    
    if (existingUser) {
      console.log('✅ User already exists!');
      console.log('\nUser Details:');
      console.log('- ID:', existingUser.id);
      console.log('- Email:', existingUser.email);
      console.log('- Nickname:', existingUser.nickname);
      console.log('- Level:', existingUser.level);
      console.log('- Grade:', existingUser.grade);
      console.log('- XP:', existingUser.xp);
      console.log('- Available Balance:', existingUser.available_balance);
      console.log('- Total Earnings:', existingUser.total_earnings);
      console.log('- Referral Code:', existingUser.referral_code);
      return;
    }
    
    // Create new user with correct column names
    const userId = crypto.randomUUID();
    const authUid = crypto.randomUUID(); // Generate auth_uid since it's required
    
    const gamzonData = {
      id: userId,
      auth_uid: authUid,
      email: 'gamzon@kakao.com',
      nickname: 'gamzon',
      full_name: 'Gamzon User',
      phone: '010-0000-0000',
      level: 1,
      xp: 0,
      grade: 'BRONZE',
      status: 'ACTIVE',
      email_verified: false,
      phone_verified: false,
      login_count: 0,
      total_earnings: 0,
      available_balance: 0,
      total_clicks: 0,
      valid_clicks: 0,
      referral_code: 'GAMZON' + Math.random().toString(36).substring(2, 6).toUpperCase(),
      referral_count: 0,
      marketing_consent: false,
      notification_consent: true,
      metadata: {},
      failed_login_attempts: 0
    };
    
    console.log('Creating user with ID:', userId);
    console.log('Auth UID:', authUid);
    
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert(gamzonData)
      .select()
      .single();
    
    if (createError) {
      console.error('Error creating user:', createError);
    } else {
      console.log('✅ User created successfully!');
      console.log('\nUser Details:');
      console.log('- ID:', newUser.id);
      console.log('- Auth UID:', newUser.auth_uid);
      console.log('- Email:', newUser.email);
      console.log('- Nickname:', newUser.nickname);
      console.log('- Level:', newUser.level);
      console.log('- Grade:', newUser.grade);
      console.log('- XP:', newUser.xp);
      console.log('- Available Balance:', newUser.available_balance);
      console.log('- Total Earnings:', newUser.total_earnings);
      console.log('- Referral Code:', newUser.referral_code);
    }
    
    // Verify creation
    console.log('\n📋 Verifying user creation...');
    const { data: verifyUser, error: verifyError } = await supabase
      .from('users')
      .select('id, email, nickname, level, grade')
      .eq('email', 'gamzon@kakao.com')
      .single();
    
    if (verifyUser) {
      console.log('✅ Verification successful! User exists in database.');
      console.log('User:', verifyUser);
    } else {
      console.log('❌ User not found after creation');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
  
  process.exit(0);
}

createGamzonUser();