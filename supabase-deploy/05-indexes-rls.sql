-- ============================================
-- 인덱스 생성 (성능 최적화)
-- ============================================

-- Users 인덱스
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_grade ON users(grade);

-- Businesses 인덱스
CREATE INDEX IF NOT EXISTS idx_businesses_email ON businesses(email);
CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses(status);

-- Campaigns 인덱스
CREATE INDEX IF NOT EXISTS idx_campaigns_business_id ON campaigns(business_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(approval_status);
CREATE INDEX IF NOT EXISTS idx_campaigns_active ON campaigns(is_active);
CREATE INDEX IF NOT EXISTS idx_campaigns_dates ON campaigns(start_date, end_date);

-- User Campaigns 인덱스
CREATE INDEX IF NOT EXISTS idx_user_campaigns_user_id ON user_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_user_campaigns_campaign_id ON user_campaigns(campaign_id);
CREATE INDEX IF NOT EXISTS idx_user_campaigns_tracking_code ON user_campaigns(tracking_code);

-- Click Events 인덱스
CREATE INDEX IF NOT EXISTS idx_click_events_user_campaign_id ON click_events(user_campaign_id);
CREATE INDEX IF NOT EXISTS idx_click_events_campaign_id ON click_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_click_events_user_id ON click_events(user_id);
CREATE INDEX IF NOT EXISTS idx_click_events_time ON click_events(click_time);

-- User Earnings 인덱스
CREATE INDEX IF NOT EXISTS idx_user_earnings_user_id ON user_earnings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_earnings_created ON user_earnings(created_at);

-- Business Billing 인덱스
CREATE INDEX IF NOT EXISTS idx_business_billing_business_id ON business_billing(business_id);
CREATE INDEX IF NOT EXISTS idx_business_billing_status ON business_billing(status);

-- Community 인덱스
CREATE INDEX IF NOT EXISTS idx_community_posts_author ON community_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_created ON community_posts(created_at);
CREATE INDEX IF NOT EXISTS idx_community_comments_post ON community_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_author ON community_comments(author_id);

-- ============================================
-- Row Level Security (RLS) 활성화
-- ============================================

-- RLS 활성화
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

-- ============================================
-- RLS 정책 생성 (기본 정책)
-- ============================================

-- Users 테이블 정책 (안전하게 생성)
DO $$
BEGIN
    -- Users 정책
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Public profiles are viewable by everyone') THEN
        CREATE POLICY "Public profiles are viewable by everyone" 
        ON users FOR SELECT 
        USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can update own profile') THEN
        CREATE POLICY "Users can update own profile" 
        ON users FOR UPDATE 
        USING (auth.uid()::text = id::text);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can insert own profile') THEN
        CREATE POLICY "Users can insert own profile" 
        ON users FOR INSERT 
        WITH CHECK (auth.uid()::text = id::text);
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Some user policies may already exist, continuing...';
END$$;

-- Community Posts 정책 (안전하게 생성)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_posts' AND policyname = 'Anyone can view posts') THEN
        CREATE POLICY "Anyone can view posts" 
        ON community_posts FOR SELECT 
        USING (NOT is_deleted);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_posts' AND policyname = 'Users can create own posts') THEN
        CREATE POLICY "Users can create own posts" 
        ON community_posts FOR INSERT 
        WITH CHECK (auth.uid()::text = author_id::text);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_posts' AND policyname = 'Users can update own posts') THEN
        CREATE POLICY "Users can update own posts" 
        ON community_posts FOR UPDATE 
        USING (auth.uid()::text = author_id::text);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_posts' AND policyname = 'Users can delete own posts') THEN
        CREATE POLICY "Users can delete own posts" 
        ON community_posts FOR DELETE 
        USING (auth.uid()::text = author_id::text);
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Some community posts policies may already exist, continuing...';
END$$;

-- Community Comments 정책 (안전하게 생성)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_comments' AND policyname = 'Anyone can view comments') THEN
        CREATE POLICY "Anyone can view comments" 
        ON community_comments FOR SELECT 
        USING (NOT is_deleted);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_comments' AND policyname = 'Users can create comments') THEN
        CREATE POLICY "Users can create comments" 
        ON community_comments FOR INSERT 
        WITH CHECK (auth.uid()::text = author_id::text);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_comments' AND policyname = 'Users can update own comments') THEN
        CREATE POLICY "Users can update own comments" 
        ON community_comments FOR UPDATE 
        USING (auth.uid()::text = author_id::text);
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Some community comments policies may already exist, continuing...';
END$$;

-- Community Likes 정책 (안전하게 생성)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_likes' AND policyname = 'Anyone can view likes') THEN
        CREATE POLICY "Anyone can view likes" 
        ON community_likes FOR SELECT 
        USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_likes' AND policyname = 'Users can like posts/comments') THEN
        CREATE POLICY "Users can like posts/comments" 
        ON community_likes FOR INSERT 
        WITH CHECK (auth.uid()::text = user_id::text);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_likes' AND policyname = 'Users can remove own likes') THEN
        CREATE POLICY "Users can remove own likes" 
        ON community_likes FOR DELETE 
        USING (auth.uid()::text = user_id::text);
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Some community likes policies may already exist, continuing...';
END$$;

-- ============================================
-- 권한 부여
-- ============================================

-- 스키마 사용 권한
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 테이블 권한
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '✅ Indexes and RLS policies created successfully!';
END$$;