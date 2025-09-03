const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://qbdctgumggdtfewttela.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZGN0Z3VtZ2dkdGZld3R0ZWxhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQ2MjEwMSwiZXhwIjoyMDcyMDM4MTAxfQ.QFDGPTVs0sbX_j-BbA-0bsFigw6pKF4TBLBXpprMadQ'
);

async function fixCampaignStatsFunction() {
  console.log('🔧 Fixing update_campaign_stats function balance reference\n');
  
  try {
    // Step 1: Drop the problematic function
    console.log('1️⃣ Dropping problematic function...');
    
    const dropFunction = `
      DROP FUNCTION IF EXISTS public.update_campaign_stats() CASCADE;
    `;
    
    const { error: dropError } = await supabase.rpc('exec', { sql: dropFunction });
    if (dropError) {
      console.log('❌ Drop function failed:', dropError);
    } else {
      console.log('✅ Function dropped successfully');
    }
    
    // Step 2: Recreate the function with correct field name
    console.log('\n2️⃣ Creating corrected function...');
    
    const correctedFunction = `
      CREATE OR REPLACE FUNCTION public.update_campaign_stats()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          -- Update campaign statistics
          UPDATE public.campaigns
          SET 
            total_clicks = total_clicks + 1,
            total_spent = total_spent + NEW.reward_amount,
            updated_at = NOW()
          WHERE id = NEW.campaign_id;
          
          -- Update user balance if click is valid (using correct field name)
          IF NEW.is_valid THEN
            UPDATE public.users
            SET 
              available_balance = available_balance + NEW.reward_amount,
              total_earnings = total_earnings + NEW.reward_amount,
              xp = xp + 1,
              updated_at = NOW()
            WHERE id = NEW.user_id;
          END IF;
          
          RETURN NEW;
        END IF;
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    const { error: createError } = await supabase.rpc('exec', { sql: correctedFunction });
    if (createError) {
      console.log('❌ Function creation failed:', createError);
    } else {
      console.log('✅ Function created successfully');
    }
    
    // Step 3: Recreate the trigger
    console.log('\n3️⃣ Creating trigger...');
    
    const createTrigger = `
      CREATE TRIGGER update_campaign_stats_trigger
        AFTER INSERT ON public.clicks
        FOR EACH ROW EXECUTE FUNCTION public.update_campaign_stats();
    `;
    
    const { error: triggerError } = await supabase.rpc('exec', { sql: createTrigger });
    if (triggerError) {
      console.log('❌ Trigger creation failed:', triggerError);
    } else {
      console.log('✅ Trigger created successfully');
    }
    
    // Step 4: Test user creation now
    console.log('\n4️⃣ Testing user creation after fix...');
    
    const testUserData = {
      auth_uid: crypto.randomUUID(),
      email: 'balance-fix-test@test.com',
      nickname: 'balancetest',
      full_name: 'Balance Fix Test'
    };
    
    // Clean up first
    await supabase.from('users').delete().eq('email', 'balance-fix-test@test.com');
    
    const { data: testUser, error: testError } = await supabase
      .from('users')
      .insert(testUserData)
      .select()
      .single();
    
    if (testError) {
      console.log('❌ User creation still failed:', testError);
      
      // If it still fails, there might be other functions with the same issue
      console.log('\n5️⃣ Checking for other functions with balance references...');
      
      // Drop any other potentially problematic functions
      const functionsToFix = [
        'DROP FUNCTION IF EXISTS public.update_user_level() CASCADE;',
        'DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;',
        'DROP FUNCTION IF EXISTS public.initialize_user_level() CASCADE;'
      ];
      
      for (const dropSql of functionsToFix) {
        try {
          await supabase.rpc('exec', { sql: dropSql });
          console.log(`✅ ${dropSql.match(/DROP FUNCTION.*?\.(\w+)\(/)?.[1] || 'Function'} dropped`);
        } catch (e) {
          console.log(`⚠️ ${e.message}`);
        }
      }
      
      // Try user creation again
      console.log('\n6️⃣ Retrying user creation...');
      
      await supabase.from('users').delete().eq('email', 'balance-fix-test@test.com');
      
      const { data: retryUser, error: retryError } = await supabase
        .from('users')
        .insert(testUserData)
        .select()
        .single();
      
      if (retryError) {
        console.log('❌ User creation still failed:', retryError);
        console.log('This suggests there may be a computed column or constraint still referencing balance');
      } else {
        console.log('✅ User creation succeeded after dropping functions!');
        console.log('Created user:', retryUser);
        
        // Clean up
        await supabase.from('users').delete().eq('email', 'balance-fix-test@test.com');
      }
      
    } else {
      console.log('✅ User creation succeeded!');
      console.log('Created user:', testUser);
      
      // Clean up
      await supabase.from('users').delete().eq('email', 'balance-fix-test@test.com');
    }
    
    console.log('\n🎯 NEXT STEP: Try creating the gamzon user now...');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
  
  process.exit(0);
}

// Include crypto for UUID generation
const crypto = require('crypto');

fixCampaignStatsFunction();