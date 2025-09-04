import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Progress } from './ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { 
  Users, 
  Building2, 
  MousePointer, 
  DollarSign, 
  TrendingUp, 
  Activity, 
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Bell,
  RefreshCw,
  Calendar,
  BarChart3,
  Eye,
  Server,
  Database,
  Wifi,
  HardDrive,
  Trophy
} from 'lucide-react'
import { RealTimeChart } from './RealTimeChart'
import { AlertSystem } from './AlertSystem'
import { RankingMonitor } from './RankingMonitor'

interface DashboardStats {
  totalUsers: number
  activeUsers: number
  totalAdvertisers: number
  activeCampaigns: number
  dailyClicks: number
  platformRevenue: number
  averageCTR: number
  systemUptime: number
}

interface SystemHealth {
  api: 'healthy' | 'warning' | 'error'
  database: 'healthy' | 'warning' | 'error'
  edgeFunctions: 'healthy' | 'warning' | 'error'
  storage: 'healthy' | 'warning' | 'error'
}

interface RecentActivity {
  id: string
  type: 'user_joined' | 'campaign_approved' | 'fraud_detected' | 'payment_processed' | 'system_alert'
  description: string
  timestamp: Date
  severity: 'info' | 'warning' | 'error' | 'success'
}

// 실시간 통계 데이터 시뮬레이션
const generateRealTimeStats = (): DashboardStats => ({
  totalUsers: 12847 + Math.floor(Math.random() * 10),
  activeUsers: 8934 + Math.floor(Math.random() * 50),
  totalAdvertisers: 342 + Math.floor(Math.random() * 3),
  activeCampaigns: 89 + Math.floor(Math.random() * 5),
  dailyClicks: 47293 + Math.floor(Math.random() * 1000),
  platformRevenue: 2800000 + Math.floor(Math.random() * 100000),
  averageCTR: 2.34 + (Math.random() * 0.2 - 0.1),
  systemUptime: 99.8 + (Math.random() * 0.2 - 0.1)
})

// 시스템 상태 시뮬레이션
const generateSystemHealth = (): SystemHealth => ({
  api: Math.random() > 0.05 ? 'healthy' : 'warning',
  database: Math.random() > 0.02 ? 'healthy' : 'warning',
  edgeFunctions: Math.random() > 0.03 ? 'healthy' : 'warning',
  storage: Math.random() > 0.01 ? 'healthy' : 'warning'
})

