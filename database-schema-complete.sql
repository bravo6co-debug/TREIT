-- ===================================
-- TreitMaster Database Schema - Complete
-- ===================================
-- 통합 스키마 파일 - MCP를 통한 원격 데이터베이스 구축용

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===================================
-- ENUM Types
-- ===================================

-- User related enums
CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED');
CREATE TYPE user_grade AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'DIAMOND', 'PLATINUM');
CREATE TYPE social_platform AS ENUM ('INSTAGRAM', 'FACEBOOK', 'TWITTER', 'TIKTOK', 'YOUTUBE', 'BLOG');

-- Business related enums
CREATE TYPE business_status AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED');
CREATE TYPE business_industry AS ENUM ('RETAIL', 'FOOD', 'BEAUTY', 'FITNESS', 'EDUCATION', 'TECH', 'OTHER');
CREATE TYPE company_size AS ENUM ('SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE');

-- Campaign related enums
CREATE TYPE campaign_category AS ENUM ('PRODUCT', 'SERVICE', 'EVENT', 'BRAND', 'APP', 'OTHER');
CREATE TYPE approval_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE matching_status AS ENUM ('ACTIVE', 'COMPLETED', 'PAUSED', 'CANCELLED');

-- Transaction related enums
CREATE TYPE transaction_type AS ENUM ('earning', 'withdrawal', 'charge', 'refund');
CREATE TYPE transaction_category AS ENUM ('click', 'bonus', 'referral', 'penalty');
CREATE TYPE transaction_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE payment_provider AS ENUM ('stripe', 'toss', 'bank_transfer');
CREATE TYPE payout_method AS ENUM ('bank', 'card', 'paypal');
CREATE TYPE billing_cycle AS ENUM ('daily', 'weekly', 'monthly', 'quarterly');

-- Fraud detection related enums
CREATE TYPE fraud_type AS ENUM ('click_spam', 'bot_activity', 'ip_farming', 'pattern_anomaly', 'account_farming');
CREATE TYPE fraud_action AS ENUM ('warning', 'suspend_campaign', 'suspend_user', 'block_ip');
CREATE TYPE review_decision AS ENUM ('confirmed', 'false_positive', 'needs_investigation');

-- Device and technical enums
CREATE TYPE device_type AS ENUM ('mobile', 'tablet', 'desktop', 'bot');

-- Level system enums
CREATE TYPE reward_type AS ENUM ('daily_mission', 'xp_booster', 'achievement', 'daily_bonus', 'friend_referral', 'grade_upgrade', 'level_up');

-- Admin related enums
CREATE TYPE admin_role AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'SUPPORT');

-- Content related enums for templates
CREATE TYPE template_type AS ENUM ('social_post', 'story', 'video', 'blog', 'email');

-- ===================================
-- Core Tables
-- ===================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_uid UUID UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  nickname VARCHAR(50) UNIQUE,
  full_name VARCHAR(100),
  phone VARCHAR(20),
  profile_image_url TEXT,
  
  -- Level & XP System
  level INTEGER DEFAULT 1 CHECK (level >= 1 AND level <= 50),
  xp INTEGER DEFAULT 0 CHECK (xp >= 0),
  grade user_grade DEFAULT 'BRONZE',
  
  -- Status & Timestamps
  status user_status DEFAULT 'ACTIVE',
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  login_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Statistics
  total_earnings DECIMAL(15,2) DEFAULT 0,
  available_balance DECIMAL(15,2) DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  valid_clicks INTEGER DEFAULT 0,
  
  -- Referral System
  referral_code VARCHAR(20) UNIQUE,
  referred_by UUID REFERENCES users(id),
  referral_count INTEGER DEFAULT 0,
  
  -- Marketing consent
  marketing_consent BOOLEAN DEFAULT FALSE,
  notification_consent BOOLEAN DEFAULT TRUE,
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}',
  
  -- Security fields
  suspension_reason TEXT,
  suspended_until TIMESTAMP WITH TIME ZONE,
  failed_login_attempts INTEGER DEFAULT 0,
  last_failed_login TIMESTAMP WITH TIME ZONE
);

