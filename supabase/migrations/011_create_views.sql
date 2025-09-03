-- ===================================
-- Treit Database Schema: Views & Materialized Views
-- ===================================
-- 성능 최적화 및 데이터 분석용 뷰
-- DATABASE.md 기반

-- ===================================
-- Campaign Performance Views
-- ===================================

-- Materialized View: Campaign Performance Summary
CREATE MATERIALIZED VIEW mv_campaign_performance AS
SELECT 
    c.id as campaign_id,
    c.business_id,
    c.title,
    c.category,
    c.cpc_rate,
    c.daily_budget,
    c.total_budget,
    c.spent_amount,
    c.remaining_budget,
    c.is_active,
    c.approval_status,
    
    -- User Engagement
    COUNT(DISTINCT uc.user_id) as unique_participants,
    COUNT(DISTINCT uc.id) as total_participations,
    
    -- Click Metrics
    COUNT(ce.id) as total_clicks,
    COUNT(ce.id) FILTER (WHERE ce.is_valid = true) as valid_clicks,
    COUNT(ce.id) FILTER (WHERE ce.converted = true) as conversions,
    
    -- Financial Metrics
    SUM(ce.commission_amount) FILTER (WHERE ce.is_valid = true) as total_commission_paid,
    AVG(ce.commission_amount) FILTER (WHERE ce.is_valid = true) as avg_commission_per_click,
    
    -- Performance Ratios
    CASE 
        WHEN COUNT(ce.id) > 0 
        THEN COUNT(ce.id) FILTER (WHERE ce.is_valid = true)::DECIMAL / COUNT(ce.id) * 100
        ELSE 0 
    END as click_validity_rate,
    
    CASE 
        WHEN COUNT(ce.id) FILTER (WHERE ce.is_valid = true) > 0 
        THEN COUNT(ce.id) FILTER (WHERE ce.converted = true)::DECIMAL / COUNT(ce.id) FILTER (WHERE ce.is_valid = true) * 100
        ELSE 0 
    END as conversion_rate,
    
    CASE 
        WHEN c.total_budget > 0 
        THEN (c.spent_amount / c.total_budget * 100)
        ELSE 0 
    END as budget_utilization_rate,
    
    -- Quality Metrics
    AVG(ce.validation_score) FILTER (WHERE ce.is_valid = true) as avg_click_quality,
    COUNT(DISTINCT ce.ip_address) as unique_ip_addresses,
    COUNT(DISTINCT ce.country_code) as countries_reached,
    
    -- Time Analytics
    MIN(ce.clicked_at) as first_click_at,
    MAX(ce.clicked_at) as last_click_at,
    
    -- Device Distribution
    COUNT(ce.id) FILTER (WHERE ce.device_type = 'mobile') as mobile_clicks,
    COUNT(ce.id) FILTER (WHERE ce.device_type = 'desktop') as desktop_clicks,
    COUNT(ce.id) FILTER (WHERE ce.device_type = 'tablet') as tablet_clicks,
    
    -- Update tracking
    NOW() as last_updated
FROM campaigns c
LEFT JOIN user_campaigns uc ON c.id = uc.campaign_id
LEFT JOIN click_events ce ON uc.id = ce.user_campaign_id
WHERE c.deleted_at IS NULL
GROUP BY c.id, c.business_id, c.title, c.category, c.cpc_rate, c.daily_budget, 
         c.total_budget, c.spent_amount, c.remaining_budget, c.is_active, c.approval_status;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX idx_mv_campaign_performance_campaign_id 
ON mv_campaign_performance(campaign_id);

-- ===================================
-- User Performance Views
-- ===================================

