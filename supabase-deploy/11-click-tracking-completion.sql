-- ============================================
-- 클릭 추적 시스템 완성을 위한 추가 테이블 및 수정사항
-- ============================================

-- 1. Admin Users 테이블 생성 (없는 경우)
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    role admin_role DEFAULT 'SUPPORT',
    permissions JSONB DEFAULT '{}',
    last_login_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Deeplink Mappings 테이블 생성
CREATE TABLE IF NOT EXISTS deeplink_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tracking_code VARCHAR(32) UNIQUE NOT NULL,
    original_url TEXT NOT NULL,
    user_campaign_id UUID REFERENCES user_campaigns(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id),
    
    -- 딥링크 메타데이터
    title VARCHAR(255),
    description TEXT,
    short_url VARCHAR(255),
    qr_code_url TEXT,
    
    -- UTM 파라미터
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    utm_term VARCHAR(100),
    utm_content VARCHAR(100),
    
    -- 추적 파라미터
    tracking_parameters JSONB DEFAULT '{}',
    
    -- 통계
    click_count INTEGER DEFAULT 0,
    unique_clicks INTEGER DEFAULT 0,
    conversion_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    
    -- 타임스탬프
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Click Events 테이블 수정 - 누락된 컬럼 추가
DO $$
BEGIN
    -- commission_amount 컬럼 추가
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'click_events' 
        AND column_name = 'commission_amount'
    ) THEN
        ALTER TABLE click_events 
        ADD COLUMN commission_amount DECIMAL(15, 2) DEFAULT 0;
    END IF;
    
    -- clicked_at 컬럼 추가 (click_time과 별도로)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'click_events' 
        AND column_name = 'clicked_at'
    ) THEN
        ALTER TABLE click_events 
        ADD COLUMN clicked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
END$$;

-- 4. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_deeplink_mappings_tracking_code 
    ON deeplink_mappings(tracking_code);
CREATE INDEX IF NOT EXISTS idx_deeplink_mappings_user_campaign 
    ON deeplink_mappings(user_campaign_id);
CREATE INDEX IF NOT EXISTS idx_deeplink_mappings_campaign 
    ON deeplink_mappings(campaign_id);
CREATE INDEX IF NOT EXISTS idx_deeplink_mappings_expires 
    ON deeplink_mappings(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_click_events_commission 
    ON click_events(commission_amount) WHERE commission_amount > 0;
CREATE INDEX IF NOT EXISTS idx_click_events_clicked_at 
    ON click_events(clicked_at);

-- 5. RLS 정책 설정
ALTER TABLE deeplink_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- 딥링크는 공개적으로 읽을 수 있음 (리디렉션을 위해)
CREATE POLICY "Public can read deeplink mappings" 
    ON deeplink_mappings FOR SELECT 
    USING (true);

-- 사용자는 자신의 딥링크만 관리 가능
CREATE POLICY "Users can manage own deeplinks" 
    ON deeplink_mappings FOR ALL 
    USING (
        user_campaign_id IN (
            SELECT id FROM user_campaigns 
            WHERE user_id IN (
                SELECT id FROM users WHERE email = current_setting('request.jwt.claims')::json->>'email'
            )
        )
    );

-- Admin users는 관리자만 접근 가능
CREATE POLICY "Only admins can access admin_users" 
    ON admin_users FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE email = current_setting('request.jwt.claims')::json->>'email'
            AND is_active = true
        )
    );

-- 6. 딥링크 통계 업데이트 트리거
CREATE OR REPLACE FUNCTION update_deeplink_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- 딥링크 통계 업데이트
    UPDATE deeplink_mappings 
    SET 
        click_count = click_count + 1,
        last_accessed_at = NOW(),
        updated_at = NOW()
    WHERE user_campaign_id = NEW.user_campaign_id;
    
    -- 유니크 클릭 업데이트 (같은 IP에서 첫 클릭인 경우)
    IF NOT EXISTS (
        SELECT 1 FROM click_events 
        WHERE user_campaign_id = NEW.user_campaign_id 
        AND ip_address = NEW.ip_address 
        AND id != NEW.id
    ) THEN
        UPDATE deeplink_mappings 
        SET unique_clicks = unique_clicks + 1
        WHERE user_campaign_id = NEW.user_campaign_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS trigger_update_deeplink_stats ON click_events;
CREATE TRIGGER trigger_update_deeplink_stats
    AFTER INSERT ON click_events
    FOR EACH ROW
    EXECUTE FUNCTION update_deeplink_stats();

-- 7. 클릭 수익 계산 함수
CREATE OR REPLACE FUNCTION calculate_click_commission(
    p_campaign_id UUID,
    p_user_id UUID
) RETURNS DECIMAL AS $$
DECLARE
    v_base_cpc DECIMAL;
    v_user_level INTEGER;
    v_level_bonus DECIMAL;
    v_total_commission DECIMAL;
BEGIN
    -- 캠페인 CPC 가져오기
    SELECT cpc_rate INTO v_base_cpc
    FROM campaigns 
    WHERE id = p_campaign_id;
    
    -- 사용자 레벨 가져오기
    SELECT level INTO v_user_level
    FROM users 
    WHERE id = p_user_id;
    
    -- 레벨 보너스 계산 (레벨당 1% 추가)
    v_level_bonus := v_base_cpc * (v_user_level - 1) * 0.01;
    
    -- 총 수수료 계산
    v_total_commission := v_base_cpc + v_level_bonus;
    
    RETURN v_total_commission;
END;
$$ LANGUAGE plpgsql;

-- 8. 만료된 딥링크 정리 함수
CREATE OR REPLACE FUNCTION cleanup_expired_deeplinks()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM deeplink_mappings 
    WHERE expires_at IS NOT NULL 
    AND expires_at < NOW();
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 9. 권한 부여
GRANT SELECT ON deeplink_mappings TO anon, authenticated;
GRANT INSERT, UPDATE ON deeplink_mappings TO authenticated;
GRANT ALL ON admin_users TO service_role;

-- 함수 실행 권한
GRANT EXECUTE ON FUNCTION calculate_click_commission TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_deeplinks TO service_role;

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '✅ Click tracking system completion tables and functions created successfully!';
END$$;