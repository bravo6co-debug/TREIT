// 에러 처리 관련 React 훅들

import { useCallback, useEffect, useState, useRef } from 'react'
import { AppError, ErrorCode, ErrorRecoveryAction } from './types'
import { ErrorFactory } from './error-factory'
import { getErrorHandler } from './error-handler'

/**
 * 에러 상태와 핸들링을 위한 훅
 */
export function useErrorHandler() {
  const [error, setError] = useState<AppError | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  const retryCountRef = useRef(0)

  const handleError = useCallback((error: unknown, context?: Record<string, any>) => {
    let appError: AppError

    if (error instanceof Error && 'code' in error) {
      appError = error as AppError
    } else {
      appError = ErrorFactory.create(
        ErrorCode.SYSTEM_UNKNOWN_ERROR,
        context,
        error
      )
    }

    setError(appError)
    
    // 전역 에러 핸들러로 전달
    try {
      const errorHandler = getErrorHandler()
      errorHandler.handleErrorSync(appError, context)
    } catch (handlerError) {
      console.error('Error handler failed in useErrorHandler:', handlerError)
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
    retryCountRef.current = 0
    setIsRetrying(false)
  }, [])

  const retry = useCallback(async (retryFn?: () => Promise<void> | void) => {
    if (!error || retryCountRef.current >= 5) return

    setIsRetrying(true)
    retryCountRef.current += 1

    try {
      if (retryFn) {
        await retryFn()
      }
      clearError()
    } catch (retryError) {
      handleError(retryError, { 
        action: 'retry_attempt',
        retryCount: retryCountRef.current 
      })
    } finally {
      setIsRetrying(false)
    }
  }, [error, handleError, clearError])

  return {
    error,
    isRetrying,
    retryCount: retryCountRef.current,
    handleError,
    clearError,
    retry,
    canRetry: error?.retryable && retryCountRef.current < 5
  }
}

/**
 * 비동기 작업을 안전하게 실행하는 훅
 */
export function useAsyncError() {
  const { handleError } = useErrorHandler()

  const executeAsync = useCallback(
    async <T>(
      asyncFn: () => Promise<T>,
      context?: Record<string, any>
    ): Promise<T | null> => {
      try {
        return await asyncFn()
      } catch (error) {
        handleError(error, { ...context, action: 'async_execution' })
        return null
      }
    },
    [handleError]
  )

  return executeAsync
}

/**
 * API 요청을 위한 에러 처리 훅
 */
export function useApiError() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<AppError | null>(null)

  const executeApiCall = useCallback(
    async <T>(
      apiCall: () => Promise<T>,
      options?: {
        onSuccess?: (data: T) => void
        onError?: (error: AppError) => void
        context?: Record<string, any>
      }
    ): Promise<T | null> => {
      setLoading(true)
      setError(null)

      try {
        const result = await apiCall()
        options?.onSuccess?.(result)
        return result
      } catch (error) {
        let appError: AppError

        // HTTP 에러 처리
        if (error && typeof error === 'object' && 'status' in error) {
          appError = ErrorFactory.fromHttpStatus(
            error.status as number,
            options?.context,
            error
          )
        } 
        // Supabase 에러 처리
        else if (error && typeof error === 'object' && 'code' in error) {
          appError = ErrorFactory.fromSupabaseError(error, options?.context)
        }
        // 네트워크 에러 처리
        else if (error instanceof TypeError && error.message.includes('fetch')) {
          appError = ErrorFactory.fromNetworkError(error, options?.context)
        }
        // 기본 에러 처리
        else {
          appError = ErrorFactory.create(
            ErrorCode.SYSTEM_UNKNOWN_ERROR,
            options?.context,
            error
          )
        }

        setError(appError)
        options?.onError?.(appError)

        // 전역 에러 핸들러로 전달
        try {
          const errorHandler = getErrorHandler()
          errorHandler.handleErrorSync(appError, {
            ...options?.context,
            action: 'api_call'
          })
        } catch (handlerError) {
          console.error('Error handler failed in useApiError:', handlerError)
        }

        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const clearError = useCallback(() => setError(null), [])

  return {
    loading,
    error,
    executeApiCall,
    clearError
  }
}

/**
 * 폼 검증 에러를 처리하는 훅
 */
export function useFormError() {
  const [errors, setErrors] = useState<Record<string, AppError>>({})

  const setFieldError = useCallback((field: string, error: AppError | string) => {
    let appError: AppError

    if (typeof error === 'string') {
      appError = ErrorFactory.fromValidationError(field, '', 'required', { field })
      appError.userMessage = error
    } else {
      appError = error
    }

    setErrors(prev => ({
      ...prev,
      [field]: appError
    }))
  }, [])

  const clearFieldError = useCallback((field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[field]
      return newErrors
    })
  }, [])

  const clearAllErrors = useCallback(() => {
    setErrors({})
  }, [])

  const validateField = useCallback((
    field: string,
    value: any,
    rules: {
      required?: boolean
      minLength?: number
      maxLength?: number
      pattern?: RegExp
      custom?: (value: any) => string | null
    }
  ) => {
    if (rules.required && (!value || value.toString().trim() === '')) {
      setFieldError(field, ErrorFactory.fromValidationError(field, value, 'required'))
      return false
    }

    if (value && rules.minLength && value.toString().length < rules.minLength) {
      setFieldError(field, ErrorFactory.fromValidationError(field, value, 'minLength'))
      return false
    }

    if (value && rules.maxLength && value.toString().length > rules.maxLength) {
      setFieldError(field, ErrorFactory.fromValidationError(field, value, 'maxLength'))
      return false
    }

    if (value && rules.pattern && !rules.pattern.test(value.toString())) {
      setFieldError(field, ErrorFactory.fromValidationError(field, value, 'pattern'))
      return false
    }

    if (rules.custom) {
      const customError = rules.custom(value)
      if (customError) {
        setFieldError(field, customError)
        return false
      }
    }

    clearFieldError(field)
    return true
  }, [setFieldError, clearFieldError])

  return {
    errors,
    hasErrors: Object.keys(errors).length > 0,
    getFieldError: (field: string) => errors[field],
    setFieldError,
    clearFieldError,
    clearAllErrors,
    validateField
  }
}

/**
 * 재시도 로직을 포함한 훅
 */
export function useRetry(
  asyncFn: () => Promise<any>,
  options?: {
    maxRetries?: number
    baseDelay?: number
    backoffFactor?: number
    shouldRetry?: (error: any, attempt: number) => boolean
  }
) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<AppError | null>(null)
  const [attemptCount, setAttemptCount] = useState(0)
  const [data, setData] = useState<any>(null)

  const {
    maxRetries = 3,
    baseDelay = 1000,
    backoffFactor = 2,
    shouldRetry
  } = options || {}

  const execute = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    let attempt = 0

    const attemptExecution = async (): Promise<any> => {
      try {
        const result = await asyncFn()
        setData(result)
        setAttemptCount(attempt)
        return result
      } catch (error) {
        attempt++
        setAttemptCount(attempt)

        const appError = ErrorFactory.create(
          ErrorCode.SYSTEM_UNKNOWN_ERROR,
          { attempt, maxRetries },
          error
        )

        // 재시도 조건 확인
        const canRetry = attempt < maxRetries && 
          (shouldRetry ? shouldRetry(error, attempt) : appError.retryable)

        if (canRetry) {
          const delay = baseDelay * Math.pow(backoffFactor, attempt - 1)
          await new Promise(resolve => setTimeout(resolve, delay))
          return attemptExecution()
        } else {
          setError(appError)
          throw appError
        }
      }
    }

    try {
      const result = await attemptExecution()
      return result
    } finally {
      setIsLoading(false)
    }
  }, [asyncFn, maxRetries, baseDelay, backoffFactor, shouldRetry])

  const reset = useCallback(() => {
    setError(null)
    setData(null)
    setAttemptCount(0)
    setIsLoading(false)
  }, [])

  return {
    execute,
    reset,
    isLoading,
    error,
    data,
    attemptCount,
    canRetry: error?.retryable && attemptCount < maxRetries
  }
}

