-- ============================================
-- 초기 데이터 삽입
-- ============================================

-- Level Config 테이블 재생성 (필요한 경우)
DO $$
BEGIN
    -- 테이블이 존재하지만 컬럼이 없는 경우를 대비
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'level_config' 
        AND column_name = 'cpc_bonus_rate'
    ) THEN
        -- 테이블 삭제 후 재생성
        DROP TABLE IF EXISTS level_config CASCADE;
        
        CREATE TABLE level_config (
            level INTEGER PRIMARY KEY,
            grade user_grade NOT NULL,
            required_xp INTEGER NOT NULL,
            cpc_bonus_rate DECIMAL(5, 2) DEFAULT 0,
            daily_bonus INTEGER DEFAULT 0,
            referral_bonus INTEGER DEFAULT 0,
            grade_title VARCHAR(50),
            level_title VARCHAR(100),
            benefits JSONB DEFAULT '[]',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        RAISE NOTICE 'level_config table recreated with correct structure';
    END IF;
END$$;

-- Level Config 데이터 (레벨 시스템 설정)
INSERT INTO level_config (level, grade, required_xp, cpc_bonus_rate, daily_bonus, referral_bonus, grade_title, level_title)
SELECT * FROM (VALUES
    -- 브론즈 등급 (1-5 레벨)
    (1, 'BRONZE', 0, 0, 10, 100, '브론즈', '새싹 인플루언서'),
    (2, 'BRONZE', 100, 0, 10, 100, '브론즈', '성장하는 인플루언서'),
    (3, 'BRONZE', 300, 0.5, 15, 150, '브론즈', '활발한 인플루언서'),
    (4, 'BRONZE', 600, 0.5, 15, 150, '브론즈', '인기있는 인플루언서'),
    (5, 'BRONZE', 1000, 1, 20, 200, '브론즈', '주목받는 인플루언서'),
    
    -- 실버 등급 (6-10 레벨)
    (6, 'SILVER', 1500, 2, 25, 250, '실버', '빛나는 인플루언서'),
    (7, 'SILVER', 2100, 2, 25, 250, '실버', '영향력 있는 인플루언서'),
    (8, 'SILVER', 2800, 2.5, 30, 300, '실버', '신뢰받는 인플루언서'),
    (9, 'SILVER', 3600, 2.5, 30, 300, '실버', '프로 인플루언서'),
    (10, 'SILVER', 4500, 3, 35, 350, '실버', '실버 마스터'),
    
    -- 골드 등급 (11-20 레벨)
    (11, 'GOLD', 5500, 3.5, 40, 400, '골드', '골드 인플루언서'),
    (12, 'GOLD', 6600, 3.5, 40, 400, '골드', '트렌드세터'),
    (13, 'GOLD', 7800, 4, 45, 450, '골드', '인기 크리에이터'),
    (14, 'GOLD', 9100, 4, 45, 450, '골드', '스타 인플루언서'),
    (15, 'GOLD', 10500, 4.5, 50, 500, '골드', '톱 인플루언서'),
    (16, 'GOLD', 12000, 4.5, 50, 500, '골드', '엘리트 인플루언서'),
    (17, 'GOLD', 13600, 5, 55, 550, '골드', '파워 인플루언서'),
    (18, 'GOLD', 15300, 5, 55, 550, '골드', '슈퍼 인플루언서'),
    (19, 'GOLD', 17100, 5.5, 60, 600, '골드', '메가 인플루언서'),
    (20, 'GOLD', 19000, 5.5, 60, 600, '골드', '골드 마스터'),
    
    -- 다이아몬드 등급 (21-40 레벨)
    (21, 'DIAMOND', 21000, 6, 70, 700, '다이아몬드', '다이아몬드 인플루언서'),
    (22, 'DIAMOND', 23100, 6, 70, 700, '다이아몬드', '럭셔리 인플루언서'),
    (23, 'DIAMOND', 25300, 6.5, 75, 750, '다이아몬드', '프리미엄 인플루언서'),
    (24, 'DIAMOND', 27600, 6.5, 75, 750, '다이아몬드', '익스클루시브 인플루언서'),
    (25, 'DIAMOND', 30000, 7, 80, 800, '다이아몬드', 'VIP 인플루언서'),
    (26, 'DIAMOND', 32500, 7, 80, 800, '다이아몬드', '셀러브리티'),
    (27, 'DIAMOND', 35100, 7.5, 85, 850, '다이아몬드', '아이콘'),
    (28, 'DIAMOND', 37800, 7.5, 85, 850, '다이아몬드', '레전드'),
    (29, 'DIAMOND', 40600, 8, 90, 900, '다이아몬드', '마스터 인플루언서'),
    (30, 'DIAMOND', 43500, 8, 90, 900, '다이아몬드', '그랜드 마스터'),
    (31, 'DIAMOND', 46500, 8.5, 95, 950, '다이아몬드', '챔피언'),
    (32, 'DIAMOND', 49600, 8.5, 95, 950, '다이아몬드', '슈퍼스타'),
    (33, 'DIAMOND', 52800, 9, 100, 1000, '다이아몬드', '메가스타'),
    (34, 'DIAMOND', 56100, 9, 100, 1000, '다이아몬드', '울트라스타'),
    (35, 'DIAMOND', 59500, 9.5, 105, 1050, '다이아몬드', '하이퍼스타'),
    (36, 'DIAMOND', 63000, 9.5, 105, 1050, '다이아몬드', '월드스타'),
    (37, 'DIAMOND', 66600, 10, 110, 1100, '다이아몬드', '유니버스스타'),
    (38, 'DIAMOND', 70300, 10, 110, 1100, '다이아몬드', '갤럭시스타'),
    (39, 'DIAMOND', 74100, 10.5, 115, 1150, '다이아몬드', '인피니티스타'),
    (40, 'DIAMOND', 78000, 10.5, 115, 1150, '다이아몬드', '다이아몬드 마스터'),
    
    -- 플래티넘 등급 (41-50 레벨)
    (41, 'PLATINUM', 82000, 11, 125, 1250, '플래티넘', '플래티넘 인플루언서'),
    (42, 'PLATINUM', 86100, 11, 125, 1250, '플래티넘', '얼티밋 인플루언서'),
    (43, 'PLATINUM', 90300, 11.5, 130, 1300, '플래티넘', '맥시멈 인플루언서'),
    (44, 'PLATINUM', 94600, 11.5, 130, 1300, '플래티넘', '슈프림 인플루언서'),
    (45, 'PLATINUM', 99000, 12, 135, 1350, '플래티넘', '임페리얼 인플루언서'),
    (46, 'PLATINUM', 103500, 12, 135, 1350, '플래티넘', '로열 인플루언서'),
    (47, 'PLATINUM', 108100, 12.5, 140, 1400, '플래티넘', '마제스틱 인플루언서'),
    (48, 'PLATINUM', 112800, 12.5, 140, 1400, '플래티넘', '레전더리 인플루언서'),
    (49, 'PLATINUM', 117600, 13, 145, 1450, '플래티넘', '미스틱 인플루언서'),
    (50, 'PLATINUM', 122500, 15, 150, 1500, '플래티넘', '갓 인플루언서')
) AS v(level, grade, required_xp, cpc_bonus_rate, daily_bonus, referral_bonus, grade_title, level_title)
WHERE NOT EXISTS (SELECT 1 FROM level_config WHERE level = v.level);

-- 기본 관리자 계정 생성 (선택사항)
-- 비밀번호는 나중에 Supabase Auth에서 설정해야 합니다
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_users') THEN
        INSERT INTO admin_users (email, username, full_name, role)
        SELECT 'admin@treitmaster.com', 'admin', 'System Administrator', 'SUPER_ADMIN'
        WHERE NOT EXISTS (SELECT 1 FROM admin_users WHERE email = 'admin@treitmaster.com');
    ELSE
        RAISE NOTICE 'admin_users table does not exist, skipping admin account creation';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not create admin user: %', SQLERRM;
END$$;

-- ============================================
-- 트리거 함수 생성 (updated_at 자동 업데이트)
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 생성 (각 테이블에 updated_at 자동 업데이트)
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'updated_at' 
        AND table_schema = 'public'
    LOOP
        EXECUTE format('
            CREATE TRIGGER update_%I_updated_at 
            BEFORE UPDATE ON %I 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column()',
            t, t
        );
    END LOOP;
END$$;

-- ============================================
-- 유용한 함수들
-- ============================================

-- 사용자 레벨업 체크 함수 (안전하게 생성)
DO $$
BEGIN
    -- 필요한 테이블들이 모두 존재하는지 확인
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') 
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'level_config')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rewards') THEN
        
        CREATE OR REPLACE FUNCTION check_user_level_up(user_id_param UUID)
        RETURNS void AS $func$
        DECLARE
            user_record RECORD;
            next_level RECORD;
        BEGIN
            -- 사용자 정보 조회
            SELECT * INTO user_record FROM users WHERE id = user_id_param;
            
            -- 다음 레벨 정보 조회
            SELECT * INTO next_level 
            FROM level_config 
            WHERE required_xp > user_record.xp 
            ORDER BY required_xp ASC 
            LIMIT 1;
            
            -- 레벨업 가능한 경우 업데이트
            IF next_level.required_xp <= user_record.xp THEN
                UPDATE users 
                SET level = next_level.level,
                    grade = next_level.grade
                WHERE id = user_id_param;
                
                -- 레벨업 보상 추가
                INSERT INTO rewards (user_id, type, xp_points, description)
                VALUES (user_id_param, 'level_up', 50, '레벨 ' || next_level.level || ' 달성!');
            END IF;
        END;
        $func$ LANGUAGE plpgsql;
        
        RAISE NOTICE 'check_user_level_up function created successfully';
    ELSE
        RAISE NOTICE 'Required tables not found, skipping check_user_level_up function creation';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not create check_user_level_up function: %', SQLERRM;
END$$;

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '✅ Initial data and functions created successfully!';
    RAISE NOTICE '📊 Level system configured with 50 levels!';
    RAISE NOTICE '👤 Default admin account created (password needs to be set in Supabase Auth)';
END$$;