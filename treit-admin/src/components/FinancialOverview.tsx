import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Progress } from './ui/progress'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  CreditCard,
  Banknote,
  PiggyBank,
  Receipt,
  ArrowUpDown,
  Download,
  Upload,
  CheckCircle,
  Clock,
  X,
  AlertTriangle,
  Eye,
  Search,
  Filter,
  Calendar,
  Building2,
  Users,
  BarChart3,
  Wallet,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

// 재무 데이터 타입 정의
interface FinancialTransaction {
  id: string
  type: 'withdrawal' | 'deposit' | 'commission' | 'refund' | 'penalty'
  userId?: number
  userName?: string
  advertiserId?: number
  advertiserName?: string
  amount: number
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  createdAt: Date
  processedAt?: Date
  description: string
  campaignName?: string
  paymentMethod?: string
  bankInfo?: string
}

interface FinancialStats {
  dailyRevenue: number
  monthlyRevenue: number
  totalRevenue: number
  pendingWithdrawals: number
  processedWithdrawals: number
  commissionEarned: number
  operatingExpenses: number
  netProfit: number
  userBalance: number
  advertiserBalance: number
}

// 재무 데이터 생성
const generateFinancialTransactions = (): FinancialTransaction[] => {
  const types = ['withdrawal', 'deposit', 'commission', 'refund', 'penalty']
  const statuses = ['pending', 'processing', 'completed', 'failed', 'cancelled']
  const users = Array.from({ length: 50 }, (_, i) => ({ id: i + 1, name: `사용자${i + 1}` }))
  const advertisers = Array.from({ length: 20 }, (_, i) => ({ id: i + 1, name: `광고주${i + 1}` }))
  
  return Array.from({ length: 200 }, (_, i) => {
    const type = types[Math.floor(Math.random() * types.length)]
    const user = users[Math.floor(Math.random() * users.length)]
    const advertiser = advertisers[Math.floor(Math.random() * advertisers.length)]
    
    return {
      id: `tx-${i + 1}`,
      type: type as any,
      userId: Math.random() > 0.3 ? user.id : undefined,
      userName: Math.random() > 0.3 ? user.name : undefined,
      advertiserId: Math.random() > 0.5 ? advertiser.id : undefined,
      advertiserName: Math.random() > 0.5 ? advertiser.name : undefined,
      amount: Math.floor(Math.random() * 1000000) + 10000,
      status: statuses[Math.floor(Math.random() * statuses.length)] as any,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      processedAt: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000) : undefined,
      description: getTransactionDescription(type),
      campaignName: Math.random() > 0.5 ? `캠페인 ${Math.floor(Math.random() * 100) + 1}` : undefined,
      paymentMethod: Math.random() > 0.5 ? ['은행계좌', '페이팔', '토스', '카카오페이'][Math.floor(Math.random() * 4)] : undefined,
      bankInfo: Math.random() > 0.7 ? '국민은행 ***-**-****-***' : undefined
    }
  })
}

function getTransactionDescription(type: string): string {
  switch (type) {
    case 'withdrawal':
      return '사용자 출금 요청'
    case 'deposit':
      return '광고주 예치금 입금'
    case 'commission':
      return '플랫폼 수수료'
    case 'refund':
      return '환불 처리'
    case 'penalty':
      return '위약금 부과'
    default:
      return '기타 거래'
  }
}

const generateFinancialStats = (): FinancialStats => ({
  dailyRevenue: 2800000,
  monthlyRevenue: 78400000,
  totalRevenue: 1240000000,
  pendingWithdrawals: 15600000,
  processedWithdrawals: 234800000,
  commissionEarned: 45200000,
  operatingExpenses: 12300000,
  netProfit: 32900000,
  userBalance: 89500000,
  advertiserBalance: 156700000
})

