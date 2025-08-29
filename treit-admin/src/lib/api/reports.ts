import { supabase } from '../supabase'

// 리포트 관련 API

// 리포트 템플릿 인터페이스
export interface ReportTemplate {
  id: string
  name: string
  description: string
  category: 'users' | 'campaigns' | 'financial' | 'system' | 'custom'
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom'
  status: 'active' | 'inactive'
  config: ReportConfig
  lastGenerated?: Date
  nextGeneration?: Date
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

// 리포트 설정 인터페이스
export interface ReportConfig {
  metrics: string[] // 포함할 메트릭
  filters: Record<string, any> // 필터 조건
  groupBy: string[] // 그룹화 기준
  sortBy: string // 정렬 기준
  chartTypes: string[] // 차트 유형
  format: 'pdf' | 'excel' | 'csv' | 'json'
  includeGraphs: boolean
  dateRange: 'last-7-days' | 'last-30-days' | 'last-90-days' | 'custom'
  customDateFrom?: string
  customDateTo?: string
}

// 리포트 히스토리 인터페이스
export interface ReportHistory {
  id: string
  templateId: string
  templateName: string
  generatedAt: Date
  period: string
  format: 'pdf' | 'excel' | 'csv' | 'json'
  fileSize: number
  status: 'completed' | 'processing' | 'failed' | 'expired'
  downloadUrl?: string
  generatedBy: string
  expiresAt: Date
  downloadCount: number
}

// 리포트 데이터 인터페이스
export interface ReportData {
  summary: {
    totalUsers: number
    newUsers: number
    activeUsers: number
    totalCampaigns: number
    activeCampaigns: number
    totalRevenue: number
    platformCommission: number
    avgCTR: number
  }
  userMetrics: {
    signupTrend: Array<{ date: string; count: number }>
    activityTrend: Array<{ date: string; active: number }>
    levelDistribution: Array<{ level: string; count: number }>
    regionDistribution: Array<{ region: string; count: number }>
  }
  campaignMetrics: {
    performanceTrend: Array<{ date: string; clicks: number; impressions: number }>
    categoryDistribution: Array<{ category: string; count: number; revenue: number }>
    topPerformers: Array<{ id: number; name: string; ctr: number; revenue: number }>
  }
  financialMetrics: {
    revenueTrend: Array<{ date: string; revenue: number; commission: number }>
    withdrawalsTrend: Array<{ date: string; amount: number; count: number }>
    paymentMethods: Array<{ method: string; count: number; amount: number }>
  }
}

// 리포트 템플릿 목록 조회
export async function getReportTemplates(params?: {
  category?: string
  frequency?: string
  status?: string
}): Promise<ReportTemplate[]> {
  try {
    let query = supabase
      .from('report_templates')
      .select('*')

    // 필터 적용
    if (params?.category && params.category !== 'all') {
      query = query.eq('category', params.category)
    }

    if (params?.frequency && params.frequency !== 'all') {
      query = query.eq('frequency', params.frequency)
    }

    if (params?.status && params.status !== 'all') {
      query = query.eq('status', params.status)
    }

    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Get report templates error:', error)
    return []
  }
}

// 리포트 템플릿 상세 조회
export async function getReportTemplate(id: string): Promise<ReportTemplate | null> {
  try {
    const { data, error } = await supabase
      .from('report_templates')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Get report template error:', error)
    return null
  }
}

// 리포트 템플릿 생성
export async function createReportTemplate(template: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('report_templates')
      .insert({
        ...template,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (error) throw error
    return data.id
  } catch (error) {
    console.error('Create report template error:', error)
    return null
  }
}

// 리포트 템플릿 업데이트
export async function updateReportTemplate(id: string, updates: Partial<ReportTemplate>): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('report_templates')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Update report template error:', error)
    return false
  }
}

// 리포트 템플릿 삭제
export async function deleteReportTemplate(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('report_templates')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Delete report template error:', error)
    return false
  }
}

