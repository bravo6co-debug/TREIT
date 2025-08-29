# Treit API 명세서

## 📡 API 개요

Treit 플랫폼의 모든 API는 **Supabase Edge Functions**를 통해 제공되며, Deno 런타임 환경에서 실행됩니다. 모든 API는 RESTful 설계 원칙을 따르며, JSON 형태로 데이터를 주고받습니다.

### 🔗 Base URL
```
Production: https://your-project-id.supabase.co/functions/v1/
Development: http://localhost:54321/functions/v1/
```

### 🔐 인증
모든 API 요청은 Authorization 헤더에 Bearer 토큰을 포함해야 합니다.
```
Authorization: Bearer {JWT_TOKEN}
```

## 🎯 Edge Functions API

### 1. 클릭 추적 API

#### `POST /tracking-click`

사용자가 공유한 링크를 통한 클릭을 추적하고 검증합니다.

**엔드포인트**: `/functions/v1/tracking-click`

**Headers**:
```json
{
  "Content-Type": "application/json",
  "X-Tracking-Code": "required - 추적 코드"
}
```

**Request Body**:
```json
{
  "tracking_code": "a1b2c3d4e5f6g7h8",
  "referrer_url": "https://instagram.com/p/abc123/",
  "user_agent": "Mozilla/5.0...",
  "device_info": {
    "type": "mobile",
    "os": "iOS",
    "browser": "Safari"
  },
  "metadata": {
    "utm_source": "instagram",
    "utm_medium": "story",
    "utm_campaign": "summer_sale"
  }
}
```

**Response (성공)**:
```json
{
  "success": true,
  "data": {
    "click_id": "550e8400-e29b-41d4-a716-446655440000",
    "is_valid": true,
    "commission_amount": 1500.00,
    "validation_score": 0.95,
    "redirect_url": "https://example.com/landing-page"
  },
  "message": "클릭이 성공적으로 추적되었습니다."
}
```

**Response (실패)**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CLICK",
    "message": "중복된 클릭이 감지되었습니다.",
    "details": {
      "reason": "duplicate_ip_click",
      "last_click_time": "2024-08-28T10:30:00Z"
    }
  }
}
```

**에러 코드**:
- `INVALID_TRACKING_CODE`: 유효하지 않은 추적 코드
- `DUPLICATE_CLICK`: 중복 클릭 감지
- `FRAUD_DETECTED`: 어뷰징 행위 감지
- `CAMPAIGN_EXPIRED`: 캠페인 기간 만료
- `BUDGET_EXCEEDED`: 예산 초과

**Rate Limiting**: IP당 분당 10회

---

### 2. 캠페인 참여 API

#### `POST /matching-join`

사용자가 캠페인에 참여하여 전용 추적 링크를 생성합니다.

**엔드포인트**: `/functions/v1/matching-join`

**Headers**:
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {JWT_TOKEN}"
}
```

**Request Body**:
```json
{
  "campaign_id": "550e8400-e29b-41d4-a716-446655440000",
  "template_id": "770f8500-f39c-52e5-b827-557766551111",
  "platform": "INSTAGRAM",
  "social_account": {
    "username": "user123",
    "followers": 1000,
    "verified": true
  }
}
```

**Response (성공)**:
```json
{
  "success": true,
  "data": {
    "user_campaign_id": "990g8600-g49d-63f6-c938-668877662222",
    "tracking_code": "a1b2c3d4e5f6g7h8",
    "share_url": "https://tre-it.com/t/a1b2c3d4e5f6g7h8",
    "template_content": {
      "title": "여름 세일 50% 할인!",
      "body": "지금 바로 확인하세요...",
      "image_url": "https://example.com/image.jpg",
      "hashtags": ["#여름세일", "#50%할인"]
    },
    "commission_rate": 1500.00,
    "expires_at": "2024-08-31T23:59:59Z"
  },
  "message": "캠페인에 성공적으로 참여했습니다."
}
```

