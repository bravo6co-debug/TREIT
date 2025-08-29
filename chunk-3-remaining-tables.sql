-- ===================================
-- TreitMaster Schema - Chunk 3
-- Remaining Tables
-- ===================================

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