-- Businesses table
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_uid UUID UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  
  -- Business Information
  company_name VARCHAR(200) NOT NULL,
  business_registration_number VARCHAR(50) UNIQUE,
  industry business_industry NOT NULL,
  company_size company_size DEFAULT 'SMALL',
  
  -- Contact Information
  contact_person VARCHAR(100) NOT NULL,
  contact_phone VARCHAR(20) NOT NULL,
  contact_email VARCHAR(255),
  business_address TEXT,
  website_url TEXT,
  
  -- Verification & Status
  status business_status DEFAULT 'PENDING',
  verification_documents JSONB DEFAULT '[]',
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID,
  
  -- Billing Information
  billing_email VARCHAR(255),
  tax_id VARCHAR(50),
  
  -- Account Balance
  account_balance DECIMAL(15,2) DEFAULT 0,
  credit_limit DECIMAL(15,2) DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}'
);

-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  -- Campaign Basic Info
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category campaign_category NOT NULL,
  
  -- Campaign URLs and Requirements
  landing_url TEXT NOT NULL,
  requirements TEXT,
  target_audience TEXT,
  
  -- Budget and Pricing
  total_budget DECIMAL(15,2) NOT NULL CHECK (total_budget > 0),
  daily_budget DECIMAL(15,2),
  cpc_rate DECIMAL(8,2) NOT NULL CHECK (cpc_rate > 0),
  total_spent DECIMAL(15,2) DEFAULT 0,
  
  -- Status and Approval
  status matching_status DEFAULT 'ACTIVE',
  approval_status approval_status DEFAULT 'PENDING',
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  
  -- Campaign Duration
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  
  -- Performance Metrics
  total_impressions INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  valid_clicks INTEGER DEFAULT 0,
  conversion_count INTEGER DEFAULT 0,
  
  -- Targeting Options
  age_range_min INTEGER CHECK (age_range_min >= 13),
  age_range_max INTEGER CHECK (age_range_max <= 100),
  target_genders TEXT[], -- ['male', 'female', 'other']
  target_locations TEXT[], -- Countries or regions
  target_platforms social_platform[],
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}',
  
  CONSTRAINT valid_age_range CHECK (age_range_max IS NULL OR age_range_min IS NULL OR age_range_max >= age_range_min),
  CONSTRAINT valid_budget_allocation CHECK (daily_budget IS NULL OR daily_budget <= total_budget)
);

-- Templates table
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  
  -- Template Content
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  template_type template_type NOT NULL,
  
  -- Platform-specific content
  platform social_platform NOT NULL,
  platform_specific_content JSONB DEFAULT '{}',
  
  -- Media attachments
  image_urls TEXT[],
  video_url TEXT,
  hashtags TEXT[],
  
  -- Template Settings
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  max_usage INTEGER,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Campaigns (Matching) table
CREATE TABLE IF NOT EXISTS user_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  
  -- Matching Information
  platform social_platform NOT NULL,
  platform_username VARCHAR(100) NOT NULL,
  platform_followers INTEGER DEFAULT 0,
  
  -- Status and Tracking
  status matching_status DEFAULT 'ACTIVE',
  tracking_code VARCHAR(32) UNIQUE NOT NULL,
  
  -- Performance
  total_clicks INTEGER DEFAULT 0,
  valid_clicks INTEGER DEFAULT 0,
  total_earnings DECIMAL(10,2) DEFAULT 0,
  
  -- Timestamps
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}',
  
  UNIQUE(user_id, campaign_id, platform)
);

-- Click Events table (partitioned by date)
CREATE TABLE IF NOT EXISTS click_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_campaign_id UUID NOT NULL REFERENCES user_campaigns(id) ON DELETE CASCADE,
  
  -- Click Information
  ip_address INET NOT NULL,
  user_agent TEXT,
  referrer TEXT,
  
  -- Device and Location
  device_type device_type,
  country_code CHAR(2),
  city VARCHAR(100),
  
  -- Validation and Fraud Detection
  is_valid BOOLEAN,
  validation_score DECIMAL(3,2), -- 0.00 to 1.00
  fraud_score DECIMAL(3,2), -- 0.00 to 1.00
  
  -- Commission and Earnings
  commission_amount DECIMAL(8,2) DEFAULT 0,
  
  -- Timestamps
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  
  -- Session tracking
  session_id VARCHAR(128),
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}'
);

-- User Earnings table
CREATE TABLE IF NOT EXISTS user_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Earning Details
  transaction_type transaction_category NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
  source_id UUID, -- Could reference click_events, referrals, etc.
  
  -- Status and Processing
  status transaction_status DEFAULT 'PENDING',
  processed_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Description and metadata
  description TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Business Billing table
