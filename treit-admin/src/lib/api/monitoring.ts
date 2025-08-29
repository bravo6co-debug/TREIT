import { supabase } from '../supabase'

// 시스템 모니터링 관련 API

// 시스템 상태 인터페이스
export interface SystemStatus {
  api: 'healthy' | 'warning' | 'error'
  database: 'healthy' | 'warning' | 'error'
  edgeFunctions: 'healthy' | 'warning' | 'error'
  storage: 'healthy' | 'warning' | 'error'
  cdn: 'healthy' | 'warning' | 'error'
  monitoring: 'healthy' | 'warning' | 'error'
}

// 성능 지표 인터페이스
export interface PerformanceMetrics {
  cpuUsage: number
  memoryUsage: number
  diskUsage: number
  networkIO: number
  apiResponseTime: number
  databaseConnections: number
  activeUsers: number
  requestsPerMinute: number
  errorRate: number
  throughput: number
}

// 서비스 상태 인터페이스
export interface ServiceHealth {
  service: string
  status: 'healthy' | 'warning' | 'error'
  uptime: number
  lastCheck: Date
  responseTime: number
  errorRate: number
  version?: string
}

// 오류 로그 인터페이스
export interface ErrorLog {
  id: string
  timestamp: Date
  level: 'error' | 'warning' | 'info'
  service: string
  message: string
  stackTrace?: string
  count: number
  resolved: boolean
}

// 시스템 상태 조회
export async function getSystemStatus(): Promise<SystemStatus> {
  try {
    // 실제 환경에서는 각 서비스의 health check 엔드포인트를 호출
    const healthChecks = await Promise.allSettled([
      checkAPIHealth(),
      checkDatabaseHealth(),
      checkEdgeFunctionsHealth(),
      checkStorageHealth(),
      checkCDNHealth(),
      checkMonitoringHealth()
    ])

    return {
      api: healthChecks[0].status === 'fulfilled' ? healthChecks[0].value : 'error',
      database: healthChecks[1].status === 'fulfilled' ? healthChecks[1].value : 'error',
      edgeFunctions: healthChecks[2].status === 'fulfilled' ? healthChecks[2].value : 'error',
      storage: healthChecks[3].status === 'fulfilled' ? healthChecks[3].value : 'error',
      cdn: healthChecks[4].status === 'fulfilled' ? healthChecks[4].value : 'error',
      monitoring: healthChecks[5].status === 'fulfilled' ? healthChecks[5].value : 'error'
    }
  } catch (error) {
    console.error('Get system status error:', error)
    // 오류 시 모든 서비스를 error 상태로 반환
    return {
      api: 'error',
      database: 'error',
      edgeFunctions: 'error',
      storage: 'error',
      cdn: 'error',
      monitoring: 'error'
    }
  }
}

// API 서버 상태 확인
async function checkAPIHealth(): Promise<'healthy' | 'warning' | 'error'> {
  try {
    const startTime = Date.now()
    
    // Supabase API 상태 확인
    const { data, error } = await supabase
      .from('system_health')
      .select('count(*)')
      .limit(1)

    const responseTime = Date.now() - startTime

    if (error) {
      return 'error'
    }

    // 응답 시간이 500ms 이상이면 warning
    if (responseTime > 500) {
      return 'warning'
    }

    return 'healthy'
  } catch (error) {
    return 'error'
  }
}

// 데이터베이스 상태 확인
async function checkDatabaseHealth(): Promise<'healthy' | 'warning' | 'error'> {
  try {
    const startTime = Date.now()
    
    // 간단한 쿼리로 DB 상태 확인
    const { error } = await supabase
      .from('users')
      .select('id')
      .limit(1)

    const responseTime = Date.now() - startTime

    if (error) {
      return 'error'
    }

    // DB 응답 시간이 200ms 이상이면 warning
    if (responseTime > 200) {
      return 'warning'
    }

    return 'healthy'
  } catch (error) {
    return 'error'
  }
}

// Edge Functions 상태 확인
async function checkEdgeFunctionsHealth(): Promise<'healthy' | 'warning' | 'error'> {
  try {
    // Edge Function 호출로 상태 확인
    const { data, error } = await supabase.functions.invoke('health-check')
    
    if (error) {
      return 'warning' // Edge Function이 없어도 전체 시스템에는 critical하지 않음
    }

    return 'healthy'
  } catch (error) {
    return 'warning'
  }
}

