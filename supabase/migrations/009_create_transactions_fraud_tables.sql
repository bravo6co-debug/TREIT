-- ===================================
-- Treit Database Schema: Transactions & Fraud Detection Tables
-- ===================================
-- 거래 내역 및 어뷰징 감지 테이블
-- DATABASE.md 기반

-- ===================================
-- Transactions Table
-- ===================================

-- Transactions table - 모든 금융 거래 기록
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Transaction Classification
    type transaction_type NOT NULL,
    category transaction_category NOT NULL,
    
    -- Related Parties
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    
    -- Related Objects
    campaign_id UUID REFERENCES campaigns(id),
    user_campaign_id UUID REFERENCES user_campaigns(id),
    click_event_id UUID, -- References click_events(id) but no FK due to partitioning
    payout_request_id UUID REFERENCES payout_requests(id),
    invoice_id UUID REFERENCES invoices(id),
    
    -- Financial Details
    amount DECIMAL(12,2) NOT NULL CHECK (amount != 0),
    currency TEXT NOT NULL DEFAULT 'KRW',
    exchange_rate DECIMAL(10,4) DEFAULT 1.0000,
    
    -- Fees and Taxes
    platform_fee DECIMAL(10,2) DEFAULT 0 CHECK (platform_fee >= 0),
    processing_fee DECIMAL(10,2) DEFAULT 0 CHECK (processing_fee >= 0),
    tax_amount DECIMAL(10,2) DEFAULT 0 CHECK (tax_amount >= 0),
    
    -- Net Amount (after fees)
    net_amount DECIMAL(12,2) GENERATED ALWAYS AS (
        amount - COALESCE(platform_fee, 0) - COALESCE(processing_fee, 0) - COALESCE(tax_amount, 0)
    ) STORED,
    
    -- Transaction Status
    status transaction_status NOT NULL DEFAULT 'PENDING',
    
    -- Payment Provider Information
    payment_method TEXT,
    payment_provider payment_provider,
    provider_transaction_id TEXT, -- External payment system transaction ID
    provider_reference TEXT,
    provider_fee DECIMAL(10,2) DEFAULT 0,
    
    -- Settlement Information
    settlement_date DATE,
    settlement_batch_id TEXT,
    
    -- Descriptions and Notes
    description TEXT NOT NULL,
    internal_notes TEXT, -- Admin only notes
    
    -- Metadata for extensibility
    metadata JSONB DEFAULT '{}',
    /* metadata structure:
    {
        "ip_address": "192.168.1.1",
        "user_agent": "...",
        "device_fingerprint": "...",
        "risk_score": 0.1,
        "campaign_context": {...}
    }
    */
    
    -- Reconciliation
    reconciled BOOLEAN DEFAULT false,
    reconciled_at TIMESTAMPTZ,
    reconciled_by UUID REFERENCES admin_users(id),
    
    -- Dispute Management
    disputed BOOLEAN DEFAULT false,
    dispute_reason TEXT,
    dispute_opened_at TIMESTAMPTZ,
    dispute_resolved_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CHECK (
        (type IN ('earning', 'withdrawal') AND user_id IS NOT NULL) OR
        (type IN ('charge', 'refund') AND business_id IS NOT NULL)
    ),
    CHECK (
        (category = 'click' AND click_event_id IS NOT NULL) OR
        (category != 'click')
    )
);

-- ===================================
-- Fraud Detection Logs Table
-- ===================================

