import React, { memo, useMemo, useCallback, Suspense, lazy } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Progress } from '../ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { 
  Users, 
  Building2, 
  MousePointer, 
  DollarSign, 
  TrendingUp, 
  Activity,
  RefreshCw,
  BarChart3,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Clock,
  Server,
  Database,
  Zap,
  HardDrive,
  Shield,
  Bell,
  Eye
} from 'lucide-react'
import { useOptimizedQuery, useCacheInvalidation } from '../../hooks/useOptimizedQuery'
import { queryKeys } from '../../lib/query-client'

// 레이지 로드된 컴포넌트들
const LazyRealTimeChart = lazy(() => import('../RealTimeChart').then(module => ({ default: module.RealTimeChart })))
const LazyAlertSystem = lazy(() => import('../AlertSystem').then(module => ({ default: module.AlertSystem })))

// 통계 카드 컴포넌트 (메모이제이션)
const StatCard = memo<{
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  trend?: { value: string; label: string; positive?: boolean }
  borderColor: string
  iconBg: string
  iconColor: string
}>(({ title, value, subtitle, icon, trend, borderColor, iconBg, iconColor }) => (
  <Card className={`border-l-4 ${borderColor}`}>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</p>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 ${iconBg} rounded-full`}>
          <div className={iconColor}>{icon}</div>
        </div>
      </div>
      {trend && (
        <div className="mt-4">
          <div className="flex items-center gap-2">
            <TrendingUp className={`w-4 h-4 ${trend.positive !== false ? 'text-green-600' : 'text-red-600'}`} />
            <span className={`text-sm font-medium ${trend.positive !== false ? 'text-green-600' : 'text-red-600'}`}>
              {trend.value}
            </span>
            <span className="text-sm text-muted-foreground">{trend.label}</span>
          </div>
        </div>
      )}
    </CardContent>
  </Card>
))

StatCard.displayName = 'StatCard'

// 시스템 상태 카드 (메모이제이션)
const SystemHealthCard = memo<{
  title: string
  status: 'healthy' | 'warning' | 'error'
  icon: React.ReactNode
  iconBg: string
}>(({ title, status, icon, iconBg }) => {
  const getHealthColor = useCallback((status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600'
      case 'warning': return 'text-yellow-600'
      case 'error': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }, [])

  const getHealthIcon = useCallback((status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4" />
      case 'warning': return <AlertTriangle className="w-4 h-4" />
      case 'error': return <Shield className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }, [])

  const statusText = useMemo(() => {
    switch (status) {
      case 'healthy': return '정상'
      case 'warning': return '주의'
      case 'error': return '오류'
      default: return '알 수 없음'
    }
  }, [status])

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 ${iconBg} rounded-lg`}>
            {icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="font-medium">{title}</p>
              <div className={`flex items-center gap-1 ${getHealthColor(status)}`}>
                {getHealthIcon(status)}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{statusText}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

SystemHealthCard.displayName = 'SystemHealthCard'

// 메인 Dashboard 컴포넌트
export const OptimizedDashboard = memo(() => {
  const { invalidateAll } = useCacheInvalidation()

  // 최적화된 데이터 페칭
  const { data: dashboardStats, isLoading: statsLoading, refetch: refetchStats } = useOptimizedQuery(
    queryKeys.system.stats(),
    async () => {
      // 시뮬레이션된 데이터 - 실제 구현에서는 API 호출
      return {
        totalUsers: 12847 + Math.floor(Math.random() * 10),
        activeUsers: 8934 + Math.floor(Math.random() * 50),
        totalAdvertisers: 342 + Math.floor(Math.random() * 3),
        activeCampaigns: 89 + Math.floor(Math.random() * 5),
        dailyClicks: 47293 + Math.floor(Math.random() * 1000),
        platformRevenue: 2800000 + Math.floor(Math.random() * 100000),
        averageCTR: 2.34 + (Math.random() * 0.2 - 0.1),
        systemUptime: 99.8 + (Math.random() * 0.2 - 0.1)
      }
    },
    {
      refetchInterval: 10000, // 10초마다 자동 갱신
      staleTime: 5000 // 5초 후 stale
    }
  )

  const { data: systemHealth, isLoading: healthLoading } = useOptimizedQuery(
    queryKeys.system.health(),
    async () => ({
      api: Math.random() > 0.05 ? 'healthy' as const : 'warning' as const,
      database: Math.random() > 0.02 ? 'healthy' as const : 'warning' as const,
      edgeFunctions: Math.random() > 0.03 ? 'healthy' as const : 'warning' as const,
      storage: Math.random() > 0.01 ? 'healthy' as const : 'warning' as const
    }),
    {
      refetchInterval: 30000 // 30초마다 체크
    }
  )

  const { data: recentActivities } = useOptimizedQuery(
    queryKeys.system.activities(),
    async () => {
      const activities = [
        { type: 'user_joined', description: '신규 유저 김민수님이 가입했습니다', severity: 'success' as const },
        { type: 'campaign_approved', description: '패션브랜드A 캠페인이 승인되었습니다', severity: 'info' as const },
        { type: 'fraud_detected', description: '의심스러운 클릭 패턴이 감지되었습니다', severity: 'warning' as const },
        { type: 'payment_processed', description: '₩1,500,000 출금 처리가 완료되었습니다', severity: 'success' as const },
        { type: 'system_alert', description: 'API 응답 시간이 평균보다 높습니다', severity: 'warning' as const },
      ]

      return activities.slice(0, 6).map((activity, index) => ({
        id: `activity-${index}`,
        type: activity.type,
        description: activity.description,
        severity: activity.severity,
        timestamp: new Date(Date.now() - index * 1000 * 60 * Math.random() * 60)
      }))
    }
  )

  // 메모이제이션된 포맷 함수들
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount)
  }, [])

  const formatNumber = useCallback((num: number) => {
    return new Intl.NumberFormat('ko-KR').format(num)
  }, [])

  // 새로고침 핸들러
  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchStats(), invalidateAll()])
  }, [refetchStats, invalidateAll])

  // 활동 아이콘 함수 (메모이제이션)
  const getActivityIcon = useCallback((type: string) => {
    switch (type) {
      case 'user_joined': return <Users className="w-4 h-4 text-blue-600" />
      case 'campaign_approved': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'fraud_detected': return <Shield className="w-4 h-4 text-red-600" />
      case 'payment_processed': return <DollarSign className="w-4 h-4 text-green-600" />
      case 'system_alert': return <AlertTriangle className="w-4 h-4 text-yellow-600" />
      default: return <Bell className="w-4 h-4 text-gray-600" />
    }
  }, [])

  // 통계 카드 데이터 (메모이제이션)
  const statCards = useMemo(() => {
    if (!dashboardStats) return []

    return [
      {
        title: '총 유저',
        value: formatNumber(dashboardStats.totalUsers),
        subtitle: `활성: ${formatNumber(dashboardStats.activeUsers)}명`,
        icon: <Users className="w-6 h-6" />,
        trend: { value: '+12.5%', label: '전월 대비', positive: true },
        borderColor: 'border-l-blue-500',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600'
      },
      {
        title: '일일 클릭',
        value: formatNumber(dashboardStats.dailyClicks),
        subtitle: `CTR: ${dashboardStats.averageCTR.toFixed(2)}%`,
        icon: <MousePointer className="w-6 h-6" />,
        trend: { value: '+8.3%', label: '전일 대비', positive: true },
        borderColor: 'border-l-green-500',
        iconBg: 'bg-green-100',
        iconColor: 'text-green-600'
      },
      {
        title: '플랫폼 수익',
        value: formatCurrency(dashboardStats.platformRevenue),
        subtitle: '오늘 수익',
        icon: <DollarSign className="w-6 h-6" />,
        trend: { value: '+15.7%', label: '목표 달성', positive: true },
        borderColor: 'border-l-purple-500',
        iconBg: 'bg-purple-100',
        iconColor: 'text-purple-600'
      },
      {
        title: '시스템 상태',
        value: `${dashboardStats.systemUptime.toFixed(1)}%`,
        subtitle: '서버 가동률',
        icon: <Activity className="w-6 h-6" />,
        borderColor: 'border-l-orange-500',
        iconBg: 'bg-orange-100',
        iconColor: 'text-orange-600'
      }
    ]
  }, [dashboardStats, formatNumber, formatCurrency])

  // 시스템 헬스 카드 데이터 (메모이제이션)
  const systemHealthCards = useMemo(() => {
    if (!systemHealth) return []

    return [
      {
        title: 'API 서버',
        status: systemHealth.api,
        icon: <Server className="w-5 h-5 text-blue-600" />,
        iconBg: 'bg-blue-100'
      },
      {
        title: '데이터베이스',
        status: systemHealth.database,
        icon: <Database className="w-5 h-5 text-green-600" />,
        iconBg: 'bg-green-100'
      },
      {
        title: 'Edge Functions',
        status: systemHealth.edgeFunctions,
        icon: <Zap className="w-5 h-5 text-purple-600" />,
        iconBg: 'bg-purple-100'
      },
      {
        title: '스토리지',
        status: systemHealth.storage,
        icon: <HardDrive className="w-5 h-5 text-orange-600" />,
        iconBg: 'bg-orange-100'
      }
    ]
  }, [systemHealth])

  if (statsLoading || healthLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">관리자 대시보드</h1>
          <p className="text-sm text-muted-foreground">
            마지막 업데이트: {new Date().toLocaleString('ko-KR')}
          </p>
        </div>
        <Button 
          onClick={handleRefresh} 
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          새로고침
        </Button>
      </div>

      {/* 핵심 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <StatCard key={index} {...card} />
        ))}
      </div>

      {/* 메인 콘텐츠 탭 */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">개요</TabsTrigger>
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
                <Suspense fallback={<div className="h-[300px] bg-muted animate-pulse rounded" />}>
                  <LazyRealTimeChart />
                </Suspense>
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
                    {dashboardStats?.activeCampaigns}개
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

            <Suspense fallback={<Card><CardContent className="p-6 h-[200px] bg-muted animate-pulse rounded" /></Card>}>
              <LazyAlertSystem />
            </Suspense>
          </div>
        </TabsContent>

        {/* 시스템 상태 탭 */}
        <TabsContent value="system" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {systemHealthCards.map((card, index) => (
              <SystemHealthCard key={index} {...card} />
            ))}
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
                {recentActivities?.map((activity) => (
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
          <Suspense fallback={<div className="h-[300px] bg-muted animate-pulse rounded" />}>
            <LazyAlertSystem />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
})

OptimizedDashboard.displayName = 'OptimizedDashboard'