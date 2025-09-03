// 통합 에러 처리 시스템 타입 정의

export enum ErrorCategory {
  // 네트워크 관련
  NETWORK = 'NETWORK',
  // 인증 관련
  AUTH = 'AUTH',
  // 권한 관련
  PERMISSION = 'PERMISSION',
  // 결제 관련
  PAYMENT = 'PAYMENT',
  // 파일 업로드 관련
  FILE_UPLOAD = 'FILE_UPLOAD',
  // 데이터베이스 관련
  DATABASE = 'DATABASE',
  // 서버 에러
  SERVER = 'SERVER',
  // 클라이언트 에러
  CLIENT = 'CLIENT',
  // 폼 검증 에러
  VALIDATION = 'VALIDATION',
  // 비즈니스 로직 에러
  BUSINESS = 'BUSINESS',
  // 시스템 에러
  SYSTEM = 'SYSTEM'
}

export enum ErrorSeverity {
  LOW = 'LOW',      // 경고, 사용자에게 알리지 않아도 됨
  MEDIUM = 'MEDIUM', // 사용자에게 알려야 함
  HIGH = 'HIGH',     // 즉시 대응 필요
  CRITICAL = 'CRITICAL' // 시스템 장애 수준
}

export enum ErrorCode {
  // 네트워크 에러
  NETWORK_CONNECTION_FAILED = 'NETWORK_CONNECTION_FAILED',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  NETWORK_OFFLINE = 'NETWORK_OFFLINE',
  NETWORK_DNS_ERROR = 'NETWORK_DNS_ERROR',

  // 인증 에러
  AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
  AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  AUTH_USER_NOT_FOUND = 'AUTH_USER_NOT_FOUND',
  AUTH_EMAIL_NOT_VERIFIED = 'AUTH_EMAIL_NOT_VERIFIED',
  AUTH_ACCOUNT_LOCKED = 'AUTH_ACCOUNT_LOCKED',
  AUTH_PASSWORD_WEAK = 'AUTH_PASSWORD_WEAK',

  // 권한 에러
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  PERMISSION_INSUFFICIENT = 'PERMISSION_INSUFFICIENT',
  PERMISSION_ROLE_REQUIRED = 'PERMISSION_ROLE_REQUIRED',

  // 결제 에러
  PAYMENT_CARD_DECLINED = 'PAYMENT_CARD_DECLINED',
  PAYMENT_INSUFFICIENT_FUNDS = 'PAYMENT_INSUFFICIENT_FUNDS',
  PAYMENT_INVALID_CARD = 'PAYMENT_INVALID_CARD',
  PAYMENT_PROCESSING_FAILED = 'PAYMENT_PROCESSING_FAILED',
  PAYMENT_GATEWAY_ERROR = 'PAYMENT_GATEWAY_ERROR',

  // 파일 업로드 에러
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  FILE_INVALID_TYPE = 'FILE_INVALID_TYPE',
  FILE_UPLOAD_FAILED = 'FILE_UPLOAD_FAILED',
  FILE_STORAGE_FULL = 'FILE_STORAGE_FULL',

  // 데이터베이스 에러
  DB_CONNECTION_FAILED = 'DB_CONNECTION_FAILED',
  DB_QUERY_ERROR = 'DB_QUERY_ERROR',
  DB_CONSTRAINT_VIOLATION = 'DB_CONSTRAINT_VIOLATION',
  DB_RECORD_NOT_FOUND = 'DB_RECORD_NOT_FOUND',
  DB_DUPLICATE_ENTRY = 'DB_DUPLICATE_ENTRY',

  // 서버 에러
  SERVER_INTERNAL_ERROR = 'SERVER_INTERNAL_ERROR',
  SERVER_SERVICE_UNAVAILABLE = 'SERVER_SERVICE_UNAVAILABLE',
  SERVER_GATEWAY_TIMEOUT = 'SERVER_GATEWAY_TIMEOUT',
  SERVER_MAINTENANCE = 'SERVER_MAINTENANCE',

  // 클라이언트 에러
  CLIENT_INVALID_REQUEST = 'CLIENT_INVALID_REQUEST',
  CLIENT_MALFORMED_DATA = 'CLIENT_MALFORMED_DATA',
  CLIENT_BROWSER_COMPATIBILITY = 'CLIENT_BROWSER_COMPATIBILITY',

  // 폼 검증 에러
  VALIDATION_REQUIRED_FIELD = 'VALIDATION_REQUIRED_FIELD',
  VALIDATION_INVALID_FORMAT = 'VALIDATION_INVALID_FORMAT',
  VALIDATION_MIN_LENGTH = 'VALIDATION_MIN_LENGTH',
  VALIDATION_MAX_LENGTH = 'VALIDATION_MAX_LENGTH',
  VALIDATION_INVALID_EMAIL = 'VALIDATION_INVALID_EMAIL',
  VALIDATION_INVALID_PHONE = 'VALIDATION_INVALID_PHONE',