CREATE TABLE IF NOT EXISTS business_billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  -- Transaction Details
  transaction_type transaction_type NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  
  -- Payment Information
  payment_provider payment_provider,
  payment_reference VARCHAR(255),
  
  -- Status and Processing
  status transaction_status DEFAULT 'PENDING',
  processed_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Invoice and billing details
  invoice_number VARCHAR(100),
  billing_period_start DATE,
  billing_period_end DATE,
  
  -- Description and metadata
  description TEXT,
  metadata JSONB DEFAULT '{}'
);

-- User Transactions table
CREATE TABLE IF NOT EXISTS user_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Transaction Details
  transaction_type transaction_type NOT NULL,
  category transaction_category,
  amount DECIMAL(10,2) NOT NULL,
  
  -- Balance tracking
  balance_before DECIMAL(15,2) NOT NULL,
  balance_after DECIMAL(15,2) NOT NULL,
  
  -- Status and Processing
  status transaction_status DEFAULT 'PENDING',
  processed_at TIMESTAMP WITH TIME ZONE,
  
  -- Payout information (for withdrawals)
  payout_method payout_method,
  payout_details JSONB,
  
  -- External references
  external_reference VARCHAR(255),
  source_id UUID,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Description and metadata
  description TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Fraud Detection table
CREATE TABLE IF NOT EXISTS fraud_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  
  -- Detection Details
  fraud_type fraud_type NOT NULL,
  confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score BETWEEN 0 AND 1),
  
  -- Evidence and Context
  evidence JSONB NOT NULL DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  
  -- Review and Action
  is_confirmed BOOLEAN,
  review_decision review_decision,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  action_taken fraud_action,
  
  -- Timestamps
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Additional context
  metadata JSONB DEFAULT '{}'
);

-- User social accounts
CREATE TABLE IF NOT EXISTS user_social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Platform Information
  platform social_platform NOT NULL,
  platform_user_id VARCHAR(255),
  username VARCHAR(100) NOT NULL,
  display_name VARCHAR(100),
  
  -- Account Metrics
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  posts_count INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2), -- Percentage
  
  -- Verification and Status
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Profile Information
  profile_url TEXT,
  bio TEXT,
  profile_image_url TEXT,
  
  -- Timestamps
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_synced_at TIMESTAMP WITH TIME ZONE,
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}',
  
  UNIQUE(user_id, platform, username)
);

-- Daily bonuses table
CREATE TABLE IF NOT EXISTS daily_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Bonus Information
  date DATE NOT NULL,
  bonus_type reward_type NOT NULL,
  amount DECIMAL(8,2) DEFAULT 0,
  xp_bonus INTEGER DEFAULT 0,
  
  -- Streak tracking
  streak_day INTEGER DEFAULT 1,
  is_streak_bonus BOOLEAN DEFAULT FALSE,
  
  -- Status
  claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  UNIQUE(user_id, date, bonus_type)
);

-- Referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Referral tracking
  referral_code VARCHAR(20) NOT NULL,
  
  -- Rewards
  referrer_reward DECIMAL(8,2) DEFAULT 0,
  referred_reward DECIMAL(8,2) DEFAULT 0,
  referrer_xp INTEGER DEFAULT 0,
  referred_xp INTEGER DEFAULT 0,
  
  -- Status
  status matching_status DEFAULT 'ACTIVE',
  rewarded_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(referrer_id, referred_id)
);

-- Level Configuration table
CREATE TABLE IF NOT EXISTS level_config (
  level INTEGER PRIMARY KEY CHECK (level >= 1 AND level <= 50),
  grade user_grade NOT NULL,
  required_xp INTEGER NOT NULL CHECK (required_xp >= 0),
  grade_title VARCHAR(50) NOT NULL,
  level_title VARCHAR(50) NOT NULL,
  
  -- Bonuses and multipliers
  cpc_bonus_percentage DECIMAL(5,2) DEFAULT 0 CHECK (cpc_bonus_percentage >= 0),
  daily_bonus_base INTEGER DEFAULT 0 CHECK (daily_bonus_base >= 0),
  referral_bonus_percentage DECIMAL(5,2) DEFAULT 0 CHECK (referral_bonus_percentage >= 0),
  
  -- Level rewards
  level_up_reward DECIMAL(8,2) DEFAULT 0,
  level_up_xp_bonus INTEGER DEFAULT 0,
  
  -- Special perks (stored as JSON)
  perks JSONB DEFAULT '{}',
  
  -- Metadata
  description TEXT,
  icon_url TEXT,
  color_hex VARCHAR(7),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Queue messages table for async processing
CREATE TABLE IF NOT EXISTS queue_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel VARCHAR(100) NOT NULL,
  type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retry')),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  retry_at TIMESTAMP WITH TIME ZONE
);

