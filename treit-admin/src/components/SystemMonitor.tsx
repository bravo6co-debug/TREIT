import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Progress } from './ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { 
  Server, 
  Database, 
  Zap, 
  HardDrive, 
  Wifi, 
  Cpu, 
  Memory, 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  RefreshCw,
  Monitor,
  Globe,
  Shield,
  Clock,
  BarChart3,
  TrendingUp,
  Users,
  MousePointer,
  Eye,
  Settings,
  Gauge,
  Download
} from 'lucide-react'

// 시스템 모니터링 데이터 타입 정의
interface SystemStatus {
  api: 'healthy' | 'warning' | 'error'
  database: 'healthy' | 'warning' | 'error'
  edgeFunctions: 'healthy' | 'warning' | 'error'
  storage: 'healthy' | 'warning' | 'error'
  cdn: 'healthy' | 'warning' | 'error'
  monitoring: 'healthy' | 'warning' | 'error'
}

interface PerformanceMetrics {
  cpuUsage: number
  memoryUsage: number
  diskUsage: number
  networkIO: number
  apiResponseTime: number
  databaseConnections: number
  activeUsers: number
  requestsPerMinute: number
}

interface ErrorLog {
  id: string
  timestamp: Date
  level: 'error' | 'warning' | 'info'
  service: string
  message: string
  count: number
}

interface ServiceHealth {
  service: string
  status: 'healthy' | 'warning' | 'error'
  uptime: number
  lastCheck: Date
  responseTime: number
  errorRate: number
}

// 실시간 시스템 데이터 생성
const generateSystemStatus = (): SystemStatus => ({
  api: Math.random() > 0.05 ? 'healthy' : Math.random() > 0.5 ? 'warning' : 'error',
  database: Math.random() > 0.02 ? 'healthy' : 'warning',
  edgeFunctions: Math.random() > 0.03 ? 'healthy' : 'warning',
  storage: Math.random() > 0.01 ? 'healthy' : 'warning',
  cdn: Math.random() > 0.04 ? 'healthy' : 'warning',
  monitoring: Math.random() > 0.01 ? 'healthy' : 'warning'
})

const generatePerformanceMetrics = (): PerformanceMetrics => ({
  cpuUsage: Math.random() * 30 + 20, // 20-50%
  memoryUsage: Math.random() * 25 + 45, // 45-70%
  diskUsage: Math.random() * 20 + 15, // 15-35%
  networkIO: Math.random() * 200 + 100, // 100-300 MB/s
  apiResponseTime: Math.random() * 100 + 80, // 80-180ms
  databaseConnections: Math.floor(Math.random() * 200) + 50, // 50-250
  activeUsers: Math.floor(Math.random() * 1000) + 500, // 500-1500
  requestsPerMinute: Math.floor(Math.random() * 2000) + 800 // 800-2800
})

const generateErrorLogs = (): ErrorLog[] => {
  const services = ['API Server', 'Database', 'Edge Functions', 'CDN', 'Storage', 'Auth Service']
  const messages = [
    'Connection timeout exceeded',
    'Memory usage threshold reached',
    'Rate limit exceeded for client',
    'Database query timeout',
    'SSL certificate validation failed',
    'Cache miss rate too high',
    'Disk space warning',
    'High response time detected'
  ]
  
  return Array.from({ length: 20 }, (_, i) => ({
    id: `error-${i + 1}`,
    timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
    level: ['error', 'warning', 'info'][Math.floor(Math.random() * 3)] as any,
    service: services[Math.floor(Math.random() * services.length)],
    message: messages[Math.floor(Math.random() * messages.length)],
    count: Math.floor(Math.random() * 10) + 1
  }))
}

const generateServiceHealth = (): ServiceHealth[] => {
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
  
  return services.map((service, i) => ({
    service,
    status: Math.random() > 0.1 ? 'healthy' : Math.random() > 0.5 ? 'warning' : 'error',
    uptime: 99.5 + Math.random() * 0.48, // 99.5-99.98%
    lastCheck: new Date(Date.now() - Math.random() * 60000), // within last minute
    responseTime: Math.random() * 100 + 50, // 50-150ms
    errorRate: Math.random() * 2 // 0-2%
  }))
}