  // 비즈니스 로직 에러
  BUSINESS_INSUFFICIENT_BALANCE = 'BUSINESS_INSUFFICIENT_BALANCE',
  BUSINESS_CAMPAIGN_EXPIRED = 'BUSINESS_CAMPAIGN_EXPIRED',
  BUSINESS_LIMIT_EXCEEDED = 'BUSINESS_LIMIT_EXCEEDED',
  BUSINESS_INVALID_STATUS = 'BUSINESS_INVALID_STATUS',

  // 시스템 에러
  SYSTEM_UNKNOWN_ERROR = 'SYSTEM_UNKNOWN_ERROR'
}

export interface ErrorContext {
  userId?: string
  sessionId?: string
  component?: string
  action?: string
  url?: string
  userAgent?: string
  timestamp: string
  additionalData?: Record<string, any>
}

export interface AppError {
  code: ErrorCode
  category: ErrorCategory
  severity: ErrorSeverity
  message: string // 개발자용 메시지 (영어)
  userMessage: string // 사용자용 메시지 (한국어)
  details?: string
  context: ErrorContext
  originalError?: Error | unknown
  retryable: boolean
  recoverable: boolean
}

export interface ErrorMetrics {
  errorId: string
  count: number
  firstOccurrence: string
  lastOccurrence: string
  affectedUsers: number
  category: ErrorCategory
  severity: ErrorSeverity
}

export interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  backoffFactor: number
  retryableErrors: ErrorCode[]
}

export interface ErrorRecoveryAction {
  label: string
  action: () => void | Promise<void>
  type: 'retry' | 'refresh' | 'redirect' | 'custom'
}

export interface ErrorHandlerConfig {
  enableLogging: boolean
  enableReporting: boolean
  enableMetrics: boolean
  sentryDsn?: string
  logLevel: 'debug' | 'info' | 'warn' | 'error'
  notificationConfig: {
    toast: boolean
    modal: boolean
    console: boolean
  }
  retryConfig: RetryConfig
}

// HTTP 상태 코드 매핑
export const HTTP_STATUS_TO_ERROR_CODE: Record<number, ErrorCode> = {
  400: ErrorCode.CLIENT_INVALID_REQUEST,
  401: ErrorCode.AUTH_TOKEN_EXPIRED,
  403: ErrorCode.PERMISSION_DENIED,
  404: ErrorCode.DB_RECORD_NOT_FOUND,
  408: ErrorCode.NETWORK_TIMEOUT,
  409: ErrorCode.DB_DUPLICATE_ENTRY,
  422: ErrorCode.VALIDATION_INVALID_FORMAT,
  429: ErrorCode.BUSINESS_LIMIT_EXCEEDED,
  500: ErrorCode.SERVER_INTERNAL_ERROR,
  502: ErrorCode.NETWORK_CONNECTION_FAILED,
  503: ErrorCode.SERVER_SERVICE_UNAVAILABLE,
  504: ErrorCode.SERVER_GATEWAY_TIMEOUT,
}

// Supabase 에러 매핑
export const SUPABASE_ERROR_TO_ERROR_CODE: Record<string, ErrorCode> = {
  'PGRST116': ErrorCode.DB_RECORD_NOT_FOUND,
  'PGRST301': ErrorCode.PERMISSION_DENIED,
  '23505': ErrorCode.DB_DUPLICATE_ENTRY,
  '23503': ErrorCode.DB_CONSTRAINT_VIOLATION,
  'invalid_grant': ErrorCode.AUTH_INVALID_CREDENTIALS,
  'email_not_confirmed': ErrorCode.AUTH_EMAIL_NOT_VERIFIED,
  'signup_disabled': ErrorCode.AUTH_ACCOUNT_LOCKED,
  'weak_password': ErrorCode.AUTH_PASSWORD_WEAK,
}