**에러 코드**:
- `CAMPAIGN_NOT_FOUND`: 캠페인을 찾을 수 없음
- `CAMPAIGN_INACTIVE`: 비활성 캠페인
- `TEMPLATE_NOT_FOUND`: 템플릿을 찾을 수 없음
- `INSUFFICIENT_LEVEL`: 사용자 레벨 부족
- `ALREADY_JOINED`: 이미 참여한 캠페인
- `SOCIAL_ACCOUNT_REQUIRED`: 소셜 계정 연동 필요

**Rate Limiting**: 사용자당 시간당 20회

---

### 3. 결제 처리 API

#### `POST /process-payment`

광고주의 캠페인 크레딧 충전 및 결제를 처리합니다.

**엔드포인트**: `/functions/v1/process-payment`

**Headers**:
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {JWT_TOKEN}",
  "Idempotency-Key": "unique-key-per-request"
}
```

**Request Body**:
```json
{
  "amount": 100000,
  "currency": "KRW",
  "payment_method": "stripe",
  "payment_method_id": "pm_1234567890",
  "metadata": {
    "campaign_id": "550e8400-e29b-41d4-a716-446655440000",
    "description": "캠페인 크레딧 충전"
  }
}
```

**Response (성공)**:
```json
{
  "success": true,
  "data": {
    "transaction_id": "txn_1234567890abcdef",
    "payment_intent_id": "pi_1234567890abcdef",
    "status": "succeeded",
    "amount": 100000,
    "currency": "KRW",
    "credits_added": 1000,
    "new_balance": 2500,
    "receipt_url": "https://pay.stripe.com/receipts/..."
  },
  "message": "결제가 성공적으로 완료되었습니다."
}
```

**Response (실패)**:
```json
{
  "success": false,
  "error": {
    "code": "PAYMENT_FAILED",
    "message": "결제 처리 중 오류가 발생했습니다.",
    "details": {
      "provider_error": "card_declined",
      "decline_code": "insufficient_funds"
    }
  }
}
```

**에러 코드**:
- `PAYMENT_FAILED`: 결제 실패
- `INVALID_PAYMENT_METHOD`: 유효하지 않은 결제 수단
- `AMOUNT_TOO_SMALL`: 최소 결제 금액 미달
- `DAILY_LIMIT_EXCEEDED`: 일일 결제 한도 초과
- `BUSINESS_NOT_VERIFIED`: 사업자 인증 미완료

**Rate Limiting**: 사업자당 분당 5회

---

### 4. 수익 계산 API

#### `POST /calculate-earnings`

사용자의 클릭 수익을 계산하고 정산 데이터를 업데이트합니다.

**엔드포인트**: `/functions/v1/calculate-earnings`

**Headers**:
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {SERVICE_ROLE_KEY}"
}
```

**Request Body**:
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "period": {
    "start_date": "2024-08-01T00:00:00Z",
    "end_date": "2024-08-31T23:59:59Z"
  },
  "calculation_type": "monthly_settlement"
}
```

**Response (성공)**:
```json
{
  "success": true,
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "period": "2024-08",
    "total_clicks": 150,
    "valid_clicks": 142,
    "base_earnings": 213000,
    "level_bonus": 12780,
    "referral_bonus": 5000,
    "total_earnings": 230780,
    "earnings_breakdown": [
      {
        "campaign_id": "camp_001",
        "clicks": 50,
        "earnings": 75000
      },
      {
        "campaign_id": "camp_002", 
        "clicks": 92,
        "earnings": 138000
      }
    ]
  },
  "message": "수익 계산이 완료되었습니다."
}
```

**에러 코드**:
- `USER_NOT_FOUND`: 사용자를 찾을 수 없음
- `INVALID_PERIOD`: 유효하지 않은 기간
- `NO_CLICK_DATA`: 클릭 데이터 없음
- `CALCULATION_ERROR`: 계산 오류

**Rate Limiting**: 시스템 내부 API로 제한 없음

---

### 5. 어뷰징 감지 API

#### `POST /detect-fraud`

AI 기반 어뷰징 패턴 감지 및 분석을 수행합니다.

**엔드포인트**: `/functions/v1/detect-fraud`

**Headers**:
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {SERVICE_ROLE_KEY}"
}
```

