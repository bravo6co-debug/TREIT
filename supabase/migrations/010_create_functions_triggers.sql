-- ===================================
-- Treit Database Schema: Functions & Triggers
-- ===================================
-- 모든 비즈니스 로직 함수와 트리거 정의
-- DATABASE.md 기반

-- ===================================
-- Core Business Logic Functions
-- ===================================

-- Function to process click and update all related tables
CREATE OR REPLACE FUNCTION process_click_transaction(
    p_user_campaign_id UUID,
    p_ip_address INET,
    p_user_agent TEXT DEFAULT NULL,
    p_referrer_url TEXT DEFAULT NULL,
    p_campaign_context JSONB DEFAULT '{}',
    p_metadata JSONB DEFAULT '{}'
)
RETURNS TABLE(
    click_id UUID,
    is_valid BOOLEAN,
    commission_amount DECIMAL,
    transaction_id UUID
) AS $$
DECLARE
    v_click_id UUID;
    v_is_valid BOOLEAN;
    v_commission DECIMAL;
    v_transaction_id UUID;
    v_user_id UUID;
    v_campaign_id UUID;
    v_business_id UUID;
    v_fraud_detected BOOLEAN := false;
BEGIN
    -- Get related IDs
    SELECT uc.user_id, uc.campaign_id, c.business_id
    INTO v_user_id, v_campaign_id, v_business_id
    FROM user_campaigns uc
    JOIN campaigns c ON uc.campaign_id = c.id
    WHERE uc.id = p_user_campaign_id;
    
    -- Record the click event (includes validation)
    v_click_id := record_click_event(
        p_user_campaign_id,
        p_ip_address,
        p_user_agent,
        p_referrer_url,
        p_campaign_context,
        p_metadata
    );
    
    -- Get click validation results
    SELECT ce.is_valid, ce.commission_amount
    INTO v_is_valid, v_commission
    FROM click_events ce
    WHERE ce.id = v_click_id;
    
    -- Only process transaction if click is valid
    IF v_is_valid AND v_commission > 0 THEN
        -- Create earning transaction
        INSERT INTO transactions (
            type,
            category,
            user_id,
            business_id,
            campaign_id,
            user_campaign_id,
            click_event_id,
            amount,
            description,
            status,
            metadata
        ) VALUES (
            'earning',
            'click',
            v_user_id,
            v_business_id,
            v_campaign_id,
            p_user_campaign_id,
            v_click_id,
            v_commission,
            'Click commission earned',
            'COMPLETED',
            p_metadata
        ) RETURNING id INTO v_transaction_id;
        
        -- Update user earnings (will be handled by trigger)
        -- Update campaign spending (will be handled by trigger)
        -- Update business billing (will be handled by trigger)
    END IF;
    
    RETURN QUERY SELECT v_click_id, v_is_valid, v_commission, v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle level up and XP gains
CREATE OR REPLACE FUNCTION process_xp_gain(
    p_user_id UUID,
    p_xp_amount INTEGER,
    p_source TEXT,
    p_description TEXT DEFAULT NULL
)
RETURNS TABLE(
    old_level INTEGER,
    new_level INTEGER,
    old_grade user_grade,
    new_grade user_grade,
    level_up_occurred BOOLEAN,
    grade_change_occurred BOOLEAN,
    bonus_amount DECIMAL
) AS $$
DECLARE
    v_old_level INTEGER;
    v_new_level INTEGER;
    v_old_grade user_grade;
    v_new_grade user_grade;
    v_old_total_xp INTEGER;
    v_new_total_xp INTEGER;
    v_old_current_xp INTEGER;
    v_new_current_xp INTEGER;
    v_next_level_xp INTEGER;
    v_level_up BOOLEAN := false;
    v_grade_change BOOLEAN := false;
    v_bonus_amount DECIMAL := 0;
    v_level_check_result RECORD;