// 에러 메시지 한국어 번역
export const ERROR_MESSAGES_KO: Record<ErrorCode, string> = {
  // 네트워크 에러
  [ErrorCode.NETWORK_CONNECTION_FAILED]: '네트워크 연결에 실패했습니다. 인터넷 연결을 확인해주세요.',
  [ErrorCode.NETWORK_TIMEOUT]: '요청 시간이 초과되었습니다. 다시 시도해주세요.',
  [ErrorCode.NETWORK_OFFLINE]: '인터넷 연결이 끊어졌습니다. 연결을 확인해주세요.',
  [ErrorCode.NETWORK_DNS_ERROR]: 'DNS 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',

  // 인증 에러
  [ErrorCode.AUTH_TOKEN_EXPIRED]: '로그인이 만료되었습니다. 다시 로그인해주세요.',
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: '이메일 또는 비밀번호가 잘못되었습니다.',
  [ErrorCode.AUTH_USER_NOT_FOUND]: '등록되지 않은 사용자입니다.',
  [ErrorCode.AUTH_EMAIL_NOT_VERIFIED]: '이메일 인증이 필요합니다. 인증 메일을 확인해주세요.',
  [ErrorCode.AUTH_ACCOUNT_LOCKED]: '계정이 잠겨있습니다. 고객센터에 문의해주세요.',
  [ErrorCode.AUTH_PASSWORD_WEAK]: '비밀번호가 너무 단순합니다. 더 복잡한 비밀번호를 사용해주세요.',

  // 권한 에러
  [ErrorCode.PERMISSION_DENIED]: '접근 권한이 없습니다.',
  [ErrorCode.PERMISSION_INSUFFICIENT]: '권한이 부족합니다. 관리자에게 문의해주세요.',
  [ErrorCode.PERMISSION_ROLE_REQUIRED]: '특정 역할이 필요한 기능입니다.',

  // 결제 에러
  [ErrorCode.PAYMENT_CARD_DECLINED]: '카드 결제가 거절되었습니다. 다른 카드를 이용해주세요.',
  [ErrorCode.PAYMENT_INSUFFICIENT_FUNDS]: '잔액이 부족합니다.',
  [ErrorCode.PAYMENT_INVALID_CARD]: '유효하지 않은 카드입니다.',
  [ErrorCode.PAYMENT_PROCESSING_FAILED]: '결제 처리 중 오류가 발생했습니다.',
  [ErrorCode.PAYMENT_GATEWAY_ERROR]: '결제 시스템 오류입니다. 잠시 후 다시 시도해주세요.',

  // 파일 업로드 에러
  [ErrorCode.FILE_TOO_LARGE]: '파일 크기가 너무 큽니다. 더 작은 파일을 선택해주세요.',
  [ErrorCode.FILE_INVALID_TYPE]: '지원하지 않는 파일 형식입니다.',
  [ErrorCode.FILE_UPLOAD_FAILED]: '파일 업로드에 실패했습니다. 다시 시도해주세요.',
  [ErrorCode.FILE_STORAGE_FULL]: '저장공간이 부족합니다.',

  // 데이터베이스 에러
  [ErrorCode.DB_CONNECTION_FAILED]: '데이터베이스 연결에 실패했습니다.',
  [ErrorCode.DB_QUERY_ERROR]: '데이터 조회 중 오류가 발생했습니다.',
  [ErrorCode.DB_CONSTRAINT_VIOLATION]: '데이터 제약 조건에 위반됩니다.',
  [ErrorCode.DB_RECORD_NOT_FOUND]: '요청한 데이터를 찾을 수 없습니다.',
  [ErrorCode.DB_DUPLICATE_ENTRY]: '이미 존재하는 데이터입니다.',

  // 서버 에러
  [ErrorCode.SERVER_INTERNAL_ERROR]: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  [ErrorCode.SERVER_SERVICE_UNAVAILABLE]: '서비스를 일시적으로 이용할 수 없습니다.',
  [ErrorCode.SERVER_GATEWAY_TIMEOUT]: '서버 응답시간이 초과되었습니다.',
  [ErrorCode.SERVER_MAINTENANCE]: '서비스 점검 중입니다. 잠시 후 이용해주세요.',

  // 클라이언트 에러
  [ErrorCode.CLIENT_INVALID_REQUEST]: '잘못된 요청입니다.',
  [ErrorCode.CLIENT_MALFORMED_DATA]: '데이터 형식이 올바르지 않습니다.',
  [ErrorCode.CLIENT_BROWSER_COMPATIBILITY]: '브라우저가 지원되지 않습니다. 최신 브라우저를 사용해주세요.',

  // 폼 검증 에러
  [ErrorCode.VALIDATION_REQUIRED_FIELD]: '필수 입력 항목입니다.',
  [ErrorCode.VALIDATION_INVALID_FORMAT]: '형식이 올바르지 않습니다.',
  [ErrorCode.VALIDATION_MIN_LENGTH]: '최소 길이를 만족하지 않습니다.',
  [ErrorCode.VALIDATION_MAX_LENGTH]: '최대 길이를 초과했습니다.',
  [ErrorCode.VALIDATION_INVALID_EMAIL]: '올바른 이메일 주소를 입력해주세요.',
  [ErrorCode.VALIDATION_INVALID_PHONE]: '올바른 전화번호를 입력해주세요.',

  // 비즈니스 로직 에러
  [ErrorCode.BUSINESS_INSUFFICIENT_BALANCE]: '잔액이 부족합니다.',
  [ErrorCode.BUSINESS_CAMPAIGN_EXPIRED]: '캠페인이 종료되었습니다.',
  [ErrorCode.BUSINESS_LIMIT_EXCEEDED]: '한도를 초과했습니다.',
  [ErrorCode.BUSINESS_INVALID_STATUS]: '현재 상태에서는 해당 작업을 수행할 수 없습니다.',

  // 시스템 에러
  [ErrorCode.SYSTEM_UNKNOWN_ERROR]: '알 수 없는 오류가 발생했습니다. 문제가 지속되면 고객센터에 문의해주세요.'
}