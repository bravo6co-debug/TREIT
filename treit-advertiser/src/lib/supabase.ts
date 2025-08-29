import type { Database } from '../../../types/supabase'
import { SecureSupabaseClient, SecureDataAccess, SessionSecurity } from '@shared/supabase-security'
import { initializeEnv } from '@shared/env-validation'

// 환경변수 초기화 및 검증
const env = initializeEnv()

// 보안 강화된 Supabase 클라이언트 생성 (광고주 앱용)
export const supabase = SecureSupabaseClient.createClientInstance('advertiser')

// 세션 보안 관리
export const sessionSecurity = SessionSecurity

// 데이터 접근 로그
export const secureDataAccess = SecureDataAccess

// Auth helper functions (same as user app)
export const auth = {
  // Sign up new advertiser
  signUp: async (email: string, password: string, userData?: { full_name?: string; company_name?: string }) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            ...userData,
            user_type: 'advertiser'
          }
        }
      })
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Advertiser sign up error:', error)
      return { data: null, error }
    }
  },

  // Sign in user
  signIn: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Sign in error:', error)
      return { data: null, error }
    }
  },

  // Sign in with Google
  signInWithGoogle: async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        }
      })
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Google sign in error:', error)
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

// Database helper functions for advertiser app
export const db = {
  // Advertiser operations
  advertisers: {
    // Get advertiser profile
    getProfile: async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('advertiser_profiles')
          .select('*')
          .eq('id', userId)
          .single()
        
        if (error) throw error
        return { data, error: null }
      } catch (error) {
        console.error('Get advertiser profile error:', error)
        return { data: null, error }
      }
    },

    // Create advertiser profile
    createProfile: async (userId: string, profileData: Omit<Database['public']['Tables']['advertiser_profiles']['Insert'], 'id'>) => {
      try {
        const { data, error } = await supabase
          .from('advertiser_profiles')
          .insert({
            id: userId,
            ...profileData
          })
          .select()
          .single()
        
        if (error) throw error
        return { data, error: null }
      } catch (error) {
        console.error('Create advertiser profile error:', error)
        return { data: null, error }
      }
    },

    // Update advertiser profile
    updateProfile: async (advertiserId: string, updates: Partial<Database['public']['Tables']['advertiser_profiles']['Update']>) => {
      try {
        const { data, error } = await supabase
          .from('advertiser_profiles')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', advertiserId)
          .select()
          .single()
        
        if (error) throw error
        return { data, error: null }
      } catch (error) {
        console.error('Update advertiser profile error:', error)
        return { data: null, error }
      }
    }
  },

  // Campaign operations
  campaigns: {
    // Get advertiser's campaigns
    getAdvertiserCampaigns: async (advertiserId: string, limit = 20, offset = 0) => {
      try {
        const { data, error } = await supabase
          .from('campaigns')
          .select('*')
          .eq('advertiser_id', advertiserId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)
        
        if (error) throw error
        return { data, error: null }
      } catch (error) {
        console.error('Get advertiser campaigns error:', error)
        return { data: null, error }
      }
    },

    // Create new campaign
    createCampaign: async (campaignData: Database['public']['Tables']['campaigns']['Insert']) => {
      try {
        const { data, error } = await supabase
          .from('campaigns')
          .insert(campaignData)
          .select()
          .single()
        
        if (error) throw error
        return { data, error: null }
      } catch (error) {
        console.error('Create campaign error:', error)
        return { data: null, error }
      }
    },

    // Update campaign
    updateCampaign: async (campaignId: string, updates: Partial<Database['public']['Tables']['campaigns']['Update']>) => {
      try {
        const { data, error } = await supabase
          .from('campaigns')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', campaignId)
          .select()
          .single()
        
        if (error) throw error
        return { data, error: null }
      } catch (error) {
        console.error('Update campaign error:', error)
        return { data: null, error }
      }
    },

    // Delete campaign
    deleteCampaign: async (campaignId: string) => {
      try {
        const { error } = await supabase
          .from('campaigns')
          .delete()
          .eq('id', campaignId)
        
        if (error) throw error
        return { error: null }
      } catch (error) {
        console.error('Delete campaign error:', error)
        return { error }
      }
    },

    // Get campaign analytics
    getCampaignAnalytics: async (campaignId: string, startDate?: string, endDate?: string) => {
      try {
        let query = supabase
          .from('clicks')
          .select(`
            *,
            campaigns(title, cost_per_click)
          `)
          .eq('campaign_id', campaignId)
        
        if (startDate) {
          query = query.gte('clicked_at', startDate)
        }
        
        if (endDate) {
          query = query.lte('clicked_at', endDate)
        }
        
        const { data, error } = await query.order('clicked_at', { ascending: false })
        
        if (error) throw error
        return { data, error: null }
      } catch (error) {
        console.error('Get campaign analytics error:', error)
        return { data: null, error }
      }
    }
  },

  // Transaction operations for advertisers
  transactions: {
    // Get advertiser transactions
    getAdvertiserTransactions: async (userId: string, limit = 20, offset = 0) => {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .in('type', ['deposit', 'payment', 'refund'])
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)
        
        if (error) throw error
        return { data, error: null }
      } catch (error) {
        console.error('Get advertiser transactions error:', error)
        return { data: null, error }
      }
    },

    // Add funds to advertiser account
    addFunds: async (userId: string, amount: number, description: string, referenceId?: string) => {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .insert({
            user_id: userId,
            type: 'deposit',
            amount: amount,
            description: description,
            status: 'pending',
            reference_id: referenceId
          })
          .select()
          .single()
        
        if (error) throw error
        return { data, error: null }
      } catch (error) {
        console.error('Add funds error:', error)
        return { data: null, error }
      }
    }
  }
}

