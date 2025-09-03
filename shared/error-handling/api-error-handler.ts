// API 에러 처리 표준화

import { SupabaseClient } from '@supabase/supabase-js'
import { AppError, ErrorCode } from './types'
import { ErrorFactory } from './error-factory'
import { getErrorHandler } from './error-handler'

export interface ApiResponse<T> {
  data: T | null
  error: AppError | null
  success: boolean
}

export interface ApiRequestOptions {
  retries?: number
  timeout?: number
  context?: Record<string, any>
  abortController?: AbortController
}

export interface RetryOptions {
  maxRetries: number
  baseDelay: number
  backoffFactor: number
  jitter: boolean
}

export class ApiErrorHandler {
  private static defaultRetryOptions: RetryOptions = {
    maxRetries: 3,
    baseDelay: 1000,
    backoffFactor: 2,
    jitter: true
  }

  /**
   * Supabase 요청을 래핑하여 에러 처리
   */
  static async handleSupabaseRequest<T>(
    request: () => Promise<{ data: T | null; error: any }>,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const { retries = 0, context = {}, abortController } = options

    try {
      // 타임아웃 처리
      if (options.timeout) {
        const timeoutController = new AbortController()
        const timeoutId = setTimeout(() => timeoutController.abort(), options.timeout)
        
        // 기존 AbortController와 타임아웃 컨트롤러 조합
        const combinedController = this.combineAbortControllers(
          abortController, 
          timeoutController
        )

        try {
          const response = await request()
          clearTimeout(timeoutId)
          return this.processSupabaseResponse(response, context)
        } catch (error) {
          clearTimeout(timeoutId)
          if (error.name === 'AbortError') {
            return {
              data: null,
              error: ErrorFactory.create(
                ErrorCode.NETWORK_TIMEOUT,
                context,
                error,
                '요청 시간이 초과되었습니다.'
              ),
              success: false
            }
          }
          throw error
        }
      }

      const response = await request()
      return this.processSupabaseResponse(response, context)

    } catch (error) {
      // 재시도 로직
      if (retries > 0 && this.shouldRetry(error)) {
        const delay = this.calculateDelay(
          this.defaultRetryOptions.maxRetries - retries,
          this.defaultRetryOptions
        )
        
        await this.sleep(delay)
        
        return this.handleSupabaseRequest(request, {
          ...options,
          retries: retries - 1,
          context: { ...context, retryAttempt: this.defaultRetryOptions.maxRetries - retries + 1 }
        })
      }

      const appError = this.convertToAppError(error, context)
      
      // 에러 핸들러에 전달
      const errorHandler = getErrorHandler()
      errorHandler.handleErrorSync(appError, { ...context, source: 'api' })

      return {
        data: null,
        error: appError,
        success: false
      }
    }
  }

  /**
   * 일반 fetch 요청 처리
   */
  static async handleFetchRequest<T>(
    request: () => Promise<Response>,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const { retries = 0, context = {}, abortController } = options

    try {
      let response: Response

      // 타임아웃 처리
      if (options.timeout) {
        const timeoutController = new AbortController()
        const timeoutId = setTimeout(() => timeoutController.abort(), options.timeout)
        
        const combinedController = this.combineAbortControllers(
          abortController,
          timeoutController
        )

        try {
          response = await request()
          clearTimeout(timeoutId)
        } catch (error) {
          clearTimeout(timeoutId)
          throw error
        }
      } else {
        response = await request()
      }

      return this.processFetchResponse<T>(response, context)

    } catch (error) {
      // 재시도 로직
      if (retries > 0 && this.shouldRetry(error)) {
        const delay = this.calculateDelay(
          this.defaultRetryOptions.maxRetries - retries,
          this.defaultRetryOptions
        )
        
        await this.sleep(delay)
        
        return this.handleFetchRequest(request, {
          ...options,
          retries: retries - 1,
          context: { ...context, retryAttempt: this.defaultRetryOptions.maxRetries - retries + 1 }
        })
      }

      const appError = this.convertToAppError(error, context)
      
      // 에러 핸들러에 전달
      const errorHandler = getErrorHandler()
      errorHandler.handleErrorSync(appError, { ...context, source: 'api' })

      return {
        data: null,
        error: appError,
        success: false
      }
    }
  }

  /**
   * Supabase 응답 처리
   */
  private static processSupabaseResponse<T>(
    response: { data: T | null; error: any },
    context: Record<string, any>
  ): ApiResponse<T> {
    if (response.error) {
      const appError = ErrorFactory.fromSupabaseError(response.error, context)
      return {
        data: null,
        error: appError,
        success: false
      }
    }

    return {
      data: response.data,
      error: null,
      success: true
    }
  }

