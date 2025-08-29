-- ===================================
-- Treit Database Schema: Click Events Table (Partitioned)
-- ===================================
-- 클릭 이벤트 파티션 테이블 (대용량 데이터 처리)
-- DATABASE.md 기반

-- Enable pg_cron extension for automated partition management
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Click Events table (Partitioned by date for performance)
CREATE TABLE click_events (
    id UUID DEFAULT gen_random_uuid(),
    user_campaign_id UUID NOT NULL REFERENCES user_campaigns(id) ON DELETE CASCADE,
    
    -- Click Information
    ip_address INET NOT NULL,
    user_agent TEXT,
    referrer_url TEXT,
    
    -- Device & Browser Information
    device_type device_type,
    device_model TEXT,
    browser TEXT,
    browser_version TEXT,
    os TEXT,
    os_version TEXT,
    screen_resolution TEXT, -- "1920x1080"
    
    -- Location Information
    country_code TEXT,
    region TEXT,
    city TEXT,
    timezone TEXT,
    coordinates POINT, -- PostGIS point for precise location
    
    -- Network Information
    isp TEXT, -- Internet Service Provider
    connection_type TEXT, -- "wifi", "cellular", "ethernet"
    
    -- Click Context
    click_source TEXT, -- "direct", "social_share", "search", "referral"
    campaign_context JSONB DEFAULT '{}',
    /* campaign_context 구조:
    {
        "utm_source": "instagram",
        "utm_medium": "social",
        "utm_campaign": "summer_sale",
        "utm_content": "template_123",
        "custom_params": {...}
    }
    */
    
    -- Fraud Detection & Validation
    is_valid BOOLEAN NOT NULL DEFAULT true,
    validation_score DECIMAL(3,2) DEFAULT 1.0 CHECK (validation_score >= 0 AND validation_score <= 1),
    fraud_flags TEXT[] DEFAULT '{}',
    /* 일반적인 fraud_flags:
    - "duplicate_ip": IP 중복
    - "rapid_clicks": 빠른 연속 클릭
    - "bot_detected": 봇 감지
    - "suspicious_pattern": 의심스러운 패턴
    - "vpn_detected": VPN 사용 감지
    */
    
    -- Financial Information
    commission_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'KRW',
    exchange_rate DECIMAL(10,4) DEFAULT 1.0000, -- 다른 통화 지원 시
    
    -- Attribution & Tracking
    attribution_data JSONB DEFAULT '{}',
    /* attribution_data 구조:
    {
        "first_touch": "2024-01-15T10:00:00Z",
        "last_touch": "2024-01-15T14:30:00Z",
        "touch_points": [...],
        "conversion_path": [...]
    }
    */
    
    -- Session Information
    session_id TEXT,
    session_duration INTEGER, -- seconds
    pages_visited INTEGER DEFAULT 1,
    
    -- A/B Testing
    ab_test_group TEXT,
    ab_test_variant TEXT,
    
    -- Metadata for additional tracking
    metadata JSONB DEFAULT '{}',
    /* metadata 구조 (확장 가능):
    {
        "app_version": "1.0.0",
        "sdk_version": "2.1.0",
        "custom_events": [...],
        "user_preferences": {...}
    }
    */
    
    -- Conversion Tracking
    converted BOOLEAN DEFAULT false,
    conversion_value DECIMAL(10,2), -- 전환 시 가치
    conversion_time TIMESTAMPTZ, -- 전환 발생 시간
    
    -- Quality Metrics
    bounce_rate DECIMAL(5,2), -- 이탈률
    time_on_site INTEGER, -- 사이트 체류 시간 (초)
    
    -- Timestamp (Partitioning Key)
    clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Partitioning constraint
    PRIMARY KEY (id, clicked_at)
) PARTITION BY RANGE (clicked_at);

-- ===================================
-- Partition Management
-- ===================================

