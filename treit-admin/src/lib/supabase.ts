import type { Database } from '../../../types/supabase'
import { SecureSupabaseClient, SecureDataAccess, SessionSecurity } from '@shared/supabase-security'
import { initializeEnv } from '@shared/env-validation'

// 환경변수 초기화 및 검증
const env = initializeEnv()

// 보안 강화된 Supabase 클라이언트 생성 (관리자 앱용)
export const supabase = SecureSupabaseClient.createClientInstance('admin')

// 세션 보안 관리
export const sessionSecurity = SessionSecurity

// 데이터 접근 로그
export const secureDataAccess = SecureDataAccess

// Admin auth helper functions
export const auth = {
  // Sign in admin user
  signIn: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) throw error
      
      // Verify admin access
      if (data.user) {
        const { data: userData, error: userError } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', data.user.id)
          .single()
        
        if (userError || (userData?.role !== 'admin' && userData?.role !== 'support')) {
          await supabase.auth.signOut()
          throw new Error('Access denied. Admin privileges required.')
        }
      }
      
      return { data, error: null }
    } catch (error) {
      console.error('Admin sign in error:', error)
      return { data: null, error }
    }
  },

  // Other auth methods...
  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      return { error: null }
    } catch (error) {
      console.error('Sign out error:', error)
      return { error }
    }
  },

  getSession: async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) throw error
      return { session, error: null }
    } catch (error) {
      console.error('Get session error:', error)
      return { session: null, error }
    }
  },

  getUser: async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) throw error
      return { user, error: null }
    } catch (error) {
      console.error('Get user error:', error)
      return { user: null, error }
    }
  }
}

