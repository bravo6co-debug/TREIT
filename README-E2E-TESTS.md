# TreitMaster E2E Testing Suite

TreitMaster에 완성된 End-to-End (E2E) 테스트 스위트입니다. Playwright를 사용하여 실제 사용자 시나리오를 기반으로 한 포괄적인 테스트를 제공합니다.

## 🚀 주요 특징

### 1. 멀티 앱 테스팅 지원
- **User App** (localhost:3000): 일반 사용자 애플리케이션
- **Advertiser App** (localhost:3001): 광고주 애플리케이션  
- **Admin App** (localhost:3002): 관리자 애플리케이션

### 2. 포괄적인 테스트 커버리지
- **사용자 여정 테스트**: 회원가입 → 캠페인 참여 → 수익 확인
- **광고주 워크플로우**: 계정 생성 → 캠페인 관리 → 성과 분석
- **관리자 기능**: 사용자 관리 → 캠페인 승인 → 정산 처리
- **보안 테스트**: XSS, SQL 인젝션, CSP 등 보안 취약점 검증
- **성능 테스트**: 페이지 로드, API 응답, 메모리 사용량 모니터링

### 3. 크로스 브라우저 & 디바이스 테스팅
- **데스크톱**: Chrome, Firefox, Safari, Edge
- **모바일**: iOS Safari, Android Chrome
- **태블릿**: iPad Pro 최적화

### 4. CI/CD 통합
- GitHub Actions 자동화
- 실패 시 스크린샷/비디오 자동 저장
- 보안/성능 테스트 결과 자동 리포팅

## 📁 테스트 구조

```
tests/
├── e2e/                          # E2E 테스트 파일들
│   ├── security.spec.ts          # 보안 테스트
│   ├── user-journey.spec.ts      # 사용자 여정 테스트
│   ├── advertiser-journey.spec.ts # 광고주 워크플로우 테스트
│   ├── admin-journey.spec.ts     # 관리자 기능 테스트
│   ├── performance.spec.ts       # 성능 테스트
│   └── full-flow.spec.ts         # 기존 통합 테스트
├── auth/                         # 인증 설정
│   └── auth-setup.spec.ts        # 인증 상태 생성
├── global-setup.ts               # 전역 설정
└── global-teardown.ts            # 전역 정리
```

## 🛠️ 설치 및 설정

### 1. 의존성 설치
```bash
npm install
npx playwright install --with-deps
```

### 2. Supabase 설정
```bash
npx supabase start
npx supabase db reset
npx supabase db seed
```

### 3. 개발 서버 시작
```bash
npm run dev  # 모든 앱 동시 실행
```

## 🧪 테스트 실행

### 전체 테스트 실행
```bash
npm run test:e2e
# 또는
npx playwright test
```

### 특정 테스트 스위트 실행
```bash
# 사용자 여정 테스트
npx playwright test --grep "@user-app"

# 보안 테스트
npx playwright test --grep "@security"

# 성능 테스트
npx playwright test --grep "@performance"

# 모바일 테스트
npx playwright test --grep "@mobile"
```

### 특정 브라우저에서 실행
```bash
# Chrome에서만 실행
npx playwright test --project=user-app-chrome

# 모든 브라우저에서 실행
npx playwright test --project=user-app-chrome --project=user-app-firefox --project=user-app-safari
```

### UI 모드로 실행 (디버깅)
```bash
npx playwright test --ui
```

### 헤드리스 모드 비활성화 (브라우저 보기)
```bash
npx playwright test --headed
```

## 📊 테스트 상세 내용

### 1. 보안 테스트 (`@security`)
- **XSS 방어**: 사용자 입력 필드에서 스크립트 실행 차단 확인
- **SQL 인젝션 방어**: 로그인, 검색 등에서 SQL 인젝션 시도 차단 확인
- **환경변수 보호**: 클라이언트 측에서 민감한 환경변수 노출 방지 확인
- **CSP 정책**: Content Security Policy 헤더 설정 및 동작 확인
- **URL 보안**: 경로 탐색 공격 및 악성 URL 처리 확인
- **인증 보안**: JWT 토큰 보안 저장 및 세션 관리 확인

### 2. 사용자 여정 테스트 (`@user-app`)
- **회원가입 플로우**: 계정 생성 → 이메일 인증 → 프로필 설정
- **캠페인 참여**: 캠페인 검색 → 조건 확인 → 참여 → 과제 완료
- **레벨 시스템**: XP 획득 → 레벨업 → 보상 수령
- **일일 보너스**: 출석 체크 → 연속 출석 보너스
- **추천 시스템**: 추천 링크 생성 → 친구 초대 → 보상 획득
- **정산 시스템**: 수익 확인 → 정산 신청 → 승인 대기

### 3. 광고주 워크플로우 테스트 (`@advertiser-app`)
- **계정 설정**: 사업자 등록 → 서류 인증 → 계정 승인
- **결제 시스템**: 크레딧 충전 → 결제 처리 → 잔액 관리
- **캠페인 관리**: 캠페인 생성 → 타겟팅 설정 → 예산 관리
- **성과 분석**: 실시간 통계 → 사용자 분석 → ROI 계산
- **딥링크 생성**: UTM 파라미터 설정 → 링크 생성 → 추적
- **템플릿 관리**: 콘텐츠 템플릿 → 재사용 → 최적화

