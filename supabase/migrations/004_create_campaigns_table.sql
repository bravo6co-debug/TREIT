-- ===================================
-- Treit Database Schema: Campaigns Table
-- ===================================
-- 캠페인 정보 테이블 (딥링크 시스템 포함)
-- DATABASE.md 기반

-- Campaigns table - 캠페인 정보
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    
    -- Campaign Basic Information
    title TEXT NOT NULL,
    description TEXT,
    landing_page_url TEXT NOT NULL, -- 원본 URL
    category campaign_category NOT NULL,
    tags TEXT[],
    
    -- Deeplink System (새로 추가)
    original_url TEXT NOT NULL, -- 원본 광고주 URL
    deeplink_code TEXT UNIQUE, -- 고유 딥링크 코드 (자동 생성)
    tracking_params JSONB DEFAULT '{}', -- URL 추적 파라미터
    /* tracking_params 구조:
    {
        "utm_source": "treit",
        "utm_medium": "social",
        "utm_campaign": "campaign_id",
        "custom_params": {...}
    }
    */
    
    -- Pricing Configuration
    cpc_rate DECIMAL(10,2) NOT NULL CHECK (cpc_rate > 0), -- Cost Per Click
    currency TEXT NOT NULL DEFAULT 'KRW',
    
    -- Budget Management
    daily_budget DECIMAL(12,2) CHECK (daily_budget > 0),
    total_budget DECIMAL(12,2) CHECK (total_budget > 0),
    spent_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    remaining_budget DECIMAL(12,2) GENERATED ALWAYS AS (
        CASE 
            WHEN total_budget IS NOT NULL 
            THEN total_budget - spent_amount
            ELSE NULL 
        END
    ) STORED,
    
    -- Campaign Scheduling
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    timezone TEXT DEFAULT 'Asia/Seoul',
    is_active BOOLEAN NOT NULL DEFAULT false,
    paused_at TIMESTAMPTZ,
    
    -- Target Demographics
    target_demographics JSONB DEFAULT '{}',
    /* target_demographics 구조:
    {
        "age_range": [20, 35],
        "gender": ["male", "female"],
        "locations": ["Seoul", "Busan"],
        "interests": ["fashion", "beauty"],
        "platforms": ["instagram", "tiktok"],
        "follower_range": [1000, 10000]
    }
    */
    
    -- Campaign Performance Metrics
    total_clicks INTEGER NOT NULL DEFAULT 0,
    total_impressions INTEGER NOT NULL DEFAULT 0,
    unique_users INTEGER NOT NULL DEFAULT 0,
    conversion_count INTEGER NOT NULL DEFAULT 0,
    
    -- Calculated CTR (Click Through Rate)
    ctr DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN total_impressions > 0 
            THEN (total_clicks::DECIMAL / total_impressions * 100)
            ELSE 0 
        END
    ) STORED,
    
    -- Calculated Conversion Rate
    conversion_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN total_clicks > 0 
            THEN (conversion_count::DECIMAL / total_clicks * 100)
            ELSE 0 
        END
    ) STORED,
    
    -- Approval & Review System
    approval_status approval_status NOT NULL DEFAULT 'PENDING',
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES admin_users(id),
    rejection_reason TEXT,
    
    -- Quality & Compliance
    quality_score DECIMAL(3,2) DEFAULT 5.00 CHECK (quality_score >= 0 AND quality_score <= 10),
    content_warnings TEXT[],
    compliance_notes TEXT,
    
    -- Advanced Settings
    max_clicks_per_user INTEGER DEFAULT 1, -- 사용자당 최대 클릭 수
    click_cooldown_hours INTEGER DEFAULT 24, -- 클릭 간 최소 시간
    geo_restrictions TEXT[], -- 지역 제한
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ -- Soft delete
);

-- ===================================
-- Indexes for Performance
-- ===================================

CREATE INDEX idx_campaigns_business_id ON campaigns(business_id);
CREATE INDEX idx_campaigns_active_approved ON campaigns(is_active, approval_status) 
    WHERE is_active = true AND approval_status = 'APPROVED' AND deleted_at IS NULL;
