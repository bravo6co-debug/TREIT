// 에러 로깅 시스템

import { AppError, ErrorSeverity } from './types'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  timestamp: string
  level: LogLevel
  errorCode: string
  category: string
  severity: string
  message: string
  userMessage: string
  context: any
  details?: string
  userId?: string
  sessionId?: string
}

export interface LoggerStats {
  totalLogs: number
  errorsByCategory: Record<string, number>
  errorsBySeverity: Record<string, number>
  recentErrors: LogEntry[]
}

export class ErrorLogger {
  private logs: LogEntry[] = []
  private maxLogs = 1000 // 메모리 사용량 제한
  private currentLogLevel: LogLevel
  private stats: LoggerStats = {
    totalLogs: 0,
    errorsByCategory: {},
    errorsBySeverity: {},
    recentErrors: []
  }

  constructor(logLevel: LogLevel = 'error') {
    this.currentLogLevel = logLevel
  }

  /**
   * 로그 레벨 업데이트
   */
  updateLogLevel(level: LogLevel): void {
    this.currentLogLevel = level
  }

  /**
   * AppError 로깅
   */
  log(error: AppError): void {
    const logLevel = this.getLogLevelFromSeverity(error.severity)
    
    if (!this.shouldLog(logLevel)) {
      return
    }

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: logLevel,
      errorCode: error.code,
      category: error.category,
      severity: error.severity,
      message: error.message,
      userMessage: error.userMessage,
      context: error.context,
      details: error.details,
      userId: error.context.userId,
      sessionId: error.context.sessionId
    }

