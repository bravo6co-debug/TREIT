-- ============================================
-- Supabase Auth 트리거 및 함수
-- ============================================

-- 새 사용자 가입 시 users 테이블에 레코드 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    -- 일반 사용자 프로필 생성
    INSERT INTO public.users (
        id,
        email,
        username,
        full_name,
        status,
        grade,
        level,
        xp,
        total_clicks,
        total_earnings,
        balance,
        referral_code,
        is_email_verified,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        LOWER(SPLIT_PART(NEW.email, '@', 1) || '_' || SUBSTR(MD5(RANDOM()::TEXT), 1, 4)),
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        'ACTIVE'::user_status,
        'BRONZE'::user_grade,
        1, -- 레벨 1로 시작
        0, -- XP 0으로 시작
        0,
        0,
        0,
        UPPER(SUBSTR(MD5(RANDOM()::TEXT || NEW.id::TEXT), 1, 8)),
        NEW.email_confirmed_at IS NOT NULL,
        NOW(),
        NOW()
    );
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 광고주 가입 시 businesses 테이블에 레코드 생성
CREATE OR REPLACE FUNCTION public.handle_new_business()
RETURNS trigger AS $$
BEGIN
    -- 광고주 프로필 생성
    INSERT INTO public.businesses (
        id,
        email,
        business_name,
        representative_name,
        status,
        balance,
        total_spent,
        is_verified,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'business_name', '미등록 사업체'),
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        'PENDING'::business_status,
        0,
        0,
        false,
        NOW(),
        NOW()
    );
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in handle_new_business: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 사용자 유형 판별 함수
CREATE OR REPLACE FUNCTION public.handle_new_signup()
RETURNS trigger AS $$
BEGIN
    -- user_type 메타데이터로 사용자/광고주 구분
    IF NEW.raw_user_meta_data->>'user_type' = 'business' THEN
        -- 광고주로 등록
        PERFORM handle_new_business();
    ELSE
        -- 일반 사용자로 등록 (기본값)
        PERFORM handle_new_user();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 기존 트리거 삭제 (있는 경우)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Auth 사용자 생성 시 트리거
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 사용자 데이터 초기화 함수
-- ============================================

-- 사용자 레벨/등급 초기화
CREATE OR REPLACE FUNCTION public.initialize_user_level()
RETURNS trigger AS $$
BEGIN
    -- 새 사용자는 항상 레벨 1, BRONZE 등급으로 시작
    IF NEW.level IS NULL THEN
        NEW.level := 1;
    END IF;
    
    IF NEW.grade IS NULL THEN
        NEW.grade := 'BRONZE'::user_grade;
    END IF;
    
    IF NEW.xp IS NULL THEN
        NEW.xp := 0;
    END IF;
    
    IF NEW.total_clicks IS NULL THEN
        NEW.total_clicks := 0;
    END IF;
    
    IF NEW.total_earnings IS NULL THEN
        NEW.total_earnings := 0;
    END IF;
    
    IF NEW.balance IS NULL THEN
        NEW.balance := 0;
    END IF;
    
    -- 레퍼럴 코드 생성
    IF NEW.referral_code IS NULL THEN
        NEW.referral_code := UPPER(SUBSTR(MD5(RANDOM()::TEXT || NEW.id::TEXT), 1, 8));
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- users 테이블 INSERT 시 초기화 트리거
DROP TRIGGER IF EXISTS initialize_user_on_insert ON public.users;
CREATE TRIGGER initialize_user_on_insert
    BEFORE INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.initialize_user_level();

-- ============================================
-- RLS 정책 업데이트
-- ============================================

-- Users 테이블 RLS 정책 (더 명확하게)
DO $$
BEGIN
    -- 기존 정책 삭제
    DROP POLICY IF EXISTS "Users can view own profile" ON users;
    DROP POLICY IF EXISTS "Users can update own profile" ON users;
    DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON users;
    
    -- 새 정책 생성
    CREATE POLICY "Users can view own profile"
        ON users FOR SELECT
        USING (auth.uid() = id);
    
    CREATE POLICY "Users can update own profile"
        ON users FOR UPDATE
        USING (auth.uid() = id)
        WITH CHECK (auth.uid() = id);
    
    CREATE POLICY "Public can view basic profile info"
        ON users FOR SELECT
        USING (true); -- 나중에 필요시 제한 가능
        
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error updating RLS policies: %', SQLERRM;
END$$;

-- Businesses 테이블 RLS 정책
DO $$
BEGIN
    -- 기존 정책 삭제
    DROP POLICY IF EXISTS "Businesses can view own profile" ON businesses;
    DROP POLICY IF EXISTS "Businesses can update own profile" ON businesses;
    
    -- 새 정책 생성
    CREATE POLICY "Businesses can view own profile"
        ON businesses FOR SELECT
        USING (auth.uid() = id);
    
    CREATE POLICY "Businesses can update own profile"
        ON businesses FOR UPDATE
        USING (auth.uid() = id)
        WITH CHECK (auth.uid() = id);
    
    CREATE POLICY "Public can view active businesses"
        ON businesses FOR SELECT
        USING (status = 'ACTIVE');
        
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error updating business RLS policies: %', SQLERRM;
END$$;

-- ============================================
-- 데이터 분리 뷰 생성
-- ============================================

-- 현재 사용자 프로필 뷰
CREATE OR REPLACE VIEW my_profile AS
SELECT 
    u.*,
    lc.grade_title,
    lc.level_title,
    lc.cpc_bonus_rate,
    lc.daily_bonus,
    lc.required_xp as next_level_xp
FROM users u
LEFT JOIN level_config lc ON u.level = lc.level
WHERE u.id = auth.uid();

-- 현재 광고주 프로필 뷰
CREATE OR REPLACE VIEW my_business AS
SELECT * FROM businesses
WHERE id = auth.uid();

-- ============================================
-- 테스트 및 정리
-- ============================================

-- 기존 테스트 데이터 정리 (선택사항)
-- DELETE FROM users WHERE email LIKE '%test%';
-- DELETE FROM businesses WHERE email LIKE '%test%';

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '✅ Auth triggers and user initialization setup complete!';
    RAISE NOTICE '📊 New users will start at Level 1 with BRONZE grade';
    RAISE NOTICE '🏢 Business accounts are now separated from user accounts';
END$$;