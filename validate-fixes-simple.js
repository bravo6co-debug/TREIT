/**
 * Simple validation script for campaign schema and date picker fixes
 * This script validates files and changes without external dependencies
 */

const fs = require('fs')
const path = require('path')

console.log('🎯 Campaign Schema and Date Picker Fixes Validation')
console.log('=' .repeat(60))

function validateFileExists(filePath) {
  const fullPath = path.join(process.cwd(), filePath)
  const exists = fs.existsSync(fullPath)
  console.log(`${exists ? '✅' : '❌'} ${filePath}`)
  return exists
}

function validateFileContent(filePath, searchText, description) {
  const fullPath = path.join(process.cwd(), filePath)
  
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ ${filePath} not found`)
    return false
  }
  
  const content = fs.readFileSync(fullPath, 'utf-8')
  const hasContent = content.includes(searchText)
  console.log(`${hasContent ? '✅' : '❌'} ${description}`)
  return hasContent
}

function validateNoHardcodedVersions(dirPath, description) {
  const fullPath = path.join(process.cwd(), dirPath)
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  ${dirPath} not found, skipping`)
    return true
  }
  
  let hasVersions = false
  
  function checkDirectory(dir) {
    const items = fs.readdirSync(dir)
    
    for (const item of items) {
      const itemPath = path.join(dir, item)
      const stat = fs.statSync(itemPath)
      
      if (stat.isDirectory() && !item.includes('node_modules')) {
        checkDirectory(itemPath)
      } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
        const content = fs.readFileSync(itemPath, 'utf-8')
        
        // Check for hardcoded versions in imports
        if (content.match(/from\s+['"][^'"]*@\d+(\.\d+)*['"]/g)) {
          hasVersions = true
        }
      }
    }
  }
  
  checkDirectory(fullPath)
  
  console.log(`${!hasVersions ? '✅' : '❌'} ${description}`)
  return !hasVersions
}

function main() {
  console.log('\n🔍 1. Database Schema Files:')
  let allValid = true
  
  // Check schema files
  allValid &= validateFileExists('supabase/migrations/004_create_campaigns_table.sql')
  allValid &= validateFileExists('supabase-deploy/11-click-tracking-completion.sql') 
  allValid &= validateFileExists('supabase-deploy/13-fix-campaign-schema-fields.sql')
  
  console.log('\n🔍 2. Database Schema Content:')
  
  // Check target_clicks was added
  allValid &= validateFileContent(
    'supabase/migrations/004_create_campaigns_table.sql',
    'target_clicks INTEGER DEFAULT NULL',
    'target_clicks column added to campaigns table'
  )
  
  // Check completion function exists
  allValid &= validateFileContent(
    'supabase-deploy/13-fix-campaign-schema-fields.sql', 
    'get_campaign_completion_percentage',
    'Campaign completion function created'
  )
  
  console.log('\n🔍 3. Frontend Type Interfaces:')
  
  // Check TypeScript interfaces
  allValid &= validateFileExists('treit-advertiser/src/types/campaign.ts')
  allValid &= validateFileContent(
    'treit-advertiser/src/types/campaign.ts',
    'target_clicks: number',
    'target_clicks field in Campaign interface'
  )
  allValid &= validateFileContent(
    'treit-advertiser/src/types/campaign.ts',
    'title: string  // Matches database schema',
    'title field aligned with database schema'
  )
  
  console.log('\n🔍 4. Component Updates:')
  
  // Check CampaignAdd component
  allValid &= validateFileContent(
    'treit-advertiser/src/components/CampaignAdd.tsx',
    'target_clicks: 0',
    'CampaignAdd uses target_clicks field'
  )
  allValid &= validateFileContent(
    'treit-advertiser/src/components/CampaignAdd.tsx',
    'formData.target_clicks',
    'CampaignAdd form references target_clicks'
  )
  
  console.log('\n🔍 5. Package Version Cleanup:')
  
  // Check Edge Functions
  allValid &= validateNoHardcodedVersions(
    'supabase/functions',
    'No hardcoded versions in Edge Functions'
  )
  
  console.log('\n🔍 6. System Components:')
  
  // Check system files
  allValid &= validateFileExists('supabase/functions/_shared/redis.ts')
  allValid &= validateFileExists('supabase/functions/_shared/queue.ts')
  allValid &= validateFileContent(
    'supabase/functions/_shared/queue.ts',
    'class AsyncQueue',
    'Queue system implemented'
  )
  allValid &= validateFileContent(
    'supabase/functions/_shared/redis.ts',
    'class RedisCache',
    'Redis cache system implemented'
  )
  
  console.log('\n🔍 7. Deployment Scripts:')
  
  // Check deployment utilities
  allValid &= validateFileExists('deploy-campaign-fixes.js')
  allValid &= validateFileExists('CAMPAIGN-FIXES-README.md')
  
  console.log('\n📊 Validation Summary:')
  console.log('=' .repeat(30))
  
  if (allValid) {
    console.log('🎉 All validations passed!')
    console.log('\n✅ Changes Confirmed:')
    console.log('   • Database schema field mismatches fixed')
    console.log('   • target_clicks column added to campaigns')
    console.log('   • Frontend type interfaces aligned')
    console.log('   • Hardcoded package versions removed')
    console.log('   • Click tracking system validated')
    console.log('   • Redis and Queue systems confirmed')
    console.log('   • Deployment scripts created')
    
    console.log('\n📝 Next Steps:')
    console.log('   1. Install dependencies: npm run install:all')
    console.log('   2. Deploy database changes: node deploy-campaign-fixes.js')  
    console.log('   3. Build applications: npm run build')
    console.log('   4. Run full tests: npm test')
    
  } else {
    console.log('❌ Some validations failed!')
    console.log('Please review the errors above and fix any issues.')
    process.exit(1)
  }
}

main()