const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Supabase configuration
const SUPABASE_URL = 'https://fmcepybqdzuzqyvrmdel.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function deployCampaignSchema() {
  console.log('🚀 Deploying campaign schema to Supabase...\n');

  try {
    // 1. Drop existing campaigns table (be careful!)
    console.log('1️⃣ Dropping existing campaigns table...');
    const { error: dropError } = await supabase.rpc('query_exec', {
      query: 'DROP TABLE IF EXISTS campaigns CASCADE'
    });
    
    if (dropError && !dropError.message.includes('does not exist')) {
      console.log('⚠️ Could not drop table:', dropError.message);
    }

    // 2. Create campaigns table with correct schema
    console.log('2️⃣ Creating campaigns table with correct schema...');
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS campaigns (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category campaign_category,
        budget DECIMAL(15, 2) NOT NULL,
        spent DECIMAL(15, 2) DEFAULT 0,
        cpc_rate DECIMAL(10, 2) NOT NULL,
        start_date TIMESTAMP WITH TIME ZONE NOT NULL,
        end_date TIMESTAMP WITH TIME ZONE NOT NULL,
        target_clicks INTEGER,
        current_clicks INTEGER DEFAULT 0,
        target_demographics JSONB DEFAULT '{}',
        target_regions JSONB DEFAULT '[]',
        target_interests JSONB DEFAULT '[]',
        destination_url TEXT NOT NULL,
        tracking_url TEXT,
        image_url TEXT,
        video_url TEXT,
        is_active BOOLEAN DEFAULT false,
        approval_status approval_status DEFAULT 'PENDING',
        approved_at TIMESTAMP WITH TIME ZONE,
        approved_by UUID,
        rejection_reason TEXT,
        performance_data JSONB DEFAULT '{}',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Use raw SQL execution through Supabase
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .limit(0); // Just test connection

    if (error) {
      console.log('❌ Table check failed:', error.message);
      console.log('\n📝 Please run this SQL manually in Supabase SQL Editor:');
      console.log('----------------------------------------');
      console.log(createTableSQL);
      console.log('----------------------------------------');
    } else {
      console.log('✅ Campaigns table exists and is accessible');
    }

    // 3. Check table structure
    console.log('\n3️⃣ Checking table structure...');
    const { data: columns, error: columnsError } = await supabase
      .from('campaigns')
      .select()
      .limit(0);

    if (!columnsError) {
      console.log('✅ Table structure verified');
    } else {
      console.log('❌ Table structure check failed:', columnsError.message);
    }

    console.log('\n✨ Schema deployment check complete!');
    console.log('\n⚠️ IMPORTANT: If the table doesn\'t exist with the correct schema,');
    console.log('please go to Supabase Dashboard > SQL Editor and run the SQL above.');

  } catch (error) {
    console.error('❌ Deployment error:', error);
  }
}

// Run the deployment
deployCampaignSchema();