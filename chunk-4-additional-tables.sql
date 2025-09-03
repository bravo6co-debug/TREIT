-- ===================================
-- TreitMaster Schema - Chunk 4
-- Additional Tables & System Tables
-- ===================================

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