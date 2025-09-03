-- ===================================
-- TreitMaster Schema - Chunk 2
-- Core Tables (Users, Businesses, Campaigns)
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