// 에러 생성 팩토리

import {
  AppError,
  ErrorCode,
  ErrorCategory,
  ErrorSeverity,
  ErrorContext,
  HTTP_STATUS_TO_ERROR_CODE,
  SUPABASE_ERROR_TO_ERROR_CODE,
  ERROR_MESSAGES_KO
} from './types'

export class ErrorFactory {
  /**
   * 새로운 AppError 인스턴스 생성
   */
  static create(
    code: ErrorCode,
    context: Partial<ErrorContext> = {},
    originalError?: Error | unknown,
    customUserMessage?: string
  ): AppError {
    const category = this.getCategoryFromCode(code)
    const severity = this.getSeverityFromCode(code)
    const retryable = this.isRetryable(code)
    const recoverable = this.isRecoverable(code)

    return {
      code,
      category,
      severity,
      message: this.getEnglishMessage(code, originalError),
      userMessage: customUserMessage || ERROR_MESSAGES_KO[code],
      details: this.extractDetails(originalError),
      context: {
        timestamp: new Date().toISOString(),
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        ...context
      },
      originalError,
      retryable,
      recoverable
    }
  }

  /**
   * HTTP 상태 코드로부터 AppError 생성
   */
  static fromHttpStatus(
    status: number,
    context: Partial<ErrorContext> = {},
    originalError?: Error | unknown,
    customUserMessage?: string
  ): AppError {
    const errorCode = HTTP_STATUS_TO_ERROR_CODE[status] || ErrorCode.SYSTEM_UNKNOWN_ERROR
    return this.create(errorCode, context, originalError, customUserMessage)
  }

  /**
   * Supabase 에러로부터 AppError 생성
   */
  static fromSupabaseError(
    supabaseError: any,
    context: Partial<ErrorContext> = {},
    customUserMessage?: string
  ): AppError {
    let errorCode = ErrorCode.SYSTEM_UNKNOWN_ERROR

    // Supabase 에러 코드 매핑
    if (supabaseError?.code && SUPABASE_ERROR_TO_ERROR_CODE[supabaseError.code]) {
      errorCode = SUPABASE_ERROR_TO_ERROR_CODE[supabaseError.code]
    } else if (supabaseError?.message) {
      // 메시지 기반 매핑
      const message = supabaseError.message.toLowerCase()
      if (message.includes('jwt expired') || message.includes('token expired')) {
        errorCode = ErrorCode.AUTH_TOKEN_EXPIRED
      } else if (message.includes('invalid') && message.includes('credentials')) {
        errorCode = ErrorCode.AUTH_INVALID_CREDENTIALS
      } else if (message.includes('permission denied') || message.includes('access denied')) {
        errorCode = ErrorCode.PERMISSION_DENIED
      } else if (message.includes('not found')) {
        errorCode = ErrorCode.DB_RECORD_NOT_FOUND
      } else if (message.includes('duplicate') || message.includes('already exists')) {
        errorCode = ErrorCode.DB_DUPLICATE_ENTRY
      } else if (message.includes('connection') && message.includes('refused')) {
        errorCode = ErrorCode.DB_CONNECTION_FAILED
      }
    }

    return this.create(errorCode, context, supabaseError, customUserMessage)
  }

  /**
   * 네트워크 에러로부터 AppError 생성
   */
  static fromNetworkError(
    networkError: any,
    context: Partial<ErrorContext> = {},
    customUserMessage?: string
  ): AppError {
    let errorCode = ErrorCode.NETWORK_CONNECTION_FAILED

    if (networkError?.name === 'TimeoutError' || networkError?.code === 'TIMEOUT') {
      errorCode = ErrorCode.NETWORK_TIMEOUT
    } else if (networkError?.name === 'AbortError') {
      errorCode = ErrorCode.NETWORK_CONNECTION_FAILED
    } else if (!navigator.onLine) {
      errorCode = ErrorCode.NETWORK_OFFLINE
    }

    return this.create(errorCode, context, networkError, customUserMessage)
  }

  /**
   * 폼 검증 에러 생성
   */
  static fromValidationError(
    field: string,
    value: any,
    rule: string,
    context: Partial<ErrorContext> = {}
  ): AppError {
    let errorCode = ErrorCode.VALIDATION_INVALID_FORMAT
    let userMessage = ERROR_MESSAGES_KO[errorCode]

    switch (rule) {
      case 'required':
        errorCode = ErrorCode.VALIDATION_REQUIRED_FIELD
        userMessage = `${field}은(는) 필수 입력 항목입니다.`
        break
      case 'email':
        errorCode = ErrorCode.VALIDATION_INVALID_EMAIL
        break
      case 'phone':
        errorCode = ErrorCode.VALIDATION_INVALID_PHONE
        break
      case 'minLength':
        errorCode = ErrorCode.VALIDATION_MIN_LENGTH
        userMessage = `${field}은(는) 최소 길이를 만족해야 합니다.`
        break
      case 'maxLength':
        errorCode = ErrorCode.VALIDATION_MAX_LENGTH
        userMessage = `${field}은(는) 최대 길이를 초과할 수 없습니다.`
        break
    }

    return this.create(errorCode, { ...context, field, value, rule }, undefined, userMessage)
  }

