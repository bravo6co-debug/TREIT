-- ===================================
-- Treit Database Schema: Businesses Table
-- ===================================
-- 광고주(businesses) 정보 테이블 및 RLS 정책
-- DATABASE.md 기반

-- Admin users table (for business verification)
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role admin_role NOT NULL DEFAULT 'SUPPORT',
    permissions JSONB DEFAULT '{}',
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Businesses table - 광고주 정보
CREATE TABLE businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Authentication (Supabase Auth 연동)
    auth_uid UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    
    -- Company Information
    company_name TEXT NOT NULL,
    business_number TEXT UNIQUE, -- 사업자등록번호
    representative_name TEXT, -- 대표자명
    phone TEXT NOT NULL,
    
    -- Address Information
    address JSONB,
    /* 주소 구조:
    {
        "street": "테헤란로 123",
        "city": "서울",
        "state": "서울특별시", 
        "postal_code": "12345",
        "country": "KR"
    }
    */
    
    -- Business Details
    industry business_industry,
    company_size company_size,
    website_url TEXT,
    description TEXT,
    
    -- Verification Status
    status business_status NOT NULL DEFAULT 'PENDING',
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES admin_users(id),
    rejection_reason TEXT,
    
    -- Documents (Storage URLs)
    business_license_url TEXT, -- 사업자등록증
    tax_certificate_url TEXT, -- 세금계산서
    additional_documents JSONB DEFAULT '[]', -- 추가 서류들
    
    -- Metadata
    tags TEXT[], -- 관련 태그들
    notes TEXT, -- 관리자 메모
    
    -- API Keys (암호화된 상태로 저장)
    api_key_hash TEXT, -- 해시된 API 키
    webhook_url TEXT, -- 웹훅 URL
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================
-- Indexes for Performance
-- ===================================

CREATE INDEX idx_businesses_auth_uid ON businesses(auth_uid);
CREATE INDEX idx_businesses_status ON businesses(status);
CREATE INDEX idx_businesses_industry ON businesses(industry);
CREATE INDEX idx_businesses_company_size ON businesses(company_size);
CREATE INDEX idx_businesses_verified_at ON businesses(verified_at DESC) WHERE verified_at IS NOT NULL;
CREATE INDEX idx_businesses_business_number ON businesses(business_number) WHERE business_number IS NOT NULL;
CREATE INDEX idx_businesses_created_at ON businesses(created_at DESC);

-- Admin users indexes
CREATE INDEX idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX idx_admin_users_role ON admin_users(role);
CREATE INDEX idx_admin_users_active ON admin_users(is_active) WHERE is_active = true;

-- ===================================
-- Row Level Security (RLS) Policies
-- ===================================

-- Admin Users RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all admin users" ON admin_users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users au2
            JOIN users u ON au2.user_id = u.id
            WHERE u.auth_uid = auth.uid() AND au2.role = 'SUPER_ADMIN'
        )
    );

CREATE POLICY "Admin users can view themselves" ON admin_users
    FOR SELECT USING (
        user_id IN (SELECT id FROM users WHERE auth_uid = auth.uid())
    );

-- Businesses RLS
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- Businesses can view and manage their own data
CREATE POLICY "Businesses can view own data" ON businesses
    FOR SELECT USING (
        auth.uid() = auth_uid OR 
        status = 'ACTIVE' -- 활성 상태인 광고주는 공개 조회 가능 (캠페인 목적)
    );

CREATE POLICY "Businesses can update own data" ON businesses
    FOR UPDATE USING (auth.uid() = auth_uid)
    WITH CHECK (
        auth.uid() = auth_uid AND
        -- 사업자는 일부 시스템 필드 수정 불가
        OLD.status = NEW.status AND
        OLD.verified_at = NEW.verified_at AND
        OLD.verified_by = NEW.verified_by
    );

CREATE POLICY "Businesses can insert own data" ON businesses
    FOR INSERT WITH CHECK (auth.uid() = auth_uid);

-- Admins can manage all businesses
CREATE POLICY "Admins can manage all businesses" ON businesses
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

-- Function to generate API key for business
CREATE OR REPLACE FUNCTION generate_business_api_key(business_id UUID)
RETURNS TEXT AS $$
DECLARE
    api_key TEXT;
    api_key_hash TEXT;
BEGIN
    -- Generate random API key (32 bytes, base64 encoded)
    api_key := 'treit_' || encode(gen_random_bytes(32), 'base64');
    
    -- Hash the API key for storage
    api_key_hash := crypt(api_key, gen_salt('bf'));
    
    -- Store hash in database
    UPDATE businesses 
    SET api_key_hash = api_key_hash, updated_at = NOW()
    WHERE id = business_id;
    
    -- Return the plain API key (only time it's visible)
    RETURN api_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify API key
CREATE OR REPLACE FUNCTION verify_business_api_key(api_key TEXT)
RETURNS UUID AS $$
DECLARE
    business_id UUID;
BEGIN
    SELECT id INTO business_id
    FROM businesses
    WHERE api_key_hash = crypt(api_key, api_key_hash)
      AND status = 'ACTIVE';
    
    RETURN business_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle business verification
CREATE OR REPLACE FUNCTION verify_business(
    p_business_id UUID,
    p_admin_user_id UUID,
    p_approve BOOLEAN,
    p_rejection_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    IF p_approve THEN
        UPDATE businesses 
        SET 
            status = 'ACTIVE',
            verified_at = NOW(),
            verified_by = p_admin_user_id,
            rejection_reason = NULL,
            updated_at = NOW()
        WHERE id = p_business_id;
    ELSE
        UPDATE businesses 
        SET 
            status = 'REJECTED',
            verified_at = NULL,
            verified_by = p_admin_user_id,
            rejection_reason = p_rejection_reason,
            updated_at = NOW()
        WHERE id = p_business_id;
    END IF;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_businesses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update admin timestamps
CREATE OR REPLACE FUNCTION update_admin_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER trigger_businesses_updated_at
    BEFORE UPDATE ON businesses
    FOR EACH ROW EXECUTE FUNCTION update_businesses_updated_at();

CREATE TRIGGER trigger_admin_users_updated_at
    BEFORE UPDATE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION update_admin_users_updated_at();

-- ===================================
-- Business Verification Workflow
-- ===================================

-- Function to notify admin when new business registers
CREATE OR REPLACE FUNCTION notify_new_business_registration()
RETURNS TRIGGER AS $$
BEGIN
    -- 실제 구현에서는 이메일/슬랙 알림 등을 보낼 수 있음
    INSERT INTO system_notifications (
        type,
        title,
        message,
        target_role,
        created_at
    ) VALUES (
        'business_registration',
        '새로운 광고주 등록',
        NEW.company_name || ' 광고주가 등록을 요청했습니다.',
        'ADMIN',
        NOW()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create system notifications table for admin alerts
CREATE TABLE system_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    target_role admin_role,
    target_user_id UUID REFERENCES users(id),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_system_notifications_target_role ON system_notifications(target_role, is_read);
CREATE INDEX idx_system_notifications_target_user ON system_notifications(target_user_id, is_read);

-- Trigger for new business registration notifications
CREATE TRIGGER notify_business_registration
    AFTER INSERT ON businesses
    FOR EACH ROW EXECUTE FUNCTION notify_new_business_registration();

-- Comment: Businesses table with full verification workflow and admin management system