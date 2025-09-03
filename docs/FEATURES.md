# Treit 기능 명세서

## 🎯 제품 비전

Treit은 일반 사용자와 광고주를 연결하는 **신뢰 기반 CPC 마케팅 플랫폼**입니다.

### 핵심 가치
- **사용자**: 쉽고 투명한 부수입 창출
- **광고주**: 효과적이고 측정 가능한 마케팅
- **플랫폼**: 자동화된 신뢰 시스템

## 📋 기능 명세

### 1. 사용자 시스템

#### 1.1 인증 & 회원가입

**사용자 스토리:**
> "SNS 계정으로 간편하게 가입하고 싶다"

**기능 상세:**
- 이메일/비밀번호 회원가입
- 소셜 로그인 (구글, 카카오, 네이버)
- 휴대폰 인증
- 이메일 인증
- 2단계 인증 (선택)

**비즈니스 로직:**
```typescript
async function registerUser(data: RegisterData) {
  // 1. 이메일 중복 확인
  // 2. Supabase Auth 계정 생성
  // 3. users 테이블 프로필 생성
  // 4. user_earnings 테이블 초기화
  // 5. 환영 이메일 발송
  // 6. 추천인 보너스 지급
}
```

**성공 지표:**
- 회원가입 전환율 > 60%
- 가입 완료 시간 < 2분
- 이메일 인증률 > 80%

---

#### 1.2 프로필 & 레벨 시스템

**사용자 스토리:**
> "내 활동이 레벨과 보상으로 이어지는 것을 보고 싶다"

**기능 상세:**
- 레벨 1~100 시스템
- XP 획득 방법:
  - 클릭당 10 XP
  - 일일 미션 완료: 50 XP
  - 친구 추천: 100 XP
- 레벨별 혜택:
  - CPC 보너스 (레벨당 1%)
  - 프리미엄 캠페인 접근
  - 배지 & 타이틀

**레벨 계산:**
```typescript
const calculateLevel = (xp: number): number => {
  // 레벨당 필요 XP: 100 * level * 1.5
  return Math.floor(Math.sqrt(xp / 150));
};

const calculateBonus = (level: number, baseCPC: number): number => {
  return baseCPC * (1 + (level - 1) * 0.01);
};
```

**UI/UX 고려사항:**
- 프로그레스 바 애니메이션
- 레벨업 알림 & 축하 효과
- 다음 레벨까지 필요 XP 표시

---

#### 1.3 SNS 계정 연동

**사용자 스토리:**
> "내 SNS 계정을 안전하게 연동하고 싶다"

**기능 상세:**
- Instagram 비즈니스 계정 연동
- Facebook 페이지 연동
- TikTok 계정 연동
- YouTube 채널 연동
- 블로그 URL 등록

**인증 플로우:**
```typescript
async function connectInstagram(userId: string) {
  // 1. Instagram OAuth 리다이렉트
  // 2. Access Token 획득
  // 3. 계정 정보 조회 (username, followers)
  // 4. 암호화하여 DB 저장
  // 5. 인증 배지 부여
  
  const encryptedToken = await encrypt(accessToken);
  await updateUser(userId, {
    social_accounts: {
      instagram: {
        username,
        followers,
        verified: true,
        connected_at: new Date()
      }
    }
  });
}
```

**보안 고려사항:**
- OAuth 2.0 사용
- 토큰 암호화 저장
- 주기적 토큰 갱신
- 권한 최소화

---

### 2. 광고주 시스템

#### 2.1 광고주 등록 & 승인

**사용자 스토리:**
> "사업자로서 신뢰할 수 있는 마케팅을 하고 싶다"

**기능 상세:**
- 사업자 정보 입력
- 사업자등록증 업로드
- 관리자 승인 프로세스
- 승인 알림

**승인 프로세스:**
```typescript
interface BusinessRegistration {
  company_name: string;
  business_number: string;
  representative: string;
  business_license: File;
  website?: string;
}

async function verifyBusiness(data: BusinessRegistration) {
  // 1. 사업자등록번호 검증 API
  // 2. 문서 OCR 검증
  // 3. 웹사이트 소유권 확인
  // 4. 관리자 리뷰 큐 등록
  // 5. 자동 점수 계산
  
  const score = calculateTrustScore(data);
  if (score > 80) {
    await autoApprove(data);
  } else {
    await requestManualReview(data);
  }
}
```

