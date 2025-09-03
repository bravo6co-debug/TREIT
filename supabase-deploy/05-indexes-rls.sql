-- ============================================
-- 인덱스 생성 (성능 최적화)
-- ============================================

-- Users 인덱스 (안전하게 생성)
DO $$
BEGIN
    -- email 인덱스
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email') THEN
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    END IF;
    
    -- username 인덱스
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'username') THEN
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    END IF;
    
    -- referral_code 인덱스
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'referral_code') THEN
        CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
    END IF;
    
    -- status 인덱스
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'status') THEN
        CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
    END IF;
    
    -- grade 인덱스
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'grade') THEN
        CREATE INDEX IF NOT EXISTS idx_users_grade ON users(grade);
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Some user indexes may have issues: %', SQLERRM;
END$$;

-- Businesses 인덱스 (안전하게 생성)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'email') THEN
        CREATE INDEX IF NOT EXISTS idx_businesses_email ON businesses(email);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'status') THEN
        CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses(status);
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Some business indexes may have issues: %', SQLERRM;
END$$;

-- Campaigns 인덱스 (안전하게 생성)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'business_id') THEN
        CREATE INDEX IF NOT EXISTS idx_campaigns_business_id ON campaigns(business_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'approval_status') THEN
        CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(approval_status);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'is_active') THEN
        CREATE INDEX IF NOT EXISTS idx_campaigns_active ON campaigns(is_active);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'start_date') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'end_date') THEN
        CREATE INDEX IF NOT EXISTS idx_campaigns_dates ON campaigns(start_date, end_date);
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Some campaign indexes may have issues: %', SQLERRM;
END$$;

-- User Campaigns 인덱스 (안전하게 생성)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_campaigns') THEN
        CREATE INDEX IF NOT EXISTS idx_user_campaigns_user_id ON user_campaigns(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_campaigns_campaign_id ON user_campaigns(campaign_id);
        CREATE INDEX IF NOT EXISTS idx_user_campaigns_tracking_code ON user_campaigns(tracking_code);
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Some user_campaigns indexes may have issues: %', SQLERRM;
END$$;

-- Click Events 인덱스 (안전하게 생성)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'click_events') THEN
        CREATE INDEX IF NOT EXISTS idx_click_events_user_campaign_id ON click_events(user_campaign_id);
        CREATE INDEX IF NOT EXISTS idx_click_events_campaign_id ON click_events(campaign_id);
        CREATE INDEX IF NOT EXISTS idx_click_events_user_id ON click_events(user_id);
        CREATE INDEX IF NOT EXISTS idx_click_events_time ON click_events(click_time);
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Some click_events indexes may have issues: %', SQLERRM;
END$$;

-- User Earnings 인덱스 (안전하게 생성)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_earnings') THEN
        CREATE INDEX IF NOT EXISTS idx_user_earnings_user_id ON user_earnings(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_earnings_created ON user_earnings(created_at);
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Some user_earnings indexes may have issues: %', SQLERRM;
END$$;

-- Business Billing 인덱스 (안전하게 생성)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_billing') THEN
        CREATE INDEX IF NOT EXISTS idx_business_billing_business_id ON business_billing(business_id);
        CREATE INDEX IF NOT EXISTS idx_business_billing_status ON business_billing(status);
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Some business_billing indexes may have issues: %', SQLERRM;
END$$;

-- Community 인덱스 (안전하게 생성)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'community_posts') THEN
        CREATE INDEX IF NOT EXISTS idx_community_posts_author ON community_posts(author_id);
        CREATE INDEX IF NOT EXISTS idx_community_posts_created ON community_posts(created_at);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'community_comments') THEN
        CREATE INDEX IF NOT EXISTS idx_community_comments_post ON community_comments(post_id);
        CREATE INDEX IF NOT EXISTS idx_community_comments_author ON community_comments(author_id);
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Some community indexes may have issues: %', SQLERRM;
END$$;

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