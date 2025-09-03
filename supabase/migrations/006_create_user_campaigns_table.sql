-- ===================================
-- Treit Database Schema: User Campaigns Table
-- ===================================
-- 사용자-캠페인 매칭 테이블 (추적 코드 및 성과 관리)
-- DATABASE.md 기반

-- User Campaigns table - 사용자-캠페인 매칭 관계
CREATE TABLE user_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    
    -- Tracking System
    tracking_code TEXT UNIQUE NOT NULL DEFAULT generate_tracking_code(),
    share_url TEXT GENERATED ALWAYS AS (
        'https://tre-it.com/t/' || tracking_code
    ) STORED,
    
    -- Platform Information
    platform social_platform NOT NULL,
    platform_post_id TEXT, -- 플랫폼에서 실제 포스팅 ID
    platform_post_url TEXT, -- 플랫폼에서 실제 포스팅 URL
    platform_username TEXT, -- 포스팅한 계정명
    
    -- Content Metadata
    posted_content JSONB DEFAULT '{}',
    /* posted_content 구조:
    {
        "actual_hashtags": ["#실제사용한해시태그"],
        "actual_text": "실제 포스팅 텍스트",
        "mentions": ["@멘션계정"],
        "modifications": ["해시태그 추가", "텍스트 수정"],
        "media_urls": ["실제 사용된 이미지/영상 URL"]
    }
    */
    
    -- Performance Metrics
    click_count INTEGER NOT NULL DEFAULT 0,
    unique_clicks INTEGER NOT NULL DEFAULT 0, -- 중복 제거된 클릭 수
    earned_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    pending_amount DECIMAL(10,2) NOT NULL DEFAULT 0, -- 아직 정산되지 않은 금액
    
    -- Engagement Tracking
    impressions INTEGER NOT NULL DEFAULT 0, -- 노출 수
    likes_count INTEGER DEFAULT 0, -- 좋아요 수 (API로 수집)
    comments_count INTEGER DEFAULT 0, -- 댓글 수
    shares_count INTEGER DEFAULT 0, -- 공유 수
    saves_count INTEGER DEFAULT 0, -- 저장 수
    
    -- Calculated Metrics
    engagement_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN impressions > 0 
            THEN ((likes_count + comments_count + shares_count + saves_count)::DECIMAL / impressions * 100)
            ELSE 0 
        END
    ) STORED,
    
    ctr DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN impressions > 0 
            THEN (click_count::DECIMAL / impressions * 100)
            ELSE 0 
        END
    ) STORED,
    
    -- Quality Score
    content_quality_score DECIMAL(3,2) DEFAULT 5.00 CHECK (content_quality_score >= 0 AND content_quality_score <= 10),
    compliance_score DECIMAL(3,2) DEFAULT 10.00 CHECK (compliance_score >= 0 AND compliance_score <= 10),
    
    -- Status & Lifecycle
    status matching_status NOT NULL DEFAULT 'ACTIVE',
    
    -- Approval & Review
    requires_review BOOLEAN DEFAULT false, -- 관리자 검토 필요 여부
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES admin_users(id),
    review_notes TEXT,
    
    -- Fraud & Quality Control
    suspicious_activity BOOLEAN DEFAULT false,
    fraud_flags TEXT[], -- 의심스러운 활동 플래그들
    quality_issues TEXT[], -- 품질 이슈들
    
    -- Scheduling & Timing
    scheduled_post_time TIMESTAMPTZ, -- 예약 포스팅 시간
    shared_at TIMESTAMPTZ DEFAULT NOW(), -- 실제 공유된 시간
    completed_at TIMESTAMPTZ, -- 캠페인 완료 시간
    
    -- Attribution & Referral
    referral_source TEXT, -- 추천 경로
    attribution_data JSONB DEFAULT '{}', -- 어트리뷰션 데이터
    
    -- Device & Technical Info
    device_info JSONB DEFAULT '{}',
    /* device_info 구조:
    {
        "device_type": "mobile",
        "os": "iOS",
        "app_version": "1.0.0",
        "location": "Seoul, KR"
    }
    */
    
    -- Campaign Specific Settings
    campaign_settings JSONB DEFAULT '{}',
    /* campaign_settings 구조:
    {
        "custom_tracking_params": {...},
        "special_instructions": "...",
        "bonus_eligibility": true,
        "priority_level": "high"
    }
    */
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, campaign_id, template_id, platform), -- 동일 사용자가 같은 템플릿을 같은 플랫폼에 중복 사용 방지
    CHECK (earned_amount >= 0),
    CHECK (pending_amount >= 0),
    CHECK (click_count >= 0),
    CHECK (impressions >= 0)
);

