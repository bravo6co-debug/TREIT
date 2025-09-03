// 중앙화된 에러 핸들러

import {
  AppError,
  ErrorCode,
  ErrorCategory,
  ErrorSeverity,
  ErrorHandlerConfig,
  ErrorRecoveryAction,
  RetryConfig
} from './types'
import { ErrorFactory } from './error-factory'
import { ErrorLogger } from './error-logger'
import { ErrorReporter } from './error-reporter'

export type ErrorNotificationHandler = (error: AppError, recoveryActions?: ErrorRecoveryAction[]) => void
export type ErrorRecoveryHandler = (error: AppError) => ErrorRecoveryAction[]

export class ErrorHandler {
  private static instance: ErrorHandler
  private config: ErrorHandlerConfig
  private logger: ErrorLogger
  private reporter: ErrorReporter
  private notificationHandler?: ErrorNotificationHandler
  private recoveryHandler?: ErrorRecoveryHandler
  private retryAttempts = new Map<string, number>()

  private constructor(config: ErrorHandlerConfig) {
    this.config = config
    this.logger = new ErrorLogger(config.logLevel)
    this.reporter = new ErrorReporter(config.sentryDsn)
  }

  /**
   * 싱글톤 인스턴스 가져오기
   */
  static getInstance(config?: ErrorHandlerConfig): ErrorHandler {
    if (!ErrorHandler.instance) {
      if (!config) {
        throw new Error('ErrorHandler must be initialized with config on first use')
      }
      ErrorHandler.instance = new ErrorHandler(config)
    }
    return ErrorHandler.instance
  }