BEGIN
    -- Get current user stats
    SELECT level, grade, current_xp, total_xp, next_level_xp
    INTO v_old_level, v_old_grade, v_old_current_xp, v_old_total_xp, v_next_level_xp
    FROM users
    WHERE id = p_user_id;
    
    -- Calculate new XP values
    v_new_total_xp := v_old_total_xp + p_xp_amount;
    v_new_current_xp := v_old_current_xp + p_xp_amount;
    
    -- Check for level ups using level system
    SELECT * INTO v_level_check_result
    FROM calculate_user_level_from_xp(v_new_total_xp);
    
    v_new_level := (v_level_check_result).level;
    v_new_grade := (v_level_check_result).grade;
    v_next_level_xp := (v_level_check_result).xp_required_for_next;
    v_new_current_xp := (v_level_check_result).current_level_xp;
    
    -- Determine if changes occurred
    v_level_up := (v_new_level > v_old_level);
    v_grade_change := (v_new_grade != v_old_grade);
    
    -- Calculate bonuses for level up and grade changes
    IF v_level_up THEN
        v_bonus_amount := v_bonus_amount + 100; -- Base level up bonus
    END IF;
    
    IF v_grade_change THEN
        v_bonus_amount := v_bonus_amount + CASE v_new_grade
            WHEN 'SILVER' THEN 1000
            WHEN 'GOLD' THEN 3000
            WHEN 'DIAMOND' THEN 8000
            WHEN 'PLATINUM' THEN 20000
            ELSE 0
        END;
    END IF;
    
    -- Update user record
    UPDATE users
    SET 
        level = v_new_level,
        grade = v_new_grade,
        current_xp = v_new_current_xp,
        next_level_xp = v_next_level_xp,
        total_xp = v_new_total_xp,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Record reward history
    INSERT INTO reward_history (
        user_id,
        type,
        amount,
        xp_gained,
        description
    ) VALUES (
        p_user_id,
        p_source::reward_type,
        v_bonus_amount,
        p_xp_amount,
        COALESCE(p_description, 'XP gained from ' || p_source)
    );
    
    -- Add bonus to user earnings if applicable
    IF v_bonus_amount > 0 THEN
        UPDATE user_earnings
        SET 
            available_amount = available_amount + v_bonus_amount,
            total_earned = total_earned + v_bonus_amount,
            updated_at = NOW()
        WHERE user_id = p_user_id;
        
        -- Create bonus transaction
        INSERT INTO transactions (
            type,
            category,
            user_id,
            amount,
            description,
            status
        ) VALUES (
            'earning',
            'bonus',
            p_user_id,
            v_bonus_amount,
            CASE 
                WHEN v_grade_change THEN 'Grade upgrade bonus: ' || v_new_grade
                WHEN v_level_up THEN 'Level up bonus'
                ELSE 'Performance bonus'
            END,
            'COMPLETED'
        );
    END IF;
    
    RETURN QUERY SELECT 
        v_old_level, 
        v_new_level, 
        v_old_grade, 
        v_new_grade, 
        v_level_up, 
        v_grade_change, 
        v_bonus_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate user level from total XP (references level system)
CREATE OR REPLACE FUNCTION calculate_user_level_from_xp(p_total_xp INTEGER)
RETURNS TABLE(
    level INTEGER,
    grade user_grade,
    xp_required_for_next INTEGER,
    current_level_xp INTEGER
) AS $$
DECLARE
    v_level INTEGER := 1;
    v_grade user_grade := 'BRONZE';
    v_current_level_xp INTEGER;
    v_next_level_xp INTEGER;