-- Function to create monthly partitions
CREATE OR REPLACE FUNCTION create_monthly_click_partition(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TEXT AS $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
    table_exists BOOLEAN;
BEGIN
    start_date := date_trunc('month', target_date);
    end_date := start_date + INTERVAL '1 month';
    partition_name := 'click_events_' || to_char(start_date, 'YYYY_MM');
    
    -- Check if partition already exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = partition_name
    ) INTO table_exists;
    
    IF NOT table_exists THEN
        EXECUTE format('CREATE TABLE %I PARTITION OF click_events 
            FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date);
        
        -- Create partition-specific indexes
        EXECUTE format('CREATE INDEX %I ON %I (user_campaign_id, clicked_at DESC)',
            'idx_' || partition_name || '_user_campaign', partition_name);
        
        EXECUTE format('CREATE INDEX %I ON %I (ip_address, clicked_at)',
            'idx_' || partition_name || '_ip', partition_name);
            
        EXECUTE format('CREATE INDEX %I ON %I (is_valid) WHERE is_valid = true',
            'idx_' || partition_name || '_valid', partition_name);
            
        RETURN 'Created partition: ' || partition_name;
    ELSE
        RETURN 'Partition already exists: ' || partition_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to drop old partitions (older than 12 months)
CREATE OR REPLACE FUNCTION drop_old_click_partitions()
RETURNS TEXT AS $$
DECLARE
    cutoff_date DATE;
    partition_record RECORD;
    dropped_count INTEGER := 0;
BEGIN
    cutoff_date := CURRENT_DATE - INTERVAL '12 months';
    
    FOR partition_record IN
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE tablename LIKE 'click_events_____[_]__'
          AND schemaname = 'public'
    LOOP
        -- Extract date from partition name (click_events_YYYY_MM)
        DECLARE
            partition_date DATE;
            date_part TEXT;
        BEGIN
            date_part := substring(partition_record.tablename from 'click_events_(.+)');
            partition_date := to_date(date_part, 'YYYY_MM');
            
            IF partition_date < cutoff_date THEN
                EXECUTE format('DROP TABLE %I.%I', partition_record.schemaname, partition_record.tablename);
                dropped_count := dropped_count + 1;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- Skip invalid partition names
            CONTINUE;
        END;
    END LOOP;
    
    RETURN format('Dropped %s old partitions', dropped_count);
END;
$$ LANGUAGE plpgsql;

-- Create partitions for current year
SELECT create_monthly_click_partition(date_trunc('month', CURRENT_DATE) + (generate_series * INTERVAL '1 month')) 
FROM generate_series(-1, 11) AS generate_series;

-- Schedule automatic partition creation and cleanup
SELECT cron.schedule('create-monthly-click-partition', '0 0 1 * *', 'SELECT create_monthly_click_partition()');
SELECT cron.schedule('cleanup-old-click-partitions', '0 2 1 * *', 'SELECT drop_old_click_partitions()');

-- ===================================
-- Indexes for Performance
-- ===================================

-- These indexes will be automatically inherited by all partitions
CREATE INDEX idx_click_events_user_campaign ON click_events(user_campaign_id, clicked_at DESC);
CREATE INDEX idx_click_events_ip_time ON click_events(ip_address, clicked_at);
CREATE INDEX idx_click_events_valid ON click_events(is_valid) WHERE is_valid = true;
CREATE INDEX idx_click_events_device ON click_events(device_type, clicked_at);
CREATE INDEX idx_click_events_location ON click_events(country_code, city);
CREATE INDEX idx_click_events_commission ON click_events(commission_amount) WHERE commission_amount > 0;
CREATE INDEX idx_click_events_converted ON click_events(converted, conversion_time) WHERE converted = true;
CREATE INDEX idx_click_events_fraud ON click_events(array_length(fraud_flags, 1)) WHERE array_length(fraud_flags, 1) > 0;