// Database helper functions for admin app
export const db = {
  // User management
  users: {
    // Get all users with pagination
    getUsers: async (limit = 50, offset = 0, searchTerm?: string) => {
      try {
        let query = supabase
          .from('user_profiles')
          .select(`
            *,
            user_levels(level_number, level_name, tier_multiplier)
          `)
        
        if (searchTerm) {
          query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        }
        
        const { data, error } = await query
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)
        
        if (error) throw error
        return { data, error: null }
      } catch (error) {
        console.error('Get users error:', error)
        return { data: null, error }
      }
    },

    // Get user by ID
    getUser: async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select(`
            *,
            user_levels(level_number, level_name, tier_multiplier)
          `)
          .eq('id', userId)
          .single()
        
        if (error) throw error
        return { data, error: null }
      } catch (error) {
        console.error('Get user error:', error)
        return { data: null, error }
      }
    },

    // Update user
    updateUser: async (userId: string, updates: Partial<Database['public']['Tables']['users']['Update']>) => {
      try {
        const { data, error } = await supabase
          .from('users')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', userId)
          .select()
          .single()
        
        if (error) throw error
        return { data, error: null }
      } catch (error) {
        console.error('Update user error:', error)
        return { data: null, error }
      }
    },

    // Ban/unban user
    banUser: async (userId: string, banned: boolean) => {
      try {
        const { data, error } = await supabase
          .from('users')
          .update({ 
            is_active: !banned,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
          .select()
          .single()
        
        if (error) throw error
        return { data, error: null }
      } catch (error) {
        console.error('Ban user error:', error)
        return { data: null, error }
      }
    },

    // Get user statistics
    getUserStats: async () => {
      try {
        const { data: totalUsers, error: totalError } = await supabase
          .from('users')
          .select('id', { count: 'exact' })
        
        const { data: activeUsers, error: activeError } = await supabase
          .from('users')
          .select('id', { count: 'exact' })
          .eq('is_active', true)
        
        const { data: advertisers, error: advertiserError } = await supabase
          .from('users')
          .select('id', { count: 'exact' })
          .eq('user_type', 'advertiser')
        
        if (totalError || activeError || advertiserError) {
          throw totalError || activeError || advertiserError
        }
        
        return {
          data: {
            total: totalUsers?.length || 0,
            active: activeUsers?.length || 0,
            advertisers: advertisers?.length || 0
          },
          error: null
        }
      } catch (error) {
        console.error('Get user stats error:', error)
        return { data: null, error }
      }
    }
  },

  // Advertiser management
  advertisers: {
    // Get all advertisers
    getAdvertisers: async (limit = 50, offset = 0, searchTerm?: string) => {
      try {
        let query = supabase
          .from('advertisers')
          .select(`
            *,
            users(full_name, email, is_active)
          `)
        
        if (searchTerm) {
          query = query.or(`company_name.ilike.%${searchTerm}%`)
        }
        
        const { data, error } = await query
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)
        
        if (error) throw error
        return { data, error: null }
      } catch (error) {
        console.error('Get advertisers error:', error)
        return { data: null, error }
      }
    },

    // Update advertiser verification status
    updateVerificationStatus: async (advertiserId: string, status: 'pending' | 'verified' | 'rejected') => {
      try {
        const { data, error } = await supabase
          .from('advertisers')
          .update({ 
            verification_status: status,
            updated_at: new Date().toISOString()
          })
          .eq('id', advertiserId)
          .select()
          .single()
        
        if (error) throw error
        return { data, error: null }
      } catch (error) {
        console.error('Update verification status error:', error)
        return { data: null, error }
      }
    }
  },

  // Campaign management
  campaigns: {
    // Get all campaigns
    getCampaigns: async (limit = 50, offset = 0, status?: string, searchTerm?: string) => {
      try {
        let query = supabase
          .from('campaigns')
          .select(`
            *,
            advertisers(company_name, users(full_name, email))
          `)
        
        if (status) {
          query = query.eq('status', status)
        }
        
        if (searchTerm) {
          query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        }
        
        const { data, error } = await query
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)
        
        if (error) throw error
        return { data, error: null }
      } catch (error) {
        console.error('Get campaigns error:', error)
        return { data: null, error }
      }
    },

    // Update campaign status
    updateCampaignStatus: async (campaignId: string, status: 'draft' | 'active' | 'paused' | 'completed' | 'rejected') => {
      try {
        const { data, error } = await supabase
          .from('campaigns')
          .update({ 
            status: status,
            updated_at: new Date().toISOString()
          })
          .eq('id', campaignId)
          .select()
          .single()
        
        if (error) throw error
        return { data, error: null }
      } catch (error) {
        console.error('Update campaign status error:', error)
        return { data: null, error }
      }
    },

    // Get campaign statistics
    getCampaignStats: async () => {
      try {
        const { data: totalCampaigns, error: totalError } = await supabase
          .from('campaigns')
          .select('id', { count: 'exact' })
        
        const { data: activeCampaigns, error: activeError } = await supabase
          .from('campaigns')
          .select('id', { count: 'exact' })
          .eq('status', 'active')
        
        const { data: pendingCampaigns, error: pendingError } = await supabase
          .from('campaigns')
          .select('id', { count: 'exact' })
          .eq('status', 'draft')
        
        if (totalError || activeError || pendingError) {
          throw totalError || activeError || pendingError
        }
        
        return {
          data: {
            total: totalCampaigns?.length || 0,
            active: activeCampaigns?.length || 0,
            pending: pendingCampaigns?.length || 0
          },
          error: null
        }
      } catch (error) {
        console.error('Get campaign stats error:', error)
        return { data: null, error }
      }
    }
  },

  // Transaction management
  transactions: {
    // Get all transactions
    getTransactions: async (limit = 50, offset = 0, type?: string, status?: string) => {
      try {
        let query = supabase
          .from('transactions')
          .select(`
            *,
            users(full_name, email)
          `)
        
        if (type) {
          query = query.eq('type', type)
        }
        
        if (status) {
          query = query.eq('status', status)
        }
        
        const { data, error } = await query
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)
        
        if (error) throw error
        return { data, error: null }
      } catch (error) {
        console.error('Get transactions error:', error)
        return { data: null, error }
      }
    },

    // Update transaction status
    updateTransactionStatus: async (transactionId: string, status: 'pending' | 'completed' | 'failed') => {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .update({ 
            status: status,
            updated_at: new Date().toISOString()
          })
          .eq('id', transactionId)
          .select()
          .single()
        
        if (error) throw error
        return { data, error: null }
      } catch (error) {
        console.error('Update transaction status error:', error)
        return { data: null, error }
      }
    },

    // Get transaction statistics
    getTransactionStats: async () => {
      try {
        const { data: totalTransactions, error: totalError } = await supabase
          .from('transactions')
          .select('amount')
        
        const { data: pendingWithdrawals, error: pendingError } = await supabase
          .from('transactions')
          .select('amount')
          .eq('type', 'withdrawal')
          .eq('status', 'pending')
        
        if (totalError || pendingError) {
          throw totalError || pendingError
        }
        
        const totalVolume = totalTransactions?.reduce((sum, t) => sum + t.amount, 0) || 0
        const pendingWithdrawalAmount = pendingWithdrawals?.reduce((sum, t) => sum + t.amount, 0) || 0
        
        return {
          data: {
            totalVolume,
            pendingWithdrawals: pendingWithdrawalAmount,
            totalTransactions: totalTransactions?.length || 0
          },
          error: null
        }
      } catch (error) {
        console.error('Get transaction stats error:', error)
        return { data: null, error }
      }
    }
  },

  // System settings
  systemSettings: {
    // Get all settings
    getSettings: async () => {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('*')
          .order('key')
        
        if (error) throw error
        return { data, error: null }
      } catch (error) {
        console.error('Get settings error:', error)
        return { data: null, error }
      }
    },

    // Update setting
    updateSetting: async (key: string, value: any, description?: string) => {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .upsert({
            key,
            value,
            description,
            updated_at: new Date().toISOString()
          })
          .select()
          .single()
        
        if (error) throw error
        return { data, error: null }
      } catch (error) {
        console.error('Update setting error:', error)
        return { data: null, error }
      }
    }
  }
}