  /**
   * Fetch 응답 처리
   */
  private static async processFetchResponse<T>(
    response: Response,
    context: Record<string, any>
  ): Promise<ApiResponse<T>> {
    if (!response.ok) {
      let errorData: any = null
      
      try {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json()
        } else {
          errorData = await response.text()
        }
      } catch {
        // 응답 파싱 실패 시 무시
      }

      const appError = ErrorFactory.fromHttpStatus(
        response.status,
        { ...context, responseData: errorData, url: response.url },
        new Error(`HTTP ${response.status}: ${response.statusText}`)
      )

      return {
        data: null,
        error: appError,
        success: false
      }
    }

    try {
      const data = await response.json()
      return {
        data,
        error: null,
        success: true
      }
    } catch (error) {
      const appError = ErrorFactory.create(
        ErrorCode.CLIENT_MALFORMED_DATA,
        { ...context, parseError: true },
        error,
        '응답 데이터 형식이 올바르지 않습니다.'
      )

      return {
        data: null,
        error: appError,
        success: false
      }
    }
  }

  /**
   * 에러를 AppError로 변환
   */
  private static convertToAppError(error: any, context: Record<string, any>): AppError {
    // 네트워크 에러
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return ErrorFactory.fromNetworkError(error, context)
    }

    // AbortError (요청 취소/타임아웃)
    if (error.name === 'AbortError') {
      return ErrorFactory.create(
        ErrorCode.NETWORK_TIMEOUT,
        context,
        error,
        '요청이 취소되었거나 시간이 초과되었습니다.'
      )
    }

    // Supabase 에러
    if (error.code && typeof error.code === 'string') {
      return ErrorFactory.fromSupabaseError(error, context)
    }

    // 기본 에러
    return ErrorFactory.create(ErrorCode.SYSTEM_UNKNOWN_ERROR, context, error)
  }

  /**
   * 재시도 가능한 에러인지 확인
   */
  private static shouldRetry(error: any): boolean {
    // 네트워크 에러
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return true
    }

    // HTTP 상태 코드 기반
    if (error.status) {
      const retryableStatuses = [408, 429, 500, 502, 503, 504]
      return retryableStatuses.includes(error.status)
    }

    // Supabase 에러 (특정 코드만)
    if (error.code) {
      const retryableCodes = ['PGRST301', '23505'] // 일시적 에러 코드들
      return retryableCodes.includes(error.code)
    }

    return false
  }

  /**
   * 재시도 지연 시간 계산
   */
  private static calculateDelay(attempt: number, options: RetryOptions): number {
    const { baseDelay, backoffFactor, jitter } = options
    let delay = baseDelay * Math.pow(backoffFactor, attempt)

    // Jitter 추가 (지연 시간에 랜덤성 부여)
    if (jitter) {
      delay += Math.random() * delay * 0.1
    }

    return Math.min(delay, 30000) // 최대 30초
  }

  /**
   * 지연 실행
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * AbortController들을 조합
   */
  private static combineAbortControllers(
    ...controllers: (AbortController | undefined)[]
  ): AbortController {
    const combinedController = new AbortController()
    
    controllers.forEach(controller => {
      if (controller) {
        if (controller.signal.aborted) {
          combinedController.abort()
        } else {
          controller.signal.addEventListener('abort', () => {
            combinedController.abort()
          })
        }
      }
    })

    return combinedController
  }
}

/**
 * Supabase 클라이언트 래퍼 클래스
 */
