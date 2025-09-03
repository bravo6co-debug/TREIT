-- ===================================
-- Treit Database Schema: Templates Table
-- ===================================
-- 템플릿 정보 테이블 (포스팅 콘텐츠, 이미지, 해시태그 포함)
-- DATABASE.md 기반

-- Templates table - 캠페인 템플릿
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    
    -- Template Basic Information
    name TEXT NOT NULL,
    description TEXT,
    type template_type NOT NULL DEFAULT 'social_post',
    
    -- Content Structure (확장된 구조)
    content JSONB NOT NULL,
    /* content 구조 예시:
    {
        "title": "여름 세일 50% 할인!",
        "body": "지금 바로 확인하세요. 여름 시즌 한정 특가!",
        "cta_text": "구매하기",
        "hashtags": ["#여름세일", "#50%할인", "#특가"],
        "mentions": ["@brandname"],
        "images": [
            {
                "url": "https://storage.example.com/image1.jpg",
                "alt_text": "여름 세일 배너",
                "position": "main"
            }
        ],
        "videos": [
            {
                "url": "https://storage.example.com/video1.mp4",
                "thumbnail": "https://storage.example.com/thumb1.jpg",
                "duration": 30
            }
        ],
        "styling": {
            "background_color": "#FF6B6B",
            "text_color": "#FFFFFF",
            "font_family": "Pretendard"
        }
    }
    */
    
    -- Platform-Specific Variations
    platform_variations JSONB DEFAULT '{}',
    /* platform_variations 구조:
    {
        "instagram": {
            "story_content": {...},
            "feed_content": {...},
            "reel_content": {...}
        },
        "tiktok": {
            "video_script": "...",
            "effects": [...]
        },
        "facebook": {
            "post_content": {...},
            "ad_content": {...}
        }
    }
    */
    
    -- Media Assets
    primary_image_url TEXT,
    secondary_images JSONB DEFAULT '[]', -- Array of image objects
    video_url TEXT,
    video_thumbnail_url TEXT,
    
    -- Content Guidelines
    posting_guidelines JSONB DEFAULT '{}',
    /* posting_guidelines 구조:
    {
        "required_hashtags": ["#필수해시태그"],
        "optional_hashtags": ["#선택해시태그"],
        "posting_times": ["09:00-12:00", "18:00-21:00"],
        "content_rules": ["제품명 반드시 포함", "가격 정보 필수"],
        "prohibited_words": ["금지어1", "금지어2"]
    }
    */
    
    -- Preview & Display
    preview_image_url TEXT, -- 템플릿 미리보기 이미지
    preview_text TEXT, -- 간단한 미리보기 텍스트
    
    -- Performance Tracking
    usage_count INTEGER NOT NULL DEFAULT 0,
    click_count INTEGER NOT NULL DEFAULT 0,
    conversion_count INTEGER NOT NULL DEFAULT 0,
    total_impressions INTEGER NOT NULL DEFAULT 0,
    
    -- Performance Metrics (계산된 값)
    performance_score DECIMAL(5,2) NOT NULL DEFAULT 0,
    engagement_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN total_impressions > 0 
            THEN (click_count::DECIMAL / total_impressions * 100)
            ELSE 0 
        END
    ) STORED,
    conversion_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN click_count > 0 
            THEN (conversion_count::DECIMAL / click_count * 100)
            ELSE 0 
        END
    ) STORED,
    
    -- Quality & Review
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    review_notes TEXT,
    content_warnings TEXT[],
    
    -- Targeting & Optimization
    target_audience JSONB DEFAULT '{}',
    /* target_audience가 campaigns와 다른 점:
       템플릿별로 더 세분화된 타겟팅 가능
    {
        "primary_demographics": {...},
        "interests": [...],
        "behaviors": [...],
        "custom_audiences": [...]
    }
    */
    
    -- A/B Testing Support
    is_control_template BOOLEAN DEFAULT false, -- A/B 테스트의 컨트롤 그룹
    ab_test_group TEXT, -- A/B 테스트 그룹 식별자
    parent_template_id UUID REFERENCES templates(id), -- 변형 템플릿의 원본
    
    -- Approval & Status
    approval_status approval_status NOT NULL DEFAULT 'PENDING',
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES admin_users(id),
    rejection_reason TEXT,
    
    -- Template Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_featured BOOLEAN DEFAULT false, -- 추천 템플릿 여부
    featured_until TIMESTAMPTZ, -- 추천 기간
    
    -- Scheduling
    available_from TIMESTAMPTZ,
    available_until TIMESTAMPTZ,
    
    -- Version Control
    version INTEGER NOT NULL DEFAULT 1,
    previous_version_id UUID REFERENCES templates(id),
    version_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================
-- Indexes for Performance
-- ===================================

