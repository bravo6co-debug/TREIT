import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from './ui/chart'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog'
import { 
  ArrowLeft, Calendar, Target, TrendingUp, DollarSign, Users, Clock, MapPin, 
  Smartphone, Monitor, Tablet, Edit, Pause, Play, StopCircle, AlertTriangle,
  Eye, RefreshCw, Crown, Star, TrendingDown, Activity, BarChart3
} from 'lucide-react'
import { format, eachDayOfInterval, parseISO, subDays, isToday, startOfDay, endOfDay } from 'date-fns'
import { ko } from 'date-fns/locale'
import { supabase, realtime } from '../lib/supabase'
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
  costPerClick?: number
  templates?: Template[]
}

interface Template {
  id: string
  name: string
  clicks: number
  conversions: number
  revenue: number
}

interface UserPerformance {
  id: string
  name: string
  avatar?: string
  clicks: number
  conversions: number
  revenue: number
  rank: number
}

interface ClickAnalytics {
  hourlyData: { hour: string; clicks: number; conversions: number }[]
  regionData: { region: string; clicks: number; percentage: number }[]
  deviceData: { device: string; clicks: number; percentage: number }[]
  dailyData: { date: string; clicks: number; impressions: number; ctr: number }[]
}

interface CampaignDetailsProps {
  campaign: Campaign | null
  onBack: () => void
}

