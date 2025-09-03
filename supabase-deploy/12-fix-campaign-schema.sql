-- ============================================
-- 캠페인 테이블 스키마 수정
-- 프론트엔드와 일치하도록 campaigns 테이블 재생성
-- ============================================

-- 1. 기존 테이블 백업 (데이터가 있는 경우)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaigns') THEN
        -- 백업 테이블 생성
        CREATE TABLE IF NOT EXISTS campaigns_backup AS SELECT * FROM campaigns;
        RAISE NOTICE '✅ Campaigns table backed up to campaigns_backup';
    END IF;
END$$;

-- 2. 기존 테이블 삭제 (CASCADE로 관련 제약조건도 함께 삭제)
DROP TABLE IF EXISTS campaigns CASCADE;

-- 3. 새로운 campaigns 테이블 생성 (올바른 스키마)
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category campaign_category DEFAULT 'SHOPPING',
    budget DECIMAL(15, 2) NOT NULL,
    spent DECIMAL(15, 2) DEFAULT 0,
    cpc_rate DECIMAL(10, 2) NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    target_clicks INTEGER,
    current_clicks INTEGER DEFAULT 0,
    target_demographics JSONB DEFAULT '{}',
    target_regions JSONB DEFAULT '[]',
    target_interests JSONB DEFAULT '[]',
    destination_url TEXT NOT NULL,
    tracking_url TEXT,
    image_url TEXT,
    video_url TEXT,
    is_active BOOLEAN DEFAULT false,
    approval_status approval_status DEFAULT 'PENDING',
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID,
    rejection_reason TEXT,
    performance_data JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. 인덱스 생성
CREATE INDEX idx_campaigns_business_id ON campaigns(business_id);
CREATE INDEX idx_campaigns_status ON campaigns(is_active, approval_status);
CREATE INDEX idx_campaigns_dates ON campaigns(start_date, end_date);
CREATE INDEX idx_campaigns_created ON campaigns(created_at DESC);

-- 5. RLS 정책 설정
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- 광고주는 자신의 캠페인만 볼 수 있음
CREATE POLICY "Businesses can view own campaigns" ON campaigns
    FOR SELECT USING (
        business_id IN (
            SELECT id FROM businesses 
            WHERE email = current_setting('request.jwt.claims')::json->>'email'
        )
    );

-- 광고주는 자신의 캠페인만 생성할 수 있음
CREATE POLICY "Businesses can create own campaigns" ON campaigns
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT id FROM businesses 
            WHERE email = current_setting('request.jwt.claims')::json->>'email'
        )
    );

-- 광고주는 자신의 캠페인만 수정할 수 있음
CREATE POLICY "Businesses can update own campaigns" ON campaigns
    FOR UPDATE USING (
        business_id IN (
            SELECT id FROM businesses 
            WHERE email = current_setting('request.jwt.claims')::json->>'email'
        )
    );

-- 광고주는 자신의 캠페인만 삭제할 수 있음
CREATE POLICY "Businesses can delete own campaigns" ON campaigns
    FOR DELETE USING (
        business_id IN (
            SELECT id FROM businesses 
            WHERE email = current_setting('request.jwt.claims')::json->>'email'
        )
    );

-- 6. 데이터 복원 시도 (백업이 있는 경우)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaigns_backup') THEN
        -- 호환되는 컬럼만 복원
        INSERT INTO campaigns (
            id,
            business_id,
            name,
            description,
            category,
            budget,
            spent,
            cpc_rate,
            start_date,
            end_date,
            target_clicks,
            current_clicks,
            destination_url,
            image_url,
            is_active,
            approval_status,
            created_at,
            updated_at
        )
        SELECT 
            id,
            COALESCE(business_id, advertiser_id) as business_id,  -- advertiser_id를 business_id로 매핑
            COALESCE(name, title) as name,  -- title을 name으로 매핑
            description,
            COALESCE(category, 'SHOPPING') as category,
            COALESCE(budget, total_budget, 0) as budget,  -- total_budget을 budget으로 매핑
            COALESCE(spent, 0) as spent,
            COALESCE(cpc_rate, cost_per_click, 100) as cpc_rate,  -- cost_per_click을 cpc_rate로 매핑
            start_date,
            end_date,
            COALESCE(target_clicks, total_clicks_target, 0) as target_clicks,  -- total_clicks_target을 target_clicks로 매핑
            COALESCE(current_clicks, 0) as current_clicks,
            COALESCE(destination_url, original_url, '') as destination_url,  -- original_url을 destination_url로 매핑
            image_url,
            COALESCE(is_active, status = 'active', false) as is_active,
            COALESCE(approval_status, 
                CASE 
                    WHEN status = 'active' THEN 'APPROVED'::approval_status
                    WHEN status = 'draft' THEN 'PENDING'::approval_status
                    ELSE 'PENDING'::approval_status
                END
            ) as approval_status,
            created_at,
            updated_at
        FROM campaigns_backup
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE '✅ Data restored from campaigns_backup';
        
        -- 백업 테이블 삭제 (선택사항)
        -- DROP TABLE campaigns_backup;
    END IF;
END$$;

-- 7. 테이블 권한 부여
GRANT SELECT, INSERT, UPDATE, DELETE ON campaigns TO authenticated;
GRANT SELECT ON campaigns TO anon;

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '✅ Campaigns table has been recreated with correct schema!';
    RAISE NOTICE '📝 Table now uses: business_id, name, cpc_rate, budget, destination_url, target_clicks';
    RAISE NOTICE '❌ Removed fields: advertiser_id, title, cost_per_click, total_budget, original_url, total_clicks_target';
END$$;