-- ============================================
-- 사용자/광고주 데이터 분리 및 권한 설정
-- ============================================

-- 캠페인 데이터 접근 권한
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- 캠페인 RLS 정책
    DROP POLICY IF EXISTS "Businesses can manage own campaigns" ON campaigns;
    DROP POLICY IF EXISTS "Users can view active campaigns" ON campaigns;
    
    -- 광고주는 자신의 캠페인만 관리
    CREATE POLICY "Businesses can manage own campaigns"
        ON campaigns
        FOR ALL
        USING (business_id = auth.uid())
        WITH CHECK (business_id = auth.uid());
    
    -- 일반 사용자는 승인된 활성 캠페인만 조회
    CREATE POLICY "Users can view active campaigns"
        ON campaigns
        FOR SELECT
        USING (
            is_active = true 
            AND approval_status = 'APPROVED'
            AND start_date <= NOW()
            AND end_date >= NOW()
        );
        
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error setting campaign policies: %', SQLERRM;
END$$;

-- 사용자 캠페인 매칭 데이터
ALTER TABLE user_campaigns ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can manage own campaign matches" ON user_campaigns;
    
    -- 사용자는 자신의 캠페인 매칭만 관리
    CREATE POLICY "Users can manage own campaign matches"
        ON user_campaigns
        FOR ALL
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
        
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error setting user_campaigns policies: %', SQLERRM;
END$$;

-- ============================================
-- 사용자 타입별 대시보드 데이터 함수
-- ============================================

-- 일반 사용자 대시보드 데이터
CREATE OR REPLACE FUNCTION get_user_dashboard()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'profile', (
            SELECT row_to_json(u.*)
            FROM users u
            WHERE u.id = auth.uid()
        ),
        'level_info', (
            SELECT row_to_json(lc.*)
            FROM level_config lc
            JOIN users u ON u.level = lc.level
            WHERE u.id = auth.uid()
        ),
        'active_campaigns', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'campaign_id', uc.campaign_id,
                    'campaign_name', c.name,
                    'cpc_rate', c.cpc_rate,
                    'total_clicks', uc.total_clicks,
                    'total_earnings', uc.total_earnings,
                    'tracking_code', uc.tracking_code
                )
            ), '[]'::json)
            FROM user_campaigns uc
            JOIN campaigns c ON c.id = uc.campaign_id
            WHERE uc.user_id = auth.uid()
            AND uc.status = 'ACTIVE'
        ),
        'recent_earnings', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'date', DATE(created_at),
                    'amount', amount,
                    'type', type
                )
                ORDER BY created_at DESC
                LIMIT 10
            ), '[]'::json)
            FROM user_earnings
            WHERE user_id = auth.uid()
        ),
        'stats', (
            SELECT json_build_object(
                'total_clicks', COALESCE(SUM(total_clicks), 0),
                'total_earnings', COALESCE(SUM(total_earnings), 0),
                'active_campaigns', COUNT(*)
            )
            FROM user_campaigns
            WHERE user_id = auth.uid()
            AND status = 'ACTIVE'
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 광고주 대시보드 데이터
CREATE OR REPLACE FUNCTION get_business_dashboard()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'profile', (
            SELECT row_to_json(b.*)
            FROM businesses b
            WHERE b.id = auth.uid()
        ),
        'campaigns', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'id', c.id,
                    'name', c.name,
                    'status', c.approval_status,
                    'is_active', c.is_active,
                    'budget', c.budget,
                    'spent', c.spent,
                    'current_clicks', c.current_clicks,
                    'target_clicks', c.target_clicks,
                    'start_date', c.start_date,
                    'end_date', c.end_date
                )
                ORDER BY c.created_at DESC
            ), '[]'::json)
            FROM campaigns c
            WHERE c.business_id = auth.uid()
        ),
        'stats', (
            SELECT json_build_object(
                'total_campaigns', COUNT(*),
                'active_campaigns', COUNT(*) FILTER (WHERE is_active = true),
                'total_spent', COALESCE(SUM(spent), 0),
                'total_clicks', COALESCE(SUM(current_clicks), 0)
            )
            FROM campaigns
            WHERE business_id = auth.uid()
        ),
        'recent_clicks', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'campaign_name', c.name,
                    'click_time', ce.click_time,
                    'user_id', ce.user_id
                )
                ORDER BY ce.click_time DESC
                LIMIT 20
            ), '[]'::json)
            FROM click_events ce
            JOIN campaigns c ON c.id = ce.campaign_id
            WHERE c.business_id = auth.uid()
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 사용자 타입 확인 함수
-- ============================================

CREATE OR REPLACE FUNCTION get_user_type()
RETURNS TEXT AS $$
BEGIN
    -- 먼저 businesses 테이블 확인
    IF EXISTS (SELECT 1 FROM businesses WHERE id = auth.uid()) THEN
        RETURN 'business';
    -- 그 다음 users 테이블 확인
    ELSIF EXISTS (SELECT 1 FROM users WHERE id = auth.uid()) THEN
        RETURN 'user';
    ELSE
        RETURN 'unknown';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 캠페인 참여 가능 목록 (일반 사용자용)
-- ============================================

CREATE OR REPLACE FUNCTION get_available_campaigns()
RETURNS TABLE (
    id UUID,
    name VARCHAR(255),
    description TEXT,
    category campaign_category,
    cpc_rate DECIMAL(10, 2),
    image_url TEXT,
    remaining_budget DECIMAL(15, 2),
    end_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.description,
        c.category,
        c.cpc_rate + (c.cpc_rate * lc.cpc_bonus_rate / 100) as cpc_rate, -- 레벨 보너스 적용
        c.image_url,
        c.budget - c.spent as remaining_budget,
        c.end_date
    FROM campaigns c
    CROSS JOIN LATERAL (
        SELECT lc.cpc_bonus_rate
        FROM users u
        JOIN level_config lc ON u.level = lc.level
        WHERE u.id = auth.uid()
    ) lc
    WHERE c.is_active = true
    AND c.approval_status = 'APPROVED'
    AND c.start_date <= NOW()
    AND c.end_date >= NOW()
    AND c.budget > c.spent
    AND NOT EXISTS (
        -- 이미 참여 중인 캠페인 제외
        SELECT 1 FROM user_campaigns uc
        WHERE uc.campaign_id = c.id
        AND uc.user_id = auth.uid()
        AND uc.status = 'ACTIVE'
    )
    ORDER BY c.cpc_rate DESC, c.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 권한 설정
-- ============================================

-- 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION get_user_dashboard() TO authenticated;
GRANT EXECUTE ON FUNCTION get_business_dashboard() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_type() TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_campaigns() TO authenticated;

-- 뷰 접근 권한
GRANT SELECT ON my_profile TO authenticated;
GRANT SELECT ON my_business TO authenticated;

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '✅ Data separation and access control setup complete!';
    RAISE NOTICE '👤 Users and businesses now have separate data access';
    RAISE NOTICE '🔒 RLS policies ensure data isolation';
    RAISE NOTICE '📊 Dashboard functions provide appropriate data for each user type';
END$$;