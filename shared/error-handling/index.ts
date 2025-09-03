// 에러 처리 시스템 통합 인덱스

// 타입 정의
export * from './types'

// 에러 팩토리
export { ErrorFactory } from './error-factory'

// 핵심 에러 핸들러
export {
  ErrorHandler,
  initializeErrorHandler,
  getErrorHandler,
  handleError,
  defaultErrorHandlerConfig
} from './error-handler'

// 로거와 리포터
export { ErrorLogger } from './error-logger'
export { ErrorReporter } from './error-reporter'

// React 컴포넌트
export {
  ErrorBoundary,
  withErrorBoundary,
  PageErrorBoundary,
  ComponentErrorBoundary,
  FeatureErrorBoundary
} from './ErrorBoundary'

// React 훅들
export {
  useErrorHandler,
  useAsyncError,
  useApiError,
  useFormError,
  useRetry,
  useErrorRecovery,
  useGlobalError
} from './hooks'

// API 에러 처리
export {
  ApiErrorHandler,
  SupabaseApiClient
} from './api-error-handler'

// 폼 검증
export {
  FormValidator,
  ValidationRules
} from './form-validation'

// 알림 시스템
export {
  NotificationProvider,
  useNotification
} from './notification-system'

// Edge Functions
export {
  EdgeFunctionErrorHandler,
  safeEdgeFunctionHandler,
  safeJsonParse
} from './edge-function-error-handler'

// 유틸리티 함수들
export const ErrorHandlingUtils = {
  /**
   * 에러가 재시도 가능한지 확인
   */
  isRetryableError: (error: any): boolean => {
    if (!error) return false
    
    // HTTP 상태 코드 기반
    if (error.status) {
      const retryableStatuses = [408, 429, 500, 502, 503, 504]
      return retryableStatuses.includes(error.status)
    }

    // 에러 타입 기반
    if (error.name) {
      const retryableNames = ['TypeError', 'NetworkError', 'TimeoutError']
      return retryableNames.includes(error.name)
    }

    return false
  },

  /**
   * 에러 심각도 판단
   */
  getErrorSeverity: (error: any): 'low' | 'medium' | 'high' | 'critical' => {
    if (!error) return 'low'

    // HTTP 상태 코드 기반
    if (error.status) {
      if (error.status >= 500) return 'critical'
      if (error.status === 401 || error.status === 403) return 'high'
      if (error.status >= 400) return 'medium'
      return 'low'
    }

    // 에러 메시지 기반
    if (error.message) {
      const message = error.message.toLowerCase()
      if (message.includes('critical') || message.includes('fatal')) return 'critical'
      if (message.includes('unauthorized') || message.includes('forbidden')) return 'high'
      if (message.includes('invalid') || message.includes('bad')) return 'medium'
    }

    return 'low'
  },

  /**
   * 에러를 사용자 친화적 메시지로 변환
   */
  getUserFriendlyMessage: (error: any): string => {
    if (!error) return '알 수 없는 오류가 발생했습니다.'

    // 이미 사용자 메시지가 있는 경우
    if (error.userMessage) return error.userMessage

    // HTTP 상태 코드 기반
    if (error.status) {
      const statusMessages: Record<number, string> = {
        400: '잘못된 요청입니다. 입력 내용을 확인해주세요.',
        401: '로그인이 필요합니다.',
        403: '접근 권한이 없습니다.',
        404: '요청한 정보를 찾을 수 없습니다.',
        408: '요청 시간이 초과되었습니다.',
        429: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
        500: '서버 오류가 발생했습니다.',
        502: '서버 연결에 문제가 있습니다.',
        503: '서비스를 일시적으로 이용할 수 없습니다.',
        504: '서버 응답시간이 초과되었습니다.'
      }
      
      return statusMessages[error.status] || `서버 오류가 발생했습니다. (${error.status})`
    }

    // 네트워크 에러
    if (error.name === 'TypeError' && error.message?.includes('fetch')) {
      return '네트워크 연결에 실패했습니다. 인터넷 연결을 확인해주세요.'
    }

    // 타임아웃 에러
    if (error.name === 'TimeoutError' || error.code === 'TIMEOUT') {
      return '요청 시간이 초과되었습니다. 다시 시도해주세요.'
    }

    // 기본 메시지
    return '오류가 발생했습니다. 문제가 지속되면 고객센터에 문의해주세요.'
  },

  /**
   * 에러 스택에서 유용한 정보 추출
   */
  extractErrorInfo: (error: any) => {
    if (!error) return null

    const info: any = {
      name: error.name,
      message: error.message,
      code: error.code,
      status: error.status,
      timestamp: new Date().toISOString()
    }

    // 스택 트레이스 파싱
    if (error.stack) {
      const stackLines = error.stack.split('\n')
      const relevantLine = stackLines.find(line => 
        !line.includes('node_modules') && 
        !line.includes('webpack') &&
        line.includes('at ')
      )
      
      if (relevantLine) {
        info.location = relevantLine.trim()
      }
    }

    return info
  }
}