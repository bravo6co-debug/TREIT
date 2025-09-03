// React 에러 바운더리 컴포넌트

import React, { Component, ReactNode, ErrorInfo } from 'react'
import { AppError, ErrorCode, ErrorCategory, ErrorSeverity } from './types'
import { ErrorFactory } from './error-factory'
import { getErrorHandler } from './error-handler'

export interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode | ((error: AppError, retry: () => void) => ReactNode)
  onError?: (error: AppError, errorInfo: ErrorInfo) => void
  enableRetry?: boolean
  retryButtonText?: string
  resetOnPropsChange?: boolean
  resetKeys?: Array<string | number>
  level?: 'page' | 'component' | 'feature'
  name?: string
}

export interface ErrorBoundaryState {
  hasError: boolean
  error: AppError | null
  retryCount: number
  errorId: string
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null
  private resetTimeoutId: NodeJS.Timeout | null = null

  constructor(props: ErrorBoundaryProps) {
    super(props)
    
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0,
      errorId: ''
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // 에러가 발생하면 상태를 업데이트하여 폴백 UI를 렌더링
    const errorId = `boundary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    return {
      hasError: true,
      errorId
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // AppError로 변환
    const appError = ErrorFactory.create(
      ErrorCode.CLIENT_MALFORMED_DATA,
      {
        component: this.props.name || 'ErrorBoundary',
        action: 'component_render',
        componentStack: errorInfo.componentStack,
        errorBoundary: errorInfo.errorBoundary?.toString()
      },
      error,
      '페이지에서 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    )

    // 상태 업데이트
    this.setState({
      error: appError,
      retryCount: this.state.retryCount + 1
    })

    // 에러 핸들러로 전달
    try {
      const errorHandler = getErrorHandler()
      errorHandler.handleErrorSync(appError, {
        level: this.props.level || 'component',
        boundaryName: this.props.name
      })
    } catch (handlerError) {
      console.error('Error handler failed:', handlerError)
    }

    // 사용자 정의 에러 콜백 실행
    if (this.props.onError) {
      try {
        this.props.onError(appError, errorInfo)
      } catch (callbackError) {
        console.error('Error callback failed:', callbackError)
      }
    }

    // 개발 환경에서 상세 로그
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 ErrorBoundary: ${this.props.name || 'Unknown'}`)
      console.error('Original Error:', error)
      console.error('Error Info:', errorInfo)
      console.error('App Error:', appError)
      console.groupEnd()
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetOnPropsChange, resetKeys } = this.props
    const { hasError } = this.state

    // props 변경으로 에러 상태 리셋
    if (hasError && resetOnPropsChange && resetKeys) {
      const hasResetKeyChanged = resetKeys.some((key, idx) => 
        prevProps.resetKeys?.[idx] !== key
      )

      if (hasResetKeyChanged) {
        this.resetError()
      }
    }
  }

  componentWillUnmount() {
    this.clearTimeouts()
  }

  private clearTimeouts = () => {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
      this.retryTimeoutId = null
    }
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
      this.resetTimeoutId = null
    }
  }

  private resetError = () => {
    this.clearTimeouts()
    this.setState({
      hasError: false,
      error: null,
      retryCount: 0,
      errorId: ''
    })
  }

  private handleRetry = () => {
    const { retryCount } = this.state
    
    // 최대 재시도 횟수 제한 (5회)
    if (retryCount >= 5) {
      console.warn('Maximum retry attempts reached')
      return
    }

    // 재시도 지연 (exponential backoff)
    const delay = Math.min(1000 * Math.pow(2, retryCount), 10000)
    
    this.retryTimeoutId = setTimeout(() => {
      this.resetError()
    }, delay)
  }

  private renderFallbackUI = (): ReactNode => {
    const { fallback, enableRetry = true, retryButtonText = '다시 시도' } = this.props
    const { error, retryCount } = this.state

    // 사용자 정의 폴백 UI
    if (fallback) {
      if (typeof fallback === 'function') {
        return fallback(error!, this.handleRetry)
      }
      return fallback
    }

    // 기본 폴백 UI
    return (
      <DefaultErrorFallback
        error={error!}
        onRetry={enableRetry ? this.handleRetry : undefined}
        retryButtonText={retryButtonText}
        retryCount={retryCount}
      />
    )
  }

  render() {
    const { hasError } = this.state
    const { children } = this.props

    if (hasError) {
      return this.renderFallbackUI()
    }

    return children
  }
}

