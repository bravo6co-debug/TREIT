-- ===================================
-- TreitMaster Schema - Chunk 5
-- Indexes and Row Level Security
-- ===================================

-- ===================================
-- Indexes
-- ===================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_auth_uid ON users(auth_uid);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_level ON users(level);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);

-- Businesses indexes
CREATE INDEX IF NOT EXISTS idx_businesses_auth_uid ON businesses(auth_uid);
CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses(status);

-- Campaigns indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_business_id ON campaigns(business_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_approval_status ON campaigns(approval_status);
CREATE INDEX IF NOT EXISTS idx_campaigns_category ON campaigns(category);
CREATE INDEX IF NOT EXISTS idx_campaigns_dates ON campaigns(start_date, end_date);

-- User Campaigns indexes
CREATE INDEX IF NOT EXISTS idx_user_campaigns_user_id ON user_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_user_campaigns_campaign_id ON user_campaigns(campaign_id);
CREATE INDEX IF NOT EXISTS idx_user_campaigns_tracking_code ON user_campaigns(tracking_code);
CREATE INDEX IF NOT EXISTS idx_user_campaigns_status ON user_campaigns(status);

-- Click Events indexes
CREATE INDEX IF NOT EXISTS idx_click_events_user_campaign_id ON click_events(user_campaign_id);
CREATE INDEX IF NOT EXISTS idx_click_events_clicked_at ON click_events(clicked_at);
CREATE INDEX IF NOT EXISTS idx_click_events_ip_address ON click_events(ip_address);
CREATE INDEX IF NOT EXISTS idx_click_events_is_valid ON click_events(is_valid);

-- Transactions indexes
CREATE INDEX IF NOT EXISTS idx_user_earnings_user_id ON user_earnings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_earnings_earned_at ON user_earnings(earned_at);
CREATE INDEX IF NOT EXISTS idx_user_transactions_user_id ON user_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_transactions_created_at ON user_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_business_billing_business_id ON business_billing(business_id);

-- Queue indexes
CREATE INDEX IF NOT EXISTS idx_queue_messages_channel ON queue_messages(channel);
CREATE INDEX IF NOT EXISTS idx_queue_messages_status ON queue_messages(status);
CREATE INDEX IF NOT EXISTS idx_queue_messages_created_at ON queue_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_queue_messages_retry_at ON queue_messages(retry_at) WHERE status = 'retry';

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
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = auth_uid);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = auth_uid);

-- Businesses policies  
DROP POLICY IF EXISTS "Businesses can view own data" ON businesses;
DROP POLICY IF EXISTS "Businesses can update own data" ON businesses;
CREATE POLICY "Businesses can view own data" ON businesses FOR SELECT USING (auth.uid() = auth_uid);
CREATE POLICY "Businesses can update own data" ON businesses FOR UPDATE USING (auth.uid() = auth_uid);

-- Campaign policies
DROP POLICY IF EXISTS "Anyone can view approved campaigns" ON campaigns;
DROP POLICY IF EXISTS "Business can manage own campaigns" ON campaigns;
CREATE POLICY "Anyone can view approved campaigns" ON campaigns FOR SELECT USING (approval_status = 'APPROVED' AND status = 'ACTIVE');
CREATE POLICY "Business can manage own campaigns" ON campaigns FOR ALL USING (
  EXISTS (SELECT 1 FROM businesses WHERE businesses.auth_uid = auth.uid() AND businesses.id = campaigns.business_id)
);

-- User Campaigns policies
DROP POLICY IF EXISTS "Users can view own campaign participations" ON user_campaigns;
DROP POLICY IF EXISTS "Users can manage own campaign participations" ON user_campaigns;
CREATE POLICY "Users can view own campaign participations" ON user_campaigns FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE users.auth_uid = auth.uid() AND users.id = user_campaigns.user_id)
);
CREATE POLICY "Users can manage own campaign participations" ON user_campaigns FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE users.auth_uid = auth.uid() AND users.id = user_campaigns.user_id)
);

-- Admin access policies
DROP POLICY IF EXISTS "Service role can manage all users" ON users;
DROP POLICY IF EXISTS "Service role can manage all campaigns" ON campaigns;  
DROP POLICY IF EXISTS "Service role can manage all transactions" ON user_transactions;
CREATE POLICY "Service role can manage all users" ON users FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can manage all campaigns" ON campaigns FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can manage all transactions" ON user_transactions FOR ALL USING (auth.role() = 'service_role');