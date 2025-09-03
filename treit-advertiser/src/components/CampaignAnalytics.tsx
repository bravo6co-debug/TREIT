import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from './ui/chart'
import { 
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, 
  PieChart, Pie, Cell, AreaChart, Area, Tooltip, Legend, 
  ReferenceLine, Scatter, ScatterChart
} from 'recharts'
import { 
  BarChart3, TrendingUp, TrendingDown, Users, Clock, MapPin, 
  Smartphone, Monitor, Tablet, Target, DollarSign, Activity,
  Calendar, Download, RefreshCw, Filter, Eye
} from 'lucide-react'
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Progress } from './ui/progress'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'

interface Campaign {
  id: string
  name: string
  totalClicks: number
  remainingClicks: number
  budget: number
  spent: number
  status: string
}

interface AnalyticsData {
  // 시간대별 분석
  hourlyData: {
    hour: string
    clicks: number
    impressions: number
    conversions: number
    revenue: number
    ctr: number
    cvr: number
  }[]
  
  // 일별 분석
  dailyData: {
    date: string
    fullDate: string
    clicks: number
    impressions: number
    conversions: number
    revenue: number
    ctr: number
    cvr: number
    cpc: number
  }[]
  
  // 지역별 분석
  regionData: {
    region: string
    clicks: number
    impressions: number
    conversions: number
    revenue: number
    percentage: number
  }[]
  
  // 디바이스별 분석
  deviceData: {
    device: string
    clicks: number
    impressions: number
    conversions: number
    revenue: number
    percentage: number
  }[]
  
  // 연령대별 분석
  ageGroupData: {
    ageGroup: string
    clicks: number
    impressions: number
    conversions: number
    revenue: number
    percentage: number
  }[]
  
  // 성별 분석
  genderData: {
    gender: string
    clicks: number
    impressions: number
    conversions: number
    revenue: number
    percentage: number
  }[]
  
  // 주간 트렌드
  weeklyTrend: {
    week: string
    clicks: number
    impressions: number
    conversions: number
    revenue: number
    ctr: number
    cvr: number
  }[]
}

interface CampaignAnalyticsProps {
  campaigns?: Campaign[]
  selectedCampaignId?: string
  dateRange?: {
    startDate: string
    endDate: string
  }
}

type DateRangeOption = '7d' | '30d' | '90d' | 'custom'

