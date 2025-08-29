import { supabase } from '../supabase'

// 관리자 인증 및 권한 관리
export interface AdminUser {
  id: string
  email: string
  name: string
  role: 'super_admin' | 'admin' | 'moderator'
  permissions: string[]
  department: string
  loginTime: string
  sessionId: string
  lastLoginAt?: Date
  isActive: boolean
}

// 관리자 로그인
export async function loginAdmin(email: string, password: string): Promise<AdminUser | null> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) throw error

    // 관리자 권한 확인
    const { data: adminData, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', data.user.id)
      .eq('is_active', true)
      .single()

    if (adminError || !adminData) {
      throw new Error('관리자 권한이 없습니다.')
    }

    // 로그인 로그 기록
    await logAdminActivity(adminData.id, 'login', '관리자 로그인')

    return {
      id: adminData.id,
      email: data.user.email!,
      name: adminData.name,
      role: adminData.role,
      permissions: adminData.permissions || [],
      department: adminData.department,
      loginTime: new Date().toISOString(),
      sessionId: data.session?.access_token.substring(0, 20) || '',
      lastLoginAt: new Date(adminData.last_login_at),
      isActive: adminData.is_active
    }
  } catch (error) {
    console.error('Admin login error:', error)
    return null
  }
}

// 관리자 로그아웃
export async function logoutAdmin(): Promise<void> {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  } catch (error) {
    console.error('Admin logout error:', error)
    throw error
  }
}

// 사용자 관리
export interface UserData {
  id: number
  name: string
  email: string
  phone?: string
  level: number
  status: 'active' | 'inactive' | 'suspended' | 'pending'
  totalEarnings: number
  activeCampaigns: number
  joinDate: string
  lastLoginDate?: string
  riskLevel: 'low' | 'medium' | 'high'
  suspiciousActivity: boolean
}

// 사용자 목록 조회
export async function getUsers(params: {
  page?: number
  limit?: number
  search?: string
  status?: string
  riskLevel?: string
}): Promise<{ users: UserData[]; total: number }> {
  try {
    let query = supabase
      .from('users')
      .select('*', { count: 'exact' })

    // 검색 조건 적용 (SQL 인젝션 방지를 위한 안전한 방법)
    if (params.search) {
      const sanitizedSearch = params.search.replace(/[%_\\]/g, '\\$&').replace(/['";]/g, '')
      query = query.or(`name.ilike.%${sanitizedSearch}%,email.ilike.%${sanitizedSearch}%`)
    }

    if (params.status && params.status !== 'all') {
      query = query.eq('status', params.status)
    }

    if (params.riskLevel && params.riskLevel !== 'all') {
      query = query.eq('risk_level', params.riskLevel)
    }

    // 페이지네이션
    const page = params.page || 1
    const limit = params.limit || 20
    const from = (page - 1) * limit
    const to = from + limit - 1

    query = query.range(from, to)

    const { data, count, error } = await query

    if (error) throw error

    return {
      users: data || [],
      total: count || 0
    }
  } catch (error) {
    console.error('Get users error:', error)
    throw error
  }
}

// 사용자 상세 정보 조회
export async function getUserDetails(userId: number): Promise<UserData | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Get user details error:', error)
    return null
  }
}

// 사용자 상태 변경
export async function updateUserStatus(
  userId: number, 
  status: 'active' | 'suspended' | 'inactive',
  reason?: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (error) throw error

    // 활동 로그 기록
    await logAdminActivity(
      'system',
      'user_status_change',
      `사용자 ${userId} 상태 변경: ${status}${reason ? ` (사유: ${reason})` : ''}`
    )

    return true
  } catch (error) {
    console.error('Update user status error:', error)
    return false
  }
}

// 캠페인 관리
export interface CampaignData {
  id: number
  name: string
  advertiser: string
  status: 'active' | 'paused' | 'completed' | 'pending' | 'rejected'
  budget: number
  spent: number
  clicks: number
  impressions: number
  ctr: number
  startDate: string
  endDate: string
  priority: 'high' | 'medium' | 'low'
  riskLevel: 'low' | 'medium' | 'high'
}

