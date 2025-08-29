import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Avatar, AvatarFallback } from './ui/avatar'
import { 
  Check, 
  X, 
  Building2, 
  Search, 
  Filter,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Eye,
  TrendingUp,
  Users,
  Ban,
  CheckCircle
} from 'lucide-react'

// 대량의 광고주 데이터 시뮬레이션
const generateAdvertiserData = (count: number) => {
  const companyTypes = ['스타트업', '브랜드', '코스메틱', '케어', '테크', '푸드', '패션', '뷰티', '헬스', '에듀', '게임', '여행']
  const industries = ['전자제품', '패션/의류', '뷰티/화장품', '건강/의료', '교육', '음식/요리', '여행/숙박', '게임/엔터', '금융/핀테크', '쇼핑/이커머스']
  const statuses = ['active', 'pending', 'inactive', 'suspended']
  
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    company: `${companyTypes[i % companyTypes.length]}${Math.floor(i / companyTypes.length) + 1}`,
    industry: industries[i % industries.length],
    todaySpend: Math.floor(Math.random() * 3000000) + 50000,
    totalSpent: Math.floor(Math.random() * 50000000) + 1000000,
    activeCampaigns: Math.floor(Math.random() * 10),
    completedCampaigns: Math.floor(Math.random() * 50) + 5,
    totalBudget: Math.floor(Math.random() * 100000000) + 5000000,
    status: statuses[i % statuses.length],
    approval: i % 4 === 0 ? 'pending' : 'approved',
    joinDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
    contact: `contact${i + 1}@company.com`,
    phone: `02-${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`,
    rating: Number((Math.random() * 2 + 3).toFixed(1)), // 3.0 ~ 5.0
    region: ['서울', '부산', '대구', '인천', '광주', '대전'][i % 6]
  }))
}

// 342개 광고주 데이터 생성 (App.tsx에서 총 광고주 수와 일치)
const allAdvertisers = generateAdvertiserData(342)

// 승인 대기 광고주 (pending approval)
const pendingApprovals = allAdvertisers.filter(a => a.approval === 'pending')

