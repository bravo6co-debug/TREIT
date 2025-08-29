-- Create queue messages table for async processing
CREATE TABLE IF NOT EXISTS queue_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel VARCHAR(100) NOT NULL,
  type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retry')),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  retry_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for efficient queue processing
CREATE INDEX idx_queue_messages_channel ON queue_messages(channel);
CREATE INDEX idx_queue_messages_status ON queue_messages(status);
CREATE INDEX idx_queue_messages_created_at ON queue_messages(created_at);
CREATE INDEX idx_queue_messages_retry_at ON queue_messages(retry_at) WHERE status = 'retry';

-- Create function to notify channel listeners
CREATE OR REPLACE FUNCTION pg_notify(channel text, payload text)
RETURNS void AS $$
BEGIN
  PERFORM pg_notify(channel, payload);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-notify on queue inserts
CREATE OR REPLACE FUNCTION notify_queue_insert()
RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify(
    NEW.channel,
    json_build_object(
      'id', NEW.id,
      'type', NEW.type,
      'payload', NEW.payload
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER queue_messages_notify
  AFTER INSERT ON queue_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_queue_insert();

-- Create function to clean up old completed messages
CREATE OR REPLACE FUNCTION cleanup_old_queue_messages()
RETURNS void AS $$
BEGIN
  DELETE FROM queue_messages
  WHERE status IN ('completed', 'failed')
    AND created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job to clean up old messages (requires pg_cron extension)
-- This would be set up separately in Supabase dashboard or via SQL if pg_cron is available
-- SELECT cron.schedule('cleanup-queue-messages', '0 2 * * *', 'SELECT cleanup_old_queue_messages();');

-- Create view for queue statistics
CREATE OR REPLACE VIEW queue_statistics AS
SELECT 
  channel,
  status,
  COUNT(*) as message_count,
  AVG(retry_count) as avg_retries,
  MAX(retry_count) as max_retries,
  MIN(created_at) as oldest_message,
  MAX(created_at) as newest_message
FROM queue_messages
GROUP BY channel, status;

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE ON queue_messages TO authenticated;
GRANT SELECT ON queue_statistics TO authenticated;

-- Row Level Security
ALTER TABLE queue_messages ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role can manage all queue messages" ON queue_messages
  FOR ALL
  USING (auth.role() = 'service_role');

-- Allow authenticated users to read their own messages
CREATE POLICY "Users can read their own queue messages" ON queue_messages
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    payload->>'user_id' = auth.uid()::text
  );