-- ===================================
-- Indexes for Performance
-- ===================================

CREATE INDEX idx_user_campaigns_user_id ON user_campaigns(user_id);
CREATE INDEX idx_user_campaigns_campaign_id ON user_campaigns(campaign_id);
CREATE INDEX idx_user_campaigns_template_id ON user_campaigns(template_id);
CREATE INDEX idx_user_campaigns_tracking_code ON user_campaigns(tracking_code);
CREATE INDEX idx_user_campaigns_status ON user_campaigns(status);
CREATE INDEX idx_user_campaigns_platform ON user_campaigns(platform);
CREATE INDEX idx_user_campaigns_shared_at ON user_campaigns(shared_at DESC);
CREATE INDEX idx_user_campaigns_performance ON user_campaigns(click_count DESC, earned_amount DESC);
CREATE INDEX idx_user_campaigns_engagement ON user_campaigns(engagement_rate DESC);
CREATE INDEX idx_user_campaigns_quality ON user_campaigns(content_quality_score DESC);

-- Composite indexes for common queries
CREATE INDEX idx_user_campaigns_active_user ON user_campaigns(user_id, status) WHERE status = 'ACTIVE';
CREATE INDEX idx_user_campaigns_active_campaign ON user_campaigns(campaign_id, status) WHERE status = 'ACTIVE';
CREATE INDEX idx_user_campaigns_review_required ON user_campaigns(requires_review, created_at DESC) WHERE requires_review = true;
CREATE INDEX idx_user_campaigns_suspicious ON user_campaigns(suspicious_activity, created_at DESC) WHERE suspicious_activity = true;

-- GIN indexes for JSONB fields
CREATE INDEX idx_user_campaigns_posted_content ON user_campaigns USING GIN (posted_content);
CREATE INDEX idx_user_campaigns_attribution_data ON user_campaigns USING GIN (attribution_data);
CREATE INDEX idx_user_campaigns_device_info ON user_campaigns USING GIN (device_info);
CREATE INDEX idx_user_campaigns_campaign_settings ON user_campaigns USING GIN (campaign_settings);

-- ===================================
-- Row Level Security (RLS) Policies
-- ===================================

ALTER TABLE user_campaigns ENABLE ROW LEVEL SECURITY;

-- Users can view and manage their own campaigns
CREATE POLICY "Users can view own campaigns" ON user_campaigns
    FOR SELECT USING (
        user_id IN (SELECT id FROM users WHERE auth_uid = auth.uid())
    );

CREATE POLICY "Users can create campaigns" ON user_campaigns
    FOR INSERT WITH CHECK (
        user_id IN (SELECT id FROM users WHERE auth_uid = auth.uid()) AND
        campaign_id IN (
            SELECT id FROM campaigns 
            WHERE is_active = true 
              AND approval_status = 'APPROVED'
              AND (end_date IS NULL OR end_date >= CURRENT_DATE)
        )
    );

CREATE POLICY "Users can update own campaigns" ON user_campaigns
    FOR UPDATE USING (
        user_id IN (SELECT id FROM users WHERE auth_uid = auth.uid())
    )
    WITH CHECK (
        user_id IN (SELECT id FROM users WHERE auth_uid = auth.uid()) AND
        -- 사용자는 일부 시스템 필드 수정 불가
        OLD.earned_amount = NEW.earned_amount AND
        OLD.click_count = NEW.click_count AND
        OLD.unique_clicks = NEW.unique_clicks AND
        OLD.impressions = NEW.impressions
    );

