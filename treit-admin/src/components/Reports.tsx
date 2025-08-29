import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Calendar } from './ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Progress } from './ui/progress'
import { 
  FileText, 
  Download, 
  Calendar as CalendarIcon, 
  Filter,
  BarChart3,
  PieChart,
  TrendingUp,
  Users,
  MousePointer,
  DollarSign,
  Target,
  Building2,
  Clock,
  CheckCircle,
  AlertTriangle,
  Eye,
  Settings,
  RefreshCw,
  FileSpreadsheet,
  FileImage,
  Printer
} from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

// 리포트 데이터 타입 정의
interface ReportTemplate {
  id: string
  name: string
  description: string
  category: 'users' | 'campaigns' | 'financial' | 'system' | 'custom'
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom'
  status: 'active' | 'inactive'
  lastGenerated?: Date
  nextGeneration?: Date
}

interface ReportHistory {
  id: string
  templateId: string
  templateName: string
  generatedAt: Date
  period: string
  format: 'pdf' | 'excel' | 'csv'
  size: string
  status: 'completed' | 'processing' | 'failed'
  downloadUrl?: string
}

interface ReportData {
  totalUsers: number
  newUsers: number
  activeUsers: number
  totalCampaigns: number
  activeCampaigns: number
  completedCampaigns: number
  totalRevenue: number
  platformCommission: number
  avgCTR: number
  topPerformingCampaigns: Array<{
    id: number
    name: string
    ctr: number
    revenue: number
  }>
}

// 리포트 템플릿 데이터 생성
const generateReportTemplates = (): ReportTemplate[] => [
  {
    id: 'daily-summary',
    name: '일간 요약 리포트',
    description: '일일 주요 지표 및 활동 요약',
    category: 'custom',
    frequency: 'daily',
    status: 'active',
    lastGenerated: new Date(Date.now() - 24 * 60 * 60 * 1000),
    nextGeneration: new Date(Date.now() + 24 * 60 * 60 * 1000)
  },
  {
    id: 'user-analytics',
    name: '사용자 분석 리포트',
    description: '사용자 활동, 가입, 이탈 분석',
    category: 'users',
    frequency: 'weekly',
    status: 'active',
    lastGenerated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    nextGeneration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  },
  {
    id: 'campaign-performance',
    name: '캠페인 성과 리포트',
    description: '캠페인별 성과 분석 및 ROI 계산',
    category: 'campaigns',
    frequency: 'monthly',
    status: 'active',
    lastGenerated: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    nextGeneration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  },
  {
    id: 'financial-summary',
    name: '재무 요약 리포트',
    description: '수익, 지출, 수수료 분석',
    category: 'financial',
    frequency: 'monthly',
    status: 'active',
    lastGenerated: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    nextGeneration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  },
  {
    id: 'system-health',
    name: '시스템 상태 리포트',
    description: '시스템 성능, 가동시간, 오류 분석',
    category: 'system',
    frequency: 'weekly',
    status: 'active',
    lastGenerated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    nextGeneration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  },
  {
    id: 'fraud-detection',
    name: '어뷰징 감지 리포트',
    description: '어뷰징 패턴 및 대응 현황',
    category: 'system',
    frequency: 'weekly',
    status: 'active',
    lastGenerated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    nextGeneration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  }
]

// 리포트 히스토리 데이터 생성
const generateReportHistory = (): ReportHistory[] => {
  const formats = ['pdf', 'excel', 'csv'] as const
  const statuses = ['completed', 'processing', 'failed'] as const
  const templates = generateReportTemplates()
  
  return Array.from({ length: 50 }, (_, i) => {
    const template = templates[Math.floor(Math.random() * templates.length)]
    return {
      id: `report-${i + 1}`,
      templateId: template.id,
      templateName: template.name,
      generatedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      period: `2024-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}`,
      format: formats[Math.floor(Math.random() * formats.length)],
      size: `${(Math.random() * 10 + 0.5).toFixed(1)}MB`,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      downloadUrl: Math.random() > 0.3 ? `/downloads/report-${i + 1}` : undefined
    }
  })
}

// 리포트 데이터 생성
const generateReportData = (): ReportData => ({
  totalUsers: 12847,
  newUsers: 324,
  activeUsers: 8934,
  totalCampaigns: 3247,
  activeCampaigns: 89,
  completedCampaigns: 2834,
  totalRevenue: 1240000000,
  platformCommission: 45200000,
  avgCTR: 2.34,
  topPerformingCampaigns: [
    { id: 1, name: '스마트폰 런칭 캠페인', ctr: 4.2, revenue: 15400000 },
    { id: 2, name: '패션 컬렉션 프로모션', ctr: 3.8, revenue: 12800000 },
    { id: 3, name: '뷰티 제품 체험', ctr: 3.5, revenue: 11200000 },
    { id: 4, name: '건강식품 리뷰', ctr: 3.2, revenue: 9800000 },
    { id: 5, name: '교육앱 가입', ctr: 2.9, revenue: 8600000 }
  ]
})

