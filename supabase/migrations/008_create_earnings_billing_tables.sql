-- ===================================
-- Treit Database Schema: Earnings & Billing Tables
-- ===================================
-- 사용자 수익 및 광고주 결제 관리 테이블
-- DATABASE.md 기반

-- ===================================
-- User Earnings Table
-- ===================================

-- User Earnings table - 사용자 수익 관리
CREATE TABLE user_earnings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    
    -- Current Balance & Earnings
    total_earned DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (total_earned >= 0),
    pending_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (pending_amount >= 0),
    available_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (available_amount >= 0),
    withdrawn_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (withdrawn_amount >= 0),
    
    -- Calculated total balance
    current_balance DECIMAL(12,2) GENERATED ALWAYS AS (
        available_amount - withdrawn_amount
    ) STORED,
    
    -- Monthly Statistics (resets every month)
    monthly_earned DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (monthly_earned >= 0),
    monthly_clicks INTEGER NOT NULL DEFAULT 0 CHECK (monthly_clicks >= 0),
    monthly_campaigns INTEGER NOT NULL DEFAULT 0 CHECK (monthly_campaigns >= 0),
    
    -- Weekly Statistics
    weekly_earned DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (weekly_earned >= 0),
    weekly_clicks INTEGER NOT NULL DEFAULT 0 CHECK (weekly_clicks >= 0),
    
    -- Daily Statistics  
    daily_earned DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (daily_earned >= 0),
    daily_clicks INTEGER NOT NULL DEFAULT 0 CHECK (daily_clicks >= 0),
    
    -- Payout Information
    payout_method payout_method,
    payout_account JSONB,
    /* payout_account 구조:
    {
        "bank": {
            "bank_name": "신한은행",
            "account_number": "110-123-456789", 
            "account_holder": "홍길동",
            "bank_code": "088"
        },
        "card": {
            "card_number": "****-****-****-1234",
            "card_holder": "홍길동",
            "card_type": "debit"
        },
        "paypal": {
            "email": "user@example.com",
            "paypal_id": "user123"
        }
    }
    */
    
    -- Withdrawal Settings
    auto_withdrawal BOOLEAN DEFAULT false,
    min_withdrawal_amount DECIMAL(10,2) DEFAULT 10000,
    max_daily_withdrawal DECIMAL(10,2) DEFAULT 500000,
    
    -- Tax Information
    tax_id TEXT, -- 주민등록번호 또는 사업자등록번호 (암호화)
    tax_withholding_rate DECIMAL(5,2) DEFAULT 3.30, -- 세금 원천징수율
    tax_exemption BOOLEAN DEFAULT false,
    
    -- Performance Metrics
    conversion_rate DECIMAL(5,2) DEFAULT 0, -- 전체 전환율
    avg_click_value DECIMAL(10,2) DEFAULT 0, -- 평균 클릭 가치
    
    -- Quality Metrics
    quality_score DECIMAL(3,2) DEFAULT 5.00 CHECK (quality_score >= 0 AND quality_score <= 10),
    compliance_rating DECIMAL(3,2) DEFAULT 10.00 CHECK (compliance_rating >= 0 AND compliance_rating <= 10),
    
    -- Activity Tracking
    last_earned_at TIMESTAMPTZ,
    last_withdrawal_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ,
    
    -- Monthly Reset Tracking
    monthly_reset_at TIMESTAMPTZ DEFAULT date_trunc('month', NOW()),
    weekly_reset_at TIMESTAMPTZ DEFAULT date_trunc('week', NOW()),
    daily_reset_at TIMESTAMPTZ DEFAULT date_trunc('day', NOW()),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================
-- Business Billing Table
-- ===================================

