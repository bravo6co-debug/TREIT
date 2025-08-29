# TreitMaster Deployment Guide

## Overview
This comprehensive guide covers deploying TreitMaster to production, including database schema deployment and Vercel hosting setup.

**Project Structure:**
- `treit-app` - Main user application (port 9000)
- `treit-advertiser` - Advertiser dashboard (port 9001) 
- `treit-admin` - Admin dashboard (port 9002)
- Database: Supabase PostgreSQL with complete schema
- Frontend: React + Vite applications
- Deployment: Vercel platform

## Vercel Deployment Setup

### Prerequisites
1. **GitHub Repository**: Ensure your code is pushed to https://github.com/bravo6co-debug/TREIT
2. **Vercel Account**: Sign up at https://vercel.com
3. **Supabase Project**: Set up your Supabase project with database schema deployed
4. **Environment Variables**: Prepare production environment variables

### Step 1: Environment Variables
Create the following environment variables in your Vercel project settings:

**Required for all apps:**
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_NODE_ENV=production
VITE_APP_ENV=production
```

**Additional variables (refer to .env.production.example files):**
- Database credentials
- Authentication providers
- Payment processing keys
- Monitoring and analytics keys

### Step 2: Vercel Project Setup
1. **Import from GitHub**: Connect your GitHub repository to Vercel
2. **Monorepo Configuration**: Vercel will automatically detect the `vercel.json` configuration
3. **Build Settings**: Each app will build independently with their respective settings
4. **Domain Configuration**: Set up custom domains for each application

### Step 3: Database Schema Deployment
Deploy the database schema to your Supabase project before deploying to Vercel.

## Database Schema Deployment

### Method 1: Supabase Dashboard SQL Editor (Recommended)

### Step 1: Access SQL Editor
1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/YOUR_PROJECT_ID
2. Navigate to "SQL Editor" in the left sidebar
3. Click "New Query"

### Step 2: Execute Schema in Chunks
Due to query size limitations, execute the schema in these chunks:

#### Chunk 1: Extensions and ENUMs
```sql
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ENUM Types
CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED');
CREATE TYPE user_grade AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'DIAMOND', 'PLATINUM');
CREATE TYPE social_platform AS ENUM ('INSTAGRAM', 'FACEBOOK', 'TWITTER', 'TIKTOK', 'YOUTUBE', 'BLOG');
CREATE TYPE business_status AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED');
CREATE TYPE business_industry AS ENUM ('RETAIL', 'FOOD', 'BEAUTY', 'FITNESS', 'EDUCATION', 'TECH', 'OTHER');
CREATE TYPE company_size AS ENUM ('SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE');
CREATE TYPE campaign_category AS ENUM ('PRODUCT', 'SERVICE', 'EVENT', 'BRAND', 'APP', 'OTHER');
CREATE TYPE approval_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE matching_status AS ENUM ('ACTIVE', 'COMPLETED', 'PAUSED', 'CANCELLED');
CREATE TYPE transaction_type AS ENUM ('earning', 'withdrawal', 'charge', 'refund');
CREATE TYPE transaction_category AS ENUM ('click', 'bonus', 'referral', 'penalty');
CREATE TYPE transaction_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE payment_provider AS ENUM ('stripe', 'toss', 'bank_transfer');
CREATE TYPE payout_method AS ENUM ('bank', 'card', 'paypal');
CREATE TYPE billing_cycle AS ENUM ('daily', 'weekly', 'monthly', 'quarterly');
CREATE TYPE fraud_type AS ENUM ('click_spam', 'bot_activity', 'ip_farming', 'pattern_anomaly', 'account_farming');
CREATE TYPE fraud_action AS ENUM ('warning', 'suspend_campaign', 'suspend_user', 'block_ip');
CREATE TYPE review_decision AS ENUM ('confirmed', 'false_positive', 'needs_investigation');
CREATE TYPE device_type AS ENUM ('mobile', 'tablet', 'desktop', 'bot');
CREATE TYPE reward_type AS ENUM ('daily_mission', 'xp_booster', 'achievement', 'daily_bonus', 'friend_referral', 'grade_upgrade', 'level_up');
CREATE TYPE admin_role AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'SUPPORT');
CREATE TYPE template_type AS ENUM ('social_post', 'story', 'video', 'blog', 'email');
```

#### Chunk 2: Core Tables (Users & Businesses)
See the individual chunk files generated below...

### Step 3: Verify Deployment
After executing all chunks, run this verification query:
```sql
SELECT COUNT(*) as total_levels FROM level_config;
SELECT level, grade, grade_title, level_title FROM level_config ORDER BY level LIMIT 5;
```

## Method 2: Automated Deployment Scripts

Use the provided deployment scripts with proper environment variables:

```bash
# Set environment variables first
export VITE_SUPABASE_URL="your_supabase_project_url"
export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"

