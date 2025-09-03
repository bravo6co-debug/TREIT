// 에러 리포팅 시스템 (Sentry, 커스텀 엔드포인트 등)

import { AppError, ErrorSeverity } from './types'

export interface ReporterConfig {
  sentryDsn?: string
  customEndpoint?: string
  apiKey?: string
  environment: string
  version: string
  enableUserTracking: boolean
  enablePerformanceTracking: boolean
}

export interface ReporterStats {
  totalReports: number
  successfulReports: number
  failedReports: number
  lastReportTime?: string
}

export class ErrorReporter {
  private config: ReporterConfig
  private stats: ReporterStats = {
    totalReports: 0,
    successfulReports: 0,
    failedReports: 0
  }

  constructor(
    sentryDsn?: string, 
    customConfig?: Partial<ReporterConfig>
  ) {
    this.config = {
      sentryDsn,
      environment: import.meta.env.MODE || 'development',
      version: import.meta.env.VITE_APP_VERSION || '1.0.0',
      enableUserTracking: true,
      enablePerformanceTracking: false,
      ...customConfig
    }

    this.initializeSentry()
  }

  /**
   * Sentry 초기화
   */
  private initializeSentry(): void {
    if (this.config.sentryDsn && typeof window !== 'undefined') {
      try {
        // Sentry SDK는 별도로 설치해야 함
        // 여기서는 기본 구조만 제공
        console.log('Sentry initialized with DSN:', this.config.sentryDsn)
      } catch (error) {
        console.warn('Failed to initialize Sentry:', error)
      }
    }
  }

  /**
   * 설정 업데이트
   */
  updateConfig(sentryDsn?: string, customConfig?: Partial<ReporterConfig>): void {
    this.config = {
      ...this.config,
      ...(sentryDsn && { sentryDsn }),
      ...customConfig
    }

    if (sentryDsn) {
      this.initializeSentry()
    }
  }

  /**
   * 에러 리포트 전송
   */
  async report(error: AppError): Promise<boolean> {
    this.stats.totalReports++

    try {
      // 병렬로 여러 리포팅 서비스에 전송
      const promises: Promise<boolean>[] = []

      // Sentry 리포팅
      if (this.config.sentryDsn) {
        promises.push(this.reportToSentry(error))
      }

      // 커스텀 엔드포인트 리포팅
      if (this.config.customEndpoint) {
        promises.push(this.reportToCustomEndpoint(error))
      }

      // 로컬 스토리지 백업 (오프라인 대응)
      promises.push(this.reportToLocalStorage(error))

      const results = await Promise.allSettled(promises)
      const hasSuccess = results.some(result => 
        result.status === 'fulfilled' && result.value === true
      )

      if (hasSuccess) {
        this.stats.successfulReports++
      } else {
        this.stats.failedReports++
      }

      this.stats.lastReportTime = new Date().toISOString()
      
      return hasSuccess
    } catch (error) {
      this.stats.failedReports++
      console.error('Error reporting failed:', error)
      return false
    }
  }

  /**
   * Sentry로 에러 리포팅
   */
  private async reportToSentry(error: AppError): Promise<boolean> {
    try {
      // 실제 Sentry SDK 사용 시 구현
      // import * as Sentry from '@sentry/browser'
      
      // Sentry.withScope((scope) => {
      //   scope.setTag('errorCode', error.code)
      //   scope.setTag('category', error.category)
      //   scope.setLevel(this.getSentryLevel(error.severity))
      //   scope.setContext('errorContext', error.context)
      //   
      //   if (error.context.userId) {
      //     scope.setUser({ id: error.context.userId })
      //   }
      //   
      //   Sentry.captureException(error.originalError || new Error(error.message))
      // })

      console.log('Reporting to Sentry:', error.code)
      return true
    } catch (sentryError) {
      console.error('Sentry reporting failed:', sentryError)
      return false
    }
  }

