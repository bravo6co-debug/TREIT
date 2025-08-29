# TreitMaster 문제 해결 가이드

## 개요

TreitMaster 프로젝트 개발, 배포, 운영 중 발생할 수 있는 일반적인 문제들과 해결 방법을 제시합니다.

## 목차

- [개발 환경 문제](#개발-환경-문제)
- [Supabase 관련 문제](#supabase-관련-문제)
- [빌드 및 배포 문제](#빌드-및-배포-문제)
- [런타임 에러](#런타임-에러)
- [성능 문제](#성능-문제)
- [데이터베이스 문제](#데이터베이스-문제)
- [인증 및 권한 문제](#인증-및-권한-문제)
- [결제 시스템 문제](#결제-시스템-문제)
- [테스트 문제](#테스트-문제)

---

## 개발 환경 문제

### 문제: `npm install` 실패

**증상:**
```
npm ERR! Cannot resolve dependency
npm ERR! peer dependency warnings
```

**해결 방법:**
```bash
# 1. Node.js 버전 확인 (18+ 필요)
node --version

# 2. npm 캐시 정리
npm cache clean --force

# 3. node_modules 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install

# 4. 각 앱별로 개별 설치
cd treit-app && npm install
cd ../treit-advertiser && npm install
cd ../treit-admin && npm install
```

### 문제: 포트 충돌

**증상:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**해결 방법:**
```bash
# 1. 사용 중인 프로세스 확인
lsof -ti :3000
# 또는 Windows에서
netstat -ano | findstr :3000

# 2. 프로세스 종료
kill -9 <PID>
# 또는 Windows에서
taskkill /PID <PID> /F

# 3. 다른 포트 사용
# package.json에서 --port 옵션 변경
"dev": "vite --port 3003"
```

### 문제: 환경 변수 로드 안됨

**증상:**
```
undefined is not an object (evaluating 'process.env.VITE_SUPABASE_URL')
```

**해결 방법:**
```bash
# 1. .env 파일 생성 확인
ls -la | grep .env

# 2. 변수 이름 확인 (VITE_ 접두사 필수)
echo $VITE_SUPABASE_URL

# 3. 서버 재시작
npm run dev

# 4. .env.example 파일 참고하여 필요한 변수 추가
cp .env.example .env.local
```

---

## Supabase 관련 문제

### 문제: Supabase 로컬 서버 시작 실패

**증상:**
```
Error: Docker not found
supabase start failed
```

**해결 방법:**
```bash
# 1. Docker 설치 확인
docker --version

# 2. Docker 서비스 시작
# macOS/Linux
sudo systemctl start docker
# Windows
# Docker Desktop 실행

# 3. Supabase CLI 업데이트
npm install -g supabase@latest

# 4. Supabase 재시작
supabase stop
supabase start
```

### 문제: 데이터베이스 연결 실패

**증상:**
```
PostgresError: connection to server on socket failed
```

**해결 방법:**
```bash
# 1. Supabase 상태 확인
supabase status

# 2. 데이터베이스 리셋
supabase db reset

# 3. 마이그레이션 재적용
supabase db push

# 4. 환경 변수 확인
echo $SUPABASE_DB_URL
```

### 문제: RLS (Row Level Security) 정책 오류

**증상:**
```
Error: new row violates row-level security policy
```

**해결 방법:**
```sql
-- 1. 현재 사용자 확인
SELECT auth.uid();

-- 2. RLS 정책 확인
SELECT * FROM pg_policies WHERE tablename = 'your_table';

-- 3. 정책 수정 또는 비활성화 (개발 시에만)
ALTER TABLE your_table DISABLE ROW LEVEL SECURITY;

-- 4. 정책 재생성
CREATE POLICY "Users can access own data" ON your_table
  FOR ALL USING (auth.uid() = user_id);
```

---

## 빌드 및 배포 문제

### 문제: TypeScript 컴파일 에러

**증상:**
```
Type 'undefined' is not assignable to type 'string'
Property 'xxx' does not exist on type 'yyy'
```

**해결 방법:**
```bash
# 1. TypeScript 버전 확인
npx tsc --version

# 2. 타입 정의 파일 확인
ls node_modules/@types/

# 3. tsconfig.json 설정 확인
cat tsconfig.json

# 4. 타입 에러 수정
# - optional chaining 사용: obj?.property
# - 타입 가드 추가: if (typeof x === 'string')
# - 타입 단언 사용: x as string (주의해서 사용)
```

### 문제: Vite 빌드 실패

**증상:**
```
Build failed with errors
RollupError: Could not resolve import
```

**해결 방법:**
```bash
# 1. 의존성 재설치
rm -rf node_modules package-lock.json
npm install

# 2. vite.config.ts 확인
# - alias 설정 확인
# - plugin 설정 확인

# 3. import 경로 확인
# 절대 경로 사용: import { component } from '@/components/component'
# 상대 경로 확인: import { util } from '../utils/util'
```

### 문제: 배포 후 404 에러

**증상:**
```
Cannot GET /some-route
404 Not Found
```

**해결 방법:**
```json
// vercel.json
{
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}

// _redirects (Netlify)
/*    /index.html   200
```

---

## 런타임 에러

### 문제: React Hydration Mismatch

**증상:**
```
Warning: Text content did not match. Server: "..." Client: "..."
Hydration failed because the initial UI does not match
```

**해결 방법:**
```typescript
// 1. useEffect로 클라이언트 전용 코드 분리
const [isClient, setIsClient] = useState(false);

useEffect(() => {
  setIsClient(true);
}, []);

if (!isClient) return <div>Loading...</div>;

// 2. suppressHydrationWarning 사용 (필요한 경우만)
<div suppressHydrationWarning>{new Date().toLocaleString()}</div>
```

### 문제: 무한 리렌더링

**증상:**
```
Maximum update depth exceeded
Too many re-renders
```

**해결 방법:**
```typescript
// 1. useEffect 의존성 배열 확인
useEffect(() => {
  fetchData();
}, []); // 빈 배열로 한 번만 실행

// 2. useCallback으로 함수 메모이제이션
const handleClick = useCallback(() => {
  // handler logic
}, [dependency]);

// 3. useMemo로 값 메모이제이션
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(props.data);
}, [props.data]);
```

### 문제: 메모리 누수

**증상:**
```
Heap out of memory
Performance degradation over time
```

**해결 방법:**
```typescript
// 1. useEffect cleanup
useEffect(() => {
  const subscription = subscribe();
  return () => {
    subscription.unsubscribe();
  };
}, []);

// 2. 이벤트 리스너 정리
useEffect(() => {
  const handleResize = () => {};
  window.addEventListener('resize', handleResize);
  
  return () => {
    window.removeEventListener('resize', handleResize);
  };
}, []);

// 3. 타이머 정리
useEffect(() => {
  const timer = setInterval(() => {}, 1000);
  
  return () => {
    clearInterval(timer);
  };
}, []);
```

---

## 성능 문제

### 문제: 초기 로딩 시간 느림

**증상:**
- First Contentful Paint > 3s
- 번들 크기 > 1MB

**해결 방법:**
```typescript
// 1. 코드 분할
const LazyComponent = lazy(() => import('./LazyComponent'));

// 2. 번들 분석
npm run build:analyze

// 3. 불필요한 의존성 제거
npm ls --depth=0
npm uninstall unused-package

// 4. 이미지 최적화
// WebP 포맷 사용, 적절한 크기로 리사이징
```

### 문제: 런타임 성능 느림

**증상:**
- 클릭 반응 지연
- 스크롤 끊김
- CPU 사용량 높음

**해결 방법:**
```typescript
// 1. React.memo로 불필요한 리렌더링 방지
const MemoizedComponent = memo(({ data }) => {
  return <div>{data.name}</div>;
});

// 2. 가상화 리스트 사용 (react-window)
import { FixedSizeList as List } from 'react-window';

// 3. 디바운싱
const debouncedSearch = useMemo(
  () => debounce((query) => search(query), 300),
  []
);
```

---

## 데이터베이스 문제

### 문제: 쿼리 성능 저하

**증상:**
```
Query took too long to execute
Timeout error
```

**해결 방법:**
```sql
-- 1. 실행 계획 확인
EXPLAIN ANALYZE SELECT * FROM campaigns WHERE status = 'active';

-- 2. 인덱스 추가
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_created_at ON campaigns(created_at DESC);

-- 3. 쿼리 최적화
-- 필요한 컬럼만 선택
SELECT id, title, status FROM campaigns WHERE status = 'active';

-- 4. 페이지네이션 사용
SELECT * FROM campaigns 
WHERE status = 'active' 
ORDER BY created_at DESC 
LIMIT 10 OFFSET 0;
```

### 문제: 데이터베이스 연결 풀 고갈

**증상:**
```
Error: remaining connection slots are reserved
Too many connections
```

**해결 방법:**
```typescript
// 1. 연결 풀 설정 조정
const supabase = createClient(url, key, {
  db: {
    schema: 'public',
    poolSize: 10, // 연결 풀 크기 조정
  },
});

// 2. 연결 해제 확인
try {
  const { data, error } = await supabase
    .from('table')
    .select();
} finally {
  // 필요한 경우 명시적 연결 해제
}
```

---

## 인증 및 권한 문제

### 문제: 로그인 실패

**증상:**
```
Invalid login credentials
User not found
```

**해결 방법:**
```typescript
// 1. 이메일 확인 상태 체크
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

if (error?.message === 'Email not confirmed') {
  // 이메일 재전송 안내
}

// 2. 비밀번호 재설정
const { error } = await supabase.auth.resetPasswordForEmail(
  'user@example.com'
);
```

### 문제: 권한 없음 에러

**증상:**
```
Permission denied for table
Insufficient permissions
```

**해결 방법:**
```sql
-- 1. 사용자 역할 확인
SELECT auth.role();

-- 2. 테이블 권한 확인
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'your_table';

-- 3. RLS 정책 확인 및 수정
SELECT * FROM pg_policies WHERE tablename = 'your_table';
```

---

## 결제 시스템 문제

### 문제: 결제 실패

**증상:**
```
Payment processing failed
Card declined
```

**해결 방법:**
```typescript
// 1. 결제 상태 확인
const checkPaymentStatus = async (paymentId: string) => {
  const { data, error } = await supabase
    .from('transactions')
    .select('status, error_message')
    .eq('id', paymentId)
    .single();
    
  return data;
};

// 2. 재시도 로직
const retryPayment = async (paymentData: any, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await processPayment(paymentData);
      return result;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

### 문제: 정산 처리 지연

**증상:**
```
Settlement processing stuck
Amount not updated
```

**해결 방법:**
```sql
-- 1. 정산 상태 확인
SELECT * FROM settlement_requests 
WHERE status = 'processing' 
AND created_at < NOW() - INTERVAL '1 hour';

-- 2. 수동 정산 처리
UPDATE settlement_requests 
SET status = 'completed', 
    processed_at = NOW() 
WHERE id = 'settlement_id';

-- 3. 사용자 잔액 업데이트
UPDATE users 
SET balance = balance + settlement_amount 
WHERE id = 'user_id';
```

---

## 테스트 문제

### 문제: 테스트 실패 (타임아웃)

**증상:**
```
Test timeout exceeded
Jest did not exit one second after the test run completed
```

**해결 방법:**
```javascript
// jest.config.js
module.exports = {
  testTimeout: 10000, // 10초로 증가
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
};

// 테스트에서 async/await 사용
test('should fetch data', async () => {
  const data = await fetchData();
  expect(data).toBeDefined();
});
```

### 문제: Mocking 실패

**증상:**
```
Cannot find module 'moduleName'
Mock implementation missing
```

**해결 방법:**
```javascript
// __mocks__/supabase.js
export const createClient = jest.fn(() => ({
  from: jest.fn(() => ({
    select: jest.fn().mockResolvedValue({ data: [], error: null }),
    insert: jest.fn().mockResolvedValue({ data: {}, error: null }),
  })),
}));

// 테스트 파일에서
jest.mock('@supabase/supabase-js', () => require('./__mocks__/supabase'));
```

---

## 일반적인 디버깅 방법

### 1. 로그 확인

```typescript
// 개발 환경에서만 로깅
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info:', data);
}

// 구조화된 로깅
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${new Date().toISOString()} ${message}`, data);
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${new Date().toISOString()} ${message}`, error);
  }
};
```

### 2. 네트워크 요청 디버깅

```typescript
// API 요청 인터셉터
const apiClient = axios.create();

apiClient.interceptors.request.use(
  (config) => {
    console.log('Request:', config);
    return config;
  },
  (error) => {
    console.error('Request Error:', error);
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    console.log('Response:', response);
    return response;
  },
  (error) => {
    console.error('Response Error:', error);
    return Promise.reject(error);
  }
);
```

### 3. React DevTools 사용

```bash
# React DevTools Extension 설치 (브라우저)
# 또는 Standalone 버전
npm install -g react-devtools
react-devtools
```

### 4. 성능 프로파일링

```typescript
// Performance API 사용
performance.mark('start-fetch');
await fetchData();
performance.mark('end-fetch');
performance.measure('fetch-duration', 'start-fetch', 'end-fetch');

const measures = performance.getEntriesByType('measure');
console.log('Fetch duration:', measures[0].duration);
```

---

## 에러 보고 및 모니터링

### 1. 에러 추적 설정

```typescript
// Sentry 설정 예시
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: 'YOUR_SENTRY_DSN',
  environment: process.env.NODE_ENV,
});

// 에러 경계 컴포넌트
const ErrorBoundary = Sentry.withErrorBoundary(App, {
  fallback: ErrorFallback,
});
```

### 2. 로그 집계

```typescript
// 구조화된 로그를 외부 서비스로 전송
const sendLog = async (level: string, message: string, metadata?: any) => {
  if (process.env.NODE_ENV === 'production') {
    await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level,
        message,
        metadata,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      }),
    });
  }
};
```

---

## 지원 요청 시 포함할 정보

문제 해결을 위해 지원을 요청할 때 다음 정보를 포함해주세요:

### 기본 정보
- **운영체제**: Windows 11 / macOS 13 / Ubuntu 22.04
- **브라우저**: Chrome 120.x / Firefox 121.x / Safari 17.x
- **Node.js 버전**: `node --version`
- **npm 버전**: `npm --version`

### 에러 정보
- **에러 메시지**: 정확한 에러 메시지 전문
- **스택 트레이스**: 에러가 발생한 위치
- **재현 단계**: 문제를 재현하는 구체적인 단계
- **예상 결과**: 어떤 결과를 예상했는지
- **실제 결과**: 실제로 어떤 일이 발생했는지

### 환경 정보
- **앱 버전**: 어떤 앱에서 발생했는지 (user/advertiser/admin)
- **환경**: development / staging / production
- **최근 변경사항**: 최근에 변경한 코드나 설정

### 로그 파일
```bash
# 관련 로그 수집
npm run logs > error-logs.txt