-- ===================================
-- Indexes
-- ===================================

-- Users indexes
CREATE INDEX idx_users_auth_uid ON users(auth_uid);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_level ON users(level);
CREATE INDEX idx_users_referred_by ON users(referred_by);

-- Businesses indexes
CREATE INDEX idx_businesses_auth_uid ON businesses(auth_uid);
CREATE INDEX idx_businesses_status ON businesses(status);

-- Campaigns indexes
CREATE INDEX idx_campaigns_business_id ON campaigns(business_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_approval_status ON campaigns(approval_status);
CREATE INDEX idx_campaigns_category ON campaigns(category);
CREATE INDEX idx_campaigns_dates ON campaigns(start_date, end_date);

-- User Campaigns indexes
CREATE INDEX idx_user_campaigns_user_id ON user_campaigns(user_id);
CREATE INDEX idx_user_campaigns_campaign_id ON user_campaigns(campaign_id);
CREATE INDEX idx_user_campaigns_tracking_code ON user_campaigns(tracking_code);
CREATE INDEX idx_user_campaigns_status ON user_campaigns(status);

-- Click Events indexes
CREATE INDEX idx_click_events_user_campaign_id ON click_events(user_campaign_id);
CREATE INDEX idx_click_events_clicked_at ON click_events(clicked_at);
CREATE INDEX idx_click_events_ip_address ON click_events(ip_address);
CREATE INDEX idx_click_events_is_valid ON click_events(is_valid);

-- Transactions indexes
CREATE INDEX idx_user_earnings_user_id ON user_earnings(user_id);
CREATE INDEX idx_user_earnings_earned_at ON user_earnings(earned_at);
CREATE INDEX idx_user_transactions_user_id ON user_transactions(user_id);
CREATE INDEX idx_user_transactions_created_at ON user_transactions(created_at);
CREATE INDEX idx_business_billing_business_id ON business_billing(business_id);

-- Queue indexes
CREATE INDEX idx_queue_messages_channel ON queue_messages(channel);
CREATE INDEX idx_queue_messages_status ON queue_messages(status);
CREATE INDEX idx_queue_messages_created_at ON queue_messages(created_at);
CREATE INDEX idx_queue_messages_retry_at ON queue_messages(retry_at) WHERE status = 'retry';

-- ===================================
-- Row Level Security (RLS)
-- ===================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE click_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_messages ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = auth_uid);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = auth_uid);

-- Businesses policies
CREATE POLICY "Businesses can view own data" ON businesses FOR SELECT USING (auth.uid() = auth_uid);
CREATE POLICY "Businesses can update own data" ON businesses FOR UPDATE USING (auth.uid() = auth_uid);

-- Campaign policies
CREATE POLICY "Anyone can view approved campaigns" ON campaigns FOR SELECT USING (approval_status = 'APPROVED' AND status = 'ACTIVE');
CREATE POLICY "Business can manage own campaigns" ON campaigns FOR ALL USING (
  EXISTS (SELECT 1 FROM businesses WHERE businesses.auth_uid = auth.uid() AND businesses.id = campaigns.business_id)
);

-- User Campaigns policies
CREATE POLICY "Users can view own campaign participations" ON user_campaigns FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE users.auth_uid = auth.uid() AND users.id = user_campaigns.user_id)
);
CREATE POLICY "Users can manage own campaign participations" ON user_campaigns FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE users.auth_uid = auth.uid() AND users.id = user_campaigns.user_id)
);

-- Similar policies for other tables...

-- Admin access policies
CREATE POLICY "Service role can manage all" ON users FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can manage all campaigns" ON campaigns FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can manage all transactions" ON user_transactions FOR ALL USING (auth.role() = 'service_role');