    this.addLog(logEntry)
    this.updateStats(logEntry)
    this.logToConsole(logEntry)
  }

  /**
   * 일반 로그 추가
   */
  addLog(entry: LogEntry): void {
    this.logs.push(entry)
    
    // 최대 로그 수 제한
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }
  }

  /**
   * 통계 업데이트
   */
  private updateStats(entry: LogEntry): void {
    this.stats.totalLogs++
    
    // 카테고리별 통계
    this.stats.errorsByCategory[entry.category] = 
      (this.stats.errorsByCategory[entry.category] || 0) + 1
    
    // 심각도별 통계
    this.stats.errorsBySeverity[entry.severity] = 
      (this.stats.errorsBySeverity[entry.severity] || 0) + 1
    
    // 최근 에러 목록 (최대 10개)
    this.stats.recentErrors.push(entry)
    if (this.stats.recentErrors.length > 10) {
      this.stats.recentErrors = this.stats.recentErrors.slice(-10)
    }
  }

  /**
   * 콘솔에 로그 출력
   */
  private logToConsole(entry: LogEntry): void {
    if (typeof console === 'undefined') return

    const logMessage = `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.errorCode} - ${entry.message}`
    
    switch (entry.level) {
      case 'debug':
        console.debug(logMessage, entry)
        break
      case 'info':
        console.info(logMessage, entry)
        break
      case 'warn':
        console.warn(logMessage, entry)
        break
      case 'error':
        console.error(logMessage, entry)
        break
    }
  }

  /**
   * 에러 심각도에 따른 로그 레벨 결정
   */
  private getLogLevelFromSeverity(severity: ErrorSeverity): LogLevel {
    switch (severity) {
      case ErrorSeverity.LOW:
        return 'debug'
      case ErrorSeverity.MEDIUM:
        return 'warn'
      case ErrorSeverity.HIGH:
        return 'error'
      case ErrorSeverity.CRITICAL:
        return 'error'
      default:
        return 'error'
    }
  }

  /**
   * 현재 로그 레벨에서 로깅해야 하는지 확인
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']
    const currentLevelIndex = levels.indexOf(this.currentLogLevel)
    const targetLevelIndex = levels.indexOf(level)
    
    return targetLevelIndex >= currentLevelIndex
  }

  /**
   * 로그 조회 (페이징)
   */
  getLogs(
    page = 1, 
    pageSize = 50, 
    filters?: {
      level?: LogLevel
      category?: string
      severity?: ErrorSeverity
      userId?: string
      startTime?: string
      endTime?: string
    }
  ): { logs: LogEntry[], total: number } {
    let filteredLogs = [...this.logs]

    // 필터 적용
    if (filters) {
      if (filters.level) {
        filteredLogs = filteredLogs.filter(log => log.level === filters.level)
      }
      if (filters.category) {
        filteredLogs = filteredLogs.filter(log => log.category === filters.category)
      }
      if (filters.severity) {
        filteredLogs = filteredLogs.filter(log => log.severity === filters.severity)
      }
      if (filters.userId) {
        filteredLogs = filteredLogs.filter(log => log.userId === filters.userId)
      }
      if (filters.startTime) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.startTime!)
      }
      if (filters.endTime) {
        filteredLogs = filteredLogs.filter(log => log.timestamp <= filters.endTime!)
      }
    }

    // 최신 순으로 정렬
    filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // 페이징
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    const paginatedLogs = filteredLogs.slice(startIndex, endIndex)

    return {
      logs: paginatedLogs,
      total: filteredLogs.length
    }
  }

  /**
   * 특정 사용자의 에러 로그 조회
   */
  getUserErrorLogs(userId: string, limit = 20): LogEntry[] {
    return this.logs
      .filter(log => log.userId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
  }

  /**
   * 에러 패턴 분석
   */
  analyzeErrorPatterns(): {
    mostCommonErrors: Array<{ code: string, count: number }>
    errorTrends: Array<{ hour: number, count: number }>
    criticalErrorsLast24h: number
    userErrorFrequency: Array<{ userId: string, count: number }>
  } {
    const now = new Date()
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // 가장 많이 발생한 에러들
    const errorCounts: Record<string, number> = {}
    this.logs.forEach(log => {
      errorCounts[log.errorCode] = (errorCounts[log.errorCode] || 0) + 1
    })

    const mostCommonErrors = Object.entries(errorCounts)
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // 시간대별 에러 발생 트렌드 (최근 24시간)
    const hourlyErrors: Record<number, number> = {}
    this.logs
      .filter(log => new Date(log.timestamp) >= last24Hours)
      .forEach(log => {
        const hour = new Date(log.timestamp).getHours()
        hourlyErrors[hour] = (hourlyErrors[hour] || 0) + 1
      })

    const errorTrends = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: hourlyErrors[hour] || 0
    }))

    // 최근 24시간 동안의 심각한 에러 수
    const criticalErrorsLast24h = this.logs
      .filter(log => 
        new Date(log.timestamp) >= last24Hours &&
        (log.severity === ErrorSeverity.HIGH || log.severity === ErrorSeverity.CRITICAL)
      ).length

    // 사용자별 에러 발생 빈도
    const userErrorCounts: Record<string, number> = {}
    this.logs
      .filter(log => log.userId)
      .forEach(log => {
        userErrorCounts[log.userId!] = (userErrorCounts[log.userId!] || 0) + 1
      })

    const userErrorFrequency = Object.entries(userErrorCounts)
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return {
      mostCommonErrors,
      errorTrends,
      criticalErrorsLast24h,
      userErrorFrequency
    }
  }

  /**
   * 로그 통계 반환
   */
  getStats(): LoggerStats {
    return { ...this.stats }
  }

  /**
   * 로그 내보내기 (JSON 형태)
   */
  exportLogs(filters?: any): string {
    const { logs } = this.getLogs(1, this.logs.length, filters)
    return JSON.stringify(logs, null, 2)
  }

  /**
   * 로그를 외부 시스템으로 전송
   */
  async sendLogsToExternal(
    endpoint: string,
    logs: LogEntry[],
    apiKey?: string
  ): Promise<boolean> {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
        },
        body: JSON.stringify({ logs })
      })

      return response.ok
    } catch (error) {
      console.error('Failed to send logs to external system:', error)
      return false
    }
  }

  /**
   * 로그 정리 (오래된 로그 삭제)
   */
  cleanup(olderThanDays = 7): number {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)
    
    const initialLength = this.logs.length
    this.logs = this.logs.filter(log => new Date(log.timestamp) >= cutoffDate)
    
    const deletedCount = initialLength - this.logs.length
    
    // 통계 재계산
    this.recalculateStats()
    
    return deletedCount
  }

  /**
   * 통계 재계산
   */
  private recalculateStats(): void {
    this.stats = {
      totalLogs: this.logs.length,
      errorsByCategory: {},
      errorsBySeverity: {},
      recentErrors: []
    }

    this.logs.forEach(log => {
      this.stats.errorsByCategory[log.category] = 
        (this.stats.errorsByCategory[log.category] || 0) + 1
      
      this.stats.errorsBySeverity[log.severity] = 
        (this.stats.errorsBySeverity[log.severity] || 0) + 1
    })

    this.stats.recentErrors = this.logs
      .slice(-10)
      .reverse()
  }

  /**
   * 로그 저장소 초기화
   */
  clear(): void {
    this.logs = []
    this.stats = {
      totalLogs: 0,
      errorsByCategory: {},
      errorsBySeverity: {},
      recentErrors: []
    }
  }
}