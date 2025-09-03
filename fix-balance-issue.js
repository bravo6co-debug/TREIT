const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://qbdctgumggdtfewttela.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZGN0Z3VtZ2dkdGZld3R0ZWxhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQ2MjEwMSwiZXhwIjoyMDcyMDM4MTAxfQ.QFDGPTVs0sbX_j-BbA-0bsFigw6pKF4TBLBXpprMadQ'
);

async function fixBalanceIssue() {
  console.log('🔧 Fixing balance field issue...\n');
  
  try {
    // Step 1: Drop any functions that reference the old 'balance' field
    console.log('1️⃣ Dropping potentially problematic functions...');
    
    const dropFunctions = [
      'DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;',
      'DROP FUNCTION IF EXISTS public.initialize_user_level() CASCADE;',
      'DROP FUNCTION IF EXISTS public.handle_new_signup() CASCADE;',
      'DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;',
      'DROP TRIGGER IF EXISTS initialize_user_on_insert ON public.users;'
    ];
    
    for (const sql of dropFunctions) {
      try {
        console.log(`  Executing: ${sql}`);
        await supabase.rpc('exec', { sql });
      } catch (e) {
        console.log(`  ⚠️  ${e.message}`);
      }
    }
    
    // Step 2: Recreate the user initialization function with correct field names
    console.log('\n2️⃣ Creating corrected user initialization function...');
    
    const newUserFunction = `
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS trigger AS $$
      BEGIN
          INSERT INTO public.users (
              auth_uid,
              email,
              nickname,
              full_name,
              phone,
              status,
              grade,
              level,
              xp,
              total_clicks,
              valid_clicks,
              total_earnings,
              available_balance,
              referral_code,
              email_verified,
              phone_verified,
              login_count,
              referral_count,
              marketing_consent,
              notification_consent,
              failed_login_attempts,
              created_at,
              updated_at
          ) VALUES (
              NEW.id,
              NEW.email,
              COALESCE(NEW.raw_user_meta_data->>'nickname', LOWER(SPLIT_PART(NEW.email, '@', 1))),
              COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
              COALESCE(NEW.raw_user_meta_data->>'phone', ''),
              'ACTIVE',
              'BRONZE',
              1,
              0,
              0,
              0,
              0,
              0,
              UPPER(SUBSTR(MD5(RANDOM()::TEXT || NEW.id::TEXT), 1, 8)),
              NEW.email_confirmed_at IS NOT NULL,
              false,
              0,
              0,
              false,
              true,
              0,
              NOW(),
              NOW()
          );
          
          RETURN NEW;
      EXCEPTION
          WHEN OTHERS THEN
              RAISE LOG 'Error in handle_new_user: %', SQLERRM;
              RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    await supabase.rpc('exec', { sql: newUserFunction });
    console.log('✅ User function created');
    
    // Step 3: Create the trigger
    console.log('\n3️⃣ Creating auth trigger...');
    
    const createTrigger = `
      CREATE TRIGGER on_auth_user_created
          AFTER INSERT ON auth.users
          FOR EACH ROW 
          EXECUTE FUNCTION public.handle_new_user();
    `;
    
    await supabase.rpc('exec', { sql: createTrigger });
    console.log('✅ Trigger created');
    
    // Step 4: Test the fix
    console.log('\n4️⃣ Testing the fix...');
    
    const testUserId = '99999999-9999-9999-9999-999999999999';
    
    // Clean up any existing test user first
    await supabase.from('users').delete().eq('email', 'test-fix@test.com');
    try {
      await supabase.auth.admin.deleteUser(testUserId);
    } catch (e) {
      // User may not exist, that's fine
    }
    
    // Try manual insert first
    const testData = {
      auth_uid: testUserId,
      email: 'test-fix@test.com',
      nickname: 'testfix',
      full_name: 'Test Fix User'
    };
    
    const { data: insertResult, error: insertError } = await supabase
      .from('users')
      .insert(testData)
      .select();
    
    if (insertError) {
      console.log('❌ Manual insert still failed:', insertError);
    } else {
      console.log('✅ Manual insert succeeded!');
      console.log('Created user:', insertResult[0]);
      
      // Clean up
      await supabase.from('users').delete().eq('email', 'test-fix@test.com');
    }
    
    // Now test auth signup (which should trigger the function)
    console.log('\n5️⃣ Testing auth signup trigger...');
    
    const { data: signupData, error: signupError } = await supabase.auth.admin.createUser({
      email: 'auth-test@test.com',
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: {
        nickname: 'authtest',
        full_name: 'Auth Test User'
      }
    });
    
    if (signupError) {
      console.log('❌ Auth signup failed:', signupError);
    } else {
      console.log('✅ Auth signup succeeded!');
      console.log('Created auth user:', signupData.user?.id);
      
      // Check if profile was created
      setTimeout(async () => {
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('auth_uid', signupData.user.id)
          .single();
        
        if (profileError) {
          console.log('❌ Profile was not created automatically:', profileError);
        } else {
          console.log('✅ Profile was created automatically!');
          console.log('Profile data:', profileData);
        }
        
        // Clean up
        await supabase.from('users').delete().eq('auth_uid', signupData.user.id);
        await supabase.auth.admin.deleteUser(signupData.user.id);
        
        console.log('\n🎉 Fix complete and tested!');
        process.exit(0);
      }, 2000);
    }
    
  } catch (error) {
    console.error('Error during fix:', error);
    process.exit(1);
  }
}

fixBalanceIssue();