# TreitMaster Edge Functions

TreitMaster 프로젝트의 핵심 서버리스 Edge Functions입니다. Deno 환경에서 실행되며 Supabase를 통해 배포됩니다.

## 📁 구조

```
functions/
├── _shared/                    # 공통 유틸리티 및 설정
│   ├── auth.ts                # 인증 관련 유틸리티
│   ├── cors.ts                # CORS 설정
│   ├── utils.ts               # 일반 유틸리티 함수들
│   └── config.ts              # 설정 상수
├── tracking-click/             # 클릭 추적 및 검증
├── generate-deeplink/          # 딥링크 생성
├── redirect-handler/           # 리다이렉트 처리
├── calculate-earnings/         # 수익 계산
├── detect-fraud/              # 어뷰징 감지
└── [기타 함수들]/
```

## 🚀 핵심 Edge Functions

### 1. tracking-click/index.ts
**클릭 추적 및 검증**

- **목적**: 사용자의 클릭을 추적하고 유효성을 검증하여 수익을 계산
- **엔드포인트**: `POST /functions/v1/tracking-click`
- **인증**: Bearer Token 필요

**요청 파라미터:**
```typescript
{
  tracking_code: string,    // 추적 코드 (필수)
  referrer?: string,        // 리퍼러 URL
  session_id?: string,      // 세션 ID
  metadata?: object         // 추가 메타데이터
}
```

**응답:**
```typescript
{
  success: boolean,
  data: {
    click_id: string,
    is_valid: boolean,
    commission: number,
    level_bonus: number,
    validation_score: number,
    message: string
  }
}
```

**핵심 기능:**
- 봇 감지 및 차단
- IP 기반 스팸 방지
- 클릭 간격 검증 (1분 최소 간격)
- 레벨 보너스 적용
- 실시간 유효성 점수 계산

### 2. generate-deeplink/index.ts
**딥링크 생성**

- **목적**: 캠페인 URL을 추적 가능한 단축 링크로 변환
- **엔드포인트**: `POST /functions/v1/generate-deeplink`
- **인증**: Bearer Token 필요
- **딥링크 형식**: `https://tre-it.com/c/{16자리_코드}`

**요청 파라미터:**
```typescript
{
  advertiser_url: string,   // 광고주 원본 URL (필수)
  campaign_id: string,      // 캠페인 ID (필수)
  template_id?: string,     // 템플릿 ID
  platform?: string,       // 플랫폼 ('web', 'instagram', 'facebook' 등)
  utm_params?: object,      // 추가 UTM 파라미터
  custom_params?: object    // 커스텀 파라미터
}
```

**응답:**
```typescript
{
  success: boolean,
  data: {
    tracking_code: string,
    deeplink: string,        // tre-it.com/c/{code} 형식
    share_url: string,       // 공유용 URL
    original_url: string,    // UTM 파라미터가 적용된 원본 URL
    campaign: {
      id: string,
      title: string,
      advertiser: string
    },
    utm_params: object,
    expires_at: string,
    platform: string
  }
}
```

**핵심 기능:**
- 고유 16자리 추적 코드 생성
- 캠페인 활성화 상태 검증
- 사용자 참여 중복 체크
- UTM 파라미터 자동 생성
- 딥링크 매핑 저장

### 3. redirect-handler/index.ts
**리다이렉트 처리**

- **목적**: 딥링크 클릭 시 원본 URL로 리다이렉트하고 클릭 이벤트 기록
- **엔드포인트**: `GET /functions/v1/redirect-handler/{tracking_code}`
- **인증**: 불필요 (공개 접근)

**URL 형식:**
```
https://tre-it.com/c/abcd1234efgh5678
```

**핵심 기능:**
- 추적 코드 유효성 검증
- 캠페인 활성화 상태 확인
- 만료된 링크 처리
- 비동기 클릭 이벤트 기록
- 봇 감지 (허용은 하되 무효 처리)
- 아름다운 에러 페이지 제공

**에러 페이지:**
- 반응형 디자인
- 한국어 지원
- 브랜드 일관성

