-- ============================================
-- STEP 1: Extensions (필수 확장 기능)
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- STEP 2: ENUM Types (사용자 정의 타입)
-- ============================================

DO $$ 
BEGIN
    -- 사용자 상태
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
        CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED');
    END IF;
    
    -- 사용자 등급
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_grade') THEN
        CREATE TYPE user_grade AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'DIAMOND', 'PLATINUM');
    END IF;
    
    -- 소셜 플랫폼
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'social_platform') THEN
        CREATE TYPE social_platform AS ENUM ('INSTAGRAM', 'FACEBOOK', 'TWITTER', 'TIKTOK', 'YOUTUBE', 'BLOG');
    END IF;
    
    -- 비즈니스 상태
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'business_status') THEN
        CREATE TYPE business_status AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED');
    END IF;
    
    -- 비즈니스 산업
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'business_industry') THEN
        CREATE TYPE business_industry AS ENUM ('RETAIL', 'FOOD', 'BEAUTY', 'FITNESS', 'EDUCATION', 'TECH', 'OTHER');
    END IF;
    
    -- 회사 규모
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'company_size') THEN
        CREATE TYPE company_size AS ENUM ('SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE');
    END IF;
    
    -- 캠페인 카테고리
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'campaign_category') THEN
        CREATE TYPE campaign_category AS ENUM ('PRODUCT', 'SERVICE', 'EVENT', 'BRAND', 'APP', 'OTHER');
    END IF;
    
    -- 승인 상태
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_status') THEN
        CREATE TYPE approval_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
    END IF;
    
    -- 매칭 상태
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'matching_status') THEN
        CREATE TYPE matching_status AS ENUM ('ACTIVE', 'COMPLETED', 'PAUSED', 'CANCELLED');
    END IF;
    
    -- 거래 타입
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
        CREATE TYPE transaction_type AS ENUM ('earning', 'withdrawal', 'charge', 'refund');
    END IF;
    
    -- 거래 카테고리
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_category') THEN
        CREATE TYPE transaction_category AS ENUM ('click', 'bonus', 'referral', 'penalty');
    END IF;
    
    -- 거래 상태
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_status') THEN
        CREATE TYPE transaction_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');
    END IF;
    
    -- 결제 제공자
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_provider') THEN
        CREATE TYPE payment_provider AS ENUM ('stripe', 'toss', 'bank_transfer');
    END IF;
    
    -- 출금 방법
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payout_method') THEN
        CREATE TYPE payout_method AS ENUM ('bank', 'card', 'paypal');
    END IF;
    
    -- 정산 주기
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_cycle') THEN
        CREATE TYPE billing_cycle AS ENUM ('daily', 'weekly', 'monthly', 'quarterly');
    END IF;
    
    -- 사기 타입
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fraud_type') THEN
        CREATE TYPE fraud_type AS ENUM ('click_spam', 'bot_activity', 'ip_farming', 'pattern_anomaly', 'account_farming');
    END IF;
    
    -- 사기 액션
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fraud_action') THEN
        CREATE TYPE fraud_action AS ENUM ('warning', 'suspend_campaign', 'suspend_user', 'block_ip');
    END IF;
    
    -- 리뷰 결정
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_decision') THEN
        CREATE TYPE review_decision AS ENUM ('confirmed', 'false_positive', 'needs_investigation');
    END IF;
    
    -- 디바이스 타입
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'device_type') THEN
        CREATE TYPE device_type AS ENUM ('mobile', 'tablet', 'desktop', 'bot');
    END IF;
    
    -- 리워드 타입
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reward_type') THEN
        CREATE TYPE reward_type AS ENUM ('daily_mission', 'xp_booster', 'achievement', 'daily_bonus', 'friend_referral', 'grade_upgrade', 'level_up');
    END IF;
    
    -- 관리자 역할
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_role') THEN
        CREATE TYPE admin_role AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'SUPPORT');
    END IF;
    
    -- 템플릿 타입
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'template_type') THEN
        CREATE TYPE template_type AS ENUM ('social_post', 'story', 'video', 'blog', 'email');
    END IF;
END$$;

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '✅ Extensions and ENUM types created successfully!';
END$$;