### 4. 관리자 기능 테스트 (`@admin-app`)
- **대시보드**: 실시간 메트릭 → 시스템 상태 → 알림 관리
- **사용자 관리**: 사용자 검색 → 계정 상태 → 제재 처리
- **캠페인 승인**: 캠페인 검토 → 정책 준수 확인 → 승인/거부
- **정산 처리**: 정산 요청 검토 → 계좌 확인 → 승인 처리
- **사기 탐지**: 의심 활동 감지 → 조사 → 조치 결정
- **재무 관리**: 수익 분석 → 정산 의무 → 세금 관리

### 5. 성능 테스트 (`@performance`)
- **페이지 로드 성능**: 초기 로딩 시간 < 5초
- **API 응답 성능**: API 호출 응답 시간 < 2초
- **메모리 사용량**: JS 힙 사용량 < 100MB
- **네트워크 최적화**: 리소스 크기 및 중복 요청 모니터링
- **웹 바이탈**: FCP, LCP, CLS 임계값 확인
- **동시 사용자**: 다중 컨텍스트로 동시 접속 시뮬레이션

## 📱 모바일 테스팅

모바일 디바이스에서의 사용자 경험을 검증합니다:

### 지원 디바이스
- **iPhone SE**: 375x667 (소형 스크린)
- **Pixel 5**: 393x851 (Android 표준)
- **iPad Pro**: 1024x1366 (태블릿)

### 모바일 특화 테스트
- 터치 인터랙션
- 스와이프 제스처
- 모바일 네비게이션
- 반응형 레이아웃
- 모바일 키보드 처리

## 🔧 설정 파일

### playwright.config.ts
```typescript
export default defineConfig({
  // 3개 앱 동시 테스트 지원
  webServer: [
    { command: 'npm run dev:user', port: 3000 },
    { command: 'npm run dev:advertiser', port: 3001 },
    { command: 'npm run dev:admin', port: 3002 },
    { command: 'npm run supabase:start', port: 54321 }
  ],
  
  // 다양한 브라우저 및 디바이스 지원
  projects: [
    { name: 'user-app-chrome', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-user-chrome', use: { ...devices['Pixel 5'] } },
    // ... 더 많은 설정
  ]
});
```

## 📈 CI/CD 통합

### GitHub Actions 워크플로우
- **자동 실행**: PR, 푸시, 스케줄링
- **매트릭스 빌드**: 여러 브라우저/디바이스 병렬 테스트
- **아티팩트**: 실패 시 스크린샷, 비디오, 트레이스 자동 업로드
- **리포팅**: 테스트 결과 PR 코멘트 자동 생성

### 실행 조건
```yaml
# 매일 오전 2시 자동 실행
schedule:
  - cron: '0 2 * * *'

# 보안 관련 파일 변경 시 보안 테스트 실행
# 성능 관련 파일 변경 시 성능 테스트 실행
```

## 🐛 디버깅

### 실패한 테스트 디버깅
```bash
# UI 모드로 실행하여 단계별 확인
npx playwright test --ui

# 특정 테스트만 헤드풀 모드로 실행
npx playwright test user-journey.spec.ts --headed

# 디버그 모드로 실행
npx playwright test --debug
```

### 스크린샷 및 비디오
- 실패 시 자동으로 `test-results/` 폴더에 저장
- 각 테스트별로 타임스탬프와 함께 정리

### 트레이스 뷰어
```bash
npx playwright show-trace test-results/trace.zip
```

## 📋 테스트 작성 가이드라인

### 1. 테스트 태그 활용
```typescript
// 테스트 카테고리 태그 지정
test('@user-app @mobile 모바일 회원가입', async ({ page }) => {
  // 테스트 코드
});
```

### 2. 안정적인 선택자 사용
```typescript
// data-testid 속성 사용 권장
await page.click('[data-testid="login-button"]');

// CSS 선택자보다는 의미있는 속성 사용
await page.fill('[data-testid="email-input"]', 'user@example.com');
```

### 3. 적절한 대기 시간
```typescript
// 네트워크 요청 완료까지 대기
await page.waitForLoadState('networkidle');

// 특정 요소가 나타날 때까지 대기
await page.waitForSelector('[data-testid="dashboard"]');
```

### 4. 에러 핸들링
```typescript
try {
  await page.waitForSelector('[data-testid="success-message"]', { timeout: 5000 });
} catch (error) {
  // 대안적인 흐름 처리
  await page.click('[data-testid="retry-button"]');
}
```

## 🔗 관련 문서

- [Playwright 공식 문서](https://playwright.dev/)
- [TreitMaster API 문서](./API.md)
- [보안 가이드라인](./SECURITY.md)
- [아키텍처 문서](./ARCHITECTURE.md)

## ❓ 자주 묻는 질문

### Q: 테스트가 실패할 때 어떻게 해야 하나요?
A: 
1. `test-results/` 폴더에서 스크린샷과 비디오 확인
2. `--ui` 모드로 테스트를 다시 실행해서 단계별 확인
3. 로그에서 구체적인 오류 메시지 확인

### Q: 새로운 테스트를 추가하려면?
A:
1. 해당 카테고리의 `.spec.ts` 파일에 추가
2. 적절한 태그(`@user-app`, `@security` 등) 지정
3. `data-testid` 속성을 사용한 안정적인 선택자 사용

### Q: CI에서만 실패하는 테스트는 어떻게 디버깅하나요?
A:
1. GitHub Actions 아티팩트에서 스크린샷/비디오 다운로드
2. 로컬에서 `CI=true` 환경변수 설정 후 테스트 실행
3. 타이밍 이슈인 경우 대기 시간 조정

---

TreitMaster E2E 테스트 스위트는 애플리케이션의 품질과 안정성을 보장하기 위한 포괄적인 테스트 환경을 제공합니다. 지속적인 테스트를 통해 사용자에게 안정적인 서비스를 제공할 수 있습니다.