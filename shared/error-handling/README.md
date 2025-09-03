# TreitMaster 에러 처리 시스템

## 개요

TreitMaster 프로젝트의 통합 에러 처리 시스템입니다. React 앱, Edge Functions, API 요청 등 모든 레이어에서 일관된 에러 처리를 제공합니다.

## 주요 기능

### 🎯 통합 에러 처리
- 표준화된 에러 타입과 코드 체계
- 자동 에러 분류 및 심각도 판정
- 한국어 사용자 메시지 자동 생성

### 📊 에러 로깅 및 모니터링
- 구조화된 에러 로그
- 실시간 에러 통계
- 성능 영향 최소화

### 🔄 자동 재시도 메커니즘
- 네트워크 오류, 서버 오류 등 재시도 가능한 에러 자동 처리
- 지수 백오프(Exponential Backoff) 적용
- 사용자 정의 재시도 규칙

### 🎨 사용자 친화적 알림
- 토스트 알림 시스템
- 모달 다이얼로그
- 에러 복구 액션 제공

### 🛡️ React 에러 바운더리
- 컴포넌트 레벨 에러 격리
- 자동 복구 메커니즘
- 개발/운영 환경별 다른 처리

## 설치 및 설정

### 1. React 앱 설정

```tsx
// App.tsx
import { 
  NotificationProvider,
  PageErrorBoundary,
  initializeErrorHandler
} from '../shared/error-handling'

function App() {
  useEffect(() => {
    // 에러 핸들러 초기화
    initializeErrorHandler({
      enableLogging: true,
      enableReporting: process.env.NODE_ENV === 'production',
      logLevel: 'error',
      notificationConfig: {
        toast: true,
        modal: true,
        console: process.env.NODE_ENV === 'development'
      }
    })
  }, [])

  return (
    <NotificationProvider>
      <PageErrorBoundary name="MainApp">
        <YourAppContent />
      </PageErrorBoundary>
    </NotificationProvider>
  )
}
```

### 2. API 클라이언트 사용

```tsx
// supabase 클라이언트 설정
import { SupabaseApiClient } from '../shared/error-handling'

const apiClient = new SupabaseApiClient(supabase)

// 사용 예시
const { data, error, success } = await apiClient.select('users', {
  filter: { id: userId },
  context: { operation: 'getUserProfile' }
})

if (!success) {
  // 에러는 자동으로 처리되고 사용자에게 알림 표시
  console.error('User fetch failed:', error)
}
```

### 3. 폼 검증

```tsx
import { FormValidator, ValidationRules } from '../shared/error-handling'

const formValidator = new FormValidator({
  fields: {
    email: {
      label: '이메일',
      rules: ValidationRules.email
    },
    password: {
      label: '비밀번호',
      rules: ValidationRules.password
    }
  }
})

// 검증 실행
const result = await formValidator.validateForm(formData)
if (!result.isValid) {
  // 에러 처리
  Object.entries(result.errors).forEach(([field, error]) => {
    showFieldError(field, error.userMessage)
  })
}
```

### 4. Edge Functions

```typescript
// Edge Function에서 사용
import { safeEdgeFunctionHandler } from '../../shared/error-handling/edge-function-error-handler.ts'

serve(async (req) => {
  return safeEdgeFunctionHandler('my-function', async (errorHandler, request) => {
    // 비즈니스 로직
    const data = await processRequest(request)
    
    // 성공 응답
    return errorHandler.createSuccessResponse(data)
  }, req)
})
```

## React 훅 사용법

### useErrorHandler
기본적인 에러 처리를 위한 훅입니다.

```tsx
import { useErrorHandler } from '../shared/error-handling'

function MyComponent() {
  const { error, handleError, clearError, retry } = useErrorHandler()

  const fetchData = async () => {
    try {
      const data = await api.getData()
      // 성공 처리
    } catch (err) {
      handleError(err, { component: 'MyComponent', action: 'fetchData' })
    }
  }

  if (error) {
    return (
      <div>
        <p>{error.userMessage}</p>
        {error.retryable && (
          <button onClick={() => retry(fetchData)}>다시 시도</button>
        )}
      </div>
    )
  }

  return <div>{/* 정상 컨텐츠 */}</div>
}
```

### useApiError
API 요청에 특화된 에러 처리 훅입니다.

```tsx
import { useApiError } from '../shared/error-handling'

function UserProfile({ userId }) {
  const { loading, error, executeApiCall } = useApiError()
  const [user, setUser] = useState(null)

  const loadUser = useCallback(() => {
    executeApiCall(
      () => apiClient.select('users', { filter: { id: userId } }),
      {
        onSuccess: (result) => setUser(result.data),
        context: { userId }
      }
    )
  }, [userId])

  return (
    <div>
      {loading && <Spinner />}
      {error && <ErrorMessage error={error} onRetry={loadUser} />}
      {user && <UserDetails user={user} />}
    </div>
  )
}
```

### useFormError
폼 검증 에러 처리를 위한 훅입니다.

