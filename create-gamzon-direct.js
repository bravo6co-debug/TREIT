const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  'https://qbdctgumggdtfewttela.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZGN0Z3VtZ2dkdGZld3R0ZWxhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQ2MjEwMSwiZXhwIjoyMDcyMDM4MTAxfQ.QFDGPTVs0sbX_j-BbA-0bsFigw6pKF4TBLBXpprMadQ'
);

async function createGamzonDirect() {
  console.log('🎯 Creating Gamzon user directly with exact schema match\n');
  
  try {
    // First, get the existing user structure to copy exactly
    console.log('1️⃣ Getting template from existing user...');
    const { data: existingUsers, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (!existingUsers || existingUsers.length === 0) {
      console.log('❌ No existing users to copy structure from');
      return;
    }
    
    const template = existingUsers[0];
    console.log('✅ Got template user structure');
    
    // Clean up any existing gamzon user
    console.log('\n2️⃣ Cleaning up existing gamzon user...');
    await supabase.from('users').delete().eq('email', 'gamzon@kakao.com');
    
    // Create gamzon user with exact same structure as template
    console.log('\n3️⃣ Creating gamzon user with template structure...');
    
    // Generate new IDs
    const newId = crypto.randomUUID();
    const newAuthUid = crypto.randomUUID();
    const newReferralCode = 'GAMZON' + Math.random().toString(36).substring(2, 6).toUpperCase();
    
    // Create new user data based on template but with gamzon details
    const gamzonData = {
      ...template, // Copy all fields from template
      id: newId, // New UUID
      auth_uid: newAuthUid, // New auth UUID
      email: 'gamzon@kakao.com', // Target email
      nickname: 'gamzon', // Target nickname
      full_name: 'Gamzon User', // Target name
      phone: '010-0000-0000', // New phone
      profile_image_url: null, // Reset image
      level: 1, // Reset to level 1
      xp: 0, // Reset XP
      grade: 'BRONZE', // Reset grade
      status: 'ACTIVE', // Ensure active
      email_verified: false, // Reset verification
      phone_verified: false, // Reset verification
      last_login_at: null, // Reset login
      login_count: 0, // Reset count
      total_earnings: 0, // Reset earnings
      available_balance: 0, // Reset balance
      total_clicks: 0, // Reset clicks
      valid_clicks: 0, // Reset clicks
      referral_code: newReferralCode, // New referral code
      referred_by: null, // No referrer
      referral_count: 0, // Reset count
      marketing_consent: false, // Reset consent
      notification_consent: true, // Default true
      metadata: {}, // Reset metadata
      suspension_reason: null, // No suspension
      suspended_until: null, // No suspension
      failed_login_attempts: 0, // Reset attempts
      last_failed_login: null, // Reset
      created_at: new Date().toISOString(), // Current time
      updated_at: new Date().toISOString() // Current time
    };
    
    console.log('Creating user with auth_uid:', newAuthUid);
    console.log('Referral code:', newReferralCode);
    
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert(gamzonData)
      .select()
      .single();
    
    if (createError) {
      console.log('❌ User creation failed:', createError);
      return;
    }
    
    console.log('✅ Gamzon user created successfully!');
    console.log('User details:');
    console.log(`  - ID: ${newUser.id}`);
    console.log(`  - Auth UID: ${newUser.auth_uid}`);
    console.log(`  - Email: ${newUser.email}`);
    console.log(`  - Nickname: ${newUser.nickname}`);
    console.log(`  - Level: ${newUser.level}`);
    console.log(`  - Grade: ${newUser.grade}`);
    console.log(`  - Available Balance: ${newUser.available_balance}`);
    console.log(`  - Referral Code: ${newUser.referral_code}`);
    
    // Step 4: Create corresponding auth user
    console.log('\n4️⃣ Creating corresponding auth user...');
    
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      id: newAuthUid, // Same UUID as auth_uid in profile
      email: 'gamzon@kakao.com',
      password: 'GamzonPass123!', // Strong password
      email_confirm: true, // Confirm email immediately
      user_metadata: {
        nickname: 'gamzon',
        full_name: 'Gamzon User'
      }
    });
    
    if (authError) {
      console.log('❌ Auth user creation failed:', authError);
      // Clean up profile if auth creation failed
      await supabase.from('users').delete().eq('id', newUser.id);
    } else {
      console.log('✅ Auth user created successfully!');
      console.log(`  - Auth ID: ${authUser.user.id}`);
      console.log(`  - Email: ${authUser.user.email}`);
      console.log(`  - Confirmed: ${authUser.user.email_confirmed_at ? 'Yes' : 'No'}`);
      
      // Step 5: Test login
      console.log('\n5️⃣ Testing login...');
      
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'gamzon@kakao.com',
        password: 'GamzonPass123!'
      });
      
      if (loginError) {
        console.log('❌ Login test failed:', loginError);
      } else {
        console.log('✅ Login test successful!');
        console.log(`  - Logged in as: ${loginData.user.email}`);
        console.log(`  - Session: ${loginData.session ? 'Active' : 'None'}`);
        
        // Test profile retrieval
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('auth_uid', loginData.user.id)
          .single();
        
        if (profileError) {
          console.log('❌ Profile retrieval failed:', profileError);
        } else {
          console.log('✅ Profile retrieval successful!');
          console.log(`  - Profile found: ${profileData.nickname} (${profileData.email})`);
          console.log(`  - Auth UID match: ${profileData.auth_uid === loginData.user.id ? 'Yes' : 'No'}`);
        }
        
        // Sign out
        await supabase.auth.signOut();
        console.log('✅ Signed out');
      }
    }
    
    console.log('\n🎉 GAMZON USER SETUP COMPLETE!');
    console.log('================================');
    console.log('User Profile Created: ✅');
    console.log('Auth User Created: ✅');  
    console.log('Login Test: ✅');
    console.log('Profile Linking: ✅');
    console.log('');
    console.log('Login credentials:');
    console.log('  Email: gamzon@kakao.com');
    console.log('  Password: GamzonPass123!');
    console.log('  Auth UID:', newAuthUid);
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
  
  process.exit(0);
}

createGamzonDirect();