// Edge Functions 에러 처리 표준화

import { ErrorCode, ErrorCategory, ErrorSeverity } from './types'

export interface EdgeFunctionError {
  code: ErrorCode
  message: string
  userMessage: string
  details?: any
  statusCode: number
  category: ErrorCategory
  severity: ErrorSeverity
  timestamp: string
  functionName: string
  userId?: string
  requestId?: string
}

export interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
    userMessage: string
    details?: any
    requestId?: string
    timestamp: string
  }
}

export interface SuccessResponse<T = any> {
  success: true
  data: T
  requestId?: string
  timestamp: string
}

export type FunctionResponse<T = any> = SuccessResponse<T> | ErrorResponse

/**
 * Edge Function 에러 핸들러 클래스
 */
export class EdgeFunctionErrorHandler {
  private functionName: string
  private requestId: string

  constructor(functionName: string, requestId?: string) {
    this.functionName = functionName
    this.requestId = requestId || this.generateRequestId()
  }

  /**
   * 에러를 EdgeFunctionError로 변환
   */
  createError(
    code: ErrorCode,
    originalError?: Error | unknown,
    userMessage?: string,
    details?: any,
    userId?: string
  ): EdgeFunctionError {
    const category = this.getCategoryFromCode(code)
    const severity = this.getSeverityFromCode(code)
    const statusCode = this.getStatusCodeFromError(code, originalError)

    let message = this.getEnglishMessage(code)
    if (originalError instanceof Error) {
      message += `: ${originalError.message}`
    }

    return {
      code,
      message,
      userMessage: userMessage || this.getKoreanMessage(code),
      details,
      statusCode,
      category,
      severity,
      timestamp: new Date().toISOString(),
      functionName: this.functionName,
      userId,
      requestId: this.requestId
    }
  }