-- Businesses can view campaigns for their campaigns
CREATE POLICY "Businesses can view campaigns for own campaigns" ON user_campaigns
    FOR SELECT USING (
        campaign_id IN (
            SELECT c.id FROM campaigns c
            JOIN businesses b ON c.business_id = b.id
            WHERE b.auth_uid = auth.uid()
        )
    );

-- Admins can manage all user campaigns
CREATE POLICY "Admins can manage all user campaigns" ON user_campaigns
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

-- Function to generate unique tracking code
CREATE OR REPLACE FUNCTION generate_tracking_code() 
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    exists_check BOOLEAN := TRUE;
BEGIN
    WHILE exists_check LOOP
        -- Generate 16-character tracking code
        code := encode(gen_random_bytes(12), 'base64');
        -- Make it URL-safe
        code := replace(replace(replace(code, '+', ''), '/', ''), '=', '');
        code := substring(code from 1 for 16);
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM user_campaigns WHERE tracking_code = code) INTO exists_check;
    END LOOP;
    
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate earnings based on clicks
CREATE OR REPLACE FUNCTION calculate_user_campaign_earnings(
    p_user_campaign_id UUID,
    p_click_count INTEGER
)
RETURNS DECIMAL AS $$
DECLARE
    v_cpc_rate DECIMAL;
    v_user_grade user_grade;
    v_grade_multiplier DECIMAL;
    v_earnings DECIMAL;
BEGIN
    -- Get campaign CPC rate and user grade
    SELECT c.cpc_rate, u.grade INTO v_cpc_rate, v_user_grade
    FROM user_campaigns uc
    JOIN campaigns c ON uc.campaign_id = c.id
    JOIN users u ON uc.user_id = u.id
    WHERE uc.id = p_user_campaign_id;
    
    -- Apply grade-based multiplier (treit_gamerule.md 기반)
    v_grade_multiplier := CASE v_user_grade
        WHEN 'BRONZE' THEN 0.45   -- 40원 (45% of 80원 플래티넘 기준이 아닌, 40원 고정)
        WHEN 'SILVER' THEN 0.65   -- 52원
        WHEN 'GOLD' THEN 0.80     -- 64원
        WHEN 'DIAMOND' THEN 0.90  -- 72원
        WHEN 'PLATINUM' THEN 1.00 -- 80원
        ELSE 0.45
    END;
    
    -- Calculate earnings
    v_earnings := v_cpc_rate * v_grade_multiplier * p_click_count;
    
    RETURN v_earnings;
END;
$$ LANGUAGE plpgsql;

-- Function to update user campaign performance
CREATE OR REPLACE FUNCTION update_user_campaign_performance(
    p_user_campaign_id UUID,
    p_new_clicks INTEGER DEFAULT 1,
    p_new_impressions INTEGER DEFAULT 0
)
RETURNS BOOLEAN AS $$
DECLARE
    v_new_earnings DECIMAL;
BEGIN
    -- Calculate new earnings
    v_new_earnings := calculate_user_campaign_earnings(p_user_campaign_id, p_new_clicks);
    
    -- Update user campaign
    UPDATE user_campaigns
    SET 
        click_count = click_count + p_new_clicks,
        impressions = impressions + p_new_impressions,
        pending_amount = pending_amount + v_new_earnings,
        updated_at = NOW()
    WHERE id = p_user_campaign_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to validate user campaign creation
CREATE OR REPLACE FUNCTION validate_user_campaign_creation()
RETURNS TRIGGER AS $$
DECLARE
    v_campaign_active BOOLEAN;
    v_template_active BOOLEAN;
    v_user_active BOOLEAN;
    v_existing_count INTEGER;
