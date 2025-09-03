-- TreitMaster Safe Database Schema Deployment
-- This script can be run multiple times safely (idempotent)
-- It checks for existing objects before creating them

-- ============================================
-- STEP 1: Extensions
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- STEP 2: ENUM Types (with safe creation)
-- ============================================

-- Helper function to check if type exists
DO $$ 
BEGIN
    -- user_status
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
        CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED');
    END IF;
    
    -- user_grade
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_grade') THEN
        CREATE TYPE user_grade AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'DIAMOND', 'PLATINUM');
    END IF;
    
    -- social_platform
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'social_platform') THEN
        CREATE TYPE social_platform AS ENUM ('INSTAGRAM', 'FACEBOOK', 'TWITTER', 'TIKTOK', 'YOUTUBE', 'BLOG');
    END IF;
    
    -- business_status
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'business_status') THEN
        CREATE TYPE business_status AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED');
    END IF;
    
    -- business_industry
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'business_industry') THEN
        CREATE TYPE business_industry AS ENUM ('RETAIL', 'FOOD', 'BEAUTY', 'FITNESS', 'EDUCATION', 'TECH', 'OTHER');
    END IF;
    
    -- company_size
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'company_size') THEN
        CREATE TYPE company_size AS ENUM ('SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE');
    END IF;
    
    -- campaign_category
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'campaign_category') THEN
        CREATE TYPE campaign_category AS ENUM ('PRODUCT', 'SERVICE', 'EVENT', 'BRAND', 'APP', 'OTHER');
    END IF;
    
    -- approval_status
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_status') THEN
        CREATE TYPE approval_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
    END IF;
    
    -- matching_status
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'matching_status') THEN
        CREATE TYPE matching_status AS ENUM ('ACTIVE', 'COMPLETED', 'PAUSED', 'CANCELLED');
    END IF;
    
    -- transaction_type
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
        CREATE TYPE transaction_type AS ENUM ('earning', 'withdrawal', 'charge', 'refund');
    END IF;
    
    -- transaction_category
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_category') THEN
        CREATE TYPE transaction_category AS ENUM ('click', 'bonus', 'referral', 'penalty');
    END IF;
    
    -- transaction_status
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_status') THEN
        CREATE TYPE transaction_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');
    END IF;
    
    -- payment_provider
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_provider') THEN
        CREATE TYPE payment_provider AS ENUM ('stripe', 'toss', 'bank_transfer');
    END IF;
    
    -- payout_method
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payout_method') THEN
        CREATE TYPE payout_method AS ENUM ('bank', 'card', 'paypal');
    END IF;
    
    -- billing_cycle
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_cycle') THEN
        CREATE TYPE billing_cycle AS ENUM ('daily', 'weekly', 'monthly', 'quarterly');
    END IF;
    
    -- fraud_type
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fraud_type') THEN
        CREATE TYPE fraud_type AS ENUM ('click_spam', 'bot_activity', 'ip_farming', 'pattern_anomaly', 'account_farming');
    END IF;
    
    -- fraud_action
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fraud_action') THEN
        CREATE TYPE fraud_action AS ENUM ('warning', 'suspend_campaign', 'suspend_user', 'block_ip');
    END IF;
    
    -- review_decision
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_decision') THEN
        CREATE TYPE review_decision AS ENUM ('confirmed', 'false_positive', 'needs_investigation');
    END IF;
    
    -- device_type
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'device_type') THEN
        CREATE TYPE device_type AS ENUM ('mobile', 'tablet', 'desktop', 'bot');
    END IF;
    
    -- reward_type
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reward_type') THEN
        CREATE TYPE reward_type AS ENUM ('daily_mission', 'xp_booster', 'achievement', 'daily_bonus', 'friend_referral', 'grade_upgrade', 'level_up');
    END IF;
    
    -- admin_role
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_role') THEN
        CREATE TYPE admin_role AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'SUPPORT');
    END IF;
    
    -- template_type
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'template_type') THEN
        CREATE TYPE template_type AS ENUM ('social_post', 'story', 'video', 'blog', 'email');
    END IF;
END$$;

-- ============================================
-- STEP 3: Core Tables
-- ============================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE,
    full_name VARCHAR(255),
    avatar_url TEXT,
    phone VARCHAR(20),
    birth_date DATE,
    gender VARCHAR(10),
    status user_status DEFAULT 'ACTIVE',
    grade user_grade DEFAULT 'BRONZE',
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    total_earnings DECIMAL(15, 2) DEFAULT 0,
    balance DECIMAL(15, 2) DEFAULT 0,
    referral_code VARCHAR(20) UNIQUE,
    referred_by UUID REFERENCES users(id),
    is_email_verified BOOLEAN DEFAULT false,
    is_phone_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    phone_verified_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Businesses table
CREATE TABLE IF NOT EXISTS businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    business_number VARCHAR(50) UNIQUE,
    representative_name VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    industry business_industry,
    company_size company_size,
    website_url TEXT,
    logo_url TEXT,
    status business_status DEFAULT 'PENDING',
    balance DECIMAL(15, 2) DEFAULT 0,
    total_spent DECIMAL(15, 2) DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMP WITH TIME ZONE,
    documents JSONB DEFAULT '[]',
    bank_account JSONB,
    tax_info JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Social accounts table
