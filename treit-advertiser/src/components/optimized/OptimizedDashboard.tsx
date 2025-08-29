import React, { memo, useMemo, useCallback, Suspense, lazy } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Progress } from '../ui/progress'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { MousePointer, Zap, DollarSign, Target, Eye, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'
import { useOptimizedQuery, useCacheInvalidation, useRealTimeUpdates } from '../../hooks/useOptimizedQuery'
import { queryKeys } from '../../lib/query-client'

// 타입 정의
interface Campaign {
  id: string
  name: string
  url: string
  totalClicks: number
  remainingClicks: number
  budget: number
  spent: number
  status: 'active' | 'paused' | 'completed'
  startDate: string
  endDate: string
  description?: string
  targetAudience?: string
  costPerClick?: number
  createdAt?: string
  updatedAt?: string
}

interface DashboardStats {
  userCredits: number
  totalClicks: number
  totalRemainingClicks: number
  totalSpent: number
  activeCampaigns: number
  completedCampaigns: number
  pausedCampaigns: number
  averagePerformance: number
  clickTrend: number
  spendTrend: number
}

interface OptimizedDashboardProps {
  onViewDetails: (campaign: Campaign) => void
}

// 레이지 로드된 차트 컴포넌트
const LazyPerformanceChart = lazy(() => 
  import('../CampaignAnalytics').then(module => ({ 
    default: memo(module.CampaignAnalytics) 
  }))
)

// 메모이제이션된 통계 카드 컴포넌트
const StatCard = memo<{
  title: string
  value: string | number
  subtitle: string
  icon: React.ReactNode
  trend?: { value: number; positive?: boolean }
  className?: string
}>(({ title, value, subtitle, icon, trend, className = '' }) => (
  <Card className={className}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <div className="text-muted-foreground">{icon}</div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
        <span>{subtitle}</span>
        {trend && (
          <>
            {trend.positive !== false ? (
              <TrendingUp className="w-3 h-3 text-green-600" />
            ) : (
              <TrendingDown className="w-3 h-3 text-red-600" />
            )}
            <span className={trend.positive !== false ? 'text-green-600' : 'text-red-600'}>
              {trend.value > 0 ? '+' : ''}{trend.value.toFixed(1)}%
            </span>
          </>
        )}
      </div>
    </CardContent>
  </Card>
))

StatCard.displayName = 'StatCard'

// 캠페인 카드 컴포넌트 (메모이제이션)
const CampaignCard = memo<{
  campaign: Campaign
  onViewDetails: (campaign: Campaign) => void
}>(({ campaign, onViewDetails }) => {
  const getStatusColor = useCallback((status: Campaign['status']) => {
    switch (status) {
      case 'active': return 'bg-green-500 hover:bg-green-600'
      case 'paused': return 'bg-yellow-500 hover:bg-yellow-600'
      case 'completed': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }, [])

  const getStatusText = useCallback((status: Campaign['status']) => {
    switch (status) {
      case 'active': return '활성'
      case 'paused': return '일시정지'
      case 'completed': return '완료'
      default: return '알 수 없음'
    }
  }, [])

  const completedClicks = campaign.totalClicks - campaign.remainingClicks
  const clickProgress = campaign.totalClicks > 0 ? (completedClicks / campaign.totalClicks) * 100 : 0
  const budgetProgress = campaign.budget > 0 ? (campaign.spent / campaign.budget) * 100 : 0

  return (
    <div 
      className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer hover:bg-muted/20"
      onClick={() => onViewDetails(campaign)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-2">
          <h3 className="font-medium truncate">{campaign.name}</h3>
          <Badge className={getStatusColor(campaign.status)}>
            {getStatusText(campaign.status)}
          </Badge>
          {campaign.status === 'active' && (
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          )}
        </div>
        
        <p className="text-sm text-muted-foreground mb-2 truncate">{campaign.url}</p>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-muted-foreground">클릭 진행률</span>
              <span className="font-medium">{clickProgress.toFixed(1)}%</span>
            </div>
            <Progress value={clickProgress} className="h-1.5" />
            <div className="text-xs text-muted-foreground mt-1">
              {completedClicks.toLocaleString()} / {campaign.totalClicks.toLocaleString()}
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-muted-foreground">예산 사용률</span>
              <span className="font-medium">{budgetProgress.toFixed(1)}%</span>
            </div>
            <Progress value={budgetProgress} className="h-1.5" />
            <div className="text-xs text-muted-foreground mt-1">
              ₩{campaign.spent.toLocaleString()} / ₩{campaign.budget.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onViewDetails(campaign)
            }}
            className="ml-4 flex-shrink-0"
          >
            <Eye className="w-4 h-4 mr-2" />
            상세보기
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>캠페인 성과 및 분석 보기</p>
        </TooltipContent>
      </Tooltip>
    </div>
  )
})

CampaignCard.displayName = 'CampaignCard'

// 메인 최적화된 대시보드 컴포넌트
export const OptimizedDashboard = memo<OptimizedDashboardProps>(({ onViewDetails }) => {
  const { invalidateAll } = useCacheInvalidation()

  // 실시간 업데이트 활성화
  useRealTimeUpdates()

  // 대시보드 통계 데이터 페칭
  const { data: dashboardStats, isLoading: statsLoading, refetch: refetchStats } = useOptimizedQuery<DashboardStats>(
    queryKeys.campaigns.stats(),
    async () => {
      // 시뮬레이션된 데이터 - 실제 구현에서는 API 호출
      return {
        userCredits: 2500 + Math.floor(Math.random() * 100),
        totalClicks: 23500 + Math.floor(Math.random() * 500),
        totalRemainingClicks: 8500 + Math.floor(Math.random() * 200),
        totalSpent: 82400 + Math.floor(Math.random() * 1000),
        activeCampaigns: 3 + Math.floor(Math.random() * 2),
        completedCampaigns: 5 + Math.floor(Math.random() * 2),
        pausedCampaigns: 1,
        averagePerformance: 78.5 + (Math.random() * 10 - 5),
        clickTrend: Math.random() * 20 - 10,
        spendTrend: Math.random() * 15 - 7.5,
      }
    },
    {
      refetchInterval: 60000, // 1분마다 자동 갱신
      staleTime: 30000 // 30초 후 stale
    }
  )

  // 캠페인 목록 데이터 페칭
  const { data: campaigns, isLoading: campaignsLoading } = useOptimizedQuery<Campaign[]>(
    queryKeys.campaigns.list(),
    async () => {
      // 시뮬레이션된 데이터
      return [
        {
          id: '1',
          name: '겨울 세일 캠페인',
          url: 'https://example.com/winter-sale',
          totalClicks: 10000,
          remainingClicks: 3500,
          budget: 1000000,
          spent: 650000,
          status: 'active' as const,
          startDate: '2024-12-01',
          endDate: '2024-12-31',
          description: '겨울 시즌 할인 프로모션',
          targetAudience: '20-40대 여성',
          costPerClick: 100,
        },
        {
          id: '2',
          name: '신제품 런칭 캠페인',
          url: 'https://example.com/new-product',
          totalClicks: 5000,
          remainingClicks: 0,
          budget: 500000,
          spent: 500000,
          status: 'completed' as const,
          startDate: '2024-11-01',
          endDate: '2024-11-30',
        },
        {
          id: '3',
          name: 'Holiday Special',
          url: 'https://example.com/holiday',
          totalClicks: 8000,
          remainingClicks: 2000,
          budget: 800000,
          spent: 600000,
          status: 'active' as const,
          startDate: '2024-12-20',
          endDate: '2025-01-05',
        }
      ]
    },
    {
      staleTime: 2 * 60 * 1000, // 2분
    }
  )

  // 새로고침 핸들러
  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchStats(), invalidateAll()])
  }, [refetchStats, invalidateAll])

  // 통계 카드 데이터 (메모이제이션)
  const statCards = useMemo(() => {
    if (!dashboardStats) return []

    return [
      {
        title: '총 클릭수',
        value: dashboardStats.totalClicks,
        subtitle: '전체 캠페인 누적 클릭수',
        icon: <MousePointer className="h-4 w-4" />,
        trend: { value: dashboardStats.clickTrend, positive: dashboardStats.clickTrend >= 0 }
      },
      {
        title: '잔여 클릭',
        value: dashboardStats.totalRemainingClicks,
        subtitle: '활성 캠페인 남은 클릭수',
        icon: <Zap className="h-4 w-4" />,
      },
      {
        title: '사용 금액',
        value: `₩${dashboardStats.totalSpent.toLocaleString()}`,
        subtitle: '전체 캠페인 누적 지출',
        icon: <DollarSign className="h-4 w-4" />,
        trend: { value: dashboardStats.spendTrend, positive: dashboardStats.spendTrend <= 5 }
      },
      {
        title: '활성 캠페인',
        value: dashboardStats.activeCampaigns,
        subtitle: '현재 진행 중인 캠페인',
        icon: <Target className="h-4 w-4" />,
      }
    ]
  }, [dashboardStats])

  // 로딩 상태
  if (statsLoading || campaignsLoading) {
    return (
      <TooltipProvider>
        <div className="space-y-6">
          {/* 크레딧 카드 스켈레톤 */}
          <Card className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-muted rounded" />
            </CardContent>
          </Card>

          {/* 통계 카드들 스켈레톤 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-16 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 캠페인 목록 스켈레톤 */}
          <Card className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-24 bg-muted rounded" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">광고주 대시보드</h1>
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

        {/* 크레딧 잔액 표시 */}
        <Card className="bg-gradient-to-r from-primary to-secondary text-primary-foreground">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium opacity-90">보유 크레딧</h3>
                <div className="text-3xl font-bold">
                  {dashboardStats?.userCredits.toLocaleString()} 포스팅
                </div>
                <p className="text-sm opacity-80">활성 상태</p>
              </div>
              <div className="text-6xl opacity-20">
                <Zap />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 통계 카드들 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((card, index) => (
            <StatCard key={index} {...card} />
          ))}
        </div>

        {/* 성과 요약 */}
        {dashboardStats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">평균 성과</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {dashboardStats.averagePerformance.toFixed(1)}%
                </div>
                <Progress value={dashboardStats.averagePerformance} className="mb-2" />
                <p className="text-sm text-muted-foreground">
                  전체 캠페인 평균 성과 지표
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">캠페인 현황</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">활성</span>
                  <Badge variant="outline" className="bg-green-100 text-green-700">
                    {dashboardStats.activeCampaigns}개
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">일시정지</span>
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-700">
                    {dashboardStats.pausedCampaigns}개
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">완료</span>
                  <Badge variant="outline" className="bg-gray-100 text-gray-700">
                    {dashboardStats.completedCampaigns}개
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">성과 분석</CardTitle>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div className="h-[120px] bg-muted animate-pulse rounded" />}>
                  <LazyPerformanceChart />
                </Suspense>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 캠페인 목록 */}
        <Card>
          <CardHeader>
            <CardTitle>최근 캠페인</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {!campaigns || campaigns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>진행 중인 캠페인이 없습니다.</p>
                  <p className="text-sm mt-2">새 캠페인을 생성해보세요!</p>
                </div>
              ) : (
                campaigns.slice(0, 5).map((campaign) => (
                  <CampaignCard 
                    key={campaign.id}
                    campaign={campaign}
                    onViewDetails={onViewDetails}
                  />
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
})

OptimizedDashboard.displayName = 'OptimizedDashboard'