-- Fraud Detection Logs table - 어뷰징 감지 및 관리
CREATE TABLE fraud_detection_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Target Entities
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    user_campaign_id UUID REFERENCES user_campaigns(id) ON DELETE CASCADE,
    click_event_id UUID, -- References click_events but no FK due to partitioning
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    
    -- Fraud Classification
    fraud_type fraud_type NOT NULL,
    severity_level INTEGER NOT NULL CHECK (severity_level >= 1 AND severity_level <= 10),
    confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    
    -- Detection Information
    detection_method TEXT NOT NULL,
    detection_algorithm TEXT,
    model_version TEXT,
    
    -- Evidence and Analysis
    evidence JSONB NOT NULL,
    /* evidence structure examples:
    {
        "click_spam": {
            "clicks_per_minute": 15,
            "duplicate_ips": ["192.168.1.1", "192.168.1.2"],
            "pattern_score": 0.95
        },
        "bot_activity": {
            "user_agent_suspicious": true,
            "automation_score": 0.89,
            "captcha_failures": 5
        },
        "ip_farming": {
            "ip_count": 50,
            "geolocation_inconsistency": true,
            "proxy_detected": true
        }
    }
    */
    
    -- Risk Assessment
    risk_indicators TEXT[],
    risk_score DECIMAL(5,2) NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
    
    -- Behavioral Analysis
    behavioral_patterns JSONB DEFAULT '{}',
    /* behavioral_patterns structure:
    {
        "click_frequency": {"avg": 2.5, "max": 15, "pattern": "burst"},
        "time_patterns": ["night_activity", "weekend_only"],
        "device_patterns": ["single_device", "multiple_browsers"],
        "engagement_patterns": ["no_scroll", "immediate_bounce"]
    }
    */
    
    -- Actions Taken
    action_taken fraud_action,
    action_reason TEXT,
    action_severity INTEGER CHECK (action_severity >= 1 AND action_severity <= 5),
    
    -- Automated Response
    auto_action_taken BOOLEAN DEFAULT false,
    auto_action_details JSONB DEFAULT '{}',
    
    -- Review Process
    reviewed BOOLEAN DEFAULT false,
    reviewed_by UUID REFERENCES admin_users(id),
    reviewed_at TIMESTAMPTZ,
    review_decision review_decision,
    review_notes TEXT,
    
    -- Appeal Process
    appealed BOOLEAN DEFAULT false,
    appeal_submitted_at TIMESTAMPTZ,
    appeal_reason TEXT,
    appeal_resolved_at TIMESTAMPTZ,
    appeal_outcome TEXT,
    
    -- Machine Learning Feedback
    ml_feedback JSONB DEFAULT '{}',
    human_verified BOOLEAN,
    training_data_eligible BOOLEAN DEFAULT true,
    
    -- Timestamps
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================
-- IP Blocklist Table
-- ===================================

-- IP Blocklist - 차단된 IP 주소 관리
CREATE TABLE ip_blocklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- IP Information
    ip_address INET NOT NULL,
    ip_range CIDR, -- For blocking IP ranges
    
    -- Block Details
    reason TEXT NOT NULL,
    blocked_by UUID REFERENCES admin_users(id),
    block_type TEXT NOT NULL CHECK (block_type IN ('temporary', 'permanent', 'auto')),
    
    -- Severity and Context
    severity_level INTEGER NOT NULL CHECK (severity_level >= 1 AND severity_level <= 10),
    associated_fraud_types TEXT[],
    
    -- Geographic Information
    country_code TEXT,
    region TEXT,
    isp TEXT,
    
    -- Statistics
    violation_count INTEGER DEFAULT 1,
    last_violation_at TIMESTAMPTZ,
    
    -- Expiration (for temporary blocks)
    expires_at TIMESTAMPTZ,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Notes
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure either single IP or IP range is specified
    CHECK ((ip_address IS NOT NULL) OR (ip_range IS NOT NULL))
);

-- ===================================
-- User Risk Profiles Table
-- ===================================

-- User Risk Profiles - 사용자별 리스크 프로필
CREATE TABLE user_risk_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    
    -- Overall Risk Assessment
    overall_risk_score DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (overall_risk_score >= 0 AND overall_risk_score <= 100),
    risk_category TEXT NOT NULL DEFAULT 'low' CHECK (risk_category IN ('low', 'medium', 'high', 'critical')),
    
    -- Fraud History
    total_violations INTEGER DEFAULT 0,
    severe_violations INTEGER DEFAULT 0,
    last_violation_at TIMESTAMPTZ,
    
    -- Behavioral Metrics
    click_velocity_score DECIMAL(3,2) DEFAULT 0, -- Average clicks per minute
    device_consistency_score DECIMAL(3,2) DEFAULT 1, -- How consistent device usage is
    time_pattern_score DECIMAL(3,2) DEFAULT 1, -- How normal time patterns are
    engagement_quality_score DECIMAL(3,2) DEFAULT 1, -- Quality of engagement
    
    -- Network Analysis
    ip_diversity_score DECIMAL(3,2) DEFAULT 1, -- How many different IPs used
    proxy_usage_frequency DECIMAL(3,2) DEFAULT 0, -- How often proxy/VPN detected
    geo_consistency_score DECIMAL(3,2) DEFAULT 1, -- Geographic consistency
    
    -- Social Verification
    social_verification_score DECIMAL(3,2) DEFAULT 0, -- Social account verification level
    follower_authenticity_score DECIMAL(3,2) DEFAULT 0, -- Authenticity of followers
    content_quality_score DECIMAL(3,2) DEFAULT 5, -- Quality of posted content
    
    -- Machine Learning Scores
    ml_fraud_probability DECIMAL(5,4) DEFAULT 0, -- ML model fraud probability
    ml_model_version TEXT,
    ml_last_updated TIMESTAMPTZ,
    
    -- Whitelist/Blacklist Status
    whitelist_status BOOLEAN DEFAULT false,
    blacklist_status BOOLEAN DEFAULT false,
    status_reason TEXT,
    status_updated_by UUID REFERENCES admin_users(id),
    status_updated_at TIMESTAMPTZ,
    
    -- Trust Building
    trust_score DECIMAL(3,2) DEFAULT 5 CHECK (trust_score >= 0 AND trust_score <= 10),
    verification_level INTEGER DEFAULT 0 CHECK (verification_level >= 0 AND verification_level <= 5),
    
    -- Activity Monitoring
    monitoring_level TEXT DEFAULT 'standard' CHECK (monitoring_level IN ('minimal', 'standard', 'enhanced', 'maximum')),
    monitoring_reason TEXT,
    monitoring_expires_at TIMESTAMPTZ,
    
    -- Profile Metadata
    profile_data JSONB DEFAULT '{}',
    /* profile_data structure:
    {
        "device_fingerprints": [...],
        "common_patterns": {...},
        "risk_factors": [...],
        "protective_factors": [...]
    }
    */
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_assessment_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================
-- Indexes for Performance
-- ===================================

