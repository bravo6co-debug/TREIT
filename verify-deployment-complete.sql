-- ===================================
-- TreitMaster 데이터베이스 배포 완전 검증
-- ===================================
-- 이 쿼리들을 Supabase SQL Editor에서 실행하여 배포 상태를 확인하세요

-- 📊 1. 테이블 개수 확인 (15개 이상이어야 함)
SELECT 
    '테이블 개수' as 검사항목,
    COUNT(*) as 실제값,
    '15개 이상' as 기대값,
    CASE WHEN COUNT(*) >= 15 THEN '✅ 통과' ELSE '❌ 실패' END as 결과
FROM information_schema.tables 
WHERE table_schema = 'public';

-- 📊 2. ENUM 타입 개수 확인 (정확히 22개여야 함)  
SELECT 
    'ENUM 타입 개수' as 검사항목,
    COUNT(*) as 실제값,
    '정확히 22개' as 기대값,
    CASE WHEN COUNT(*) = 22 THEN '✅ 통과' ELSE '❌ 실패' END as 결과
FROM pg_type 
WHERE typtype = 'e';

-- 📊 3. 레벨 데이터 개수 확인 (정확히 50개여야 함)
SELECT 
    '레벨 데이터 개수' as 검사항목,
    COUNT(*) as 실제값,
    '정확히 50개' as 기대값,
    CASE WHEN COUNT(*) = 50 THEN '✅ 통과' ELSE '❌ 실패' END as 결과
FROM level_config;

-- 📊 4. 그레이드별 레벨 분포 확인 (각각 10개씩)
SELECT 
    '그레이드별 분포' as 검사항목,
    grade as 그레이드,
    COUNT(*) as 실제값,
    '10개씩' as 기대값,
    CASE WHEN COUNT(*) = 10 THEN '✅ 통과' ELSE '❌ 실패' END as 결과
FROM level_config 
GROUP BY grade 
ORDER BY grade;

-- ===================================
-- 상세 정보 (참고용)
-- ===================================

-- 📋 ENUM 타입 목록 (22개 전체)
SELECT '=== ENUM 타입 목록 ===' as 정보;
SELECT 
    ROW_NUMBER() OVER (ORDER BY typname) as 순번,
    typname as ENUM_타입명
FROM pg_type 
WHERE typtype = 'e' 
ORDER BY typname;

-- 📋 테이블 목록 
SELECT '=== 테이블 목록 ===' as 정보;
SELECT 
    ROW_NUMBER() OVER (ORDER BY table_name) as 순번,
    table_name as 테이블명
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 📋 레벨 샘플 데이터 (첫 5개)
SELECT '=== 레벨 샘플 데이터 ===' as 정보;
SELECT 
    level as 레벨,
    grade as 그레이드,
    level_title as 레벨제목,
    required_xp as 필요XP
FROM level_config 
ORDER BY level 
LIMIT 5;

-- 📋 마지막 5개 레벨 (Platinum 레벨들)
SELECT '=== 최고 레벨들 ===' as 정보;
SELECT 
    level as 레벨,
    grade as 그레이드,
    level_title as 레벨제목,
    required_xp as 필요XP
FROM level_config 
ORDER BY level DESC
LIMIT 5;

-- ===================================
-- 최종 결과 요약
-- ===================================
SELECT '=== 최종 배포 상태 요약 ===' as 정보;

WITH deployment_check AS (
    SELECT 
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as table_count,
        (SELECT COUNT(*) FROM pg_type WHERE typtype = 'e') as enum_count,
        (SELECT COUNT(*) FROM level_config) as level_count
)
SELECT 
    CASE 
        WHEN table_count >= 15 AND enum_count = 22 AND level_count = 50 
        THEN '🎉 완벽한 배포 완료! E2E 테스트 진행 가능'
        ELSE '⚠️  배포 미완료. 다시 확인 필요'
    END as 최종상태,
    table_count as 테이블수,
    enum_count as ENUM수,
    level_count as 레벨수
FROM deployment_check;