# Run deployment script
node deploy-schema-service.js
```

## Method 3: Supabase CLI (Recommended for Advanced Users)

1. Install Supabase CLI: `npm install -g supabase`
2. Login: `supabase login`
3. Link project: `supabase link --project-ref YOUR_PROJECT_ID`
4. Apply migrations: `supabase db push`

## Method 4: Direct PostgreSQL (If Available)

```bash
# With direct database access
psql "postgresql://postgres:[PASSWORD]@YOUR_PROJECT_ID.supabase.co:5432/postgres" -f database-schema-complete.sql
```

## Important Notes

- The schema includes Row Level Security (RLS) policies
- 50 level configurations will be inserted
- All necessary indexes are created automatically
- Extensions (uuid-ossp, pgcrypto) are enabled

## Troubleshooting

- If queries fail due to size, execute smaller chunks
- Ensure you have admin privileges in Supabase
- Check the SQL Editor logs for specific error messages
- Some ENUMs might already exist - these errors can be ignored

## Verification Queries

After deployment, run these to verify:

```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check ENUM types
SELECT typname FROM pg_type 
WHERE typtype = 'e' 
ORDER BY typname;

-- Check level configuration data
SELECT COUNT(*) FROM level_config;
SELECT MIN(level), MAX(level) FROM level_config;

-- Test a simple insertion (remove after testing)
INSERT INTO level_config (level, grade, required_xp, grade_title, level_title) 
VALUES (99, 'PLATINUM', 999999, 'Test', 'Test') 
ON CONFLICT DO NOTHING;
DELETE FROM level_config WHERE level = 99;
```

## Production Readiness Checklist

### Before Deployment
- [ ] All environment variables configured in Vercel
- [ ] Database schema deployed successfully
- [ ] All three applications build without errors
- [ ] Environment variable templates reviewed
- [ ] Hardcoded credentials removed from codebase
- [ ] Security headers configured in vercel.json

### Post-Deployment Verification
- [ ] All three applications accessible via their respective URLs
- [ ] Database connections working properly
- [ ] Authentication flow functioning
- [ ] Community features working
- [ ] Admin dashboard accessible
- [ ] Error monitoring configured
- [ ] Performance monitoring active

### Production Security
- [ ] Row Level Security (RLS) policies active
- [ ] Content Security Policy headers applied
- [ ] HTTPS enforced across all applications
- [ ] API keys secured and properly scoped
- [ ] Database access restricted to application level
- [ ] Monitoring and alerting configured

## Support and Maintenance

For ongoing maintenance:
1. Monitor application performance via Vercel dashboard
2. Review database query performance in Supabase
3. Update environment variables as needed
4. Regularly backup database schema and data
5. Keep dependencies updated for security patches

## Troubleshooting

**Common Issues:**
- **Build failures**: Check environment variables and dependency versions
- **Database connection errors**: Verify Supabase URL and keys
- **Authentication issues**: Check auth provider configurations
- **Performance issues**: Review database indexes and query optimization

**Getting Help:**
- Check Vercel deployment logs
- Review Supabase database logs
- Verify environment variable configuration
- Test locally with production environment variables