**승인 기준:**
- 유효한 사업자등록번호
- 일치하는 대표자명
- 활성 웹사이트 (선택)
- 업종 확인

---

#### 2.2 캠페인 생성 & 관리

**사용자 스토리:**
> "효과적인 캠페인을 쉽게 만들고 관리하고 싶다"

**기능 상세:**
- 캠페인 정보 입력
- 템플릿 디자인 도구
- 예산 설정
- 타겟팅 옵션
- 일정 관리

**캠페인 생성 플로우:**
```typescript
interface CampaignData {
  title: string;
  description: string;
  landing_url: string;
  category: CampaignCategory;
  cpc_rate: number;
  daily_budget: number;
  total_budget: number;
  start_date: Date;
  end_date?: Date;
  targeting?: {
    age_range?: [number, number];
    gender?: Gender[];
    locations?: string[];
    interests?: string[];
  };
}

async function createCampaign(data: CampaignData) {
  // 1. 예산 검증
  // 2. URL 유효성 확인
  // 3. 캠페인 생성
  // 4. 템플릿 생성
  // 5. 관리자 승인 요청
  
  if (data.total_budget < MIN_BUDGET) {
    throw new Error('최소 예산 미달');
  }
  
  const campaign = await insertCampaign(data);
  await createDefaultTemplate(campaign.id);
  await requestApproval(campaign.id);
}
```

**타겟팅 옵션:**
- 연령대 (10대~60대+)
- 성별 (전체/남성/여성)
- 지역 (시도 단위)
- 관심사 (패션, 뷰티, 음식 등)
- 플랫폼 (Instagram, Facebook 등)

---

#### 2.3 크레딧 & 결제

**사용자 스토리:**
> "투명하고 안전하게 광고비를 충전하고 싶다"

**기능 상세:**
- 크레딧 충전
- 자동 충전 설정
- 결제 수단 관리
- 사용 내역 조회
- 세금계산서 발행

**결제 프로세스:**
```typescript
async function chargeCredits(
  businessId: string,
  amount: number,
  method: PaymentMethod
) {
  // 1. 결제 요청 생성
  // 2. PG사 결제 진행
  // 3. 웹훅 대기
  // 4. 크레딧 충전
  // 5. 영수증 발행
  
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'krw',
        product_data: { name: 'Treit Credits' },
        unit_amount: amount
      },
      quantity: 1
    }],
    success_url: `${BASE_URL}/payment/success`,
    cancel_url: `${BASE_URL}/payment/cancel`
  });
  
  return session.url;
}
```

**자동 충전:**
- 잔액 임계값 설정
- 충전 금액 설정
- 결제 수단 저장
- 알림 설정

---

### 3. 캠페인 시스템

#### 3.1 템플릿 생성 & 관리

**사용자 스토리:**
> "매력적인 홍보 템플릿을 쉽게 만들고 싶다"

**기능 상세:**
- 드래그 앤 드롭 에디터
- 템플릿 라이브러리
- 이미지 업로드
- 텍스트 편집
- 해시태그 자동 생성

**템플릿 구조:**
```typescript
interface Template {
  id: string;
  campaign_id: string;
  name: string;
  content: {
    title: string;
    body: string;
    image_url?: string;
    video_url?: string;
    cta_text: string;
    cta_url: string;
    hashtags: string[];
  };
  preview_image: string;
  performance_score: number;
}

async function generateTemplate(campaignId: string) {
  // 1. AI 기반 텍스트 생성
  // 2. 이미지 리사이징
  // 3. 해시태그 추천
  // 4. 프리뷰 생성
  
  const campaign = await getCampaign(campaignId);
  const content = await generateAIContent(campaign);
  const hashtags = await recommendHashtags(campaign.category);
  
  return createTemplate({
    campaign_id: campaignId,
    content: { ...content, hashtags }
  });
}
```

---

#### 3.2 공유 & 추적

**사용자 스토리:**
> "템플릿을 쉽게 공유하고 성과를 추적하고 싶다"

