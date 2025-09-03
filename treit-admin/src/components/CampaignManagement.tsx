import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Progress } from './ui/progress'
import { Avatar, AvatarFallback } from './ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Textarea } from './ui/textarea'
import { 
  Target, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpDown,
  Eye,
  Play,
  Pause,
  Stop,
  Edit,
  BarChart3,
  Calendar,
  Building2,
  CheckCircle,
  X,
  AlertTriangle,
  Clock,
  TrendingUp,
  MousePointer,
  DollarSign,
  Users,
  Ban,
  MessageSquare,
  Activity,
  Zap
} from 'lucide-react'

// 대량의 캠페인 데이터 시뮬레이션
const generateCampaignData = (count: number) => {
  const advertisers = ['테크스타트업', '패션브랜드A', '뷰티코스메틱', '헬스케어', '에듀테크', 'FoodTech', '핀테크', '게임스튜디오', '여행사', 'E커머스']
  const campaignTypes = ['스마트폰 런칭', '패션 컬렉션', '뷰티 프로모션', '건강식품', '교육앱', '음식배달', '금융서비스', '모바일게임', '여행상품', '온라인쇼핑']
  const statuses = ['active', 'paused', 'completed', 'pending', 'rejected']
  const categories = ['전자제품', '패션', '뷰티', '건강', '교육', '음식', '금융', '게임', '여행', '쇼핑']
  
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `${campaignTypes[i % campaignTypes.length]} ${Math.floor(i / campaignTypes.length) + 1}`,
    advertiser: advertisers[i % advertisers.length],
    category: categories[i % categories.length],
    type: ['CPC', 'CPM', 'CPA'][i % 3],
    budget: Math.floor(Math.random() * 10000000) + 500000,
    spent: Math.floor(Math.random() * 5000000) + 100000,
    clicks: Math.floor(Math.random() * 50000) + 1000,
    impressions: Math.floor(Math.random() * 1000000) + 10000,
    conversions: Math.floor(Math.random() * 500) + 10,
    ctr: Number((Math.random() * 5 + 1).toFixed(2)),
    conversionRate: Number((Math.random() * 10 + 1).toFixed(2)),
    startDate: new Date(2025, 0, Math.floor(Math.random() * 30) + 1).toISOString().split('T')[0],
    endDate: new Date(2025, 1, Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
    status: statuses[i % statuses.length],
    createdAt: new Date(2024, 11, Math.floor(Math.random() * 30) + 1).toISOString().split('T')[0],
    priority: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)],
    // 승인 관련 정보
    reviewNotes: '',
    submittedAt: new Date(2024, 11, Math.floor(Math.random() * 30) + 1).toISOString().split('T')[0],
    reviewedAt: statuses[i % statuses.length] !== 'pending' ? new Date(2024, 11, Math.floor(Math.random() * 30) + 1).toISOString().split('T')[0] : null,
    reviewedBy: statuses[i % statuses.length] !== 'pending' ? '관리자' : null,
    // 성과 지표
    roi: Number(((Math.random() * 200) + 50).toFixed(2)), // 50-250%
    costPerClick: Number(((Math.random() * 500) + 100).toFixed(0)), // 100-600원
    participantCount: Math.floor(Math.random() * 1000) + 50,
    riskLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
  }))
}

// 3000개 캠페인 데이터 생성
const allCampaigns = generateCampaignData(3247) // 실제 수천개 시뮬레이션

