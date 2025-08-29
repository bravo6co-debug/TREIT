import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Avatar, AvatarFallback } from './ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Check, X, Clock, CreditCard, TrendingDown, TrendingUp, Building2, User, Eye, Download, AlertTriangle, MessageSquare, FileText } from 'lucide-react'
import { StatCard } from './StatCard'

// 유저 인출 요청 데이터
const userWithdrawals = [
  {
    id: 1,
    userName: '김민수',
    userLevel: 'Level 15',
    amount: 85000,
    requestDate: '2025.01.15 14:30',
    status: 'pending',
    bankAccount: '국민은행 123-456-789',
    availableBalance: 127000,
    reason: ''
  },
  {
    id: 2,
    userName: '이소영',
    userLevel: 'Level 22',
    amount: 150000,
    requestDate: '2025.01.15 11:20',
    status: 'pending',
    bankAccount: '신한은행 987-654-321',
    availableBalance: 298000,
    reason: ''
  },
  {
    id: 3,
    userName: '박정호',
    userLevel: 'Level 8',
    amount: 25000,
    requestDate: '2025.01.14 16:45',
    status: 'approved',
    bankAccount: '우리은행 555-666-777',
    availableBalance: 45000,
    reason: ''
  },
  {
    id: 4,
    userName: '최지은',
    userLevel: 'Level 31',
    amount: 200000,
    requestDate: '2025.01.14 09:15',
    status: 'rejected',
    bankAccount: '농협은행 111-222-333',
    availableBalance: 356000,
    reason: '계좌정보 불일치'
  }
]

// 광고주 환불 요청 데이터
const advertiserRefunds = [
  {
    id: 1,
    company: '테크스타트업',
    campaignName: '스마트폰 신제품 런칭',
    amount: 500000,
    requestDate: '2025.01.15 10:30',
    status: 'pending',
    reason: '캠페인 조기 종료',
    spentAmount: 1200000,
    totalBudget: 2000000,
    refundType: 'partial'
  },
  {
    id: 2,
    company: '패션브랜드A',
    campaignName: '겨울 패션 컬렉션',
    amount: 300000,
    requestDate: '2025.01.14 15:20',
    status: 'pending',
    reason: '타겟팅 오류',
    spentAmount: 800000,
    totalBudget: 1500000,
    refundType: 'full'
  },
  {
    id: 3,
    company: '헬스케어',
    campaignName: '건강식품 할인',
    amount: 150000,
    requestDate: '2025.01.13 13:45',
    status: 'approved',
    reason: '광고 소재 승인 취소',
    spentAmount: 200000,
    totalBudget: 500000,
    refundType: 'partial'
  }
]

// 정산 분쟁 데이터
const settlementDisputes = [
  {
    id: 1,
    type: 'user_complaint',
    title: '수익 계산 오류 신고',
    complainant: '김민수',
    complainantType: 'user',
    amount: 25000,
    description: '1월 14일 캠페인 참여했는데 수익이 누락되었습니다.',
    relatedCampaign: '스마트폰 신제품 런칭',
    status: 'investigating',
    createdDate: '2025.01.15 16:20',
    priority: 'medium',
    evidence: ['스크린샷 2개', '참여 인증 1개']
  },
  {
    id: 2,
    type: 'advertiser_complaint',
    title: '부정 클릭 의심 신고',
    complainant: '테크스타트업',
    complainantType: 'advertiser',
    amount: 150000,
    description: '어제 클릭수가 비정상적으로 높게 측정되었습니다.',
    relatedCampaign: '스마트폰 신제품 런칭',
    status: 'pending',
    createdDate: '2025.01.15 09:30',
    priority: 'high',
    evidence: ['클릭 로그', '트래픽 분석']
  },
  {
    id: 3,
    type: 'user_complaint',
    title: '인출 지연 문의',
    complainant: '이소영',
    complainantType: 'user',
    amount: 85000,
    description: '인출 요청한지 3일이 지났는데 처리가 안됩니다.',
    relatedCampaign: '',
    status: 'resolved',
    createdDate: '2025.01.13 14:45',
    priority: 'low',
    evidence: ['인출 요청 내역']
  },
  {
    id: 4,
    type: 'platform_issue',
    title: '시스템 오류로 인한 손실',
    complainant: '박정호',
    complainantType: 'user',
    amount: 12000,
    description: '1월 12일 시스템 점검 중 참여한 캠페인 수익이 누락',
    relatedCampaign: '건강식품 할인',
    status: 'investigating',
    createdDate: '2025.01.14 11:20',
    priority: 'medium',
    evidence: ['시스템 로그', '참여 기록']
  }
]