-- Transactions Indexes
CREATE INDEX idx_transactions_user_id ON transactions(user_id, created_at DESC);
CREATE INDEX idx_transactions_business_id ON transactions(business_id, created_at DESC);
CREATE INDEX idx_transactions_status ON transactions(status, created_at DESC);
CREATE INDEX idx_transactions_type_category ON transactions(type, category, created_at DESC);
CREATE INDEX idx_transactions_provider ON transactions(provider_transaction_id) WHERE provider_transaction_id IS NOT NULL;
CREATE INDEX idx_transactions_settlement ON transactions(settlement_date, settlement_batch_id);
CREATE INDEX idx_transactions_reconciled ON transactions(reconciled, created_at DESC) WHERE reconciled = false;
CREATE INDEX idx_transactions_disputed ON transactions(disputed, created_at DESC) WHERE disputed = true;

-- GIN index for metadata search
CREATE INDEX idx_transactions_metadata ON transactions USING GIN (metadata);

-- Fraud Detection Logs Indexes
CREATE INDEX idx_fraud_logs_user_id ON fraud_detection_logs(user_id, detected_at DESC);
CREATE INDEX idx_fraud_logs_business_id ON fraud_detection_logs(business_id, detected_at DESC);
CREATE INDEX idx_fraud_logs_campaign_id ON fraud_detection_logs(campaign_id, detected_at DESC);
CREATE INDEX idx_fraud_logs_fraud_type ON fraud_detection_logs(fraud_type, detected_at DESC);
CREATE INDEX idx_fraud_logs_severity ON fraud_detection_logs(severity_level DESC, detected_at DESC);
CREATE INDEX idx_fraud_logs_confidence ON fraud_detection_logs(confidence_score DESC, detected_at DESC);
CREATE INDEX idx_fraud_logs_reviewed ON fraud_detection_logs(reviewed, detected_at DESC) WHERE reviewed = false;
CREATE INDEX idx_fraud_logs_appealed ON fraud_detection_logs(appealed, appeal_submitted_at DESC) WHERE appealed = true;
CREATE INDEX idx_fraud_logs_risk_score ON fraud_detection_logs(risk_score DESC);

-- GIN indexes for JSONB fields
CREATE INDEX idx_fraud_logs_evidence ON fraud_detection_logs USING GIN (evidence);
CREATE INDEX idx_fraud_logs_behavioral_patterns ON fraud_detection_logs USING GIN (behavioral_patterns);