// Storage helpers for advertiser app
export const storage = {
  // Upload campaign assets
  uploadCampaignAsset: async (campaignId: string, file: File, assetType: string) => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${campaignId}/${assetType}_${Date.now()}.${fileExt}`
      
      const { data, error } = await supabase.storage
        .from('campaign-assets')
        .upload(fileName, file)
      
      if (error) throw error
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('campaign-assets')
        .getPublicUrl(fileName)
      
      return { data: { path: data.path, publicUrl }, error: null }
    } catch (error) {
      console.error('Upload campaign asset error:', error)
      return { data: null, error }
    }
  },

  // Upload business documents
  uploadBusinessDocument: async (advertiserId: string, file: File, documentType: string) => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${advertiserId}/${documentType}_${Date.now()}.${fileExt}`
      
      const { data, error } = await supabase.storage
        .from('business-documents')
        .upload(fileName, file)
      
      if (error) throw error
      
      return { data, error: null }
    } catch (error) {
      console.error('Upload business document error:', error)
      return { data: null, error }
    }
  }
}

// Realtime subscriptions for advertiser app
export const realtime = {
  // Subscribe to campaign clicks
  subscribeToCampaignClicks: (campaignId: string, callback: (payload: any) => void) => {
    return supabase
      .channel(`campaign_clicks_${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'clicks',
          filter: `campaign_id=eq.${campaignId}`
        },
        callback
      )
      .subscribe()
  },

  // Subscribe to all campaign clicks for an advertiser
  subscribeToAdvertiserClicks: (advertiserId: string, callback: (payload: any) => void) => {
    return supabase
      .channel(`advertiser_clicks_${advertiserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'clicks',
          filter: `advertiser_id=eq.${advertiserId}`
        },
        callback
      )
      .subscribe()
  },

  // Subscribe to campaign status changes
  subscribeToCampaignUpdates: (campaignId: string, callback: (payload: any) => void) => {
    return supabase
      .channel(`campaign_updates_${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'campaigns',
          filter: `id=eq.${campaignId}`
        },
        callback
      )
      .subscribe()
  },

  // Subscribe to all campaigns for an advertiser
  subscribeToAdvertiserCampaigns: (advertiserId: string, callback: (payload: any) => void) => {
    return supabase
      .channel(`advertiser_campaigns_${advertiserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campaigns',
          filter: `advertiser_id=eq.${advertiserId}`
        },
        callback
      )
      .subscribe()
  },

  // Subscribe to advertiser transactions
  subscribeToAdvertiserTransactions: (userId: string, callback: (payload: any) => void) => {
    return supabase
      .channel(`advertiser_transactions_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe()
  },

  // Subscribe to budget alerts
  subscribeToBudgetAlerts: (advertiserId: string, callback: (payload: any) => void) => {
    return supabase
      .channel(`budget_alerts_${advertiserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'budget_alerts',
          filter: `advertiser_id=eq.${advertiserId}`
        },
        callback
      )
      .subscribe()
  },

  // Subscribe to system notifications
  subscribeToNotifications: (userId: string, callback: (payload: any) => void) => {
    return supabase
      .channel(`notifications_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe()
  },

  // Subscribe to real-time analytics
  subscribeToAnalytics: (campaignId: string, callback: (payload: any) => void) => {
    return supabase
      .channel(`analytics_${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'campaign_analytics',
          filter: `campaign_id=eq.${campaignId}`
        },
        callback
      )
      .subscribe()
  },

  // Subscribe to payment status updates
  subscribeToPaymentUpdates: (userId: string, callback: (payload: any) => void) => {
    return supabase
      .channel(`payment_updates_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe()
  },

  // Generic subscription for custom channels
  subscribeToChannel: (
    channelName: string, 
    table: string, 
    event: 'INSERT' | 'UPDATE' | 'DELETE' | '*',
    filter: string | null,
    callback: (payload: any) => void
  ) => {
    const channel = supabase.channel(channelName)
    
    const config: any = {
      event,
      schema: 'public',
      table
    }
    
    if (filter) {
      config.filter = filter
    }
    
    return channel
      .on('postgres_changes', config, callback)
      .subscribe()
  },

  // Presence tracking for real-time collaboration
  trackPresence: (
    channelName: string,
    userInfo: { userId: string; userName: string; userType?: string },
    onPresenceChange?: (presence: any) => void
  ) => {
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userInfo.userId
        }
      }
    })

    // Track user presence
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          user_id: userInfo.userId,
          user_name: userInfo.userName,
          user_type: userInfo.userType || 'advertiser',
          online_at: new Date().toISOString()
        })
      }
    })

    // Listen to presence changes
    if (onPresenceChange) {
      channel.on('presence', { event: 'sync' }, () => {
        const presence = channel.presenceState()
        onPresenceChange(presence)
      })

      channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences)
        const presence = channel.presenceState()
        onPresenceChange(presence)
      })

      channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences)
        const presence = channel.presenceState()
        onPresenceChange(presence)
      })
    }

    return channel
  },

  // Real-time broadcast for instant messaging
  subscribeToBroadcast: (
    channelName: string,
    eventName: string,
    callback: (payload: any) => void
  ) => {
    return supabase
      .channel(channelName)
      .on('broadcast', { event: eventName }, callback)
      .subscribe()
  },

  // Send broadcast message
  sendBroadcast: (channelName: string, eventName: string, payload: any) => {
    const channel = supabase.channel(channelName)
    return channel.send({
      type: 'broadcast',
      event: eventName,
      payload
    })
  }
}

export default supabase