// 기본 에러 폴백 UI 컴포넌트
interface DefaultErrorFallbackProps {
  error: AppError
  onRetry?: () => void
  retryButtonText: string
  retryCount: number
}

const DefaultErrorFallback: React.FC<DefaultErrorFallbackProps> = ({
  error,
  onRetry,
  retryButtonText,
  retryCount
}) => {
  const canRetry = onRetry && retryCount < 5

  return (
    <div className="error-boundary-fallback">
      <div className="error-content">
        <div className="error-icon">⚠️</div>
        <h2 className="error-title">문제가 발생했습니다</h2>
        <p className="error-message">{error.userMessage}</p>
        
        {process.env.NODE_ENV === 'development' && (
          <details className="error-details">
            <summary>개발자 정보</summary>
            <pre>{JSON.stringify(error, null, 2)}</pre>
          </details>
        )}

        <div className="error-actions">
          {canRetry && (
            <button 
              onClick={onRetry}
              className="error-retry-button"
              disabled={retryCount >= 5}
            >
              {retryButtonText}
              {retryCount > 0 && ` (${retryCount}/5)`}
            </button>
          )}
          
          <button 
            onClick={() => window.location.reload()}
            className="error-refresh-button"
          >
            페이지 새로고침
          </button>
        </div>

        {retryCount >= 5 && (
          <p className="error-max-retry">
            최대 재시도 횟수에 도달했습니다. 페이지를 새로고침하거나 나중에 다시 시도해주세요.
          </p>
        )}
      </div>

      <style jsx>{`
        .error-boundary-fallback {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 200px;
          padding: 2rem;
          background-color: #fafafa;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
        }

        .error-content {
          text-align: center;
          max-width: 500px;
        }

        .error-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .error-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: #333;
          margin-bottom: 0.5rem;
        }

        .error-message {
          color: #666;
          margin-bottom: 1.5rem;
          line-height: 1.5;
        }

        .error-details {
          text-align: left;
          margin-bottom: 1.5rem;
          background-color: #f5f5f5;
          padding: 1rem;
          border-radius: 4px;
        }

        .error-details summary {
          cursor: pointer;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .error-details pre {
          font-size: 0.75rem;
          color: #555;
          white-space: pre-wrap;
          word-break: break-all;
        }

        .error-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .error-retry-button,
        .error-refresh-button {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 4px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .error-retry-button {
          background-color: #3b82f6;
          color: white;
        }

        .error-retry-button:hover:not(:disabled) {
          background-color: #2563eb;
        }

        .error-retry-button:disabled {
          background-color: #9ca3af;
          cursor: not-allowed;
        }

        .error-refresh-button {
          background-color: #6b7280;
          color: white;
        }

        .error-refresh-button:hover {
          background-color: #4b5563;
        }

        .error-max-retry {
          margin-top: 1rem;
          font-size: 0.875rem;
          color: #ef4444;
        }
      `}</style>
    </div>
  )
}

// HOC를 위한 래퍼
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const ComponentWithErrorBoundary = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  ComponentWithErrorBoundary.displayName = 
    `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`

  return ComponentWithErrorBoundary
}

// 특정 레벨별 에러 바운더리 미리 설정된 컴포넌트들
export const PageErrorBoundary: React.FC<Omit<ErrorBoundaryProps, 'level'>> = (props) => (
  <ErrorBoundary {...props} level="page" />
)

export const ComponentErrorBoundary: React.FC<Omit<ErrorBoundaryProps, 'level'>> = (props) => (
  <ErrorBoundary {...props} level="component" />
)

export const FeatureErrorBoundary: React.FC<Omit<ErrorBoundaryProps, 'level'>> = (props) => (
  <ErrorBoundary {...props} level="feature" />
)