/**
 * 에러 복구 액션을 관리하는 훅
 */
export function useErrorRecovery() {
  const [recoveryActions, setRecoveryActions] = useState<ErrorRecoveryAction[]>([])

  const addRecoveryAction = useCallback((action: ErrorRecoveryAction) => {
    setRecoveryActions(prev => [...prev, action])
  }, [])

  const removeRecoveryAction = useCallback((index: number) => {
    setRecoveryActions(prev => prev.filter((_, i) => i !== index))
  }, [])

  const executeRecoveryAction = useCallback(async (index: number) => {
    const action = recoveryActions[index]
    if (!action) return

    try {
      await action.action()
    } catch (error) {
      console.error('Recovery action failed:', error)
    }
  }, [recoveryActions])

  const clearRecoveryActions = useCallback(() => {
    setRecoveryActions([])
  }, [])

  return {
    recoveryActions,
    addRecoveryAction,
    removeRecoveryAction,
    executeRecoveryAction,
    clearRecoveryActions
  }
}

/**
 * 전역 에러 상태를 관리하는 훅
 */
export function useGlobalError() {
  const [globalErrors, setGlobalErrors] = useState<AppError[]>([])

  useEffect(() => {
    // 전역 에러 이벤트 리스너 등록
    const handleGlobalError = (event: CustomEvent<AppError>) => {
      setGlobalErrors(prev => [...prev, event.detail])
    }

    window.addEventListener('global-error' as any, handleGlobalError)
    
    return () => {
      window.removeEventListener('global-error' as any, handleGlobalError)
    }
  }, [])

  const dismissError = useCallback((errorId: string) => {
    setGlobalErrors(prev => 
      prev.filter(error => 
        error.context.timestamp !== errorId
      )
    )
  }, [])

  const dismissAllErrors = useCallback(() => {
    setGlobalErrors([])
  }, [])

  return {
    globalErrors,
    dismissError,
    dismissAllErrors,
    hasErrors: globalErrors.length > 0
  }
}