  /**
   * HTTP 응답 생성
   */
  createErrorResponse(error: EdgeFunctionError): Response {
    const responseBody: ErrorResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        userMessage: error.userMessage,
        details: error.details,
        requestId: error.requestId,
        timestamp: error.timestamp
      }
    }

    // 로깅
    this.logError(error)

    return new Response(
      JSON.stringify(responseBody),
      {
        status: error.statusCode,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': error.requestId || '',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID'
        }
      }
    )
  }

  /**
   * 성공 응답 생성
   */
  createSuccessResponse<T>(data: T, statusCode = 200): Response {
    const responseBody: SuccessResponse<T> = {
      success: true,
      data,
      requestId: this.requestId,
      timestamp: new Date().toISOString()
    }

    return new Response(
      JSON.stringify(responseBody),
      {
        status: statusCode,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': this.requestId,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID'
        }
      }
    )
  }

  /**
   * 인증 에러 생성
   */
  createAuthError(userId?: string): EdgeFunctionError {
    return this.createError(
      ErrorCode.AUTH_TOKEN_EXPIRED,
      undefined,
      '로그인이 필요합니다. 다시 로그인해주세요.',
      undefined,
      userId
    )
  }

  /**
   * 권한 에러 생성
   */
  createPermissionError(userId?: string, requiredRole?: string): EdgeFunctionError {
    return this.createError(
      ErrorCode.PERMISSION_DENIED,
      undefined,
      '이 작업을 수행할 권한이 없습니다.',
      { requiredRole },
      userId
    )
  }

  /**
   * 검증 에러 생성
   */
  createValidationError(field: string, value: any, rule: string, userId?: string): EdgeFunctionError {
    return this.createError(
      ErrorCode.VALIDATION_INVALID_FORMAT,
      undefined,
      `${field} 값이 올바르지 않습니다.`,
      { field, value, rule },
      userId
    )
  }

  /**
   * 비즈니스 로직 에러 생성
   */
  createBusinessError(code: ErrorCode, userMessage: string, details?: any, userId?: string): EdgeFunctionError {
    return this.createError(code, undefined, userMessage, details, userId)
  }

  /**
   * 데이터베이스 에러 생성
   */
  createDatabaseError(originalError: any, userId?: string): EdgeFunctionError {
    let code = ErrorCode.DB_QUERY_ERROR
    let userMessage = '데이터베이스 오류가 발생했습니다.'

    // Supabase/PostgreSQL 에러 코드 매핑
    if (originalError?.code) {
      switch (originalError.code) {
        case '23505': // unique_violation
          code = ErrorCode.DB_DUPLICATE_ENTRY
          userMessage = '이미 존재하는 데이터입니다.'
          break
        case '23503': // foreign_key_violation
          code = ErrorCode.DB_CONSTRAINT_VIOLATION
          userMessage = '참조 무결성 제약 조건에 위반됩니다.'
          break
        case '23502': // not_null_violation
          code = ErrorCode.VALIDATION_REQUIRED_FIELD
          userMessage = '필수 데이터가 누락되었습니다.'
          break
        case '42P01': // undefined_table
          code = ErrorCode.DB_QUERY_ERROR
          userMessage = '테이블을 찾을 수 없습니다.'
          break
      }
    }

    return this.createError(code, originalError, userMessage, undefined, userId)
  }

  /**
   * 네트워크 에러 생성
   */
  createNetworkError(originalError: any, userId?: string): EdgeFunctionError {
    let code = ErrorCode.NETWORK_CONNECTION_FAILED
    let userMessage = '네트워크 연결에 실패했습니다.'

    if (originalError?.code === 'ECONNREFUSED') {
      userMessage = '서버 연결에 실패했습니다.'
    } else if (originalError?.code === 'ETIMEDOUT') {
      code = ErrorCode.NETWORK_TIMEOUT
      userMessage = '요청 시간이 초과되었습니다.'
    }

    return this.createError(code, originalError, userMessage, undefined, userId)
  }

  /**
   * 파일 업로드 에러 생성
   */
  createFileUploadError(reason: string, fileName?: string, fileSize?: number, userId?: string): EdgeFunctionError {
    let code = ErrorCode.FILE_UPLOAD_FAILED
    let userMessage = '파일 업로드에 실패했습니다.'

    switch (reason) {
      case 'file_too_large':
        code = ErrorCode.FILE_TOO_LARGE
        userMessage = '파일 크기가 너무 큽니다.'
        break
      case 'invalid_file_type':
        code = ErrorCode.FILE_INVALID_TYPE
        userMessage = '지원하지 않는 파일 형식입니다.'
        break
      case 'storage_full':
        code = ErrorCode.FILE_STORAGE_FULL
        userMessage = '저장공간이 부족합니다.'
        break
    }

    return this.createError(
      code, 
      undefined, 
      userMessage, 
      { reason, fileName, fileSize }, 
      userId
    )
  }

  /**
   * 결제 에러 생성
   */
  createPaymentError(paymentError: any, userId?: string): EdgeFunctionError {
    let code = ErrorCode.PAYMENT_PROCESSING_FAILED
    let userMessage = '결제 처리 중 오류가 발생했습니다.'

    if (paymentError?.type === 'card_error') {
      if (paymentError.code === 'card_declined') {
        code = ErrorCode.PAYMENT_CARD_DECLINED
        userMessage = '카드 결제가 거절되었습니다.'
      } else if (paymentError.code === 'insufficient_funds') {
        code = ErrorCode.PAYMENT_INSUFFICIENT_FUNDS
        userMessage = '잔액이 부족합니다.'
      } else {
        code = ErrorCode.PAYMENT_INVALID_CARD
        userMessage = '유효하지 않은 카드입니다.'
      }
    } else if (paymentError?.type === 'api_error') {
      code = ErrorCode.PAYMENT_GATEWAY_ERROR
      userMessage = '결제 시스템 오류입니다. 잠시 후 다시 시도해주세요.'
    }

    return this.createError(code, paymentError, userMessage, undefined, userId)
  }

  /**
   * 에러 로깅
   */
  private logError(error: EdgeFunctionError): void {
    const logLevel = this.getLogLevel(error.severity)
    const logData = {
      level: logLevel,
      message: `[${this.functionName}] ${error.code}: ${error.message}`,
      error: {
        code: error.code,
        category: error.category,
        severity: error.severity,
        statusCode: error.statusCode,
        userMessage: error.userMessage,
        details: error.details,
        userId: error.userId,
        requestId: error.requestId,
        functionName: error.functionName,
        timestamp: error.timestamp
      }
    }

    console[logLevel](JSON.stringify(logData))

    // 심각한 에러의 경우 추가 알림 (실제 구현 시)
    if (error.severity === ErrorSeverity.CRITICAL) {
      // Slack, Discord, 이메일 등으로 알림 발송
      this.sendCriticalErrorAlert(error)
    }
  }

  /**
   * 심각한 에러 알림 발송 (스텁)
   */
  private async sendCriticalErrorAlert(error: EdgeFunctionError): Promise<void> {
    try {
      // 실제 구현 시 외부 알림 서비스 연동
      console.error('CRITICAL ERROR ALERT:', {
        function: error.functionName,
        error: error.code,
        message: error.message,
        requestId: error.requestId,
        timestamp: error.timestamp
      })
    } catch (alertError) {
      console.error('Failed to send critical error alert:', alertError)
    }
  }

  /**
   * 요청 ID 생성
   */
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 에러 코드에서 카테고리 추출
   */
  private getCategoryFromCode(code: ErrorCode): ErrorCategory {
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
   * 에러 코드에서 심각도 추출
   */
  private getSeverityFromCode(code: ErrorCode): ErrorSeverity {
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
   * 에러에서 HTTP 상태 코드 결정
   */
  private getStatusCodeFromError(code: ErrorCode, originalError?: Error | unknown): number {
    // 인증 관련
    if (code.startsWith('AUTH_')) return 401
    
    // 권한 관련
    if (code.startsWith('PERMISSION_')) return 403
    
    // 검증 관련
    if (code.startsWith('VALIDATION_')) return 400
    
    // 비즈니스 로직
    if (code === ErrorCode.BUSINESS_INSUFFICIENT_BALANCE) return 402
    if (code === ErrorCode.BUSINESS_LIMIT_EXCEEDED) return 429
    if (code.startsWith('BUSINESS_')) return 400
    
    // 데이터베이스
    if (code === ErrorCode.DB_RECORD_NOT_FOUND) return 404
    if (code === ErrorCode.DB_DUPLICATE_ENTRY) return 409
    if (code.startsWith('DB_')) return 500
    
    // 파일 관련
    if (code === ErrorCode.FILE_TOO_LARGE) return 413
    if (code.startsWith('FILE_')) return 400
    
    // 결제 관련
    if (code.startsWith('PAYMENT_')) return 402
    
    // 네트워크/서버
    if (code === ErrorCode.NETWORK_TIMEOUT) return 408
    if (code === ErrorCode.SERVER_SERVICE_UNAVAILABLE) return 503
    if (code === ErrorCode.SERVER_GATEWAY_TIMEOUT) return 504
    if (code.startsWith('SERVER_') || code.startsWith('NETWORK_')) return 500
    
    // 클라이언트
    if (code.startsWith('CLIENT_')) return 400
    
    // 기본값
    return 500
  }

  /**
   * 영어 에러 메시지 생성
   */
  private getEnglishMessage(code: ErrorCode): string {
    return code.replace(/_/g, ' ').toLowerCase()
  }

  /**
   * 한국어 에러 메시지 생성
   */
  private getKoreanMessage(code: ErrorCode): string {
    const messages: Record<ErrorCode, string> = {
      // 기본 메시지들 (types.ts의 ERROR_MESSAGES_KO와 동일)
      [ErrorCode.AUTH_TOKEN_EXPIRED]: '로그인이 만료되었습니다.',
      [ErrorCode.PERMISSION_DENIED]: '접근 권한이 없습니다.',
      [ErrorCode.VALIDATION_INVALID_FORMAT]: '입력 형식이 올바르지 않습니다.',
      [ErrorCode.DB_RECORD_NOT_FOUND]: '요청한 데이터를 찾을 수 없습니다.',
      [ErrorCode.SERVER_INTERNAL_ERROR]: '서버 내부 오류가 발생했습니다.',
      // ... 나머지 메시지들도 필요 시 추가
    } as any

    return messages[code] || '알 수 없는 오류가 발생했습니다.'
  }

  /**
   * 심각도에 따른 로그 레벨 결정
   */
  private getLogLevel(severity: ErrorSeverity): 'error' | 'warn' | 'info' | 'debug' {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error'
      case ErrorSeverity.MEDIUM:
        return 'warn'
      case ErrorSeverity.LOW:
        return 'info'
      default:
        return 'debug'
    }
  }
}