CREATE TABLE IF NOT EXISTS social_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform social_platform NOT NULL,
    account_id VARCHAR(255),
    username VARCHAR(255),
    display_name VARCHAR(255),
    profile_url TEXT,
    follower_count INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, platform, account_id)
);

-- Campaigns table
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

-- Templates table
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    type template_type NOT NULL,
    name VARCHAR(255),
    content TEXT NOT NULL,
    media_urls JSONB DEFAULT '[]',
    hashtags JSONB DEFAULT '[]',
    mentions JSONB DEFAULT '[]',
    cta_text VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    performance_data JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User campaigns table
CREATE TABLE IF NOT EXISTS user_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    template_id UUID REFERENCES templates(id),
    social_account_id UUID REFERENCES social_accounts(id),
    status matching_status DEFAULT 'ACTIVE',
    shared_url TEXT,
    tracking_code VARCHAR(50) UNIQUE,
    total_clicks INTEGER DEFAULT 0,
    total_earnings DECIMAL(15, 2) DEFAULT 0,
    last_click_at TIMESTAMP WITH TIME ZONE,
    post_url TEXT,
    post_id VARCHAR(255),
    posted_at TIMESTAMP WITH TIME ZONE,
    performance_data JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, campaign_id)
);

-- Click events table
CREATE TABLE IF NOT EXISTS click_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_campaign_id UUID NOT NULL REFERENCES user_campaigns(id),
    campaign_id UUID NOT NULL REFERENCES campaigns(id),
    user_id UUID NOT NULL REFERENCES users(id),
    ip_address INET,
    ip_location JSONB,
    user_agent TEXT,
    device_type device_type,
    device_info JSONB,
    referrer_url TEXT,
    landing_url TEXT,
    session_id VARCHAR(255),
    is_unique BOOLEAN DEFAULT true,
    is_valid BOOLEAN DEFAULT true,
    fraud_score DECIMAL(3, 2),
    fraud_reasons JSONB DEFAULT '[]',
    click_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    dwell_time INTEGER,
    bounce BOOLEAN DEFAULT false,
    conversion BOOLEAN DEFAULT false,
    conversion_value DECIMAL(15, 2),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User earnings table
CREATE TABLE IF NOT EXISTS user_earnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id),
    user_campaign_id UUID REFERENCES user_campaigns(id),
    click_event_id UUID REFERENCES click_events(id),
    type transaction_type NOT NULL,
    category transaction_category,
    amount DECIMAL(15, 2) NOT NULL,
    status transaction_status DEFAULT 'COMPLETED',
    description TEXT,
    reference_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Business billing table
CREATE TABLE IF NOT EXISTS business_billing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id),
    type transaction_type NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    status transaction_status DEFAULT 'PENDING',
    payment_provider payment_provider,
    payment_method JSONB,
    transaction_id VARCHAR(255) UNIQUE,
    invoice_number VARCHAR(50),
    invoice_url TEXT,
    paid_at TIMESTAMP WITH TIME ZONE,
    due_date DATE,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STEP 4: Additional Tables
-- ============================================

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    role admin_role DEFAULT 'SUPPORT',
    is_active BOOLEAN DEFAULT true,
    permissions JSONB DEFAULT '{}',
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Fraud detection table
CREATE TABLE IF NOT EXISTS fraud_detection (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    campaign_id UUID REFERENCES campaigns(id),
    click_event_id UUID REFERENCES click_events(id),
    fraud_type fraud_type NOT NULL,
    confidence_score DECIMAL(3, 2) NOT NULL,
    detection_data JSONB NOT NULL,
    action_taken fraud_action,
    reviewed_by UUID REFERENCES admin_users(id),
    review_decision review_decision,
    review_notes TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    business_id UUID REFERENCES businesses(id),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50),
    priority VARCHAR(20) DEFAULT 'normal',
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Rewards table
CREATE TABLE IF NOT EXISTS rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type reward_type NOT NULL,
    amount DECIMAL(15, 2),
    xp_points INTEGER,
    description TEXT,
    achieved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_claimed BOOLEAN DEFAULT false,
    claimed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Level config table
CREATE TABLE IF NOT EXISTS level_config (
    level INTEGER PRIMARY KEY,
    grade user_grade NOT NULL,
    required_xp INTEGER NOT NULL,
    cpc_bonus_rate DECIMAL(5, 2) DEFAULT 0,
    daily_bonus INTEGER DEFAULT 0,
    referral_bonus INTEGER DEFAULT 0,
    grade_title VARCHAR(50),
    level_title VARCHAR(100),
    benefits JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Withdrawal requests table
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    amount DECIMAL(15, 2) NOT NULL,
    fee DECIMAL(15, 2) DEFAULT 0,
    net_amount DECIMAL(15, 2) NOT NULL,
    payout_method payout_method NOT NULL,
    payout_details JSONB NOT NULL,
    status transaction_status DEFAULT 'PENDING',
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES admin_users(id),
    transaction_id VARCHAR(255),
    rejection_reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Analytics daily table
CREATE TABLE IF NOT EXISTS analytics_daily (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    metrics JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, entity_type, entity_id)
);