-- Materialized View: User Performance Leaderboard
CREATE MATERIALIZED VIEW mv_user_leaderboard AS
SELECT 
    u.id as user_id,
    u.nickname,
    u.level,
    u.grade,
    u.total_xp,
    u.status,
    u.created_at as user_since,
    
    -- Earnings Statistics
    ue.total_earned,
    ue.monthly_earned,
    ue.available_amount,
    ue.quality_score,
    
    -- Activity Statistics
    ue.monthly_clicks,
    ue.monthly_campaigns,
    ue.daily_earned,
    ue.daily_clicks,
    
    -- Performance Metrics
    CASE 
        WHEN ue.monthly_clicks > 0 
        THEN ue.monthly_earned / ue.monthly_clicks
        ELSE 0 
    END as avg_earnings_per_click,
    
    -- Campaign Engagement
    COUNT(DISTINCT uc.campaign_id) as active_campaigns,
    COUNT(DISTINCT uc.template_id) as templates_used,
    COUNT(DISTINCT uc.platform) as platforms_used,
    
    -- Performance Rankings
    RANK() OVER (ORDER BY ue.monthly_earned DESC) as monthly_earnings_rank,
    RANK() OVER (ORDER BY u.total_xp DESC) as xp_rank,
    RANK() OVER (ORDER BY u.level DESC, u.total_xp DESC) as level_rank,
    
    -- Quality Rankings
    RANK() OVER (ORDER BY ue.quality_score DESC, ue.total_earned DESC) as quality_rank,
    
    -- Activity Level
    CASE 
        WHEN ue.daily_clicks > 10 THEN 'very_active'
        WHEN ue.daily_clicks > 5 THEN 'active'
        WHEN ue.daily_clicks > 0 THEN 'moderate'
        ELSE 'inactive'
    END as activity_level,
    
    -- Last activity tracking
    ue.last_earned_at,
    ue.last_activity_at,
    
    NOW() as last_updated
FROM users u
JOIN user_earnings ue ON u.id = ue.user_id
LEFT JOIN user_campaigns uc ON u.id = uc.user_id AND uc.status = 'ACTIVE'
WHERE u.status = 'ACTIVE'
GROUP BY u.id, u.nickname, u.level, u.grade, u.total_xp, u.status, u.created_at,
         ue.total_earned, ue.monthly_earned, ue.available_amount, ue.quality_score,
         ue.monthly_clicks, ue.monthly_campaigns, ue.daily_earned, ue.daily_clicks,
         ue.last_earned_at, ue.last_activity_at;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX idx_mv_user_leaderboard_user_id 
ON mv_user_leaderboard(user_id);

-- ===================================
-- Business Analytics Views
-- ===================================

-- Materialized View: Business Performance Dashboard
CREATE MATERIALIZED VIEW mv_business_dashboard AS
SELECT 
    b.id as business_id,
    b.company_name,
    b.industry,
    b.status as business_status,
    b.created_at as business_since,
    
    -- Billing Information
    bb.available_credits,
    bb.credit_utilization,
    bb.monthly_spent,
    bb.total_spent,
    bb.payment_status,
    
    -- Campaign Statistics
    COUNT(DISTINCT c.id) as total_campaigns,
    COUNT(DISTINCT c.id) FILTER (WHERE c.is_active = true) as active_campaigns,
    COUNT(DISTINCT c.id) FILTER (WHERE c.approval_status = 'APPROVED') as approved_campaigns,
    
    -- Performance Metrics
    COALESCE(SUM(c.total_clicks), 0) as total_clicks_generated,
    COALESCE(SUM(c.spent_amount), 0) as total_amount_spent,
    COALESCE(AVG(c.ctr), 0) as avg_ctr,
    
    -- User Reach
    COUNT(DISTINCT uc.user_id) as unique_users_reached,
    COUNT(DISTINCT uc.id) as total_user_participations,
    
    -- ROI Calculations
    CASE 
        WHEN SUM(c.spent_amount) > 0 
        THEN (COUNT(DISTINCT ce.id) FILTER (WHERE ce.converted = true) * AVG(c.cpc_rate) * 2 - SUM(c.spent_amount)) / SUM(c.spent_amount) * 100
        ELSE 0 
    END as estimated_roi_percentage,
    
    -- Template Performance
    COUNT(DISTINCT t.id) as total_templates_created,
    AVG(t.performance_score) as avg_template_performance,
    
    -- Geographic Reach
    COUNT(DISTINCT ce.country_code) as countries_reached,
    array_agg(DISTINCT ce.country_code ORDER BY ce.country_code) FILTER (WHERE ce.country_code IS NOT NULL) as target_countries,
    
    -- Recent Activity
    MAX(c.created_at) as last_campaign_created,
    MAX(bb.last_charged_at) as last_payment_date,
    
    NOW() as last_updated
FROM businesses b
LEFT JOIN business_billing bb ON b.id = bb.business_id
LEFT JOIN campaigns c ON b.id = c.business_id AND c.deleted_at IS NULL
LEFT JOIN templates t ON c.id = t.campaign_id
LEFT JOIN user_campaigns uc ON c.id = uc.campaign_id
LEFT JOIN click_events ce ON uc.id = ce.user_campaign_id AND ce.is_valid = true
WHERE b.status IN ('ACTIVE', 'PENDING')
GROUP BY b.id, b.company_name, b.industry, b.status, b.created_at,
         bb.available_credits, bb.credit_utilization, bb.monthly_spent, 
         bb.total_spent, bb.payment_status, bb.last_charged_at;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX idx_mv_business_dashboard_business_id 