export function FinancialOverview() {
  const [transactions] = useState<FinancialTransaction[]>(generateFinancialTransactions())
  const [financialStats] = useState<FinancialStats>(generateFinancialStats())
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const itemsPerPage = 20

  // 필터링 및 검색
  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (tx.userName && tx.userName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (tx.advertiserName && tx.advertiserName.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesType = typeFilter === 'all' || tx.type === typeFilter
    const matchesStatus = statusFilter === 'all' || tx.status === statusFilter
    
    let matchesDate = true
    if (dateFilter !== 'all') {
      const now = new Date()
      const dayMs = 24 * 60 * 60 * 1000
      const txDate = new Date(tx.createdAt)
      
      switch (dateFilter) {
        case 'today':
          matchesDate = txDate.toDateString() === now.toDateString()
          break
        case 'week':
          matchesDate = (now.getTime() - txDate.getTime()) <= 7 * dayMs
          break
        case 'month':
          matchesDate = (now.getTime() - txDate.getTime()) <= 30 * dayMs
          break
      }
    }
    
    return matchesSearch && matchesType && matchesStatus && matchesDate
  })

  // 정렬
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    let aValue: any = a[sortBy as keyof FinancialTransaction]
    let bValue: any = b[sortBy as keyof FinancialTransaction]
    
    if (sortBy === 'createdAt' || sortBy === 'processedAt') {
      aValue = new Date(aValue).getTime()
      bValue = new Date(bValue).getTime()
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })

  // 페이지네이션
  const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const currentTransactions = sortedTransactions.slice(startIndex, startIndex + itemsPerPage)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount)
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'withdrawal': return '출금'
      case 'deposit': return '입금'
      case 'commission': return '수수료'
      case 'refund': return '환불'
      case 'penalty': return '위약금'
      default: return '기타'
    }
  }

  const getTypeBadge = (type: string) => {
    const colors = {
      withdrawal: 'bg-red-100 text-red-700',
      deposit: 'bg-green-100 text-green-700',
      commission: 'bg-blue-100 text-blue-700',
      refund: 'bg-yellow-100 text-yellow-700',
      penalty: 'bg-purple-100 text-purple-700'
    }
    return <Badge variant="secondary" className={colors[type as keyof typeof colors]}>{getTypeLabel(type)}</Badge>
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="outline" className="text-green-600 border-green-600">완료</Badge>
      case 'processing':
        return <Badge variant="secondary" className="text-blue-600">처리중</Badge>
      case 'pending':
        return <Badge variant="secondary" className="text-yellow-600">대기</Badge>
      case 'failed':
        return <Badge variant="destructive">실패</Badge>
      case 'cancelled':
        return <Badge variant="outline" className="text-gray-600 border-gray-600">취소</Badge>
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

  const handleTransactionAction = (txId: string, action: 'approve' | 'reject' | 'process') => {
    console.log(`Action ${action} on transaction ${txId}`)
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">재무 관리</h1>
          <p className="text-sm text-muted-foreground">
            수익, 지출, 출금 관리 및 재무 현황 모니터링
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            내보내기
          </Button>
        </div>
      </div>

      {/* 주요 재무 지표 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">오늘 수익</p>
                <p className="text-3xl font-bold text-green-600">
                  {formatCurrency(financialStats.dailyRevenue)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">전일 대비</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600 font-medium">+15.7%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">이번 달 수익</p>
                <p className="text-3xl font-bold text-blue-600">
                  {formatCurrency(financialStats.monthlyRevenue)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">목표 대비</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-blue-600 font-medium">87.3% 달성</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">대기 중 출금</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {formatCurrency(financialStats.pendingWithdrawals)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">처리 대기</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <div className="mt-4">
              <Badge variant="secondary" className="text-yellow-600">
                23건 대기
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">순이익</p>
                <p className="text-3xl font-bold text-purple-600">
                  {formatCurrency(financialStats.netProfit)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">이번 달</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <PiggyBank className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600 font-medium">+8.2%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="transactions">거래 내역</TabsTrigger>
          <TabsTrigger value="withdrawals">출금 관리</TabsTrigger>
          <TabsTrigger value="revenue">수익 분석</TabsTrigger>
          <TabsTrigger value="balances">잔액 관리</TabsTrigger>
        </TabsList>

        {/* 거래 내역 탭 */}
        <TabsContent value="transactions" className="space-y-6">
          {/* 검색 및 필터 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                거래 검색 및 필터
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="사용자명, 광고주, 설명 검색..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="pl-10"
                  />
                </div>
                
                <Select value={typeFilter} onValueChange={(value) => {
                  setTypeFilter(value)
                  setCurrentPage(1)
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="거래 유형" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 유형</SelectItem>
                    <SelectItem value="withdrawal">출금</SelectItem>
                    <SelectItem value="deposit">입금</SelectItem>
                    <SelectItem value="commission">수수료</SelectItem>
                    <SelectItem value="refund">환불</SelectItem>
                    <SelectItem value="penalty">위약금</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={statusFilter} onValueChange={(value) => {
                  setStatusFilter(value)
                  setCurrentPage(1)
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="거래 상태" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 상태</SelectItem>
                    <SelectItem value="completed">완료</SelectItem>
                    <SelectItem value="processing">처리중</SelectItem>
                    <SelectItem value="pending">대기</SelectItem>
                    <SelectItem value="failed">실패</SelectItem>
                    <SelectItem value="cancelled">취소</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={dateFilter} onValueChange={(value) => {
                  setDateFilter(value)
                  setCurrentPage(1)
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="기간 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 기간</SelectItem>
                    <SelectItem value="today">오늘</SelectItem>
                    <SelectItem value="week">최근 7일</SelectItem>
                    <SelectItem value="month">최근 30일</SelectItem>
                  </SelectContent>
                </Select>

                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm('')
                    setTypeFilter('all')
                    setStatusFilter('all')
                    setDateFilter('all')
                    setCurrentPage(1)
                  }}
                >
                  초기화
                </Button>
              </div>
              
              <div className="mt-4 text-sm text-muted-foreground">
                총 {transactions.length}개 중 {filteredTransactions.length}개 표시
              </div>
            </CardContent>
          </Card>

          {/* 거래 내역 테이블 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>거래 내역</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredTransactions.length)} / {filteredTransactions.length}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => handleSort('createdAt')} className="p-0 h-auto font-semibold">
                        거래 시간 <ArrowUpDown className="w-3 h-3 ml-1" />
                      </Button>
                    </TableHead>
                    <TableHead>거래 유형</TableHead>
                    <TableHead>사용자/광고주</TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => handleSort('amount')} className="p-0 h-auto font-semibold">
                        금액 <ArrowUpDown className="w-3 h-3 ml-1" />
                      </Button>
                    </TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>결제 방법</TableHead>
                    <TableHead>액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm">
                        <div>{tx.createdAt.toLocaleString('ko-KR')}</div>
                        {tx.processedAt && (
                          <div className="text-xs text-muted-foreground">
                            처리: {tx.processedAt.toLocaleString('ko-KR')}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {getTypeBadge(tx.type)}
                      </TableCell>
                      <TableCell>
                        {tx.userName && (
                          <div>
                            <div className="font-medium">{tx.userName}</div>
                            <div className="text-xs text-muted-foreground">사용자 ID: {tx.userId}</div>
                          </div>
                        )}
                        {tx.advertiserName && (
                          <div>
                            <div className="font-medium flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {tx.advertiserName}
                            </div>
                            <div className="text-xs text-muted-foreground">광고주 ID: {tx.advertiserId}</div>
                          </div>
                        )}
                        {!tx.userName && !tx.advertiserName && (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className={`font-medium ${tx.type === 'withdrawal' || tx.type === 'refund' ? 'text-red-600' : 'text-green-600'}`}>
                          {tx.type === 'withdrawal' || tx.type === 'refund' ? '-' : '+'}
                          {formatCurrency(tx.amount)}
                        </div>
                        {tx.campaignName && (
                          <div className="text-xs text-muted-foreground">{tx.campaignName}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(tx.status)}
                      </TableCell>
                      <TableCell>
                        {tx.paymentMethod && (
                          <div>
                            <div className="text-sm">{tx.paymentMethod}</div>
                            {tx.bankInfo && (
                              <div className="text-xs text-muted-foreground">{tx.bankInfo}</div>
                            )}
                          </div>
                        )}
                        {!tx.paymentMethod && (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="sm">
                            <Eye className="w-3 h-3" />
                          </Button>
                          {tx.status === 'pending' && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleTransactionAction(tx.id, 'approve')}
                                className="text-green-600 hover:text-green-700"
                              >
                                <CheckCircle className="w-3 h-3" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleTransactionAction(tx.id, 'reject')}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </>
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
                  페이지 {currentPage} / {totalPages} (총 {filteredTransactions.length}개)
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
        </TabsContent>

        {/* 출금 관리 탭 */}
        <TabsContent value="withdrawals" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Clock className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">승인 대기</p>
                    <p className="font-bold">23건</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">처리 중</p>
                    <p className="font-bold">7건</p>
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
                    <p className="text-sm text-muted-foreground">오늘 완료</p>
                    <p className="font-bold">156건</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>출금 요청 대기 목록</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                출금 관리 기능은 거래 내역 탭에서 확인할 수 있습니다.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 수익 분석 탭 */}
        <TabsContent value="revenue" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  수익 트렌드
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-lg font-bold text-green-600">+15.7%</div>
                    <div className="text-sm text-muted-foreground">일일 성장률</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-lg font-bold text-blue-600">+23.4%</div>
                    <div className="text-sm text-muted-foreground">월간 성장률</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PiggyBank className="w-4 h-4" />
                  수익 구조
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>플랫폼 수수료</span>
                    <span>{formatCurrency(financialStats.commissionEarned)}</span>
                  </div>
                  <Progress value={75} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>광고 수익</span>
                    <span>{formatCurrency(financialStats.monthlyRevenue * 0.3)}</span>
                  </div>
                  <Progress value={25} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>손익 분석</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(financialStats.monthlyRevenue)}</div>
                  <div className="text-sm text-muted-foreground">총 수익</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{formatCurrency(financialStats.operatingExpenses)}</div>
                  <div className="text-sm text-muted-foreground">운영 비용</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{formatCurrency(financialStats.netProfit)}</div>
                  <div className="text-sm text-muted-foreground">순이익</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 잔액 관리 탭 */}
        <TabsContent value="balances" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  사용자 잔액 현황
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-6 bg-blue-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">{formatCurrency(financialStats.userBalance)}</div>
                  <div className="text-sm text-muted-foreground">총 사용자 잔액</div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>출금 가능 잔액</span>
                    <span>{formatCurrency(financialStats.userBalance * 0.85)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>보류 중 잔액</span>
                    <span>{formatCurrency(financialStats.userBalance * 0.15)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  광고주 잔액 현황
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-6 bg-green-50 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">{formatCurrency(financialStats.advertiserBalance)}</div>
                  <div className="text-sm text-muted-foreground">총 광고주 예치금</div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>활성 캠페인 예약금</span>
                    <span>{formatCurrency(financialStats.advertiserBalance * 0.6)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>사용 가능 잔액</span>
                    <span>{formatCurrency(financialStats.advertiserBalance * 0.4)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>플랫폼 재무 상태</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-medium">유동성 지표</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm">현금 보유액</span>
                      <span className="font-medium">{formatCurrency(financialStats.netProfit * 3)}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm">준비금</span>
                      <span className="font-medium">{formatCurrency(financialStats.netProfit * 2)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-medium">위험 관리</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">출금 대기금 비율</span>
                      <Badge variant="outline" className="text-green-600 border-green-600">안전</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">유동성 비율</span>
                      <Badge variant="outline" className="text-blue-600 border-blue-600">양호</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">리스크 수준</span>
                      <Badge variant="outline" className="text-green-600 border-green-600">낮음</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}