// 최근 활동 생성
const generateRecentActivities = (): RecentActivity[] => {
  const activities = [
    { type: 'user_joined', description: '신규 유저 김민수님이 가입했습니다', severity: 'success' },
    { type: 'campaign_approved', description: '패션브랜드A 캠페인이 승인되었습니다', severity: 'info' },
    { type: 'fraud_detected', description: '의심스러운 클릭 패턴이 감지되었습니다', severity: 'warning' },
    { type: 'payment_processed', description: '₩1,500,000 출금 처리가 완료되었습니다', severity: 'success' },
    { type: 'system_alert', description: 'API 응답 시간이 평균보다 높습니다', severity: 'warning' },
    { type: 'user_joined', description: '신규 유저 이수진님이 가입했습니다', severity: 'success' },
    { type: 'campaign_approved', description: '게임스튜디오 캠페인이 승인되었습니다', severity: 'info' },
    { type: 'fraud_detected', description: '어뷰징 계정 3개가 자동 차단되었습니다', severity: 'error' }
  ] as const

  return activities.slice(0, 6).map((activity, index) => ({
    id: `activity-${index}`,
    type: activity.type,
    description: activity.description,
    severity: activity.severity,
    timestamp: new Date(Date.now() - index * 1000 * 60 * Math.random() * 60)
  }))
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>(generateRealTimeStats())
  const [systemHealth, setSystemHealth] = useState<SystemHealth>(generateSystemHealth())
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>(generateRecentActivities())
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)

  // 실시간 데이터 업데이트
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(generateRealTimeStats())
      setSystemHealth(generateSystemHealth())
      setRecentActivities(generateRecentActivities())
      setLastUpdate(new Date())
    }, 10000) // 10초마다 업데이트

    return () => clearInterval(interval)
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ko-KR').format(num)
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // API 호출 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 1000))
    setStats(generateRealTimeStats())
    setSystemHealth(generateSystemHealth())
    setRecentActivities(generateRecentActivities())
    setLastUpdate(new Date())
    setIsRefreshing(false)
  }

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600'
      case 'warning': return 'text-yellow-600'
      case 'error': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4" />
      case 'warning': return <AlertTriangle className="w-4 h-4" />
      case 'error': return <Shield className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_joined': return <Users className="w-4 h-4 text-blue-600" />
      case 'campaign_approved': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'fraud_detected': return <Shield className="w-4 h-4 text-red-600" />
      case 'payment_processed': return <DollarSign className="w-4 h-4 text-green-600" />
      case 'system_alert': return <AlertTriangle className="w-4 h-4 text-yellow-600" />
      default: return <Bell className="w-4 h-4 text-gray-600" />
    }
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">관리자 대시보드</h1>
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

      {/* 핵심 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">총 유저</p>
                <p className="text-3xl font-bold">{formatNumber(stats.totalUsers)}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  활성: {formatNumber(stats.activeUsers)}명
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600 font-medium">+12.5%</span>
                <span className="text-sm text-muted-foreground">전월 대비</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">일일 클릭</p>
                <p className="text-3xl font-bold">{formatNumber(stats.dailyClicks)}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  CTR: {stats.averageCTR.toFixed(2)}%
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <MousePointer className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600 font-medium">+8.3%</span>
                <span className="text-sm text-muted-foreground">전일 대비</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">플랫폼 수익</p>
                <p className="text-3xl font-bold">{formatCurrency(stats.platformRevenue)}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  오늘 수익
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600 font-medium">+15.7%</span>
                <span className="text-sm text-muted-foreground">목표 달성</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">시스템 상태</p>
                <p className="text-3xl font-bold">{stats.systemUptime.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground mt-1">
                  서버 가동률
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Activity className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-4">
              <Badge variant="outline" className="text-green-600 border-green-600">
                안정
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 메인 콘텐츠 탭 */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="ranking">랭킹 모니터</TabsTrigger>
          <TabsTrigger value="system">시스템 상태</TabsTrigger>
          <TabsTrigger value="activities">활동 로그</TabsTrigger>
          <TabsTrigger value="alerts">경고 센터</TabsTrigger>
        </TabsList>

        {/* 개요 탭 */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  실시간 트래픽
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RealTimeChart />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  캠페인 현황
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">활성 캠페인</span>
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    {stats.activeCampaigns}개
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">승인 대기</span>
                  <Badge variant="secondary">12개</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">일시정지</span>
                  <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                    3개
                  </Badge>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground mb-2">오늘 캠페인 성과</div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>평균 CTR</span>
                      <span className="font-medium">{stats.averageCTR.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>총 클릭 수</span>
                      <span className="font-medium">{formatNumber(stats.dailyClicks)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  주요 지표 트렌드
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">+2.1%</div>
                    <div className="text-sm text-muted-foreground">신규 유저</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">+15.3%</div>
                    <div className="text-sm text-muted-foreground">수익 증가</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">98.7%</div>
                    <div className="text-sm text-muted-foreground">만족도</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <AlertSystem />
          </div>
        </TabsContent>

        {/* 랭킹 모니터 탭 */}
        <TabsContent value="ranking" className="space-y-6">
          <RankingMonitor />
        </TabsContent>

        {/* 시스템 상태 탭 */}
        <TabsContent value="system" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Server className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">API 서버</p>
                      <div className={`flex items-center gap-1 ${getHealthColor(systemHealth.api)}`}>
                        {getHealthIcon(systemHealth.api)}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {systemHealth.api === 'healthy' ? '정상' : systemHealth.api === 'warning' ? '주의' : '오류'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Database className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">데이터베이스</p>
                      <div className={`flex items-center gap-1 ${getHealthColor(systemHealth.database)}`}>
                        {getHealthIcon(systemHealth.database)}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {systemHealth.database === 'healthy' ? '정상' : systemHealth.database === 'warning' ? '주의' : '오류'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Zap className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">Edge Functions</p>
                      <div className={`flex items-center gap-1 ${getHealthColor(systemHealth.edgeFunctions)}`}>
                        {getHealthIcon(systemHealth.edgeFunctions)}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {systemHealth.edgeFunctions === 'healthy' ? '정상' : systemHealth.edgeFunctions === 'warning' ? '주의' : '오류'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <HardDrive className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">스토리지</p>
                      <div className={`flex items-center gap-1 ${getHealthColor(systemHealth.storage)}`}>
                        {getHealthIcon(systemHealth.storage)}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {systemHealth.storage === 'healthy' ? '정상' : systemHealth.storage === 'warning' ? '주의' : '오류'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>서버 성능 지표</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>CPU 사용률</span>
                    <span>45%</span>
                  </div>
                  <Progress value={45} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>메모리 사용률</span>
                    <span>67%</span>
                  </div>
                  <Progress value={67} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>디스크 사용률</span>
                    <span>23%</span>
                  </div>
                  <Progress value={23} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>네트워크 I/O</span>
                    <span>156 MB/s</span>
                  </div>
                  <Progress value={78} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>API 응답 시간</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-lg font-bold text-green-600">127ms</div>
                    <div className="text-muted-foreground">평균 응답시간</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-lg font-bold text-blue-600">99.2%</div>
                    <div className="text-muted-foreground">성공률</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-lg font-bold text-purple-600">1,247</div>
                    <div className="text-muted-foreground">분당 요청</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-lg font-bold text-orange-600">3</div>
                    <div className="text-muted-foreground">오류 수</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 활동 로그 탭 */}
        <TabsContent value="activities" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                최근 활동
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg border">
                    <div className="p-2 rounded-full bg-muted">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.timestamp.toLocaleString('ko-KR')}
                      </p>
                    </div>
                    <Badge 
                      variant={activity.severity === 'error' ? 'destructive' : 'outline'}
                      className={
                        activity.severity === 'success' ? 'border-green-600 text-green-600' :
                        activity.severity === 'warning' ? 'border-yellow-600 text-yellow-600' :
                        activity.severity === 'info' ? 'border-blue-600 text-blue-600' : ''
                      }
                    >
                      {activity.severity === 'success' ? '성공' :
                       activity.severity === 'warning' ? '주의' :
                       activity.severity === 'error' ? '오류' : '정보'}
                    </Badge>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-center">
                <Button variant="outline" className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  전체 로그 보기
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 경고 센터 탭 */}
        <TabsContent value="alerts" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                  긴급 알림
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>어뷰징 패턴 감지</AlertTitle>
                  <AlertDescription>
                    비정상적인 클릭 패턴이 감지되었습니다. 즉시 확인이 필요합니다.
                  </AlertDescription>
                </Alert>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>API 응답 시간 지연</AlertTitle>
                  <AlertDescription>
                    평균 응답 시간이 200ms를 초과했습니다.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-600">
                  <Bell className="w-5 h-5" />
                  일반 알림
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>일일 백업 완료</AlertTitle>
                  <AlertDescription>
                    데이터베이스 백업이 성공적으로 완료되었습니다.
                  </AlertDescription>
                </Alert>
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>시스템 업데이트</AlertTitle>
                  <AlertDescription>
                    보안 패치가 적용되어 시스템이 업데이트되었습니다.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}