// 캠페인 목록 조회
export async function getCampaigns(params: {
  page?: number
  limit?: number
  search?: string
  status?: string
  priority?: string
}): Promise<{ campaigns: CampaignData[]; total: number }> {
  try {
    let query = supabase
      .from('campaigns')
      .select('*', { count: 'exact' })

    // 검색 조건 적용 (SQL 인젝션 방지를 위한 안전한 방법)
    if (params.search) {
      const sanitizedSearch = params.search.replace(/[%_\\]/g, '\\$&').replace(/['";]/g, '')
      query = query.or(`name.ilike.%${sanitizedSearch}%,advertiser.ilike.%${sanitizedSearch}%`)
    }

    if (params.status && params.status !== 'all') {
      query = query.eq('status', params.status)
    }

    if (params.priority && params.priority !== 'all') {
      query = query.eq('priority', params.priority)
    }

    // 페이지네이션
    const page = params.page || 1
    const limit = params.limit || 20
    const from = (page - 1) * limit
    const to = from + limit - 1

    query = query.range(from, to).order('created_at', { ascending: false })

    const { data, count, error } = await query

    if (error) throw error

    return {
      campaigns: data || [],
      total: count || 0
    }
  } catch (error) {
    console.error('Get campaigns error:', error)
    throw error
  }
}

// 캠페인 승인/거부
export async function reviewCampaign(
  campaignId: number,
  action: 'approve' | 'reject',
  notes: string
): Promise<boolean> {
  try {
    const status = action === 'approve' ? 'active' : 'rejected'
    
    const { error } = await supabase
      .from('campaigns')
      .update({
        status,
        review_notes: notes,
        reviewed_at: new Date().toISOString(),
        reviewed_by: 'admin' // 실제로는 현재 관리자 ID
      })
      .eq('id', campaignId)

    if (error) throw error

    // 활동 로그 기록
    await logAdminActivity(
      'system',
      'campaign_review',
      `캠페인 ${campaignId} ${action === 'approve' ? '승인' : '거부'}: ${notes}`
    )

    return true
  } catch (error) {
    console.error('Review campaign error:', error)
    return false
  }
}

// 재무 관리
export interface FinancialTransaction {
  id: string
  type: 'withdrawal' | 'deposit' | 'commission' | 'refund'
  userId?: number
  amount: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: Date
  description: string
}

// 거래 내역 조회
export async function getTransactions(params: {
  page?: number
  limit?: number
  type?: string
  status?: string
  dateFrom?: string
  dateTo?: string
}): Promise<{ transactions: FinancialTransaction[]; total: number }> {
  try {
    let query = supabase
      .from('transactions')
      .select('*', { count: 'exact' })

    // 필터 적용
    if (params.type && params.type !== 'all') {
      query = query.eq('type', params.type)
    }

    if (params.status && params.status !== 'all') {
      query = query.eq('status', params.status)
    }

    if (params.dateFrom) {
      query = query.gte('created_at', params.dateFrom)
    }

    if (params.dateTo) {
      query = query.lte('created_at', params.dateTo)
    }

    // 페이지네이션
    const page = params.page || 1
    const limit = params.limit || 20
    const from = (page - 1) * limit
    const to = from + limit - 1

    query = query.range(from, to).order('created_at', { ascending: false })

    const { data, count, error } = await query

    if (error) throw error

    return {
      transactions: data || [],
      total: count || 0
    }
  } catch (error) {
    console.error('Get transactions error:', error)
    throw error
  }
}

// 거래 승인/거부
export async function processTransaction(
  transactionId: string,
  action: 'approve' | 'reject',
  reason?: string
): Promise<boolean> {
  try {
    const status = action === 'approve' ? 'processing' : 'failed'
    
    const { error } = await supabase
      .from('transactions')
      .update({
        status,
        processed_at: new Date().toISOString(),
        process_reason: reason
      })
      .eq('id', transactionId)

    if (error) throw error

    // 활동 로그 기록
    await logAdminActivity(
      'system',
      'transaction_process',
      `거래 ${transactionId} ${action}: ${reason || ''}`
    )

    return true
  } catch (error) {
    console.error('Process transaction error:', error)
    return false
  }
}

// 통계 데이터 조회
export interface DashboardStats {
  totalUsers: number
  activeUsers: number
  totalCampaigns: number
  activeCampaigns: number
  dailyRevenue: number
  monthlyRevenue: number
  pendingWithdrawals: number
  systemUptime: number
}

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // 여러 쿼리를 병렬로 실행
    const [
      usersResult,
      campaignsResult,
      transactionsResult
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('campaigns').select('*', { count: 'exact', head: true }),
      supabase.from('transactions').select('amount').eq('status', 'completed')
    ])

    // 통계 계산
    const totalUsers = usersResult.count || 0
    const totalCampaigns = campaignsResult.count || 0
    const totalRevenue = transactionsResult.data?.reduce((sum, t) => sum + t.amount, 0) || 0

    return {
      totalUsers,
      activeUsers: Math.floor(totalUsers * 0.7), // 예시
      totalCampaigns,
      activeCampaigns: Math.floor(totalCampaigns * 0.3), // 예시
      dailyRevenue: totalRevenue * 0.1, // 예시
      monthlyRevenue: totalRevenue * 0.8, // 예시
      pendingWithdrawals: 15600000, // 예시
      systemUptime: 99.8 // 예시
    }
  } catch (error) {
    console.error('Get dashboard stats error:', error)
    // 오류 시 기본값 반환
    return {
      totalUsers: 0,
      activeUsers: 0,
      totalCampaigns: 0,
      activeCampaigns: 0,
      dailyRevenue: 0,
      monthlyRevenue: 0,
      pendingWithdrawals: 0,
      systemUptime: 0
    }
  }
}

// 관리자 활동 로그
export async function logAdminActivity(
  adminId: string,
  action: string,
  description: string,
  metadata?: any
): Promise<void> {
  try {
    await supabase
      .from('admin_activity_logs')
      .insert({
        admin_id: adminId,
        action,
        description,
        metadata,
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Log admin activity error:', error)
  }
}

// 관리자 활동 로그 조회
export async function getAdminActivityLogs(params: {
  page?: number
  limit?: number
  adminId?: string
  action?: string
  dateFrom?: string
  dateTo?: string
}): Promise<{ logs: any[]; total: number }> {
  try {
    let query = supabase
      .from('admin_activity_logs')
      .select('*', { count: 'exact' })

    // 필터 적용
    if (params.adminId) {
      query = query.eq('admin_id', params.adminId)
    }

    if (params.action) {
      query = query.eq('action', params.action)
    }

    if (params.dateFrom) {
      query = query.gte('created_at', params.dateFrom)
    }

    if (params.dateTo) {
      query = query.lte('created_at', params.dateTo)
    }

    // 페이지네이션
    const page = params.page || 1
    const limit = params.limit || 50
    const from = (page - 1) * limit
    const to = from + limit - 1

    query = query.range(from, to).order('created_at', { ascending: false })

    const { data, count, error } = await query

    if (error) throw error

    return {
      logs: data || [],
      total: count || 0
    }
  } catch (error) {
    console.error('Get admin activity logs error:', error)
    return { logs: [], total: 0 }
  }
}