-- ===================================
-- Treit Database Schema: ENUM Types
-- ===================================
-- 모든 열거형 타입 정의
-- DATABASE.md와 treit_gamerule.md 기반

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

-- Comment: All enum types are now defined and ready for use in subsequent migrations