export function AdvertiserManagement() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [industryFilter, setIndustryFilter] = useState('all')
  const [approvalFilter, setApprovalFilter] = useState('all')
  const [sortBy, setSortBy] = useState('id')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all')
  const itemsPerPage = 20

  // 필터링 및 검색
  const filteredAdvertisers = allAdvertisers.filter(advertiser => {
    const matchesSearch = advertiser.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         advertiser.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         advertiser.phone.includes(searchTerm)
    const matchesStatus = statusFilter === 'all' || advertiser.status === statusFilter
    const matchesIndustry = industryFilter === 'all' || advertiser.industry === industryFilter
    const matchesApproval = approvalFilter === 'all' || advertiser.approval === approvalFilter
    
    return matchesSearch && matchesStatus && matchesIndustry && matchesApproval
  })

  // 정렬
  const sortedAdvertisers = [...filteredAdvertisers].sort((a, b) => {
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
  const totalPages = Math.ceil(sortedAdvertisers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const currentAdvertisers = sortedAdvertisers.slice(startIndex, startIndex + itemsPerPage)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="outline" className="text-green-600 border-green-600">활성</Badge>
      case 'pending':
        return <Badge variant="secondary" className="text-yellow-600">승인대기</Badge>
      case 'inactive':
        return <Badge variant="outline" className="text-gray-600 border-gray-600">비활성</Badge>
      case 'suspended':
        return <Badge variant="outline" className="text-red-600 border-red-600">정지</Badge>
      default:
        return <Badge variant="secondary">알 수 없음</Badge>
    }
  }

  const getApprovalBadge = (approval: string) => {
    switch (approval) {
      case 'approved':
        return <Badge variant="outline" className="text-green-600 border-green-600">승인완료</Badge>
      case 'pending':
        return <Badge variant="secondary" className="text-yellow-600">승인대기</Badge>
      case 'rejected':
        return <Badge variant="outline" className="text-red-600 border-red-600">거절</Badge>
      default:
        return <Badge variant="secondary">알 수 없음</Badge>
    }
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

  const uniqueIndustries = Array.from(new Set(allAdvertisers.map(a => a.industry)))

  return (
    <div className="space-y-6">
      {/* 광고주 통계 개요 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">전체 광고주</p>
                <p className="font-bold">{allAdvertisers.length.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">활성 광고주</p>
                <p className="font-bold">{allAdvertisers.filter(a => a.status === 'active').length.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Users className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">승인 대기</p>
                <p className="font-bold">{pendingApprovals.length.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Ban className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">정지된 광고주</p>
                <p className="font-bold">{allAdvertisers.filter(a => a.status === 'suspended').length.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 탭 메뉴 */}
      <div className="flex items-center gap-4 border-b">
        <Button 
          variant={activeTab === 'all' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('all')}
          className="pb-2"
        >
          전체 광고주
        </Button>
        <Button 
          variant={activeTab === 'pending' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('pending')}
          className="pb-2"
        >
          승인 대기 ({pendingApprovals.length})
        </Button>
      </div>

      {activeTab === 'all' ? (
        <>
          {/* 검색 및 필터 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                광고주 검색 및 필터
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="회사명, 이메일, 전화번호 검색..."
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
                    <SelectItem value="active">활성</SelectItem>
                    <SelectItem value="pending">승인대기</SelectItem>
                    <SelectItem value="inactive">비활성</SelectItem>
                    <SelectItem value="suspended">정지</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={industryFilter} onValueChange={(value) => {
                  setIndustryFilter(value)
                  setCurrentPage(1)
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="업종 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 업종</SelectItem>
                    {uniqueIndustries.map(industry => (
                      <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={approvalFilter} onValueChange={(value) => {
                  setApprovalFilter(value)
                  setCurrentPage(1)
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="승인상태 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 승인상태</SelectItem>
                    <SelectItem value="approved">승인완료</SelectItem>
                    <SelectItem value="pending">승인대기</SelectItem>
                  </SelectContent>
                </Select>

                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm('')
                    setStatusFilter('all')
                    setIndustryFilter('all')
                    setApprovalFilter('all')
                    setCurrentPage(1)
                  }}
                >
                  초기화
                </Button>
              </div>
              
              <div className="mt-4 text-sm text-muted-foreground">
                총 {allAdvertisers.length.toLocaleString()}개 중 {filteredAdvertisers.length.toLocaleString()}개 표시
              </div>
            </CardContent>
          </Card>

          {/* 광고주 목록 테이블 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>광고주 목록</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredAdvertisers.length)} / {filteredAdvertisers.length.toLocaleString()}
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
                    <TableHead>회사 정보</TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => handleSort('todaySpend')} className="p-0 h-auto font-semibold">
                        오늘 지출 <ArrowUpDown className="w-3 h-3 ml-1" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => handleSort('totalSpent')} className="p-0 h-auto font-semibold">
                        총 지출 <ArrowUpDown className="w-3 h-3 ml-1" />
                      </Button>
                    </TableHead>
                    <TableHead>캠페인</TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => handleSort('rating')} className="p-0 h-auto font-semibold">
                        평점 <ArrowUpDown className="w-3 h-3 ml-1" />
                      </Button>
                    </TableHead>
                    <TableHead>승인상태</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => handleSort('joinDate')} className="p-0 h-auto font-semibold">
                        가입일 <ArrowUpDown className="w-3 h-3 ml-1" />
                      </Button>
                    </TableHead>
                    <TableHead>액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentAdvertisers.map((advertiser) => (
                    <TableRow key={advertiser.id}>
                      <TableCell className="font-mono">{advertiser.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback>
                              <Building2 className="w-4 h-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{advertiser.company}</div>
                            <div className="text-xs text-muted-foreground">{advertiser.industry}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{formatCurrency(advertiser.todaySpend)}</span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="text-sm">{formatCurrency(advertiser.totalSpent)}</div>
                          <div className="text-xs text-muted-foreground">예산: {formatCurrency(advertiser.totalBudget)}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="text-sm">활성: {advertiser.activeCampaigns}개</div>
                          <div className="text-xs text-muted-foreground">완료: {advertiser.completedCampaigns}개</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{advertiser.rating}</span>
                          <span className="text-xs text-muted-foreground">⭐</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getApprovalBadge(advertiser.approval)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(advertiser.status)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {advertiser.joinDate}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="sm">
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <TrendingUp className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* 페이지네이션 */}
              <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-muted-foreground">
                  페이지 {currentPage} / {totalPages} (총 {filteredAdvertisers.length.toLocaleString()}개)
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
        </>
      ) : (
        /* 승인 대기 탭 */
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>승인 대기 광고주</CardTitle>
              <Badge variant="secondary">{pendingApprovals.length}건 대기</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingApprovals.map((approval) => (
                <div key={approval.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarFallback>
                        <Building2 className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-medium">{approval.company}</h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>업종: {approval.industry}</span>
                        <span>신청일: {approval.joinDate}</span>
                        <span>예산: {formatCurrency(approval.totalBudget)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-1" />
                      상세보기
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600 border-red-600 hover:bg-red-50">
                      <X className="w-4 h-4 mr-1" />
                      거절
                    </Button>
                    <Button variant="outline" size="sm" className="text-green-600 border-green-600 hover:bg-green-50">
                      <Check className="w-4 h-4 mr-1" />
                      승인
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            {pendingApprovals.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                현재 승인 대기중인 광고주가 없습니다.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}