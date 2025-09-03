import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'
import { MousePointer, Zap, DollarSign, Target, Eye } from 'lucide-react'

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
}

interface DashboardProps {
  onViewDetails: (campaign: Campaign) => void
}

export function Dashboard({ onViewDetails }: DashboardProps) {
  // Mock user data - 실제로는 Supabase에서 가져올 데이터
  const userCredits = 2500 // 사용자 잔여 클릭 수
  
  // Mock data - 실제로는 Supabase에서 가져올 데이터
  const campaigns: Campaign[] = [
    {
      id: '1',
      name: '여름 신상품 홍보',
      url: 'https://example.com/summer-sale',
      totalClicks: 10000,
      remainingClicks: 7200,
      budget: 50000,
      spent: 32400,
      status: 'active',
      startDate: '2024-08-01',
      endDate: '2024-08-31'
    },
    {
      id: '2',
      name: '브랜드 인지도 향상',
      url: 'https://example.com/brand-awareness',
      totalClicks: 5000,
      remainingClicks: 1800,
      budget: 30000,
      spent: 24600,
      status: 'active',
      startDate: '2024-08-15',
      endDate: '2024-09-15'
    },
    {
      id: '3',
      name: '가을 프로모션',
      url: 'https://example.com/autumn-promo',
      totalClicks: 8000,
      remainingClicks: 0,
      budget: 40000,
      spent: 40000,
      status: 'completed',
      startDate: '2024-07-01',
      endDate: '2024-07-31'
    }
  ]

  const activeCampaigns = campaigns.filter(c => c.status === 'active')
  const totalClicks = campaigns.reduce((sum, c) => sum + (c.totalClicks - c.remainingClicks), 0)
  const totalRemainingClicks = activeCampaigns.reduce((sum, c) => sum + c.remainingClicks, 0)
  const totalSpent = campaigns.reduce((sum, c) => sum + c.spent, 0)

  const getStatusColor = (status: Campaign['status']) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'paused': return 'bg-yellow-500'
      case 'completed': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusText = (status: Campaign['status']) => {
    switch (status) {
      case 'active': return '활성'
      case 'paused': return '일시정지'
      case 'completed': return '완료'
      default: return '알 수 없음'
    }
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
      {/* 크레딧 잔액 표시 */}
      <div className="mb-6">
        <Card className="bg-gradient-to-r from-primary to-secondary text-primary-foreground">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium opacity-90">보유 크레딧</h3>
                <div className="text-3xl font-bold">{userCredits.toLocaleString()} 포스팅</div>
                <p className="text-sm opacity-80">활성 상태</p>
              </div>
              <div className="text-6xl opacity-20">
                <Zap />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 통계 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 클릭수</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClicks.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              전체 캠페인 누적 클릭수
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">잔여 클릭</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRemainingClicks.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              활성 캠페인 남은 클릭수
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">사용 금액</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₩{totalSpent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              전체 캠페인 누적 지출
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">활성 캠페인</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCampaigns.length}</div>
            <p className="text-xs text-muted-foreground">
              현재 진행 중인 캠페인
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 캠페인 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>캠페인 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {campaigns.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>진행 중인 캠페인이 없습니다.</p>
                <p className="text-sm mt-2">새 캠페인을 생성해보세요!</p>
              </div>
            ) : (
              campaigns.map((campaign) => (
                <div 
                  key={campaign.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => onViewDetails(campaign)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium">{campaign.name}</h3>
                      <Badge className={getStatusColor(campaign.status)}>
                        {getStatusText(campaign.status)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{campaign.url}</p>
                    <div className="flex items-center gap-6 text-sm">
                      <span>클릭: {(campaign.totalClicks - campaign.remainingClicks).toLocaleString()} / {campaign.totalClicks.toLocaleString()}</span>
                      <span>예산: ₩{campaign.spent.toLocaleString()} / ₩{campaign.budget.toLocaleString()}</span>
                    </div>
                    <div className="mt-2">
                      <Progress 
                        value={(campaign.spent / campaign.budget) * 100} 
                        className="h-2" 
                      />
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
                        className="ml-4"
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
              ))
            )}
          </div>
        </CardContent>
      </Card>
      </div>
    </TooltipProvider>
  )
}

// Helper functions
const getStatusColor = (status: Campaign['status']) => {
  switch (status) {
    case 'active': return 'bg-green-500'
    case 'paused': return 'bg-yellow-500'
    case 'completed': return 'bg-gray-500'
    case 'draft': return 'bg-blue-500'
    default: return 'bg-gray-500'
  }
}

const getStatusText = (status: Campaign['status']) => {
  switch (status) {
    case 'active': return '활성'
    case 'paused': return '일시정지'
    case 'completed': return '완료'
    case 'draft': return '초안'
    default: return '알 수 없음'
  }
}