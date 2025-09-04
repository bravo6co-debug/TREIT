-- ===================================
-- Weekly XP Ranking System Migration
-- ===================================
-- 주간 XP 랭킹 시스템을 위한 테이블 및 함수 생성

-- Enable required extensions if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===================================
-- Tables
-- ===================================

-- 주간 XP 랭킹 테이블
CREATE TABLE IF NOT EXISTS weekly_xp_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  total_xp INTEGER DEFAULT 0 CHECK (total_xp >= 0),
  rank INTEGER,
  previous_rank INTEGER, -- 지난 주 순위 (변동 표시용)
  reward_amount INTEGER DEFAULT 0,
  reward_claimed BOOLEAN DEFAULT FALSE,
  reward_claimed_at TIMESTAMP WITH TIME ZONE,
  is_new_user BOOLEAN DEFAULT FALSE, -- 신규 유저 여부 (부스트 적용)
  boost_multiplier DECIMAL(3,2) DEFAULT 1.0, -- XP 부스트 배율
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 복합 유니크 인덱스: 한 주에 유저당 하나의 기록만
  UNIQUE(user_id, week_start)
);

-- XP 획득 로그 테이블 (랭킹 계산용)
CREATE TABLE IF NOT EXISTS xp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  xp_amount INTEGER NOT NULL CHECK (xp_amount > 0),
  boosted_amount INTEGER NOT NULL DEFAULT 0, -- 부스트 적용 후 XP
  source_type VARCHAR(50) NOT NULL, -- MISSION, DAILY_BONUS, REFERRAL 등
  source_description TEXT,
  week_start DATE NOT NULL, -- 해당 주 시작일
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 인덱스
  INDEX idx_xp_logs_user_week (user_id, week_start),
  INDEX idx_xp_logs_created (created_at)
);

-- 주간 랭킹 스냅샷 (히스토리 보관용)
CREATE TABLE IF NOT EXISTS weekly_ranking_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  final_rank INTEGER NOT NULL,
  total_xp INTEGER NOT NULL,
  reward_amount INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 인덱스
  INDEX idx_ranking_history_user (user_id),
  INDEX idx_ranking_history_week (week_start)
);

-- 마일리지 테이블 (보상 지급용)
CREATE TABLE IF NOT EXISTS user_mileage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance INTEGER DEFAULT 0 CHECK (balance >= 0),
  total_earned INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- 마일리지 거래 내역
CREATE TABLE IF NOT EXISTS mileage_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  transaction_type VARCHAR(50) NOT NULL, -- RANKING_REWARD, PURCHASE, BONUS 등
  description TEXT,
  reference_id UUID, -- 관련 랭킹 ID 등
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 인덱스
  INDEX idx_mileage_tx_user (user_id),
  INDEX idx_mileage_tx_created (created_at DESC)
);

-- ===================================
-- Functions
-- ===================================

-- 현재 주의 시작일과 종료일 계산
CREATE OR REPLACE FUNCTION get_current_week_dates()
RETURNS TABLE(week_start DATE, week_end DATE) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    date_trunc('week', CURRENT_DATE)::DATE AS week_start,
    (date_trunc('week', CURRENT_DATE) + INTERVAL '6 days')::DATE AS week_end;
END;
$$ LANGUAGE plpgsql;