-- Business Billing table - 광고주 결제 관리
CREATE TABLE business_billing (
    business_id UUID PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
    
    -- Credit System
    total_credits DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (total_credits >= 0),
    used_credits DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (used_credits >= 0),
    reserved_credits DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (reserved_credits >= 0), -- 예약된 크레딧 (진행중인 캠페인)
    
    -- Available credits calculation
    available_credits DECIMAL(12,2) GENERATED ALWAYS AS (
        total_credits - used_credits - reserved_credits
    ) STORED,
    
    -- Spending Tracking
    total_spent DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (total_spent >= 0),
    monthly_spent DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (monthly_spent >= 0),
    weekly_spent DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (weekly_spent >= 0),
    daily_spent DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (daily_spent >= 0),
    
    -- Budget Controls
    monthly_budget_limit DECIMAL(12,2),
    daily_budget_limit DECIMAL(12,2),
    spend_rate_limit DECIMAL(8,2), -- 시간당 최대 지출 (per hour)
    
    -- Auto Recharge System
    auto_recharge BOOLEAN DEFAULT false,
    auto_recharge_amount DECIMAL(10,2) DEFAULT 100000,
    auto_recharge_threshold DECIMAL(10,2) DEFAULT 50000,
    auto_recharge_enabled BOOLEAN DEFAULT true,
    
    -- Payment Methods
    default_payment_method JSONB,
    /* default_payment_method 구조:
    {
        "type": "card",
        "card": {
            "last4": "1234",
            "brand": "visa",
            "exp_month": 12,
            "exp_year": 2025
        },
        "stripe_payment_method_id": "pm_xxxxxxxxxxxxx",
        "is_default": true
    }
    */
    
    payment_methods JSONB DEFAULT '[]', -- Array of payment methods
    
    -- Billing Information
    billing_email TEXT,
    billing_address JSONB,
    /* billing_address 구조:
    {
        "street": "테헤란로 123",
        "city": "서울",
        "state": "서울특별시",
        "postal_code": "06158",
        "country": "KR"
    }
    */
    
    -- Billing Cycle
    billing_cycle billing_cycle DEFAULT 'monthly',
    next_billing_date DATE,
    last_billing_date DATE,
    
    -- Invoice Settings
    invoice_email TEXT,
    auto_invoice BOOLEAN DEFAULT true,
    invoice_language TEXT DEFAULT 'ko',
    
    -- Credit History
    credit_limit DECIMAL(12,2) DEFAULT 1000000, -- 최대 크레딧 한도
    credit_utilization DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN credit_limit > 0 
            THEN ((used_credits + reserved_credits) / credit_limit * 100)
            ELSE 0 
        END
    ) STORED,
    
    -- Performance & Analytics
    avg_cpc DECIMAL(10,2) DEFAULT 0, -- 평균 CPC
    avg_monthly_spend DECIMAL(12,2) DEFAULT 0,
    customer_lifetime_value DECIMAL(12,2) DEFAULT 0,
    
    -- Account Status
    payment_status TEXT DEFAULT 'current' CHECK (payment_status IN ('current', 'overdue', 'suspended')),
    credit_rating INTEGER DEFAULT 5 CHECK (credit_rating >= 1 AND credit_rating <= 10),
    
    -- Activity Tracking
    last_charged_at TIMESTAMPTZ,
    last_payment_at TIMESTAMPTZ,
    last_invoice_at TIMESTAMPTZ,
    
    -- Reset Tracking
    monthly_reset_at TIMESTAMPTZ DEFAULT date_trunc('month', NOW()),
    weekly_reset_at TIMESTAMPTZ DEFAULT date_trunc('week', NOW()), 
    daily_reset_at TIMESTAMPTZ DEFAULT date_trunc('day', NOW()),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================
-- Payout Requests Table
-- ===================================