CREATE INDEX idx_campaigns_category ON campaigns(category);
CREATE INDEX idx_campaigns_dates ON campaigns(start_date, end_date);
CREATE INDEX idx_campaigns_deeplink_code ON campaigns(deeplink_code) WHERE deeplink_code IS NOT NULL;
CREATE INDEX idx_campaigns_budget ON campaigns(remaining_budget DESC) WHERE remaining_budget > 0;
CREATE INDEX idx_campaigns_performance ON campaigns(ctr DESC, conversion_rate DESC);
CREATE INDEX idx_campaigns_quality ON campaigns(quality_score DESC);
CREATE INDEX idx_campaigns_created_at ON campaigns(created_at DESC);

-- Partial index for active campaigns
CREATE INDEX idx_campaigns_active_only ON campaigns(id, title, cpc_rate, category)
    WHERE is_active = true AND approval_status = 'APPROVED' AND deleted_at IS NULL;

-- GIN index for JSONB fields
CREATE INDEX idx_campaigns_target_demographics ON campaigns USING GIN (target_demographics);
CREATE INDEX idx_campaigns_tracking_params ON campaigns USING GIN (tracking_params);

-- ===================================
-- Row Level Security (RLS) Policies
-- ===================================

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Public can view active, approved campaigns
CREATE POLICY "Users can view active campaigns" ON campaigns
    FOR SELECT USING (
        is_active = true 
        AND approval_status = 'APPROVED' 
        AND deleted_at IS NULL
        AND (end_date IS NULL OR end_date >= CURRENT_DATE)
        AND start_date <= CURRENT_DATE
    );

-- Businesses can manage their own campaigns
CREATE POLICY "Businesses can manage own campaigns" ON campaigns
    FOR ALL USING (
        business_id IN (
            SELECT id FROM businesses WHERE auth_uid = auth.uid()
        )
    )
    WITH CHECK (
        business_id IN (
            SELECT id FROM businesses WHERE auth_uid = auth.uid()
        )
    );

-- Admins can manage all campaigns
CREATE POLICY "Admins can manage all campaigns" ON campaigns
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            JOIN users u ON au.user_id = u.id
            WHERE u.auth_uid = auth.uid() AND au.is_active = true
        )
    );

-- ===================================
-- Functions
-- ===================================

-- Function to generate unique deeplink code
CREATE OR REPLACE FUNCTION generate_deeplink_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    exists_check BOOLEAN := TRUE;
BEGIN
    WHILE exists_check LOOP
        -- Generate 12-character alphanumeric code
        code := lower(encode(gen_random_bytes(9), 'base64'));
        -- Remove special characters and make URL-safe
        code := replace(replace(replace(code, '+', ''), '/', ''), '=', '');
        code := substring(code from 1 for 12);
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM campaigns WHERE deeplink_code = code) INTO exists_check;
    END LOOP;
    
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function to create deeplink URL
CREATE OR REPLACE FUNCTION create_deeplink_url(campaign_id UUID)
RETURNS TEXT AS $$
DECLARE
    deeplink_code TEXT;
BEGIN
    SELECT c.deeplink_code INTO deeplink_code
    FROM campaigns c
    WHERE c.id = campaign_id;
    
    IF deeplink_code IS NULL THEN
        RETURN NULL;
    END IF;
    
    RETURN 'https://tre-it.com/go/' || deeplink_code;
END;
$$ LANGUAGE plpgsql;

