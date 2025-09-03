const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://qbdctgumggdtfewttela.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZGN0Z3VtZ2dkdGZld3R0ZWxhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQ2MjEwMSwiZXhwIjoyMDcyMDM4MTAxfQ.QFDGPTVs0sbX_j-BbA-0bsFigw6pKF4TBLBXpprMadQ'
);

async function testActualSchema() {
  console.log('🧪 Testing what schema is actually deployed...\n');
  
  try {
    // Method 1: Try different field combinations to see what works
    console.log('1️⃣ Testing different field combinations...\n');
    
    const testCases = [
      {
        name: 'Available Balance + Nickname',
        data: {
          auth_uid: 'test-001',
          email: 'test1@test.com',
          nickname: 'test1',
          available_balance: 0
        }
      },
      {
        name: 'Balance + Nickname',
        data: {
          auth_uid: 'test-002',
          email: 'test2@test.com', 
          nickname: 'test2',
          balance: 0
        }
      },
      {
        name: 'Available Balance + Username',
        data: {
          auth_uid: 'test-003',
          email: 'test3@test.com',
          username: 'test3',
          available_balance: 0
        }
      },
      {
        name: 'Balance + Username',
        data: {
          auth_uid: 'test-004',
          email: 'test4@test.com',
          username: 'test4',
          balance: 0
        }
      },
      {
        name: 'Minimal with nickname only',
        data: {
          auth_uid: 'test-005',
          email: 'test5@test.com',
          nickname: 'test5'
        }
      }
    ];
    
    const workingCombinations = [];
    
    for (const testCase of testCases) {
      console.log(`Testing: ${testCase.name}`);
      
      // Clean up first
      await supabase.from('users').delete().eq('email', testCase.data.email);
      
      const { data: result, error } = await supabase
        .from('users')
        .insert(testCase.data)
        .select();
      
      if (error) {
        console.log(`  ❌ Failed: ${error.message}`);
      } else {
        console.log(`  ✅ Success!`);
        workingCombinations.push(testCase.name);
        console.log(`  Created user: ${result[0].id}`);
        
        // Clean up
        await supabase.from('users').delete().eq('email', testCase.data.email);
      }
      console.log('');
    }
    
    console.log('2️⃣ Summary of working combinations:');
    if (workingCombinations.length > 0) {
      workingCombinations.forEach(combo => console.log(`  ✅ ${combo}`));
    } else {
      console.log('  ❌ No combinations worked!');
    }
    
    // Method 2: Check what an existing user record looks like
    console.log('\n3️⃣ Examining existing user structure...');
    
    const { data: existingUsers, error: existingError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (existingUsers && existingUsers.length > 0) {
      console.log('Existing user structure:');
      const user = existingUsers[0];
      Object.keys(user).forEach(key => {
        console.log(`  - ${key}: ${typeof user[key]} = ${user[key]}`);
      });
    } else {
      console.log('No existing users found to examine');
    }
    
    // Method 3: Test the gamzon user creation with the correct schema
    console.log('\n4️⃣ Testing gamzon user creation with discovered schema...');
    
    if (workingCombinations.length > 0) {
      // Use the working combination to create gamzon user
      const gamzonData = {
        auth_uid: 'gamzon-test-auth-uid',
        email: 'gamzon@kakao.com',
        nickname: 'gamzon',
        full_name: 'Gamzon User'
      };
      
      // Add available_balance if it worked in tests
      if (workingCombinations.some(combo => combo.includes('Available Balance'))) {
        gamzonData.available_balance = 0;
      }
      
      console.log('Creating gamzon user with data:', gamzonData);
      
      // Clean up first
      await supabase.from('users').delete().eq('email', 'gamzon@kakao.com');
      
      const { data: gamzonResult, error: gamzonError } = await supabase
        .from('users')
        .insert(gamzonData)
        .select();
      
      if (gamzonError) {
        console.log('❌ Gamzon user creation failed:', gamzonError);
      } else {
        console.log('✅ Gamzon user created successfully!');
        console.log('User details:', gamzonResult[0]);
      }
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
  
  console.log('\n🏁 Schema test complete');
  process.exit(0);
}

testActualSchema();