-- IP Blocklist Indexes
CREATE INDEX idx_ip_blocklist_ip_address ON ip_blocklist(ip_address);
CREATE INDEX idx_ip_blocklist_ip_range ON ip_blocklist USING GIST (ip_range);
CREATE INDEX idx_ip_blocklist_active ON ip_blocklist(is_active, created_at DESC) WHERE is_active = true;
CREATE INDEX idx_ip_blocklist_expires ON ip_blocklist(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_ip_blocklist_country ON ip_blocklist(country_code);

-- User Risk Profiles Indexes
CREATE INDEX idx_user_risk_profiles_risk_score ON user_risk_profiles(overall_risk_score DESC);
CREATE INDEX idx_user_risk_profiles_risk_category ON user_risk_profiles(risk_category);
CREATE INDEX idx_user_risk_profiles_violations ON user_risk_profiles(total_violations DESC);
CREATE INDEX idx_user_risk_profiles_trust_score ON user_risk_profiles(trust_score DESC);
CREATE INDEX idx_user_risk_profiles_whitelist ON user_risk_profiles(whitelist_status) WHERE whitelist_status = true;
CREATE INDEX idx_user_risk_profiles_blacklist ON user_risk_profiles(blacklist_status) WHERE blacklist_status = true;
CREATE INDEX idx_user_risk_profiles_monitoring ON user_risk_profiles(monitoring_level, monitoring_expires_at);

-- ===================================
-- Row Level Security (RLS) Policies
-- ===================================

-- Transactions RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT USING (
        user_id IN (SELECT id FROM users WHERE auth_uid = auth.uid()) OR
        business_id IN (SELECT id FROM businesses WHERE auth_uid = auth.uid())
    );

-- Fraud Detection Logs RLS (Admin only for most operations)
ALTER TABLE fraud_detection_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view fraud logs about themselves" ON fraud_detection_logs
    FOR SELECT USING (
        user_id IN (SELECT id FROM users WHERE auth_uid = auth.uid())
    );

-- IP Blocklist RLS (Admin only)
ALTER TABLE ip_blocklist ENABLE ROW LEVEL SECURITY;

-- User Risk Profiles RLS (Limited user access)
ALTER TABLE user_risk_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own risk profile (limited)" ON user_risk_profiles
    FOR SELECT USING (
        user_id IN (SELECT id FROM users WHERE auth_uid = auth.uid())
    );

-- Admin policies for all fraud tables
CREATE POLICY "Admins can manage all transactions" ON transactions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            JOIN users u ON au.user_id = u.id
            WHERE u.auth_uid = auth.uid() AND au.is_active = true
        )
    );

CREATE POLICY "Admins can manage fraud logs" ON fraud_detection_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            JOIN users u ON au.user_id = u.id
            WHERE u.auth_uid = auth.uid() AND au.is_active = true
        )
    );

CREATE POLICY "Admins can manage ip blocklist" ON ip_blocklist
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            JOIN users u ON au.user_id = u.id
            WHERE u.auth_uid = auth.uid() AND au.is_active = true
        )
    );

CREATE POLICY "Admins can manage risk profiles" ON user_risk_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            JOIN users u ON au.user_id = u.id
            WHERE u.auth_uid = auth.uid() AND au.is_active = true
        )
    );

-- ===================================
-- Fraud Detection Functions
-- ===================================

-- Function to check if IP is blocked
CREATE OR REPLACE FUNCTION is_ip_blocked(check_ip INET)
RETURNS BOOLEAN AS $$
DECLARE
    blocked_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO blocked_count
    FROM ip_blocklist
    WHERE is_active = true
      AND (expires_at IS NULL OR expires_at > NOW())
      AND (
          ip_address = check_ip OR
          (ip_range IS NOT NULL AND check_ip << ip_range)
      );
    
    RETURN blocked_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to add IP to blocklist
