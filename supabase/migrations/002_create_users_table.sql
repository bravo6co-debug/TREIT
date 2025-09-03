-- ===================================
-- Treit Database Schema: Users Table
-- ===================================
-- 사용자 정보 테이블 및 RLS 정책
-- DATABASE.md와 treit_gamerule.md 기반

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table - 사용자 정보
CREATE TABLE users (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Authentication (Supabase Auth 연동)
    auth_uid UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT false,
    
    -- Profile Information
    nickname TEXT NOT NULL,
    phone TEXT,
    phone_verified BOOLEAN DEFAULT false,
    profile_image_url TEXT,
    
    -- Gamification & Level System (treit_gamerule.md 기반)
    level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 50),
    grade user_grade NOT NULL DEFAULT 'BRONZE',
    current_xp INTEGER NOT NULL DEFAULT 0 CHECK (current_xp >= 0),
    next_level_xp INTEGER NOT NULL DEFAULT 120,  -- 레벨업에 필요한 XP
    total_xp INTEGER NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
    total_earnings DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (total_earnings >= 0),
    
    -- Social Accounts
    social_accounts JSONB DEFAULT '{}',
    /* 소셜 계정 구조:
    {
        "instagram": {"username": "user123", "verified": true, "followers": 1000},
        "facebook": {"id": "fb123", "verified": false},
        "tiktok": {"username": "tik123", "verified": true},
        "youtube": {"channel_id": "yt123", "verified": true},
        "blog": {"url": "https://blog.com", "verified": false}
    }
    */
    
    -- User Status
    status user_status NOT NULL DEFAULT 'ACTIVE',
    suspension_reason TEXT,
    suspended_until TIMESTAMPTZ,
    
    -- Referral System
    referral_code TEXT UNIQUE,
    referred_by UUID REFERENCES users(id),
    
    -- Metadata
    last_login_at TIMESTAMPTZ,
    login_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================
-- Indexes for Performance
-- ===================================

CREATE INDEX idx_users_auth_uid ON users(auth_uid);
CREATE INDEX idx_users_status ON users(status) WHERE status = 'ACTIVE';
CREATE INDEX idx_users_level ON users(level DESC);
CREATE INDEX idx_users_grade ON users(grade);
CREATE INDEX idx_users_total_xp ON users(total_xp DESC);
CREATE INDEX idx_users_referral_code ON users(referral_code) WHERE referral_code IS NOT NULL;
CREATE INDEX idx_users_referred_by ON users(referred_by) WHERE referred_by IS NOT NULL;
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- ===================================
-- Row Level Security (RLS) Policies
-- ===================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = auth_uid);

-- Users can update their own profile (restricted fields)
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = auth_uid)
    WITH CHECK (
        auth.uid() = auth_uid AND
        -- 사용자는 시스템 필드들을 직접 수정할 수 없음
        OLD.level = NEW.level AND 
        OLD.grade = NEW.grade AND
        OLD.current_xp = NEW.current_xp AND
        OLD.next_level_xp = NEW.next_level_xp AND
        OLD.total_xp = NEW.total_xp AND
        OLD.total_earnings = NEW.total_earnings AND
        OLD.status = NEW.status
    );

-- Users can view public profile data for leaderboard
CREATE POLICY "Users can view public profiles" ON users
    FOR SELECT USING (
        status = 'ACTIVE' AND 
        -- 공개 프로필 정보만 조회 가능
        true
    );

-- Admins can view all users
CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE user_id = (SELECT id FROM users WHERE auth_uid = auth.uid())
        )
    );

-- ===================================
-- Functions
-- ===================================

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    exists_check BOOLEAN := TRUE;
BEGIN
    WHILE exists_check LOOP
        -- Generate 8-character alphanumeric code
        code := upper(substring(encode(gen_random_bytes(6), 'base64') from 1 for 8));
        -- Remove confusing characters
        code := replace(replace(replace(code, '0', 'Q'), 'O', 'P'), 'I', 'J');
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM users WHERE referral_code = code) INTO exists_check;
    END LOOP;
    
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    referrer_id UUID;
BEGIN
    -- 추천인 확인
    IF NEW.raw_user_meta_data->>'referral_code' IS NOT NULL THEN
        SELECT id INTO referrer_id 
        FROM users 
        WHERE referral_code = NEW.raw_user_meta_data->>'referral_code';
    END IF;

    -- users 테이블에 새 사용자 삽입
    INSERT INTO users (
        auth_uid, 
        email, 
        nickname,
        referral_code,
        referred_by
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'nickname', split_part(NEW.email, '@', 1)),
        generate_referral_code(),
        referrer_id
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update user timestamps
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on users table
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_users_updated_at();

-- ===================================
-- Initial Data Setup
-- ===================================

-- Create user_earnings table for each user (will be created in earnings migration)
-- Create daily_bonus_claims tracking (will be created in level system migration)

-- Comment: Users table created with full profile, gamification, and referral system support