**Request Body**:
```json
{
  "analysis_type": "real_time",
  "target": {
    "type": "click_event",
    "id": "550e8400-e29b-41d4-a716-446655440000"
  },
  "context": {
    "ip_address": "192.168.1.100",
    "user_agent": "Mozilla/5.0...",
    "user_id": "user_123",
    "campaign_id": "camp_001",
    "recent_activity": {
      "clicks_last_hour": 5,
      "clicks_today": 25
    }
  }
}
```

**Response (성공)**:
```json
{
  "success": true,
  "data": {
    "fraud_score": 0.15,
    "risk_level": "low",
    "is_fraud": false,
    "detected_patterns": [],
    "analysis_details": {
      "ip_reputation": 0.9,
      "click_velocity": 0.8,
      "behavioral_consistency": 0.95,
      "device_fingerprint": "normal"
    },
    "recommendations": [
      "continue_monitoring",
      "apply_standard_validation"
    ]
  },
  "message": "어뷰징 분석이 완료되었습니다."
}
```

**Response (어뷰징 감지)**:
```json
{
  "success": true,
  "data": {
    "fraud_score": 0.85,
    "risk_level": "high",
    "is_fraud": true,
    "detected_patterns": [
      "click_spam",
      "suspicious_ip_pattern"
    ],
    "analysis_details": {
      "ip_reputation": 0.2,
      "click_velocity": 2.5,
      "behavioral_consistency": 0.3,
      "device_fingerprint": "suspicious"
    },
    "recommendations": [
      "block_user",
      "invalidate_clicks",
      "notify_admin"
    ],
    "evidence": {
      "clicks_per_minute": 15,
      "ip_click_count": 50,
      "suspicious_timing": true
    }
  },
  "message": "어뷰징 행위가 감지되었습니다."
}
```

**에러 코드**:
- `ANALYSIS_FAILED`: 분석 실패
- `INVALID_TARGET`: 유효하지 않은 분석 대상
- `INSUFFICIENT_DATA`: 분석을 위한 데이터 부족

**Rate Limiting**: 시스템 내부 API로 제한 없음

---

### 6. 캠페인 분석 API

#### `GET /campaign-analytics`

캠페인의 성과 데이터와 분석 정보를 제공합니다.

**엔드포인트**: `/functions/v1/campaign-analytics`

**Headers**:
```json
{
  "Authorization": "Bearer {JWT_TOKEN}"
}
```

**Query Parameters**:
```
?campaign_id=550e8400-e29b-41d4-a716-446655440000
&period=30d
&metrics=clicks,impressions,ctr,cost,conversions
&group_by=day
```

**Response (성공)**:
```json
{
  "success": true,
  "data": {
    "campaign_id": "550e8400-e29b-41d4-a716-446655440000",
    "period": {
      "start_date": "2024-08-01T00:00:00Z",
      "end_date": "2024-08-31T23:59:59Z"
    },
    "summary": {
      "total_clicks": 15420,
      "valid_clicks": 14889,
      "total_impressions": 125000,
      "ctr": 12.34,
      "total_cost": 2233500,
      "avg_cpc": 150,
      "conversion_rate": 8.5,
      "roi": 245.6
    },
    "daily_breakdown": [
      {
        "date": "2024-08-01",
        "clicks": 450,
        "valid_clicks": 432,
        "impressions": 3750,
        "cost": 64800,
        "conversions": 36
      }
    ],
    "demographics": {
      "age_groups": {
        "18-24": 35,
        "25-34": 42,
        "35-44": 23
      },
      "gender": {
        "male": 48,
        "female": 52
      },
      "locations": {
        "Seoul": 45,
        "Busan": 15,
        "Other": 40
      }
    },
    "top_performers": [
      {
        "user_id": "user_123",
        "clicks": 150,
        "earnings": 22500
      }
    ]
  },
  "message": "캠페인 분석 데이터를 성공적으로 조회했습니다."
}
```

**에러 코드**:
- `CAMPAIGN_NOT_FOUND`: 캠페인을 찾을 수 없음
- `ACCESS_DENIED`: 접근 권한 없음
- `INVALID_PERIOD`: 유효하지 않은 기간
- `ANALYTICS_UNAVAILABLE`: 분석 데이터 처리 중

**Rate Limiting**: 사업자당 분당 30회

---

### 7. 사용자 분석 API