### 4. calculate-earnings/index.ts
**수익 계산**

- **목적**: 사용자의 수익을 기간별로 집계하고 성과 분석 제공
- **엔드포인트**: `POST /functions/v1/calculate-earnings`
- **인증**: Bearer Token 필요

**요청 파라미터:**
```typescript
{
  user_id?: string,         // 사용자 ID (관리자만 다른 사용자 조회 가능)
  period?: string,          // 'today', 'current_month', 'all_time' 등
  include_pending?: boolean, // 대기 중인 수익 포함 여부
  detailed?: boolean        // 상세 정보 포함 여부
}
```

**응답:**
```typescript
{
  success: boolean,
  data: {
    period: string,
    earnings: {
      base_earnings: number,
      level_bonus: number,
      referral_bonus: number,
      streak_bonus: number,
      quality_bonus: number,
      total: number
    },
    clicks: {
      total: number,
      valid: number,
      invalid: number
    },
    campaigns: {
      active: number,
      completed: number,
      total_participated: number
    },
    performance_metrics: {
      avg_ctr: number,
      quality_score: number,
      consistency_score: number
    },
    next_payout: string,
    payout_available: boolean,
    level_info: {
      current_level: number,
      next_level_xp: number,
      current_xp: number,
      bonus_rate: number
    }
  }
}
```

**핵심 기능:**
- 다양한 기간별 수익 집계
- 레벨 보너스 계산
- 리퍼럴 보너스 (5%)
- 연속 활동 보너스 (스트릭)
- 품질 보너스 (높은 validation score)
- 출금 가능 여부 확인
- 성과 지표 계산

### 5. detect-fraud/index.ts
**어뷰징 감지**

- **목적**: AI 기반 패턴 분석으로 부정 행위를 감지하고 자동 제재
- **엔드포인트**: `POST /functions/v1/detect-fraud`
- **인증**: Bearer Token 필요 (배치 처리는 관리자 권한)

**요청 파라미터:**
```typescript
{
  user_id: string,          // 검사할 사용자 ID (필수)
  campaign_id?: string,     // 특정 캠페인 검사
  check_type?: string,      // 'real_time', 'comprehensive', 'batch'
  evidence?: object,        // 추가 증거 데이터
  auto_action?: boolean     // 자동 제재 실행 여부
}
```

**응답:**
```typescript
{
  success: boolean,
  data: {
    fraud_score: number,     // 0.0 - 1.0 사기 점수
    is_suspicious: boolean,
    detection_reasons: Array<{
      type: string,
      confidence: number,
      description: string,
      severity: 'low' | 'medium' | 'high'
    }>,
    recommended_action: string,
    auto_action_taken: boolean,
    user_risk_profile: {
      total_clicks: number,
      valid_click_rate: number,
      account_age_days: number,
      suspicious_patterns: string[]
    }
  }
}
```

**감지 알고리즘:**
1. **IP 패턴 분석**
   - IP 다양성 분석
   - VPN/Proxy 감지
   - 지리적 일관성

2. **클릭 패턴 분석**
   - 시간 간격의 규칙성
   - 급격한 클릭 (1분내 다중 클릭)
   - 비정상적인 활동 시간

3. **기기 지문 분석**
   - User Agent 다양성
   - 브라우저 지문

4. **계정 행동 분석**
   - 신규 계정 대량 활동
   - 로그인 대비 클릭 비율
   - 캠페인 집중도

**자동 제재:**
- 사기 점수 0.9+ : 계정 정지 (7일)
- 사기 점수 0.8+ : 수동 검토 요청
- 사기 점수 0.6+ : 강화 모니터링

## 🔧 공통 유틸리티

### _shared/auth.ts
인증 관련 유틸리티 함수들:
- `validateUser()` - 일반 사용자 인증
- `requireAdmin()` - 관리자 권한 확인
- `requireAdvertiser()` - 광고주 권한 확인

### _shared/cors.ts
CORS 설정:
- 모든 도메인 허용 (`*`)
- 표준 HTTP 메서드 지원
- 적절한 헤더 설정

