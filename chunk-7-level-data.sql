-- ===================================
-- TreitMaster Schema - Chunk 7
-- Level Configuration Data (Gold, Diamond, Platinum)
-- ===================================

-- Insert level configuration data (Part 2 - Gold)
INSERT INTO level_config (level, grade, required_xp, grade_title, level_title, cpc_bonus_percentage, daily_bonus_base) VALUES
(21, 'GOLD', 13500, '골드', '황금 새벽', 32, 220),
(22, 'GOLD', 14700, '골드', '찬란한 빛', 34, 240),
(23, 'GOLD', 15950, '골드', '골든 이글', 36, 260),
(24, 'GOLD', 17250, '골드', '황금 왕관', 38, 280),
(25, 'GOLD', 18600, '골드', '태양의 힘', 40, 300),
(26, 'GOLD', 20000, '골드', '골드 템플러', 42, 320),
(27, 'GOLD', 21450, '골드', '황금 전설', 44, 340),
(28, 'GOLD', 22950, '골드', '골든 드래곤', 46, 360),
(29, 'GOLD', 24500, '골드', '빛의 제왕', 48, 380),
(30, 'GOLD', 26100, '골드', '골드 마스터', 50, 400)
ON CONFLICT (level) DO NOTHING;

-- Insert level configuration data (Part 3 - Diamond)
INSERT INTO level_config (level, grade, required_xp, grade_title, level_title, cpc_bonus_percentage, daily_bonus_base) VALUES
(31, 'DIAMOND', 27750, '다이아몬드', '다이아 스파크', 52, 450),
(32, 'DIAMOND', 29450, '다이아몬드', '영원한 빛', 54, 500),
(33, 'DIAMOND', 31200, '다이아몬드', '다이아 크리스탈', 56, 550),
(34, 'DIAMOND', 33000, '다이아몬드', '순수한 힘', 58, 600),
(35, 'DIAMOND', 34850, '다이아몬드', '다이아 소울', 60, 650),
(36, 'DIAMOND', 36750, '다이아몬드', '불멸의 빛', 62, 700),
(37, 'DIAMOND', 38700, '다이아몬드', '다이아 로드', 64, 750),
(38, 'DIAMOND', 40700, '다이아몬드', '절대자', 66, 800),
(39, 'DIAMOND', 42750, '다이아몬드', '다이아 킹', 68, 850),
(40, 'DIAMOND', 44850, '다이아몬드', '다이아몬드 마스터', 70, 900)
ON CONFLICT (level) DO NOTHING;

-- Insert level configuration data (Part 4 - Platinum)
INSERT INTO level_config (level, grade, required_xp, grade_title, level_title, cpc_bonus_percentage, daily_bonus_base) VALUES
(41, 'PLATINUM', 47000, '플래티넘', '플래티넘 라이더', 72, 1000),
(42, 'PLATINUM', 49200, '플래티넘', '최고의 영혼', 74, 1100),
(43, 'PLATINUM', 51450, '플래티넘', '플래티넘 엠페러', 76, 1200),
(44, 'PLATINUM', 53750, '플래티넘', '무한의 힘', 78, 1300),
(45, 'PLATINUM', 56100, '플래티넘', '전설의 용사', 80, 1400),
(46, 'PLATINUM', 58500, '플래티넘', '플래티넘 갓', 82, 1500),
(47, 'PLATINUM', 60950, '플래티넘', '우주의 지배자', 84, 1600),
(48, 'PLATINUM', 63450, '플래티넘', '절대 강자', 86, 1700),
(49, 'PLATINUM', 66000, '플래티넘', '플래티넘 로드', 88, 1800),
(50, 'PLATINUM', 68600, '플래티넘', '트레잇 마스터', 90, 2000)
ON CONFLICT (level) DO NOTHING;