**기능 상세:**
- 원클릭 복사
- 고유 추적 코드 생성
- 단축 URL 생성
- QR 코드 생성
- 공유 히스토리

**추적 코드 생성:**
```typescript
async function generateTrackingCode(
  userId: string,
  campaignId: string,
  templateId: string
) {
  // 1. 고유 코드 생성
  // 2. 단축 URL 생성
  // 3. user_campaigns 등록
  // 4. 공유 링크 반환
  
  const code = generateUniqueCode(16);
  const matching = await createUserCampaign({
    user_id: userId,
    campaign_id: campaignId,
    template_id: templateId,
    tracking_code: code
  });
  
  return {
    tracking_code: code,
    share_url: `https://tre-it.com/t/${code}`,
    template_content: await getTemplate(templateId)
  };
}
```

---

### 4. 클릭 추적 시스템

#### 4.1 클릭 검증

**사용자 스토리:**
> "정당한 클릭에 대해서만 보상받고 싶다"

**기능 상세:**
- IP 중복 검사
- 시간 간격 검증
- User-Agent 분석
- Referrer 확인
- 지역 일관성 검사

**검증 알고리즘:**
```typescript
async function validateClick(clickData: ClickData): Promise<ValidationResult> {
  const checks = [
    checkIPDuplicate(clickData.ip, clickData.tracking_code),
    checkTimeInterval(clickData.tracking_code),
    checkUserAgent(clickData.user_agent),
    checkReferrer(clickData.referrer),
    checkGeolocation(clickData.ip)
  ];
  
  const results = await Promise.all(checks);
  const score = calculateValidationScore(results);
  
  return {
    is_valid: score > 0.7,
    score,
    reasons: results.filter(r => !r.passed)
  };
}
```

**검증 규칙:**
- 같은 IP 1분 이내 중복 클릭 차단
- 시간당 IP당 최대 10클릭
- 봇 User-Agent 차단
- VPN/프록시 IP 감지
- 비정상 클릭 패턴 감지

---

#### 4.2 실시간 추적

**사용자 스토리:**
> "클릭이 발생하면 즉시 확인하고 싶다"

**기능 상세:**
- 실시간 클릭 알림
- 라이브 대시보드
- 클릭 히트맵
- 지역별 통계
- 시간대별 분석

**실시간 업데이트:**
```typescript
// 서버: 클릭 발생시 브로드캐스트
async function broadcastClick(click: ClickEvent) {
  await supabase.channel(`clicks:${click.campaign_id}`).send({
    type: 'broadcast',
    event: 'new_click',
    payload: {
      id: click.id,
      location: click.country,
      device: click.device_type,
      commission: click.commission_amount,
      timestamp: click.clicked_at
    }
  });
}

// 클라이언트: 실시간 구독
supabase.channel('clicks:campaign_123')
  .on('broadcast', { event: 'new_click' }, (payload) => {
    updateDashboard(payload);
    showNotification('새로운 클릭!');
  })
  .subscribe();
```

---

### 5. 정산 시스템

#### 5.1 수익 계산

**사용자 스토리:**
> "내 수익이 정확하고 투명하게 계산되길 원한다"

**기능 상세:**
- 실시간 수익 계산
- 레벨 보너스 적용
- 추천 보너스
- 일일/월간 집계
- 수익 히스토리

**수익 계산 로직:**
```typescript
interface EarningsCalculation {
  base_amount: number;
  level_bonus: number;
  referral_bonus: number;
  special_bonus: number;
  total: number;
}