-- ===================================
-- Essential Functions
-- ===================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Insert level configuration data
INSERT INTO level_config (level, grade, required_xp, grade_title, level_title, cpc_bonus_percentage, daily_bonus_base) VALUES
(1, 'BRONZE', 0, '브론즈', '새싹', 0, 50),
(2, 'BRONZE', 200, '브론즈', '새내기', 1, 55),
(3, 'BRONZE', 450, '브론즈', '탐험가', 2, 60),
(4, 'BRONZE', 750, '브론즈', '도전자', 3, 65),
(5, 'BRONZE', 1100, '브론즈', '개척자', 4, 70),
(6, 'BRONZE', 1500, '브론즈', '모험가', 5, 75),
(7, 'BRONZE', 1950, '브론즈', '용감한자', 6, 80),
(8, 'BRONZE', 2450, '브론즈', '정복자', 7, 85),
(9, 'BRONZE', 3000, '브론즈', '승리자', 8, 90),
(10, 'BRONZE', 3600, '브론즈', '브론즈 마스터', 10, 100),

(11, 'SILVER', 4250, '실버', '실버 루키', 12, 110),
(12, 'SILVER', 4950, '실버', '빛나는 별', 14, 120),
(13, 'SILVER', 5700, '실버', '월광 전사', 16, 130),
(14, 'SILVER', 6500, '실버', '은빛 바람', 18, 140),
(15, 'SILVER', 7350, '실버', '수호자', 20, 150),
(16, 'SILVER', 8250, '실버', '실버 나이트', 22, 160),
(17, 'SILVER', 9200, '실버', '영광의 방패', 24, 170),
(18, 'SILVER', 10200, '실버', '실버 에이스', 26, 180),
(19, 'SILVER', 11250, '실버', '정의의 검', 28, 190),
(20, 'SILVER', 12350, '실버', '실버 마스터', 30, 200),

(21, 'GOLD', 13500, '골드', '황금 새벽', 32, 220),
(22, 'GOLD', 14700, '골드', '찬란한 빛', 34, 240),
(23, 'GOLD', 15950, '골드', '골든 이글', 36, 260),
(24, 'GOLD', 17250, '골드', '황금 왕관', 38, 280),
(25, 'GOLD', 18600, '골드', '태양의 힘', 40, 300),
(26, 'GOLD', 20000, '골드', '골드 템플러', 42, 320),
(27, 'GOLD', 21450, '골드', '황금 전설', 44, 340),
(28, 'GOLD', 22950, '골드', '골든 드래곤', 46, 360),
(29, 'GOLD', 24500, '골드', '빛의 제왕', 48, 380),
(30, 'GOLD', 26100, '골드', '골드 마스터', 50, 400),

(31, 'DIAMOND', 27750, '다이아몬드', '다이아 스파크', 52, 450),
(32, 'DIAMOND', 29450, '다이아몬드', '영원한 빛', 54, 500),
(33, 'DIAMOND', 31200, '다이아몬드', '다이아 크리스탈', 56, 550),
(34, 'DIAMOND', 33000, '다이아몬드', '순수한 힘', 58, 600),
(35, 'DIAMOND', 34850, '다이아몬드', '다이아 소울', 60, 650),
(36, 'DIAMOND', 36750, '다이아몬드', '불멸의 빛', 62, 700),
(37, 'DIAMOND', 38700, '다이아몬드', '다이아 로드', 64, 750),
(38, 'DIAMOND', 40700, '다이아몬드', '절대자', 66, 800),
(39, 'DIAMOND', 42750, '다이아몬드', '다이아 킹', 68, 850),
(40, 'DIAMOND', 44850, '다이아몬드', '다이아몬드 마스터', 70, 900),

(41, 'PLATINUM', 47000, '플래티넘', '플래티넘 라이더', 72, 1000),
(42, 'PLATINUM', 49200, '플래티넘', '최고의 영혼', 74, 1100),
(43, 'PLATINUM', 51450, '플래티넘', '플래티넘 엠페러', 76, 1200),
(44, 'PLATINUM', 53750, '플래티넘', '무한의 힘', 78, 1300),
(45, 'PLATINUM', 56100, '플래티넘', '전설의 용사', 80, 1400),
(46, 'PLATINUM', 58500, '플래티넘', '플래티넘 갓', 82, 1500),
(47, 'PLATINUM', 60950, '플래티넘', '우주의 지배자', 84, 1600),
(48, 'PLATINUM', 63450, '플래티넘', '절대 강자', 86, 1700),
(49, 'PLATINUM', 66000, '플래티넘', '플래티넘 로드', 88, 1800),
(50, 'PLATINUM', 68600, '플래티넘', '트레잇 마스터', 90, 2000)
ON CONFLICT DO NOTHING;

-- Complete schema setup
COMMIT;