# Treit API 명세서

## 🌐 API 개요

Treit API는 Supabase Edge Functions를 기반으로 하며, Deno 런타임에서 실행됩니다.

### Base URLs
- Production: `https://api.tre-it.com/functions/v1`
- Development: `http://localhost:54321/functions/v1`

### 인증
모든 API 요청은 JWT Bearer 토큰이 필요합니다.
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

## 📡 Edge Functions API

### 1. 클릭 추적 API

#### `POST /tracking-click`
클릭 이벤트를 추적하고 검증합니다.

**Headers:**
```http
Content-Type: application/json
Authorization: Bearer {token}
X-Real-IP: {user_ip}
X-User-Agent: {browser_agent}
```

**Request Body:**
```json
{
  "tracking_code": "a1b2c3d4e5f6g7h8",
  "referrer": "https://instagram.com/p/abc123",
  "session_id": "session_uuid",
  "metadata": {
    "device": "mobile",
    "browser": "Safari",
    "os": "iOS 17.0"
  }
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "click_id": "click_uuid",
    "is_valid": true,
    "commission": 150,
    "validation_score": 0.95,
    "message": "클릭이 성공적으로 기록되었습니다"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_CLICK",
    "message": "동일한 IP에서 1분 이내 중복 클릭입니다",
    "details": {
      "last_click": "2024-01-01T12:00:00Z",
      "wait_seconds": 45
    }
  }
}
```

**Rate Limiting:**
- IP당 분당 10회
- 사용자당 분당 30회

---

### 2. 캠페인 참여 API

#### `POST /matching-join`
사용자가 캠페인에 참여합니다.

**Request Body:**
```json
{
  "campaign_id": "campaign_uuid",
  "template_id": "template_uuid",
  "platform": "instagram",
  "platform_username": "@user123"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "matching_id": "matching_uuid",
    "tracking_code": "x9y8z7w6v5u4t3s2",
    "share_url": "https://tre-it.com/t/x9y8z7w6v5u4t3s2",
    "template_content": {
      "title": "여름 세일 50% 할인!",
      "body": "지금 바로 확인하세요...",
      "image_url": "https://cdn.tre-it.com/images/summer-sale.jpg",
      "hashtags": ["#여름세일", "#50프로할인"]
    }
  }
}
```

**Error Codes:**
- `CAMPAIGN_NOT_FOUND`: 캠페인을 찾을 수 없음
- `CAMPAIGN_INACTIVE`: 캠페인이 비활성화됨
- `BUDGET_EXCEEDED`: 캠페인 예산 초과
- `ALREADY_JOINED`: 이미 참여한 캠페인
- `SOCIAL_NOT_VERIFIED`: SNS 계정 미인증

---

### 3. 결제 처리 API

#### `POST /process-payment`
광고주 결제를 처리합니다.

**Request Body:**
```json
{
  "business_id": "business_uuid",
  "amount": 100000,
  "currency": "KRW",
  "payment_method": "card",
  "provider": "stripe",
  "provider_payment_id": "pi_xxx"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "transaction_id": "txn_uuid",
    "status": "completed",
    "credits_added": 100000,
    "total_credits": 250000,
    "receipt_url": "https://receipt.stripe.com/xxx"
  }
}
```

**Webhook Validation:**
```typescript
// Stripe 서명 검증
const sig = request.headers.get('stripe-signature');
const event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
```

---

### 4. 수익 계산 API

#### `POST /calculate-earnings`
사용자 수익을 계산합니다.

**Request Body:**
```json
{
  "user_id": "user_uuid",
  "period": "monthly",
  "include_pending": true
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "period": "2024-01",
    "earnings": {
      "base_earnings": 45000,
      "level_bonus": 4500,
      "referral_bonus": 2000,
      "total": 51500
    },
    "clicks": {
      "total": 342,
      "valid": 320,
      "invalid": 22
    },
    "campaigns": {
      "active": 5,
      "completed": 12
    },
    "next_payout": "2024-02-01",
    "payout_available": true
  }
}
```

**Level Bonus 계산:**
```typescript
const levelBonus = baseEarnings * ((userLevel - 1) * 0.01);
// Level 7 = 6% 보너스
```

---

### 5. 어뷰징 감지 API

#### `POST /detect-fraud`
의심스러운 활동을 감지합니다.