-- System logs table
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level VARCHAR(20) NOT NULL,
    category VARCHAR(100),
    message TEXT NOT NULL,
    user_id UUID,
    business_id UUID,
    admin_id UUID,
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(255),
    error_stack TEXT,
    context JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Community posts table
CREATE TABLE IF NOT EXISTS community_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50),
    tags TEXT[],
    images TEXT[],
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Community comments table
CREATE TABLE IF NOT EXISTS community_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES community_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    like_count INTEGER DEFAULT 0,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID,
    edited_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Community likes table
CREATE TABLE IF NOT EXISTS community_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES community_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, post_id),
    UNIQUE(user_id, comment_id),
    CHECK ((post_id IS NOT NULL AND comment_id IS NULL) OR (post_id IS NULL AND comment_id IS NOT NULL))
);

-- ============================================
-- STEP 5: Indexes (IF NOT EXISTS)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_grade ON users(grade);

CREATE INDEX IF NOT EXISTS idx_businesses_email ON businesses(email);
CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses(status);

CREATE INDEX IF NOT EXISTS idx_campaigns_business_id ON campaigns(business_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(approval_status);
CREATE INDEX IF NOT EXISTS idx_campaigns_active ON campaigns(is_active);
CREATE INDEX IF NOT EXISTS idx_campaigns_dates ON campaigns(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_user_campaigns_user_id ON user_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_user_campaigns_campaign_id ON user_campaigns(campaign_id);
CREATE INDEX IF NOT EXISTS idx_user_campaigns_tracking_code ON user_campaigns(tracking_code);

CREATE INDEX IF NOT EXISTS idx_click_events_user_campaign_id ON click_events(user_campaign_id);
CREATE INDEX IF NOT EXISTS idx_click_events_campaign_id ON click_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_click_events_user_id ON click_events(user_id);
CREATE INDEX IF NOT EXISTS idx_click_events_time ON click_events(click_time);

CREATE INDEX IF NOT EXISTS idx_user_earnings_user_id ON user_earnings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_earnings_created ON user_earnings(created_at);

CREATE INDEX IF NOT EXISTS idx_business_billing_business_id ON business_billing(business_id);
CREATE INDEX IF NOT EXISTS idx_business_billing_status ON business_billing(status);

CREATE INDEX IF NOT EXISTS idx_community_posts_author ON community_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_created ON community_posts(created_at);
CREATE INDEX IF NOT EXISTS idx_community_comments_post ON community_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_author ON community_comments(author_id);

-- ============================================
-- STEP 6: Row Level Security (RLS)
-- ============================================

-- Enable RLS on tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE click_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_likes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (safe - won't error if exists)
DO $$
BEGIN
    -- Users policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can view own profile') THEN
        CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can update own profile') THEN
        CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
    END IF;
    
    -- Add more policies as needed...
END$$;

-- ============================================
-- STEP 7: Initial Data (Safe insertion)
-- ============================================

-- Insert level configurations (only if table is empty)
INSERT INTO level_config (level, grade, required_xp, cpc_bonus_rate, daily_bonus, referral_bonus, grade_title, level_title)
SELECT * FROM (VALUES
    (1, 'BRONZE', 0, 0, 10, 100, '브론즈', '새싹 인플루언서'),
    (2, 'BRONZE', 100, 0, 10, 100, '브론즈', '성장하는 인플루언서'),
    (3, 'BRONZE', 300, 0.5, 15, 150, '브론즈', '활발한 인플루언서'),
    (4, 'BRONZE', 600, 0.5, 15, 150, '브론즈', '인기있는 인플루언서'),
    (5, 'BRONZE', 1000, 1, 20, 200, '브론즈', '주목받는 인플루언서'),
    (6, 'SILVER', 1500, 2, 25, 250, '실버', '빛나는 인플루언서'),
    (7, 'SILVER', 2100, 2, 25, 250, '실버', '영향력 있는 인플루언서'),
    (8, 'SILVER', 2800, 2.5, 30, 300, '실버', '신뢰받는 인플루언서'),
    (9, 'SILVER', 3600, 2.5, 30, 300, '실버', '프로 인플루언서'),
    (10, 'SILVER', 4500, 3, 35, 350, '실버', '실버 마스터')
) AS v(level, grade, required_xp, cpc_bonus_rate, daily_bonus, referral_bonus, grade_title, level_title)
WHERE NOT EXISTS (SELECT 1 FROM level_config LIMIT 1);

-- ============================================
-- STEP 8: Grant permissions
-- ============================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant permissions on tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- ============================================
-- Completion message
-- ============================================
DO $$
BEGIN
    RAISE NOTICE 'Safe schema deployment completed successfully!';
END$$;