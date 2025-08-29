-- TreitMaster 초기 데이터 시드 파일
-- 개발 환경에서 테스트용 데이터를 삽입합니다

-- 유저 레벨 시드 데이터
INSERT INTO user_levels (level_number, level_name, required_points, tier_multiplier, benefits) VALUES
(1, '새싹 트레이터', 0, 1.0, '기본 리워드'),
(2, '성장하는 트레이터', 1000, 1.2, '리워드 20% 추가'),
(3, '열정적인 트레이터', 3000, 1.5, '리워드 50% 추가'),
(4, '전문 트레이터', 7000, 1.8, '리워드 80% 추가, VIP 지원'),
(5, '엘리트 트레이터', 15000, 2.2, '리워드 120% 추가, 프리미엄 프로젝트 접근'),
(6, '마스터 트레이터', 30000, 2.8, '리워드 180% 추가, 개인 매니저'),
(7, '레전드 트레이터', 60000, 3.5, '리워드 250% 추가, 독점 프로젝트 접근'),
(8, '그랜드마스터', 100000, 4.5, '리워드 350% 추가, 전용 고객지원'),
(9, '얼티밋 트레이터', 200000, 6.0, '리워드 500% 추가, 모든 혜택'),
(10, '트레이터 킹', 500000, 10.0, '최고 등급 혜택, 특별 인센티브');

-- 카테고리 시드 데이터
INSERT INTO categories (name, description, icon_url, color, is_active) VALUES
('소셜미디어', '인스타그램, 틱톡, 유튜브 등 SNS 관련 업무', 'social-media.svg', '#FF4500', true),
('앱 테스트', '모바일 앱 다운로드 및 테스트', 'app-test.svg', '#32CD32', true),
('설문조사', '다양한 주제의 설문조사 참여', 'survey.svg', '#4169E1', true),
('리뷰작성', '제품 및 서비스 리뷰 작성', 'review.svg', '#FF69B4', true),
('게임미션', '게임 내 특정 미션 완료', 'game.svg', '#8A2BE2', true),
('쇼핑미션', '온라인 쇼핑 및 구매 인증', 'shopping.svg', '#FF6347', true),
('교육컨텐츠', '강의 수강 및 학습 인증', 'education.svg', '#20B2AA', true),
('건강관리', '운동 및 건강관리 앱 사용', 'health.svg', '#228B22', true);

-- 테스트용 관리자 계정 (실제 운영에서는 제거 필요)
INSERT INTO user_profiles (id, email, full_name, role, total_points, current_level, is_active, created_at) VALUES
('00000000-0000-0000-0000-000000000001', 'admin@treitmaster.com', '시스템 관리자', 'admin', 1000000, 10, true, NOW()),
('00000000-0000-0000-0000-000000000002', 'support@treitmaster.com', '고객지원팀', 'support', 50000, 5, true, NOW());

-- 테스트용 광고주 계정
INSERT INTO advertiser_profiles (id, company_name, contact_email, contact_person, business_license, status, balance, created_at) VALUES
('00000000-0000-0000-0000-000000000003', '테스트 광고주 A', 'advertiser1@test.com', '김광고', 'TEST-12345', 'active', 1000000, NOW()),
('00000000-0000-0000-0000-000000000004', '테스트 광고주 B', 'advertiser2@test.com', '이마케팅', 'TEST-67890', 'active', 500000, NOW());

-- 샘플 캠페인 데이터
INSERT INTO campaigns (id, advertiser_id, title, description, category_id, reward_type, reward_amount, target_audience, requirements, total_budget, daily_budget, max_participants, start_date, end_date, status, created_at) VALUES
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', '인스타그램 팔로우 캠페인', '새로운 패션 브랜드를 팔로우하고 리워드를 받으세요!', 1, 'points', 500, '20-40대 여성', '인스타그램 계정 필요, 팔로우 후 스크린샷 인증', 500000, 50000, 1000, NOW(), NOW() + INTERVAL '30 days', 'active', NOW()),
('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000004', '앱 다운로드 테스트', '신규 배달앱을 다운로드하고 첫 주문을 완료하세요', 2, 'cash', 3000, '전체', '스마트폰 필요, 첫 주문 완료 인증', 1000000, 100000, 500, NOW(), NOW() + INTERVAL '15 days', 'active', NOW());

-- 샘플 미션 데이터
INSERT INTO missions (campaign_id, title, description, reward_points, required_actions, verification_method, estimated_duration, difficulty_level) VALUES
('10000000-0000-0000-0000-000000000001', '인스타그램 팔로우하기', '@fashionbrand_official 계정을 팔로우하세요', 500, 'Follow Instagram account', 'screenshot', 5, 'easy'),
('10000000-0000-0000-0000-000000000002', '앱 다운로드 및 주문', '배달앱을 다운로드하고 첫 주문을 완료하세요', 3000, 'Download app and complete first order', 'order_confirmation', 30, 'medium');

-- 공지사항 샘플 데이터
INSERT INTO announcements (title, content, type, is_important, target_audience, is_active, created_at) VALUES
('TreitMaster 서비스 오픈!', '안녕하세요! TreitMaster 서비스가 정식 오픈했습니다. 다양한 미션에 참여하고 리워드를 받아보세요!', 'general', true, 'all', true, NOW()),
('첫 주 특별 이벤트', '서비스 오픈 기념으로 모든 미션의 리워드가 2배! 이 기회를 놓치지 마세요.', 'event', true, 'users', true, NOW()),
('광고주 등록 안내', '광고주 분들을 위한 캠페인 등록 가이드를 확인해보세요.', 'guide', false, 'advertisers', true, NOW());

-- 시스템 설정 기본값
INSERT INTO system_settings (key, value, description, category) VALUES
('min_withdrawal_amount', '10000', '최소 출금 금액 (원)', 'payment'),
('max_withdrawal_amount', '1000000', '최대 출금 금액 (원)', 'payment'),
('withdrawal_fee_rate', '0.03', '출금 수수료율', 'payment'),
('daily_mission_limit', '20', '일일 미션 참여 제한', 'mission'),
('referral_bonus', '1000', '추천인 보너스 포인트', 'referral'),
('point_to_won_rate', '1', '포인트-원화 환율 (1포인트 = N원)', 'payment'),
('maintenance_mode', 'false', '점검 모드 활성화', 'system'),
('user_registration_enabled', 'true', '신규 사용자 가입 허용', 'system');

-- RLS (Row Level Security) 정책 예제를 위한 테스트 데이터
-- 실제 사용자 데이터는 앱에서 회원가입을 통해 생성됩니다

-- Storage 버킷 초기 설정 (실제로는 마이그레이션에서 처리)
-- 이미지 업로드용 버킷들이 필요할 때 사용

COMMENT ON TABLE user_levels IS '사용자 레벨 시스템 - 포인트에 따른 등급과 혜택';
COMMENT ON TABLE categories IS '미션 카테고리 - 다양한 업무 유형 분류';
COMMENT ON TABLE campaigns IS '광고 캠페인 - 광고주가 생성하는 마케팅 캠페인';
COMMENT ON TABLE missions IS '미션 - 사용자가 참여할 수 있는 개별 작업';
COMMENT ON TABLE announcements IS '공지사항 - 시스템 공지 및 이벤트 정보';
COMMENT ON TABLE system_settings IS '시스템 설정 - 서비스 운영을 위한 각종 설정값';