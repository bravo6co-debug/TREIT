import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Progress } from './ui/progress'
import { 
  Shield, 
  AlertTriangle, 
  Ban, 
  Eye, 
  Search, 
  Filter,
  Users,
  MousePointer,
  Clock,
  Activity,
  Zap,
  CheckCircle,
  X,
  TrendingUp,
  BarChart3,
  Target,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown
} from 'lucide-react'

// 어뷰징 패턴 데이터 시뮬레이션
interface FraudAlert {
  id: string
  type: 'click_farming' | 'multiple_accounts' | 'bot_activity' | 'vpn_usage' | 'unusual_pattern'
  severity: 'high' | 'medium' | 'low'
  userId?: number
  userName?: string
  description: string
  detectedAt: Date
  status: 'active' | 'investigating' | 'resolved' | 'false_positive'
  confidence: number // 0-100%
  affectedCampaigns?: string[]
  ipAddress?: string
  deviceFingerprint?: string
  clickCount?: number
  timeWindow?: string
}

interface FraudStats {
  totalAlerts: number
  activeAlerts: number
  resolvedAlerts: number
  falsePositives: number
  blockedUsers: number
  preventedLoss: number
  detectionAccuracy: number
}

// 실시간 어뷰징 데이터 생성
const generateFraudAlerts = (): FraudAlert[] => {
  const types = ['click_farming', 'multiple_accounts', 'bot_activity', 'vpn_usage', 'unusual_pattern']
  const severities = ['high', 'medium', 'low']
  const statuses = ['active', 'investigating', 'resolved', 'false_positive']
  
  return Array.from({ length: 50 }, (_, i) => ({
    id: `fraud-${i + 1}`,
    type: types[Math.floor(Math.random() * types.length)] as any,
    severity: severities[Math.floor(Math.random() * severities.length)] as any,
    userId: Math.random() > 0.3 ? Math.floor(Math.random() * 1000) + 1 : undefined,
    userName: Math.random() > 0.3 ? `사용자${Math.floor(Math.random() * 1000) + 1}` : undefined,
    description: getFraudDescription(types[Math.floor(Math.random() * types.length)]),
    detectedAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
    status: statuses[Math.floor(Math.random() * statuses.length)] as any,
    confidence: Math.floor(Math.random() * 40) + 60, // 60-100%
    affectedCampaigns: Math.random() > 0.5 ? [`캠페인 ${Math.floor(Math.random() * 100) + 1}`] : undefined,
    ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    deviceFingerprint: `device_${Math.random().toString(36).substr(2, 9)}`,
    clickCount: Math.floor(Math.random() * 1000) + 100,
    timeWindow: '24시간'
  }))
}

function getFraudDescription(type: string): string {
  switch (type) {
    case 'click_farming':
      return '비정상적인 클릭 패턴이 감지되었습니다. 자동화된 클릭으로 의심됩니다.'
    case 'multiple_accounts':
      return '동일한 디바이스에서 여러 계정으로 접속이 감지되었습니다.'
    case 'bot_activity':
      return '봇 활동으로 의심되는 패턴이 발견되었습니다.'
    case 'vpn_usage':
      return 'VPN 또는 프록시 사용이 감지되었습니다.'
    case 'unusual_pattern':
      return '일반적이지 않은 사용자 행동 패턴이 감지되었습니다.'
    default:
      return '의심스러운 활동이 감지되었습니다.'
  }
}

const generateFraudStats = (): FraudStats => ({
  totalAlerts: 247,
  activeAlerts: 23,
  resolvedAlerts: 189,
  falsePositives: 35,
  blockedUsers: 45,
  preventedLoss: 15400000, // 15.4M KRW
  detectionAccuracy: 91.8
})