ON mv_business_dashboard(business_id);

-- ===================================
-- Analytics & Insights Views
-- ===================================

-- View: Daily Platform Analytics
CREATE VIEW v_daily_analytics AS
SELECT 
    date_trunc('day', ce.clicked_at) as analytics_date,
    
    -- Click Metrics
    COUNT(ce.id) as total_clicks,
    COUNT(ce.id) FILTER (WHERE ce.is_valid = true) as valid_clicks,
    COUNT(ce.id) FILTER (WHERE ce.converted = true) as conversions,
    
    -- Revenue Metrics
    SUM(ce.commission_amount) FILTER (WHERE ce.is_valid = true) as total_commissions,
    COUNT(DISTINCT uc.user_id) as active_users,
    COUNT(DISTINCT uc.campaign_id) as active_campaigns,
    
    -- Quality Metrics
    AVG(ce.validation_score) FILTER (WHERE ce.is_valid = true) as avg_click_quality,
    COUNT(ce.id) FILTER (WHERE array_length(ce.fraud_flags, 1) > 0) as fraud_attempts,
    
    -- Device Distribution
    COUNT(ce.id) FILTER (WHERE ce.device_type = 'mobile') as mobile_clicks,
    COUNT(ce.id) FILTER (WHERE ce.device_type = 'desktop') as desktop_clicks,
    COUNT(ce.id) FILTER (WHERE ce.device_type = 'tablet') as tablet_clicks,
    
    -- Platform Distribution  
    COUNT(DISTINCT uc.id) FILTER (WHERE uc.platform = 'INSTAGRAM') as instagram_campaigns,
    COUNT(DISTINCT uc.id) FILTER (WHERE uc.platform = 'FACEBOOK') as facebook_campaigns,
    COUNT(DISTINCT uc.id) FILTER (WHERE uc.platform = 'TIKTOK') as tiktok_campaigns,
    COUNT(DISTINCT uc.id) FILTER (WHERE uc.platform = 'YOUTUBE') as youtube_campaigns,
    
    -- Geographic Distribution
    COUNT(DISTINCT ce.country_code) as countries_active,
    COUNT(ce.id) FILTER (WHERE ce.country_code = 'KR') as domestic_clicks,
    COUNT(ce.id) FILTER (WHERE ce.country_code != 'KR' OR ce.country_code IS NULL) as international_clicks
FROM click_events ce
JOIN user_campaigns uc ON ce.user_campaign_id = uc.id
WHERE ce.clicked_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY date_trunc('day', ce.clicked_at)
ORDER BY analytics_date DESC;

-- View: Template Performance Analytics
CREATE VIEW v_template_analytics AS
SELECT 
    t.id as template_id,
    t.name as template_name,
    t.type as template_type,
    c.category as campaign_category,
    c.business_id,
    
    -- Usage Statistics
    t.usage_count,
    t.click_count,
    t.conversion_count,
    t.performance_score,
    
    -- Engagement Metrics
    COUNT(uc.id) as active_user_campaigns,
    COUNT(DISTINCT uc.user_id) as unique_users,
    AVG(uc.engagement_rate) as avg_engagement_rate,
    
    -- Performance Rankings
    RANK() OVER (PARTITION BY c.category ORDER BY t.performance_score DESC) as category_rank,
    RANK() OVER (ORDER BY t.performance_score DESC) as global_rank,
    
    -- ROI Metrics
    CASE 
        WHEN t.click_count > 0 
        THEN t.conversion_count::DECIMAL / t.click_count * 100
        ELSE 0 
    END as conversion_rate,
    
    -- Content Analysis
    jsonb_array_length(COALESCE(t.content->'hashtags', '[]')) as hashtag_count,
    char_length(COALESCE(t.content->>'body', '')) as content_length,
    
    -- Quality Indicators
    t.quality_rating,
    array_length(t.content_warnings, 1) as warning_count,
    
    -- Last Performance Update
    t.updated_at
FROM templates t
JOIN campaigns c ON t.campaign_id = c.id
LEFT JOIN user_campaigns uc ON t.id = uc.template_id AND uc.status = 'ACTIVE'
WHERE t.is_active = true AND t.approval_status = 'APPROVED'
GROUP BY t.id, t.name, t.type, t.usage_count, t.click_count, t.conversion_count,
         t.performance_score, t.quality_rating, t.content_warnings, t.updated_at, t.content,
         c.category, c.business_id