CREATE OR REPLACE FUNCTION add_ip_to_blocklist(
    p_ip_address INET,
    p_reason TEXT,
    p_blocked_by UUID,
    p_block_type TEXT DEFAULT 'auto',
    p_severity INTEGER DEFAULT 5,
    p_duration_hours INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- Calculate expiration for temporary blocks
    IF p_block_type = 'temporary' AND p_duration_hours IS NOT NULL THEN
        v_expires_at := NOW() + (p_duration_hours || ' hours')::INTERVAL;
    END IF;
    
    INSERT INTO ip_blocklist (
        ip_address,
        reason,
        blocked_by,
        block_type,
        severity_level,
        expires_at
    ) VALUES (
        p_ip_address,
        p_reason,
        p_blocked_by,
        p_block_type,
        p_severity,
        v_expires_at
    ) RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user risk score
CREATE OR REPLACE FUNCTION update_user_risk_score(p_user_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    v_risk_score DECIMAL := 0;
    v_risk_category TEXT := 'low';
    v_violation_weight DECIMAL;
    v_behavioral_weight DECIMAL;
    v_network_weight DECIMAL;
    v_social_weight DECIMAL;
BEGIN
    -- Get current risk profile or create one
    INSERT INTO user_risk_profiles (user_id) 
    VALUES (p_user_id) 
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Calculate violation-based score (0-30 points)
    SELECT 
        LEAST(total_violations * 3 + severe_violations * 5, 30)
    INTO v_violation_weight
    FROM user_risk_profiles
    WHERE user_id = p_user_id;
    
    -- Calculate behavioral score (0-25 points)  
    SELECT
        LEAST(
            (10 - click_velocity_score * 10) +
            (10 - device_consistency_score * 10) +
            (10 - time_pattern_score * 10) +
            (10 - engagement_quality_score * 10) +
            5, 25
        )
    INTO v_behavioral_weight
    FROM user_risk_profiles
    WHERE user_id = p_user_id;
    
    -- Calculate network-based score (0-25 points)
    SELECT
        LEAST(
            (10 - ip_diversity_score * 10) +
            (proxy_usage_frequency * 10) +
            (10 - geo_consistency_score * 10) +
            5, 25
        )
    INTO v_network_weight
    FROM user_risk_profiles
    WHERE user_id = p_user_id;
    
    -- Calculate social verification score (negative points, max -20)
    SELECT
        GREATEST(
            (social_verification_score - 5) * 2 +
            (follower_authenticity_score - 5) * 2 +
            (content_quality_score - 5) * 2,
            -20
        )
    INTO v_social_weight
    FROM user_risk_profiles
    WHERE user_id = p_user_id;
    
    -- Calculate final risk score
    v_risk_score := GREATEST(
        LEAST(
            COALESCE(v_violation_weight, 0) +
            COALESCE(v_behavioral_weight, 0) +
            COALESCE(v_network_weight, 0) +
            COALESCE(v_social_weight, 0),
            100
        ),
        0
    );
    
    -- Determine risk category
    v_risk_category := CASE
        WHEN v_risk_score >= 75 THEN 'critical'
        WHEN v_risk_score >= 50 THEN 'high'
        WHEN v_risk_score >= 25 THEN 'medium'
        ELSE 'low'
    END;
    
    -- Update risk profile
    UPDATE user_risk_profiles
    SET 
        overall_risk_score = v_risk_score,
        risk_category = v_risk_category,
        last_assessment_at = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    RETURN v_risk_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log fraud detection
CREATE OR REPLACE FUNCTION log_fraud_detection(
    p_user_id UUID DEFAULT NULL,
    p_business_id UUID DEFAULT NULL,
    p_campaign_id UUID DEFAULT NULL,
    p_user_campaign_id UUID DEFAULT NULL,
    p_click_event_id UUID DEFAULT NULL,
    p_transaction_id UUID DEFAULT NULL,
    p_fraud_type fraud_type,
    p_severity INTEGER,
    p_confidence DECIMAL,
    p_detection_method TEXT,
    p_evidence JSONB,
    p_auto_action fraud_action DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
    v_risk_score DECIMAL;
BEGIN
    -- Calculate risk score based on severity and confidence
    v_risk_score := (p_severity * 10) * p_confidence;
    
    INSERT INTO fraud_detection_logs (
        user_id,
        business_id,
        campaign_id,
        user_campaign_id,
        click_event_id,
        transaction_id,
        fraud_type,
        severity_level,
        confidence_score,
        detection_method,
        evidence,
        risk_score,
        action_taken,
        auto_action_taken
    ) VALUES (
        p_user_id,
        p_business_id,
        p_campaign_id,
        p_user_campaign_id,
        p_click_event_id,
        p_transaction_id,
        p_fraud_type,
        p_severity,
        p_confidence,
        p_detection_method,
        p_evidence,
        v_risk_score,
        p_auto_action,
        (p_auto_action IS NOT NULL)
    ) RETURNING id INTO v_log_id;
    
    -- Update user risk score if user is involved
    IF p_user_id IS NOT NULL THEN
        PERFORM update_user_risk_score(p_user_id);
    END IF;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_fraud_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for timestamp updates
CREATE TRIGGER trigger_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_fraud_timestamps();

CREATE TRIGGER trigger_fraud_logs_updated_at
    BEFORE UPDATE ON fraud_detection_logs
    FOR EACH ROW EXECUTE FUNCTION update_fraud_timestamps();

CREATE TRIGGER trigger_ip_blocklist_updated_at
    BEFORE UPDATE ON ip_blocklist
    FOR EACH ROW EXECUTE FUNCTION update_fraud_timestamps();

CREATE TRIGGER trigger_risk_profiles_updated_at
    BEFORE UPDATE ON user_risk_profiles
    FOR EACH ROW EXECUTE FUNCTION update_fraud_timestamps();

-- Comment: Comprehensive transaction and fraud detection system with ML-ready analytics and automated responses