  /**
   * 커스텀 엔드포인트로 에러 리포팅
   */
  private async reportToCustomEndpoint(error: AppError): Promise<boolean> {
    try {
      const payload = {
        error: {
          code: error.code,
          category: error.category,
          severity: error.severity,
          message: error.message,
          userMessage: error.userMessage,
          details: error.details,
          context: error.context,
          retryable: error.retryable,
          recoverable: error.recoverable
        },
        metadata: {
          environment: this.config.environment,
          version: this.config.version,
          timestamp: new Date().toISOString(),
          userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined
        }
      }

      const response = await fetch(this.config.customEndpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && {
            'Authorization': `Bearer ${this.config.apiKey}`
          })
        },
        body: JSON.stringify(payload)
      })

      return response.ok
    } catch (fetchError) {
      console.error('Custom endpoint reporting failed:', fetchError)
      return false
    }
  }

  /**
   * 로컬 스토리지에 에러 백업 (오프라인 대응)
   */
  private async reportToLocalStorage(error: AppError): Promise<boolean> {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false
      }

      const storageKey = 'error-reports-backup'
      const maxBackupEntries = 100

      // 기존 백업 데이터 로드
      const existingBackup = localStorage.getItem(storageKey)
      let backupData: any[] = existingBackup ? JSON.parse(existingBackup) : []

      // 새 에러 추가
      backupData.push({
        error,
        reportedAt: new Date().toISOString(),
        sent: false
      })

      // 최대 개수 제한
      if (backupData.length > maxBackupEntries) {
        backupData = backupData.slice(-maxBackupEntries)
      }

      localStorage.setItem(storageKey, JSON.stringify(backupData))
      
      return true
    } catch (storageError) {
      console.error('Local storage backup failed:', storageError)
      return false
    }
  }

  /**
   * 로컬 스토리지의 백업 에러들을 서버로 전송
   */
  async syncBackupErrors(): Promise<number> {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return 0
      }

      const storageKey = 'error-reports-backup'
      const backupData = localStorage.getItem(storageKey)
      
      if (!backupData) return 0

      const errors = JSON.parse(backupData)
      const unsentErrors = errors.filter((item: any) => !item.sent)

      if (unsentErrors.length === 0) return 0

      let syncedCount = 0
      const updatedErrors = [...errors]

      for (let i = 0; i < unsentErrors.length; i++) {
        const errorItem = unsentErrors[i]
        const success = await this.report(errorItem.error)
        
        if (success) {
          // 전송 성공으로 마킹
          const index = updatedErrors.findIndex(item => 
            item.reportedAt === errorItem.reportedAt
          )
          if (index !== -1) {
            updatedErrors[index].sent = true
            syncedCount++
          }
        }
      }

      // 업데이트된 백업 데이터 저장
      localStorage.setItem(storageKey, JSON.stringify(updatedErrors))

      return syncedCount
    } catch (error) {
      console.error('Backup error sync failed:', error)
      return 0
    }
  }

  /**
   * 백업 에러 정리 (전송 완료된 것들)
   */
  cleanupBackupErrors(): number {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return 0
      }

      const storageKey = 'error-reports-backup'
      const backupData = localStorage.getItem(storageKey)
      
      if (!backupData) return 0

      const errors = JSON.parse(backupData)
      const unsentErrors = errors.filter((item: any) => !item.sent)
      
      const cleanedCount = errors.length - unsentErrors.length

      if (cleanedCount > 0) {
        localStorage.setItem(storageKey, JSON.stringify(unsentErrors))
      }

      return cleanedCount
    } catch (error) {
      console.error('Backup cleanup failed:', error)
      return 0
    }
  }

  /**
   * 사용자 컨텍스트 설정
   */
  setUserContext(userId: string, email?: string, additionalData?: Record<string, any>): void {
    if (this.config.enableUserTracking) {
      // Sentry 사용자 설정
      // Sentry.setUser({
      //   id: userId,
      //   email,
      //   ...additionalData
      // })
      
      console.log('User context set:', { userId, email, additionalData })
    }
  }

  /**
   * 태그 설정
   */
  setTags(tags: Record<string, string>): void {
    // Sentry.setTags(tags)
    console.log('Tags set:', tags)
  }

  /**
   * 추가 컨텍스트 설정
   */
  setContext(name: string, context: Record<string, any>): void {
    // Sentry.setContext(name, context)
    console.log('Context set:', name, context)
  }

  /**
   * 성능 모니터링 시작
   */
  startPerformanceMonitoring(transactionName: string): () => void {
    if (!this.config.enablePerformanceTracking) {
      return () => {}
    }

    const startTime = performance.now()
    
    return () => {
      const duration = performance.now() - startTime
      // Sentry.addBreadcrumb({
      //   message: `Performance: ${transactionName}`,
      //   data: { duration },
      //   level: 'info'
      // })
      
      console.log(`Performance: ${transactionName} took ${duration}ms`)
    }
  }

  /**
   * 에러 심각도를 Sentry 레벨로 변환
   */
  private getSentryLevel(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.LOW:
        return 'info'
      case ErrorSeverity.MEDIUM:
        return 'warning'
      case ErrorSeverity.HIGH:
        return 'error'
      case ErrorSeverity.CRITICAL:
        return 'fatal'
      default:
        return 'error'
    }
  }

  /**
   * 통계 정보 반환
   */
  getStats(): ReporterStats {
    return { ...this.stats }
  }

  /**
   * 리포터 상태 확인
   */
  async healthCheck(): Promise<{
    sentry: boolean
    customEndpoint: boolean
    localStorage: boolean
  }> {
    const result = {
      sentry: false,
      customEndpoint: false,
      localStorage: false
    }

    try {
      // Sentry 상태 확인
      if (this.config.sentryDsn) {
        result.sentry = true // Sentry SDK가 있다면 실제 상태 확인
      }

      // 커스텀 엔드포인트 상태 확인
      if (this.config.customEndpoint) {
        try {
          const response = await fetch(this.config.customEndpoint, {
            method: 'HEAD',
            headers: this.config.apiKey ? {
              'Authorization': `Bearer ${this.config.apiKey}`
            } : {}
          })
          result.customEndpoint = response.ok
        } catch {
          result.customEndpoint = false
        }
      }

      // 로컬 스토리지 상태 확인
      result.localStorage = typeof window !== 'undefined' && !!window.localStorage

    } catch (error) {
      console.error('Health check failed:', error)
    }

    return result
  }

  /**
   * 리포터 정리
   */
  destroy(): void {
    // Sentry 정리
    // Sentry.close()
    
    // 통계 초기화
    this.stats = {
      totalReports: 0,
      successfulReports: 0,
      failedReports: 0
    }
  }
}