ORDER BY t.performance_score DESC;

-- ===================================
-- Fraud Detection Analytics Views
-- ===================================

-- View: Fraud Detection Dashboard
CREATE VIEW v_fraud_dashboard AS
SELECT 
    date_trunc('day', fdl.detected_at) as detection_date,
    
    -- Detection Statistics
    COUNT(fdl.id) as total_detections,
    COUNT(fdl.id) FILTER (WHERE fdl.severity_level >= 7) as high_severity_detections,
    COUNT(fdl.id) FILTER (WHERE fdl.confidence_score >= 0.8) as high_confidence_detections,
    
    -- Fraud Type Distribution
    COUNT(fdl.id) FILTER (WHERE fdl.fraud_type = 'click_spam') as click_spam_cases,
    COUNT(fdl.id) FILTER (WHERE fdl.fraud_type = 'bot_activity') as bot_activity_cases,
    COUNT(fdl.id) FILTER (WHERE fdl.fraud_type = 'ip_farming') as ip_farming_cases,
    COUNT(fdl.id) FILTER (WHERE fdl.fraud_type = 'pattern_anomaly') as pattern_anomaly_cases,
    
    -- Action Taken Statistics
    COUNT(fdl.id) FILTER (WHERE fdl.action_taken = 'warning') as warnings_issued,
    COUNT(fdl.id) FILTER (WHERE fdl.action_taken = 'suspend_user') as users_suspended,
    COUNT(fdl.id) FILTER (WHERE fdl.action_taken = 'block_ip') as ips_blocked,
    
    -- Review Statistics
    COUNT(fdl.id) FILTER (WHERE fdl.reviewed = true) as reviewed_cases,
    COUNT(fdl.id) FILTER (WHERE fdl.review_decision = 'false_positive') as false_positives,
    COUNT(fdl.id) FILTER (WHERE fdl.review_decision = 'confirmed') as confirmed_frauds,
    
    -- Affected Entities
    COUNT(DISTINCT fdl.user_id) as affected_users,
    COUNT(DISTINCT fdl.campaign_id) as affected_campaigns,
    
    -- Response Time Metrics
    AVG(EXTRACT(EPOCH FROM (fdl.reviewed_at - fdl.detected_at))/3600) FILTER (WHERE fdl.reviewed = true) as avg_review_time_hours
FROM fraud_detection_logs fdl
WHERE fdl.detected_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY date_trunc('day', fdl.detected_at)
ORDER BY detection_date DESC;

-- ===================================
-- Financial Analytics Views
-- ===================================