CREATE INDEX idx_templates_campaign_id ON templates(campaign_id);
CREATE INDEX idx_templates_active ON templates(is_active) WHERE is_active = true;
CREATE INDEX idx_templates_approved ON templates(approval_status) WHERE approval_status = 'APPROVED';
CREATE INDEX idx_templates_performance ON templates(performance_score DESC);
CREATE INDEX idx_templates_engagement ON templates(engagement_rate DESC);
CREATE INDEX idx_templates_usage ON templates(usage_count DESC);
CREATE INDEX idx_templates_type ON templates(type);
CREATE INDEX idx_templates_featured ON templates(is_featured, featured_until) WHERE is_featured = true;
CREATE INDEX idx_templates_available ON templates(available_from, available_until);
CREATE INDEX idx_templates_ab_test ON templates(ab_test_group) WHERE ab_test_group IS NOT NULL;
CREATE INDEX idx_templates_parent ON templates(parent_template_id) WHERE parent_template_id IS NOT NULL;

-- GIN indexes for JSONB fields
CREATE INDEX idx_templates_content ON templates USING GIN (content);
CREATE INDEX idx_templates_platform_variations ON templates USING GIN (platform_variations);
CREATE INDEX idx_templates_posting_guidelines ON templates USING GIN (posting_guidelines);
CREATE INDEX idx_templates_target_audience ON templates USING GIN (target_audience);

-- Composite indexes for common queries
CREATE INDEX idx_templates_active_campaign ON templates(campaign_id, is_active, approval_status)
    WHERE is_active = true AND approval_status = 'APPROVED';

-- ===================================
-- Row Level Security (RLS) Policies
-- ===================================

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Public can view active, approved templates for active campaigns
CREATE POLICY "Users can view active templates" ON templates
    FOR SELECT USING (
        is_active = true 
        AND approval_status = 'APPROVED'
        AND (available_until IS NULL OR available_until >= NOW())
        AND (available_from IS NULL OR available_from <= NOW())
        AND campaign_id IN (
            SELECT id FROM campaigns 
            WHERE is_active = true 
              AND approval_status = 'APPROVED'
              AND (end_date IS NULL OR end_date >= CURRENT_DATE)
        )
    );

-- Businesses can manage templates for their campaigns
CREATE POLICY "Businesses can manage own campaign templates" ON templates
    FOR ALL USING (
        campaign_id IN (
            SELECT c.id FROM campaigns c
            JOIN businesses b ON c.business_id = b.id
            WHERE b.auth_uid = auth.uid()
        )
    )
    WITH CHECK (
        campaign_id IN (
            SELECT c.id FROM campaigns c
            JOIN businesses b ON c.business_id = b.id
            WHERE b.auth_uid = auth.uid()
        )
    );

-- Admins can manage all templates
CREATE POLICY "Admins can manage all templates" ON templates
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