export function SystemMonitor() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus>(generateSystemStatus())
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>(generatePerformanceMetrics())
  const [errorLogs] = useState<ErrorLog[]>(generateErrorLogs())
  const [serviceHealth] = useState<ServiceHealth[]>(generateServiceHealth())
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)

  // 실시간 데이터 업데이트
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemStatus(generateSystemStatus())
      setPerformanceMetrics(generatePerformanceMetrics())
      setLastUpdate(new Date())
    }, 5000) // 5초마다 업데이트

    return () => clearInterval(interval)
  }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // API 호출 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 1000))
    setSystemStatus(generateSystemStatus())
    setPerformanceMetrics(generatePerformanceMetrics())
    setLastUpdate(new Date())
    setIsRefreshing(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600'
      case 'warning': return 'text-yellow-600'
      case 'error': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4" />
      case 'warning': return <AlertTriangle className="w-4 h-4" />
      case 'error': return <X className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="outline" className="text-green-600 border-green-600">정상</Badge>
      case 'warning':
        return <Badge variant="secondary" className="text-yellow-600">주의</Badge>
      case 'error':
        return <Badge variant="destructive">오류</Badge>
      default:
        return <Badge variant="secondary">알 수 없음</Badge>
    }
  }

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'error':
        return <Badge variant="destructive">ERROR</Badge>
      case 'warning':
        return <Badge variant="secondary" className="text-yellow-600">WARNING</Badge>
      case 'info':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">INFO</Badge>
      default:
        return <Badge variant="secondary">UNKNOWN</Badge>
    }
  }

  const getPerformanceColor = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return 'bg-red-500'
    if (value >= thresholds.warning) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">시스템 모니터링</h1>
          <p className="text-sm text-muted-foreground">
            마지막 업데이트: {lastUpdate.toLocaleString('ko-KR')}
          </p>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={isRefreshing}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          새로고침
        </Button>
      </div>

      {/* 시스템 상태 개요 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(systemStatus).map(([service, status]) => (
          <Card key={service}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  service === 'api' ? 'bg-blue-100' :
                  service === 'database' ? 'bg-green-100' :
                  service === 'edgeFunctions' ? 'bg-purple-100' :
                  service === 'storage' ? 'bg-orange-100' :
                  service === 'cdn' ? 'bg-pink-100' : 'bg-gray-100'
                }`}>
                  {service === 'api' && <Server className="w-5 h-5 text-blue-600" />}
                  {service === 'database' && <Database className="w-5 h-5 text-green-600" />}
                  {service === 'edgeFunctions' && <Zap className="w-5 h-5 text-purple-600" />}
                  {service === 'storage' && <HardDrive className="w-5 h-5 text-orange-600" />}
                  {service === 'cdn' && <Globe className="w-5 h-5 text-pink-600" />}
                  {service === 'monitoring' && <Activity className="w-5 h-5 text-gray-600" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">
                      {service === 'api' && 'API 서버'}
                      {service === 'database' && '데이터베이스'}
                      {service === 'edgeFunctions' && 'Edge Functions'}
                      {service === 'storage' && '스토리지'}
                      {service === 'cdn' && 'CDN'}
                      {service === 'monitoring' && '모니터링'}
                    </p>
                    <div className={`flex items-center gap-1 ${getStatusColor(status)}`}>
                      {getStatusIcon(status)}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {status === 'healthy' ? '정상 작동 중' : status === 'warning' ? '주의 필요' : '오류 발생'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance">성능 지표</TabsTrigger>
          <TabsTrigger value="services">서비스 상태</TabsTrigger>
          <TabsTrigger value="logs">오류 로그</TabsTrigger>
          <TabsTrigger value="alerts">알림 설정</TabsTrigger>
        </TabsList>

        {/* 성능 지표 탭 */}
        <TabsContent value="performance" className="space-y-6">
          {/* 실시간 성능 지표 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="w-4 h-4" />
                  서버 리소스
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>CPU 사용률</span>
                    <span>{performanceMetrics.cpuUsage.toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={performanceMetrics.cpuUsage} 
                    className="h-3"
                    style={{ 
                      '--progress-color': getPerformanceColor(performanceMetrics.cpuUsage, { warning: 70, critical: 85 })
                    } as any}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>메모리 사용률</span>
                    <span>{performanceMetrics.memoryUsage.toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={performanceMetrics.memoryUsage} 
                    className="h-3"
                    style={{ 
                      '--progress-color': getPerformanceColor(performanceMetrics.memoryUsage, { warning: 75, critical: 90 })
                    } as any}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>디스크 사용률</span>
                    <span>{performanceMetrics.diskUsage.toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={performanceMetrics.diskUsage} 
                    className="h-3"
                    style={{ 
                      '--progress-color': getPerformanceColor(performanceMetrics.diskUsage, { warning: 80, critical: 95 })
                    } as any}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>네트워크 I/O</span>
                    <span>{performanceMetrics.networkIO.toFixed(1)} MB/s</span>
                  </div>
                  <Progress 
                    value={Math.min((performanceMetrics.networkIO / 500) * 100, 100)} 
                    className="h-3"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  API 성능
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {performanceMetrics.apiResponseTime.toFixed(0)}ms
                    </div>
                    <div className="text-sm text-muted-foreground">평균 응답시간</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">99.2%</div>
                    <div className="text-sm text-muted-foreground">성공률</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {performanceMetrics.requestsPerMinute.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">분당 요청</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {performanceMetrics.databaseConnections}
                    </div>
                    <div className="text-sm text-muted-foreground">DB 연결</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 사용자 활동 지표 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">활성 사용자</p>
                    <p className="font-bold">{performanceMetrics.activeUsers.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <MousePointer className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">실시간 클릭</p>
                    <p className="font-bold">1,247</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Eye className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">페이지뷰</p>
                    <p className="font-bold">45,293</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <BarChart3 className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">세션</p>
                    <p className="font-bold">8,934</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 서비스 상태 탭 */}
        <TabsContent value="services" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>서비스별 상태</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {serviceHealth.map((service) => (
                  <div key={service.service} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${
                        service.status === 'healthy' ? 'bg-green-100' :
                        service.status === 'warning' ? 'bg-yellow-100' : 'bg-red-100'
                      }`}>
                        {getStatusIcon(service.status)}
                      </div>
                      <div>
                        <h3 className="font-medium">{service.service}</h3>
                        <p className="text-sm text-muted-foreground">
                          마지막 확인: {service.lastCheck.toLocaleTimeString('ko-KR')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-sm font-medium">가동률</div>
                        <div className="text-lg font-bold text-green-600">
                          {service.uptime.toFixed(2)}%
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">응답시간</div>
                        <div className="text-lg font-bold">
                          {service.responseTime.toFixed(0)}ms
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">오류율</div>
                        <div className={`text-lg font-bold ${service.errorRate > 1 ? 'text-red-600' : 'text-green-600'}`}>
                          {service.errorRate.toFixed(2)}%
                        </div>
                      </div>
                      {getStatusBadge(service.status)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 오류 로그 탭 */}
        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>최근 오류 로그</CardTitle>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  로그 다운로드
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {errorLogs.slice(0, 10).map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg border">
                    <div className="flex-shrink-0">
                      {getLevelBadge(log.level)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">{log.service}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{log.timestamp.toLocaleString('ko-KR')}</span>
                          {log.count > 1 && (
                            <Badge variant="secondary" className="text-xs">
                              {log.count}회
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{log.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 알림 설정 탭 */}
        <TabsContent value="alerts" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  알림 임계값 설정
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">CPU 사용률 경고</span>
                    <Badge variant="outline">70%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">메모리 사용률 경고</span>
                    <Badge variant="outline">75%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">디스크 사용률 경고</span>
                    <Badge variant="outline">80%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">API 응답시간 경고</span>
                    <Badge variant="outline">200ms</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">오류율 경고</span>
                    <Badge variant="outline">1%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  알림 채널
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">이메일 알림</span>
                    <Badge variant="destructive">활성</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">슬랙 알림</span>
                    <Badge variant="destructive">활성</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">SMS 알림</span>
                    <Badge variant="secondary">비활성</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">웹훅</span>
                    <Badge variant="destructive">활성</Badge>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium mb-2">알림 대상</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>• admin@treitmaster.com</p>
                    <p>• tech-team@treitmaster.com</p>
                    <p>• #alerts (Slack)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>실시간 모니터링 활성화</AlertTitle>
            <AlertDescription>
              모든 시스템 구성 요소가 실시간으로 모니터링되고 있으며, 임계값을 초과할 경우 즉시 알림이 발송됩니다.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  )
}