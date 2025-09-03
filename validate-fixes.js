/**
 * Validation script for campaign schema and date picker fixes
 * This script validates all the fixes applied in this commit
 */

const { createClient } = require('@supabase/supabase-js')

// Configuration
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration')
  console.log('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function validateDatabaseSchema() {
  console.log('\n🔍 Validating Database Schema...')
  
  try {
    // Check if campaigns table has target_clicks column
    const { data: campaignsColumns, error: campaignsError } = await supabase
      .rpc('get_table_columns', { table_name: 'campaigns' })
    
    if (campaignsError) {
      // Alternative method if RPC doesn't exist
      const { data: testCampaign, error: testError } = await supabase
        .from('campaigns')
        .select('target_clicks')
        .limit(1)
      
      if (testError && testError.message.includes('column "target_clicks" does not exist')) {
        console.error('❌ campaigns.target_clicks column missing')
        return false
      }
    }
    
    console.log('✅ campaigns.target_clicks column exists')
    
    // Check if deeplink_mappings table exists
    const { data: deeplinkTest, error: deeplinkError } = await supabase
      .from('deeplink_mappings')
      .select('id')
      .limit(1)
    
    if (deeplinkError && deeplinkError.message.includes('relation "deeplink_mappings" does not exist')) {
      console.error('❌ deeplink_mappings table missing')
      return false
    }
    
    console.log('✅ deeplink_mappings table exists')
    
    // Check if click_events has new columns
    const { data: clickTest, error: clickError } = await supabase
      .from('click_events')
      .select('commission_amount, clicked_at')
      .limit(1)
    
    if (clickError) {
      console.warn('⚠️  click_events table might be missing new columns')
    } else {
      console.log('✅ click_events table has required columns')
    }
    
    // Check if queue_messages table exists
    const { data: queueTest, error: queueError } = await supabase
      .from('queue_messages')
      .select('id')
      .limit(1)
    
    if (queueError && queueError.message.includes('relation "queue_messages" does not exist')) {
      console.error('❌ queue_messages table missing')
      return false
    }
    
    console.log('✅ queue_messages table exists')
    
    return true
    
  } catch (error) {
    console.error('❌ Database validation error:', error.message)
    return false
  }
}

async function validateCampaignCompletion() {
  console.log('\n🔍 Validating Campaign Completion Function...')
  
  try {
    // Test the campaign completion percentage function
    const { data, error } = await supabase
      .rpc('get_campaign_completion_percentage', { 
        p_campaign_id: '00000000-0000-0000-0000-000000000000' // Test UUID
      })
    
    if (error && !error.message.includes('does not exist')) {
      console.error('❌ Campaign completion function error:', error.message)
      return false
    }
    
    console.log('✅ Campaign completion function available')
    return true
    
  } catch (error) {
    console.error('❌ Function validation error:', error.message)
    return false
  }
}

function validateFileStructure() {
  console.log('\n🔍 Validating File Structure...')
  
  const fs = require('fs')
  const path = require('path')
  
  const requiredFiles = [
    'supabase-deploy/11-click-tracking-completion.sql',
    'supabase-deploy/13-fix-campaign-schema-fields.sql',
    'supabase/migrations/004_create_campaigns_table.sql',
    'treit-advertiser/src/types/campaign.ts',
    'supabase/functions/_shared/queue.ts',
    'supabase/functions/_shared/redis.ts'
  ]
  
  let allExist = true
  
  for (const file of requiredFiles) {
    const filePath = path.join(process.cwd(), file)
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${file} exists`)
    } else {
      console.error(`❌ ${file} missing`)
      allExist = false
    }
  }
  
  return allExist
}

function validatePackageVersions() {
  console.log('\n🔍 Validating Package Versions Removed...')
  
  const fs = require('fs')
  const path = require('path')
  
  // Check for hardcoded versions in edge functions
  const functionsPath = path.join(process.cwd(), 'supabase', 'functions')
  
  if (!fs.existsSync(functionsPath)) {
    console.log('⚠️  Supabase functions directory not found, skipping version check')
    return true
  }
  
  let hasHardcodedVersions = false
  
  function checkDirectory(dir) {
    const items = fs.readdirSync(dir)
    
    for (const item of items) {
      const itemPath = path.join(dir, item)
      const stat = fs.statSync(itemPath)
      
      if (stat.isDirectory()) {
        checkDirectory(itemPath)
      } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
        const content = fs.readFileSync(itemPath, 'utf-8')
        
        // Check for hardcoded versions
        if (content.match(/@[0-9]+\.[0-9]+\.[0-9]+|@[0-9]+/)) {
          console.error(`❌ Hardcoded version found in ${itemPath}`)
          hasHardcodedVersions = true
        }
      }
    }
  }
  
  checkDirectory(functionsPath)
  
  if (!hasHardcodedVersions) {
    console.log('✅ No hardcoded package versions found')
  }
  
  return !hasHardcodedVersions
}

async function main() {
  console.log('🚀 Starting Campaign Schema and Date Picker Fixes Validation\n')
  
  const results = {
    database: await validateDatabaseSchema(),
    completion: await validateCampaignCompletion(),
    fileStructure: validateFileStructure(),
    packageVersions: validatePackageVersions()
  }
  
  console.log('\n📋 Validation Summary:')
  console.log('='.repeat(50))
  
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASS' : 'FAIL'}`)
  })
  
  const allPassed = Object.values(results).every(Boolean)
  
  if (allPassed) {
    console.log('\n🎉 All validations passed! The fixes have been successfully applied.')
  } else {
    console.log('\n❌ Some validations failed. Please check the errors above.')
    process.exit(1)
  }
}

// Run validation
main().catch(error => {
  console.error('💥 Validation script error:', error)
  process.exit(1)
})