// Analytics and reporting functions
export const analytics = {
  // Get dashboard overview
  getDashboardOverview: async () => {
    try {
      const [userStats, campaignStats, transactionStats] = await Promise.all([
        db.users.getUserStats(),
        db.campaigns.getCampaignStats(),
        db.transactions.getTransactionStats()
      ])
      
      if (userStats.error || campaignStats.error || transactionStats.error) {
        throw userStats.error || campaignStats.error || transactionStats.error
      }
      
      return {
        data: {
          users: userStats.data,
          campaigns: campaignStats.data,
          transactions: transactionStats.data
        },
        error: null
      }
    } catch (error) {
      console.error('Get dashboard overview error:', error)
      return { data: null, error }
    }
  },

  // Get revenue analytics
  getRevenueAnalytics: async (startDate: string, endDate: string) => {
    try {
      const { data, error } = await supabase
        .from('clicks')
        .select(`
          clicked_at,
          reward_amount,
          campaigns(cost_per_click)
        `)
        .gte('clicked_at', startDate)
        .lte('clicked_at', endDate)
        .eq('is_valid', true)
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Get revenue analytics error:', error)
      return { data: null, error }
    }
  }
}

// Realtime subscriptions for admin app
export const realtime = {
  // Subscribe to all system activity
  subscribeToSystemActivity: (callback: (payload: any) => void) => {
    return supabase
      .channel('system_activity')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: 'status=eq.pending'
        },
        callback
      )
      .subscribe()
  },

  // Subscribe to new user registrations
  subscribeToNewUsers: (callback: (payload: any) => void) => {
    return supabase
      .channel('new_users')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'users'
        },
        callback
      )
      .subscribe()
  }
}

export default supabase