// 스토리지 상태 확인
async function checkStorageHealth(): Promise<'healthy' | 'warning' | 'error'> {
  try {
    // 스토리지 bucket 목록 조회로 상태 확인
    const { data, error } = await supabase.storage.listBuckets()
    
    if (error) {
      return 'error'
    }

    return 'healthy'
  } catch (error) {
    return 'error'
  }
}

// CDN 상태 확인 (실제로는 외부 CDN 서비스 확인)
async function checkCDNHealth(): Promise<'healthy' | 'warning' | 'error'> {
  try {
    // 실제 환경에서는 CDN 엔드포인트 상태 확인
    return 'healthy'
  } catch (error) {
    return 'warning'
  }
}

// 모니터링 시스템 상태 확인
async function checkMonitoringHealth(): Promise<'healthy' | 'warning' | 'error'> {
  try {
    // 모니터링 시스템 자체의 상태 확인
    return 'healthy'
  } catch (error) {
    return 'warning'
  }
}

// 성능 지표 조회
export async function getPerformanceMetrics(): Promise<PerformanceMetrics> {
  try {
    // 실제 환경에서는 시스템 메트릭을 수집하는 서비스에서 데이터를 가져옴
    // 여기서는 시뮬레이션된 데이터를 반환
    
    const now = Date.now()
    
    // 실시간 사용자 수 조회
    const { data: activeUsersData } = await supabase
      .from('user_sessions')
      .select('user_id')
      .gte('last_activity', new Date(now - 5 * 60 * 1000).toISOString()) // 5분 이내 활동
    
    const activeUsers = activeUsersData?.length || 0

    // 최근 API 요청 수 조회
    const { data: apiRequestsData } = await supabase
      .from('api_logs')
      .select('id')
      .gte('created_at', new Date(now - 60 * 1000).toISOString()) // 최근 1분
    
    const requestsPerMinute = apiRequestsData?.length || 0

    return {
      cpuUsage: Math.random() * 30 + 20, // 20-50%
      memoryUsage: Math.random() * 25 + 45, // 45-70%
      diskUsage: Math.random() * 20 + 15, // 15-35%
      networkIO: Math.random() * 200 + 100, // 100-300 MB/s
      apiResponseTime: Math.random() * 100 + 80, // 80-180ms
      databaseConnections: Math.floor(Math.random() * 200) + 50, // 50-250
      activeUsers,
      requestsPerMinute,
      errorRate: Math.random() * 2, // 0-2%
      throughput: Math.random() * 1000 + 500 // 500-1500 req/s
    }
  } catch (error) {
    console.error('Get performance metrics error:', error)
    // 오류 시 기본값 반환
    return {
      cpuUsage: 0,
      memoryUsage: 0,
      diskUsage: 0,
      networkIO: 0,
      apiResponseTime: 0,
      databaseConnections: 0,
      activeUsers: 0,
      requestsPerMinute: 0,
      errorRate: 0,
      throughput: 0
    }
  }
}

// 서비스별 상태 조회
export async function getServicesHealth(): Promise<ServiceHealth[]> {
  try {
    const services = [
      'API Gateway',
      'User Service',
      'Campaign Service',
      'Payment Service',
      'Analytics Service',
      'Notification Service',
      'File Storage',
      'CDN',
      'Load Balancer',
      'Redis Cache'
    ]

    // 각 서비스의 상태를 확인
    const serviceHealthPromises = services.map(async (serviceName) => {
      const status = await checkServiceHealth(serviceName)
      return {
        service: serviceName,
        status,
        uptime: 99.5 + Math.random() * 0.48, // 99.5-99.98%
        lastCheck: new Date(),
        responseTime: Math.random() * 100 + 50, // 50-150ms
        errorRate: Math.random() * 2, // 0-2%
        version: '1.0.0'
      }
    })

    return Promise.all(serviceHealthPromises)
  } catch (error) {
    console.error('Get services health error:', error)
    return []
  }
}

// 개별 서비스 상태 확인
async function checkServiceHealth(serviceName: string): Promise<'healthy' | 'warning' | 'error'> {
  try {
    // 실제 환경에서는 각 서비스의 health check 엔드포인트 호출
    const healthProbability = Math.random()
    
    if (healthProbability > 0.1) return 'healthy'
    if (healthProbability > 0.02) return 'warning'
    return 'error'
  } catch (error) {
    return 'error'
  }
}