-- Function to build tracked URL with parameters
CREATE OR REPLACE FUNCTION build_tracked_url(
    original_url TEXT,
    tracking_params JSONB DEFAULT '{}',
    user_tracking_code TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    final_url TEXT;
    param_key TEXT;
    param_value TEXT;
    separator TEXT;
BEGIN
    final_url := original_url;
    
    -- Determine separator (? or &)
    IF position('?' in original_url) > 0 THEN
        separator := '&';
    ELSE
        separator := '?';
    END IF;
    
    -- Add tracking parameters
    FOR param_key, param_value IN SELECT * FROM jsonb_each_text(tracking_params) LOOP
        final_url := final_url || separator || param_key || '=' || param_value;
        separator := '&';
    END LOOP;
    
    -- Add user tracking code if provided
    IF user_tracking_code IS NOT NULL THEN
        final_url := final_url || separator || 'treit_user=' || user_tracking_code;
    END IF;
    
    RETURN final_url;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to auto-generate deeplink code
CREATE OR REPLACE FUNCTION auto_generate_deeplink_code()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate deeplink code if not provided
    IF NEW.deeplink_code IS NULL THEN
        NEW.deeplink_code := generate_deeplink_code();
    END IF;
    
    -- Ensure landing_page_url is set to original_url if not provided
    IF NEW.landing_page_url IS NULL AND NEW.original_url IS NOT NULL THEN
        NEW.landing_page_url := NEW.original_url;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to validate campaign budget
CREATE OR REPLACE FUNCTION validate_campaign_budget()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if daily budget exceeds total budget
    IF NEW.daily_budget IS NOT NULL AND NEW.total_budget IS NOT NULL THEN
        IF NEW.daily_budget > NEW.total_budget THEN
            RAISE EXCEPTION 'Daily budget cannot exceed total budget';
        END IF;
    END IF;
    
    -- Check if spent amount exceeds total budget
    IF NEW.total_budget IS NOT NULL AND NEW.spent_amount > NEW.total_budget THEN
        -- Pause campaign if budget exceeded
        NEW.is_active := false;
        NEW.paused_at := NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update campaign timestamps
CREATE OR REPLACE FUNCTION update_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle campaign approval
CREATE OR REPLACE FUNCTION approve_campaign(
    p_campaign_id UUID,
    p_admin_user_id UUID,
    p_approve BOOLEAN,
    p_rejection_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    IF p_approve THEN
        UPDATE campaigns 
        SET 
            approval_status = 'APPROVED',
            approved_at = NOW(),
            approved_by = p_admin_user_id,
            rejection_reason = NULL,
            updated_at = NOW()
        WHERE id = p_campaign_id;
    ELSE
        UPDATE campaigns 
        SET 
            approval_status = 'REJECTED',
            approved_at = NULL,
            approved_by = p_admin_user_id,
            rejection_reason = p_rejection_reason,
            is_active = false,
            updated_at = NOW()
        WHERE id = p_campaign_id;
    END IF;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================
-- Triggers
-- ===================================

-- Auto-generate deeplink code on insert
CREATE TRIGGER trigger_auto_generate_deeplink_code
    BEFORE INSERT ON campaigns
    FOR EACH ROW EXECUTE FUNCTION auto_generate_deeplink_code();

-- Validate budget on insert/update
CREATE TRIGGER trigger_validate_campaign_budget
    BEFORE INSERT OR UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION validate_campaign_budget();

-- Update timestamp on update
CREATE TRIGGER trigger_campaigns_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_campaigns_updated_at();

-- ===================================
-- Campaign Templates for Quick Setup
-- ===================================

-- Create a table for campaign templates (predefined configurations)
CREATE TABLE campaign_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category campaign_category NOT NULL,
    default_cpc_rate DECIMAL(10,2) NOT NULL,
    default_daily_budget DECIMAL(12,2),
    default_target_demographics JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert some default campaign templates
INSERT INTO campaign_templates (name, description, category, default_cpc_rate, default_daily_budget, default_target_demographics) VALUES
('일반 제품 프로모션', '일반적인 제품 홍보용 캠페인', 'PRODUCT', 150.00, 50000, '{"age_range": [20, 40], "platforms": ["instagram", "facebook"]}'),
('뷰티/패션 캠페인', '뷰티 및 패션 제품 전용', 'PRODUCT', 200.00, 100000, '{"age_range": [18, 35], "gender": ["female"], "platforms": ["instagram", "tiktok"]}'),
('앱 다운로드 캠페인', '모바일 앱 설치 유도', 'APP', 300.00, 80000, '{"age_range": [18, 45], "platforms": ["instagram", "facebook", "tiktok"]}'),
('브랜드 인지도 향상', '브랜드 노출 및 인지도 상승', 'BRAND', 100.00, 200000, '{"age_range": [20, 50], "platforms": ["instagram", "facebook", "youtube"]}');

-- Comment: Campaigns table with deeplink system and comprehensive campaign management features