  /**
   * 결제 에러 생성
   */
  static fromPaymentError(
    paymentError: any,
    context: Partial<ErrorContext> = {}
  ): AppError {
    let errorCode = ErrorCode.PAYMENT_PROCESSING_FAILED

    if (paymentError?.type) {
      switch (paymentError.type) {
        case 'card_error':
          if (paymentError.code === 'card_declined') {
            errorCode = ErrorCode.PAYMENT_CARD_DECLINED
          } else if (paymentError.code === 'insufficient_funds') {
            errorCode = ErrorCode.PAYMENT_INSUFFICIENT_FUNDS
          } else {
            errorCode = ErrorCode.PAYMENT_INVALID_CARD
          }
          break
        case 'api_error':
          errorCode = ErrorCode.PAYMENT_GATEWAY_ERROR
          break
      }
    }

    return this.create(errorCode, context, paymentError)
  }

  /**
   * 파일 업로드 에러 생성
   */
  static fromFileError(
    file: File,
    error: string,
    context: Partial<ErrorContext> = {}
  ): AppError {
    let errorCode = ErrorCode.FILE_UPLOAD_FAILED

    switch (error) {
      case 'file_too_large':
        errorCode = ErrorCode.FILE_TOO_LARGE
        break
      case 'invalid_file_type':
        errorCode = ErrorCode.FILE_INVALID_TYPE
        break
      case 'storage_full':
        errorCode = ErrorCode.FILE_STORAGE_FULL
        break
    }

    return this.create(errorCode, {
      ...context,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    })
  }

  /**
   * 에러 코드에 따른 카테고리 반환
   */
  private static getCategoryFromCode(code: ErrorCode): ErrorCategory {
    if (code.startsWith('NETWORK_')) return ErrorCategory.NETWORK
    if (code.startsWith('AUTH_')) return ErrorCategory.AUTH
    if (code.startsWith('PERMISSION_')) return ErrorCategory.PERMISSION
    if (code.startsWith('PAYMENT_')) return ErrorCategory.PAYMENT
    if (code.startsWith('FILE_')) return ErrorCategory.FILE_UPLOAD
    if (code.startsWith('DB_')) return ErrorCategory.DATABASE
    if (code.startsWith('SERVER_')) return ErrorCategory.SERVER
    if (code.startsWith('CLIENT_')) return ErrorCategory.CLIENT
    if (code.startsWith('VALIDATION_')) return ErrorCategory.VALIDATION
    if (code.startsWith('BUSINESS_')) return ErrorCategory.BUSINESS
    return ErrorCategory.SYSTEM
  }

  /**
   * 에러 코드에 따른 심각도 반환
   */
  private static getSeverityFromCode(code: ErrorCode): ErrorSeverity {
    const criticalErrors = [
      ErrorCode.SERVER_INTERNAL_ERROR,
      ErrorCode.DB_CONNECTION_FAILED,
      ErrorCode.SYSTEM_UNKNOWN_ERROR
    ]

    const highErrors = [
      ErrorCode.AUTH_TOKEN_EXPIRED,
      ErrorCode.PERMISSION_DENIED,
      ErrorCode.PAYMENT_PROCESSING_FAILED,
      ErrorCode.SERVER_SERVICE_UNAVAILABLE
    ]

    const lowErrors = [
      ErrorCode.VALIDATION_REQUIRED_FIELD,
      ErrorCode.VALIDATION_INVALID_FORMAT,
      ErrorCode.FILE_INVALID_TYPE
    ]

    if (criticalErrors.includes(code)) return ErrorSeverity.CRITICAL
    if (highErrors.includes(code)) return ErrorSeverity.HIGH
    if (lowErrors.includes(code)) return ErrorSeverity.LOW
    return ErrorSeverity.MEDIUM
  }

  /**
   * 재시도 가능한 에러인지 확인
   */
  private static isRetryable(code: ErrorCode): boolean {
    const retryableErrors = [
      ErrorCode.NETWORK_CONNECTION_FAILED,
      ErrorCode.NETWORK_TIMEOUT,
      ErrorCode.SERVER_INTERNAL_ERROR,
      ErrorCode.SERVER_SERVICE_UNAVAILABLE,
      ErrorCode.SERVER_GATEWAY_TIMEOUT,
      ErrorCode.DB_CONNECTION_FAILED,
      ErrorCode.FILE_UPLOAD_FAILED
    ]

    return retryableErrors.includes(code)
  }

  /**
   * 복구 가능한 에러인지 확인
   */
  private static isRecoverable(code: ErrorCode): boolean {
    const nonRecoverableErrors = [
      ErrorCode.PERMISSION_DENIED,
      ErrorCode.AUTH_ACCOUNT_LOCKED,
      ErrorCode.PAYMENT_CARD_DECLINED,
      ErrorCode.FILE_INVALID_TYPE,
      ErrorCode.DB_CONSTRAINT_VIOLATION
    ]

    return !nonRecoverableErrors.includes(code)
  }

  /**
   * 영어 에러 메시지 생성 (개발자용)
   */
  private static getEnglishMessage(code: ErrorCode, originalError?: Error | unknown): string {
    const baseMessage = code.replace(/_/g, ' ').toLowerCase()
    
    if (originalError instanceof Error) {
      return `${baseMessage}: ${originalError.message}`
    }
    
    return baseMessage
  }

  /**
   * 원본 에러에서 세부사항 추출
   */
  private static extractDetails(originalError?: Error | unknown): string | undefined {
    if (originalError instanceof Error) {
      return originalError.stack || originalError.message
    }
    
    if (typeof originalError === 'object' && originalError !== null) {
      return JSON.stringify(originalError, null, 2)
    }
    
    if (typeof originalError === 'string') {
      return originalError
    }
    
    return undefined
  }
}