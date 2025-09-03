import React, { memo, useMemo, useCallback, useState, useRef } from 'react'
import { FixedSizeList as List } from 'react-window'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Progress } from '../ui/progress'
import { 
  Search, Filter, SortAsc, SortDesc, Eye, Edit, Pause, Play, StopCircle,
  Calendar, Target, DollarSign, Plus, MoreVertical, TrendingUp
} from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useOptimizedQuery, useDebouncedSearch, useCampaignMutations } from '../../hooks/useOptimizedQuery'
import { queryKeys } from '../../lib/query-client'
import { toast } from 'sonner'

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

type SortField = 'name' | 'createdAt' | 'budget' | 'spent' | 'totalClicks' | 'status'
type SortDirection = 'asc' | 'desc'
type FilterStatus = 'all' | 'active' | 'paused' | 'completed'

interface VirtualizedCampaignListProps {
  onViewDetails: (campaign: Campaign) => void
  onEditCampaign?: (campaign: Campaign) => void
  onCreateCampaign?: () => void
  refreshTrigger?: number
}

// 가상화된 캠페인 행 컴포넌트
const CampaignRow = memo<{
  index: number
  style: React.CSSProperties
  data: {
    campaigns: Campaign[]
    onViewDetails: (campaign: Campaign) => void
    onEditCampaign?: (campaign: Campaign) => void
    handleStatusChange: (campaignId: string, newStatus: Campaign['status']) => void
    getStatusBadge: (status: Campaign['status']) => any
  }
}>(({ index, style, data }) => {
  const { campaigns, onViewDetails, onEditCampaign, handleStatusChange, getStatusBadge } = data
  const campaign = campaigns[index]

  if (!campaign) return null

  const completedClicks = campaign.totalClicks - campaign.remainingClicks
  const clickProgress = campaign.totalClicks > 0 ? (completedClicks / campaign.totalClicks) * 100 : 0
  const budgetProgress = campaign.budget > 0 ? (campaign.spent / campaign.budget) * 100 : 0
  const statusConfig = getStatusBadge(campaign.status)

  return (
    <div style={style} className="p-4 border-b hover:bg-muted/50 transition-colors">
      <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg line-clamp-1">{campaign.name}</CardTitle>
              <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                {campaign.description || campaign.url}
              </p>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge className={statusConfig.className}>
                {statusConfig.text}
              </Badge>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onViewDetails(campaign)}>
                    <Eye className="w-4 h-4 mr-2" />
                    상세보기
                  </DropdownMenuItem>
                  {onEditCampaign && (
                    <DropdownMenuItem onClick={() => onEditCampaign(campaign)}>
                      <Edit className="w-4 h-4 mr-2" />
                      수정하기
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {campaign.status === 'active' && (
                    <DropdownMenuItem onClick={() => handleStatusChange(campaign.id, 'paused')}>
                      <Pause className="w-4 h-4 mr-2" />
                      일시정지
                    </DropdownMenuItem>
                  )}
                  {campaign.status === 'paused' && (
                    <DropdownMenuItem onClick={() => handleStatusChange(campaign.id, 'active')}>
                      <Play className="w-4 h-4 mr-2" />
                      재시작
                    </DropdownMenuItem>
                  )}
                  {campaign.status !== 'completed' && (
                    <DropdownMenuItem 
                      onClick={() => handleStatusChange(campaign.id, 'completed')}
                      className="text-red-600"
                    >
                      <StopCircle className="w-4 h-4 mr-2" />
                      종료하기
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* 성과 지표 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Target className="w-3 h-3" />
                클릭 진행률
              </div>
              <div className="font-semibold">{completedClicks.toLocaleString()}/{campaign.totalClicks.toLocaleString()}</div>
              <Progress value={clickProgress} className="h-1" />
              <div className="text-xs text-muted-foreground">{clickProgress.toFixed(1)}% 완료</div>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <DollarSign className="w-3 h-3" />
                예산 사용률
              </div>
              <div className="font-semibold">₩{campaign.spent.toLocaleString()}</div>
              <Progress value={budgetProgress} className="h-1" />
              <div className="text-xs text-muted-foreground">{budgetProgress.toFixed(1)}% 사용</div>
            </div>
          </div>

          {/* 기간 정보 */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            {format(parseISO(campaign.startDate), 'MM/dd', { locale: ko })} ~ {format(parseISO(campaign.endDate), 'MM/dd', { locale: ko })}
            <span className="ml-auto">
              {campaign.targetAudience && `${campaign.targetAudience}`}
            </span>
          </div>

          {/* 액션 버튼 */}
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onViewDetails(campaign)}
              className="flex-1"
            >
              <Eye className="w-4 h-4 mr-1" />
              상세보기
            </Button>
            
            {campaign.status === 'active' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange(campaign.id, 'paused')}
              >
                <Pause className="w-4 h-4" />
              </Button>
            )}
            
            {campaign.status === 'paused' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange(campaign.id, 'active')}
              >
                <Play className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>

        {/* 실시간 활성 표시 */}
        {campaign.status === 'active' && (
          <div className="absolute top-2 left-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          </div>
        )}
      </Card>
    </div>
  )
})

CampaignRow.displayName = 'CampaignRow'

// 통계 요약 카드
const StatsSummary = memo<{
  campaigns: Campaign[]
}>(({ campaigns }) => {
  const stats = useMemo(() => {
    const active = campaigns.filter(c => c.status === 'active').length
    const totalBudget = campaigns.reduce((sum, c) => sum + c.budget, 0)
    const totalSpent = campaigns.reduce((sum, c) => sum + c.spent, 0)
    const totalClicks = campaigns.reduce((sum, c) => sum + (c.totalClicks - c.remainingClicks), 0)
    
    return { active, totalBudget, totalSpent, totalClicks }
  }, [campaigns])

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <div className="text-sm text-muted-foreground">활성 캠페인</div>
          </div>
          <div>
            <div className="text-2xl font-bold">₩{stats.totalBudget.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">총 예산</div>
          </div>
          <div>
            <div className="text-2xl font-bold">₩{stats.totalSpent.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">총 지출</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{stats.totalClicks.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">총 클릭수</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

StatsSummary.displayName = 'StatsSummary'

// 메인 컴포넌트
export const VirtualizedCampaignList = memo<VirtualizedCampaignListProps>(({ 
  onViewDetails, 
  onEditCampaign, 
  onCreateCampaign,
  refreshTrigger 
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const listRef = useRef<List>(null)

  // 디바운싱된 검색어
  const debouncedSearchTerm = useDebouncedSearch(searchTerm, 300)

  // 캠페인 뮤테이션 훅
  const { updateCampaignStatus } = useCampaignMutations()

  // 캠페인 데이터 페칭 (최적화됨)
  const { data: campaignData, isLoading } = useOptimizedQuery(
    queryKeys.campaigns.list({ 
      search: debouncedSearchTerm, 
      status: filterStatus, 
      sortField, 
      sortDirection 
    }),
    async () => {
      // 시뮬레이션된 대량 데이터 생성
      const generateCampaignData = (count: number): Campaign[] => {
        const names = [
          '겨울 세일 캠페인', '신제품 런칭 캠페인', '브랜드 인지도 향상', 'Holiday Special', 
          '모바일 앱 다운로드', '봄맞이 할인', '여름 휴가 프로모션', '가을 신상품 출시',
          'Black Friday 특가', '크리스마스 이벤트', '신년맞이 캠페인', 'Valentine 프로모션',
          '어버이날 선물', '어린이날 이벤트', '스프링 세일', '백투스쿨 캠페인'
        ]
        
        const descriptions = [
          '계절별 할인 프로모션', '신제품 출시 홍보', '브랜드 인지도 개선을 위한 장기 캠페인',
          '특별 할인 이벤트', '앱 설치 유도 캠페인', '신규 고객 유치', '재구매 유도',
          '로열티 고객 대상', '타겟 마케팅', '소셜 미디어 연동'
        ]
        
        const audiences = [
          '20-40대 여성', '전 연령대', '25-50대 직장인', '전체 고객', '스마트폰 사용자',
          '대학생', '주부층', '남성 고객', '프리미엄 고객', 'MZ세대'
        ]
        
        const statuses: Campaign['status'][] = ['active', 'paused', 'completed']
        
        return Array.from({ length: count }, (_, i) => {
          const baseClicks = Math.floor(Math.random() * 50000) + 5000
          const remainingClicks = Math.floor(baseClicks * Math.random())
          const baseBudget = Math.floor(Math.random() * 5000000) + 500000
          const spent = Math.floor(baseBudget * (0.1 + Math.random() * 0.9))
          
          return {
            id: (i + 1).toString(),
            name: `${names[i % names.length]} ${Math.floor(i / names.length) + 1}`,
            url: `https://example.com/campaign-${i + 1}`,
            totalClicks: baseClicks,
            remainingClicks,
            budget: baseBudget,
            spent,
            status: statuses[i % statuses.length],
            startDate: new Date(2024, 8 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
            endDate: new Date(2025, Math.floor(Math.random() * 3), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
            description: descriptions[i % descriptions.length],
            targetAudience: audiences[i % audiences.length],
            costPerClick: 50 + Math.floor(Math.random() * 150),
            createdAt: new Date(2024, 8 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 28) + 1).toISOString(),
            updatedAt: new Date().toISOString()
          }
        })
      }

      return {
        campaigns: generateCampaignData(10000), // 1만개의 테스트 데이터
        total: 10000
      }
    },
    {
      staleTime: 2 * 60 * 1000, // 2분간 캐시
    }
  )

  // 상태 변경 핸들러
  const handleStatusChange = useCallback(async (campaignId: string, newStatus: Campaign['status']) => {
    try {
      await updateCampaignStatus.mutateAsync({ id: campaignId, status: newStatus })
      
      const statusText = {
        active: '활성화',
        paused: '일시정지',
        completed: '종료'
      }[newStatus]

      toast.success(`캠페인이 ${statusText}되었습니다.`)
    } catch (error) {
      console.error('Status change error:', error)
      toast.error('상태 변경에 실패했습니다.')
    }
  }, [updateCampaignStatus])

  // 뱃지 생성 함수 (메모이제이션)
  const getStatusBadge = useCallback((status: Campaign['status']) => {
    const config = {
      active: { variant: 'default' as const, text: '활성', className: 'bg-green-500 hover:bg-green-600' },
      paused: { variant: 'secondary' as const, text: '일시정지', className: 'bg-yellow-500 hover:bg-yellow-600' },
      completed: { variant: 'outline' as const, text: '완료', className: 'bg-gray-100 text-gray-700' }
    }
    return config[status]
  }, [])

  // 필터링 및 정렬된 캠페인 목록 (메모이제이션)
  const filteredAndSortedCampaigns = useMemo(() => {
    if (!campaignData?.campaigns) return []

    let filtered = campaignData.campaigns.filter(campaign => {
      // 검색어 필터
      const matchesSearch = debouncedSearchTerm === '' ||
        campaign.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        campaign.description?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        campaign.targetAudience?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())

      // 상태 필터
      const matchesStatus = filterStatus === 'all' || campaign.status === filterStatus

      return matchesSearch && matchesStatus
    })

    // 정렬
    filtered.sort((a, b) => {
      let aValue: any, bValue: any

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'createdAt':
          aValue = new Date(a.createdAt || 0)
          bValue = new Date(b.createdAt || 0)
          break
        case 'budget':
          aValue = a.budget
          bValue = b.budget
          break
        case 'spent':
          aValue = a.spent
          bValue = b.spent
          break
        case 'totalClicks':
          aValue = a.totalClicks - a.remainingClicks
          bValue = b.totalClicks - b.remainingClicks
          break
        case 'status':
          const statusOrder = { active: 1, paused: 2, completed: 3 }
          aValue = statusOrder[a.status]
          bValue = statusOrder[b.status]
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [campaignData?.campaigns, debouncedSearchTerm, filterStatus, sortField, sortDirection])

  // 가상화를 위한 행 데이터
  const rowData = useMemo(() => ({
    campaigns: filteredAndSortedCampaigns,
    onViewDetails,
    onEditCampaign,
    handleStatusChange,
    getStatusBadge,
  }), [filteredAndSortedCampaigns, onViewDetails, onEditCampaign, handleStatusChange, getStatusBadge])

  // 정렬 핸들러
  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
    // 스크롤 위치 초기화
    listRef.current?.scrollToItem(0)
  }, [sortField])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">캠페인 목록</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-4/5"></div>
                  <div className="h-8 bg-muted rounded"></div>
                </div>
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">캠페인 관리 (가상화됨)</h2>
          <p className="text-muted-foreground">
            총 {campaignData?.total.toLocaleString()}개의 캠페인 | 
            표시된 {filteredAndSortedCampaigns.length.toLocaleString()}개
          </p>
        </div>
        
        {onCreateCampaign && (
          <Button onClick={onCreateCampaign} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            새 캠페인 생성
          </Button>
        )}
      </div>

      {/* 필터 및 검색 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* 검색 */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="캠페인명, 설명, 타겟층으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                maxLength={100}
              />
            </div>

            {/* 상태 필터 */}
            <Select value={filterStatus} onValueChange={(value: FilterStatus) => setFilterStatus(value)}>
              <SelectTrigger className="w-[150px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="상태 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="active">활성</SelectItem>
                <SelectItem value="paused">일시정지</SelectItem>
                <SelectItem value="completed">완료</SelectItem>
              </SelectContent>
            </Select>

            {/* 정렬 */}
            <Select value={`${sortField}-${sortDirection}`} onValueChange={(value) => {
              const [field, direction] = value.split('-') as [SortField, SortDirection]
              setSortField(field)
              setSortDirection(direction)
            }}>
              <SelectTrigger className="w-[200px]">
                {sortDirection === 'asc' ? (
                  <SortAsc className="w-4 h-4 mr-2" />
                ) : (
                  <SortDesc className="w-4 h-4 mr-2" />
                )}
                <SelectValue placeholder="정렬 기준" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt-desc">최신 생성순</SelectItem>
                <SelectItem value="createdAt-asc">오래된 순</SelectItem>
                <SelectItem value="name-asc">이름순 (A-Z)</SelectItem>
                <SelectItem value="name-desc">이름순 (Z-A)</SelectItem>
                <SelectItem value="budget-desc">예산 높은순</SelectItem>
                <SelectItem value="budget-asc">예산 낮은순</SelectItem>
                <SelectItem value="spent-desc">지출 많은순</SelectItem>
                <SelectItem value="spent-asc">지출 적은순</SelectItem>
                <SelectItem value="totalClicks-desc">클릭 많은순</SelectItem>
                <SelectItem value="totalClicks-asc">클릭 적은순</SelectItem>
                <SelectItem value="status-asc">상태순</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('')
                setFilterStatus('all')
                setSortField('createdAt')
                setSortDirection('desc')
              }}
            >
              초기화
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 가상화된 캠페인 목록 */}
      {filteredAndSortedCampaigns.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                {searchTerm || filterStatus !== 'all' ? '조건에 맞는 캠페인이 없습니다' : '생성된 캠페인이 없습니다'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm || filterStatus !== 'all' 
                  ? '검색어나 필터 조건을 변경해보세요.' 
                  : '새로운 캠페인을 생성해보세요.'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              캠페인 목록 ({filteredAndSortedCampaigns.length.toLocaleString()}개)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div style={{ height: '600px', width: '100%' }}>
              <List
                ref={listRef}
                height={600}
                itemCount={filteredAndSortedCampaigns.length}
                itemSize={280} // 각 캠페인 카드의 높이
                itemData={rowData}
              >
                {CampaignRow}
              </List>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 통계 요약 */}
      {filteredAndSortedCampaigns.length > 0 && (
        <StatsSummary campaigns={filteredAndSortedCampaigns} />
      )}
    </div>
  )
})

VirtualizedCampaignList.displayName = 'VirtualizedCampaignList'