#### `GET /user-analytics`

사용자의 활동 데이터와 성과 분석 정보를 제공합니다.

**엔드포인트**: `/functions/v1/user-analytics`

**Headers**:
```json
{
  "Authorization": "Bearer {JWT_TOKEN}"
}
```

**Query Parameters**:
```
?period=30d
&include=earnings,level,campaigns,social_metrics
```

**Response (성공)**:
```json
{
  "success": true,
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "period": {
      "start_date": "2024-08-01T00:00:00Z",
      "end_date": "2024-08-31T23:59:59Z"
    },
    "earnings_summary": {
      "total_earned": 124500,
      "pending_amount": 15000,
      "available_amount": 109500,
      "this_month": 87300,
      "last_month": 95200,
      "growth_rate": -8.3
    },
    "activity_summary": {
      "campaigns_joined": 12,
      "campaigns_completed": 8,
      "total_clicks_generated": 1250,
      "valid_click_rate": 94.2,
      "avg_clicks_per_campaign": 104
    },
    "level_info": {
      "current_level": 7,
      "current_xp": 750,
      "next_level_xp": 1000,
      "xp_to_next": 250,
      "level_benefits": {
        "commission_bonus": 6,
        "priority_access": true,
        "premium_campaigns": true
      }
    },
    "social_performance": {
      "instagram": {
        "posts": 15,
        "avg_engagement": 8.5,
        "followers_gained": 120
      },
      "facebook": {
        "posts": 8,
        "avg_engagement": 12.3,
        "reach": 5200
      }
    },
    "achievements": [
      {
        "id": "first_1000_clicks",
        "name": "클릭 마스터",
        "description": "첫 1000클릭 달성",
        "achieved_at": "2024-08-15T14:30:00Z",
        "reward_xp": 500
      }
    ]
  },
  "message": "사용자 분석 데이터를 성공적으로 조회했습니다."
}
```

**에러 코드**:
- `USER_NOT_FOUND`: 사용자를 찾을 수 없음
- `ANALYTICS_PERMISSION_DENIED`: 분석 권한 없음
- `INSUFFICIENT_DATA`: 분석할 데이터 부족

**Rate Limiting**: 사용자당 시간당 100회

---

## 📡 Supabase Realtime 채널

### 1. 클릭 이벤트 채널

**채널명**: `clicks:campaign_{campaign_id}`

**구독 방법**:
```javascript
const channel = supabase
  .channel(`clicks:campaign_${campaignId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'click_events',
    filter: `user_campaign_id=in.(${userCampaignIds.join(',')})`
  }, (payload) => {
    console.log('새로운 클릭:', payload.new);
  })
  .subscribe();
```

**이벤트 타입**:
- `click.created`: 새 클릭 발생
- `click.validated`: 클릭 검증 완료
- `click.invalidated`: 클릭 무효화

**페이로드 구조**:
```json
{
  "event": "click.created",
  "data": {
    "click_id": "550e8400-e29b-41d4-a716-446655440000",
    "user_campaign_id": "770f8500-f39c-52e5-b827-557766551111",
    "is_valid": true,
    "commission_amount": 1500.00,
    "clicked_at": "2024-08-28T10:30:00Z",
    "location": "Seoul, KR"
  }
}
```

---

### 2. 사용자 수익 채널

**채널명**: `earnings:user_{user_id}`

**구독 방법**:
```javascript
const channel = supabase
  .channel(`earnings:user_${userId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'user_earnings',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    console.log('수익 업데이트:', payload.new);
  })
  .subscribe();
```

**이벤트 타입**:
- `earnings.updated`: 수익 정보 업데이트
- `earnings.milestone`: 수익 마일스톤 달성
- `level.up`: 레벨업

**페이로드 구조**:
```json
{
  "event": "earnings.updated",
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "total_earned": 124500,
    "pending_amount": 15000,
    "available_amount": 109500,
    "monthly_earned": 87300,
    "monthly_clicks": 582,
    "last_earned_at": "2024-08-28T10:30:00Z"
  }
}
```

---

### 3. 캠페인 상태 채널

**채널명**: `campaigns:business_{business_id}`

**구독 방법**:
```javascript
const channel = supabase
  .channel(`campaigns:business_${businessId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'campaigns',
    filter: `business_id=eq.${businessId}`
  }, (payload) => {
    console.log('캠페인 변경:', payload);
  })
  .subscribe();