export function CampaignAnalytics({ 
  campaigns = [], 
  selectedCampaignId,
  dateRange 
}: CampaignAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    hourlyData: [],
    dailyData: [],
    regionData: [],
    deviceData: [],
    ageGroupData: [],
    genderData: [],
    weeklyTrend: []
  })
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDateRange, setSelectedDateRange] = useState<DateRangeOption>('30d')
  const [selectedCampaign, setSelectedCampaign] = useState<string>(selectedCampaignId || 'all')

  // Mock 데이터 생성 함수
  const generateMockAnalytics = (): AnalyticsData => {
    const now = new Date()
    const daysCount = selectedDateRange === '7d' ? 7 : selectedDateRange === '30d' ? 30 : 90

    // 일별 데이터
    const dailyData = Array.from({ length: daysCount }, (_, i) => {
      const date = subDays(now, daysCount - 1 - i)
      const baseClicks = Math.floor(Math.random() * 200) + 100
      const impressions = baseClicks * (Math.floor(Math.random() * 5) + 10)
      const conversions = Math.floor(baseClicks * (Math.random() * 0.1 + 0.02))
      const cpc = Math.floor(Math.random() * 50) + 80
      
      return {
        date: format(date, 'MM/dd', { locale: ko }),
        fullDate: format(date, 'yyyy-MM-dd'),
        clicks: baseClicks,
        impressions,
        conversions,
        revenue: conversions * cpc * 1.5,
        ctr: (baseClicks / impressions) * 100,
        cvr: (conversions / baseClicks) * 100,
        cpc
      }
    })

    // 시간대별 데이터
    const hourlyData = Array.from({ length: 24 }, (_, i) => {
      const baseClicks = Math.floor(Math.random() * 50) + 10
      const impressions = baseClicks * (Math.floor(Math.random() * 8) + 12)
      const conversions = Math.floor(baseClicks * (Math.random() * 0.08 + 0.015))
      
      return {
        hour: `${i}시`,
        clicks: baseClicks,
        impressions,
        conversions,
        revenue: conversions * 100 * 1.5,
        ctr: (baseClicks / impressions) * 100,
        cvr: (conversions / baseClicks) * 100
      }
    })

    // 지역별 데이터
    const regions = [
      '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종',
      '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'
    ]
    const regionData = regions.map(region => {
      const clicks = Math.floor(Math.random() * 500) + 100
      const impressions = clicks * (Math.floor(Math.random() * 8) + 10)
      const conversions = Math.floor(clicks * (Math.random() * 0.06 + 0.02))
      
      return {
        region,
        clicks,
        impressions,
        conversions,
        revenue: conversions * 100 * 1.5,
        percentage: 0 // 나중에 계산
      }
    })
    
    const totalRegionClicks = regionData.reduce((sum, item) => sum + item.clicks, 0)
    regionData.forEach(item => {
      item.percentage = (item.clicks / totalRegionClicks) * 100
    })

    // 디바이스별 데이터
    const deviceData = [
      { device: 'Mobile', clicks: Math.floor(Math.random() * 800) + 400 },
      { device: 'Desktop', clicks: Math.floor(Math.random() * 400) + 200 },
      { device: 'Tablet', clicks: Math.floor(Math.random() * 200) + 50 }
    ].map(device => ({
      ...device,
      impressions: device.clicks * (Math.floor(Math.random() * 8) + 12),
      conversions: Math.floor(device.clicks * (Math.random() * 0.06 + 0.02)),
      revenue: 0,
      percentage: 0
    }))
    
    deviceData.forEach(device => {
      device.revenue = device.conversions * 100 * 1.5
    })
    
    const totalDeviceClicks = deviceData.reduce((sum, item) => sum + item.clicks, 0)
    deviceData.forEach(item => {
      item.percentage = (item.clicks / totalDeviceClicks) * 100
    })

    // 연령대별 데이터
    const ageGroups = ['10대', '20대', '30대', '40대', '50대', '60대+']
    const ageGroupData = ageGroups.map(ageGroup => {
      const clicks = Math.floor(Math.random() * 300) + 50
      const impressions = clicks * (Math.floor(Math.random() * 8) + 10)
      const conversions = Math.floor(clicks * (Math.random() * 0.06 + 0.02))
      
      return {
        ageGroup,
        clicks,
        impressions,
        conversions,
        revenue: conversions * 100 * 1.5,
        percentage: 0
      }
    })
    
    const totalAgeClicks = ageGroupData.reduce((sum, item) => sum + item.clicks, 0)
    ageGroupData.forEach(item => {
      item.percentage = (item.clicks / totalAgeClicks) * 100
    })

    // 성별 데이터
    const genderData = [
      { gender: '남성', clicks: Math.floor(Math.random() * 600) + 300 },
      { gender: '여성', clicks: Math.floor(Math.random() * 600) + 300 },
      { gender: '기타', clicks: Math.floor(Math.random() * 100) + 20 }
    ].map(gender => ({
      ...gender,
      impressions: gender.clicks * (Math.floor(Math.random() * 8) + 10),
      conversions: Math.floor(gender.clicks * (Math.random() * 0.06 + 0.02)),
      revenue: 0,
      percentage: 0
    }))
    
    genderData.forEach(gender => {
      gender.revenue = gender.conversions * 100 * 1.5
    })
    
    const totalGenderClicks = genderData.reduce((sum, item) => sum + item.clicks, 0)
    genderData.forEach(item => {
      item.percentage = (item.clicks / totalGenderClicks) * 100
    })

    // 주간 트렌드
    const weekCount = Math.ceil(daysCount / 7)
    const weeklyTrend = Array.from({ length: weekCount }, (_, i) => {
      const weekStart = subDays(now, (weekCount - i) * 7)
      const clicks = Math.floor(Math.random() * 1500) + 800
      const impressions = clicks * (Math.floor(Math.random() * 8) + 10)
      const conversions = Math.floor(clicks * (Math.random() * 0.06 + 0.02))
      
      return {
        week: `${format(startOfWeek(weekStart), 'MM/dd', { locale: ko })}~${format(endOfWeek(weekStart), 'MM/dd', { locale: ko })}`,
        clicks,
        impressions,
        conversions,
        revenue: conversions * 100 * 1.5,
        ctr: (clicks / impressions) * 100,
        cvr: (conversions / clicks) * 100
      }
    })

    return {
      hourlyData,
      dailyData,
      regionData: regionData.sort((a, b) => b.clicks - a.clicks),
      deviceData,
      ageGroupData,
      genderData,
      weeklyTrend
    }
  }

  const loadAnalytics = async () => {
    setIsLoading(true)
    try {
      // 실제로는 Supabase에서 분석 데이터를 가져옴
      await new Promise(resolve => setTimeout(resolve, 1000)) // Mock loading time
      const mockData = generateMockAnalytics()
      setAnalytics(mockData)
      toast.success('분석 데이터를 불러왔습니다.')
    } catch (error) {
      console.error('Analytics loading error:', error)
      toast.error('분석 데이터를 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAnalytics()
  }, [selectedDateRange, selectedCampaign])

  // 주요 지표 계산
  const totalMetrics = useMemo(() => {
    const totalClicks = analytics.dailyData.reduce((sum, day) => sum + day.clicks, 0)
    const totalImpressions = analytics.dailyData.reduce((sum, day) => sum + day.impressions, 0)
    const totalConversions = analytics.dailyData.reduce((sum, day) => sum + day.conversions, 0)
    const totalRevenue = analytics.dailyData.reduce((sum, day) => sum + day.revenue, 0)
    const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
    const avgCVR = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0
    const avgCPC = totalClicks > 0 ? totalRevenue / (totalConversions * 1.5) : 0

    return {
      totalClicks,
      totalImpressions,
      totalConversions,
      totalRevenue,
      avgCTR,
      avgCVR,
      avgCPC
    }
  }, [analytics])

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">캠페인 분석</h2>
            <p className="text-muted-foreground">상세한 성과 분석을 확인하세요</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-64 bg-muted rounded"></div>
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
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">캠페인 분석</h2>
          <p className="text-muted-foreground">상세한 성과 분석 및 인사이트를 확인하세요</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          {/* 캠페인 선택 */}
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="캠페인 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 캠페인</SelectItem>
              {campaigns.map(campaign => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 기간 선택 */}
          <Select value={selectedDateRange} onValueChange={(value: DateRangeOption) => setSelectedDateRange(value)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="기간 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">최근 7일</SelectItem>
              <SelectItem value="30d">최근 30일</SelectItem>
              <SelectItem value="90d">최근 90일</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={loadAnalytics}>
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </Button>
        </div>
      </div>

      {/* 주요 지표 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">총 클릭수</p>
                <p className="text-2xl font-bold">{totalMetrics.totalClicks.toLocaleString()}</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +12.5% vs 이전 기간
                </p>
              </div>
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">총 노출수</p>
                <p className="text-2xl font-bold">{totalMetrics.totalImpressions.toLocaleString()}</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +8.3% vs 이전 기간
                </p>
              </div>
              <Eye className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">클릭률 (CTR)</p>
                <p className="text-2xl font-bold">{totalMetrics.avgCTR.toFixed(2)}%</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +0.8% vs 이전 기간
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">전환율 (CVR)</p>
                <p className="text-2xl font-bold">{totalMetrics.avgCVR.toFixed(2)}%</p>
                <p className="text-xs text-red-600 flex items-center mt-1">
                  <TrendingDown className="w-3 h-3 mr-1" />
                  -0.3% vs 이전 기간
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 상세 분석 탭 */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid grid-cols-6 w-fit">
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="time">시간 분석</TabsTrigger>
          <TabsTrigger value="location">지역 분석</TabsTrigger>
          <TabsTrigger value="device">디바이스</TabsTrigger>
          <TabsTrigger value="audience">사용자</TabsTrigger>
          <TabsTrigger value="performance">성과</TabsTrigger>
        </TabsList>

        {/* 개요 탭 */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 일별 클릭수 트렌드 */}
            <Card>
              <CardHeader>
                <CardTitle>일별 클릭수 및 노출수 트렌드</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    clicks: { label: "클릭수", color: "hsl(var(--chart-1))" },
                    impressions: { label: "노출수", color: "hsl(var(--chart-2))" }
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.dailyData}>
                      <XAxis dataKey="date" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
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

            {/* CTR 및 CVR 트렌드 */}
            <Card>
              <CardHeader>
                <CardTitle>클릭률(CTR) 및 전환율(CVR) 트렌드</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    ctr: { label: "CTR (%)", color: "hsl(var(--chart-3))" },
                    cvr: { label: "CVR (%)", color: "hsl(var(--chart-4))" }
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.dailyData}>
                      <XAxis dataKey="date" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line 
                        type="monotone" 
                        dataKey="ctr" 
                        stroke="hsl(var(--chart-3))" 
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="cvr" 
                        stroke="hsl(var(--chart-4))" 
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* 주간 트렌드 */}
          <Card>
            <CardHeader>
              <CardTitle>주간 성과 트렌드</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  clicks: { label: "클릭수", color: "hsl(var(--chart-1))" },
                  conversions: { label: "전환수", color: "hsl(var(--chart-2))" },
                  revenue: { label: "수익", color: "hsl(var(--chart-3))" }
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.weeklyTrend}>
                    <XAxis dataKey="week" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="clicks" fill="hsl(var(--chart-1))" name="클릭수" />
                    <Bar dataKey="conversions" fill="hsl(var(--chart-2))" name="전환수" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 시간 분석 탭 */}
        <TabsContent value="time" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>시간대별 클릭 패턴</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  clicks: { label: "클릭수", color: "hsl(var(--chart-1))" },
                  conversions: { label: "전환수", color: "hsl(var(--chart-2))" }
                }}
                className="h-[400px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.hourlyData}>
                    <XAxis dataKey="hour" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="clicks" fill="hsl(var(--chart-1))" name="클릭수" />
                    <Bar dataKey="conversions" fill="hsl(var(--chart-2))" name="전환수" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 최고 성과 시간대 */}
            <Card>
              <CardHeader>
                <CardTitle>최고 성과 시간대</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.hourlyData
                    .sort((a, b) => b.clicks - a.clicks)
                    .slice(0, 5)
                    .map((time, index) => (
                      <div key={time.hour} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                            index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-yellow-600' : 'bg-blue-500'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{time.hour}</p>
                            <p className="text-sm text-muted-foreground">CTR: {time.ctr.toFixed(2)}%</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{time.clicks}클릭</p>
                          <p className="text-sm text-muted-foreground">{time.conversions}전환</p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* 시간대별 CTR */}
            <Card>
              <CardHeader>
                <CardTitle>시간대별 클릭률(CTR)</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    ctr: { label: "CTR (%)", color: "hsl(var(--chart-3))" }
                  }}
                  className="h-[250px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.hourlyData}>
                      <XAxis dataKey="hour" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line 
                        type="monotone" 
                        dataKey="ctr" 
                        stroke="hsl(var(--chart-3))" 
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--chart-3))", r: 3 }}
                      />
                      <ReferenceLine y={totalMetrics.avgCTR} stroke="#666" strokeDasharray="5 5" />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 지역 분석 탭 */}
        <TabsContent value="location" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 지역별 클릭수 */}
            <Card>
              <CardHeader>
                <CardTitle>지역별 클릭수 상위 10</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.regionData.slice(0, 10).map((region, index) => (
                    <div key={region.region} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{region.region}</span>
                          <span className="font-bold">{region.clicks.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>전환: {region.conversions}</span>
                          <span>{region.percentage.toFixed(1)}%</span>
                        </div>
                        <Progress value={region.percentage} className="h-1 mt-1" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 지역별 성과 분석 */}
            <Card>
              <CardHeader>
                <CardTitle>지역별 성과 분석</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    clicks: { label: "클릭수", color: "hsl(var(--chart-1))" }
                  }}
                  className="h-[350px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.regionData.slice(0, 10)} layout="horizontal">
                      <XAxis type="number" axisLine={false} tickLine={false} />
                      <YAxis 
                        type="category" 
                        dataKey="region" 
                        axisLine={false} 
                        tickLine={false}
                        width={50}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="clicks" fill="hsl(var(--chart-1))" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 디바이스 분석 탭 */}
        <TabsContent value="device" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 디바이스별 분포 */}
            <Card>
              <CardHeader>
                <CardTitle>디바이스별 클릭 분포</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    clicks: { label: "클릭수", color: "hsl(var(--chart-1))" }
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.deviceData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="clicks"
                        label={({ device, percentage }) => `${device} ${percentage.toFixed(1)}%`}
                      >
                        {analytics.deviceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* 디바이스별 성과 */}
            <Card>
              <CardHeader>
                <CardTitle>디바이스별 상세 성과</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.deviceData.map((device, index) => {
                    const ctr = (device.clicks / device.impressions) * 100
                    const cvr = (device.conversions / device.clicks) * 100
                    const DeviceIcon = device.device === 'Mobile' ? Smartphone : 
                                     device.device === 'Desktop' ? Monitor : Tablet
                    
                    return (
                      <div key={device.device} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <DeviceIcon className="w-5 h-5 text-primary" />
                            <span className="font-medium">{device.device}</span>
                          </div>
                          <Badge style={{ backgroundColor: COLORS[index % COLORS.length] }}>
                            {device.percentage.toFixed(1)}%
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">클릭수</p>
                            <p className="font-bold text-lg">{device.clicks.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">전환수</p>
                            <p className="font-bold text-lg">{device.conversions}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">CTR</p>
                            <p className="font-bold text-primary">{ctr.toFixed(2)}%</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">CVR</p>
                            <p className="font-bold text-green-600">{cvr.toFixed(2)}%</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 사용자 분석 탭 */}
        <TabsContent value="audience" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 연령대별 분석 */}
            <Card>
              <CardHeader>
                <CardTitle>연령대별 클릭 분포</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    clicks: { label: "클릭수", color: "hsl(var(--chart-1))" }
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.ageGroupData}>
                      <XAxis dataKey="ageGroup" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="clicks" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* 성별 분석 */}
            <Card>
              <CardHeader>
                <CardTitle>성별 클릭 분포</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    clicks: { label: "클릭수", color: "hsl(var(--chart-2))" }
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.genderData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="clicks"
                        label={({ gender, percentage }) => `${gender} ${percentage.toFixed(1)}%`}
                      >
                        {analytics.genderData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index + 3]} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* 사용자 세그먼트 상세 */}
          <Card>
            <CardHeader>
              <CardTitle>사용자 세그먼트 상세 분석</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">연령대별 성과</h4>
                  <div className="space-y-2">
                    {analytics.ageGroupData.map((age, index) => (
                      <div key={age.ageGroup} className="flex items-center justify-between p-2 rounded">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          ></div>
                          <span className="text-sm font-medium">{age.ageGroup}</span>
                        </div>
                        <div className="text-right text-sm">
                          <div className="font-bold">{age.clicks}</div>
                          <div className="text-muted-foreground">{age.percentage.toFixed(1)}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">성별 성과</h4>
                  <div className="space-y-2">
                    {analytics.genderData.map((gender, index) => (
                      <div key={gender.gender} className="flex items-center justify-between p-2 rounded">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[index + 3] }}
                          ></div>
                          <span className="text-sm font-medium">{gender.gender}</span>
                        </div>
                        <div className="text-right text-sm">
                          <div className="font-bold">{gender.clicks}</div>
                          <div className="text-muted-foreground">{gender.percentage.toFixed(1)}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 성과 분석 탭 */}
        <TabsContent value="performance" className="space-y-6">
          {/* 전체 성과 요약 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    ₩{totalMetrics.totalRevenue.toLocaleString()}
                  </div>
                  <p className="text-sm text-muted-foreground">총 예상 수익</p>
                  <div className="flex items-center justify-center mt-2">
                    <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                    <span className="text-xs text-green-600">+15.3% vs 이전 기간</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold">
                    {totalMetrics.totalConversions.toLocaleString()}
                  </div>
                  <p className="text-sm text-muted-foreground">총 전환수</p>
                  <div className="flex items-center justify-center mt-2">
                    <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                    <span className="text-xs text-green-600">+9.8% vs 이전 기간</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold">
                    ₩{totalMetrics.avgCPC.toFixed(0)}
                  </div>
                  <p className="text-sm text-muted-foreground">평균 클릭당 비용</p>
                  <div className="flex items-center justify-center mt-2">
                    <TrendingDown className="w-4 h-4 text-red-600 mr-1" />
                    <span className="text-xs text-red-600">-2.1% vs 이전 기간</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 일별 수익 트렌드 */}
          <Card>
            <CardHeader>
              <CardTitle>일별 수익 및 전환 트렌드</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  revenue: { label: "수익", color: "hsl(var(--chart-1))" },
                  conversions: { label: "전환수", color: "hsl(var(--chart-2))" }
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.dailyData}>
                    <XAxis dataKey="date" axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="hsl(var(--chart-1))" 
                      strokeWidth={2}
                      name="수익"
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="conversions" 
                      stroke="hsl(var(--chart-2))" 
                      strokeWidth={2}
                      name="전환수"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* 성과 분석 인사이트 */}
          <Card>
            <CardHeader>
              <CardTitle>성과 분석 인사이트</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 border-l-4 border-green-500 rounded">
                    <h5 className="font-medium text-green-800">최고 성과</h5>
                    <p className="text-sm text-green-700">
                      모바일 디바이스에서 30대 사용자의 전환율이 가장 높습니다.
                    </p>
                  </div>
                  
                  <div className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                    <h5 className="font-medium text-blue-800">개선 기회</h5>
                    <p className="text-sm text-blue-700">
                      14-16시 시간대의 CTR이 평균 대비 20% 높습니다.
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                    <h5 className="font-medium text-yellow-800">주의 필요</h5>
                    <p className="text-sm text-yellow-700">
                      태블릿 디바이스의 전환율이 다른 디바이스 대비 낮습니다.
                    </p>
                  </div>
                  
                  <div className="p-3 bg-purple-50 border-l-4 border-purple-500 rounded">
                    <h5 className="font-medium text-purple-800">추천 액션</h5>
                    <p className="text-sm text-purple-700">
                      서울/경기 지역에 예산을 더 집중하는 것을 고려해보세요.
                    </p>
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