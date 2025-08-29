# TreitMaster 보안 가이드라인

## 목차
1. [환경변수 보안](#환경변수-보안)
2. [Supabase 보안 설정](#supabase-보안-설정)
3. [배포 시 보안 체크리스트](#배포-시-보안-체크리스트)
4. [개발 환경 보안](#개발-환경-보안)
5. [모니터링 및 감사](#모니터링-및-감사)
6. [사고 대응 절차](#사고-대응-절차)

## 환경변수 보안

### 클라이언트 vs 서버 환경변수 분리

#### ✅ 클라이언트 환경변수 (VITE_ 접두사)
클라이언트에서 접근 가능한 공개 정보만 포함:

```bash
# 공개 Supabase 설정
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 애플리케이션 URL들
VITE_USER_APP_URL=https://app.tre-it.com
VITE_ADVERTISER_APP_URL=https://advertiser.tre-it.com
VITE_ADMIN_APP_URL=https://admin.tre-it.com

# 기능 플래그
VITE_FEATURE_REFERRAL_SYSTEM=true
VITE_FEATURE_LEVEL_SYSTEM=true
```

#### ❌ 서버 전용 환경변수 (VITE_ 접두사 없음)
클라이언트에서 절대 노출되지 않는 민감한 정보:

```bash
# 민감한 Supabase 키
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_JWT_SECRET=your-jwt-secret

# 결제 시스템 키들
PAYMENT_GATEWAY_KEY=pk_live_...
PAYMENT_GATEWAY_SECRET=sk_live_...
PAYMENT_WEBHOOK_SECRET=whsec_...

# 외부 API 키들
ANALYTICS_API_KEY=your-private-api-key
SMTP_PASS=your-email-password
```

### 환경변수 검증

모든 환경변수는 시작 시 자동으로 검증됩니다:

```typescript
import { EnvValidator } from './shared/env-validation'

// 클라이언트 앱에서
const clientEnv = EnvValidator.validateClientEnv()

// 서버/Edge Functions에서  
const serverEnv = EnvValidator.validateServerEnv()
```

### 환경별 설정

#### 개발 환경 (.env.development)
```bash
VITE_SUPABASE_URL=http://localhost:54321
VITE_DEBUG_MODE=true
VITE_ENABLE_LOGGING=true
```

#### 프로덕션 환경 (.env.production)
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_DEBUG_MODE=false
VITE_ENABLE_LOGGING=false
```

## Supabase 보안 설정

### Row Level Security (RLS) 정책

모든 테이블에서 RLS가 활성화되어 있는지 확인:

```sql
-- 예: 사용자 프로필 테이블
CREATE POLICY "Users can view own profile"
ON user_profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON user_profiles FOR UPDATE
USING (auth.uid() = id);
```

### Service Role Key 보호

#### ✅ 올바른 사용법
- **Edge Functions에서만** Service Role Key 사용
- 클라이언트에서는 **절대 사용 금지**
- 환경변수를 통해서만 전달

#### ❌ 잘못된 사용법
```typescript
// 절대 하지 마세요!
const client = createClient(url, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...')
```

#### ✅ 올바른 사용법
```typescript
// Edge Functions에서만
const client = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
)
```

### 클라이언트 보안 설정

```typescript
import { SecureSupabaseClient } from './shared/supabase-security'

// 보안 강화된 클라이언트 생성
const supabase = SecureSupabaseClient.createClientInstance('user')

// 세션 보안 검증
await SessionSecurity.validateSession(supabase)
```

## 배포 시 보안 체크리스트

### 환경변수 점검
- [ ] Service Role Key가 클라이언트에 노출되지 않는가?
- [ ] 모든 VITE_ 변수가 공개되어도 안전한가?
- [ ] 프로덕션 환경에서 디버그 모드가 비활성화되었는가?
- [ ] 모든 필수 환경변수가 설정되었는가?

### Supabase 설정 점검
- [ ] RLS 정책이 모든 테이블에 적용되었는가?
- [ ] Anon Key의 권한이 적절히 제한되었는가?
- [ ] Service Role Key가 Edge Functions에서만 사용되는가?
- [ ] 인증 설정이 올바르게 구성되었는가?

### 네트워크 보안
- [ ] HTTPS가 강제로 사용되는가?
- [ ] CSP 헤더가 설정되었는가?
- [ ] CORS 설정이 적절한가?
- [ ] Rate Limiting이 활성화되었는가?

### 코드 보안
- [ ] 민감한 정보가 로그에 출력되지 않는가?
- [ ] 사용자 입력이 적절히 검증되는가?
- [ ] SQL 인젝션 방어가 적용되었는가?
- [ ] XSS 방어가 적용되었는가?

## 개발 환경 보안

### 로컬 개발 시 주의사항

1. **실제 프로덕션 키 사용 금지**
   ```bash
   # 개발용 키만 사용
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # 로컬 개발용
   ```

2. **환경변수 파일 보안**
   ```bash
   # .gitignore에 추가
   .env.local
   .env.production
   .env.staging
   ```

3. **개발 도구 설정**
   ```bash
   # package.json
   {
     "scripts": {
       "security-check": "npm audit && env-validator check"
     }
   }
   ```

### 코드 검토 체크리스트

- [ ] 하드코딩된 API 키가 없는가?
- [ ] 콘솔에 민감한 정보가 출력되지 않는가?
- [ ] 에러 메시지에 시스템 정보가 노출되지 않는가?
- [ ] 사용자 입력 검증이 충분한가?

## 모니터링 및 감사

### 보안 로그

시스템은 다음 이벤트들을 자동으로 로그합니다:

```typescript
// 인증 이벤트
await logSecurityEvent('auth_success', { userId: user.id })
await logSecurityEvent('auth_failed', { reason: 'invalid_token' })

// 데이터 접근 이벤트  
await SecureDataAccess.logDataAccess('select', 'campaigns', userId)

// 관리자 작업
await logSecurityEvent('admin_action', { action: 'user_ban', targetUserId })
```

### 모니터링 대상

1. **인증 실패 급증**
2. **비정상적인 API 호출 패턴** 
3. **관리자 권한 사용**
4. **데이터베이스 오류 증가**
5. **Rate Limiting 임계값 도달**

### 보안 대시보드

관리자 앱에서 다음 메트릭을 실시간 모니터링:

- 일일 로그인 시도 vs 성공률
- IP별 요청 패턴
- 실패한 권한 검사 횟수
- 비정상적인 데이터 접근 패턴

## 사고 대응 절차

### 1단계: 즉시 대응 (5분 이내)

```bash
# 1. 의심스러운 사용자 계정 비활성화
UPDATE user_profiles 
SET is_active = false 
WHERE id = 'suspicious-user-id';

# 2. IP 차단 (CDN/방화벽 레벨)
# 3. 관련 세션 무효화
```

### 2단계: 피해 평가 (30분 이내)

1. **영향 범위 확인**
   - 접근된 데이터 식별
   - 영향받은 사용자 수 계산
   - 시간대별 활동 패턴 분석

2. **로그 분석**
   ```sql
   SELECT * FROM security_logs 
   WHERE created_at > NOW() - INTERVAL '24 hours'
   AND severity = 'error'
   ORDER BY created_at DESC;
   ```

### 3단계: 복구 및 강화 (24시간 이내)

1. **시스템 강화**
   - RLS 정책 강화
   - Rate Limiting 임계값 조정
   - 추가 모니터링 규칙 설정

2. **사용자 통신**
   - 영향받은 사용자에게 알림
   - 비밀번호 재설정 요구
   - 보안 강화 조치 안내

## 보안 연락처

### 보안 이슈 신고
- 이메일: security@tre-it.com
- 긴급 상황: +82-10-XXXX-XXXX
- Slack: #security-alerts

### 책임자
- **CTO**: 전체 보안 정책
- **Lead Developer**: 코드 및 인프라 보안  
- **DevOps Engineer**: 배포 및 운영 보안

---

## 보안 업데이트

### 정기 보안 점검 (월 1회)
- [ ] 의존성 취약점 검사 (`npm audit`)
- [ ] 환경변수 및 키 로테이션
- [ ] 권한 및 접근 제어 검토
- [ ] 보안 로그 분석
- [ ] 백업 및 복구 테스트

### 보안 교육 (분기 1회)
- 개발팀 보안 교육
- 새로운 위협 동향 공유
- 보안 도구 사용법 교육
- 사고 대응 시뮬레이션

---

**마지막 업데이트**: 2024년 8월 29일  
**다음 검토 예정**: 2024년 9월 29일