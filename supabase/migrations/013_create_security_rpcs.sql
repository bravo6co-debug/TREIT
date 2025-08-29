-- Security-focused RPC functions to prevent SQL injection
-- These functions replace direct raw SQL operations with parameterized queries

-- Function to safely update user earnings
CREATE OR REPLACE FUNCTION update_user_earnings(
  p_user_id UUID,
  p_earnings_amount NUMERIC,
  p_xp_amount INTEGER DEFAULT 0
) RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Validate input parameters
  IF p_user_id IS NULL OR p_earnings_amount IS NULL THEN
    RETURN FALSE;
  END IF;
  
  IF p_earnings_amount < 0 OR p_xp_amount < 0 THEN
    RETURN FALSE;
  END IF;
  
  -- Update user earnings and XP safely
  UPDATE users 
  SET 
    total_earnings = total_earnings + p_earnings_amount,
    xp = CASE WHEN p_xp_amount > 0 THEN xp + p_xp_amount ELSE xp END,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN FOUND;
END;
$$;

-- Function to safely update campaign statistics
CREATE OR REPLACE FUNCTION update_campaign_stats(
  p_campaign_id UUID,
  p_spent_amount NUMERIC,
  p_click_count INTEGER DEFAULT 1
) RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Validate input parameters
  IF p_campaign_id IS NULL OR p_spent_amount IS NULL THEN
    RETURN FALSE;
  END IF;
  
  IF p_spent_amount < 0 OR p_click_count < 0 THEN
    RETURN FALSE;
  END IF;
  
  -- Update campaign stats safely
  UPDATE campaigns 
  SET 
    total_spent = total_spent + p_spent_amount,
    total_clicks = total_clicks + p_click_count,
    updated_at = NOW()
  WHERE id = p_campaign_id;
  
  RETURN FOUND;
END;
$$;

-- Function to safely increment campaign participant count
CREATE OR REPLACE FUNCTION increment_campaign_participants(
  p_campaign_id UUID
) RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Validate input parameter
  IF p_campaign_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Increment participant count safely
  UPDATE campaigns 
  SET 
    participant_count = participant_count + 1,
    updated_at = NOW()
  WHERE id = p_campaign_id;
  
  RETURN FOUND;
END;
$$;

-- Function to safely update referral rewards
CREATE OR REPLACE FUNCTION update_referral_rewards(
  p_referrer_id UUID,
  p_new_user_id UUID,
  p_referrer_earnings NUMERIC,
  p_referrer_xp INTEGER,
  p_new_user_earnings NUMERIC,
  p_new_user_xp INTEGER
) RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Validate input parameters
  IF p_referrer_id IS NULL OR p_new_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  IF p_referrer_earnings < 0 OR p_referrer_xp < 0 OR 
     p_new_user_earnings < 0 OR p_new_user_xp < 0 THEN
    RETURN FALSE;
  END IF;
  
  -- Update referrer rewards
  UPDATE users 
  SET 
    total_earnings = total_earnings + p_referrer_earnings,
    xp = xp + p_referrer_xp,
    updated_at = NOW()
  WHERE id = p_referrer_id;
  
  -- Update new user rewards
  UPDATE users 
  SET 
    total_earnings = total_earnings + p_new_user_earnings,
    xp = xp + p_new_user_xp,
    updated_at = NOW()
  WHERE id = p_new_user_id;
  
  RETURN FOUND;
END;
$$;

-- Function to safely update daily bonus
CREATE OR REPLACE FUNCTION update_daily_bonus_rewards(
  p_user_id UUID,
  p_earnings_amount NUMERIC,
  p_xp_amount INTEGER
) RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Validate input parameters
  IF p_user_id IS NULL OR p_earnings_amount IS NULL OR p_xp_amount IS NULL THEN
    RETURN FALSE;
  END IF;
  
  IF p_earnings_amount < 0 OR p_xp_amount < 0 THEN
    RETURN FALSE;
  END IF;
  
  -- Update user rewards safely
  UPDATE users 
  SET 
    total_earnings = total_earnings + p_earnings_amount,
    xp = xp + p_xp_amount,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN FOUND;
END;
$$;

