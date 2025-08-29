-- ============================================
-- 테이블 기본값 수정
-- ============================================

-- Users 테이블 기본값 설정
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        -- 각 컬럼이 존재하는지 확인하고 기본값 설정
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'level') THEN
            ALTER TABLE users ALTER COLUMN level SET DEFAULT 1;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'grade') THEN
            ALTER TABLE users ALTER COLUMN grade SET DEFAULT 'BRONZE'::user_grade;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'xp') THEN
            ALTER TABLE users ALTER COLUMN xp SET DEFAULT 0;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'total_clicks') THEN
            ALTER TABLE users ALTER COLUMN total_clicks SET DEFAULT 0;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'total_earnings') THEN
            ALTER TABLE users ALTER COLUMN total_earnings SET DEFAULT 0;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'balance') THEN
            ALTER TABLE users ALTER COLUMN balance SET DEFAULT 0;
        END IF;
        
        RAISE NOTICE '✅ User table defaults updated';
    ELSE
        RAISE NOTICE 'Users table does not exist yet';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error updating user defaults: %', SQLERRM;
END$$;

-- Businesses 테이블 기본값 설정
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'businesses') THEN
        -- 각 컬럼이 존재하는지 확인하고 기본값 설정
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'balance') THEN
            ALTER TABLE businesses ALTER COLUMN balance SET DEFAULT 0;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'total_spent') THEN
            ALTER TABLE businesses ALTER COLUMN total_spent SET DEFAULT 0;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'status') THEN
            ALTER TABLE businesses ALTER COLUMN status SET DEFAULT 'PENDING'::business_status;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'is_verified') THEN
            ALTER TABLE businesses ALTER COLUMN is_verified SET DEFAULT false;
        END IF;
        
        RAISE NOTICE '✅ Business table defaults updated';
    ELSE
        RAISE NOTICE 'Businesses table does not exist yet';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error updating business defaults: %', SQLERRM;
END$$;

-- ============================================
-- 기존 NULL 데이터 수정 (이미 가입한 사용자)
-- ============================================

-- 기존 사용자 데이터 수정 (테이블이 존재하는 경우만)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        -- balance 컬럼이 존재하는지 확인
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'balance') THEN
            -- 기존 사용자 중 level이 NULL인 경우 1로 설정
            UPDATE users 
            SET 
                level = COALESCE(level, 1),
                grade = COALESCE(grade, 'BRONZE'::user_grade),
                xp = COALESCE(xp, 0),
                total_clicks = COALESCE(total_clicks, 0),
                total_earnings = COALESCE(total_earnings, 0),
                balance = COALESCE(balance, 0),
                status = COALESCE(status, 'ACTIVE'::user_status)
            WHERE level IS NULL OR grade IS NULL OR balance IS NULL;
            
            -- 레퍼럴 코드가 없는 사용자에게 생성
            UPDATE users
            SET referral_code = UPPER(SUBSTR(MD5(RANDOM()::TEXT || id::TEXT), 1, 8))
            WHERE referral_code IS NULL;
            
            RAISE NOTICE 'User data updated successfully';
        ELSE
            RAISE NOTICE 'Balance column does not exist in users table';
        END IF;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error updating user data: %', SQLERRM;
END$$;

-- 기존 광고주 데이터 정리
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'businesses') THEN
        -- balance 컬럼이 존재하는지 확인
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'balance') THEN
            UPDATE businesses
            SET 
                balance = COALESCE(balance, 0),
                total_spent = COALESCE(total_spent, 0),
                status = COALESCE(status, 'PENDING'::business_status),
                is_verified = COALESCE(is_verified, false)
            WHERE balance IS NULL OR status IS NULL;
            
            RAISE NOTICE 'Business data updated successfully';
        ELSE
            RAISE NOTICE 'Balance column does not exist in businesses table';
        END IF;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error updating business data: %', SQLERRM;
END$$;

-- ============================================
-- 테스트용 데이터 정리 (선택사항)
-- ============================================

-- 테스트 계정이나 잘못된 데이터 정리
-- DELETE FROM users WHERE email IS NULL;
-- DELETE FROM businesses WHERE email IS NULL;
-- DELETE FROM users WHERE id NOT IN (SELECT id FROM auth.users);
-- DELETE FROM businesses WHERE id NOT IN (SELECT id FROM auth.users);

-- ============================================
-- 데이터 무결성 체크
-- ============================================

DO $$
DECLARE
    null_level_count INTEGER;
    null_grade_count INTEGER;
BEGIN
    -- NULL 값 체크
    SELECT COUNT(*) INTO null_level_count FROM users WHERE level IS NULL;
    SELECT COUNT(*) INTO null_grade_count FROM users WHERE grade IS NULL;
    
    IF null_level_count > 0 THEN
        RAISE WARNING 'Found % users with NULL level', null_level_count;
    END IF;
    
    IF null_grade_count > 0 THEN
        RAISE WARNING 'Found % users with NULL grade', null_grade_count;
    END IF;
    
    RAISE NOTICE '✅ Data integrity check complete';
    RAISE NOTICE '📊 All users now have proper default values';
END$$;

-- ============================================
-- 사용자/광고주 구분 뷰
-- ============================================

-- 뷰 생성 (테이블이 존재하는 경우만)
DO $$
BEGIN
    -- 일반 사용자만 보는 뷰
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        CREATE OR REPLACE VIEW user_profiles AS
        SELECT 
            u.*,
            lc.grade_title,
            lc.level_title,
            lc.cpc_bonus_rate,
            lc.daily_bonus,
            lc.referral_bonus,
            (lc.required_xp - u.xp) as xp_to_next_level,
            CASE 
                WHEN lc.required_xp > 0 THEN (u.xp::float / lc.required_xp * 100)
                ELSE 0 
            END as level_progress
        FROM users u
        LEFT JOIN level_config lc ON u.level = lc.level
        WHERE NOT EXISTS (
            SELECT 1 FROM businesses b WHERE b.id = u.id
        );
        
        GRANT SELECT ON user_profiles TO authenticated;
        RAISE NOTICE 'user_profiles view created';
    END IF;
    
    -- 광고주만 보는 뷰
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'businesses') 
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaigns') THEN
        CREATE OR REPLACE VIEW business_profiles AS
        SELECT 
            b.*,
            (SELECT COUNT(*) FROM campaigns WHERE business_id = b.id) as total_campaigns,
            (SELECT COUNT(*) FROM campaigns WHERE business_id = b.id AND is_active = true) as active_campaigns
        FROM businesses b;
        
        GRANT SELECT ON business_profiles TO authenticated;
        RAISE NOTICE 'business_profiles view created';
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'businesses') THEN
        -- campaigns 테이블이 없으면 단순 뷰 생성
        CREATE OR REPLACE VIEW business_profiles AS
        SELECT 
            b.*,
            0 as total_campaigns,
            0 as active_campaigns
        FROM businesses b;
        
        GRANT SELECT ON business_profiles TO authenticated;
        RAISE NOTICE 'business_profiles view created (without campaigns)';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating views: %', SQLERRM;
END$$;

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '✅ Default values and data cleanup complete!';
    RAISE NOTICE '👤 All new users will start at Level 1 with BRONZE grade';
    RAISE NOTICE '🏢 Business accounts properly separated';
    RAISE NOTICE '📊 Existing NULL values have been fixed';
END$$;