export function Reports() {
  const [reportTemplates] = useState<ReportTemplate[]>(generateReportTemplates())
  const [reportHistory] = useState<ReportHistory[]>(generateReportHistory())
  const [reportData] = useState<ReportData>(generateReportData())
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedFrequency, setSelectedFrequency] = useState('all')
  const [selectedPeriod, setSelectedPeriod] = useState('last-30-days')
  const [dateFrom, setDateFrom] = useState<Date>()
  const [dateTo, setDateTo] = useState<Date>()
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState('pdf')

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'users': return <Users className="w-4 h-4" />
      case 'campaigns': return <Target className="w-4 h-4" />
      case 'financial': return <DollarSign className="w-4 h-4" />
      case 'system': return <BarChart3 className="w-4 h-4" />
      default: return <FileText className="w-4 h-4" />
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'users': return '사용자'
      case 'campaigns': return '캠페인'
      case 'financial': return '재무'
      case 'system': return '시스템'
      case 'custom': return '맞춤'
      default: return '기타'
    }
  }

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'daily': return '일간'
      case 'weekly': return '주간'
      case 'monthly': return '월간'
      case 'quarterly': return '분기'
      case 'yearly': return '연간'
      case 'custom': return '맞춤'
      default: return '기타'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="outline" className="text-green-600 border-green-600">활성</Badge>
      case 'inactive':
        return <Badge variant="secondary">비활성</Badge>
      case 'completed':
        return <Badge variant="outline" className="text-green-600 border-green-600">완료</Badge>
      case 'processing':
        return <Badge variant="secondary" className="text-blue-600">처리중</Badge>
      case 'failed':
        return <Badge variant="destructive">실패</Badge>
      default:
        return <Badge variant="secondary">알 수 없음</Badge>
    }
  }

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'pdf': return <FileText className="w-4 h-4" />
      case 'excel': return <FileSpreadsheet className="w-4 h-4" />
      case 'csv': return <FileSpreadsheet className="w-4 h-4" />
      default: return <FileText className="w-4 h-4" />
    }
  }

  const handleGenerateReport = async (templateId: string) => {
    setIsGenerating(true)
    // API 호출 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsGenerating(false)
    // 성공 알림 표시
    console.log(`Generating report for template: ${templateId}`)
  }

  const handleDownloadReport = (reportId: string) => {
    console.log(`Downloading report: ${reportId}`)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount)
  }

  const filteredTemplates = reportTemplates.filter(template => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory
    const matchesFrequency = selectedFrequency === 'all' || template.frequency === selectedFrequency
    return matchesCategory && matchesFrequency
  })

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">리포트 관리</h1>
          <p className="text-sm text-muted-foreground">
            다양한 분석 리포트 생성 및 관리
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            설정
          </Button>
          <Button>
            <FileText className="w-4 h-4 mr-2" />
            새 리포트
          </Button>
        </div>
      </div>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="templates">리포트 템플릿</TabsTrigger>
          <TabsTrigger value="generate">리포트 생성</TabsTrigger>
          <TabsTrigger value="history">생성 이력</TabsTrigger>
          <TabsTrigger value="analytics">분석 대시보드</TabsTrigger>
        </TabsList>

        {/* 리포트 템플릿 탭 */}
        <TabsContent value="templates" className="space-y-6">
          {/* 필터 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                템플릿 필터
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="카테고리 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 카테고리</SelectItem>
                    <SelectItem value="users">사용자</SelectItem>
                    <SelectItem value="campaigns">캠페인</SelectItem>
                    <SelectItem value="financial">재무</SelectItem>
                    <SelectItem value="system">시스템</SelectItem>
                    <SelectItem value="custom">맞춤</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedFrequency} onValueChange={setSelectedFrequency}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="주기 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 주기</SelectItem>
                    <SelectItem value="daily">일간</SelectItem>
                    <SelectItem value="weekly">주간</SelectItem>
                    <SelectItem value="monthly">월간</SelectItem>
                    <SelectItem value="quarterly">분기</SelectItem>
                    <SelectItem value="yearly">연간</SelectItem>
                  </SelectContent>
                </Select>

                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSelectedCategory('all')
                    setSelectedFrequency('all')
                  }}
                >
                  초기화
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 템플릿 목록 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(template.category)}
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                    </div>
                    {getStatusBadge(template.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">카테고리:</span>
                      <Badge variant="outline">{getCategoryLabel(template.category)}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">주기:</span>
                      <Badge variant="secondary">{getFrequencyLabel(template.frequency)}</Badge>
                    </div>
                    {template.lastGenerated && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">마지막 생성:</span>
                        <span>{format(template.lastGenerated, 'yyyy-MM-dd', { locale: ko })}</span>
                      </div>
                    )}
                    {template.nextGeneration && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">다음 생성:</span>
                        <span>{format(template.nextGeneration, 'yyyy-MM-dd', { locale: ko })}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      className="flex-1" 
                      onClick={() => handleGenerateReport(template.id)}
                      disabled={isGenerating}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      생성
                    </Button>
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 리포트 생성 탭 */}
        <TabsContent value="generate" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  리포트 설정
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">리포트 템플릿</label>
                  <Select defaultValue="daily-summary">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {reportTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">기간 선택</label>
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="last-7-days">최근 7일</SelectItem>
                      <SelectItem value="last-30-days">최근 30일</SelectItem>
                      <SelectItem value="last-90-days">최근 90일</SelectItem>
                      <SelectItem value="this-month">이번 달</SelectItem>
                      <SelectItem value="last-month">지난 달</SelectItem>
                      <SelectItem value="custom">사용자 지정</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedPeriod === 'custom' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">시작일</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateFrom ? format(dateFrom, 'yyyy-MM-dd', { locale: ko }) : '날짜 선택'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={dateFrom}
                            onSelect={setDateFrom}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">종료일</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateTo ? format(dateTo, 'yyyy-MM-dd', { locale: ko }) : '날짜 선택'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={dateTo}
                            onSelect={setDateTo}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">출력 형식</label>
                  <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="excel">Excel (XLSX)</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  className="w-full" 
                  disabled={isGenerating}
                  onClick={() => handleGenerateReport('custom')}
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      생성 중...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      리포트 생성
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>리포트 미리보기</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{reportData.totalUsers.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">총 사용자</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{reportData.activeCampaigns}</div>
                    <div className="text-sm text-muted-foreground">활성 캠페인</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{formatCurrency(reportData.totalRevenue)}</div>
                    <div className="text-sm text-muted-foreground">총 수익</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{reportData.avgCTR}%</div>
                    <div className="text-sm text-muted-foreground">평균 CTR</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-sm">상위 성과 캠페인</h4>
                  {reportData.topPerformingCampaigns.slice(0, 3).map((campaign, index) => (
                    <div key={campaign.id} className="flex items-center justify-between p-2 rounded border">
                      <div>
                        <div className="text-sm font-medium">{campaign.name}</div>
                        <div className="text-xs text-muted-foreground">CTR: {campaign.ctr}%</div>
                      </div>
                      <div className="text-sm font-medium text-green-600">
                        {formatCurrency(campaign.revenue)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 생성 이력 탭 */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>리포트 생성 이력</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportHistory.slice(0, 10).map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-muted rounded-lg">
                        {getFormatIcon(report.format)}
                      </div>
                      <div>
                        <h4 className="font-medium">{report.templateName}</h4>
                        <div className="text-sm text-muted-foreground">
                          {format(report.generatedAt, 'yyyy-MM-dd HH:mm', { locale: ko })} • {report.period} • {report.size}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{report.format.toUpperCase()}</Badge>
                      {getStatusBadge(report.status)}
                      {report.downloadUrl && report.status === 'completed' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDownloadReport(report.id)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 분석 대시보드 탭 */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">생성된 리포트</p>
                    <p className="font-bold">{reportHistory.filter(r => r.status === 'completed').length}</p>
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
                    <p className="text-sm text-muted-foreground">성공률</p>
                    <p className="font-bold">94.2%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Clock className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">평균 생성 시간</p>
                    <p className="font-bold">2.3분</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Download className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">다운로드</p>
                    <p className="font-bold">1,247회</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  리포트 유형별 생성 현황
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { name: '일간 요약', count: 45, percentage: 35 },
                  { name: '사용자 분석', count: 28, percentage: 22 },
                  { name: '캠페인 성과', count: 24, percentage: 19 },
                  { name: '재무 요약', count: 18, percentage: 14 },
                  { name: '시스템 상태', count: 13, percentage: 10 }
                ].map(item => (
                  <div key={item.name} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{item.name}</span>
                      <span>{item.count}개 ({item.percentage}%)</span>
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
                  월별 리포트 생성 추이
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  {[
                    { month: '11월', count: 89 },
                    { month: '12월', count: 127 },
                    { month: '1월', count: 156 }
                  ].map(item => (
                    <div key={item.month} className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-lg font-bold">{item.count}</div>
                      <div className="text-muted-foreground">{item.month}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}