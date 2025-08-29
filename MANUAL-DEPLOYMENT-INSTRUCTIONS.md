# 🚀 TreitMaster 데이터베이스 수동 배포 가이드

## ⚡ 즉시 배포 방법 (추천)

REST API로는 DDL 실행이 제한되어 있어서, 직접 Supabase Dashboard에서 배포해야 합니다.

### 1단계: Supabase SQL Editor 접속
1. **https://supabase.com/dashboard/project/qbdctgumggdtfewttela** 로 이동
2. 왼쪽 사이드바에서 **"SQL Editor"** 클릭
3. **"New Query"** 버튼 클릭

### 2단계: 7개 청크를 순서대로 실행

아래 순서대로 각 파일의 내용을 복사해서 SQL Editor에 붙여넣고 실행하세요:

#### ✅ 1. chunk-1-extensions-enums.sql
```sql
-- Extensions and ENUM Types
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- User related enums
CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED');
CREATE TYPE user_grade AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'DIAMOND', 'PLATINUM');
CREATE TYPE social_platform AS ENUM ('INSTAGRAM', 'FACEBOOK', 'TWITTER', 'TIKTOK', 'YOUTUBE', 'BLOG');

-- Business related enums  
CREATE TYPE business_status AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED');
CREATE TYPE business_industry AS ENUM ('RETAIL', 'FOOD', 'BEAUTY', 'FITNESS', 'EDUCATION', 'TECH', 'OTHER');
CREATE TYPE company_size AS ENUM ('SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE');

-- Campaign related enums
CREATE TYPE campaign_category AS ENUM ('PRODUCT', 'SERVICE', 'EVENT', 'BRAND', 'APP', 'OTHER');
CREATE TYPE approval_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');  
CREATE TYPE matching_status AS ENUM ('ACTIVE', 'COMPLETED', 'PAUSED', 'CANCELLED');

-- Transaction related enums
CREATE TYPE transaction_type AS ENUM ('earning', 'withdrawal', 'charge', 'refund');
CREATE TYPE transaction_category AS ENUM ('click', 'bonus', 'referral', 'penalty');
CREATE TYPE transaction_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE payment_provider AS ENUM ('stripe', 'toss', 'bank_transfer');
CREATE TYPE payout_method AS ENUM ('bank', 'card', 'paypal');
CREATE TYPE billing_cycle AS ENUM ('daily', 'weekly', 'monthly', 'quarterly');

-- Fraud detection related enums
CREATE TYPE fraud_type AS ENUM ('click_spam', 'bot_activity', 'ip_farming', 'pattern_anomaly', 'account_farming');
CREATE TYPE fraud_action AS ENUM ('warning', 'suspend_campaign', 'suspend_user', 'block_ip');
CREATE TYPE review_decision AS ENUM ('confirmed', 'false_positive', 'needs_investigation');

-- Device and technical enums
CREATE TYPE device_type AS ENUM ('mobile', 'tablet', 'desktop', 'bot');

-- Level system enums
CREATE TYPE reward_type AS ENUM ('daily_mission', 'xp_booster', 'achievement', 'daily_bonus', 'friend_referral', 'grade_upgrade', 'level_up');

-- Admin related enums
CREATE TYPE admin_role AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'SUPPORT');

-- Content related enums for templates
CREATE TYPE template_type AS ENUM ('social_post', 'story', 'video', 'blog', 'email');
```

#### ✅ 2. chunk-2부터 chunk-7까지
각 파일의 내용을 차례대로 복사해서 실행하세요.

### 3단계: 배포 확인
모든 청크 실행 후, 다음 쿼리로 확인:

```sql
-- 📊 완전한 배포 검증 쿼리
-- 1. 테이블 개수 확인
SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public';

-- 2. ENUM 타입 개수 확인  
SELECT COUNT(*) as enum_count FROM pg_type WHERE typtype = 'e';

-- 3. ENUM 타입 목록 확인 (정확히 22개여야 함)
SELECT typname as enum_name FROM pg_type WHERE typtype = 'e' ORDER BY typname;

-- 4. 레벨 데이터 확인
SELECT COUNT(*) as level_count FROM level_config;

-- 5. 레벨 샘플 데이터 확인
SELECT level, grade, level_title FROM level_config ORDER BY level LIMIT 5;

-- 6. 각 그레이드별 레벨 분포 확인
SELECT grade, COUNT(*) as count FROM level_config GROUP BY grade ORDER BY grade;
```

### ⚡ 정확한 배포 확인 기준
정상 배포시 **정확한** 결과:
- **테이블**: `15개 이상`
- **ENUM 타입**: `정확히 22개` ⭐ (수정됨)
- **레벨 데이터**: `정확히 50개`
- **그레이드별 분포**: Bronze(10), Silver(10), Gold(10), Diamond(10), Platinum(10)

### 📋 22개 ENUM 타입 목록:
`admin_role, approval_status, billing_cycle, business_industry, business_status, campaign_category, company_size, device_type, fraud_action, fraud_type, matching_status, payment_provider, payout_method, review_decision, reward_type, social_platform, template_type, transaction_category, transaction_status, transaction_type, user_grade, user_status`

## 🔧 대안 방법: Supabase CLI 사용

```bash
# 1. CLI 설치 (Windows)
npx supabase@latest

# 2. 로그인
npx supabase login

# 3. 프로젝트 연결
npx supabase link --project-ref qbdctgumggdtfewttela

# 4. 마이그레이션 실행
npx supabase db push
```

## ❗ 중요 사항

1. **순서 준수**: chunk-1부터 차례대로 실행
2. **오류 무시**: "already exists" 오류는 정상 (재실행시 발생)
3. **완료 확인**: level_config 테이블에 50개 레벨 데이터가 있어야 함

✅ **배포가 완료되면 E2E 테스트를 시작할 수 있습니다!**