-- GIN indexes for JSONB fields
CREATE INDEX idx_click_events_campaign_context ON click_events USING GIN (campaign_context);
CREATE INDEX idx_click_events_attribution ON click_events USING GIN (attribution_data);
CREATE INDEX idx_click_events_metadata ON click_events USING GIN (metadata);

-- Unique constraint to prevent duplicate clicks (same IP, same campaign within 1 minute)
CREATE UNIQUE INDEX idx_click_events_duplicate_prevention ON click_events (
    user_campaign_id, 
    ip_address, 
    date_trunc('minute', clicked_at)
);

-- ===================================
-- Row Level Security (RLS) Policies
-- ===================================

ALTER TABLE click_events ENABLE ROW LEVEL SECURITY;

-- Only system functions can insert click events (security measure)
CREATE POLICY "Only system can insert click events" ON click_events
    FOR INSERT WITH CHECK (false); -- 직접 삽입 금지, 함수를 통해서만 가능

-- Users can view clicks for their campaigns
CREATE POLICY "Users can view own campaign clicks" ON click_events
    FOR SELECT USING (
        user_campaign_id IN (
            SELECT uc.id FROM user_campaigns uc
            JOIN users u ON uc.user_id = u.id
            WHERE u.auth_uid = auth.uid()
        )
    );

-- Businesses can view clicks for their campaigns
CREATE POLICY "Businesses can view own campaign clicks" ON click_events
    FOR SELECT USING (
        user_campaign_id IN (
            SELECT uc.id FROM user_campaigns uc
            JOIN campaigns c ON uc.campaign_id = c.id
            JOIN businesses b ON c.business_id = b.id
            WHERE b.auth_uid = auth.uid()
        )
    );

-- Admins can view all click events
CREATE POLICY "Admins can view all click events" ON click_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            JOIN users u ON au.user_id = u.id
            WHERE u.auth_uid = auth.uid() AND au.is_active = true
        )
    );

-- ===================================
-- Click Processing Functions
-- ===================================