export function CampaignManagement() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [advertiserFilter, setAdvertiserFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [sortBy, setSortBy] = useState('id')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [reviewNotes, setReviewNotes] = useState('')
  const itemsPerPage = 20

  // 필터링 및 검색
  const filteredCampaigns = allCampaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         campaign.advertiser.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter
    const matchesType = typeFilter === 'all' || campaign.type === typeFilter
    const matchesAdvertiser = advertiserFilter === 'all' || campaign.advertiser === advertiserFilter
    const matchesPriority = priorityFilter === 'all' || campaign.priority === priorityFilter
    
    return matchesSearch && matchesStatus && matchesType && matchesAdvertiser && matchesPriority
  })

  // 정렬
  const sortedCampaigns = [...filteredCampaigns].sort((a, b) => {
    let aValue = a[sortBy as keyof typeof a]
    let bValue = b[sortBy as keyof typeof b]
    
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase()
      bValue = (bValue as string).toLowerCase()
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })

  // 페이지네이션
  const totalPages = Math.ceil(sortedCampaigns.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const currentCampaigns = sortedCampaigns.slice(startIndex, startIndex + itemsPerPage)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="outline" className="text-green-600 border-green-600">진행중</Badge>
      case 'paused':
        return <Badge variant="secondary" className="text-yellow-600">일시정지</Badge>
      case 'completed':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">완료</Badge>
      case 'pending':
        return <Badge variant="secondary" className="text-orange-600">승인대기</Badge>
      case 'rejected':
        return <Badge variant="destructive">거부됨</Badge>
      default:
        return <Badge variant="secondary">알 수 없음</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">높음</Badge>
      case 'medium':
        return <Badge variant="secondary" className="text-yellow-600">중간</Badge>
      case 'low':
        return <Badge variant="outline" className="text-green-600 border-green-600">낮음</Badge>
      default:
        return <Badge variant="secondary">알 수 없음</Badge>
    }
  }

  const handleCampaignAction = async (campaignId: number, action: 'approve' | 'reject' | 'pause' | 'resume' | 'stop') => {
    const campaignIndex = allCampaigns.findIndex(c => c.id === campaignId)
    if (campaignIndex !== -1) {
      const now = new Date().toISOString().split('T')[0]
      switch (action) {
        case 'approve':
          allCampaigns[campaignIndex].status = 'active'
          allCampaigns[campaignIndex].reviewedAt = now
          allCampaigns[campaignIndex].reviewedBy = '관리자'
          allCampaigns[campaignIndex].reviewNotes = reviewNotes
          break
        case 'reject':
          allCampaigns[campaignIndex].status = 'rejected'
          allCampaigns[campaignIndex].reviewedAt = now
          allCampaigns[campaignIndex].reviewedBy = '관리자'
          allCampaigns[campaignIndex].reviewNotes = reviewNotes
          break
        case 'pause':
          allCampaigns[campaignIndex].status = 'paused'
          break
        case 'resume':
          allCampaigns[campaignIndex].status = 'active'
          break
        case 'stop':
          allCampaigns[campaignIndex].status = 'completed'
          break
      }
    }
    setReviewNotes('')
    setIsReviewModalOpen(false)
  }

  const openCampaignDetail = (campaign: any) => {
    setSelectedCampaign(campaign)
    setIsDetailModalOpen(true)
  }

  const openReviewModal = (campaign: any) => {
    setSelectedCampaign(campaign)
    setIsReviewModalOpen(true)
  }

  const getTypeBadge = (type: string) => {
    const colors = {
      CPC: 'bg-blue-100 text-blue-700',
      CPM: 'bg-green-100 text-green-700',
      CPA: 'bg-purple-100 text-purple-700'
    }
    return <Badge variant="secondary" className={colors[type as keyof typeof colors]}>{type}</Badge>
  }

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
    setCurrentPage(1)
  }

  const uniqueAdvertisers = Array.from(new Set(allCampaigns.map(c => c.advertiser)))

  return (
    <div className="space-y-6">
      {/* 통계 개요 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Target className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">전체 캠페인</p>
                <p className="font-bold">{allCampaigns.length.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Play className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">활성 캠페인</p>
                <p className="font-bold">{allCampaigns.filter(c => c.status === 'active').length.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">승인대기</p>
                <p className="font-bold">{allCampaigns.filter(c => c.status === 'pending').length.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BarChart3 className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">평균 CTR</p>
                <p className="font-bold">
                  {(allCampaigns.reduce((sum, c) => sum + c.ctr, 0) / allCampaigns.length).toFixed(2)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 검색 및 필터 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            캠페인 검색 및 필터
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="캠페인명 또는 광고주 검색..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={(value) => {
              setStatusFilter(value)
              setCurrentPage(1)
            }}>
              <SelectTrigger>
                <SelectValue placeholder="상태 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 상태</SelectItem>
                <SelectItem value="active">진행중</SelectItem>
                <SelectItem value="paused">일시정지</SelectItem>
                <SelectItem value="completed">완료</SelectItem>
                <SelectItem value="pending">승인대기</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={typeFilter} onValueChange={(value) => {
              setTypeFilter(value)
              setCurrentPage(1)
            }}>
              <SelectTrigger>
                <SelectValue placeholder="유형 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 유형</SelectItem>
                <SelectItem value="CPC">CPC</SelectItem>
                <SelectItem value="CPM">CPM</SelectItem>
                <SelectItem value="CPA">CPA</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={advertiserFilter} onValueChange={(value) => {
              setAdvertiserFilter(value)
              setCurrentPage(1)
            }}>
              <SelectTrigger>
                <SelectValue placeholder="광고주 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 광고주</SelectItem>
                {uniqueAdvertisers.map(advertiser => (
                  <SelectItem key={advertiser} value={advertiser}>{advertiser}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={priorityFilter} onValueChange={(value) => {
              setPriorityFilter(value)
              setCurrentPage(1)
            }}>
              <SelectTrigger>
                <SelectValue placeholder="우선순위 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 우선순위</SelectItem>
                <SelectItem value="high">높음</SelectItem>
                <SelectItem value="medium">중간</SelectItem>
                <SelectItem value="low">낮음</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('all')
                setTypeFilter('all')
                setAdvertiserFilter('all')
                setPriorityFilter('all')
                setCurrentPage(1)
              }}
            >
              초기화
            </Button>
          </div>
          
          <div className="mt-4 text-sm text-muted-foreground">
            총 {allCampaigns.length.toLocaleString()}개 중 {filteredCampaigns.length.toLocaleString()}개 표시
          </div>
        </CardContent>
      </Card>

      {/* 캠페인 목록 테이블 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>캠페인 목록</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredCampaigns.length)} / {filteredCampaigns.length.toLocaleString()}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => handleSort('id')} className="p-0 h-auto font-semibold">
                    ID <ArrowUpDown className="w-3 h-3 ml-1" />
                  </Button>
                </TableHead>
                <TableHead>캠페인 정보</TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => handleSort('advertiser')} className="p-0 h-auto font-semibold">
                    광고주 <ArrowUpDown className="w-3 h-3 ml-1" />
                  </Button>
                </TableHead>
                <TableHead>예산/소진</TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => handleSort('clicks')} className="p-0 h-auto font-semibold">
                    클릭수 <ArrowUpDown className="w-3 h-3 ml-1" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => handleSort('ctr')} className="p-0 h-auto font-semibold">
                    CTR <ArrowUpDown className="w-3 h-3 ml-1" />
                  </Button>
                </TableHead>
                <TableHead>우선순위</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentCampaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-mono">{campaign.id}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium mb-1">{campaign.name}</div>
                      <div className="flex items-center gap-1">
                        {getTypeBadge(campaign.type)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-xs">
                          <Building2 className="w-3 h-3" />
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{campaign.advertiser}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">
                        {formatCurrency(campaign.spent)} / {formatCurrency(campaign.budget)}
                      </div>
                      <Progress 
                        value={(campaign.spent / campaign.budget) * 100} 
                        className="h-1"
                      />
                      <div className="text-xs">
                        {((campaign.spent / campaign.budget) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{campaign.clicks.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">
                        {campaign.impressions.toLocaleString()} 노출
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{campaign.ctr}%</span>
                  </TableCell>
                  <TableCell>
                    {getPriorityBadge(campaign.priority)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(campaign.status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openCampaignDetail(campaign)}
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                      
                      {campaign.status === 'pending' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openReviewModal(campaign)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <CheckCircle className="w-3 h-3" />
                        </Button>
                      )}
                      
                      {campaign.status === 'active' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleCampaignAction(campaign.id, 'pause')}
                          className="text-yellow-600 hover:text-yellow-700"
                        >
                          <Pause className="w-3 h-3" />
                        </Button>
                      )}
                      
                      {campaign.status === 'paused' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleCampaignAction(campaign.id, 'resume')}
                          className="text-green-600 hover:text-green-700"
                        >
                          <Play className="w-3 h-3" />
                        </Button>
                      )}
                      
                      {(campaign.status === 'active' || campaign.status === 'paused') && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleCampaignAction(campaign.id, 'stop')}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Ban className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* 페이지네이션 */}
          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-muted-foreground">
              페이지 {currentPage} / {totalPages} (총 {filteredCampaigns.length.toLocaleString()}개)
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
                이전
              </Button>
              
              {/* 페이지 번호 */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  )
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                다음
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 캠페인 상세 정보 모달 */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Target className="w-5 h-5" />
              {selectedCampaign?.name} - 상세 정보
              {getStatusBadge(selectedCampaign?.status)}
            </DialogTitle>
          </DialogHeader>
          
          {selectedCampaign && (
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">개요</TabsTrigger>
                <TabsTrigger value="performance">성과</TabsTrigger>
                <TabsTrigger value="participants">참가자</TabsTrigger>
                <TabsTrigger value="timeline">타임라인</TabsTrigger>
              </TabsList>

              {/* 개요 탭 */}
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        기본 정보
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">캠페인 ID</p>
                          <p className="font-medium">{selectedCampaign.id}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">광고주</p>
                          <p className="font-medium">{selectedCampaign.advertiser}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">카테고리</p>
                          <p className="font-medium">{selectedCampaign.category}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">유형</p>
                          {getTypeBadge(selectedCampaign.type)}
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">우선순위</p>
                          {getPriorityBadge(selectedCampaign.priority)}
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">위험도</p>
                          <Badge variant={selectedCampaign.riskLevel === 'high' ? 'destructive' : selectedCampaign.riskLevel === 'medium' ? 'secondary' : 'outline'}>
                            {selectedCampaign.riskLevel === 'high' ? '높음' : selectedCampaign.riskLevel === 'medium' ? '중간' : '낮음'}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">시작일</p>
                            <p className="font-medium">{selectedCampaign.startDate}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">종료일</p>
                            <p className="font-medium">{selectedCampaign.endDate}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">생성일</p>
                            <p className="font-medium">{selectedCampaign.createdAt}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">제출일</p>
                            <p className="font-medium">{selectedCampaign.submittedAt}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        예산 & 비용
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>예산 사용률</span>
                          <span>{((selectedCampaign.spent / selectedCampaign.budget) * 100).toFixed(1)}%</span>
                        </div>
                        <Progress value={(selectedCampaign.spent / selectedCampaign.budget) * 100} className="h-3" />
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>{formatCurrency(selectedCampaign.spent)} 사용</span>
                          <span>{formatCurrency(selectedCampaign.budget)} 총예산</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 pt-4">
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <div className="text-lg font-bold text-blue-600">{selectedCampaign.roi}%</div>
                          <div className="text-sm text-muted-foreground">ROI</div>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <div className="text-lg font-bold text-green-600">₩{selectedCampaign.costPerClick}</div>
                          <div className="text-sm text-muted-foreground">클릭당 비용</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {selectedCampaign.reviewNotes && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        검토 노트
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{selectedCampaign.reviewNotes}</p>
                      <div className="mt-2 text-xs text-muted-foreground">
                        검토자: {selectedCampaign.reviewedBy} | 검토일: {selectedCampaign.reviewedAt}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* 성과 탭 */}
              <TabsContent value="performance" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <MousePointer className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">총 클릭</p>
                          <p className="font-bold">{selectedCampaign.clicks.toLocaleString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Eye className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">노출 수</p>
                          <p className="font-bold">{selectedCampaign.impressions.toLocaleString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <TrendingUp className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">전환 수</p>
                          <p className="font-bold">{selectedCampaign.conversions.toLocaleString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 rounded-lg">
                          <Users className="w-4 h-4 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">참가자</p>
                          <p className="font-bold">{selectedCampaign.participantCount.toLocaleString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>성과 지표</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>클릭률 (CTR)</span>
                          <span className="font-medium">{selectedCampaign.ctr}%</span>
                        </div>
                        <Progress value={selectedCampaign.ctr * 20} className="h-2" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>전환율</span>
                          <span className="font-medium">{selectedCampaign.conversionRate}%</span>
                        </div>
                        <Progress value={selectedCampaign.conversionRate * 10} className="h-2" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>ROI</span>
                          <span className="font-medium">{selectedCampaign.roi}%</span>
                        </div>
                        <Progress value={Math.min(selectedCampaign.roi / 2, 100)} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>비용 효율성</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 gap-3">
                        <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                          <span className="text-sm">클릭당 비용</span>
                          <span className="font-medium">₩{selectedCampaign.costPerClick}</span>
                        </div>
                        <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                          <span className="text-sm">전환당 비용</span>
                          <span className="font-medium">₩{Math.round(selectedCampaign.spent / selectedCampaign.conversions).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                          <span className="text-sm">참가자당 비용</span>
                          <span className="font-medium">₩{Math.round(selectedCampaign.spent / selectedCampaign.participantCount).toLocaleString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* 참가자 탭 */}
              <TabsContent value="participants" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>참가자 통계</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{selectedCampaign.participantCount}</div>
                        <div className="text-sm text-muted-foreground">총 참가자</div>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{Math.round(selectedCampaign.participantCount * 0.87)}</div>
                        <div className="text-sm text-muted-foreground">활성 참가자</div>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">{Math.round(selectedCampaign.participantCount * 0.23)}</div>
                        <div className="text-sm text-muted-foreground">완료 참가자</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* 타임라인 탭 */}
              <TabsContent value="timeline" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      캠페인 이력
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 rounded-lg border">
                        <div className="p-2 rounded-full bg-blue-100">
                          <Calendar className="w-3 h-3 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">캠페인 생성</p>
                          <p className="text-xs text-muted-foreground">{selectedCampaign.createdAt}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3 p-3 rounded-lg border">
                        <div className="p-2 rounded-full bg-yellow-100">
                          <Clock className="w-3 h-3 text-yellow-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">검토 제출</p>
                          <p className="text-xs text-muted-foreground">{selectedCampaign.submittedAt}</p>
                        </div>
                      </div>
                      
                      {selectedCampaign.reviewedAt && (
                        <div className="flex items-start gap-3 p-3 rounded-lg border">
                          <div className={`p-2 rounded-full ${selectedCampaign.status === 'rejected' ? 'bg-red-100' : 'bg-green-100'}`}>
                            {selectedCampaign.status === 'rejected' ? 
                              <X className="w-3 h-3 text-red-600" /> : 
                              <CheckCircle className="w-3 h-3 text-green-600" />
                            }
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {selectedCampaign.status === 'rejected' ? '거부됨' : '승인됨'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {selectedCampaign.reviewedAt} by {selectedCampaign.reviewedBy}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {selectedCampaign.status === 'active' && (
                        <div className="flex items-start gap-3 p-3 rounded-lg border">
                          <div className="p-2 rounded-full bg-green-100">
                            <Play className="w-3 h-3 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">캠페인 시작</p>
                            <p className="text-xs text-muted-foreground">{selectedCampaign.startDate}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* 캠페인 승인/거부 모달 */}
      <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5" />
              캠페인 검토: {selectedCampaign?.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedCampaign && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">광고주</p>
                  <p className="font-medium">{selectedCampaign.advertiser}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">카테고리</p>
                  <p className="font-medium">{selectedCampaign.category}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">예산</p>
                  <p className="font-medium">{formatCurrency(selectedCampaign.budget)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">위험도</p>
                  <Badge variant={selectedCampaign.riskLevel === 'high' ? 'destructive' : selectedCampaign.riskLevel === 'medium' ? 'secondary' : 'outline'}>
                    {selectedCampaign.riskLevel === 'high' ? '높음' : selectedCampaign.riskLevel === 'medium' ? '중간' : '낮음'}
                  </Badge>
                </div>
              </div>

              {selectedCampaign.riskLevel === 'high' && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>높은 위험도 캠페인</AlertTitle>
                  <AlertDescription>
                    이 캠페인은 높은 위험도로 분류되었습니다. 승인 전에 추가적인 검토가 필요할 수 있습니다.
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <label className="text-sm font-medium mb-2 block">검토 노트</label>
                <Textarea
                  placeholder="승인/거부 사유를 입력해주세요..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline"
                  className="flex-1 text-green-600 border-green-600 hover:bg-green-50"
                  onClick={() => handleCampaignAction(selectedCampaign.id, 'approve')}
                  disabled={!reviewNotes.trim()}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  승인
                </Button>
                <Button 
                  variant="outline"
                  className="flex-1 text-red-600 border-red-600 hover:bg-red-50"
                  onClick={() => handleCampaignAction(selectedCampaign.id, 'reject')}
                  disabled={!reviewNotes.trim()}
                >
                  <X className="w-4 h-4 mr-2" />
                  거부
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}