**Request Body:**
```json
{
  "user_id": "user_uuid",
  "campaign_id": "campaign_uuid",
  "check_type": "real_time",
  "evidence": {
    "ip_address": "1.2.3.4",
    "click_pattern": [1, 1, 1, 2, 1, 1],
    "device_fingerprint": "fp_xxx"
  }
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "fraud_score": 0.85,
    "is_suspicious": true,
    "detection_reasons": [
      {
        "type": "click_pattern",
        "confidence": 0.9,
        "description": "비정상적인 클릭 패턴 감지"
      },
      {
        "type": "ip_reputation",
        "confidence": 0.8,
        "description": "VPN/프록시 IP 주소"
      }
    ],
    "recommended_action": "suspend_campaign",
    "auto_action_taken": false
  }
}
```

**Detection Methods:**
- IP 분석 (VPN/프록시 감지)
- 클릭 패턴 분석 (머신러닝)
- 디바이스 핑거프린팅
- 시간대 패턴 분석
- 지역 일관성 검사

---

### 6. 캠페인 분석 API

#### `GET /campaign-analytics`
캠페인 성과를 분석합니다.

**Query Parameters:**
```
campaign_id=uuid
date_from=2024-01-01
date_to=2024-01-31
granularity=daily
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_clicks": 15234,
      "valid_clicks": 14890,
      "unique_users": 342,
      "total_spent": 1489000,
      "avg_cpc": 100,
      "ctr": 2.34
    },
    "daily_metrics": [
      {
        "date": "2024-01-01",
        "clicks": 523,
        "users": 45,
        "spent": 52300,
        "ctr": 2.1
      }
    ],
    "top_performers": [
      {
        "user_id": "user_uuid",
        "nickname": "인플루언서A",
        "clicks": 234,
        "earnings": 23400
      }
    ],
    "platform_breakdown": {
      "instagram": 45,
      "facebook": 30,
      "tiktok": 25
    }
  }
}
```

---

### 7. 사용자 분석 API

#### `GET /user-analytics`
사용자 활동을 분석합니다.

**Query Parameters:**
```
user_id=uuid
metric_type=engagement
period=7d
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user_metrics": {
      "total_campaigns": 23,
      "active_campaigns": 5,
      "total_clicks": 1234,
      "total_earnings": 123400,
      "avg_ctr": 2.8,
      "quality_score": 0.92
    },
    "trend_data": {
      "earnings_trend": "+15%",
      "clicks_trend": "+8%",
      "quality_trend": "stable"
    },
    "best_performing": {
      "campaign": "여름 세일",
      "clicks": 234,
      "earnings": 23400
    },
    "recommendations": [
      "Instagram에서 더 나은 성과를 보이고 있습니다",
      "오후 2-4시 게시물이 가장 효과적입니다"
    ]
  }
}
```

## 🔄 Realtime Subscriptions

### 1. 클릭 이벤트 구독

```typescript
// 클라이언트 구독 코드
const channel = supabase
  .channel('clicks:campaign_uuid')
  .on('postgres_changes', 
    { 
      event: 'INSERT', 
      schema: 'public', 
      table: 'click_events',
      filter: 'campaign_id=eq.campaign_uuid'
    },
    (payload) => {
      console.log('New click:', payload.new);
      // UI 업데이트
    }
  )
  .subscribe();
```

**Payload Structure:**
```json
{
  "new": {
    "id": "click_uuid",
    "user_campaign_id": "uc_uuid",
    "ip_address": "1.2.3.4",
    "is_valid": true,
    "commission_amount": 150,
    "clicked_at": "2024-01-01T12:00:00Z"
  }
}
```

### 2. 수익 업데이트 구독

```typescript
const channel = supabase
  .channel('earnings:user_uuid')
  .on('postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'user_earnings',
      filter: 'user_id=eq.user_uuid'
    },
    (payload) => {
      console.log('Earnings updated:', payload.new);
    }
  )
  .subscribe();
```

### 3. 캠페인 상태 구독

```typescript
const channel = supabase
  .channel('campaign_status')
  .on('postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'campaigns',
      filter: 'business_id=eq.business_uuid'
    },
    (payload) => {
      console.log('Campaign status:', payload);
    }
  )
  .subscribe();
```

### 4. 관리자 대시보드 메트릭

