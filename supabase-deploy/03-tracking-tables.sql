-- ============================================
-- 추적 및 수익 관련 테이블
-- ============================================

-- 1. Click Events 테이블 (클릭 추적)
CREATE TABLE IF NOT EXISTS click_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_campaign_id UUID NOT NULL REFERENCES user_campaigns(id),
    campaign_id UUID NOT NULL REFERENCES campaigns(id),
    user_id UUID NOT NULL REFERENCES users(id),
    ip_address INET,
    ip_location JSONB,
    user_agent TEXT,
    device_type device_type,
    device_info JSONB,
    referrer_url TEXT,
    landing_url TEXT,
    session_id VARCHAR(255),
    is_unique BOOLEAN DEFAULT true,
    is_valid BOOLEAN DEFAULT true,
    fraud_score DECIMAL(3, 2),
    fraud_reasons JSONB DEFAULT '[]',
    click_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    dwell_time INTEGER,
    bounce BOOLEAN DEFAULT false,
    conversion BOOLEAN DEFAULT false,
    conversion_value DECIMAL(15, 2),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. User Earnings 테이블 (사용자 수익)
CREATE TABLE IF NOT EXISTS user_earnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id),
    user_campaign_id UUID REFERENCES user_campaigns(id),
    click_event_id UUID REFERENCES click_events(id),
    type transaction_type NOT NULL,
    category transaction_category,
    amount DECIMAL(15, 2) NOT NULL,
    status transaction_status DEFAULT 'COMPLETED',
    description TEXT,
    reference_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Business Billing 테이블 (광고주 결제)
CREATE TABLE IF NOT EXISTS business_billing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id),
    type transaction_type NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    status transaction_status DEFAULT 'PENDING',
    payment_provider payment_provider,
    payment_method JSONB,
    transaction_id VARCHAR(255) UNIQUE,
    invoice_number VARCHAR(50),
    invoice_url TEXT,
    paid_at TIMESTAMP WITH TIME ZONE,
    due_date DATE,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Withdrawal Requests 테이블 (출금 요청)
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    amount DECIMAL(15, 2) NOT NULL,
    fee DECIMAL(15, 2) DEFAULT 0,
    net_amount DECIMAL(15, 2) NOT NULL,
    payout_method payout_method NOT NULL,
    payout_details JSONB NOT NULL,
    status transaction_status DEFAULT 'PENDING',
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES admin_users(id),
    transaction_id VARCHAR(255),
    rejection_reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Fraud Detection 테이블 (사기 감지)
CREATE TABLE IF NOT EXISTS fraud_detection (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    campaign_id UUID REFERENCES campaigns(id),
    click_event_id UUID REFERENCES click_events(id),
    fraud_type fraud_type NOT NULL,
    confidence_score DECIMAL(3, 2) NOT NULL,
    detection_data JSONB NOT NULL,
    action_taken fraud_action,
    reviewed_by UUID REFERENCES admin_users(id),
    review_decision review_decision,
    review_notes TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Analytics Daily 테이블 (일별 분석)
CREATE TABLE IF NOT EXISTS analytics_daily (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    metrics JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, entity_type, entity_id)
);

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '✅ Tracking and earnings tables created successfully!';
END$$;