```tsx
import { useFormError } from '../shared/error-handling'

function SignupForm() {
  const { 
    errors, 
    hasErrors, 
    setFieldError, 
    clearFieldError, 
    validateField 
  } = useFormError()

  const handleSubmit = async (formData) => {
    // 실시간 검증
    const emailValid = validateField('email', formData.email, {
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    })

    if (!emailValid) return

    // API 호출 등...
  }

  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="email" 
        onChange={(e) => {
          clearFieldError('email')
          // 디바운싱된 검증
          validateFieldWithDebounce('email', e.target.value)
        }}
      />
      {errors.email && (
        <span className="error">{errors.email.userMessage}</span>
      )}
    </form>
  )
}
```

## 에러 타입별 처리 방법

### 네트워크 에러
- 자동 재시도 (최대 3회)
- 오프라인 상태 감지
- 사용자 친화적 메시지

### 인증 에러
- 자동 로그아웃
- 로그인 페이지 리디렉션
- 토큰 갱신 시도

### 권한 에러
- 접근 불가 안내
- 대안 액션 제공
- 관리자 문의 안내

### 검증 에러
- 실시간 필드 검증
- 구체적인 오류 메시지
- 포커스 이동

### 비즈니스 로직 에러
- 상황별 맞춤 메시지
- 대안 제시
- 사용자 안내

## 설정 옵션

### 에러 핸들러 설정

```typescript
const config = {
  // 로깅 활성화
  enableLogging: true,
  
  // 외부 리포팅 (Sentry 등)
  enableReporting: false,
  
  // 로그 레벨
  logLevel: 'error' as 'debug' | 'info' | 'warn' | 'error',
  
  // 알림 설정
  notificationConfig: {
    toast: true,      // 토스트 알림
    modal: false,     // 모달 다이얼로그
    console: true     // 콘솔 로그
  },
  
  // 재시도 설정
  retryConfig: {
    maxRetries: 3,
    baseDelay: 1000,
    backoffFactor: 2,
    retryableErrors: [/* 에러 코드들 */]
  }
}
```

### 알림 시스템 설정

```typescript
const notificationConfig = {
  position: 'top-right',  // 토스트 위치
  duration: 5000,         // 표시 시간
  maxNotifications: 5,    // 최대 동시 표시 개수
  enableSound: false,     // 사운드 활성화
  enableAnimation: true   // 애니메이션 활성화
}
```

## 모니터링 및 분석

### 에러 통계 확인

```typescript
import { getErrorHandler } from '../shared/error-handling'

const errorHandler = getErrorHandler()
const metrics = errorHandler.getErrorMetrics()

console.log('에러 통계:', metrics)
// {
//   retryAttempts: {...},
//   loggerStats: {...},
//   reporterStats: {...}
// }
```

### 로그 분석

```typescript
import { ErrorLogger } from '../shared/error-handling'

const logger = new ErrorLogger()

// 에러 패턴 분석
const analysis = logger.analyzeErrorPatterns()
console.log('에러 분석:', analysis)

// 사용자별 에러 조회
const userErrors = logger.getUserErrorLogs(userId)
```

## 모범 사례

### 1. 에러 컨텍스트 제공
```typescript
handleError(error, {
  component: 'UserProfile',
  action: 'loadUserData',
  userId: user.id,
  additionalInfo: { retryCount: 1 }
})
```

### 2. 적절한 에러 바운더리 배치
```tsx
// 페이지 레벨
<PageErrorBoundary name="UserDashboard">
  // 기능 레벨
  <FeatureErrorBoundary name="UserSettings">
    // 컴포넌트 레벨
    <ComponentErrorBoundary name="ProfileForm">
      <ProfileForm />
    </ComponentErrorBoundary>
  </FeatureErrorBoundary>
</PageErrorBoundary>
```

### 3. 사용자 중심 메시지
```typescript
// ❌ 기술적인 메시지
"PostgreSQL connection failed"

// ✅ 사용자 친화적 메시지  
"서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요."
```

### 4. 복구 액션 제공
```typescript
const recoveryActions = [
  {
    label: '다시 시도',
    type: 'retry',
    action: () => retryOperation()
  },
  {
    label: '새로고침',
    type: 'refresh', 
    action: () => window.location.reload()
  }
]
```

## 문제 해결

### 일반적인 문제들

1. **에러 핸들러가 초기화되지 않음**
   - App.tsx에서 `initializeErrorHandler` 호출 확인

2. **토스트가 표시되지 않음**
   - `NotificationProvider`로 앱을 감싸고 있는지 확인
   - 알림 설정이 활성화되어 있는지 확인

3. **에러 바운더리가 작동하지 않음**
   - 개발 환경에서는 React가 에러를 다시 던짐
   - 운영 환경에서 테스트하거나 개발자 도구에서 에러 확인

4. **재시도가 무한 반복됨**
   - 재시도 가능한 에러 타입 확인
   - 최대 재시도 횟수 설정 확인

## 개발 팁

### 에러 시뮬레이션
```typescript
// 개발 환경에서 에러 테스트
if (process.env.NODE_ENV === 'development') {
  // 네트워크 에러 시뮬레이션
  if (Math.random() < 0.1) {
    throw new Error('Simulated network error')
  }
}
```

### 에러 로그 필터링
```typescript
// 특정 에러만 로깅
const logger = new ErrorLogger()
const { logs } = logger.getLogs(1, 50, {
  severity: 'HIGH',
  category: 'PAYMENT'
})
```

이 가이드를 따라 구현하면 일관되고 사용자 친화적인 에러 처리 시스템을 구축할 수 있습니다.