-- Function to record a click event (primary entry point)
CREATE OR REPLACE FUNCTION record_click_event(
    p_user_campaign_id UUID,
    p_ip_address INET,
    p_user_agent TEXT DEFAULT NULL,
    p_referrer_url TEXT DEFAULT NULL,
    p_campaign_context JSONB DEFAULT '{}',
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_click_id UUID;
    v_is_valid BOOLEAN;
    v_validation_score DECIMAL;
    v_fraud_flags TEXT[];
    v_commission DECIMAL;
    v_device_info RECORD;
BEGIN
    -- Generate click ID
    v_click_id := gen_random_uuid();
    
    -- Validate the click
    SELECT is_valid, validation_score, fraud_flags, commission_amount
    INTO v_is_valid, v_validation_score, v_fraud_flags, v_commission
    FROM validate_click_event(p_user_campaign_id, p_ip_address, p_user_agent, p_metadata);
    
    -- Extract device information
    v_device_info := extract_device_info(p_user_agent);
    
    -- Insert click event
    INSERT INTO click_events (
        id,
        user_campaign_id,
        ip_address,
        user_agent,
        referrer_url,
        device_type,
        device_model,
        browser,
        browser_version,
        os,
        os_version,
        campaign_context,
        is_valid,
        validation_score,
        fraud_flags,
        commission_amount,
        metadata,
        clicked_at
    ) VALUES (
        v_click_id,
        p_user_campaign_id,
        p_ip_address,
        p_user_agent,
        p_referrer_url,
        (v_device_info).device_type::device_type,
        (v_device_info).device_model,
        (v_device_info).browser,
        (v_device_info).browser_version,
        (v_device_info).os,
        (v_device_info).os_version,
        p_campaign_context,
        v_is_valid,
        v_validation_score,
        v_fraud_flags,
        v_commission,
        p_metadata,
        NOW()
    );
    
    RETURN v_click_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate click events (fraud detection)
CREATE OR REPLACE FUNCTION validate_click_event(
    p_user_campaign_id UUID,
    p_ip_address INET,
    p_user_agent TEXT,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS TABLE(
    is_valid BOOLEAN,
    validation_score DECIMAL,
    fraud_flags TEXT[],
    commission_amount DECIMAL
) AS $$
DECLARE
    v_is_valid BOOLEAN := true;
    v_validation_score DECIMAL := 1.0;
    v_fraud_flags TEXT[] := '{}';
    v_commission DECIMAL := 0;
    v_recent_clicks INTEGER;
    v_hourly_clicks INTEGER;
    v_cpc_rate DECIMAL;
    v_user_grade user_grade;
BEGIN
    -- Get campaign CPC rate and user grade
    SELECT c.cpc_rate, u.grade
    INTO v_cpc_rate, v_user_grade
    FROM user_campaigns uc
    JOIN campaigns c ON uc.campaign_id = c.id
    JOIN users u ON uc.user_id = u.id
    WHERE uc.id = p_user_campaign_id;
    
    -- Check for rapid successive clicks (within 1 minute)
    SELECT COUNT(*) INTO v_recent_clicks
    FROM click_events
    WHERE user_campaign_id = p_user_campaign_id
      AND ip_address = p_ip_address
      AND clicked_at > NOW() - INTERVAL '1 minute';
    
    IF v_recent_clicks > 0 THEN
        v_is_valid := false;
        v_validation_score := 0;
        v_fraud_flags := array_append(v_fraud_flags, 'duplicate_click');
    END IF;
    
    -- Check for excessive hourly clicks from same IP
    SELECT COUNT(*) INTO v_hourly_clicks
    FROM click_events
    WHERE ip_address = p_ip_address
      AND clicked_at > NOW() - INTERVAL '1 hour';
    
    IF v_hourly_clicks > 10 THEN
        v_is_valid := false;
        v_validation_score := GREATEST(v_validation_score - 0.5, 0);
        v_fraud_flags := array_append(v_fraud_flags, 'excessive_clicks');
    END IF;
    
    -- Bot detection based on user agent
    IF p_user_agent IS NULL OR 
       p_user_agent ILIKE '%bot%' OR 
       p_user_agent ILIKE '%crawler%' OR 
       p_user_agent ILIKE '%spider%' THEN
        v_is_valid := false;
        v_validation_score := 0;
        v_fraud_flags := array_append(v_fraud_flags, 'bot_detected');
    END IF;
    
    -- Suspicious user agent patterns
    IF length(p_user_agent) < 20 OR length(p_user_agent) > 500 THEN
        v_validation_score := GREATEST(v_validation_score - 0.2, 0.1);
        v_fraud_flags := array_append(v_fraud_flags, 'suspicious_user_agent');
    END IF;
    
    -- Calculate commission if click is valid
    IF v_is_valid THEN
        v_commission := calculate_user_campaign_earnings(p_user_campaign_id, 1);
    END IF;
    
    RETURN QUERY SELECT v_is_valid, v_validation_score, v_fraud_flags, v_commission;
END;
$$ LANGUAGE plpgsql;

-- Function to extract device information from user agent
CREATE OR REPLACE FUNCTION extract_device_info(user_agent TEXT)
RETURNS TABLE(
    device_type device_type,
    device_model TEXT,
    browser TEXT,
    browser_version TEXT,
    os TEXT,
    os_version TEXT
) AS $$
DECLARE
    v_device_type device_type := 'desktop';
    v_device_model TEXT;
    v_browser TEXT := 'unknown';
    v_browser_version TEXT;
    v_os TEXT := 'unknown';
    v_os_version TEXT;
BEGIN
    IF user_agent IS NULL THEN
        RETURN QUERY SELECT v_device_type, v_device_model, v_browser, v_browser_version, v_os, v_os_version;
    END IF;
    
    -- Detect mobile devices
    IF user_agent ILIKE '%mobile%' OR user_agent ILIKE '%android%' OR user_agent ILIKE '%iphone%' THEN
        v_device_type := 'mobile';
    ELSIF user_agent ILIKE '%tablet%' OR user_agent ILIKE '%ipad%' THEN
        v_device_type := 'tablet';
    END IF;
    
    -- Extract browser information
    CASE
        WHEN user_agent ILIKE '%chrome%' THEN 
            v_browser := 'Chrome';
            v_browser_version := substring(user_agent from 'Chrome/([0-9.]+)');
        WHEN user_agent ILIKE '%firefox%' THEN 
            v_browser := 'Firefox';
            v_browser_version := substring(user_agent from 'Firefox/([0-9.]+)');
        WHEN user_agent ILIKE '%safari%' AND user_agent NOT ILIKE '%chrome%' THEN 
            v_browser := 'Safari';
            v_browser_version := substring(user_agent from 'Safari/([0-9.]+)');
        WHEN user_agent ILIKE '%edge%' THEN 
            v_browser := 'Edge';
            v_browser_version := substring(user_agent from 'Edge/([0-9.]+)');
    END CASE;
    
    -- Extract OS information
    CASE
        WHEN user_agent ILIKE '%windows nt%' THEN 
            v_os := 'Windows';
            v_os_version := substring(user_agent from 'Windows NT ([0-9.]+)');
        WHEN user_agent ILIKE '%mac os x%' OR user_agent ILIKE '%macos%' THEN 
            v_os := 'macOS';
            v_os_version := substring(user_agent from 'Mac OS X ([0-9_.]+)');
        WHEN user_agent ILIKE '%android%' THEN 
            v_os := 'Android';
            v_os_version := substring(user_agent from 'Android ([0-9.]+)');
        WHEN user_agent ILIKE '%iphone%' OR user_agent ILIKE '%ipad%' THEN 
            v_os := 'iOS';
            v_os_version := substring(user_agent from 'OS ([0-9_]+)');
        WHEN user_agent ILIKE '%linux%' THEN 
            v_os := 'Linux';
    END CASE;
    
    -- Extract device model for mobile devices
    IF v_device_type IN ('mobile', 'tablet') THEN
        IF user_agent ILIKE '%iphone%' THEN
            v_device_model := 'iPhone';
        ELSIF user_agent ILIKE '%ipad%' THEN
            v_device_model := 'iPad';
        ELSIF user_agent ILIKE '%samsung%' THEN
            v_device_model := 'Samsung';
        END IF;
    END IF;
    
    RETURN QUERY SELECT v_device_type, v_device_model, v_browser, v_browser_version, v_os, v_os_version;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ===================================
-- Analytics and Reporting Functions
-- ===================================

-- Function to get click statistics for a campaign
CREATE OR REPLACE FUNCTION get_campaign_click_stats(
    p_campaign_id UUID,
    p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
    p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE(
    total_clicks BIGINT,
    valid_clicks BIGINT,
    unique_users BIGINT,
    total_commission DECIMAL,
    avg_validation_score DECIMAL,
    top_countries TEXT[],
    device_breakdown JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_clicks,
        COUNT(*) FILTER (WHERE ce.is_valid = true) as valid_clicks,
        COUNT(DISTINCT uc.user_id) as unique_users,
        COALESCE(SUM(ce.commission_amount) FILTER (WHERE ce.is_valid = true), 0) as total_commission,
        COALESCE(AVG(ce.validation_score), 0) as avg_validation_score,
        array_agg(DISTINCT ce.country_code) FILTER (WHERE ce.country_code IS NOT NULL) as top_countries,
        jsonb_object_agg(ce.device_type, COUNT(*)) as device_breakdown
    FROM click_events ce
    JOIN user_campaigns uc ON ce.user_campaign_id = uc.id
    WHERE uc.campaign_id = p_campaign_id
      AND ce.clicked_at BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql;

-- Comment: Click Events table with partitioning, fraud detection, and comprehensive analytics