-- Function to calculate template performance score
CREATE OR REPLACE FUNCTION calculate_template_performance_score(template_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    v_usage_score DECIMAL;
    v_engagement_score DECIMAL;
    v_conversion_score DECIMAL;
    v_quality_score DECIMAL;
    v_final_score DECIMAL;
BEGIN
    SELECT 
        -- Usage score (0-25 points): 사용 빈도 기반
        LEAST(usage_count * 0.5, 25) as usage_score,
        -- Engagement score (0-35 points): 참여율 기반
        LEAST(engagement_rate * 3.5, 35) as engagement_score,
        -- Conversion score (0-30 points): 전환율 기반
        LEAST(conversion_rate * 6, 30) as conversion_score,
        -- Quality score (0-10 points): 품질 평점 기반
        COALESCE(quality_rating * 2, 6) as quality_score
    INTO v_usage_score, v_engagement_score, v_conversion_score, v_quality_score
    FROM templates
    WHERE id = template_id;
    
    v_final_score := v_usage_score + v_engagement_score + v_conversion_score + v_quality_score;
    
    -- Update the template with new performance score
    UPDATE templates 
    SET performance_score = v_final_score, updated_at = NOW()
    WHERE id = template_id;
    
    RETURN v_final_score;
END;
$$ LANGUAGE plpgsql;

-- Function to create template variation for A/B testing
CREATE OR REPLACE FUNCTION create_template_variation(
    p_parent_template_id UUID,
    p_variation_name TEXT,
    p_content_changes JSONB,
    p_test_group TEXT
)
RETURNS UUID AS $$
DECLARE
    v_new_template_id UUID;
    v_parent_content JSONB;
    v_new_content JSONB;
BEGIN
    -- Get parent template content
    SELECT content INTO v_parent_content
    FROM templates
    WHERE id = p_parent_template_id;
    
    -- Merge content changes
    v_new_content := v_parent_content || p_content_changes;
    
    -- Create new template variation
    INSERT INTO templates (
        campaign_id,
        name,
        type,
        content,
        platform_variations,
        posting_guidelines,
        target_audience,
        parent_template_id,
        ab_test_group,
        is_control_template,
        approval_status,
        version
    )
    SELECT 
        campaign_id,
        name || ' - ' || p_variation_name,
        type,
        v_new_content,
        platform_variations,
        posting_guidelines,
        target_audience,
        p_parent_template_id,
        p_test_group,
        false,
        'PENDING',
        version + 1
    FROM templates
    WHERE id = p_parent_template_id
    RETURNING id INTO v_new_template_id;
    
    RETURN v_new_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to extract hashtags from content
CREATE OR REPLACE FUNCTION extract_hashtags_from_content(content_json JSONB)
RETURNS TEXT[] AS $$
DECLARE
    hashtags TEXT[];
    content_text TEXT;
BEGIN
    -- Extract hashtags from title and body
    content_text := COALESCE(content_json->>'title', '') || ' ' || COALESCE(content_json->>'body', '');
    
    -- Find all hashtags in text
    hashtags := regexp_split_to_array(content_text, '\s+');
    hashtags := array(
        SELECT unnest(hashtags) as tag 
        WHERE tag LIKE '#%' AND length(tag) > 1
    );
    
    -- Also include explicitly defined hashtags
    IF content_json ? 'hashtags' THEN
        hashtags := hashtags || ARRAY(SELECT jsonb_array_elements_text(content_json->'hashtags'));
    END IF;
    
    -- Remove duplicates and return
    RETURN array(SELECT DISTINCT unnest(hashtags));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to validate template content
CREATE OR REPLACE FUNCTION validate_template_content()
RETURNS TRIGGER AS $$
DECLARE
    required_fields TEXT[] := ARRAY['title', 'body'];
    field_name TEXT;
    hashtags TEXT[];
BEGIN
    -- Check required fields in content
    FOREACH field_name IN ARRAY required_fields LOOP
        IF NOT (NEW.content ? field_name) OR (NEW.content->>field_name) IS NULL OR (NEW.content->>field_name) = '' THEN
            RAISE EXCEPTION 'Template content must include %', field_name;
        END IF;
    END LOOP;
    
    -- Extract and validate hashtags
    hashtags := extract_hashtags_from_content(NEW.content);
    IF array_length(hashtags, 1) < 1 THEN
        RAISE EXCEPTION 'Template must include at least one hashtag';
    END IF;
    
    -- Set preview text if not provided
    IF NEW.preview_text IS NULL THEN
        NEW.preview_text := left(NEW.content->>'title', 100);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update template timestamps
CREATE OR REPLACE FUNCTION update_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    -- Recalculate performance score on significant updates
    IF OLD.usage_count != NEW.usage_count OR 
       OLD.click_count != NEW.click_count OR 
       OLD.conversion_count != NEW.conversion_count OR
       OLD.total_impressions != NEW.total_impressions THEN
        PERFORM calculate_template_performance_score(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- Triggers
-- ===================================

-- Validate template content on insert/update
CREATE TRIGGER trigger_validate_template_content
    BEFORE INSERT OR UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION validate_template_content();

-- Update timestamp and performance score
CREATE TRIGGER trigger_templates_updated_at
    BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_templates_updated_at();

-- ===================================
-- Template Categories for Organization
-- ===================================

CREATE TABLE template_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    icon_url TEXT,
    color_code TEXT, -- HEX color for UI
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Junction table for template-category relationships
CREATE TABLE template_category_mappings (
    template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
    category_id UUID REFERENCES template_categories(id) ON DELETE CASCADE,
    PRIMARY KEY (template_id, category_id)
);

-- Insert default template categories
INSERT INTO template_categories (name, description, color_code, sort_order) VALUES
('패션/뷰티', '패션 및 뷰티 제품 관련 템플릿', '#FF69B4', 1),
('음식/외식', '식당, 카페, 음식 관련 템플릿', '#FFA500', 2),
('여행/숙박', '여행지, 호텔, 숙박 관련 템플릿', '#4169E1', 3),
('교육/강의', '온라인 강의, 교육 서비스 템플릿', '#32CD32', 4),
('헬스/피트니스', '운동, 건강 관련 템플릿', '#DC143C', 5),
('테크/앱', '앱, IT 서비스 관련 템플릿', '#8A2BE2', 6),
('라이프스타일', '일반 라이프스타일 제품/서비스', '#20B2AA', 7),
('이벤트/프로모션', '특별 이벤트 및 프로모션용', '#FF6347', 8);

-- Comment: Templates table with comprehensive content management, A/B testing, and performance tracking