async function calculateEarnings(userId: string): Promise<EarningsCalculation> {
  const user = await getUser(userId);
  const clicks = await getValidClicks(userId);
  
  const base = clicks.reduce((sum, c) => sum + c.cpc_rate, 0);
  const levelBonus = base * ((user.level - 1) * 0.01);
  const referralBonus = await getReferralBonus(userId);
  
  return {
    base_amount: base,
    level_bonus: levelBonus,
    referral_bonus: referralBonus,
    special_bonus: 0,
    total: base + levelBonus + referralBonus
  };
}
```

---

#### 5.2 출금 시스템

**사용자 스토리:**
> "쌓인 수익을 편리하게 출금하고 싶다"

**기능 상세:**
- 최소 출금액: ₩10,000
- 출금 수단: 계좌이체
- 출금 신청 → 검토 → 지급
- 자동 출금 설정
- 출금 히스토리

**출금 프로세스:**
```typescript
async function requestWithdrawal(
  userId: string,
  amount: number,
  account: BankAccount
) {
  // 1. 잔액 확인
  // 2. 최소 금액 검증
  // 3. 출금 요청 생성
  // 4. 관리자 승인 대기
  // 5. 자동 이체 처리
  
  const earnings = await getUserEarnings(userId);
  
  if (earnings.available < amount) {
    throw new Error('잔액 부족');
  }
  
  if (amount < MIN_WITHDRAWAL) {
    throw new Error('최소 출금액 미달');
  }
  
  const withdrawal = await createWithdrawal({
    user_id: userId,
    amount,
    account,
    status: 'pending'
  });
  
  await processWithdrawal(withdrawal.id);
}
```

---

### 6. 어뷰징 방지 시스템

#### 6.1 실시간 감지

**사용자 스토리:**
> "부정 클릭으로부터 시스템을 보호하고 싶다"

**기능 상세:**
- 패턴 분석
- IP 평판 조회
- 디바이스 핑거프린팅
- 머신러닝 모델
- 자동 차단

**감지 알고리즘:**
```typescript
interface FraudDetection {
  detectClickFarm(clicks: Click[]): boolean;
  detectBotActivity(userAgent: string): boolean;
  detectIPFarm(ips: string[]): boolean;
  detectPatternAnomaly(pattern: number[]): boolean;
}

async function detectFraud(userId: string): Promise<FraudScore> {
  const recentActivity = await getUserActivity(userId, '24h');
  
  const signals = {
    click_velocity: calculateClickVelocity(recentActivity),
    ip_diversity: calculateIPDiversity(recentActivity),
    time_pattern: analyzeTimePattern(recentActivity),
    device_consistency: checkDeviceConsistency(recentActivity)
  };
  
  const fraudScore = await MLModel.predict(signals);
  
  if (fraudScore > 0.8) {
    await suspendUser(userId, 'fraud_detection');
    await notifyAdmin('High fraud score detected', { userId, score: fraudScore });
  }
  
  return fraudScore;
}
```

**방지 조치:**
- 계정 일시 정지
- 캠페인 중단
- IP 차단
- 수익 보류
- 수동 검토

---

#### 6.2 사후 검증

**사용자 스토리:**
> "의심스러운 활동을 검토하고 조치하고 싶다"

**기능 상세:**
- 이상 패턴 리포트
- 수동 검토 대기열
- 증거 수집
- 결정 및 조치
- 이의 신청

**검토 프로세스:**
```typescript
async function reviewSuspiciousActivity(
  logId: string,
  adminId: string,
  decision: ReviewDecision
) {
  const log = await getFraudLog(logId);
  
  const review = {
    reviewed_by: adminId,
    reviewed_at: new Date(),
    decision,
    action: determineAction(decision)
  };
  
  await updateFraudLog(logId, review);
  
  switch (decision) {
    case 'confirmed':
      await executeAction(log.user_id, review.action);
      break;
    case 'false_positive':
      await restoreUser(log.user_id);
      await compensate(log.user_id);
      break;
    case 'needs_investigation':
      await escalateToSeniorAdmin(logId);
      break;
  }
}
```

---

### 7. 분석 시스템

#### 7.1 캠페인 분석

**사용자 스토리:**
> "캠페인 성과를 상세히 분석하고 싶다"

**기능 상세:**
- 실시간 대시보드
- 클릭 추이 그래프
- 전환율 분석
- ROI 계산
- 비교 분석

**분석 메트릭:**
```typescript
interface CampaignMetrics {
  impressions: number;
  clicks: number;
  ctr: number;
  unique_users: number;
  total_spent: number;
  avg_cpc: number;
  conversions: number;
  conversion_rate: number;
  roi: number;
}

