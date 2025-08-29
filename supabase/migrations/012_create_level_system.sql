-- ===================================
-- Treit Database Schema: Level System
-- ===================================
-- 레벨 시스템 구현 (50레벨 데이터 포함)
-- treit_gamerule.md 기반

-- ===================================
-- Level Configuration Tables
-- ===================================

-- Level Configs table - 50레벨 시스템 정의
CREATE TABLE level_configs (
    level INTEGER PRIMARY KEY CHECK (level >= 1 AND level <= 50),
    grade user_grade NOT NULL,
    required_xp INTEGER NOT NULL CHECK (required_xp > 0), -- 해당 레벨까지 필요한 총 XP
    cumulative_xp INTEGER NOT NULL CHECK (cumulative_xp >= 0), -- 누적 XP
    xp_per_mission INTEGER NOT NULL CHECK (xp_per_mission > 0), -- 미션당 획득 XP
    cpc_rate INTEGER NOT NULL CHECK (cpc_rate > 0), -- CPC 단위: 원
    
    -- 계산된 필드들
    xp_for_this_level INTEGER GENERATED ALWAYS AS (
        required_xp
    ) STORED,
    
    -- 메타데이터
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reward History table - 보상 지급 내역
CREATE TABLE reward_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type reward_type NOT NULL,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0, -- 금전적 보상
    xp_gained INTEGER NOT NULL DEFAULT 0, -- XP 보상
    description TEXT NOT NULL,
    
    -- 관련 정보
    campaign_id UUID REFERENCES campaigns(id),
    level_achieved INTEGER, -- 달성한 레벨 (레벨업 시)
    grade_achieved user_grade, -- 달성한 등급 (등급 변경 시)
    
    -- 상태
    status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed')),
    
    -- 메타데이터
    metadata JSONB DEFAULT '{}',
    
    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily Bonus Claims table - 일일 출석 보너스 추적
CREATE TABLE daily_bonus_claims (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    claim_date DATE NOT NULL DEFAULT CURRENT_DATE,
    streak_count INTEGER NOT NULL DEFAULT 1 CHECK (streak_count > 0),
    xp_gained INTEGER NOT NULL DEFAULT 30,
    bonus_amount DECIMAL(10,2) DEFAULT 0,
    
    -- 보너스 유형별 기록
    base_bonus BOOLEAN DEFAULT true, -- 기본 출석 보너스
    streak_bonus BOOLEAN DEFAULT false, -- 연속 출석 보너스
    monthly_bonus BOOLEAN DEFAULT false, -- 월간 보너스
    
    -- 타임스탬프  
    claimed_at TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (user_id, claim_date)
);

-- ===================================
-- Insert Level Data (50 Levels)
-- ===================================

-- 브론즈 등급 (Lv.1-5)
INSERT INTO level_configs (level, grade, required_xp, cumulative_xp, xp_per_mission, cpc_rate) VALUES
(1, 'BRONZE', 120, 120, 40, 40),
(2, 'BRONZE', 218, 338, 40, 40),
(3, 'BRONZE', 339, 677, 40, 40),
(4, 'BRONZE', 478, 1155, 40, 40),
(5, 'BRONZE', 631, 1786, 40, 40),

-- 실버 등급 (Lv.6-10)  
(6, 'SILVER', 797, 2583, 52, 52),
(7, 'SILVER', 975, 3558, 52, 52),
(8, 'SILVER', 1163, 4721, 52, 52),
(9, 'SILVER', 1360, 6081, 52, 52),
(10, 'SILVER', 1567, 7648, 52, 52),

-- 골드 등급 (Lv.11-20)
(11, 'GOLD', 1782, 9430, 64, 64),
(12, 'GOLD', 2005, 11435, 64, 64),
(13, 'GOLD', 2236, 13671, 64, 64),
(14, 'GOLD', 2474, 16145, 64, 64),
(15, 'GOLD', 2719, 18864, 64, 64),
(16, 'GOLD', 2970, 21834, 64, 64),
(17, 'GOLD', 3228, 25062, 64, 64),
(18, 'GOLD', 3492, 28554, 64, 64),
(19, 'GOLD', 3762, 32316, 64, 64),
(20, 'GOLD', 4038, 36354, 64, 64),

-- 다이아 등급 (Lv.21-35)
(21, 'DIAMOND', 4319, 40673, 72, 72),
(22, 'DIAMOND', 4605, 45278, 72, 72),
(23, 'DIAMOND', 4896, 50174, 72, 72),
(24, 'DIAMOND', 5192, 55366, 72, 72),
(25, 'DIAMOND', 5492, 60858, 72, 72),
(26, 'DIAMOND', 5796, 66654, 72, 72),
(27, 'DIAMOND', 6105, 72759, 72, 72),
(28, 'DIAMOND', 6417, 79176, 72, 72),
(29, 'DIAMOND', 6734, 85910, 72, 72),
(30, 'DIAMOND', 7053, 92963, 72, 72),
(31, 'DIAMOND', 7377, 100340, 72, 72),
(32, 'DIAMOND', 7703, 108043, 72, 72),
(33, 'DIAMOND', 8033, 116076, 72, 72),
(34, 'DIAMOND', 8366, 124442, 72, 72),
(35, 'DIAMOND', 8702, 133144, 72, 72),

-- 플래티넘 등급 (Lv.36-50)
(36, 'PLATINUM', 9040, 142184, 80, 80),
(37, 'PLATINUM', 9382, 151566, 80, 80),
(38, 'PLATINUM', 9726, 161292, 80, 80),
(39, 'PLATINUM', 10073, 171365, 80, 80),
(40, 'PLATINUM', 10423, 181788, 80, 80),
(41, 'PLATINUM', 10775, 192563, 80, 80),
(42, 'PLATINUM', 11130, 203693, 80, 80),
(43, 'PLATINUM', 11487, 215180, 80, 80),
(44, 'PLATINUM', 11847, 227027, 80, 80),
(45, 'PLATINUM', 12209, 239236, 80, 80),
(46, 'PLATINUM', 12573, 251809, 80, 80),
(47, 'PLATINUM', 12939, 264748, 80, 80),
(48, 'PLATINUM', 13308, 278056, 80, 80),
(49, 'PLATINUM', 14005, 292061, 80, 80),
(50, 'PLATINUM', 0, 294061, 80, 80); -- 최고 레벨

-- ===================================
-- Level System Functions
-- ===================================

-- Function to get level info from total XP
CREATE OR REPLACE FUNCTION get_level_from_total_xp(p_total_xp INTEGER)
RETURNS TABLE(
    level INTEGER,
    grade user_grade,
    current_level_xp INTEGER,
    next_level_xp INTEGER,
    xp_per_mission INTEGER,
    cpc_rate INTEGER
) AS $$
DECLARE
    v_level_info RECORD;
    v_next_level_info RECORD;
    v_current_level_xp INTEGER;
    v_next_level_xp INTEGER;
BEGIN
    -- Find current level based on total XP
    SELECT lc.level, lc.grade, lc.cumulative_xp, lc.xp_per_mission, lc.cpc_rate
    INTO v_level_info
    FROM level_configs lc
    WHERE p_total_xp >= lc.cumulative_xp
    ORDER BY lc.level DESC
    LIMIT 1;
    
    -- If no level found (shouldn't happen), default to level 1
    IF v_level_info.level IS NULL THEN
        SELECT 1, 'BRONZE'::user_grade, 120, 40, 40
        INTO v_level_info.level, v_level_info.grade, v_level_info.cumulative_xp, v_level_info.xp_per_mission, v_level_info.cpc_rate;
        v_current_level_xp := p_total_xp;
        v_next_level_xp := 120 - p_total_xp;
    ELSE
        -- Calculate current level XP and next level requirements
        IF v_level_info.level = 1 THEN
            v_current_level_xp := p_total_xp;
        ELSE
            SELECT p_total_xp - lc.cumulative_xp
            INTO v_current_level_xp
            FROM level_configs lc
            WHERE lc.level = v_level_info.level - 1;
        END IF;
        
        -- Get next level XP requirement
        IF v_level_info.level >= 50 THEN
            v_next_level_xp := 0; -- Max level reached
        ELSE
            SELECT lc.required_xp
            INTO v_next_level_xp
            FROM level_configs lc
            WHERE lc.level = v_level_info.level + 1;
            
            v_next_level_xp := v_next_level_xp - v_current_level_xp;
        END IF;
    END IF;
    
    RETURN QUERY SELECT 
        v_level_info.level,
        v_level_info.grade,
        v_current_level_xp,
        v_next_level_xp,
        v_level_info.xp_per_mission,
        v_level_info.cpc_rate;
END;
$$ LANGUAGE plpgsql;

-- Function to update calculate_user_level_from_xp (override the one in functions)
CREATE OR REPLACE FUNCTION calculate_user_level_from_xp(p_total_xp INTEGER)
RETURNS TABLE(
    level INTEGER,
    grade user_grade,
    xp_required_for_next INTEGER,
    current_level_xp INTEGER
) AS $$
DECLARE
    level_data RECORD;
BEGIN
    SELECT * INTO level_data FROM get_level_from_total_xp(p_total_xp);
    
    RETURN QUERY SELECT 
        level_data.level,
        level_data.grade,
        level_data.next_level_xp,
        level_data.current_level_xp;
END;
$$ LANGUAGE plpgsql;

-- Function to handle level up rewards
CREATE OR REPLACE FUNCTION process_level_up_rewards(
    p_user_id UUID,
    p_old_level INTEGER,
    p_new_level INTEGER,
    p_old_grade user_grade,
    p_new_grade user_grade
)
RETURNS DECIMAL AS $$
DECLARE
    v_level_bonus DECIMAL := 0;
    v_grade_bonus DECIMAL := 0;
    v_total_bonus DECIMAL := 0;
    v_level INTEGER;
BEGIN
    -- Calculate level up bonuses (100원 per level)
    v_level_bonus := (p_new_level - p_old_level) * 100;
    
    -- Calculate grade upgrade bonuses
    IF p_new_grade != p_old_grade THEN
        v_grade_bonus := CASE p_new_grade
            WHEN 'SILVER' THEN 1000
            WHEN 'GOLD' THEN 3000
            WHEN 'DIAMOND' THEN 8000
            WHEN 'PLATINUM' THEN 20000
            ELSE 0
        END;
        
        -- Record grade upgrade
        INSERT INTO reward_history (
            user_id, type, amount, xp_gained, description,
            level_achieved, grade_achieved, status
        ) VALUES (
            p_user_id, 'grade_upgrade', v_grade_bonus, 0,
            '등급 승급 보너스: ' || p_new_grade,
            p_new_level, p_new_grade, 'completed'
        );
    END IF;
    
    -- Record individual level up bonuses
    FOR v_level IN (p_old_level + 1)..p_new_level LOOP
        INSERT INTO reward_history (
            user_id, type, amount, xp_gained, description,
            level_achieved, status
        ) VALUES (
            p_user_id, 'level_up', 100, 0,
            '레벨 업 보너스: 레벨 ' || v_level || ' 달성',
            v_level, 'completed'
        );
    END LOOP;
    
    v_total_bonus := v_level_bonus + v_grade_bonus;
    
    -- Update user earnings if bonus exists
    IF v_total_bonus > 0 THEN
        UPDATE user_earnings
        SET 
            available_amount = available_amount + v_total_bonus,
            total_earned = total_earned + v_total_bonus,
            updated_at = NOW()
        WHERE user_id = p_user_id;
    END IF;
    
    RETURN v_total_bonus;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- Daily Mission System Functions  
-- ===================================

-- Function to handle daily missions (from treit_gamerule.md)
CREATE OR REPLACE FUNCTION complete_daily_mission(
    p_user_id UUID,
    p_mission_type TEXT,
    p_description TEXT DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    xp_gained INTEGER,
    bonus_amount DECIMAL,
    level_up_occurred BOOLEAN,
    new_level INTEGER,
    message TEXT
) AS $$
DECLARE
    v_user_grade user_grade;
    v_old_level INTEGER;
    v_new_level INTEGER;
    v_old_grade user_grade;
    v_new_grade user_grade;
    v_xp_amount INTEGER;
    v_bonus_amount DECIMAL := 0;
    v_level_up BOOLEAN := false;
    v_level_result RECORD;
BEGIN
    -- Get current user data
    SELECT level, grade INTO v_old_level, v_old_grade
    FROM users WHERE id = p_user_id;
    
    -- Determine XP amount based on mission type
    v_xp_amount := CASE p_mission_type
        WHEN 'sns_posting' THEN 80        -- SNS 포스팅 (3회)
        WHEN 'link_clicks' THEN 120       -- 링크 클릭 달성 (10회)
        WHEN 'project_apply' THEN 60      -- 프로젝트 신청
        WHEN 'revenue_target' THEN 100    -- 수익 달성 (5,000원)
        WHEN 'marketing_quiz' THEN 50     -- 마케팅 퀴즈
        WHEN 'hashtag_match' THEN 40      -- 해시태그 매치
        WHEN 'trend_prediction' THEN 60   -- 트렌드 예측
        WHEN 'branding_challenge' THEN 80 -- 브랜딩 챌린지
        ELSE 30 -- 기본값
    END;
    
    -- Process XP gain using existing function
    SELECT * INTO v_level_result
    FROM process_xp_gain(
        p_user_id, 
        v_xp_amount, 
        'daily_mission', 
        COALESCE(p_description, '일일 미션 완료: ' || p_mission_type)
    );
    
    v_level_up := (v_level_result).level_up_occurred;
    v_new_level := (v_level_result).new_level;
    v_bonus_amount := (v_level_result).bonus_amount;
    
    -- Record mission completion
    INSERT INTO reward_history (
        user_id, type, amount, xp_gained, description, status
    ) VALUES (
        p_user_id, 'daily_mission', v_bonus_amount, v_xp_amount,
        COALESCE(p_description, '일일 미션 완료: ' || p_mission_type), 'completed'
    );
    
    RETURN QUERY SELECT 
        true,
        v_xp_amount,
        v_bonus_amount,
        v_level_up,
        v_new_level,
        CASE 
            WHEN v_level_up THEN format('미션 완료! 레벨 %s 달성! 🎉', v_new_level)
            ELSE format('미션 완료! XP %s 획득! ✅', v_xp_amount)
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================
-- Achievement System
-- ===================================

-- Achievements table
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    category TEXT NOT NULL, -- 'mission', 'performance', 'social', 'milestone'
    
    -- Requirements
    requirements JSONB NOT NULL,
    /* Example requirements:
    {
        "type": "projects_completed",
        "count": 10,
        "timeframe": "all_time"
    }
    */
    
    -- Rewards
    xp_reward INTEGER NOT NULL DEFAULT 0,
    money_reward DECIMAL(10,2) DEFAULT 0,
    
    -- Metadata
    icon_url TEXT,
    rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Achievements junction table
CREATE TABLE user_achievements (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    
    -- Progress tracking
    current_progress JSONB DEFAULT '{}',
    completed_at TIMESTAMPTZ,
    
    -- Rewards claimed
    xp_claimed INTEGER DEFAULT 0,
    money_claimed DECIMAL(10,2) DEFAULT 0,
    
    PRIMARY KEY (user_id, achievement_id)
);

-- Insert default achievements (from treit_gamerule.md)
INSERT INTO achievements (name, description, category, requirements, xp_reward, money_reward, rarity) VALUES
('첫 프로젝트 완료', '첫 번째 프로젝트를 성공적으로 완료하세요', 'milestone', 
 '{"type": "projects_completed", "count": 1}', 100, 0, 'common'),

('연속 5일 활동', '5일 연속으로 활동하세요', 'social', 
 '{"type": "consecutive_days", "count": 5}', 200, 0, 'rare'),

('수익 10만원 달성', '누적 수익 10만원을 달성하세요', 'performance', 
 '{"type": "total_earnings", "amount": 100000}', 300, 0, 'epic'),

('프로젝트 마스터', '프로젝트 10개를 완료하세요', 'performance', 
 '{"type": "projects_completed", "count": 10}', 250, 0, 'rare'),

('인플루언서 등급', '프로젝트 20개를 완료하세요', 'performance', 
 '{"type": "projects_completed", "count": 20}', 500, 0, 'legendary');

-- ===================================
-- Friend Referral System
-- ===================================

-- Referral Rewards table
CREATE TABLE referral_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Reward stages
    signup_bonus_claimed BOOLEAN DEFAULT false,
    signup_bonus_amount DECIMAL(8,2) DEFAULT 0,
    first_mission_bonus_claimed BOOLEAN DEFAULT false,
    first_mission_bonus_amount DECIMAL(8,2) DEFAULT 0,
    
    -- XP rewards
    signup_xp INTEGER DEFAULT 200,
    first_mission_xp INTEGER DEFAULT 100,
    
    -- Monthly limits
    reward_month INTEGER NOT NULL DEFAULT EXTRACT(MONTH FROM NOW()),
    reward_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(referrer_user_id, referred_user_id)
);

-- Function to process friend referral
CREATE OR REPLACE FUNCTION process_friend_referral(
    p_referrer_id UUID,
    p_referred_id UUID,
    p_stage TEXT -- 'signup' or 'first_mission'
)
RETURNS TABLE(
    success BOOLEAN,
    xp_gained INTEGER,
    bonus_amount DECIMAL,
    monthly_limit_reached BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_current_month INTEGER := EXTRACT(MONTH FROM NOW());
    v_current_year INTEGER := EXTRACT(YEAR FROM NOW());
    v_monthly_referrals INTEGER;
    v_xp_amount INTEGER := 0;
    v_bonus_amount DECIMAL := 0;
    v_limit_reached BOOLEAN := false;
BEGIN
    -- Check monthly limit (5 referrals per month)
    SELECT COUNT(*) INTO v_monthly_referrals
    FROM referral_rewards
    WHERE referrer_user_id = p_referrer_id
      AND reward_month = v_current_month
      AND reward_year = v_current_year;
    
    IF v_monthly_referrals >= 5 THEN
        v_limit_reached := true;
        RETURN QUERY SELECT false, 0, 0::DECIMAL, true, '월간 추천 한도 초과 (최대 5명)';
        RETURN;
    END IF;
    
    -- Process based on stage
    IF p_stage = 'signup' THEN
        v_xp_amount := 200;
        -- No money bonus for signup
        
        -- Create or update referral record
        INSERT INTO referral_rewards (
            referrer_user_id, referred_user_id, 
            signup_bonus_claimed, signup_xp,
            reward_month, reward_year
        ) VALUES (
            p_referrer_id, p_referred_id,
            true, v_xp_amount,
            v_current_month, v_current_year
        ) ON CONFLICT (referrer_user_id, referred_user_id) DO UPDATE SET
            signup_bonus_claimed = true,
            signup_xp = v_xp_amount,
            updated_at = NOW();
            
    ELSIF p_stage = 'first_mission' THEN
        v_xp_amount := 100;
        v_bonus_amount := 1000; -- 1000원 보너스
        
        -- Update existing referral record
        UPDATE referral_rewards SET
            first_mission_bonus_claimed = true,
            first_mission_bonus_amount = v_bonus_amount,
            first_mission_xp = v_xp_amount,
            updated_at = NOW()
        WHERE referrer_user_id = p_referrer_id 
          AND referred_user_id = p_referred_id;
    END IF;
    
    -- Process XP gain
    PERFORM process_xp_gain(
        p_referrer_id, 
        v_xp_amount, 
        'friend_referral', 
        '친구 추천 보상: ' || p_stage
    );
    
    -- Add money bonus if applicable
    IF v_bonus_amount > 0 THEN
        UPDATE user_earnings
        SET 
            available_amount = available_amount + v_bonus_amount,
            total_earned = total_earned + v_bonus_amount,
            updated_at = NOW()
        WHERE user_id = p_referrer_id;
    END IF;
    
    -- Record reward history
    INSERT INTO reward_history (
        user_id, type, amount, xp_gained, description, status
    ) VALUES (
        p_referrer_id, 'friend_referral', v_bonus_amount, v_xp_amount,
        '친구 추천 보상: ' || p_stage, 'completed'
    );
    
    RETURN QUERY SELECT 
        true,
        v_xp_amount,
        v_bonus_amount,
        false,
        CASE p_stage
            WHEN 'signup' THEN format('친구 가입 완료! XP %s 획득! 👥', v_xp_amount)
            WHEN 'first_mission' THEN format('친구 첫 미션 완료! XP %s + %s원 획득! 🎁', v_xp_amount, v_bonus_amount)
            ELSE '추천 보상 지급 완료!'
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================
-- Indexes for Performance
-- ===================================

CREATE INDEX idx_level_configs_cumulative_xp ON level_configs(cumulative_xp);
CREATE INDEX idx_reward_history_user_id ON reward_history(user_id, created_at DESC);
CREATE INDEX idx_reward_history_type ON reward_history(type, created_at DESC);
CREATE INDEX idx_daily_bonus_claims_user_date ON daily_bonus_claims(user_id, claim_date DESC);
CREATE INDEX idx_daily_bonus_claims_streak ON daily_bonus_claims(streak_count DESC, claim_date DESC);

CREATE INDEX idx_achievements_category ON achievements(category, is_active);
CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_completed ON user_achievements(completed_at DESC) WHERE completed_at IS NOT NULL;

CREATE INDEX idx_referral_rewards_referrer ON referral_rewards(referrer_user_id, created_at DESC);
CREATE INDEX idx_referral_rewards_monthly ON referral_rewards(referrer_user_id, reward_month, reward_year);

-- ===================================
-- Level System Analytics Views
-- ===================================

-- View: Level Distribution Analytics
CREATE VIEW v_level_analytics AS
SELECT 
    lc.level,
    lc.grade,
    lc.xp_per_mission,
    lc.cpc_rate,
    COUNT(u.id) as user_count,
    COUNT(u.id) * 100.0 / SUM(COUNT(u.id)) OVER () as percentage,
    AVG(u.total_xp) as avg_total_xp,
    AVG(ue.total_earned) as avg_total_earned
FROM level_configs lc
LEFT JOIN users u ON u.level = lc.level AND u.status = 'ACTIVE'
LEFT JOIN user_earnings ue ON u.id = ue.user_id
GROUP BY lc.level, lc.grade, lc.xp_per_mission, lc.cpc_rate
ORDER BY lc.level;

-- View: Reward History Summary
CREATE VIEW v_reward_summary AS
SELECT 
    rh.type,
    COUNT(*) as total_rewards,
    SUM(rh.amount) as total_amount,
    SUM(rh.xp_gained) as total_xp_given,
    AVG(rh.amount) as avg_amount,
    COUNT(DISTINCT rh.user_id) as unique_users,
    MIN(rh.created_at) as first_reward,
    MAX(rh.created_at) as last_reward
FROM reward_history rh
WHERE rh.status = 'completed'
GROUP BY rh.type
ORDER BY total_amount DESC;

-- ===================================
-- System Maintenance Functions
-- ===================================

-- Function to recalculate user levels (maintenance)
CREATE OR REPLACE FUNCTION recalculate_all_user_levels()
RETURNS TEXT AS $$
DECLARE
    user_record RECORD;
    level_data RECORD;
    updated_count INTEGER := 0;
BEGIN
    FOR user_record IN 
        SELECT id, total_xp, level, grade 
        FROM users 
        WHERE status = 'ACTIVE'
    LOOP
        -- Get correct level data
        SELECT * INTO level_data FROM get_level_from_total_xp(user_record.total_xp);
        
        -- Update if different
        IF user_record.level != level_data.level OR user_record.grade != level_data.grade THEN
            UPDATE users SET
                level = level_data.level,
                grade = level_data.grade,
                current_xp = level_data.current_level_xp,
                next_level_xp = level_data.next_level_xp,
                updated_at = NOW()
            WHERE id = user_record.id;
            
            updated_count := updated_count + 1;
        END IF;
    END LOOP;
    
    RETURN format('Updated %s user levels', updated_count);
END;
$$ LANGUAGE plpgsql;

-- Comment: Complete level system implementation with 50 levels, achievements, referral system, and analytics