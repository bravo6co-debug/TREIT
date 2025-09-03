# TreitMaster 테스트 가이드

## 개요

TreitMaster 프로젝트의 테스트 환경 설정 및 실행 방법을 설명합니다.

## 테스트 구조

```
tests/
├── integration/          # 통합 테스트
│   ├── user-flow.test.ts
│   ├── advertiser-flow.test.ts
│   ├── admin-flow.test.ts
│   └── payment-flow.test.ts
├── e2e/                  # End-to-End 테스트
│   └── full-flow.spec.ts
├── setup.ts              # 테스트 설정
└── ...
```

## 테스트 환경 설정

### 1. 의존성 설치

```bash
# 루트 디렉토리에서 모든 의존성 설치
npm run install:all

# 또는 개별 설치
npm install
cd treit-app && npm install
cd ../treit-advertiser && npm install
cd ../treit-admin && npm install
```

### 2. 환경 변수 설정

각 앱의 `.env.local` 파일을 생성하고 다음 변수들을 설정합니다:

```env
# Supabase 설정
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# 테스트 환경 설정
NODE_ENV=test
VITE_APP_ENV=test

# API 엔드포인트
VITE_API_BASE_URL=http://localhost:54321
```

### 3. Supabase 로컬 환경 시작

```bash
npm run supabase:start
```

## 테스트 실행

### 통합 테스트 (Jest)

```bash
# 모든 통합 테스트 실행
npm run test:integration

# 특정 테스트 파일 실행
npm run test:integration -- user-flow.test.ts

# 감시 모드로 실행
npm run test:watch

# 커버리지와 함께 실행
npm run test:integration -- --coverage
```

### E2E 테스트 (Playwright)

```bash
# E2E 테스트 실행 (헤드리스)
npm run test:e2e

# UI 모드로 실행
npx playwright test --ui

# 특정 브라우저에서 실행
npx playwright test --project=chromium

# 헤드 모드로 실행 (브라우저 보기)
npx playwright test --headed
```

### 유닛 테스트 (Vitest)

```bash
# 유닛 테스트 실행
npm run test:unit

# UI 모드로 실행
npm run test:unit:ui

# 감시 모드로 실행
npm run test:watch
```

### 모든 테스트 실행

```bash
npm test
```

## 테스트 시나리오

### 사용자 플로우 테스트 (user-flow.test.ts)

- **회원가입 및 로그인**
  - 신규 사용자 회원가입
  - 기존 사용자 로그인
  - 잘못된 인증 정보 처리

- **캠페인 참여**
  - 캠페인 목록 조회
  - 캠페인 상세 정보 확인
  - 캠페인 참여 신청
  - 태스크 완료

- **리워드 시스템**
  - XP 획득
  - 레벨업
  - 일일 보너스 받기
  - 출석 체크

- **추천 시스템**
  - 추천 링크 생성
  - 추천 보상 지급

- **사용자 프로필**
  - 프로필 정보 수정
  - 소셜 계정 연동

### 광고주 플로우 테스트 (advertiser-flow.test.ts)

- **회원가입 및 인증**
  - 광고주 회원가입
  - 사업자 정보 등록
  - 서류 업로드 및 인증

- **캠페인 관리**
  - 새 캠페인 생성
  - 캠페인 목록 확인
  - 캠페인 상태 변경 (시작, 일시정지, 종료)
  - 캠페인 수정

- **예산 및 결제**
  - 계정 크레딧 충전
  - 캠페인 예산 설정
  - 결제 내역 확인

- **분석 및 리포트**
  - 캠페인 성과 확인
  - 참여자 데이터 분석
  - 클릭 추적 데이터 확인

- **딥링크 관리**
  - 딥링크 생성
  - 추적 파라미터 설정

### 관리자 플로우 테스트 (admin-flow.test.ts)

- **대시보드 및 모니터링**
  - 관리자 로그인
  - 대시보드 통계 확인
  - 실시간 시스템 모니터링

- **사용자 관리**
  - 사용자 목록 조회
  - 사용자 상세 정보 확인
  - 사용자 계정 정지/활성화
  - 사용자 활동 내역 조회

- **캠페인 승인**
  - 승인 대기 캠페인 목록
  - 캠페인 승인/거절
  - 캠페인 강제 중단

- **정산 관리**
  - 정산 요청 목록
  - 정산 승인/거절
  - 정산 내역 확인

- **사기 탐지**
  - 사기 의심 활동 감지
  - 알림 처리
  - 사용자 제재

### 결제 플로우 테스트 (payment-flow.test.ts)

- **광고주 결제**
  - 계정 충전
  - 결제 실패 처리
  - 결제 내역 확인

- **사용자 정산**
  - 정산 요청
  - 정산 내역 확인
  - 정산 취소

- **캠페인 비용 처리**
  - 캠페인 생성 시 비용 차감
  - 잔액 부족 처리
  - 환불 처리

- **보안 및 검증**
  - 결제 정보 암호화
  - 사기 거래 탐지
  - 추가 인증 절차

## E2E 테스트 시나리오

### 전체 사용자 여정 (Complete User Journey)

