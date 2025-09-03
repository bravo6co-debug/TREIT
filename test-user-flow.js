const { createClient } = require('@supabase/supabase-js');

// Supabase configuration with service role key for admin operations
const supabaseUrl = 'https://qbdctgumggdtfewttela.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZGN0Z3VtZ2dkdGZld3R0ZWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NjIxMDEsImV4cCI6MjA3MjAzODEwMX0.WzbMhCyFDmibNhHjNBfpK70V8a1pF-ordZBLo63XKwE';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZGN0Z3VtZ2dkdGZld3R0ZWxhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQ2MjEwMSwiZXhwIjoyMDcyMDM4MTAxfQ.QFDGPTVs0sbX_j-BbA-0bsFigw6pKF4TBLBXpprMadQ';

// Create clients
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const testEmail = 'gamzon@kakao.com';
const testPassword = 'TestPassword123!';

async function testUserFlow() {
  console.log('=== Testing User Registration and Login Flow ===\n');
  console.log(`Testing with email: ${testEmail}\n`);
  
  try {
    // Step 1: Check if user exists in auth.users table
    console.log('1️⃣ Checking auth.users table...');
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error checking auth.users:', authError);
    } else {
      const existingAuthUser = authUsers.users.find(user => user.email === testEmail);
      if (existingAuthUser) {
        console.log('✅ User found in auth.users:');
        console.log(`  - ID: ${existingAuthUser.id}`);
        console.log(`  - Email: ${existingAuthUser.email}`);
        console.log(`  - Email confirmed: ${existingAuthUser.email_confirmed_at ? 'Yes' : 'No'}`);
        console.log(`  - Created: ${new Date(existingAuthUser.created_at).toLocaleString()}`);
      } else {
        console.log('❌ User NOT found in auth.users');
      }
    }
    
    // Step 2: Check if user exists in users table
    console.log('\n2️⃣ Checking users table...');
    const { data: userData, error: userError } = await supabaseAnon
      .from('users')
      .select('*')
      .eq('email', testEmail)
      .single();
    
    if (userError) {
      if (userError.code === 'PGRST116') {
        console.log('❌ User NOT found in users table');
      } else {
        console.error('❌ Error querying users table:', userError);
      }
    } else {
      console.log('✅ User found in users table:');
      console.log(`  - ID: ${userData.id}`);
      console.log(`  - Auth UID: ${userData.auth_uid}`);
      console.log(`  - Email: ${userData.email}`);
      console.log(`  - Username: ${userData.username}`);
      console.log(`  - Status: ${userData.status}`);
    }
    
    // Step 3: Test user registration if user doesn't exist
    console.log('\n3️⃣ Testing user registration...');
    
    // First, clean up any existing auth user to test registration
    if (authUsers && authUsers.users.find(user => user.email === testEmail)) {
      console.log('Cleaning up existing auth user for fresh test...');
      const existingUser = authUsers.users.find(user => user.email === testEmail);
      await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
    }
    
    // Clean up users table as well
    await supabaseAdmin.from('users').delete().eq('email', testEmail);
    
    console.log('Creating new user via auth.signUp...');
    const { data: signUpData, error: signUpError } = await supabaseAnon.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          nickname: 'gamzon',
          full_name: 'Gamzon Test User'
        }
      }
    });
    
    if (signUpError) {
      console.error('❌ Sign up failed:', signUpError);
    } else {
      console.log('✅ Sign up successful!');
      console.log(`  - Auth User ID: ${signUpData.user?.id}`);
      console.log(`  - Email: ${signUpData.user?.email}`);
      console.log(`  - Email confirmed: ${signUpData.user?.email_confirmed_at ? 'Yes' : 'No'}`);
      
      // Step 4: Check if user profile was created automatically
      console.log('\n4️⃣ Checking if user profile was created...');
      
      // Wait a moment for triggers to execute
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const { data: newUserData, error: newUserError } = await supabaseAnon
        .from('users')
        .select('*')
        .eq('email', testEmail)
        .single();
      
      if (newUserError) {
        console.log('❌ User profile was NOT created automatically');
        console.log('This indicates that the user registration trigger is not working');
        
        // Create user profile manually to test the flow
        console.log('\n📝 Creating user profile manually...');
        const manualUserData = {
          auth_uid: signUpData.user.id,
          email: testEmail,
          nickname: 'gamzon',
          full_name: 'Gamzon Test User',
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
        
        const { data: createdUser, error: createError } = await supabaseAdmin
          .from('users')
          .insert(manualUserData)
          .select()
          .single();
        
        if (createError) {
          console.error('❌ Failed to create user profile:', createError);
        } else {
          console.log('✅ User profile created manually');
          console.log(`  - Profile ID: ${createdUser.id}`);
          console.log(`  - Auth UID: ${createdUser.auth_uid}`);
        }
      } else {
        console.log('✅ User profile was created automatically!');
        console.log(`  - Profile ID: ${newUserData.id}`);
        console.log(`  - Auth UID: ${newUserData.auth_uid}`);
        console.log(`  - Email: ${newUserData.email}`);
        console.log(`  - Nickname: ${newUserData.nickname}`);
      }
      
      // Step 5: Confirm email for login testing
      console.log('\n5️⃣ Confirming email for login testing...');
      if (signUpData.user?.id) {
        const { data: confirmData, error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
          signUpData.user.id,
          { email_confirm: true }
        );
        
        if (confirmError) {
          console.log('❌ Failed to confirm email:', confirmError);
        } else {
          console.log('✅ Email confirmed for testing');
        }
      }
      
      // Step 6: Test login
      console.log('\n6️⃣ Testing user login...');
      const { data: loginData, error: loginError } = await supabaseAnon.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      });
      
      if (loginError) {
        console.error('❌ Login failed:', loginError);
      } else {
        console.log('✅ Login successful!');
        console.log(`  - Auth User ID: ${loginData.user?.id}`);
        console.log(`  - Email: ${loginData.user?.email}`);
        console.log(`  - Session exists: ${loginData.session ? 'Yes' : 'No'}`);
        
        // Step 7: Verify auth_uid matching
        console.log('\n7️⃣ Verifying auth_uid matching...');
        const { data: profileData, error: profileError } = await supabaseAnon
          .from('users')
          .select('*')
          .eq('auth_uid', loginData.user.id)
          .single();
        
        if (profileError) {
          console.error('❌ Could not find user profile by auth_uid:', profileError);
        } else {
          console.log('✅ User profile found by auth_uid!');
          console.log(`  - Profile ID: ${profileData.id}`);
          console.log(`  - Auth UID matches: ${profileData.auth_uid === loginData.user.id ? 'Yes' : 'No'}`);
          console.log(`  - Email matches: ${profileData.email === loginData.user.email ? 'Yes' : 'No'}`);
        }
        
        // Sign out
        await supabaseAnon.auth.signOut();
        console.log('✅ Signed out successfully');
      }
    }
    
    // Step 8: Final verification
    console.log('\n8️⃣ Final verification...');
    
    // Check final state of both tables
    const { data: finalAuthUsers, error: finalAuthError } = await supabaseAdmin.auth.admin.listUsers();
    const finalAuthUser = finalAuthUsers?.users.find(user => user.email === testEmail);
    
    const { data: finalUserData, error: finalUserError } = await supabaseAnon
      .from('users')
      .select('*')
      .eq('email', testEmail)
      .single();
    
    console.log('\nFinal State Summary:');
    console.log(`Auth User Exists: ${finalAuthUser ? '✅ Yes' : '❌ No'}`);
    console.log(`User Profile Exists: ${finalUserData && !finalUserError ? '✅ Yes' : '❌ No'}`);
    
    if (finalAuthUser && finalUserData) {
      console.log(`Auth UID Match: ${finalUserData.auth_uid === finalAuthUser.id ? '✅ Yes' : '❌ No'}`);
      console.log(`Email Match: ${finalUserData.email === finalAuthUser.email ? '✅ Yes' : '❌ No'}`);
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
  
  console.log('\n=== Test Complete ===');
  process.exit(0);
}

testUserFlow();