export function FraudDetection() {
  const [fraudAlerts] = useState<FraudAlert[]>(generateFraudAlerts())
  const [fraudStats] = useState<FraudStats>(generateFraudStats())
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState('detectedAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const itemsPerPage = 20

  // 필터링 및 검색
  const filteredAlerts = fraudAlerts.filter(alert => {
    const matchesSearch = alert.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (alert.userName && alert.userName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (alert.ipAddress && alert.ipAddress.includes(searchTerm))
    const matchesType = typeFilter === 'all' || alert.type === typeFilter
    const matchesSeverity = severityFilter === 'all' || alert.severity === severityFilter
    const matchesStatus = statusFilter === 'all' || alert.status === statusFilter
    
    return matchesSearch && matchesType && matchesSeverity && matchesStatus
  })

  // 정렬
  const sortedAlerts = [...filteredAlerts].sort((a, b) => {
    let aValue: any = a[sortBy as keyof FraudAlert]
    let bValue: any = b[sortBy as keyof FraudAlert]
    
    if (sortBy === 'detectedAt') {
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
  const totalPages = Math.ceil(sortedAlerts.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const currentAlerts = sortedAlerts.slice(startIndex, startIndex + itemsPerPage)

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'click_farming': return '클릭 파밍'
      case 'multiple_accounts': return '다중 계정'
      case 'bot_activity': return '봇 활동'
      case 'vpn_usage': return 'VPN 사용'
      case 'unusual_pattern': return '이상 패턴'
      default: return '알 수 없음'
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="destructive">활성</Badge>
      case 'investigating':
        return <Badge variant="secondary" className="text-yellow-600">조사중</Badge>
      case 'resolved':
        return <Badge variant="outline" className="text-green-600 border-green-600">해결됨</Badge>
      case 'false_positive':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">오탐</Badge>
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

  const handleAlertAction = (alertId: string, action: 'investigate' | 'resolve' | 'mark_false_positive' | 'block_user') => {
    // 실제 API 호출 시뮬레이션
    console.log(`Action ${action} on alert ${alertId}`)
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">어뷰징 감지 시스템</h1>
          <p className="text-sm text-muted-foreground">
            실시간 사기 패턴 감지 및 대응 관리
          </p>
        </div>
      </div>

      {/* 통계 개요 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">활성 경고</p>
                <p className="text-3xl font-bold text-red-600">{fraudStats.activeAlerts}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">총 경고</p>
                <p className="text-3xl font-bold">{fraudStats.totalAlerts}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">해결됨</p>
                <p className="text-3xl font-bold text-green-600">{fraudStats.resolvedAlerts}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">차단 사용자</p>
                <p className="text-3xl font-bold text-purple-600">{fraudStats.blockedUsers}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Ban className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="alerts" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="alerts">경고 목록</TabsTrigger>
          <TabsTrigger value="patterns">패턴 분석</TabsTrigger>
          <TabsTrigger value="blocked">차단 관리</TabsTrigger>
          <TabsTrigger value="settings">감지 설정</TabsTrigger>
        </TabsList>

        {/* 경고 목록 탭 */}
        <TabsContent value="alerts" className="space-y-6">
          {/* 검색 및 필터 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                경고 검색 및 필터
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="사용자명, IP, 설명 검색..."
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
                    <SelectValue placeholder="유형 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 유형</SelectItem>
                    <SelectItem value="click_farming">클릭 파밍</SelectItem>
                    <SelectItem value="multiple_accounts">다중 계정</SelectItem>
                    <SelectItem value="bot_activity">봇 활동</SelectItem>
                    <SelectItem value="vpn_usage">VPN 사용</SelectItem>
                    <SelectItem value="unusual_pattern">이상 패턴</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={severityFilter} onValueChange={(value) => {
                  setSeverityFilter(value)
                  setCurrentPage(1)
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="심각도 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 심각도</SelectItem>
                    <SelectItem value="high">높음</SelectItem>
                    <SelectItem value="medium">중간</SelectItem>
                    <SelectItem value="low">낮음</SelectItem>
                  </SelectContent>
                </Select>
                
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
                    <SelectItem value="investigating">조사중</SelectItem>
                    <SelectItem value="resolved">해결됨</SelectItem>
                    <SelectItem value="false_positive">오탐</SelectItem>
                  </SelectContent>
                </Select>

                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm('')
                    setTypeFilter('all')
                    setSeverityFilter('all')
                    setStatusFilter('all')
                    setCurrentPage(1)
                  }}
                >
                  초기화
                </Button>
              </div>
              
              <div className="mt-4 text-sm text-muted-foreground">
                총 {fraudAlerts.length}개 중 {filteredAlerts.length}개 표시
              </div>
            </CardContent>
          </Card>

          {/* 경고 목록 테이블 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>어뷰징 경고 목록</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredAlerts.length)} / {filteredAlerts.length}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => handleSort('detectedAt')} className="p-0 h-auto font-semibold">
                        감지 시간 <ArrowUpDown className="w-3 h-3 ml-1" />
                      </Button>
                    </TableHead>
                    <TableHead>유형</TableHead>
                    <TableHead>심각도</TableHead>
                    <TableHead>사용자</TableHead>
                    <TableHead>설명</TableHead>
                    <TableHead>신뢰도</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentAlerts.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell className="text-sm">
                        {alert.detectedAt.toLocaleString('ko-KR')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getTypeLabel(alert.type)}</Badge>
                      </TableCell>
                      <TableCell>
                        {getSeverityBadge(alert.severity)}
                      </TableCell>
                      <TableCell>
                        {alert.userName ? (
                          <div>
                            <div className="font-medium">{alert.userName}</div>
                            <div className="text-xs text-muted-foreground">ID: {alert.userId}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="text-sm">{alert.description}</div>
                        {alert.ipAddress && (
                          <div className="text-xs text-muted-foreground mt-1">
                            IP: {alert.ipAddress}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${alert.confidence >= 80 ? 'bg-red-500' : alert.confidence >= 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                              style={{ width: `${alert.confidence}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium">{alert.confidence}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(alert.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="sm">
                            <Eye className="w-3 h-3" />
                          </Button>
                          {alert.status === 'active' && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleAlertAction(alert.id, 'investigate')}
                                className="text-yellow-600 hover:text-yellow-700"
                              >
                                <Activity className="w-3 h-3" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleAlertAction(alert.id, 'resolve')}
                                className="text-green-600 hover:text-green-700"
                              >
                                <CheckCircle className="w-3 h-3" />
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
                  페이지 {currentPage} / {totalPages} (총 {filteredAlerts.length}개)
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

        {/* 패턴 분석 탭 */}
        <TabsContent value="patterns" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  어뷰징 유형별 분포
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { type: 'click_farming', count: 45, percentage: 35 },
                  { type: 'bot_activity', count: 32, percentage: 25 },
                  { type: 'multiple_accounts', count: 28, percentage: 22 },
                  { type: 'vpn_usage', count: 15, percentage: 12 },
                  { type: 'unusual_pattern', count: 8, percentage: 6 }
                ].map(item => (
                  <div key={item.type} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{getTypeLabel(item.type)}</span>
                      <span>{item.count}건 ({item.percentage}%)</span>
                    </div>
                    <Progress value={item.percentage} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  시간대별 감지 현황
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  {[
                    { time: '00-06', count: 8 },
                    { time: '06-12', count: 15 },
                    { time: '12-18', count: 32 },
                    { time: '18-24', count: 28 }
                  ].map(item => (
                    <div key={item.time} className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-lg font-bold">{item.count}</div>
                      <div className="text-muted-foreground">{item.time}시</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                성과 지표
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{fraudStats.detectionAccuracy}%</div>
                  <div className="text-sm text-muted-foreground">탐지 정확도</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">₩{(fraudStats.preventedLoss / 1000000).toFixed(1)}M</div>
                  <div className="text-sm text-muted-foreground">예방한 손실</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{Math.round(fraudStats.preventedLoss / fraudStats.blockedUsers / 10000)}만원</div>
                  <div className="text-sm text-muted-foreground">사용자당 평균 손실 예방</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 차단 관리 탭 */}
        <TabsContent value="blocked" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>차단된 사용자 목록</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                차단된 사용자 관리 기능은 개발 중입니다.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 감지 설정 탭 */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>어뷰징 감지 설정</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Alert>
                  <Zap className="h-4 w-4" />
                  <AlertTitle>실시간 감지 활성화</AlertTitle>
                  <AlertDescription>
                    현재 모든 어뷰징 감지 시스템이 활성화되어 실시간으로 모니터링 중입니다.
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-medium">감지 임계값 설정</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">클릭 파밍 민감도</span>
                        <Badge variant="outline">높음</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">봇 활동 감지</span>
                        <Badge variant="outline">중간</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">다중 계정 감지</span>
                        <Badge variant="outline">높음</Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="font-medium">자동 대응 설정</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">자동 계정 정지</span>
                        <Badge variant="destructive">활성</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">자동 알림 발송</span>
                        <Badge variant="destructive">활성</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">IP 차단</span>
                        <Badge variant="secondary">비활성</Badge>
                      </div>
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