BEGIN
    -- This will be implemented properly in the level system migration
    -- For now, provide a basic implementation
    
    -- Find the appropriate level from level_configs table
    SELECT 
        lc.level,
        lc.grade,
        (p_total_xp - LAG(lc.cumulative_xp, 1, 0) OVER (ORDER BY lc.level)),
        (LEAD(lc.cumulative_xp, 1, lc.cumulative_xp) OVER (ORDER BY lc.level) - p_total_xp)
    INTO v_level, v_grade, v_current_level_xp, v_next_level_xp
    FROM level_configs lc
    WHERE p_total_xp >= lc.cumulative_xp
    ORDER BY lc.level DESC
    LIMIT 1;
    
    -- If no match found (shouldn't happen), default to level 1
    IF v_level IS NULL THEN
        v_level := 1;
        v_grade := 'BRONZE';
        v_current_level_xp := p_total_xp;
        v_next_level_xp := 120 - p_total_xp; -- First level requirement
    END IF;
    
    RETURN QUERY SELECT v_level, v_grade, v_next_level_xp, v_current_level_xp;
END;
$$ LANGUAGE plpgsql;

-- Function to process daily bonus claim
CREATE OR REPLACE FUNCTION claim_daily_bonus(p_user_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    bonus_amount DECIMAL,
    xp_gained INTEGER,
    streak_count INTEGER,
    message TEXT
) AS $$
DECLARE
    v_last_claim_date DATE;
    v_current_date DATE := CURRENT_DATE;
    v_streak_count INTEGER := 1;
    v_xp_amount INTEGER := 30; -- Base daily XP
    v_bonus_amount DECIMAL := 0;
    v_can_claim BOOLEAN;
    v_user_grade user_grade;
BEGIN
    -- Get user grade for bonus calculation
    SELECT grade INTO v_user_grade FROM users WHERE id = p_user_id;
    
    -- Check if user already claimed today
    SELECT claim_date, streak_count 
    INTO v_last_claim_date, v_streak_count
    FROM daily_bonus_claims 
    WHERE user_id = p_user_id 
    ORDER BY claim_date DESC 
    LIMIT 1;
    
    -- Check if can claim today
    v_can_claim := (v_last_claim_date IS NULL OR v_last_claim_date < v_current_date);
    
    IF NOT v_can_claim THEN
        RETURN QUERY SELECT false, 0::DECIMAL, 0, v_streak_count, 'Already claimed today';
        RETURN;
    END IF;
    
    -- Calculate streak
    IF v_last_claim_date IS NOT NULL THEN
        IF v_last_claim_date = v_current_date - 1 THEN
            v_streak_count := v_streak_count + 1;
        ELSE
            v_streak_count := 1; -- Reset streak
        END IF;
    END IF;
    
    -- Calculate bonus XP for streaks
    IF v_streak_count >= 30 THEN
        v_xp_amount := v_xp_amount + 500; -- 30-day bonus
        v_bonus_amount := 5000;
    ELSIF v_streak_count >= 7 THEN
        v_xp_amount := v_xp_amount + 100; -- 7-day bonus
        v_bonus_amount := 1000;
    END IF;
    
    -- Record the claim
    INSERT INTO daily_bonus_claims (user_id, claim_date, streak_count)
    VALUES (p_user_id, v_current_date, v_streak_count)
    ON CONFLICT (user_id, claim_date) DO NOTHING;
    
    -- Process XP gain (this will handle level ups automatically)
    PERFORM process_xp_gain(p_user_id, v_xp_amount, 'daily_bonus', 'Daily login bonus');
    
    -- Add monetary bonus if applicable
    IF v_bonus_amount > 0 THEN
        UPDATE user_earnings
        SET 
            available_amount = available_amount + v_bonus_amount,
            total_earned = total_earned + v_bonus_amount,
            updated_at = NOW()
        WHERE user_id = p_user_id;
    END IF;
    
    RETURN QUERY SELECT 
        true, 
        v_bonus_amount, 
        v_xp_amount, 
        v_streak_count,
        CASE 
            WHEN v_streak_count >= 30 THEN '30일 연속 출석! 🎉'
            WHEN v_streak_count >= 7 THEN '7일 연속 출석! 🔥'
            ELSE '출석 체크 완료! ✅'
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================
-- Main Business Logic Triggers
-- ===================================

-- Trigger to update campaign and template statistics
CREATE OR REPLACE FUNCTION trigger_update_campaign_spending()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process completed earning transactions
    IF NEW.type = 'earning' AND NEW.category = 'click' AND NEW.status = 'COMPLETED' THEN
        -- Update campaign spending
        UPDATE campaigns 
        SET 
            spent_amount = spent_amount + NEW.amount,
            total_clicks = total_clicks + 1,
            updated_at = NOW()
        WHERE id = NEW.campaign_id;
        
        -- Update business billing
        UPDATE business_billing
        SET 
            daily_spent = daily_spent + NEW.amount,
            monthly_spent = monthly_spent + NEW.amount,
            used_credits = used_credits + NEW.amount,
            last_charged_at = NOW(),
            updated_at = NOW()
        WHERE business_id = NEW.business_id;
        
        -- Update user earnings
        UPDATE user_earnings
        SET 
            pending_amount = pending_amount + NEW.amount,
            monthly_earned = monthly_earned + NEW.amount,
            monthly_clicks = monthly_clicks + 1,
            daily_earned = daily_earned + NEW.amount,
            daily_clicks = daily_clicks + 1,
            last_earned_at = NOW(),
            updated_at = NOW()
        WHERE user_id = NEW.user_id;
        
        -- Update user campaign earnings
        UPDATE user_campaigns
        SET 
            click_count = click_count + 1,
            earned_amount = earned_amount + NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.user_campaign_id;
        
        -- Process XP gain for the user (based on grade)
        DECLARE
            v_user_grade user_grade;
            v_xp_amount INTEGER;
        BEGIN
            SELECT grade INTO v_user_grade FROM users WHERE id = NEW.user_id;
            
            v_xp_amount := CASE v_user_grade
                WHEN 'BRONZE' THEN 40
                WHEN 'SILVER' THEN 52
                WHEN 'GOLD' THEN 64
                WHEN 'DIAMOND' THEN 72
                WHEN 'PLATINUM' THEN 80
                ELSE 40
            END;
            
            PERFORM process_xp_gain(NEW.user_id, v_xp_amount, 'daily_mission', 'Mission completed');
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to transactions table
CREATE TRIGGER trigger_process_transaction_updates
    AFTER INSERT ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_campaign_spending();

-- Trigger to automatically initialize user earnings and risk profile
CREATE OR REPLACE FUNCTION trigger_initialize_user_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Initialize user earnings
    INSERT INTO user_earnings (user_id) 
    VALUES (NEW.id) 
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Initialize user risk profile
    INSERT INTO user_risk_profiles (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to users table
CREATE TRIGGER trigger_initialize_new_user
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION trigger_initialize_user_data();

-- Trigger to automatically initialize business billing
CREATE OR REPLACE FUNCTION trigger_initialize_business_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Initialize business billing
    INSERT INTO business_billing (business_id)
    VALUES (NEW.id)
    ON CONFLICT (business_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to businesses table
CREATE TRIGGER trigger_initialize_new_business
    AFTER INSERT ON businesses
    FOR EACH ROW
    EXECUTE FUNCTION trigger_initialize_business_data();

-- Trigger to check budget limits and pause campaigns
CREATE OR REPLACE FUNCTION trigger_check_campaign_budget()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if campaign has exceeded budget
    IF NEW.spent_amount >= COALESCE(NEW.total_budget, NEW.spent_amount + 1) THEN
        NEW.is_active := false;
        NEW.paused_at := NOW();
    END IF;
    
    -- Check daily budget via business billing
    DECLARE
        v_daily_spent DECIMAL;
        v_daily_limit DECIMAL;
    BEGIN
        SELECT bb.daily_spent, bb.daily_budget_limit
        INTO v_daily_spent, v_daily_limit
        FROM business_billing bb
        WHERE bb.business_id = NEW.business_id;
        
        IF v_daily_limit IS NOT NULL AND v_daily_spent >= v_daily_limit THEN
            NEW.is_active := false;
            NEW.paused_at := NOW();
        END IF;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply budget check trigger
CREATE TRIGGER trigger_campaign_budget_check
    BEFORE UPDATE ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION trigger_check_campaign_budget();

-- ===================================
-- Automated Fraud Detection Triggers
-- ===================================

-- Trigger to detect suspicious user behavior
CREATE OR REPLACE FUNCTION trigger_detect_user_fraud()
RETURNS TRIGGER AS $$
DECLARE
    v_recent_clicks INTEGER;
    v_risk_score DECIMAL;
    v_user_id UUID;
BEGIN
    -- Get user ID from user campaign
    SELECT uc.user_id INTO v_user_id
    FROM user_campaigns uc
    WHERE uc.id = NEW.user_campaign_id;
    
    -- Count recent clicks from this user (last hour)
    SELECT COUNT(*) INTO v_recent_clicks
    FROM click_events ce
    JOIN user_campaigns uc ON ce.user_campaign_id = uc.id
    WHERE uc.user_id = v_user_id
      AND ce.clicked_at > NOW() - INTERVAL '1 hour';
    
    -- Detect click spam
    IF v_recent_clicks > 20 THEN
        PERFORM log_fraud_detection(
            p_user_id := v_user_id,
            p_click_event_id := NEW.id,
            p_fraud_type := 'click_spam',
            p_severity := 7,
            p_confidence := 0.9,
            p_detection_method := 'automated_trigger',
            p_evidence := jsonb_build_object(
                'clicks_per_hour', v_recent_clicks,
                'detection_time', NOW(),
                'threshold_exceeded', true
            ),
            p_auto_action := 'suspend_user'
        );
        
        -- Update click as invalid
        NEW.is_valid := false;
        NEW.commission_amount := 0;
        NEW.fraud_flags := array_append(NEW.fraud_flags, 'click_spam_detected');
    END IF;
    
    -- Update user risk score
    PERFORM update_user_risk_score(v_user_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply fraud detection trigger to click events
CREATE TRIGGER trigger_click_fraud_detection
    BEFORE INSERT ON click_events
    FOR EACH ROW
    EXECUTE FUNCTION trigger_detect_user_fraud();

-- ===================================
-- Performance Analytics Functions
-- ===================================

-- Function to calculate campaign ROI for businesses
CREATE OR REPLACE FUNCTION calculate_campaign_roi(
    p_campaign_id UUID,
    p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
    p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE(
    campaign_id UUID,
    total_spent DECIMAL,
    total_clicks INTEGER,
    unique_users INTEGER,
    avg_cpc DECIMAL,
    ctr DECIMAL,
    conversion_rate DECIMAL,
    roi_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as campaign_id,
        COALESCE(SUM(t.amount), 0) as total_spent,
        COUNT(ce.id)::INTEGER as total_clicks,
        COUNT(DISTINCT uc.user_id)::INTEGER as unique_users,
        CASE 
            WHEN COUNT(ce.id) > 0 
            THEN COALESCE(SUM(t.amount), 0) / COUNT(ce.id)
            ELSE 0 
        END as avg_cpc,
        CASE 
            WHEN c.total_impressions > 0 
            THEN (COUNT(ce.id)::DECIMAL / c.total_impressions * 100)
            ELSE 0 
        END as ctr,
        CASE 
            WHEN COUNT(ce.id) > 0 
            THEN (COUNT(*) FILTER (WHERE ce.converted = true)::DECIMAL / COUNT(ce.id) * 100)
            ELSE 0 
        END as conversion_rate,
        -- Simple ROI calculation (can be enhanced)
        CASE 
            WHEN COALESCE(SUM(t.amount), 0) > 0
            THEN ((COUNT(*) FILTER (WHERE ce.converted = true) * c.cpc_rate * 2) - COALESCE(SUM(t.amount), 0)) / COALESCE(SUM(t.amount), 1) * 100
            ELSE 0
        END as roi_score
    FROM campaigns c
    LEFT JOIN user_campaigns uc ON c.id = uc.campaign_id
    LEFT JOIN click_events ce ON uc.id = ce.user_campaign_id 
        AND ce.clicked_at BETWEEN p_start_date AND p_end_date
    LEFT JOIN transactions t ON ce.id::TEXT = t.click_event_id::TEXT 
        AND t.type = 'earning' 
        AND t.created_at BETWEEN p_start_date AND p_end_date
    WHERE c.id = p_campaign_id
    GROUP BY c.id, c.total_impressions, c.cpc_rate;
END;
$$ LANGUAGE plpgsql;

-- Function to get user performance analytics
CREATE OR REPLACE FUNCTION get_user_performance_analytics(
    p_user_id UUID,
    p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
    p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE(
    total_earnings DECIMAL,
    total_clicks INTEGER,
    active_campaigns INTEGER,
    avg_earnings_per_click DECIMAL,
    best_performing_campaign UUID,
    engagement_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(t.amount), 0) as total_earnings,
        COUNT(ce.id)::INTEGER as total_clicks,
        COUNT(DISTINCT uc.campaign_id)::INTEGER as active_campaigns,
        CASE 
            WHEN COUNT(ce.id) > 0 
            THEN COALESCE(SUM(t.amount), 0) / COUNT(ce.id)
            ELSE 0 
        END as avg_earnings_per_click,
        (
            SELECT uc2.campaign_id
            FROM user_campaigns uc2
            JOIN click_events ce2 ON uc2.id = ce2.user_campaign_id
            JOIN transactions t2 ON ce2.id::TEXT = t2.click_event_id::TEXT
            WHERE uc2.user_id = p_user_id
              AND ce2.clicked_at BETWEEN p_start_date AND p_end_date
            GROUP BY uc2.campaign_id
            ORDER BY SUM(t2.amount) DESC
            LIMIT 1
        ) as best_performing_campaign,
        COALESCE(AVG(uc.engagement_rate), 0) as engagement_score
    FROM users u
    LEFT JOIN user_campaigns uc ON u.id = uc.user_id
    LEFT JOIN click_events ce ON uc.id = ce.user_campaign_id 
        AND ce.clicked_at BETWEEN p_start_date AND p_end_date
        AND ce.is_valid = true
    LEFT JOIN transactions t ON ce.id::TEXT = t.click_event_id::TEXT 
        AND t.type = 'earning' 
        AND t.created_at BETWEEN p_start_date AND p_end_date
    WHERE u.id = p_user_id
    GROUP BY u.id;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- Utility Functions
-- ===================================

-- Function to clean up old data (privacy compliance)
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS TEXT AS $$
DECLARE
    v_deleted_clicks INTEGER;
    v_deleted_logs INTEGER;
    v_deleted_sessions INTEGER;
BEGIN
    -- Delete click events older than 2 years
    WITH deleted_clicks AS (
        DELETE FROM click_events 
        WHERE clicked_at < NOW() - INTERVAL '2 years'
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_deleted_clicks FROM deleted_clicks;
    
    -- Delete fraud logs older than 1 year (keep for compliance)
    WITH deleted_logs AS (
        DELETE FROM fraud_detection_logs 
        WHERE detected_at < NOW() - INTERVAL '1 year'
        AND reviewed = true
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_deleted_logs FROM deleted_logs;
    
    -- Delete old platform API logs (keep only 90 days)
    WITH deleted_sessions AS (
        DELETE FROM platform_api_logs 
        WHERE created_at < NOW() - INTERVAL '90 days'
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_deleted_sessions FROM deleted_sessions;
    
    RETURN format('Cleaned up %s click events, %s fraud logs, %s API logs', 
                  v_deleted_clicks, v_deleted_logs, v_deleted_sessions);
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup to run monthly
SELECT cron.schedule('cleanup-old-data', '0 2 1 * *', 'SELECT cleanup_old_data()');

-- ===================================
-- Health Check Functions
-- ===================================

-- Function to check system health
CREATE OR REPLACE FUNCTION system_health_check()
RETURNS TABLE(
    component TEXT,
    status TEXT,
    details JSONB
) AS $$
BEGIN
    -- Check active campaigns
    RETURN QUERY
    SELECT 
        'campaigns' as component,
        CASE WHEN COUNT(*) > 0 THEN 'healthy' ELSE 'warning' END as status,
        jsonb_build_object(
            'active_campaigns', COUNT(*),
            'total_budget', SUM(total_budget),
            'total_spent', SUM(spent_amount)
        ) as details
    FROM campaigns 
    WHERE is_active = true AND approval_status = 'APPROVED';
    
    -- Check recent activity
    RETURN QUERY
    SELECT 
        'activity' as component,
        CASE WHEN COUNT(*) > 100 THEN 'healthy' ELSE 'warning' END as status,
        jsonb_build_object(
            'clicks_last_hour', COUNT(*),
            'valid_clicks', COUNT(*) FILTER (WHERE is_valid = true)
        ) as details
    FROM click_events 
    WHERE clicked_at > NOW() - INTERVAL '1 hour';
    
    -- Check fraud detection
    RETURN QUERY
    SELECT 
        'fraud_detection' as component,
        'healthy' as status,
        jsonb_build_object(
            'detections_today', COUNT(*),
            'high_risk_users', (
                SELECT COUNT(*) FROM user_risk_profiles 
                WHERE risk_category IN ('high', 'critical')
            )
        ) as details
    FROM fraud_detection_logs 
    WHERE detected_at > CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Comment: Comprehensive business logic functions and triggers for the Treit platform