BEGIN
    -- Check if campaign is active and approved
    SELECT (is_active = true AND approval_status = 'APPROVED' AND 
            (end_date IS NULL OR end_date >= CURRENT_DATE)) 
    INTO v_campaign_active
    FROM campaigns WHERE id = NEW.campaign_id;
    
    IF NOT v_campaign_active THEN
        RAISE EXCEPTION 'Campaign is not active or not approved';
    END IF;
    
    -- Check if template is active and approved
    SELECT (is_active = true AND approval_status = 'APPROVED')
    INTO v_template_active
    FROM templates WHERE id = NEW.template_id;
    
    IF NOT v_template_active THEN
        RAISE EXCEPTION 'Template is not active or not approved';
    END IF;
    
    -- Check if user is active
    SELECT (status = 'ACTIVE') INTO v_user_active
    FROM users WHERE id = NEW.user_id;
    
    IF NOT v_user_active THEN
        RAISE EXCEPTION 'User account is not active';
    END IF;
    
    -- Check for duplicate participation (same user, campaign, template, platform)
    SELECT COUNT(*) INTO v_existing_count
    FROM user_campaigns
    WHERE user_id = NEW.user_id 
      AND campaign_id = NEW.campaign_id 
      AND template_id = NEW.template_id 
      AND platform = NEW.platform
      AND status IN ('ACTIVE', 'COMPLETED');
    
    IF v_existing_count > 0 THEN
        RAISE EXCEPTION 'User has already participated in this campaign with the same template on this platform';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update campaign and template statistics
CREATE OR REPLACE FUNCTION update_campaign_template_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment template usage count
        UPDATE templates 
        SET usage_count = usage_count + 1, updated_at = NOW()
        WHERE id = NEW.template_id;
        
        -- Update campaign participant count
        UPDATE campaigns
        SET total_impressions = total_impressions + 1, updated_at = NOW()
        WHERE id = NEW.campaign_id;
        
    ELSIF TG_OP = 'UPDATE' AND OLD.click_count != NEW.click_count THEN
        -- Update template click count
        UPDATE templates 
        SET click_count = click_count + (NEW.click_count - OLD.click_count),
            updated_at = NOW()
        WHERE id = NEW.template_id;
        
        -- Update campaign click count
        UPDATE campaigns
        SET total_clicks = total_clicks + (NEW.click_count - OLD.click_count),
            updated_at = NOW()
        WHERE id = NEW.campaign_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_user_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- Triggers
-- ===================================

-- Validate user campaign creation
CREATE TRIGGER trigger_validate_user_campaign_creation
    BEFORE INSERT ON user_campaigns
    FOR EACH ROW EXECUTE FUNCTION validate_user_campaign_creation();

-- Update campaign and template statistics
CREATE TRIGGER trigger_update_campaign_template_stats
    AFTER INSERT OR UPDATE ON user_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_campaign_template_stats();

-- Update timestamp
CREATE TRIGGER trigger_user_campaigns_updated_at
    BEFORE UPDATE ON user_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_user_campaigns_updated_at();

-- ===================================
-- Additional Tables for Enhanced Tracking
-- ===================================

-- Social Platform Integrations (for automatic data collection)
CREATE TABLE platform_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform social_platform NOT NULL,
    platform_user_id TEXT NOT NULL,
    platform_username TEXT NOT NULL,
    access_token TEXT, -- encrypted
    refresh_token TEXT, -- encrypted
    token_expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    permissions JSONB DEFAULT '{}', -- granted permissions
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, platform)
);

-- Platform API call logs
CREATE TABLE platform_api_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID REFERENCES platform_integrations(id) ON DELETE CASCADE,
    api_endpoint TEXT NOT NULL,
    request_data JSONB,
    response_data JSONB,
    status_code INTEGER,
    error_message TEXT,
    execution_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_platform_integrations_user ON platform_integrations(user_id);
CREATE INDEX idx_platform_integrations_platform ON platform_integrations(platform);
CREATE INDEX idx_platform_api_logs_integration ON platform_api_logs(integration_id);
CREATE INDEX idx_platform_api_logs_created_at ON platform_api_logs(created_at DESC);

-- Comment: User Campaigns table with comprehensive tracking, performance metrics, and social platform integration