-- View: Revenue Analytics
CREATE VIEW v_revenue_analytics AS
SELECT 
    date_trunc('day', t.created_at) as revenue_date,
    
    -- Transaction Volume
    COUNT(t.id) as total_transactions,
    COUNT(t.id) FILTER (WHERE t.type = 'earning') as earning_transactions,
    COUNT(t.id) FILTER (WHERE t.type = 'withdrawal') as withdrawal_transactions,
    COUNT(t.id) FILTER (WHERE t.type = 'charge') as charge_transactions,
    
    -- Revenue Metrics
    SUM(t.amount) FILTER (WHERE t.type = 'earning' AND t.status = 'COMPLETED') as total_earnings,
    SUM(t.amount) FILTER (WHERE t.type = 'withdrawal' AND t.status = 'COMPLETED') as total_withdrawals,
    SUM(t.amount) FILTER (WHERE t.type = 'charge' AND t.status = 'COMPLETED') as total_charges,
    
    -- Net Revenue (Platform's cut)
    SUM(t.platform_fee) FILTER (WHERE t.status = 'COMPLETED') as platform_fees_collected,
    SUM(t.processing_fee) FILTER (WHERE t.status = 'COMPLETED') as processing_fees_collected,
    
    -- User Metrics
    COUNT(DISTINCT t.user_id) FILTER (WHERE t.type = 'earning') as earning_users,
    COUNT(DISTINCT t.user_id) FILTER (WHERE t.type = 'withdrawal') as withdrawing_users,
    
    -- Business Metrics
    COUNT(DISTINCT t.business_id) FILTER (WHERE t.type = 'charge') as paying_businesses,
    AVG(t.amount) FILTER (WHERE t.type = 'charge' AND t.status = 'COMPLETED') as avg_charge_amount,
    
    -- Transaction Status
    COUNT(t.id) FILTER (WHERE t.status = 'PENDING') as pending_transactions,
    COUNT(t.id) FILTER (WHERE t.status = 'FAILED') as failed_transactions
FROM transactions t
WHERE t.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY date_trunc('day', t.created_at)
ORDER BY revenue_date DESC;

-- ===================================
-- Refresh Functions for Materialized Views
-- ===================================

-- Function to refresh campaign performance view
CREATE OR REPLACE FUNCTION refresh_campaign_performance()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_campaign_performance;
    
    -- Log refresh
    INSERT INTO system_notifications (
        type, title, message, target_role, created_at
    ) VALUES (
        'system_maintenance',
        'Campaign Performance View Refreshed',
        'Campaign performance materialized view has been refreshed successfully.',
        'ADMIN',
        NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Function to refresh user leaderboard view  
CREATE OR REPLACE FUNCTION refresh_user_leaderboard()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_leaderboard;
    
    -- Log refresh
    INSERT INTO system_notifications (
        type, title, message, target_role, created_at
    ) VALUES (
        'system_maintenance',
        'User Leaderboard View Refreshed',
        'User leaderboard materialized view has been refreshed successfully.',
        'ADMIN',
        NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Function to refresh business dashboard view
CREATE OR REPLACE FUNCTION refresh_business_dashboard()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_business_dashboard;
    
    -- Log refresh
    INSERT INTO system_notifications (
        type, title, message, target_role, created_at
    ) VALUES (
        'system_maintenance',
        'Business Dashboard View Refreshed',
        'Business dashboard materialized view has been refreshed successfully.',
        'ADMIN',
        NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS TEXT AS $$
DECLARE
    refresh_start TIMESTAMPTZ;
    refresh_end TIMESTAMPTZ;
BEGIN
    refresh_start := NOW();
    
    -- Refresh all materialized views
    PERFORM refresh_campaign_performance();
    PERFORM refresh_user_leaderboard();
    PERFORM refresh_business_dashboard();
    
    refresh_end := NOW();
    
    RETURN format('All materialized views refreshed in %s seconds', 
                  EXTRACT(EPOCH FROM (refresh_end - refresh_start)));
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- Scheduled Materialized View Refreshes
-- ===================================

-- Refresh campaign performance every hour
SELECT cron.schedule(
    'refresh-campaign-performance', 
    '0 * * * *', 
    'SELECT refresh_campaign_performance()'
);

-- Refresh user leaderboard every 2 hours
SELECT cron.schedule(
    'refresh-user-leaderboard', 
    '0 */2 * * *', 
    'SELECT refresh_user_leaderboard()'
);

-- Refresh business dashboard every 4 hours
SELECT cron.schedule(
    'refresh-business-dashboard', 
    '0 */4 * * *', 
    'SELECT refresh_business_dashboard()'
);

-- Full refresh daily at 2 AM
SELECT cron.schedule(
    'refresh-all-views-daily', 
    '0 2 * * *', 
    'SELECT refresh_all_materialized_views()'
);

-- ===================================
-- Performance Monitoring Views
-- ===================================

-- View: Database Performance Metrics
CREATE VIEW v_database_performance AS
SELECT 
    'materialized_views' as component,
    jsonb_build_object(
        'campaign_performance_size', pg_size_pretty(pg_total_relation_size('mv_campaign_performance')),
        'user_leaderboard_size', pg_size_pretty(pg_total_relation_size('mv_user_leaderboard')),
        'business_dashboard_size', pg_size_pretty(pg_total_relation_size('mv_business_dashboard')),
        'last_campaign_refresh', (SELECT last_updated FROM mv_campaign_performance LIMIT 1),
        'last_leaderboard_refresh', (SELECT last_updated FROM mv_user_leaderboard LIMIT 1),
        'last_dashboard_refresh', (SELECT last_updated FROM mv_business_dashboard LIMIT 1)
    ) as metrics
UNION ALL
SELECT 
    'partition_health' as component,
    jsonb_build_object(
        'click_events_partitions', (
            SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_name LIKE 'click_events_%' AND table_schema = 'public'
        ),
        'oldest_partition', (
            SELECT MIN(table_name) FROM information_schema.tables 
            WHERE table_name LIKE 'click_events_%' AND table_schema = 'public'
        ),
        'newest_partition', (
            SELECT MAX(table_name) FROM information_schema.tables 
            WHERE table_name LIKE 'click_events_%' AND table_schema = 'public'
        )
    ) as metrics;

-- Comment: Comprehensive views and materialized views for analytics, performance monitoring, and business intelligence