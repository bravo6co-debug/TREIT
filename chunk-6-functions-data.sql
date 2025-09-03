-- ===================================
-- TreitMaster Schema - Chunk 6
-- Functions, Triggers, and Level Data
-- ===================================

-- ===================================
-- Essential Functions
-- ===================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_businesses_updated_at ON businesses;
DROP TRIGGER IF EXISTS update_campaigns_updated_at ON campaigns;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ===================================
-- Level Configuration Data
-- ===================================

-- Insert level configuration data (Part 1 - Bronze & Silver)
INSERT INTO level_config (level, grade, required_xp, grade_title, level_title, cpc_bonus_percentage, daily_bonus_base) VALUES
(1, 'BRONZE', 0, '브론즈', '새싹', 0, 50),
(2, 'BRONZE', 200, '브론즈', '새내기', 1, 55),
(3, 'BRONZE', 450, '브론즈', '탐험가', 2, 60),
(4, 'BRONZE', 750, '브론즈', '도전자', 3, 65),
(5, 'BRONZE', 1100, '브론즈', '개척자', 4, 70),
(6, 'BRONZE', 1500, '브론즈', '모험가', 5, 75),
(7, 'BRONZE', 1950, '브론즈', '용감한자', 6, 80),
(8, 'BRONZE', 2450, '브론즈', '정복자', 7, 85),
(9, 'BRONZE', 3000, '브론즈', '승리자', 8, 90),
(10, 'BRONZE', 3600, '브론즈', '브론즈 마스터', 10, 100),

(11, 'SILVER', 4250, '실버', '실버 루키', 12, 110),
(12, 'SILVER', 4950, '실버', '빛나는 별', 14, 120),
(13, 'SILVER', 5700, '실버', '월광 전사', 16, 130),
(14, 'SILVER', 6500, '실버', '은빛 바람', 18, 140),
(15, 'SILVER', 7350, '실버', '수호자', 20, 150),
(16, 'SILVER', 8250, '실버', '실버 나이트', 22, 160),
(17, 'SILVER', 9200, '실버', '영광의 방패', 24, 170),
(18, 'SILVER', 10200, '실버', '실버 에이스', 26, 180),
(19, 'SILVER', 11250, '실버', '정의의 검', 28, 190),
(20, 'SILVER', 12350, '실버', '실버 마스터', 30, 200)
ON CONFLICT (level) DO NOTHING;