### _shared/utils.ts
범용 유틸리티 함수들:
- IP 주소 추출 (`getRealIP()`)
- 봇 감지 (`detectBot()`)
- 추적 코드 생성 (`generateTrackingCode()`)
- 레벨 시스템 계산
- 사기 점수 계산
- 검증 점수 계산

### _shared/config.ts
설정 상수들:
- API 제한값
- 에러 메시지
- 정규 표현식 패턴
- 비즈니스 로직 상수

## 🛡️ 보안 및 검증

### 클릭 검증 레이어
1. **1차: 기본 검증**
   - 봇 감지 (User Agent)
   - IP 유효성
   - 추적 코드 존재

2. **2차: 비즈니스 로직 검증**
   - 캠페인 활성 상태
   - 예산 초과 여부
   - 사용자 자격

3. **3차: 패턴 분석**
   - 클릭 간격
   - IP 빈도
   - 검증 점수 계산

4. **4차: 사기 감지**
   - 행동 패턴 AI 분석
   - 위험도 평가
   - 자동 제재

### 데이터 보호
- Row Level Security (RLS) 적용
- 개인정보 최소화
- 민감 데이터 암호화
- 접근 로그 기록

## 🚦 에러 처리

모든 Edge Function은 표준화된 에러 응답을 사용합니다:

```typescript
{
  success: false,
  error: {
    code: string,      // ERROR_CODE
    message: string,   // 사용자 친화적 메시지
    details?: any      // 상세 정보 (개발용)
  }
}
```

**공통 에러 코드:**
- `MISSING_TRACKING_CODE` - 추적 코드 누락
- `INVALID_TRACKING_CODE` - 잘못된 추적 코드
- `BOT_DETECTED` - 봇 활동 감지
- `DUPLICATE_CLICK` - 중복 클릭
- `BUDGET_EXCEEDED` - 예산 초과
- `CAMPAIGN_INACTIVE` - 비활성 캠페인
- `FRAUD_DETECTED` - 사기 행위 감지
- `PERMISSION_DENIED` - 권한 부족
- `RATE_LIMITED` - 요청 한도 초과

## 📊 모니터링 및 로깅

### 성능 메트릭
- 응답 시간
- 성공/실패율  
- 처리량 (TPS)
- 에러 발생률

### 비즈니스 메트릭
- 유효 클릭율
- 사기 감지율
- 수익 정확도
- 캠페인 성과

### 로깅
- 구조화된 JSON 로그
- 에러 스택 트레이스
- 보안 이벤트 로그
- 성능 프로파일링

## 🔄 배포 및 관리

### 배포 방법
```bash
# 모든 함수 배포
supabase functions deploy

# 개별 함수 배포  
supabase functions deploy tracking-click

# 환경변수 설정
supabase secrets set VARIABLE_NAME=value
```

### 환경 변수
- `SUPABASE_URL` - Supabase 프로젝트 URL
- `SUPABASE_SERVICE_ROLE_KEY` - 서비스 역할 키
- `BASE_DEEPLINK_URL` - 딥링크 기본 URL (기본: https://tre-it.com)

### 로컬 개발
```bash
# 로컬 서버 시작
supabase start

# 함수 실행
supabase functions serve

# 함수 테스트
curl -X POST http://localhost:54321/functions/v1/tracking-click \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tracking_code": "abcd1234efgh5678"}'
```

## 📈 성능 최적화

### 데이터베이스 최적화
- 적절한 인덱스 활용
- 쿼리 최적화
- 연결 풀링
- 파티셔닝 (click_events)

### 캐싱 전략
- 자주 조회되는 데이터 메모리 캐시
- CDN 활용 (정적 콘텐츠)
- 브라우저 캐시 설정

### 코드 최적화
- 비동기 처리 활용
- 불필요한 데이터 조회 최소화
- 에러 케이스 조기 반환
- 리소스 정리

---

이 Edge Functions는 TreitMaster 플랫폼의 핵심 비즈니스 로직을 처리하며, 확장 가능하고 안전한 아키텍처를 제공합니다.