# 브라우저 콘솔 로그
# 개발자 도구 > Console 탭의 에러 메시지

# 네트워크 탭
# 실패한 API 요청의 상세 정보
```

---

## 자주 묻는 질문 (FAQ)

**Q: 로컬 개발 환경에서 HTTPS가 필요한가요?**
A: 일반적으로는 HTTP로 충분하지만, 결제 API나 일부 브라우저 기능 테스트 시에는 HTTPS가 필요할 수 있습니다.

**Q: 프로덕션 환경에서 console.log가 보이나요?**
A: 빌드 시 자동으로 제거됩니다. `vite.config.ts`의 terser 설정을 확인하세요.

**Q: 데이터베이스 마이그레이션을 롤백할 수 있나요?**
A: 네, `supabase migration down` 명령어를 사용하여 이전 버전으로 롤백할 수 있습니다.

**Q: 여러 환경에서 다른 Supabase 프로젝트를 사용할 수 있나요?**
A: 네, 환경별로 다른 `.env` 파일을 사용하여 다른 프로젝트를 연결할 수 있습니다.

---

## 추가 리소스

- **공식 문서**
  - [React 공식 문서](https://reactjs.org/docs)
  - [Vite 문서](https://vitejs.dev/)
  - [Supabase 문서](https://supabase.com/docs)

- **커뮤니티 지원**
  - [Stack Overflow](https://stackoverflow.com/questions/tagged/react)
  - [React Discord](https://discord.gg/reactiflux)
  - [Supabase Discord](https://discord.supabase.com/)

- **도구**
  - [React DevTools](https://react-devtools-tutorial.vercel.app/)
  - [Chrome DevTools](https://developer.chrome.com/docs/devtools/)
  - [Sentry](https://sentry.io/) (에러 모니터링)

---

*이 문제 해결 가이드는 실제 발생한 문제들을 기반으로 지속적으로 업데이트됩니다. 새로운 문제나 해결 방법을 발견하시면 문서에 기여해주세요.*