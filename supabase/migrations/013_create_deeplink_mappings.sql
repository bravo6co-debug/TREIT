-- Create deeplink_mappings table for redirect handler
CREATE TABLE IF NOT EXISTS deeplink_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_code TEXT UNIQUE NOT NULL,
    original_url TEXT NOT NULL,
    user_campaign_id UUID NOT NULL REFERENCES user_campaigns(id) ON DELETE CASCADE,
    
    -- Metadata
    click_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    
    -- Indexes
    CONSTRAINT fk_deeplink_user_campaign 
        FOREIGN KEY (user_campaign_id) REFERENCES user_campaigns(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_deeplink_mappings_tracking_code ON deeplink_mappings(tracking_code);
CREATE INDEX idx_deeplink_mappings_user_campaign ON deeplink_mappings(user_campaign_id);
CREATE INDEX idx_deeplink_mappings_expires ON deeplink_mappings(expires_at) 
    WHERE expires_at IS NOT NULL;

-- RLS Policies
ALTER TABLE deeplink_mappings ENABLE ROW LEVEL SECURITY;

-- Allow public read access for redirect functionality
CREATE POLICY "Public can read deeplink mappings" ON deeplink_mappings
    FOR SELECT USING (true);

-- Only users can manage their own deeplink mappings
CREATE POLICY "Users can manage own deeplink mappings" ON deeplink_mappings
    FOR ALL USING (
        user_campaign_id IN (
            SELECT id FROM user_campaigns 
            WHERE user_id IN (
                SELECT id FROM users WHERE auth_uid = auth.uid()
            )
        )
    );

-- Function to clean up expired deeplinks
CREATE OR REPLACE FUNCTION cleanup_expired_deeplinks()
RETURNS void AS $$
BEGIN
    DELETE FROM deeplink_mappings 
    WHERE expires_at IS NOT NULL 
      AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup every day at 2 AM
SELECT cron.schedule('cleanup-expired-deeplinks', '0 2 * * *', 'SELECT cleanup_expired_deeplinks()');

-- Trigger to update click count and last accessed
CREATE OR REPLACE FUNCTION update_deeplink_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE deeplink_mappings 
    SET 
        click_count = click_count + 1,
        last_accessed_at = NOW()
    WHERE tracking_code = (
        SELECT tracking_code FROM user_campaigns WHERE id = NEW.user_campaign_id
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_deeplink_stats
    AFTER INSERT ON click_events
    FOR EACH ROW
    EXECUTE FUNCTION update_deeplink_stats();