// 리포트 생성
export async function generateReport(
  templateId: string, 
  config?: Partial<ReportConfig>,
  generatedBy?: string
): Promise<string | null> {
  try {
    // 리포트 생성 작업을 큐에 추가
    const { data, error } = await supabase
      .from('report_queue')
      .insert({
        template_id: templateId,
        config: config || {},
        status: 'queued',
        generated_by: generatedBy || 'system',
        created_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (error) throw error

    // 백그라운드에서 리포트 생성 처리
    processReportGeneration(data.id)

    return data.id
  } catch (error) {
    console.error('Generate report error:', error)
    return null
  }
}

// 리포트 생성 처리 (백그라운드)
async function processReportGeneration(queueId: string): Promise<void> {
  try {
    // 큐 상태를 processing으로 변경
    await supabase
      .from('report_queue')
      .update({ status: 'processing' })
      .eq('id', queueId)

    // 큐 정보 조회
    const { data: queueData } = await supabase
      .from('report_queue')
      .select('*, report_templates(*)')
      .eq('id', queueId)
      .single()

    if (!queueData) throw new Error('Queue item not found')

    // 리포트 데이터 수집
    const reportData = await collectReportData(queueData.config)

    // 리포트 파일 생성 (실제로는 파일 생성 서비스 호출)
    const fileUrl = await generateReportFile(reportData, queueData.config.format || 'pdf')

    // 리포트 히스토리에 저장
    const { data: historyData } = await supabase
      .from('report_history')
      .insert({
        template_id: queueData.template_id,
        template_name: queueData.report_templates.name,
        generated_at: new Date().toISOString(),
        period: calculateReportPeriod(queueData.config),
        format: queueData.config.format || 'pdf',
        file_size: Math.floor(Math.random() * 10000000) + 1000000, // 임시
        status: 'completed',
        download_url: fileUrl,
        generated_by: queueData.generated_by,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30일 후 만료
        download_count: 0
      })
      .select('id')
      .single()

    // 큐 상태를 completed로 변경
    await supabase
      .from('report_queue')
      .update({ 
        status: 'completed',
        report_id: historyData.id
      })
      .eq('id', queueId)

  } catch (error) {
    console.error('Process report generation error:', error)
    
    // 오류 시 큐 상태를 failed로 변경
    await supabase
      .from('report_queue')
      .update({ 
        status: 'failed',
        error_message: error.message
      })
      .eq('id', queueId)
  }
}

// 리포트 데이터 수집
async function collectReportData(config: ReportConfig): Promise<ReportData> {
  try {
    // 날짜 범위 계산
    const { startDate, endDate } = calculateDateRange(config)

    // 병렬로 데이터 수집
    const [
      usersData,
      campaignsData,
      transactionsData
    ] = await Promise.all([
      collectUserMetrics(startDate, endDate),
      collectCampaignMetrics(startDate, endDate),
      collectFinancialMetrics(startDate, endDate)
    ])

    return {
      summary: {
        totalUsers: usersData.total,
        newUsers: usersData.new,
        activeUsers: usersData.active,
        totalCampaigns: campaignsData.total,
        activeCampaigns: campaignsData.active,
        totalRevenue: transactionsData.totalRevenue,
        platformCommission: transactionsData.commission,
        avgCTR: campaignsData.avgCTR
      },
      userMetrics: usersData.metrics,
      campaignMetrics: campaignsData.metrics,
      financialMetrics: transactionsData.metrics
    }
  } catch (error) {
    console.error('Collect report data error:', error)
    throw error
  }
}

// 사용자 메트릭 수집
async function collectUserMetrics(startDate: string, endDate: string): Promise<any> {
  try {
    // 사용자 총계
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    // 신규 사용자
    const { count: newUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate)
      .lte('created_at', endDate)

    // 활성 사용자
    const { count: activeUsers } = await supabase
      .from('user_sessions')
      .select('user_id', { count: 'exact', head: true })
      .gte('last_activity', startDate)
      .lte('last_activity', endDate)

    // 가입 트렌드 (일별)
    const { data: signupTrendData } = await supabase
      .rpc('get_daily_signups', {
        start_date: startDate,
        end_date: endDate
      })

    // 지역별 분포
    const { data: regionData } = await supabase
      .from('users')
      .select('region, count(*)')
      .not('region', 'is', null)
      .group('region')

    return {
      total: totalUsers || 0,
      new: newUsers || 0,
      active: activeUsers || 0,
      metrics: {
        signupTrend: signupTrendData || [],
        activityTrend: [], // 구현 필요
        levelDistribution: [], // 구현 필요
        regionDistribution: regionData || []
      }
    }
  } catch (error) {
    console.error('Collect user metrics error:', error)
    return {
      total: 0,
      new: 0,
      active: 0,
      metrics: {
        signupTrend: [],
        activityTrend: [],
        levelDistribution: [],
        regionDistribution: []
      }
    }
  }
}

// 캠페인 메트릭 수집
async function collectCampaignMetrics(startDate: string, endDate: string): Promise<any> {
  try {
    // 캠페인 총계
    const { count: totalCampaigns } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })

    // 활성 캠페인
    const { count: activeCampaigns } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    // 성과 데이터
    const { data: performanceData } = await supabase
      .from('campaigns')
      .select('clicks, impressions, ctr')
      .eq('status', 'active')

    const avgCTR = performanceData?.reduce((sum, c) => sum + (c.ctr || 0), 0) / (performanceData?.length || 1) || 0

    return {
      total: totalCampaigns || 0,
      active: activeCampaigns || 0,
      avgCTR: Number(avgCTR.toFixed(2)),
      metrics: {
        performanceTrend: [], // 구현 필요
        categoryDistribution: [], // 구현 필요
        topPerformers: [] // 구현 필요
      }
    }
  } catch (error) {
    console.error('Collect campaign metrics error:', error)
    return {
      total: 0,
      active: 0,
      avgCTR: 0,
      metrics: {
        performanceTrend: [],
        categoryDistribution: [],
        topPerformers: []
      }
    }
  }
}

