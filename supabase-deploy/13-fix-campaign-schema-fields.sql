-- ============================================
-- Fix Campaign Schema Field Mismatches
-- ============================================

-- Add missing target_clicks column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campaigns' 
        AND column_name = 'target_clicks'
    ) THEN
        ALTER TABLE campaigns 
        ADD COLUMN target_clicks INTEGER DEFAULT NULL;
        
        RAISE NOTICE '✅ Added target_clicks column to campaigns table';
    ELSE
        RAISE NOTICE '⚠️  target_clicks column already exists in campaigns table';
    END IF;
END$$;

-- Update existing campaigns with default target_clicks based on budget and CPC
-- This gives a reasonable target for existing campaigns
UPDATE campaigns 
SET target_clicks = CASE 
    WHEN total_budget IS NOT NULL AND cpc_rate > 0 
    THEN FLOOR(total_budget / cpc_rate)::INTEGER
    ELSE 1000 -- Default target
END
WHERE target_clicks IS NULL;

-- Add index for target_clicks performance queries
CREATE INDEX IF NOT EXISTS idx_campaigns_target_clicks 
    ON campaigns(target_clicks) 
    WHERE target_clicks IS NOT NULL;

-- Create function to calculate campaign completion percentage
CREATE OR REPLACE FUNCTION get_campaign_completion_percentage(p_campaign_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    v_current_clicks INTEGER;
    v_target_clicks INTEGER;
    v_completion_percentage DECIMAL;
BEGIN
    SELECT total_clicks, target_clicks 
    INTO v_current_clicks, v_target_clicks
    FROM campaigns 
    WHERE id = p_campaign_id;
    
    IF v_target_clicks IS NULL OR v_target_clicks = 0 THEN
        RETURN 0;
    END IF;
    
    v_completion_percentage := (v_current_clicks::DECIMAL / v_target_clicks * 100);
    
    -- Cap at 100%
    IF v_completion_percentage > 100 THEN
        v_completion_percentage := 100;
    END IF;
    
    RETURN v_completion_percentage;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_campaign_completion_percentage TO authenticated;

-- Completion message
DO $$
BEGIN
    RAISE NOTICE '✅ Campaign schema field mismatches fixed successfully!';
    RAISE NOTICE '   - Added target_clicks column';
    RAISE NOTICE '   - Updated existing campaigns with calculated targets';
    RAISE NOTICE '   - Added completion percentage function';
END$$;