-- Function to safely validate click timing with improved security
CREATE OR REPLACE FUNCTION validate_click_timing(
  p_user_id UUID,
  p_campaign_id UUID,
  p_min_interval_seconds INTEGER DEFAULT 60
) RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  last_click_time TIMESTAMP;
BEGIN
  -- Validate input parameters
  IF p_user_id IS NULL OR p_campaign_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  IF p_min_interval_seconds <= 0 THEN
    RETURN FALSE;
  END IF;
  
  -- Get the last click time for this user and campaign
  SELECT clicked_at INTO last_click_time
  FROM click_events ce
  JOIN user_campaigns uc ON ce.user_campaign_id = uc.id
  WHERE uc.user_id = p_user_id AND uc.campaign_id = p_campaign_id
  ORDER BY clicked_at DESC
  LIMIT 1;
  
  -- If no previous click, allow
  IF last_click_time IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check if enough time has passed
  RETURN (EXTRACT(EPOCH FROM (NOW() - last_click_time)) >= p_min_interval_seconds);
END;
$$;

-- Function to safely get campaign budget information
CREATE OR REPLACE FUNCTION get_campaign_budget_status(
  p_campaign_id UUID,
  p_cpc_rate NUMERIC
) RETURNS TABLE (
  within_daily_budget BOOLEAN,
  within_total_budget BOOLEAN,
  remaining_daily_budget NUMERIC,
  remaining_total_budget NUMERIC
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  daily_budget NUMERIC;
  total_budget NUMERIC;
  today_spent NUMERIC;
  total_spent NUMERIC;
BEGIN
  -- Validate input parameters
  IF p_campaign_id IS NULL OR p_cpc_rate IS NULL OR p_cpc_rate < 0 THEN
    RETURN;
  END IF;
  
  -- Get campaign budget information
  SELECT c.daily_budget, c.total_budget, c.total_spent
  INTO daily_budget, total_budget, total_spent
  FROM campaigns c
  WHERE c.id = p_campaign_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Calculate today's spending
  SELECT COALESCE(SUM(commission_amount), 0) INTO today_spent
  FROM click_events ce
  JOIN user_campaigns uc ON ce.user_campaign_id = uc.id
  WHERE uc.campaign_id = p_campaign_id
    AND ce.is_valid = TRUE
    AND ce.clicked_at >= CURRENT_DATE;
  
  -- Return budget status
  RETURN QUERY SELECT
    (today_spent + p_cpc_rate) <= daily_budget AS within_daily_budget,
    (total_spent + p_cpc_rate) <= total_budget AS within_total_budget,
    GREATEST(0, daily_budget - today_spent) AS remaining_daily_budget,
    GREATEST(0, total_budget - total_spent) AS remaining_total_budget;
END;
$$;

-- Grant necessary permissions to authenticated users
GRANT EXECUTE ON FUNCTION update_user_earnings TO authenticated;
GRANT EXECUTE ON FUNCTION update_campaign_stats TO authenticated;
GRANT EXECUTE ON FUNCTION increment_campaign_participants TO authenticated;
GRANT EXECUTE ON FUNCTION update_referral_rewards TO authenticated;
GRANT EXECUTE ON FUNCTION update_daily_bonus_rewards TO authenticated;
GRANT EXECUTE ON FUNCTION validate_click_timing TO authenticated;
GRANT EXECUTE ON FUNCTION get_campaign_budget_status TO authenticated;

-- Create audit log table for security monitoring
CREATE TABLE IF NOT EXISTS security_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(100),
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
  p_user_id UUID,
  p_action VARCHAR(100),
  p_table_name VARCHAR(100) DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO security_audit_log (
    user_id, action, table_name, old_values, new_values, ip_address, user_agent
  ) VALUES (
    p_user_id, p_action, p_table_name, p_old_values, p_new_values, p_ip_address, p_user_agent
  );
END;
$$;

GRANT EXECUTE ON FUNCTION log_security_event TO authenticated;

-- Create RLS policies for the audit log
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view all audit logs
CREATE POLICY audit_log_admin_policy ON security_audit_log
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- Users can only view their own audit logs
CREATE POLICY audit_log_user_policy ON security_audit_log
FOR SELECT USING (user_id = auth.uid());