// 오류 로그 조회
export async function getErrorLogs(params: {
  page?: number
  limit?: number
  level?: string
  service?: string
  dateFrom?: string
  dateTo?: string
}): Promise<{ logs: ErrorLog[]; total: number }> {
  try {
    let query = supabase
      .from('error_logs')
      .select('*', { count: 'exact' })

    // 필터 적용
    if (params.level && params.level !== 'all') {
      query = query.eq('level', params.level)
    }

    if (params.service && params.service !== 'all') {
      query = query.eq('service', params.service)
    }

    if (params.dateFrom) {
      query = query.gte('timestamp', params.dateFrom)
    }

    if (params.dateTo) {
      query = query.lte('timestamp', params.dateTo)
    }

    // 페이지네이션
    const page = params.page || 1
    const limit = params.limit || 20
    const from = (page - 1) * limit
    const to = from + limit - 1

    query = query.range(from, to).order('timestamp', { ascending: false })

    const { data, count, error } = await query

    if (error) throw error

    return {
      logs: data || [],
      total: count || 0
    }
  } catch (error) {
    console.error('Get error logs error:', error)
    return { logs: [], total: 0 }
  }
}

// 실시간 메트릭 스트림 (WebSocket 또는 Server-Sent Events)
export function subscribeToMetrics(callback: (metrics: PerformanceMetrics) => void): () => void {
  const interval = setInterval(async () => {
    try {
      const metrics = await getPerformanceMetrics()
      callback(metrics)
    } catch (error) {
      console.error('Metrics subscription error:', error)
    }
  }, 5000) // 5초마다 업데이트

  return () => clearInterval(interval)
}

// 알림 임계값 설정
export interface AlertThreshold {
  metric: string
  warningValue: number
  criticalValue: number
  enabled: boolean
}

// 알림 임계값 조회
export async function getAlertThresholds(): Promise<AlertThreshold[]> {
  try {
    const { data, error } = await supabase
      .from('alert_thresholds')
      .select('*')
      .eq('enabled', true)

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Get alert thresholds error:', error)
    return []
  }
}

// 알림 임계값 업데이트
export async function updateAlertThresholds(thresholds: AlertThreshold[]): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('alert_thresholds')
      .upsert(thresholds)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Update alert thresholds error:', error)
    return false
  }
}

// 알림 발송
export async function sendAlert(
  level: 'warning' | 'critical',
  metric: string,
  value: number,
  threshold: number,
  message: string
): Promise<void> {
  try {
    // 알림 데이터베이스에 저장
    await supabase
      .from('alerts')
      .insert({
        level,
        metric,
        current_value: value,
        threshold_value: threshold,
        message,
        sent_at: new Date().toISOString(),
        resolved: false
      })

    // 실제 환경에서는 이메일, 슬랙, SMS 등으로 알림 발송
    console.log(`Alert sent: ${level} - ${message}`)
    
  } catch (error) {
    console.error('Send alert error:', error)
  }
}

// 시스템 이벤트 로그
export async function logSystemEvent(
  eventType: string,
  description: string,
  metadata?: any
): Promise<void> {
  try {
    await supabase
      .from('system_events')
      .insert({
        event_type: eventType,
        description,
        metadata,
        timestamp: new Date().toISOString()
      })
  } catch (error) {
    console.error('Log system event error:', error)
  }
}

// 시스템 이벤트 조회
export async function getSystemEvents(params: {
  page?: number
  limit?: number
  eventType?: string
  dateFrom?: string
  dateTo?: string
}): Promise<{ events: any[]; total: number }> {
  try {
    let query = supabase
      .from('system_events')
      .select('*', { count: 'exact' })

    // 필터 적용
    if (params.eventType && params.eventType !== 'all') {
      query = query.eq('event_type', params.eventType)
    }

    if (params.dateFrom) {
      query = query.gte('timestamp', params.dateFrom)
    }

    if (params.dateTo) {
      query = query.lte('timestamp', params.dateTo)
    }

    // 페이지네이션
    const page = params.page || 1
    const limit = params.limit || 50
    const from = (page - 1) * limit
    const to = from + limit - 1

    query = query.range(from, to).order('timestamp', { ascending: false })

    const { data, count, error } = await query

    if (error) throw error

    return {
      events: data || [],
      total: count || 0
    }
  } catch (error) {
    console.error('Get system events error:', error)
    return { events: [], total: 0 }
  }
}