```

**이벤트 타입**:
- `campaign.created`: 새 캠페인 생성
- `campaign.approved`: 캠페인 승인
- `campaign.paused`: 캠페인 일시 정지
- `campaign.budget_warning`: 예산 경고 (80% 소진)
- `campaign.completed`: 캠페인 완료

---

### 4. 관리자 대시보드 채널

**채널명**: `dashboard:admin`

**구독 방법**:
```javascript
const channel = supabase
  .channel('dashboard:admin')
  .on('broadcast', {
    event: 'system_metrics'
  }, (payload) => {
    console.log('시스템 메트릭:', payload);
  })
  .subscribe();
```

**이벤트 타입**:
- `system.metrics`: 실시간 시스템 지표
- `fraud.detected`: 어뷰징 감지 알림
- `campaign.approval_needed`: 승인 대기 캠페인
- `user.suspension`: 사용자 정지 알림

**페이로드 구조**:
```json
{
  "event": "system.metrics",
  "data": {
    "active_users": 1250,
    "active_campaigns": 85,
    "total_clicks_today": 15420,
    "total_revenue_today": 2233500,
    "fraud_detection_rate": 2.3,
    "system_health": "healthy",
    "timestamp": "2024-08-28T10:30:00Z"
  }
}
```

---

## 🔒 보안 및 인증

### JWT 토큰 구조
```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "role": "authenticated",
  "user_metadata": {
    "user_type": "user",
    "level": 7,
    "verified": true
  },
  "app_metadata": {
    "provider": "email",
    "providers": ["email"]
  },
  "exp": 1693228800,
  "iat": 1693142400
}
```

### API 키 관리
- **Anon Key**: 클라이언트에서 사용, RLS 정책 적용
- **Service Role Key**: 서버 사이드에서 사용, 모든 권한

### Rate Limiting 정책
| API | 제한 | 기준 |
|-----|------|------|
| tracking-click | 10/min | IP |
| matching-join | 20/hour | User |
| process-payment | 5/min | Business |
| campaign-analytics | 30/min | Business |
| user-analytics | 100/hour | User |

---

## 🚨 에러 처리

### 표준 에러 응답 형식
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "사용자 친화적인 메시지",
    "details": {
      "field": "field_name",
      "value": "invalid_value",
      "reason": "validation_failed"
    },
    "trace_id": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2024-08-28T10:30:00Z"
  }
}
```

### HTTP 상태 코드
- `200`: 성공
- `400`: 잘못된 요청
- `401`: 인증 실패
- `403`: 권한 부족
- `404`: 리소스를 찾을 수 없음
- `429`: 요청 제한 초과
- `500`: 서버 내부 오류

---

## 📚 SDK 및 예제

### JavaScript SDK 사용 예제
```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://your-project-id.supabase.co',
  'your-anon-key'
);

// 클릭 추적
const { data, error } = await supabase.functions.invoke('tracking-click', {
  body: {
    tracking_code: 'a1b2c3d4e5f6g7h8',
    referrer_url: 'https://instagram.com/p/abc123/'
  },
  headers: {
    'X-Tracking-Code': 'a1b2c3d4e5f6g7h8'
  }
});

// 캠페인 참여
const { data: joinData, error: joinError } = await supabase.functions.invoke('matching-join', {
  body: {
    campaign_id: 'campaign-uuid',
    template_id: 'template-uuid',
    platform: 'INSTAGRAM'
  }
});
```

### 실시간 구독 예제
```javascript
// 클릭 실시간 모니터링
const subscription = supabase
  .channel('clicks:campaign_123')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'click_events'
  }, (payload) => {
    updateDashboard(payload.new);
  })
  .subscribe();

// 구독 해제
subscription.unsubscribe();
```

---

이 API 명세서는 Treit 플랫폼의 현재 구현 상태를 반영하며, 지속적으로 업데이트됩니다. 최신 버전은 [API 문서 사이트](https://docs.tre-it.com)에서 확인할 수 있습니다.