```typescript
const channel = supabase
  .channel('admin_metrics')
  .on('broadcast',
    { event: 'metrics_update' },
    (payload) => {
      console.log('Metrics:', payload);
      // 실시간 차트 업데이트
    }
  )
  .subscribe();

// 서버에서 브로드캐스트
await supabase.channel('admin_metrics').send({
  type: 'broadcast',
  event: 'metrics_update',
  payload: {
    total_clicks: 47293,
    active_users: 8934,
    revenue_today: 2800000
  }
});
```

## 🔐 인증 & 권한

### JWT 토큰 구조

```json
{
  "sub": "user_uuid",
  "email": "user@example.com",
  "role": "user",
  "user_metadata": {
    "level": 7,
    "verified": true
  },
  "app_metadata": {
    "provider": "email",
    "providers": ["email"]
  },
  "aud": "authenticated",
  "exp": 1234567890
}
```

### Role별 권한

| Role | 권한 | API 접근 |
|------|------|----------|
| user | 기본 사용자 | tracking, matching, earnings |
| business | 광고주 | campaigns, payment, analytics |
| admin | 관리자 | 모든 API + 관리 기능 |
| service_role | 시스템 | 모든 API (내부용) |

## 📊 Rate Limiting

### 기본 정책

| Endpoint | 인증 사용자 | 미인증 사용자 |
|----------|------------|--------------|
| /tracking-click | 30/분 | 10/분 |
| /matching-join | 10/분 | N/A |
| /process-payment | 5/분 | N/A |
| /calculate-earnings | 60/분 | N/A |
| /detect-fraud | 100/분 | N/A |
| /*-analytics | 60/분 | N/A |

### Rate Limit Headers

```http
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 25
X-RateLimit-Reset: 1234567890
```

## 🚨 Error Codes

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 429 | Too Many Requests |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

### Application Error Codes

| Code | Description | Action |
|------|-------------|---------|
| AUTH_REQUIRED | 인증 필요 | 로그인 요청 |
| INVALID_TOKEN | 유효하지 않은 토큰 | 토큰 재발급 |
| PERMISSION_DENIED | 권한 없음 | 권한 확인 |
| RESOURCE_NOT_FOUND | 리소스 없음 | ID 확인 |
| DUPLICATE_REQUEST | 중복 요청 | 대기 후 재시도 |
| VALIDATION_ERROR | 검증 실패 | 입력값 확인 |
| BUDGET_EXCEEDED | 예산 초과 | 예산 충전 |
| RATE_LIMITED | 요청 제한 | 대기 후 재시도 |
| FRAUD_DETECTED | 어뷰징 감지 | 관리자 문의 |
| MAINTENANCE | 점검 중 | 나중에 재시도 |

## 📝 SDK Examples

### JavaScript/TypeScript

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// API 호출 헬퍼
async function callEdgeFunction(name: string, body: any) {
  const { data, error } = await supabase.functions.invoke(name, {
    body: JSON.stringify(body)
  });
  
  if (error) throw error;
  return data;
}

// 클릭 추적
await callEdgeFunction('tracking-click', {
  tracking_code: 'abc123',
  referrer: 'https://instagram.com'
});
```

### React Hook Example

```tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useRealtimeClicks(campaignId: string) {
  const [clicks, setClicks] = useState<Click[]>([]);
  
  useEffect(() => {
    const channel = supabase
      .channel(`clicks:${campaignId}`)
      .on('postgres_changes',
        { 
          event: 'INSERT',
          schema: 'public',
          table: 'click_events',
          filter: `campaign_id=eq.${campaignId}`
        },
        (payload) => {
          setClicks(prev => [...prev, payload.new as Click]);
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId]);
  
  return clicks;
}
```

## 🔧 Testing

### Test Endpoints
- Development: `http://localhost:54321/functions/v1`
- Staging: `https://staging-api.tre-it.com/functions/v1`

### Test Credentials
```json
{
  "test_user": {
    "email": "test@tre-it.com",
    "password": "test123456"
  },
  "test_business": {
    "email": "business@tre-it.com",
    "password": "business123456"
  }
}
```

### Postman Collection
[Download Postman Collection](https://api.tre-it.com/docs/postman-collection.json)

---

이 API 문서는 지속적으로 업데이트됩니다. 최신 버전은 [https://docs.tre-it.com/api](https://docs.tre-it.com/api)에서 확인하세요.