-- Payout Requests table - 출금 요청 관리
CREATE TABLE payout_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Payout Details
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'KRW',
    
    -- Payment Information
    payout_method payout_method NOT NULL,
    payout_account JSONB NOT NULL, -- 출금 계좌 정보
    
    -- Status Tracking
    status transaction_status NOT NULL DEFAULT 'PENDING',
    processing_started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    
    -- External Provider Information
    provider payment_provider,
    provider_transaction_id TEXT, -- 외부 결제 서비스 거래 ID
    provider_reference TEXT,
    provider_fees DECIMAL(10,2) DEFAULT 0,
    
    -- Tax & Fees
    tax_amount DECIMAL(10,2) DEFAULT 0, -- 원천징수 세금
    processing_fee DECIMAL(10,2) DEFAULT 0,
    net_amount DECIMAL(10,2) GENERATED ALWAYS AS (
        amount - COALESCE(tax_amount, 0) - COALESCE(processing_fee, 0)
    ) STORED,
    
    -- Review & Approval
    requires_manual_review BOOLEAN DEFAULT false,
    reviewed_by UUID REFERENCES admin_users(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    
    -- Failure Information
    failure_reason TEXT,
    failure_code TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Metadata
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================
-- Invoice Table
-- ===================================

-- Invoices table - 광고주 청구서 관리
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    
    -- Invoice Details
    invoice_number TEXT UNIQUE NOT NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    
    -- Amounts
    subtotal DECIMAL(12,2) NOT NULL CHECK (subtotal >= 0),
    tax_amount DECIMAL(12,2) DEFAULT 0 CHECK (tax_amount >= 0),
    total_amount DECIMAL(12,2) NOT NULL CHECK (total_amount >= 0),
    
    -- Payment Tracking
    paid_amount DECIMAL(12,2) DEFAULT 0 CHECK (paid_amount >= 0),
    outstanding_amount DECIMAL(12,2) GENERATED ALWAYS AS (
        total_amount - paid_amount
    ) STORED,
    
    -- Status
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
    
    -- Invoice Items
    line_items JSONB NOT NULL DEFAULT '[]',
    /* line_items 구조:
    [
        {
            "description": "Campaign: Summer Sale 2024",
            "campaign_id": "uuid",
            "quantity": 1000,
            "unit_price": 0.15,
            "total": 150.00,
            "period_start": "2024-01-01",
            "period_end": "2024-01-31"
        }
    ]
    */
    
    -- Billing Information
    billing_address JSONB,
    billing_contact JSONB,
    
    -- Payment Information
    payment_method TEXT,
    payment_reference TEXT,
    payment_date DATE,
    
    -- Document URLs
    pdf_url TEXT,
    receipt_url TEXT,
    
    -- Timestamps
    sent_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================
-- Indexes for Performance
-- ===================================

-- User Earnings Indexes
CREATE INDEX idx_user_earnings_total_earned ON user_earnings(total_earned DESC);
CREATE INDEX idx_user_earnings_available ON user_earnings(available_amount DESC) WHERE available_amount > 0;
CREATE INDEX idx_user_earnings_pending ON user_earnings(pending_amount DESC) WHERE pending_amount > 0;
CREATE INDEX idx_user_earnings_monthly ON user_earnings(monthly_earned DESC);
CREATE INDEX idx_user_earnings_quality ON user_earnings(quality_score DESC);
CREATE INDEX idx_user_earnings_last_activity ON user_earnings(last_activity_at DESC);

-- Business Billing Indexes  
CREATE INDEX idx_business_billing_available_credits ON business_billing(available_credits DESC);
CREATE INDEX idx_business_billing_monthly_spent ON business_billing(monthly_spent DESC);
CREATE INDEX idx_business_billing_credit_utilization ON business_billing(credit_utilization DESC);
CREATE INDEX idx_business_billing_payment_status ON business_billing(payment_status);
CREATE INDEX idx_business_billing_auto_recharge ON business_billing(auto_recharge, available_credits) 
    WHERE auto_recharge = true;

-- Payout Requests Indexes
CREATE INDEX idx_payout_requests_user ON payout_requests(user_id, requested_at DESC);
CREATE INDEX idx_payout_requests_status ON payout_requests(status, requested_at DESC);
CREATE INDEX idx_payout_requests_pending ON payout_requests(status, amount DESC) WHERE status = 'PENDING';
CREATE INDEX idx_payout_requests_provider ON payout_requests(provider, provider_transaction_id);
CREATE INDEX idx_payout_requests_review ON payout_requests(requires_manual_review, requested_at DESC) 
    WHERE requires_manual_review = true;

-- Invoice Indexes
CREATE INDEX idx_invoices_business ON invoices(business_id, invoice_date DESC);
CREATE INDEX idx_invoices_status ON invoices(status, due_date);
CREATE INDEX idx_invoices_payment_status ON invoices(payment_status, due_date);
CREATE INDEX idx_invoices_overdue ON invoices(due_date) WHERE status = 'overdue';
CREATE INDEX idx_invoices_number ON invoices(invoice_number);

-- ===================================
-- Row Level Security (RLS) Policies
-- ===================================

-- User Earnings RLS
ALTER TABLE user_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own earnings" ON user_earnings
    FOR SELECT USING (
        user_id IN (SELECT id FROM users WHERE auth_uid = auth.uid())
    );

CREATE POLICY "System can manage user earnings" ON user_earnings
    FOR ALL USING (true); -- 시스템 함수를 통한 관리

-- Business Billing RLS
ALTER TABLE business_billing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Businesses can view own billing" ON business_billing
    FOR SELECT USING (
        business_id IN (SELECT id FROM businesses WHERE auth_uid = auth.uid())
    );

CREATE POLICY "Businesses can update own billing settings" ON business_billing
    FOR UPDATE USING (
        business_id IN (SELECT id FROM businesses WHERE auth_uid = auth.uid())
    )
    WITH CHECK (
        business_id IN (SELECT id FROM businesses WHERE auth_uid = auth.uid()) AND
        -- 사업자는 크레딧 잔액 직접 수정 불가
        OLD.total_credits = NEW.total_credits AND
        OLD.used_credits = NEW.used_credits
    );

-- Payout Requests RLS
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payout requests" ON payout_requests
    FOR SELECT USING (
        user_id IN (SELECT id FROM users WHERE auth_uid = auth.uid())
    );

CREATE POLICY "Users can create own payout requests" ON payout_requests
    FOR INSERT WITH CHECK (
        user_id IN (SELECT id FROM users WHERE auth_uid = auth.uid())
    );

-- Invoices RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Businesses can view own invoices" ON invoices
    FOR SELECT USING (
        business_id IN (SELECT id FROM businesses WHERE auth_uid = auth.uid())
    );

-- Admin policies for all tables
CREATE POLICY "Admins can manage all earnings" ON user_earnings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            JOIN users u ON au.user_id = u.id
            WHERE u.auth_uid = auth.uid() AND au.is_active = true
        )
    );