/**
 * Edge Function용 래퍼 함수들
 */

/**
 * 안전한 Edge Function 실행 래퍼
 */
export async function safeEdgeFunctionHandler(
  functionName: string,
  handler: (errorHandler: EdgeFunctionErrorHandler, request: Request) => Promise<Response>,
  request: Request
): Promise<Response> {
  const requestId = request.headers.get('X-Request-ID') || undefined
  const errorHandler = new EdgeFunctionErrorHandler(functionName, requestId)

  try {
    return await handler(errorHandler, request)
  } catch (error) {
    console.error(`Unhandled error in ${functionName}:`, error)
    
    const edgeError = errorHandler.createError(
      ErrorCode.SERVER_INTERNAL_ERROR,
      error instanceof Error ? error : new Error(String(error)),
      '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    )
    
    return errorHandler.createErrorResponse(edgeError)
  }
}

/**
 * JSON 파싱 헬퍼
 */
export async function safeJsonParse<T>(
  request: Request,
  errorHandler: EdgeFunctionErrorHandler
): Promise<T | null> {
  try {
    const text = await request.text()
    if (!text.trim()) {
      throw errorHandler.createError(
        ErrorCode.CLIENT_INVALID_REQUEST,
        undefined,
        '요청 본문이 비어있습니다.'
      )
    }
    
    return JSON.parse(text) as T
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw errorHandler.createError(
        ErrorCode.CLIENT_MALFORMED_DATA,
        error,
        '요청 데이터 형식이 올바르지 않습니다.'
      )
    }
    throw error
  }
}