export class SupabaseApiClient {
  private supabase: SupabaseClient

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient
  }

  /**
   * SELECT 쿼리 실행
   */
  async select<T>(
    table: string,
    options: {
      select?: string
      filter?: Record<string, any>
      order?: { column: string; ascending?: boolean }[]
      limit?: number
      offset?: number
      context?: Record<string, any>
    } = {}
  ): Promise<ApiResponse<T[]>> {
    const { select = '*', filter = {}, order = [], limit, offset, context = {} } = options

    return ApiErrorHandler.handleSupabaseRequest(
      async () => {
        let query = this.supabase.from(table).select(select)

        // 필터 적용
        Object.entries(filter).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            query = query.in(key, value)
          } else {
            query = query.eq(key, value)
          }
        })

        // 정렬 적용
        order.forEach(({ column, ascending = true }) => {
          query = query.order(column, { ascending })
        })

        // 페이징 적용
        if (limit) {
          query = query.limit(limit)
        }
        if (offset) {
          query = query.range(offset, offset + (limit || 1000) - 1)
        }

        return query
      },
      { context: { ...context, operation: 'select', table } }
    )
  }

  /**
   * INSERT 실행
   */
  async insert<T>(
    table: string,
    data: Partial<T> | Partial<T>[],
    options: {
      returning?: string
      context?: Record<string, any>
    } = {}
  ): Promise<ApiResponse<T[]>> {
    const { returning = '*', context = {} } = options

    return ApiErrorHandler.handleSupabaseRequest(
      async () => {
        return this.supabase
          .from(table)
          .insert(data)
          .select(returning)
      },
      { context: { ...context, operation: 'insert', table } }
    )
  }

  /**
   * UPDATE 실행
   */
  async update<T>(
    table: string,
    data: Partial<T>,
    filter: Record<string, any>,
    options: {
      returning?: string
      context?: Record<string, any>
    } = {}
  ): Promise<ApiResponse<T[]>> {
    const { returning = '*', context = {} } = options

    return ApiErrorHandler.handleSupabaseRequest(
      async () => {
        let query = this.supabase.from(table).update(data)

        Object.entries(filter).forEach(([key, value]) => {
          query = query.eq(key, value)
        })

        return query.select(returning)
      },
      { context: { ...context, operation: 'update', table } }
    )
  }

  /**
   * DELETE 실행
   */
  async delete<T>(
    table: string,
    filter: Record<string, any>,
    options: {
      returning?: string
      context?: Record<string, any>
    } = {}
  ): Promise<ApiResponse<T[]>> {
    const { returning, context = {} } = options

    return ApiErrorHandler.handleSupabaseRequest(
      async () => {
        let query = this.supabase.from(table).delete()

        Object.entries(filter).forEach(([key, value]) => {
          query = query.eq(key, value)
        })

        if (returning) {
          query = query.select(returning)
        }

        return query
      },
      { context: { ...context, operation: 'delete', table } }
    )
  }

  /**
   * RPC (원격 프로시저 호출) 실행
   */
  async rpc<T>(
    functionName: string,
    params: Record<string, any> = {},
    options: {
      context?: Record<string, any>
    } = {}
  ): Promise<ApiResponse<T>> {
    const { context = {} } = options

    return ApiErrorHandler.handleSupabaseRequest(
      async () => {
        return this.supabase.rpc(functionName, params)
      },
      { context: { ...context, operation: 'rpc', function: functionName } }
    )
  }

  /**
   * Auth 작업
   */
  async signIn(
    credentials: { email: string; password: string },
    context: Record<string, any> = {}
  ): Promise<ApiResponse<any>> {
    return ApiErrorHandler.handleSupabaseRequest(
      async () => {
        return this.supabase.auth.signInWithPassword(credentials)
      },
      { context: { ...context, operation: 'signIn' } }
    )
  }

  async signUp(
    credentials: { email: string; password: string; options?: any },
    context: Record<string, any> = {}
  ): Promise<ApiResponse<any>> {
    return ApiErrorHandler.handleSupabaseRequest(
      async () => {
        return this.supabase.auth.signUp(credentials)
      },
      { context: { ...context, operation: 'signUp' } }
    )
  }

  async signOut(context: Record<string, any> = {}): Promise<ApiResponse<void>> {
    return ApiErrorHandler.handleSupabaseRequest(
      async () => {
        const result = await this.supabase.auth.signOut()
        return { data: undefined, error: result.error }
      },
      { context: { ...context, operation: 'signOut' } }
    )
  }

  /**
   * 파일 업로드
   */
  async uploadFile(
    bucket: string,
    path: string,
    file: File,
    options: {
      cacheControl?: string
      contentType?: string
      upsert?: boolean
      context?: Record<string, any>
    } = {}
  ): Promise<ApiResponse<{ path: string; fullPath: string }>> {
    const { cacheControl, contentType, upsert = false, context = {} } = options

    // 파일 크기 검증
    if (file.size > 50 * 1024 * 1024) { // 50MB
      return {
        data: null,
        error: ErrorFactory.fromFileError(file, 'file_too_large', context),
        success: false
      }
    }

    return ApiErrorHandler.handleSupabaseRequest(
      async () => {
        const result = await this.supabase.storage
          .from(bucket)
          .upload(path, file, {
            cacheControl,
            contentType,
            upsert
          })

        if (result.error) {
          return { data: null, error: result.error }
        }

        return {
          data: {
            path: result.data.path,
            fullPath: result.data.fullPath
          },
          error: null
        }
      },
      { 
        timeout: 30000, // 파일 업로드는 타임아웃을 더 길게
        context: { ...context, operation: 'uploadFile', bucket, fileName: file.name }
      }
    )
  }
}