async function analyzeCampaign(
  campaignId: string,
  dateRange: DateRange
): Promise<CampaignAnalytics> {
  const clicks = await getClicks(campaignId, dateRange);
  const users = await getUniqueUsers(campaignId, dateRange);
  
  return {
    summary: calculateSummary(clicks),
    daily_breakdown: groupByDay(clicks),
    hourly_pattern: analyzeHourlyPattern(clicks),
    platform_performance: groupByPlatform(clicks),
    user_quality: analyzeUserQuality(users),
    recommendations: generateRecommendations(clicks)
  };
}
```

---

#### 7.2 사용자 분석

**사용자 스토리:**
> "내 활동과 성과를 분석하고 개선하고 싶다"

**기능 상세:**
- 활동 대시보드
- 수익 추이
- 최적 시간대 분석
- 플랫폼별 성과
- 개선 제안

**분석 인사이트:**
```typescript
async function generateInsights(userId: string): Promise<UserInsights> {
  const activity = await getUserActivity(userId, '30d');
  
  return {
    best_performing_time: findBestTime(activity),
    best_platform: findBestPlatform(activity),
    quality_score: calculateQualityScore(activity),
    growth_trend: calculateGrowthTrend(activity),
    recommendations: [
      'Instagram에서 더 나은 성과를 보이고 있습니다',
      '오후 2-4시 게시물이 가장 효과적입니다',
      '해시태그 #여름세일 사용시 클릭률 30% 상승'
    ]
  };
}
```

## 🚀 개발 우선순위

### MVP (4주)
✅ 필수 기능
- [ ] 사용자 회원가입/로그인
- [ ] 광고주 등록
- [ ] 캠페인 생성 (기본)
- [ ] 템플릿 복사
- [ ] 클릭 추적 (기본)
- [ ] 수익 확인

### Phase 1 (4주 추가)
🔄 운영 필수
- [ ] SNS 계정 인증
- [ ] 어뷰징 감지 (기본)
- [ ] 결제 시스템
- [ ] 출금 시스템
- [ ] 실시간 대시보드
- [ ] 관리자 도구

### Phase 2 (4주 추가)
🎯 차별화
- [ ] 레벨 시스템 완성
- [ ] AI 템플릿 생성
- [ ] 고급 타겟팅
- [ ] 상세 분석
- [ ] 자동화 도구
- [ ] 모바일 앱

### Phase 3 (장기)
🌍 확장
- [ ] 다국어 지원
- [ ] 글로벌 결제
- [ ] API 공개
- [ ] 파트너 연동
- [ ] 블록체인 투명성

## 📊 성공 지표 (KPI)

### 사용자 지표
| 지표 | 목표 | 측정 방법 |
|-----|------|----------|
| MAU | 10,000명 | 월간 활성 사용자 |
| 리텐션 | 40% | 30일 재방문율 |
| 평균 수익 | ₩50,000 | 사용자당 월 수익 |
| NPS | 50+ | 추천 의향 점수 |

### 비즈니스 지표
| 지표 | 목표 | 측정 방법 |
|-----|------|----------|
| GMV | ₩1억 | 월간 거래액 |
| Take Rate | 20% | 플랫폼 수수료율 |
| CAC | ₩5,000 | 고객 획득 비용 |
| LTV | ₩100,000 | 고객 생애 가치 |

### 기술 지표
| 지표 | 목표 | 측정 방법 |
|-----|------|----------|
| 응답 시간 | <200ms | P95 API 응답 |
| 가동률 | 99.9% | 월간 가동률 |
| 에러율 | <0.1% | 500 에러 비율 |
| 클릭 검증 | <100ms | 검증 처리 시간 |

## 🔄 반복 개선 전략

### A/B 테스트
- 온보딩 플로우
- CPC 가격 정책
- 레벨 보상 체계
- UI/UX 개선

### 사용자 피드백
- 월간 사용자 설문
- 포커스 그룹 인터뷰
- 베타 테스터 프로그램
- 커뮤니티 포럼

### 데이터 기반 개선
- 퍼널 분석
- 코호트 분석
- 히트맵 분석
- 사용자 행동 분석

---

이 기능 명세서는 Treit 플랫폼의 핵심 기능과 개발 로드맵을 정의합니다. 각 기능은 사용자 가치를 중심으로 설계되었으며, 단계적으로 구현 가능하도록 구성되었습니다.