import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { 
  Search, Filter, SortAsc, SortDesc, Eye, Edit, Pause, Play, StopCircle,
  Calendar, Target, DollarSign, TrendingUp, MoreVertical, Plus
} from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu'
import { format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Progress } from './ui/progress'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'

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
  cpc_rate?: number
  createdAt?: string
  updatedAt?: string
}

interface CampaignListProps {
  onViewDetails: (campaign: Campaign) => void
  onEditCampaign?: (campaign: Campaign) => void
  onCreateCampaign?: () => void
  refreshTrigger?: number // 외부에서 새로고침을 트리거할 수 있는 prop
}

type SortField = 'name' | 'createdAt' | 'budget' | 'spent' | 'totalClicks' | 'status'
type SortDirection = 'asc' | 'desc'
type FilterStatus = 'all' | 'active' | 'paused' | 'completed'

export function CampaignList({ 
  onViewDetails, 
  onEditCampaign, 
  onCreateCampaign,
  refreshTrigger 
}: CampaignListProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // 캠페인 데이터 로드
  const loadCampaigns = async () => {
    setIsLoading(true)
    try {
      // 실제로는 Supabase에서 데이터를 가져올 것
      // 여기서는 Mock 데이터 사용
      const mockCampaigns: Campaign[] = [
        {
          id: '1',
          name: '겨울 세일 캠페인',
          url: 'https://example.com/winter-sale',
          totalClicks: 10000,
          remainingClicks: 3500,
          budget: 1000000,
          spent: 650000,
          status: 'active',
          startDate: '2024-12-01',
          endDate: '2024-12-31',
          description: '겨울 시즌 할인 프로모션',
          targetAudience: '20-40대 여성',
          cpc_rate: 100,
          createdAt: '2024-11-15',
          updatedAt: '2024-12-20'
        },
        {
          id: '2',
          name: '신제품 런칭 캠페인',
          url: 'https://example.com/new-product',
          totalClicks: 5000,
          remainingClicks: 0,
          budget: 500000,
          spent: 500000,
          status: 'completed',
          startDate: '2024-11-01',
          endDate: '2024-11-30',
          description: '신제품 출시 홍보',
          targetAudience: '전 연령대',
          cpc_rate: 100,
          createdAt: '2024-10-25',
          updatedAt: '2024-11-30'
        },
        {
          id: '3',
          name: '브랜드 인지도 향상',
          url: 'https://example.com/brand-awareness',
          totalClicks: 20000,
          remainingClicks: 15000,
          budget: 2000000,
          spent: 500000,
          status: 'paused',
          startDate: '2024-12-15',
          endDate: '2025-01-31',
          description: '브랜드 인지도 개선을 위한 장기 캠페인',
          targetAudience: '25-50대 직장인',
          cpc_rate: 100,
          createdAt: '2024-12-10',
          updatedAt: '2024-12-18'
        },
        {
          id: '4',
          name: 'Holiday Special',
          url: 'https://example.com/holiday',
          totalClicks: 8000,
          remainingClicks: 2000,
          budget: 800000,
          spent: 600000,
          status: 'active',
          startDate: '2024-12-20',
          endDate: '2025-01-05',
          description: '연말연시 특별 할인',
          targetAudience: '전체 고객',
          cpc_rate: 100,
          createdAt: '2024-12-05',
          updatedAt: '2024-12-22'
        },
        {
          id: '5',
          name: '모바일 앱 다운로드',
          url: 'https://example.com/app-download',
          totalClicks: 15000,
          remainingClicks: 8000,
          budget: 1500000,
          spent: 700000,
          status: 'active',
          startDate: '2024-12-01',
          endDate: '2024-12-31',
          description: '모바일 앱 설치 유도',
          targetAudience: '스마트폰 사용자',
          cpc_rate: 100,
          createdAt: '2024-11-20',
          updatedAt: '2024-12-19'
        }
      ]
      
      setCampaigns(mockCampaigns)
    } catch (error) {
      console.error('Campaign loading error:', error)
      toast.error('캠페인 목록을 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCampaigns()
  }, [refreshTrigger])

  // 필터링 및 정렬된 캠페인 목록
  const filteredAndSortedCampaigns = useMemo(() => {
    let filtered = campaigns.filter(campaign => {
      // 검색어 필터
      const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           campaign.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           campaign.targetAudience?.toLowerCase().includes(searchTerm.toLowerCase())

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
  }, [campaigns, searchTerm, filterStatus, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const handleStatusChange = async (campaignId: string, newStatus: Campaign['status']) => {
    try {
      // 실제로는 Supabase 업데이트
      // const { error } = await supabase.from('campaigns').update({ status: newStatus }).eq('id', campaignId)
      // if (error) throw error

      // Mock 업데이트
      setCampaigns(prev => prev.map(campaign => 
        campaign.id === campaignId 
          ? { ...campaign, status: newStatus, updatedAt: new Date().toISOString() }
          : campaign
      ))

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
  }

  const getStatusBadge = (status: Campaign['status']) => {
    const config = {
      active: { variant: 'default' as const, text: '활성', className: 'bg-green-500 hover:bg-green-600' },
      paused: { variant: 'secondary' as const, text: '일시정지', className: 'bg-yellow-500 hover:bg-yellow-600' },
      completed: { variant: 'outline' as const, text: '완료', className: 'bg-gray-100 text-gray-700' }
    }
    return config[status]
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">캠페인 목록</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
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
          <h2 className="text-2xl font-bold">캠페인 관리</h2>
          <p className="text-muted-foreground">
            총 {campaigns.length}개의 캠페인 | 활성 {campaigns.filter(c => c.status === 'active').length}개
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
          </div>
        </CardContent>
      </Card>

      {/* 캠페인 카드 목록 */}
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredAndSortedCampaigns.map((campaign) => {
            const completedClicks = campaign.totalClicks - campaign.remainingClicks
            const clickProgress = (completedClicks / campaign.totalClicks) * 100
            const budgetProgress = (campaign.spent / campaign.budget) * 100
            const statusConfig = getStatusBadge(campaign.status)

            return (
              <Card key={campaign.id} className="relative overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-1">{campaign.name}</CardTitle>
                      <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                        {campaign.description || campaign.url}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
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
            )
          })}
        </div>
      )}

      {/* 통계 요약 */}
      {filteredAndSortedCampaigns.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {filteredAndSortedCampaigns.filter(c => c.status === 'active').length}
                </div>
                <div className="text-sm text-muted-foreground">활성 캠페인</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  ₩{filteredAndSortedCampaigns.reduce((sum, c) => sum + c.budget, 0).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">총 예산</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  ₩{filteredAndSortedCampaigns.reduce((sum, c) => sum + c.spent, 0).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">총 지출</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {filteredAndSortedCampaigns.reduce((sum, c) => sum + (c.totalClicks - c.remainingClicks), 0).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">총 클릭수</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}