  /**
   * 설정 업데이트
   */
  updateConfig(config: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...config }
    this.logger.updateLogLevel(config.logLevel || this.config.logLevel)
    if (config.sentryDsn) {
      this.reporter.updateConfig(config.sentryDsn)
    }
  }

  /**
   * 알림 핸들러 설정
   */
  setNotificationHandler(handler: ErrorNotificationHandler): void {
    this.notificationHandler = handler
  }

  /**
   * 복구 핸들러 설정
   */
  setRecoveryHandler(handler: ErrorRecoveryHandler): void {
    this.recoveryHandler = handler
  }

  /**
   * 에러 처리 메인 메소드
   */
  async handleError(error: unknown, context: Partial<any> = {}): Promise<void> {
    let appError: AppError

    // AppError가 아닌 경우 변환
    if (error instanceof Error) {
      if (this.isAppError(error)) {
        appError = error as AppError
      } else {
        appError = this.convertToAppError(error, context)
      }
    } else {
      appError = ErrorFactory.create(
        ErrorCode.SYSTEM_UNKNOWN_ERROR,
        context,
        error,
        '알 수 없는 오류가 발생했습니다.'
      )
    }

    // 에러 로깅
    if (this.config.enableLogging) {
      this.logger.log(appError)
    }

    // 에러 리포팅 (외부 서비스)
    if (this.config.enableReporting && this.shouldReport(appError)) {
      await this.reporter.report(appError)
    }

    // 재시도 처리
    if (appError.retryable && this.shouldRetry(appError)) {
      await this.handleRetry(appError)
      return
    }

    // 복구 액션 생성
    const recoveryActions = this.recoveryHandler?.(appError) || this.getDefaultRecoveryActions(appError)

    // 사용자 알림
    if (this.shouldNotifyUser(appError)) {
      this.notificationHandler?.(appError, recoveryActions)
    }

    // 콘솔 로그 (개발 환경)
    if (this.config.notificationConfig.console && process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error: ${appError.code}`)
      console.error('Message:', appError.message)
      console.error('User Message:', appError.userMessage)
      console.error('Context:', appError.context)
      if (appError.originalError) {
        console.error('Original Error:', appError.originalError)
      }
      console.groupEnd()
    }
  }

  /**
   * 동기 에러 처리 (Promise 반환하지 않음)
   */
  handleErrorSync(error: unknown, context: Partial<any> = {}): void {
    this.handleError(error, context).catch(handleError => {
      console.error('Error in error handler:', handleError)
    })
  }

  /**
   * Promise rejection 핸들러
   */
  handlePromiseRejection(event: PromiseRejectionEvent): void {
    this.handleErrorSync(event.reason, {
      component: 'UnhandledPromiseRejection',
      action: 'promise_rejection'
    })
  }

  /**
   * 전역 에러 핸들러 등록
   */
  registerGlobalHandlers(): void {
    if (typeof window !== 'undefined') {
      // 전역 에러 핸들러
      window.onerror = (message, source, lineno, colno, error) => {
        this.handleErrorSync(error || new Error(String(message)), {
          component: 'GlobalErrorHandler',
          action: 'window_error',
          source,
          lineno,
          colno
        })
      }

      // Promise rejection 핸들러
      window.onunhandledrejection = (event) => {
        this.handlePromiseRejection(event)
      }
    }
  }

  /**
   * AppError 타입 가드
   */
  private isAppError(error: any): error is AppError {
    return error && 
           typeof error.code === 'string' &&
           typeof error.category === 'string' &&
           typeof error.severity === 'string' &&
           typeof error.message === 'string' &&
           typeof error.userMessage === 'string'
  }

  /**
   * 일반 Error를 AppError로 변환
   */
  private convertToAppError(error: Error, context: Partial<any>): AppError {
    // 네트워크 에러 감지
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return ErrorFactory.fromNetworkError(error, context)
    }

    // Supabase 에러 감지
    if (error.message.includes('supabase') || error.message.includes('postgres')) {
      return ErrorFactory.fromSupabaseError(error, context)
    }

    // 기본 에러로 처리
    return ErrorFactory.create(ErrorCode.SYSTEM_UNKNOWN_ERROR, context, error)
  }

  /**
   * 외부 리포팅이 필요한 에러인지 확인
   */
  private shouldReport(error: AppError): boolean {
    const reportableSeverities = [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL]
    return reportableSeverities.includes(error.severity)
  }

  /**
   * 재시도 처리
   */
  private async handleRetry(error: AppError): Promise<void> {
    const errorKey = `${error.code}_${error.context.component}_${error.context.action}`
    const currentAttempts = this.retryAttempts.get(errorKey) || 0
    
    if (currentAttempts >= this.config.retryConfig.maxRetries) {
      this.retryAttempts.delete(errorKey)
      return
    }

    this.retryAttempts.set(errorKey, currentAttempts + 1)
    
    const delay = this.calculateRetryDelay(currentAttempts)
    
    await new Promise(resolve => setTimeout(resolve, delay))
    
    // 재시도 로직은 원래 액션을 다시 실행하는 것이므로
    // 여기서는 단순히 지연만 처리하고 실제 재시도는 호출자가 처리
  }

  /**
   * 재시도 지연 계산
   */
  private calculateRetryDelay(attempts: number): number {
    const { baseDelay, maxDelay, backoffFactor } = this.config.retryConfig
    const delay = baseDelay * Math.pow(backoffFactor, attempts)
    return Math.min(delay, maxDelay)
  }

  /**
   * 재시도 여부 확인
   */
  private shouldRetry(error: AppError): boolean {
    const errorKey = `${error.code}_${error.context.component}_${error.context.action}`
    const currentAttempts = this.retryAttempts.get(errorKey) || 0
    return currentAttempts < this.config.retryConfig.maxRetries &&
           this.config.retryConfig.retryableErrors.includes(error.code)
  }

  /**
   * 사용자에게 알림이 필요한 에러인지 확인
   */
  private shouldNotifyUser(error: AppError): boolean {
    const notifiableSeverities = [ErrorSeverity.MEDIUM, ErrorSeverity.HIGH, ErrorSeverity.CRITICAL]
    return notifiableSeverities.includes(error.severity)
  }

  /**
   * 기본 복구 액션 생성
   */
  private getDefaultRecoveryActions(error: AppError): ErrorRecoveryAction[] {
    const actions: ErrorRecoveryAction[] = []

    // 재시도 가능한 경우
    if (error.retryable) {
      actions.push({
        label: '다시 시도',
        type: 'retry',
        action: async () => {
          // 실제 재시도 로직은 컴포넌트에서 구현
        }
      })
    }

    // 새로고침으로 해결 가능한 경우
    if (error.category === ErrorCategory.CLIENT || error.category === ErrorCategory.NETWORK) {
      actions.push({
        label: '페이지 새로고침',
        type: 'refresh',
        action: () => {
          if (typeof window !== 'undefined') {
            window.location.reload()
          }
        }
      })
    }

    // 인증 에러인 경우 로그인 페이지로 이동
    if (error.category === ErrorCategory.AUTH) {
      actions.push({
        label: '로그인하기',
        type: 'redirect',
        action: () => {
          if (typeof window !== 'undefined') {
            window.location.href = '/login'
          }
        }
      })
    }

    return actions
  }

  /**
   * 에러 통계 및 메트릭 수집
   */
  getErrorMetrics(): Record<string, any> {
    return {
      retryAttempts: Object.fromEntries(this.retryAttempts),
      loggerStats: this.logger.getStats(),
      reporterStats: this.reporter.getStats()
    }
  }

  /**
   * 에러 핸들러 정리
   */
  destroy(): void {
    this.retryAttempts.clear()
    
    if (typeof window !== 'undefined') {
      window.onerror = null
      window.onunhandledrejection = null
    }
  }
}

// 기본 설정
export const defaultErrorHandlerConfig: ErrorHandlerConfig = {
  enableLogging: true,
  enableReporting: false,
  enableMetrics: true,
  logLevel: 'error',
  notificationConfig: {
    toast: true,
    modal: false,
    console: process.env.NODE_ENV === 'development'
  },
  retryConfig: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
    retryableErrors: [
      ErrorCode.NETWORK_CONNECTION_FAILED,
      ErrorCode.NETWORK_TIMEOUT,
      ErrorCode.SERVER_INTERNAL_ERROR,
      ErrorCode.SERVER_SERVICE_UNAVAILABLE,
      ErrorCode.SERVER_GATEWAY_TIMEOUT,
      ErrorCode.DB_CONNECTION_FAILED,
      ErrorCode.FILE_UPLOAD_FAILED
    ]
  }
}

// 전역 에러 핸들러 인스턴스
let globalErrorHandler: ErrorHandler | null = null

/**
 * 전역 에러 핸들러 초기화
 */
export function initializeErrorHandler(config: Partial<ErrorHandlerConfig> = {}): ErrorHandler {
  const mergedConfig = { ...defaultErrorHandlerConfig, ...config }
  globalErrorHandler = ErrorHandler.getInstance(mergedConfig)
  globalErrorHandler.registerGlobalHandlers()
  return globalErrorHandler
}

/**
 * 전역 에러 핸들러 가져오기
 */
export function getErrorHandler(): ErrorHandler {
  if (!globalErrorHandler) {
    throw new Error('ErrorHandler not initialized. Call initializeErrorHandler first.')
  }
  return globalErrorHandler
}

/**
 * 간편한 에러 처리 함수
 */
export function handleError(error: unknown, context?: Partial<any>): void {
  const handler = getErrorHandler()
  handler.handleErrorSync(error, context)
}