// 정산 통계 데이터
const settlementStats = {
  pendingWithdrawals: 4,
  pendingRefunds: 2,
  totalWithdrawalAmount: 460000,
  totalRefundAmount: 950000,
  monthlyProcessed: 128,
  successRate: 94.2,
  disputes: 8
}

export function SettlementManagement() {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="text-yellow-600 bg-yellow-50">대기중</Badge>
      case 'approved':
        return <Badge variant="outline" className="text-green-600 border-green-600">승인완료</Badge>
      case 'rejected':
        return <Badge variant="outline" className="text-red-600 border-red-600">거절됨</Badge>
      case 'processing':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">처리중</Badge>
      default:
        return <Badge variant="secondary">알 수 없음</Badge>
    }
  }

  const getRefundTypeBadge = (type: string) => {
    switch (type) {
      case 'full':
        return <Badge variant="destructive" className="text-xs">전액환불</Badge>
      case 'partial':
        return <Badge variant="secondary" className="text-xs">부분환불</Badge>
      default:
        return <Badge variant="secondary" className="text-xs">기타</Badge>
    }
  }

  const getDisputePriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive" className="text-xs">긴급</Badge>
      case 'medium':
        return <Badge variant="secondary" className="text-xs text-yellow-600">보통</Badge>
      case 'low':
        return <Badge variant="outline" className="text-xs">낮음</Badge>
      default:
        return <Badge variant="secondary" className="text-xs">기타</Badge>
    }
  }

  const getDisputeStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="text-yellow-600">접수</Badge>
      case 'investigating':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">조사중</Badge>
      case 'resolved':
        return <Badge variant="outline" className="text-green-600 border-green-600">해결됨</Badge>
      case 'rejected':
        return <Badge variant="outline" className="text-red-600 border-red-600">기각</Badge>
      default:
        return <Badge variant="secondary">알 수 없음</Badge>
    }
  }

  const getComplainantTypeBadge = (type: string) => {
    switch (type) {
      case 'user':
        return <Badge variant="outline" className="text-blue-600 border-blue-600 text-xs">유저</Badge>
      case 'advertiser':
        return <Badge variant="outline" className="text-purple-600 border-purple-600 text-xs">광고주</Badge>
      default:
        return <Badge variant="secondary" className="text-xs">기타</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* 정산 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="대기중 인출"
          value={settlementStats.pendingWithdrawals.toString()}
          description={`총 ${formatCurrency(settlementStats.totalWithdrawalAmount)}`}
          icon={<TrendingDown className="w-4 h-4" />}
          badge={{ text: "처리필요", variant: "secondary" }}
        />
        <StatCard
          title="대기중 환불"
          value={settlementStats.pendingRefunds.toString()}
          description={`총 ${formatCurrency(settlementStats.totalRefundAmount)}`}
          icon={<TrendingUp className="w-4 h-4" />}
          badge={{ text: "검토필요", variant: "secondary" }}
        />
        <StatCard
          title="월간 처리건수"
          value={settlementStats.monthlyProcessed.toString()}
          description="이번 달 총 처리"
          icon={<CreditCard className="w-4 h-4" />}
          badge={{ text: "완료", variant: "outline" }}
        />
        <StatCard
          title="정산 분쟁"
          value={settlementStats.disputes.toString()}
          description="처리 필요한 분쟁"
          icon={<AlertTriangle className="w-4 h-4" />}
          badge={{ text: "긴급", variant: "destructive" }}
        />
        <StatCard
          title="처리 성공률"
          value={`${settlementStats.successRate}%`}
          description="평균 승인률"
          change={{ value: "+2.3%", trend: "up" }}
          icon={<Check className="w-4 h-4" />}
          badge={{ text: "양호", variant: "outline" }}
        />
      </div>

      {/* 정산 관리 탭 */}
      <Tabs defaultValue="withdrawals" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="withdrawals">유저 인출 요청</TabsTrigger>
          <TabsTrigger value="refunds">광고주 환불 요청</TabsTrigger>
          <TabsTrigger value="disputes">정산 분쟁</TabsTrigger>
          <TabsTrigger value="history">정산 내역</TabsTrigger>
        </TabsList>

        {/* 유저 인출 요청 */}
        <TabsContent value="withdrawals">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  유저 인출 요청
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{userWithdrawals.filter(w => w.status === 'pending').length}건 대기</Badge>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-1" />
                    엑셀 다운로드
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>유저 정보</TableHead>
                    <TableHead>인출 금액</TableHead>
                    <TableHead>계좌 정보</TableHead>
                    <TableHead>잔고</TableHead>
                    <TableHead>요청일시</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userWithdrawals.map((withdrawal) => (
                    <TableRow key={withdrawal.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback>{withdrawal.userName[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{withdrawal.userName}</div>
                            <div className="text-xs text-muted-foreground">{withdrawal.userLevel}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{formatCurrency(withdrawal.amount)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{withdrawal.bankAccount}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{formatCurrency(withdrawal.availableBalance)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">{withdrawal.requestDate}</div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(withdrawal.status)}
                        {withdrawal.reason && (
                          <div className="text-xs text-red-600 mt-1">{withdrawal.reason}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {withdrawal.status === 'pending' ? (
                          <div className="flex items-center gap-1">
                            <Button variant="outline" size="sm">
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button variant="outline" size="sm" className="text-green-600 border-green-600">
                              <Check className="w-3 h-3" />
                            </Button>
                            <Button variant="outline" size="sm" className="text-red-600 border-red-600">
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button variant="outline" size="sm">
                            <Eye className="w-3 h-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 광고주 환불 요청 */}
        <TabsContent value="refunds">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  광고주 환불 요청
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{advertiserRefunds.filter(r => r.status === 'pending').length}건 대기</Badge>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-1" />
                    엑셀 다운로드
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>광고주</TableHead>
                    <TableHead>캠페인</TableHead>
                    <TableHead>환불 금액</TableHead>
                    <TableHead>환불 사유</TableHead>
                    <TableHead>예산 현황</TableHead>
                    <TableHead>요청일시</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {advertiserRefunds.map((refund) => (
                    <TableRow key={refund.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback>
                              <Building2 className="w-4 h-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="font-medium">{refund.company}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{refund.campaignName}</div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{formatCurrency(refund.amount)}</div>
                          {getRefundTypeBadge(refund.refundType)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{refund.reason}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>사용: {formatCurrency(refund.spentAmount)}</div>
                          <div>총예산: {formatCurrency(refund.totalBudget)}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">{refund.requestDate}</div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(refund.status)}
                      </TableCell>
                      <TableCell>
                        {refund.status === 'pending' ? (
                          <div className="flex items-center gap-1">
                            <Button variant="outline" size="sm">
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button variant="outline" size="sm" className="text-green-600 border-green-600">
                              <Check className="w-3 h-3" />
                            </Button>
                            <Button variant="outline" size="sm" className="text-red-600 border-red-600">
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button variant="outline" size="sm">
                            <Eye className="w-3 h-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 정산 분쟁 */}
        <TabsContent value="disputes">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  정산 분쟁 관리
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{settlementDisputes.filter(d => d.status === 'pending' || d.status === 'investigating').length}건 처리중</Badge>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-1" />
                    분쟁 리포트
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>분쟁 정보</TableHead>
                    <TableHead>신고자</TableHead>
                    <TableHead>관련 금액</TableHead>
                    <TableHead>관련 캠페인</TableHead>
                    <TableHead>우선순위</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>접수일시</TableHead>
                    <TableHead>액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settlementDisputes.map((dispute) => (
                    <TableRow key={dispute.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium mb-1">{dispute.title}</div>
                          <div className="text-sm text-muted-foreground line-clamp-2">
                            {dispute.description}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <FileText className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              증거자료 {dispute.evidence.length}개
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6">
                            <AvatarFallback>
                              {dispute.complainantType === 'user' ? (
                                <User className="w-3 h-3" />
                              ) : (
                                <Building2 className="w-3 h-3" />
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-sm">{dispute.complainant}</div>
                            {getComplainantTypeBadge(dispute.complainantType)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{formatCurrency(dispute.amount)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {dispute.relatedCampaign || '해당없음'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getDisputePriorityBadge(dispute.priority)}
                      </TableCell>
                      <TableCell>
                        {getDisputeStatusBadge(dispute.status)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">{dispute.createdDate}</div>
                      </TableCell>
                      <TableCell>
                        {dispute.status === 'pending' || dispute.status === 'investigating' ? (
                          <div className="flex items-center gap-1">
                            <Button variant="outline" size="sm">
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <MessageSquare className="w-3 h-3" />
                            </Button>
                            <Button variant="outline" size="sm" className="text-green-600 border-green-600">
                              <Check className="w-3 h-3" />
                            </Button>
                            <Button variant="outline" size="sm" className="text-red-600 border-red-600">
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button variant="outline" size="sm">
                            <Eye className="w-3 h-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-3 border rounded-lg bg-red-50">
                  <div className="text-lg font-bold text-red-600">
                    {settlementDisputes.filter(d => d.priority === 'high').length}
                  </div>
                  <div className="text-xs text-red-600">긴급 분쟁</div>
                </div>
                <div className="text-center p-3 border rounded-lg bg-blue-50">
                  <div className="text-lg font-bold text-blue-600">
                    {settlementDisputes.filter(d => d.status === 'investigating').length}
                  </div>
                  <div className="text-xs text-blue-600">조사중</div>
                </div>
                <div className="text-center p-3 border rounded-lg bg-green-50">
                  <div className="text-lg font-bold text-green-600">
                    {settlementDisputes.filter(d => d.status === 'resolved').length}
                  </div>
                  <div className="text-xs text-green-600">해결완료</div>
                </div>
                <div className="text-center p-3 border rounded-lg bg-gray-50">
                  <div className="text-lg font-bold text-gray-600">
                    {(settlementDisputes.filter(d => d.status === 'resolved').length / settlementDisputes.length * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-600">해결률</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 정산 내역 */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  정산 처리 내역
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">오늘</Button>
                  <Button variant="outline" size="sm">이번 주</Button>
                  <Button variant="outline" size="sm">이번 달</Button>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-1" />
                    전체 다운로드
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">156</div>
                  <div className="text-sm text-muted-foreground">승인된 인출</div>
                  <div className="text-xs text-muted-foreground mt-1">₩48,200,000</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">23</div>
                  <div className="text-sm text-muted-foreground">승인된 환불</div>
                  <div className="text-xs text-muted-foreground mt-1">₩12,800,000</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-red-600">8</div>
                  <div className="text-sm text-muted-foreground">거절된 요청</div>
                  <div className="text-xs text-muted-foreground mt-1">₩3,400,000</div>
                </div>
              </div>
              
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>상세 내역 테이블은 개발 중입니다.</p>
                <p className="text-sm">실제 구현시 페이지네이션과 필터링 기능이 포함됩니다.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}