1. **사용자 등록 및 로그인**
2. **프로필 설정 완료**
3. **캠페인 찾기 및 참여**
4. **태스크 완료 및 보상 받기**
5. **일일 보너스 획득**
6. **XP 및 레벨 진행 확인**
7. **추천 링크 생성**
8. **정산 요청**

### 광고주 전체 여정 (Complete Advertiser Journey)

1. **광고주 등록 및 사업자 인증**
2. **계정 크레딧 충전**
3. **새 캠페인 생성**
4. **딥링크 생성**
5. **캠페인 성과 모니터링**
6. **예산 관리**

### 관리자 전체 여정 (Complete Admin Journey)

1. **관리자 로그인**
2. **대시보드 메트릭 확인**
3. **사용자 관리**
4. **캠페인 승인**
5. **정산 처리**
6. **시스템 모니터링**
7. **사기 탐지 알림 처리**

### 플랫폼 간 연동 (Cross-Platform Integration)

1. **광고주가 캠페인 생성**
2. **관리자가 캠페인 승인**
3. **사용자가 승인된 캠페인 참여**
4. **태스크 완료 및 보상 지급**
5. **광고주가 참여 분석 확인**
6. **관리자가 전체 활동 모니터링**

## 테스트 데이터

### 테스트 사용자 계정

```typescript
const testAccounts = {
  user: {
    email: 'testuser@example.com',
    password: 'testpassword123'
  },
  advertiser: {
    email: 'advertiser@example.com',
    password: 'advertiser123',
    businessName: '테스트 주식회사'
  },
  admin: {
    email: 'admin@treitmaster.com',
    password: 'admin123'
  }
};
```

### 모킹 데이터

테스트에서는 다음 데이터들이 모킹됩니다:

- Supabase 클라이언트 및 API 호출
- 결제 게이트웨이 응답
- 외부 API 호출
- 파일 업로드
- 실시간 구독

## 테스트 커버리지

현재 목표 커버리지:

- **통합 테스트**: 핵심 비즈니스 플로우 80% 이상
- **E2E 테스트**: 주요 사용자 여정 100%
- **유닛 테스트**: 유틸리티 함수 및 컴포넌트 70% 이상

### 커버리지 확인

```bash
npm run test:integration -- --coverage
```

커버리지 리포트는 `coverage/` 디렉토리에 생성됩니다.

## CI/CD 환경에서의 테스트

GitHub Actions에서 자동으로 실행되는 테스트:

1. **통합 테스트**: 모든 PR 및 main 브랜치 푸시 시
2. **E2E 테스트**: 릴리즈 전 및 주요 기능 배포 시
3. **성능 테스트**: 정기적으로 실행

## 트러블슈팅

### 자주 발생하는 문제

1. **Supabase 연결 실패**
   ```bash
   # Supabase 로컬 환경 재시작
   npm run supabase:restart
   ```

2. **포트 충돌**
   ```bash
   # 사용 중인 포트 확인
   netstat -tulpn | grep :9000
   
   # 프로세스 종료
   kill -9 <PID>
   ```

3. **테스트 타임아웃**
   - `jest.config.js`에서 `testTimeout` 값 증가
   - Playwright 설정에서 `timeout` 값 조정

4. **브라우저 실행 실패 (Playwright)**
   ```bash
   # Playwright 브라우저 재설치
   npx playwright install
   ```

### 디버깅

#### Jest 테스트 디버깅

```bash
# 디버그 모드로 실행
node --inspect-brk node_modules/.bin/jest --runInBand --no-cache tests/integration/user-flow.test.ts
```

#### Playwright 테스트 디버깅

```bash
# 디버그 모드로 실행
npx playwright test --debug

# 특정 테스트만 디버그
npx playwright test tests/e2e/full-flow.spec.ts --debug
```

## 모범 사례

### 테스트 작성 가이드라인

1. **AAA 패턴 사용**: Arrange, Act, Assert
2. **의미 있는 테스트 이름**: 테스트 목적을 명확히 표현
3. **독립적인 테스트**: 다른 테스트에 의존하지 않도록 작성
4. **적절한 모킹**: 외부 의존성은 모킹하되, 과도한 모킹 지양
5. **데이터 정리**: 테스트 후 생성된 데이터 정리

### 성능 최적화

1. **병렬 실행**: Jest와 Playwright 모두 병렬 실행 활용
2. **선택적 테스트**: 변경된 부분과 관련된 테스트만 실행
3. **캐싱**: 테스트 결과 및 의존성 캐싱 활용
4. **리소스 제한**: 메모리 사용량 및 실행 시간 제한

## 추가 리소스

- [Jest 공식 문서](https://jestjs.io/docs/getting-started)
- [Playwright 공식 문서](https://playwright.dev/)
- [Vitest 공식 문서](https://vitest.dev/)
- [Testing Library 문서](https://testing-library.com/)
- [Supabase 테스팅 가이드](https://supabase.com/docs/guides/getting-started/local-development)

## 지원

테스트 관련 문제나 질문이 있으신 경우:

1. GitHub Issues에서 관련 이슈 검색
2. 새로운 이슈 생성 (적절한 라벨과 함께)
3. 팀 Slack 채널에서 논의

---

*이 문서는 지속적으로 업데이트됩니다. 최신 버전은 항상 GitHub 저장소에서 확인하세요.*