CREATE POLICY "Admins can manage all billing" ON business_billing
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            JOIN users u ON au.user_id = u.id
            WHERE u.auth_uid = auth.uid() AND au.is_active = true
        )
    );

CREATE POLICY "Admins can manage all payouts" ON payout_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            JOIN users u ON au.user_id = u.id
            WHERE u.auth_uid = auth.uid() AND au.is_active = true
        )
    );

CREATE POLICY "Admins can manage all invoices" ON invoices
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            JOIN users u ON au.user_id = u.id
            WHERE u.auth_uid = auth.uid() AND au.is_active = true
        )
    );

-- ===================================
-- Functions for Business Logic
-- ===================================

-- Function to initialize user earnings
CREATE OR REPLACE FUNCTION initialize_user_earnings(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO user_earnings (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to initialize business billing
CREATE OR REPLACE FUNCTION initialize_business_billing(p_business_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO business_billing (business_id)
    VALUES (p_business_id)
    ON CONFLICT (business_id) DO NOTHING;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
    year_month TEXT;
    sequence_num INTEGER;
BEGIN
    year_month := to_char(CURRENT_DATE, 'YYYYMM');
    
    -- Get next sequence number for this month
    SELECT COALESCE(MAX(
        CAST(substring(invoice_number FROM '[0-9]+$') AS INTEGER)
    ), 0) + 1
    INTO sequence_num
    FROM invoices
    WHERE invoice_number LIKE 'INV-' || year_month || '-%';
    
    RETURN 'INV-' || year_month || '-' || lpad(sequence_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Trigger functions for automatic resets
CREATE OR REPLACE FUNCTION reset_periodic_stats()
RETURNS void AS $$
BEGIN
    -- Reset daily stats
    UPDATE user_earnings 
    SET daily_earned = 0, 
        daily_clicks = 0,
        daily_reset_at = date_trunc('day', NOW())
    WHERE daily_reset_at < date_trunc('day', NOW());
    
    UPDATE business_billing
    SET daily_spent = 0,
        daily_reset_at = date_trunc('day', NOW())
    WHERE daily_reset_at < date_trunc('day', NOW());
    
    -- Reset weekly stats (on Monday)
    IF EXTRACT(DOW FROM NOW()) = 1 THEN -- Monday
        UPDATE user_earnings 
        SET weekly_earned = 0,
            weekly_clicks = 0,
            weekly_reset_at = date_trunc('week', NOW())
        WHERE weekly_reset_at < date_trunc('week', NOW());
        
        UPDATE business_billing
        SET weekly_spent = 0,
            weekly_reset_at = date_trunc('week', NOW())
        WHERE weekly_reset_at < date_trunc('week', NOW());
    END IF;
    
    -- Reset monthly stats (on 1st of month)
    IF EXTRACT(DAY FROM NOW()) = 1 THEN
        UPDATE user_earnings 
        SET monthly_earned = 0,
            monthly_clicks = 0,
            monthly_campaigns = 0,
            monthly_reset_at = date_trunc('month', NOW())
        WHERE monthly_reset_at < date_trunc('month', NOW());
        
        UPDATE business_billing
        SET monthly_spent = 0,
            monthly_reset_at = date_trunc('month', NOW())
        WHERE monthly_reset_at < date_trunc('month', NOW());
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Schedule periodic stats reset
SELECT cron.schedule('reset-periodic-stats', '0 0 * * *', 'SELECT reset_periodic_stats()');

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_earnings_billing_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for timestamp updates
CREATE TRIGGER trigger_user_earnings_updated_at
    BEFORE UPDATE ON user_earnings
    FOR EACH ROW EXECUTE FUNCTION update_earnings_billing_timestamps();

CREATE TRIGGER trigger_business_billing_updated_at
    BEFORE UPDATE ON business_billing
    FOR EACH ROW EXECUTE FUNCTION update_earnings_billing_timestamps();

CREATE TRIGGER trigger_payout_requests_updated_at
    BEFORE UPDATE ON payout_requests
    FOR EACH ROW EXECUTE FUNCTION update_earnings_billing_timestamps();

CREATE TRIGGER trigger_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_earnings_billing_timestamps();

-- Comment: Earnings and Billing tables with comprehensive financial management and automated processing