export function CampaignDetails({ campaign, onBack }: CampaignDetailsProps) {
  const [realTimeClicks, setRealTimeClicks] = useState(0)
  const [analytics, setAnalytics] = useState<ClickAnalytics>({
    hourlyData: [],
    regionData: [],
    deviceData: [],
    dailyData: []
  })
  const [templates, setTemplates] = useState<Template[]>([])
  const [topPerformers, setTopPerformers] = useState<UserPerformance[]>([])
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    name: campaign?.name || '',
    description: campaign?.description || '',
    budget: campaign?.budget || 0,
    targetAudience: campaign?.targetAudience || ''
  })
  const [isLoading, setIsLoading] = useState(false)

  if (!campaign) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">캠페인 정보를 찾을 수 없습니다.</p>
      </div>
    )
  }

  const completedClicks = campaign.totalClicks - campaign.remainingClicks + realTimeClicks
  const clickProgress = (completedClicks / campaign.totalClicks) * 100
  const budgetProgress = (campaign.spent / campaign.budget) * 100
  const averageCPC = campaign.spent / Math.max(completedClicks, 1)
  const remainingBudget = campaign.budget - campaign.spent
  const estimatedCompletionDays = remainingBudget > 0 ? Math.ceil(campaign.remainingClicks / Math.max(completedClicks / 30, 1)) : 0

  // 실시간 데이터 로딩
  const loadCampaignAnalytics = useCallback(async () => {
    if (!campaign) return
    
    setIsLoading(true)
    try {
      // 일자별 클릭 데이터
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const date = subDays(new Date(), 29 - i)
        return {
          date: format(date, 'MM/dd', { locale: ko }),
          fullDate: format(date, 'yyyy-MM-dd'),
          clicks: Math.floor(Math.random() * 100) + 50 + (isToday(date) ? realTimeClicks : 0),
          impressions: Math.floor(Math.random() * 1000) + 500,
          ctr: 0
        }
      })
      
      last30Days.forEach(day => {
        day.ctr = (day.clicks / day.impressions) * 100
      })

      // 시간대별 데이터
      const hourlyData = Array.from({ length: 24 }, (_, i) => ({
        hour: `${i}시`,
        clicks: Math.floor(Math.random() * 20) + 5,
        conversions: Math.floor(Math.random() * 10) + 2
      }))

      // 지역별 데이터
      const regions = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '기타']
      const regionData = regions.map(region => {
        const clicks = Math.floor(Math.random() * 100) + 20
        return {
          region,
          clicks,
          percentage: 0
        }
      })
      const totalRegionClicks = regionData.reduce((sum, item) => sum + item.clicks, 0)
      regionData.forEach(item => {
        item.percentage = (item.clicks / totalRegionClicks) * 100
      })

      // 디바이스별 데이터
      const deviceData = [
        { device: 'Mobile', clicks: Math.floor(Math.random() * 200) + 100, percentage: 0 },
        { device: 'Desktop', clicks: Math.floor(Math.random() * 150) + 50, percentage: 0 },
        { device: 'Tablet', clicks: Math.floor(Math.random() * 50) + 10, percentage: 0 }
      ]
      const totalDeviceClicks = deviceData.reduce((sum, item) => sum + item.clicks, 0)
      deviceData.forEach(item => {
        item.percentage = (item.clicks / totalDeviceClicks) * 100
      })

      setAnalytics({
        hourlyData,
        regionData,
        deviceData,
        dailyData: last30Days
      })

      // 템플릿 성과 데이터
      const templateData = [
        { id: '1', name: '기본 템플릿', clicks: Math.floor(Math.random() * 100) + 50, conversions: Math.floor(Math.random() * 20) + 10, revenue: 0 },
        { id: '2', name: '프리미엄 템플릿', clicks: Math.floor(Math.random() * 150) + 80, conversions: Math.floor(Math.random() * 30) + 15, revenue: 0 },
        { id: '3', name: '특별 이벤트', clicks: Math.floor(Math.random() * 80) + 30, conversions: Math.floor(Math.random() * 15) + 5, revenue: 0 }
      ]
      templateData.forEach(template => {
        template.revenue = template.conversions * (campaign.costPerClick || 100)
      })
      setTemplates(templateData)

      // 상위 사용자 성과
      const performers = Array.from({ length: 10 }, (_, i) => ({
        id: `user_${i + 1}`,
        name: `사용자${i + 1}`,
        avatar: undefined,
        clicks: Math.floor(Math.random() * 50) + (50 - i * 3),
        conversions: Math.floor(Math.random() * 10) + (10 - i),
        revenue: 0,
        rank: i + 1
      }))
      performers.forEach(performer => {
        performer.revenue = performer.conversions * (campaign.costPerClick || 100)
      })
      setTopPerformers(performers)

    } catch (error) {
      console.error('Analytics loading error:', error)
      toast.error('분석 데이터를 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [campaign, realTimeClicks])

  // 실시간 클릭 구독
  useEffect(() => {
    if (!campaign) return

    const subscription = realtime.subscribeToCampaignClicks(
      campaign.id,
      (payload) => {
        setRealTimeClicks(prev => prev + 1)
        toast.success('새로운 클릭이 발생했습니다!', {
          description: `총 ${completedClicks + 1}회 클릭`
        })
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [campaign, completedClicks])

  useEffect(() => {
    loadCampaignAnalytics()
  }, [loadCampaignAnalytics])

  const handleCampaignUpdate = async () => {
    if (!campaign) return
    
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({
          title: editForm.name,
          description: editForm.description,
          budget: editForm.budget,
          target_audience: editForm.targetAudience,
          updated_at: new Date().toISOString()
        })
        .eq('id', campaign.id)
      
      if (error) throw error
      
      toast.success('캠페인이 성공적으로 수정되었습니다.')
      setIsEditDialogOpen(false)
      // 실제로는 상위 컴포넌트에서 데이터를 다시 로드해야 함
    } catch (error) {
      console.error('Campaign update error:', error)
      toast.error('캠페인 수정에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: 'active' | 'paused' | 'completed') => {
    if (!campaign) return
    
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', campaign.id)
      
      if (error) throw error
      
      const statusText = {
        active: '활성화',
        paused: '일시정지',
        completed: '종료'
      }[newStatus]
      
      toast.success(`캠페인이 ${statusText}되었습니다.`)
      // 실제로는 상위 컴포넌트에서 데이터를 다시 로드해야 함
    } catch (error) {
      console.error('Status change error:', error)
      toast.error('상태 변경에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            뒤로가기
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{campaign.name}</h1>
              <Badge className={getStatusColor(campaign.status)}>
                {getStatusText(campaign.status)}
              </Badge>
              {realTimeClicks > 0 && (
                <Badge variant="outline" className="animate-pulse">
                  +{realTimeClicks} 실시간
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">{campaign.url}</p>
          </div>
        </div>
        
        {/* 액션 버튼들 */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadCampaignAnalytics} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
          
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                수정
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>캠페인 수정</DialogTitle>
                <DialogDescription>
                  캠페인 정보를 수정하세요.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    캠페인명
                  </Label>
                  <Input
                    id="name"
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="budget" className="text-right">
                    예산
                  </Label>
                  <Input
                    id="budget"
                    type="number"
                    value={editForm.budget}
                    onChange={(e) => setEditForm(prev => ({ ...prev, budget: Number(e.target.value) }))}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="audience" className="text-right">
                    타겟층
                  </Label>
                  <Input
                    id="audience"
                    value={editForm.targetAudience}
                    onChange={(e) => setEditForm(prev => ({ ...prev, targetAudience: e.target.value }))}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="description" className="text-right pt-2">
                    설명
                  </Label>
                  <Textarea
                    id="description"
                    value={editForm.description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    className="col-span-3"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  취소
                </Button>
                <Button onClick={handleCampaignUpdate} disabled={isLoading}>
                  저장
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          {campaign.status === 'active' && (
            <Button variant="outline" size="sm" onClick={() => handleStatusChange('paused')}>
              <Pause className="w-4 h-4 mr-2" />
              일시정지
            </Button>
          )}
          
          {campaign.status === 'paused' && (
            <Button variant="outline" size="sm" onClick={() => handleStatusChange('active')}>
              <Play className="w-4 h-4 mr-2" />
              재시작
            </Button>
          )}
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <StopCircle className="w-4 h-4 mr-2" />
                종료
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>캠페인을 종료하시겠습니까?</AlertDialogTitle>
                <AlertDialogDescription>
                  이 작업은 되돌릴 수 없습니다. 캠페인을 종료하면 더 이상 클릭을 받을 수 없습니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleStatusChange('completed')}>
                  종료
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* 실시간 성과 대시보드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">실시간 클릭수</CardTitle>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <Activity className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedClicks.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              목표: {campaign.totalClicks.toLocaleString()} ({clickProgress.toFixed(1)}%)
            </p>
            <Progress value={clickProgress} className="mt-2 h-2" />
          </CardContent>
          {realTimeClicks > 0 && (
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className="animate-bounce">
                +{realTimeClicks}
              </Badge>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">예산 현황</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₩{campaign.spent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              잔액: ₩{remainingBudget.toLocaleString()}
            </p>
            <Progress value={budgetProgress} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              평균 CPC: ₩{averageCPC.toFixed(0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">완료 예상</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estimatedCompletionDays}일</div>
            <p className="text-xs text-muted-foreground">
              현재 속도 기준
            </p>
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">
                잔여: {campaign.remainingClicks.toLocaleString()}회
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">참여 사용자</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{topPerformers.length}</div>
            <p className="text-xs text-muted-foreground">
              활성 사용자
            </p>
            <div className="flex -space-x-1 mt-2">
              {topPerformers.slice(0, 4).map((user, i) => (
                <div
                  key={user.id}
                  className="w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white font-bold"
                >
                  {i + 1}
                </div>
              ))}
              {topPerformers.length > 4 && (
                <div className="w-6 h-6 bg-gray-200 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-gray-600">
                  +{topPerformers.length - 4}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">집행 기간</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {format(parseISO(campaign.startDate), 'MM/dd', { locale: ko })} ~ {format(parseISO(campaign.endDate), 'MM/dd', { locale: ko })}
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.ceil((parseISO(campaign.endDate).getTime() - parseISO(campaign.startDate).getTime()) / (1000 * 60 * 60 * 24))}일간 진행
            </p>
            <div className="mt-2">
              <Badge variant={campaign.status === 'active' ? 'default' : campaign.status === 'paused' ? 'secondary' : 'destructive'}>
                {getStatusText(campaign.status)}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 상세 분석 탭 */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid grid-cols-5 w-fit">
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="analytics">분석</TabsTrigger>
          <TabsTrigger value="templates">템플릿</TabsTrigger>
          <TabsTrigger value="users">사용자</TabsTrigger>
          <TabsTrigger value="performance">성과</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* 일자별 클릭수 및 CTR 차트 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>일자별 클릭수 및 노출수</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    clicks: {
                      label: "클릭수",
                      color: "hsl(var(--chart-1))",
                    },
                    impressions: {
                      label: "노출수",
                      color: "hsl(var(--chart-2))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.dailyData}>
                      <XAxis 
                        dataKey="date" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12 }}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area
                        type="monotone"
                        dataKey="impressions"
                        stackId="1"
                        stroke="hsl(var(--chart-2))"
                        fill="hsl(var(--chart-2))"
                        fillOpacity={0.3}
                      />
                      <Area
                        type="monotone"
                        dataKey="clicks"
                        stackId="2"
                        stroke="hsl(var(--chart-1))"
                        fill="hsl(var(--chart-1))"
                        fillOpacity={0.6}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>클릭률(CTR) 추이</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    ctr: {
                      label: "CTR (%)",
                      color: "hsl(var(--chart-3))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.dailyData}>
                      <XAxis 
                        dataKey="date" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => `${value.toFixed(1)}%`}
                      />
                      <ChartTooltip 
                        content={<ChartTooltipContent />}
                        labelFormatter={(value) => `CTR: ${value}%`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="ctr" 
                        stroke="hsl(var(--chart-3))" 
                        strokeWidth={3}
                        dot={{ fill: "hsl(var(--chart-3))", strokeWidth: 0, r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 시간대별 분석 */}
            <Card>
              <CardHeader>
                <CardTitle>시간대별 클릭 패턴</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    clicks: {
                      label: "클릭수",
                      color: "hsl(var(--chart-1))",
                    },
                  }}
                  className="h-[200px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.hourlyData}>
                      <XAxis 
                        dataKey="hour" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis hide />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar 
                        dataKey="clicks" 
                        fill="hsl(var(--chart-1))" 
                        radius={[2, 2, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* 지역별 분석 */}
            <Card>
              <CardHeader>
                <CardTitle>지역별 클릭 분포</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analytics.regionData.slice(0, 5).map((region, index) => (
                    <div key={region.region} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `hsl(${index * 45}, 70%, 50%)` }}></div>
                        <span className="text-sm font-medium">{region.region}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold">{region.clicks}</div>
                        <div className="text-xs text-muted-foreground">{region.percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 디바이스별 분석 */}
            <Card>
              <CardHeader>
                <CardTitle>디바이스별 분포</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    clicks: {
                      label: "클릭수",
                      color: "hsl(var(--chart-1))",
                    },
                  }}
                  className="h-[200px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.deviceData}
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        fill="#8884d8"
                        dataKey="clicks"
                        label={({ device, percentage }) => `${device} ${percentage.toFixed(1)}%`}
                      >
                        {analytics.deviceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={`hsl(${index * 120}, 70%, 50%)`} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          {/* 템플릿별 성과 분석 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                템플릿별 성과 분석
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {templates.map((template, index) => {
                  const conversionRate = (template.conversions / template.clicks) * 100
                  const roi = (template.revenue / (template.clicks * averageCPC)) * 100
                  
                  return (
                    <div key={template.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium flex items-center gap-2">
                          {index === 0 && <Crown className="w-4 h-4 text-yellow-500" />}
                          {template.name}
                        </h3>
                        <Badge variant={index === 0 ? 'default' : 'secondary'}>
                          {index === 0 ? '최고 성과' : '일반'}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">클릭수</p>
                          <p className="font-bold">{template.clicks.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">전환수</p>
                          <p className="font-bold">{template.conversions}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">전환율</p>
                          <p className="font-bold">{conversionRate.toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">ROI</p>
                          <p className="font-bold text-green-600">{roi.toFixed(1)}%</p>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span>성과 기여도</span>
                          <span>{((template.clicks / completedClicks) * 100).toFixed(1)}%</span>
                        </div>
                        <Progress value={(template.clicks / completedClicks) * 100} className="h-2" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          {/* 사용자별 성과 순위 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                사용자 성과 순위
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topPerformers.map((user, index) => (
                  <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        index === 0 ? 'bg-yellow-500' : 
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-yellow-600' :
                        'bg-blue-500'
                      }`}>
                        {index < 3 && <Crown className="w-4 h-4" />}
                        {index >= 3 && user.rank}
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">#{user.rank}위</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="grid grid-cols-3 gap-6 text-sm">
                        <div>
                          <p className="text-muted-foreground">클릭</p>
                          <p className="font-bold">{user.clicks}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">전환</p>
                          <p className="font-bold">{user.conversions}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">수익</p>
                          <p className="font-bold text-green-600">₩{user.revenue.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          {/* ROI 및 성과 분석 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>투자 수익률 (ROI)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-green-600">
                      {((campaign.spent > 0 ? (completedClicks * averageCPC * 1.5) / campaign.spent : 1) * 100).toFixed(1)}%
                    </div>
                    <p className="text-sm text-muted-foreground">현재 ROI</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-muted-foreground">총 투입</p>
                      <p className="font-bold">₩{campaign.spent.toLocaleString()}</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-muted-foreground">예상 수익</p>
                      <p className="font-bold text-green-600">₩{(completedClicks * averageCPC * 1.5).toLocaleString()}</p>
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>목표 대비 진행률</span>
                      <span>{clickProgress.toFixed(1)}%</span>
                    </div>
                    <Progress value={clickProgress} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>성과 요약</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">전체 클릭률</span>
                    <span className="font-bold">{(completedClicks / (completedClicks * 10)).toFixed(2)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">평균 CPC</span>
                    <span className="font-bold">₩{averageCPC.toFixed(0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">일평균 클릭</span>
                    <span className="font-bold">{Math.round(completedClicks / 30)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">활성 사용자</span>
                    <span className="font-bold">{topPerformers.length}명</span>
                  </div>
                  
                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span>성과가 목표치를 상회하고 있습니다</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* 캠페인 상세 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>캠페인 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  캠페인 URL
                </h4>
                <p className="text-sm text-muted-foreground break-all p-2 bg-muted rounded">{campaign.url}</p>
              </div>
              <div>
                <h4 className="font-medium mb-1">클릭 목표</h4>
                <p className="text-sm text-muted-foreground">{campaign.totalClicks.toLocaleString()}회</p>
              </div>
              <div>
                <h4 className="font-medium mb-1">총 예산</h4>
                <p className="text-sm text-muted-foreground">₩{campaign.budget.toLocaleString()}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-1">캠페인 상태</h4>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(campaign.status)}>
                    {getStatusText(campaign.status)}
                  </Badge>
                  {campaign.status === 'active' && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-green-600">실시간 운영중</span>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-1">집행 기간</h4>
                <p className="text-sm text-muted-foreground">
                  {format(parseISO(campaign.startDate), 'yyyy년 MM월 dd일', { locale: ko })} ~ {format(parseISO(campaign.endDate), 'yyyy년 MM월 dd일', { locale: ko })}
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-1">클릭당 단가</h4>
                <p className="text-sm text-muted-foreground">₩{Math.round(campaign.budget / campaign.totalClicks).toLocaleString()}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-1">타겟 오디언스</h4>
                <p className="text-sm text-muted-foreground">{campaign.targetAudience || '전체 사용자'}</p>
              </div>
              <div>
                <h4 className="font-medium mb-1">캠페인 설명</h4>
                <p className="text-sm text-muted-foreground">{campaign.description || '설명이 없습니다'}</p>
              </div>
              <div>
                <h4 className="font-medium mb-1">실시간 알림</h4>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-600">실시간 클릭 추적 활성화</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}