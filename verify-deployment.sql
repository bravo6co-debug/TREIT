-- ===================================
-- TreitMaster Database Verification
-- Run this after deploying all schema chunks
-- ===================================

-- 1. Check all tables exist
SELECT 'Tables:' as check_type, table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. Check all ENUM types exist  
SELECT 'ENUMs:' as check_type, typname as enum_name FROM pg_type 
WHERE typtype = 'e' 
ORDER BY typname;

-- 3. Check level configuration data
SELECT 'Level Config Count:' as check_type, COUNT(*)::text as value FROM level_config;
SELECT 'Level Range:' as check_type, CONCAT(MIN(level), ' to ', MAX(level)) as value FROM level_config;

-- 4. Sample level configuration data
SELECT 'Sample Levels:' as check_type, '' as value
UNION ALL
SELECT 
  CONCAT('Level ', level) as check_type,
  CONCAT(grade, ' - ', grade_title, ' (', level_title, ')') as value
FROM level_config 
WHERE level IN (1, 10, 20, 30, 40, 50)
ORDER BY level;

-- 5. Check indexes exist
SELECT 'Indexes:' as check_type, indexname FROM pg_indexes 
WHERE schemaname = 'public' AND indexname LIKE 'idx_%'
ORDER BY indexname;

-- 6. Check RLS is enabled
SELECT 'RLS Enabled:' as check_type, tablename FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true
ORDER BY tablename;

-- 7. Check functions exist
SELECT 'Functions:' as check_type, proname as function_name FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname LIKE '%update%'
ORDER BY proname;

-- 8. Test basic operations (optional - uncomment to test)
/*
-- Test inserting and deleting a test record
INSERT INTO level_config (level, grade, required_xp, grade_title, level_title) 
VALUES (99, 'PLATINUM', 999999, 'Test Grade', 'Test Level') 
ON CONFLICT DO NOTHING;

SELECT 'Test Insert:' as check_type, CASE WHEN EXISTS(SELECT 1 FROM level_config WHERE level = 99) 
THEN 'SUCCESS' ELSE 'FAILED' END as value;

DELETE FROM level_config WHERE level = 99;

SELECT 'Test Cleanup:' as check_type, CASE WHEN NOT EXISTS(SELECT 1 FROM level_config WHERE level = 99) 
THEN 'SUCCESS' ELSE 'FAILED' END as value;
*/

-- Final summary
SELECT 
  'DEPLOYMENT STATUS:' as check_type,
  CASE 
    WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') >= 15
    AND (SELECT COUNT(*) FROM level_config) = 50
    AND (SELECT COUNT(*) FROM pg_type WHERE typtype = 'e') >= 15
    THEN '✅ SUCCESS - All components deployed'
    ELSE '❌ INCOMPLETE - Some components missing'
  END as value;