import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Calendar } from './ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { 
  Download, Search, Filter, Calendar as CalendarIcon, Receipt,
  CreditCard, Building2, Smartphone, Check, AlertCircle, Clock,
  ArrowUpRight, ArrowDownLeft, RefreshCw, Eye, FileText, Mail
} from 'lucide-react'
import { format, startOfMonth, endOfMonth, subMonths, parseISO, isWithinInterval } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'

interface Transaction {
  id: string
  transactionId: string
  type: 'deposit' | 'payment' | 'refund' | 'bonus'
  amount: number
  status: 'completed' | 'pending' | 'failed' | 'cancelled'
  paymentMethod: 'card' | 'bank' | 'mobile' | 'digital'
  description: string
  campaignId?: string
  campaignName?: string
  createdAt: string
  updatedAt: string
  metadata?: {
    cardLast4?: string
    bankName?: string
    receiptUrl?: string
    taxInvoiceUrl?: string
  }
}

interface BillingStats {
  totalDeposits: number
  totalSpent: number
  totalRefunds: number
  currentBalance: number
  monthlySpending: number
  averageTransactionAmount: number
}

interface BillingHistoryProps {
  userId?: string
  onTransactionSelect?: (transaction: Transaction) => void
}

type FilterType = 'all' | 'deposit' | 'payment' | 'refund' | 'bonus'
type FilterStatus = 'all' | 'completed' | 'pending' | 'failed'
type DateRangeType = 'all' | 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'