// 재무 메트릭 수집
async function collectFinancialMetrics(startDate: string, endDate: string): Promise<any> {
  try {
    // 총 수익
    const { data: revenueData } = await supabase
      .from('transactions')
      .select('amount')
      .eq('type', 'commission')
      .eq('status', 'completed')
      .gte('created_at', startDate)
      .lte('created_at', endDate)

    const totalRevenue = revenueData?.reduce((sum, t) => sum + t.amount, 0) || 0

    return {
      totalRevenue,
      commission: totalRevenue * 0.1, // 예시
      metrics: {
        revenueTrend: [], // 구현 필요
        withdrawalsTrend: [], // 구현 필요
        paymentMethods: [] // 구현 필요
      }
    }
  } catch (error) {
    console.error('Collect financial metrics error:', error)
    return {
      totalRevenue: 0,
      commission: 0,
      metrics: {
        revenueTrend: [],
        withdrawalsTrend: [],
        paymentMethods: []
      }
    }
  }
}

// 날짜 범위 계산
function calculateDateRange(config: ReportConfig): { startDate: string; endDate: string } {
  const endDate = new Date().toISOString()
  let startDate: string

  switch (config.dateRange) {
    case 'last-7-days':
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      break
    case 'last-30-days':
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      break
    case 'last-90-days':
      startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
      break
    case 'custom':
      startDate = config.customDateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      break
    default:
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  }

  return { startDate, endDate: config.customDateTo || endDate }
}

// 리포트 기간 계산
function calculateReportPeriod(config: ReportConfig): string {
  const { startDate, endDate } = calculateDateRange(config)
  return `${startDate.split('T')[0]} ~ ${endDate.split('T')[0]}`
}

// 리포트 파일 생성 (실제로는 외부 서비스 사용)
async function generateReportFile(data: ReportData, format: string): Promise<string> {
  try {
    // 실제 환경에서는 PDF/Excel 생성 라이브러리 사용
    // 여기서는 시뮬레이션된 URL 반환
    const fileId = Math.random().toString(36).substr(2, 9)
    return `/api/reports/download/${fileId}.${format}`
  } catch (error) {
    console.error('Generate report file error:', error)
    throw error
  }
}

// 리포트 히스토리 조회
export async function getReportHistory(params?: {
  page?: number
  limit?: number
  templateId?: string
  status?: string
  generatedBy?: string
}): Promise<{ reports: ReportHistory[]; total: number }> {
  try {
    let query = supabase
      .from('report_history')
      .select('*', { count: 'exact' })

    // 필터 적용
    if (params?.templateId) {
      query = query.eq('template_id', params.templateId)
    }

    if (params?.status && params.status !== 'all') {
      query = query.eq('status', params.status)
    }

    if (params?.generatedBy) {
      query = query.eq('generated_by', params.generatedBy)
    }

    // 페이지네이션
    const page = params?.page || 1
    const limit = params?.limit || 20
    const from = (page - 1) * limit
    const to = from + limit - 1

    query = query.range(from, to).order('generated_at', { ascending: false })

    const { data, count, error } = await query

    if (error) throw error

    return {
      reports: data || [],
      total: count || 0
    }
  } catch (error) {
    console.error('Get report history error:', error)
    return { reports: [], total: 0 }
  }
}

// 리포트 다운로드
export async function downloadReport(reportId: string): Promise<string | null> {
  try {
    // 다운로드 횟수 증가
    await supabase
      .from('report_history')
      .update({ download_count: supabase.sql`download_count + 1` })
      .eq('id', reportId)

    // 리포트 정보 조회
    const { data, error } = await supabase
      .from('report_history')
      .select('download_url')
      .eq('id', reportId)
      .single()

    if (error) throw error
    return data.download_url
  } catch (error) {
    console.error('Download report error:', error)
    return null
  }
}

// 만료된 리포트 정리
export async function cleanupExpiredReports(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('report_history')
      .delete()
      .lt('expires_at', new Date().toISOString())

    if (error) throw error
    return data?.length || 0
  } catch (error) {
    console.error('Cleanup expired reports error:', error)
    return 0
  }
}

// 리포트 스케줄링
export async function scheduleReport(
  templateId: string,
  frequency: 'daily' | 'weekly' | 'monthly',
  config: ReportConfig
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('report_schedules')
      .insert({
        template_id: templateId,
        frequency,
        config,
        next_run: calculateNextRun(frequency),
        enabled: true,
        created_at: new Date().toISOString()
      })

    if (error) throw error
    return true
  } catch (error) {
    console.error('Schedule report error:', error)
    return false
  }
}

// 다음 실행 시간 계산
function calculateNextRun(frequency: string): string {
  const now = new Date()
  
  switch (frequency) {
    case 'daily':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
    case 'weekly':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    case 'monthly':
      return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).toISOString()
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
  }
}