-- XP 로그 추가 및 랭킹 업데이트
CREATE OR REPLACE FUNCTION add_xp_log(
  p_user_id UUID,
  p_xp_amount INTEGER,
  p_source_type VARCHAR,
  p_source_description TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_week_start DATE;
  v_week_end DATE;
  v_boost_multiplier DECIMAL(3,2);
  v_boosted_amount INTEGER;
  v_is_new_user BOOLEAN;
  v_user_created DATE;
BEGIN
  -- 현재 주 날짜 가져오기
  SELECT week_start, week_end INTO v_week_start, v_week_end
  FROM get_current_week_dates();
  
  -- 신규 유저 여부 확인 (가입 4주 이내)
  SELECT created_at::DATE INTO v_user_created
  FROM users WHERE id = p_user_id;
  
  v_is_new_user := (CURRENT_DATE - v_user_created) <= 28;
  
  -- 부스트 배율 계산
  IF v_is_new_user THEN
    IF (CURRENT_DATE - v_user_created) <= 7 THEN
      v_boost_multiplier := 2.0; -- 첫 주: 2배
    ELSE
      v_boost_multiplier := 1.5; -- 2-4주: 1.5배
    END IF;
  ELSE
    v_boost_multiplier := 1.0;
  END IF;
  
  v_boosted_amount := FLOOR(p_xp_amount * v_boost_multiplier);
  
  -- XP 로그 추가
  INSERT INTO xp_logs (
    user_id, xp_amount, boosted_amount, source_type, 
    source_description, week_start
  ) VALUES (
    p_user_id, p_xp_amount, v_boosted_amount, p_source_type,
    p_source_description, v_week_start
  );
  
  -- 주간 랭킹 업데이트 (UPSERT)
  INSERT INTO weekly_xp_rankings (
    user_id, week_start, week_end, total_xp, 
    is_new_user, boost_multiplier
  ) VALUES (
    p_user_id, v_week_start, v_week_end, v_boosted_amount,
    v_is_new_user, v_boost_multiplier
  )
  ON CONFLICT (user_id, week_start) 
  DO UPDATE SET
    total_xp = weekly_xp_rankings.total_xp + v_boosted_amount,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 실시간 랭킹 계산
CREATE OR REPLACE FUNCTION calculate_current_rankings()
RETURNS TABLE(
  user_id UUID,
  username VARCHAR,
  level INTEGER,
  total_xp INTEGER,
  rank INTEGER,
  is_new_user BOOLEAN
) AS $$
DECLARE
  v_week_start DATE;
BEGIN
  SELECT week_start INTO v_week_start FROM get_current_week_dates();
  
  RETURN QUERY
  WITH ranked_users AS (
    SELECT 
      r.user_id,
      u.nickname AS username,
      u.level,
      r.total_xp,
      RANK() OVER (ORDER BY r.total_xp DESC) AS rank,
      r.is_new_user
    FROM weekly_xp_rankings r
    JOIN users u ON r.user_id = u.id
    WHERE r.week_start = v_week_start
  )
  SELECT * FROM ranked_users
  ORDER BY rank
  LIMIT 100;
END;
$$ LANGUAGE plpgsql;

-- 내 랭킹 조회
CREATE OR REPLACE FUNCTION get_my_ranking(p_user_id UUID)
RETURNS TABLE(
  rank INTEGER,
  total_xp INTEGER,
  percentile INTEGER,
  is_new_user BOOLEAN,
  boost_multiplier DECIMAL
) AS $$
DECLARE
  v_week_start DATE;
  v_total_users INTEGER;
BEGIN
  SELECT week_start INTO v_week_start FROM get_current_week_dates();
  
  -- 전체 참여 유저 수
  SELECT COUNT(*) INTO v_total_users
  FROM weekly_xp_rankings
  WHERE week_start = v_week_start;
  
  RETURN QUERY
  WITH user_rank AS (
    SELECT 
      RANK() OVER (ORDER BY total_xp DESC) AS rank,
      r.total_xp,
      r.is_new_user,
      r.boost_multiplier
    FROM weekly_xp_rankings r
    WHERE r.week_start = v_week_start
      AND r.user_id = p_user_id
  )
  SELECT 
    ur.rank,
    ur.total_xp,
    CASE 
      WHEN v_total_users > 0 THEN 
        FLOOR((1 - (ur.rank::DECIMAL / v_total_users)) * 100)::INTEGER
      ELSE 0
    END AS percentile,
    ur.is_new_user,
    ur.boost_multiplier
  FROM user_rank ur;
END;
$$ LANGUAGE plpgsql;

-- 주간 정산 및 보상 지급
CREATE OR REPLACE FUNCTION settle_weekly_rankings()
RETURNS VOID AS $$
DECLARE
  v_prev_week_start DATE;
  v_prev_week_end DATE;
  v_reward_amount INTEGER;
  v_user RECORD;
BEGIN
  -- 지난 주 날짜 계산
  v_prev_week_start := date_trunc('week', CURRENT_DATE - INTERVAL '7 days')::DATE;
  v_prev_week_end := v_prev_week_start + INTERVAL '6 days'::DATE;
  
  -- 순위 업데이트 및 보상 계산
  FOR v_user IN 
    WITH ranked AS (
      SELECT 
        user_id,
        total_xp,
        RANK() OVER (ORDER BY total_xp DESC) AS final_rank
      FROM weekly_xp_rankings
      WHERE week_start = v_prev_week_start
    )
    SELECT * FROM ranked
    WHERE final_rank <= 10
  LOOP
    -- 보상 금액 계산
    v_reward_amount := CASE v_user.final_rank
      WHEN 1 THEN 10000
      WHEN 2 THEN 7000
      WHEN 3 THEN 5000
      WHEN 4 THEN 3000
      WHEN 5 THEN 3000
      ELSE 2000 -- 6-10위
    END;
    
    -- 랭킹 업데이트
    UPDATE weekly_xp_rankings
    SET 
      rank = v_user.final_rank,
      reward_amount = v_reward_amount,
      reward_claimed = TRUE,
      reward_claimed_at = NOW()
    WHERE user_id = v_user.user_id 
      AND week_start = v_prev_week_start;
    
    -- 히스토리 저장
    INSERT INTO weekly_ranking_history (
      user_id, week_start, week_end, 
      final_rank, total_xp, reward_amount
    ) VALUES (
      v_user.user_id, v_prev_week_start, v_prev_week_end,
      v_user.final_rank, v_user.total_xp, v_reward_amount
    );
    
    -- 마일리지 지급
    INSERT INTO user_mileage (user_id, balance, total_earned)
    VALUES (v_user.user_id, v_reward_amount, v_reward_amount)
    ON CONFLICT (user_id) 
    DO UPDATE SET
      balance = user_mileage.balance + v_reward_amount,
      total_earned = user_mileage.total_earned + v_reward_amount,
      updated_at = NOW();
    
    -- 거래 내역 기록
    INSERT INTO mileage_transactions (
      user_id, amount, balance_after, 
      transaction_type, description
    ) VALUES (
      v_user.user_id, 
      v_reward_amount,
      (SELECT balance FROM user_mileage WHERE user_id = v_user.user_id),
      'RANKING_REWARD',
      '주간 랭킹 ' || v_user.final_rank || '위 보상'
    );
  END LOOP;
  
  -- 새로운 주 시작 (자동으로 새 레코드 생성됨)
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- Indexes
-- ===================================

CREATE INDEX idx_weekly_rankings_week ON weekly_xp_rankings(week_start);
CREATE INDEX idx_weekly_rankings_user ON weekly_xp_rankings(user_id);
CREATE INDEX idx_weekly_rankings_rank ON weekly_xp_rankings(rank) WHERE rank IS NOT NULL;

-- ===================================
-- RLS Policies
-- ===================================

ALTER TABLE weekly_xp_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_mileage ENABLE ROW LEVEL SECURITY;
ALTER TABLE mileage_transactions ENABLE ROW LEVEL SECURITY;

-- 유저는 자신의 데이터만 조회 가능
CREATE POLICY "Users can view own ranking data"
  ON weekly_xp_rankings FOR SELECT
  USING (auth.uid() = user_id OR TRUE); -- 랭킹은 모두 조회 가능

CREATE POLICY "Users can view own xp logs"
  ON xp_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own mileage"
  ON user_mileage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own transactions"
  ON mileage_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- ===================================
-- Scheduled Jobs (Cron)
-- ===================================
-- 매주 월요일 00:00에 정산 실행
-- Supabase Dashboard에서 설정 필요:
-- SELECT settle_weekly_rankings();