export function BillingHistory({ userId, onTransactionSelect }: BillingHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [dateRange, setDateRange] = useState<DateRangeType>('month')
  const [customDateRange, setCustomDateRange] = useState<{
    startDate: Date | null
    endDate: Date | null
  }>({ startDate: null, endDate: null })
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [isTransactionDetailOpen, setIsTransactionDetailOpen] = useState(false)

  // Mock 데이터 생성
  useEffect(() => {
    const generateMockTransactions = (): Transaction[] => {
      const mockData: Transaction[] = []
      const currentDate = new Date()
      
      // 최근 3개월간의 거래 데이터 생성
      for (let i = 0; i < 50; i++) {
        const date = new Date(currentDate.getTime() - Math.random() * 90 * 24 * 60 * 60 * 1000)
        const types: Array<Transaction['type']> = ['deposit', 'payment', 'refund', 'bonus']
        const statuses: Array<Transaction['status']> = ['completed', 'pending', 'failed']
        const paymentMethods: Array<Transaction['paymentMethod']> = ['card', 'bank', 'mobile']
        
        const type = types[Math.floor(Math.random() * types.length)]
        const status = i < 45 ? 'completed' : statuses[Math.floor(Math.random() * statuses.length)]
        const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)]
        
        let amount: number
        let description: string
        
        switch (type) {
          case 'deposit':
            amount = [50000, 100000, 200000, 500000][Math.floor(Math.random() * 4)]
            description = '계정 충전'
            break
          case 'payment':
            amount = Math.floor(Math.random() * 100000) + 10000
            description = `캠페인 ${Math.floor(Math.random() * 5) + 1} 실행 비용`
            break
          case 'refund':
            amount = Math.floor(Math.random() * 50000) + 5000
            description = '캠페인 환불'
            break
          case 'bonus':
            amount = Math.floor(Math.random() * 20000) + 5000
            description = '충전 보너스'
            break
        }

        mockData.push({
          id: `txn_${i + 1}`,
          transactionId: `TXN${Date.now()}${i}`,
          type,
          amount: type === 'payment' ? -amount : amount,
          status,
          paymentMethod,
          description,
          campaignId: type === 'payment' ? `campaign_${Math.floor(Math.random() * 5) + 1}` : undefined,
          campaignName: type === 'payment' ? `캠페인 ${Math.floor(Math.random() * 5) + 1}` : undefined,
          createdAt: date.toISOString(),
          updatedAt: date.toISOString(),
          metadata: {
            cardLast4: paymentMethod === 'card' ? `****${Math.floor(Math.random() * 9000) + 1000}` : undefined,
            bankName: paymentMethod === 'bank' ? ['KB국민은행', '신한은행', '우리은행'][Math.floor(Math.random() * 3)] : undefined,
            receiptUrl: status === 'completed' ? `/receipts/${i}.pdf` : undefined,
            taxInvoiceUrl: status === 'completed' && amount > 50000 ? `/invoices/${i}.pdf` : undefined
          }
        })
      }
      
      return mockData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }

    setIsLoading(true)
    setTimeout(() => {
      setTransactions(generateMockTransactions())
      setIsLoading(false)
    }, 1000)
  }, [])

  // 통계 계산
  const billingStats: BillingStats = useMemo(() => {
    const completedTransactions = transactions.filter(t => t.status === 'completed')
    
    const totalDeposits = completedTransactions
      .filter(t => t.type === 'deposit' || t.type === 'bonus')
      .reduce((sum, t) => sum + t.amount, 0)
    
    const totalSpent = Math.abs(completedTransactions
      .filter(t => t.type === 'payment')
      .reduce((sum, t) => sum + t.amount, 0))
    
    const totalRefunds = completedTransactions
      .filter(t => t.type === 'refund')
      .reduce((sum, t) => sum + t.amount, 0)
    
    const currentBalance = totalDeposits + totalRefunds - totalSpent
    
    // 이번 달 지출
    const currentMonth = new Date()
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    
    const monthlySpending = Math.abs(completedTransactions
      .filter(t => 
        t.type === 'payment' && 
        isWithinInterval(parseISO(t.createdAt), { start: monthStart, end: monthEnd })
      )
      .reduce((sum, t) => sum + t.amount, 0))
    
    const averageTransactionAmount = completedTransactions.length > 0 
      ? Math.abs(completedTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) / completedTransactions.length)
      : 0

    return {
      totalDeposits,
      totalSpent,
      totalRefunds,
      currentBalance,
      monthlySpending,
      averageTransactionAmount
    }
  }, [transactions])

  // 필터링된 거래 목록
  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      // 검색어 필터
      const matchesSearch = !searchTerm || 
        transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.transactionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.campaignName?.toLowerCase().includes(searchTerm.toLowerCase())

      // 유형 필터
      const matchesType = filterType === 'all' || transaction.type === filterType

      // 상태 필터
      const matchesStatus = filterStatus === 'all' || transaction.status === filterStatus

      // 날짜 필터
      let matchesDate = true
      const transactionDate = parseISO(transaction.createdAt)
      const now = new Date()

      switch (dateRange) {
        case 'today':
          matchesDate = format(transactionDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')
          break
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          matchesDate = transactionDate >= weekAgo
          break
        case 'month':
          matchesDate = isWithinInterval(transactionDate, {
            start: startOfMonth(now),
            end: endOfMonth(now)
          })
          break
        case 'quarter':
          const quarterAgo = subMonths(now, 3)
          matchesDate = transactionDate >= quarterAgo
          break
        case 'year':
          const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
          matchesDate = transactionDate >= yearAgo
          break
        case 'custom':
          if (customDateRange.startDate && customDateRange.endDate) {
            matchesDate = isWithinInterval(transactionDate, {
              start: customDateRange.startDate,
              end: customDateRange.endDate
            })
          }
          break
      }

      return matchesSearch && matchesType && matchesStatus && matchesDate
    })
  }, [transactions, searchTerm, filterType, filterStatus, dateRange, customDateRange])

  const getTransactionTypeIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'deposit': return <ArrowDownLeft className="w-4 h-4 text-green-600" />
      case 'payment': return <ArrowUpRight className="w-4 h-4 text-red-600" />
      case 'refund': return <ArrowDownLeft className="w-4 h-4 text-blue-600" />
      case 'bonus': return <ArrowDownLeft className="w-4 h-4 text-purple-600" />
    }
  }

  const getTransactionTypeLabel = (type: Transaction['type']) => {
    switch (type) {
      case 'deposit': return '충전'
      case 'payment': return '결제'
      case 'refund': return '환불'
      case 'bonus': return '보너스'
    }
  }

  const getStatusBadge = (status: Transaction['status']) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500"><Check className="w-3 h-3 mr-1" />완료</Badge>
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />처리중</Badge>
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />실패</Badge>
      case 'cancelled':
        return <Badge variant="outline">취소됨</Badge>
    }
  }

  const getPaymentMethodIcon = (method: Transaction['paymentMethod']) => {
    switch (method) {
      case 'card': return <CreditCard className="w-4 h-4" />
      case 'bank': return <Building2 className="w-4 h-4" />
      case 'mobile': return <Smartphone className="w-4 h-4" />
      default: return <CreditCard className="w-4 h-4" />
    }
  }

  const getPaymentMethodLabel = (method: Transaction['paymentMethod']) => {
    switch (method) {
      case 'card': return '신용카드'
      case 'bank': return '계좌이체'
      case 'mobile': return '휴대폰 결제'
      case 'digital': return '간편결제'
    }
  }

  const handleExportData = () => {
    // CSV 형태로 데이터 내보내기
    const headers = ['날짜', '거래번호', '유형', '금액', '상태', '설명', '결제수단']
    const csvData = filteredTransactions.map(t => [
      format(parseISO(t.createdAt), 'yyyy-MM-dd HH:mm:ss'),
      t.transactionId,
      getTransactionTypeLabel(t.type),
      `₩${Math.abs(t.amount).toLocaleString()}`,
      t.status,
      t.description,
      getPaymentMethodLabel(t.paymentMethod)
    ])

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `billing_history_${format(new Date(), 'yyyy-MM-dd')}.csv`)
    link.click()
    
    toast.success('거래 내역이 내보내기되었습니다.')
  }

  const handleTransactionDetail = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setIsTransactionDetailOpen(true)
    onTransactionSelect?.(transaction)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">결제 내역</h2>
            <p className="text-muted-foreground">계정의 모든 거래 내역을 확인하세요</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-6 bg-muted rounded w-1/2"></div>
                  <div className="h-3 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-muted rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                    <div className="h-4 bg-muted rounded w-20"></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">결제 내역</h2>
          <p className="text-muted-foreground">계정의 모든 거래 내역과 통계를 확인하세요</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportData}>
            <Download className="w-4 h-4 mr-2" />
            내보내기
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </Button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">현재 잔액</p>
                <p className="text-2xl font-bold text-green-600">₩{billingStats.currentBalance.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">사용 가능한 크레딧</p>
              </div>
              <Receipt className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">총 충전액</p>
                <p className="text-2xl font-bold">₩{billingStats.totalDeposits.toLocaleString()}</p>
                <p className="text-xs text-green-600 mt-1">누적 충전 금액</p>
              </div>
              <ArrowDownLeft className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">총 사용액</p>
                <p className="text-2xl font-bold">₩{billingStats.totalSpent.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">캠페인 실행 비용</p>
              </div>
              <ArrowUpRight className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">이번 달 지출</p>
                <p className="text-2xl font-bold">₩{billingStats.monthlySpending.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  평균: ₩{Math.round(billingStats.averageTransactionAmount).toLocaleString()}
                </p>
              </div>
              <CalendarIcon className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 및 검색 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* 검색 */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="거래번호, 설명, 캠페인명으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* 필터들 */}
            <div className="flex flex-col sm:flex-row gap-2">
              {/* 거래 유형 */}
              <Select value={filterType} onValueChange={(value: FilterType) => setFilterType(value)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 유형</SelectItem>
                  <SelectItem value="deposit">충전</SelectItem>
                  <SelectItem value="payment">결제</SelectItem>
                  <SelectItem value="refund">환불</SelectItem>
                  <SelectItem value="bonus">보너스</SelectItem>
                </SelectContent>
              </Select>

              {/* 상태 */}
              <Select value={filterStatus} onValueChange={(value: FilterStatus) => setFilterStatus(value)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 상태</SelectItem>
                  <SelectItem value="completed">완료</SelectItem>
                  <SelectItem value="pending">처리중</SelectItem>
                  <SelectItem value="failed">실패</SelectItem>
                </SelectContent>
              </Select>

              {/* 기간 */}
              <Select value={dateRange} onValueChange={(value: DateRangeType) => setDateRange(value)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 기간</SelectItem>
                  <SelectItem value="today">오늘</SelectItem>
                  <SelectItem value="week">최근 7일</SelectItem>
                  <SelectItem value="month">이번 달</SelectItem>
                  <SelectItem value="quarter">최근 3개월</SelectItem>
                  <SelectItem value="year">올해</SelectItem>
                  <SelectItem value="custom">직접 설정</SelectItem>
                </SelectContent>
              </Select>

              {/* 커스텀 날짜 범위 */}
              {dateRange === 'custom' && (
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-[120px] justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customDateRange.startDate ? format(customDateRange.startDate, 'MM/dd') : '시작일'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customDateRange.startDate || undefined}
                        onSelect={(date) => setCustomDateRange(prev => ({ ...prev, startDate: date || null }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-[120px] justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customDateRange.endDate ? format(customDateRange.endDate, 'MM/dd') : '종료일'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customDateRange.endDate || undefined}
                        onSelect={(date) => setCustomDateRange(prev => ({ ...prev, endDate: date || null }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 거래 내역 목록 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              거래 내역 ({filteredTransactions.length}건)
            </CardTitle>
            {filteredTransactions.length > 0 && (
              <div className="text-sm text-muted-foreground">
                총 금액: ₩{Math.abs(filteredTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)).toLocaleString()}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                조건에 맞는 거래 내역이 없습니다
              </h3>
              <p className="text-sm text-muted-foreground">
                필터 조건을 변경하거나 다른 기간을 선택해보세요.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow cursor-pointer"
                  onClick={() => handleTransactionDetail(transaction)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      {getTransactionTypeIcon(transaction.type)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{transaction.description}</h4>
                        {getStatusBadge(transaction.status)}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          {getPaymentMethodIcon(transaction.paymentMethod)}
                          {getPaymentMethodLabel(transaction.paymentMethod)}
                          {transaction.metadata?.cardLast4 && ` (${transaction.metadata.cardLast4})`}
                          {transaction.metadata?.bankName && ` (${transaction.metadata.bankName})`}
                        </span>
                        <span>{format(parseISO(transaction.createdAt), 'MM/dd HH:mm', { locale: ko })}</span>
                        <span className="text-xs bg-muted px-2 py-1 rounded">
                          {transaction.transactionId}
                        </span>
                      </div>
                      
                      {transaction.campaignName && (
                        <p className="text-xs text-blue-600 mt-1">
                          {transaction.campaignName}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`text-lg font-bold ${
                      transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.amount > 0 ? '+' : ''}₩{Math.abs(transaction.amount).toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {getTransactionTypeLabel(transaction.type)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 거래 상세 정보 모달 */}
      <Dialog open={isTransactionDetailOpen} onOpenChange={setIsTransactionDetailOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              거래 상세 정보
            </DialogTitle>
            <DialogDescription>
              거래 번호: {selectedTransaction?.transactionId}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4">
              {/* 거래 기본 정보 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>거래 유형</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {getTransactionTypeIcon(selectedTransaction.type)}
                    <span className="font-medium">{getTransactionTypeLabel(selectedTransaction.type)}</span>
                  </div>
                </div>
                <div>
                  <Label>상태</Label>
                  <div className="mt-1">{getStatusBadge(selectedTransaction.status)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>금액</Label>
                  <div className={`text-xl font-bold mt-1 ${
                    selectedTransaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {selectedTransaction.amount > 0 ? '+' : ''}₩{Math.abs(selectedTransaction.amount).toLocaleString()}
                  </div>
                </div>
                <div>
                  <Label>결제 수단</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {getPaymentMethodIcon(selectedTransaction.paymentMethod)}
                    <span>{getPaymentMethodLabel(selectedTransaction.paymentMethod)}</span>
                  </div>
                </div>
              </div>

              <div>
                <Label>설명</Label>
                <p className="mt-1 p-2 bg-muted rounded">{selectedTransaction.description}</p>
              </div>

              {selectedTransaction.campaignName && (
                <div>
                  <Label>연관 캠페인</Label>
                  <p className="mt-1 p-2 bg-blue-50 border border-blue-200 rounded text-blue-800">
                    {selectedTransaction.campaignName}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>거래 시간</Label>
                  <p className="mt-1 text-sm">
                    {format(parseISO(selectedTransaction.createdAt), 'yyyy년 MM월 dd일 HH:mm:ss', { locale: ko })}
                  </p>
                </div>
                <div>
                  <Label>업데이트 시간</Label>
                  <p className="mt-1 text-sm">
                    {format(parseISO(selectedTransaction.updatedAt), 'yyyy년 MM월 dd일 HH:mm:ss', { locale: ko })}
                  </p>
                </div>
              </div>

              {/* 문서 링크 */}
              {selectedTransaction.metadata && (
                <div className="space-y-2">
                  <Label>관련 문서</Label>
                  <div className="flex gap-2">
                    {selectedTransaction.metadata.receiptUrl && (
                      <Button variant="outline" size="sm" className="flex-1">
                        <FileText className="w-4 h-4 mr-2" />
                        영수증 다운로드
                      </Button>
                    )}
                    {selectedTransaction.metadata.taxInvoiceUrl && (
                      <Button variant="outline" size="sm" className="flex-1">
                        <Receipt className="w-4 h-4 mr-2" />
                        세금계산서
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* 액션 버튼 */}
              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1">
                  <Mail className="w-4 h-4 mr-2" />
                  영수증 이메일 발송
                </Button>
                <Button variant="outline" onClick={() => setIsTransactionDetailOpen(false)}>
                  닫기
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}