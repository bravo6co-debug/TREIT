import { supabase } from '../supabase'
import type { Campaign, CampaignFormData, CampaignAnalytics, CampaignFilters } from '../../types/campaign'

export const campaignApi = {
  // Get all campaigns for an advertiser
  getCampaigns: async (advertiserId: string, filters?: CampaignFilters) => {
    try {
      let query = supabase
        .from('campaigns')
        .select(`
          *,
          campaign_templates(*)
        `)
        .eq('business_id', advertiserId)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status)
      }

      if (filters?.start_date) {
        query = query.gte('start_date', filters.start_date)
      }

      if (filters?.end_date) {
        query = query.lte('end_date', filters.end_date)
      }

      if (filters?.min_budget) {
        query = query.gte('budget', filters.min_budget)
      }

      if (filters?.max_budget) {
        query = query.lte('budget', filters.max_budget)
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }

      const { data, error } = await query

      if (error) throw error
      return { data: data as Campaign[], error: null }
    } catch (error) {
      console.error('Get campaigns error:', error)
      return { data: null, error }
    }
  },

  // Get single campaign by ID
  getCampaign: async (campaignId: string) => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          campaign_templates(*),
          deeplinks(*)
        `)
        .eq('id', campaignId)
        .single()

      if (error) throw error
      return { data: data as Campaign, error: null }
    } catch (error) {
      console.error('Get campaign error:', error)
      return { data: null, error }
    }
  },

  // Create new campaign
  createCampaign: async (advertiserId: string, formData: CampaignFormData) => {
    try {
      const campaignData = {
        business_id: advertiserId,
        name: formData.title,
        description: formData.description,
        destination_url: formData.original_url,
        cpc_rate: formData.cpc_rate,
        budget: formData.total_budget,
        target_clicks: formData.total_clicks_target,
        current_clicks: 0,
        spent: 0,
        is_active: false,
        approval_status: 'PENDING' as const,
        start_date: formData.start_date?.toISOString(),
        end_date: formData.end_date?.toISOString(),
        image_url: formData.image_url,
        category: 'SHOPPING' as const,
        target_demographics: {},
        target_regions: [],
        target_interests: []
      }

      const { data, error } = await supabase
        .from('campaigns')
        .insert(campaignData)
        .select()
        .single()

      if (error) throw error
      return { data: data as Campaign, error: null }
    } catch (error) {
      console.error('Create campaign error:', error)
      return { data: null, error }
    }
  },

  // Update campaign
  updateCampaign: async (campaignId: string, updates: Partial<Campaign>) => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignId)
        .select()
        .single()

      if (error) throw error
      return { data: data as Campaign, error: null }
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

  // Update campaign status
  updateCampaignStatus: async (campaignId: string, status: Campaign['status']) => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .update({ 
          status,
          updated_at: new Date().toISOString() 
        })
        .eq('id', campaignId)
        .select()
        .single()

      if (error) throw error
      return { data: data as Campaign, error: null }
    } catch (error) {
      console.error('Update campaign status error:', error)
      return { data: null, error }
    }
  },

  // Get campaign analytics
  getCampaignAnalytics: async (campaignId: string, startDate?: string, endDate?: string): Promise<{data: CampaignAnalytics | null, error: any}> => {
    try {
      // Get campaign basic info
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single()

      if (campaignError) throw campaignError

      // Build clicks query
      let clicksQuery = supabase
        .from('deeplink_clicks')
        .select(`
          *,
          deeplinks!inner(campaign_id)
        `)
        .eq('deeplinks.campaign_id', campaignId)

      if (startDate) {
        clicksQuery = clicksQuery.gte('clicked_at', startDate)
      }

      if (endDate) {
        clicksQuery = clicksQuery.lte('clicked_at', endDate)
      }

      const { data: clicks, error: clicksError } = await clicksQuery.order('clicked_at', { ascending: false })

      if (clicksError) throw clicksError

      // Process analytics data
      const totalClicks = clicks?.length || 0
      const uniqueClicks = clicks?.filter(click => click.is_unique)?.length || 0
      const totalSpent = totalClicks * campaign.cpc_rate

      // Group by date for daily stats
      const dailyStats = clicks?.reduce((acc: any, click: any) => {
        const date = new Date(click.clicked_at).toISOString().split('T')[0]
        if (!acc[date]) {
          acc[date] = { date, clicks: 0, spent: 0, unique_clicks: 0 }
        }
        acc[date].clicks += 1
        acc[date].spent += campaign.cpc_rate
        if (click.is_unique) {
          acc[date].unique_clicks += 1
        }
        return acc
      }, {})

      // Group by platform for platform stats
      const platformStats = clicks?.reduce((acc: any, click: any) => {
        const platform = click.platform || 'unknown'
        if (!acc[platform]) {
          acc[platform] = { platform, clicks: 0, spent: 0, percentage: 0 }
        }
        acc[platform].clicks += 1
        acc[platform].spent += campaign.cpc_rate
        return acc
      }, {})

      // Calculate percentages
      Object.values(platformStats || {}).forEach((stat: any) => {
        stat.percentage = totalClicks > 0 ? (stat.clicks / totalClicks) * 100 : 0
      })

      // Group by hour for hourly stats
      const hourlyStats = clicks?.reduce((acc: any, click: any) => {
        const hour = new Date(click.clicked_at).getHours()
        if (!acc[hour]) {
          acc[hour] = { hour, clicks: 0, spent: 0 }
        }
        acc[hour].clicks += 1
        acc[hour].spent += campaign.cpc_rate
        return acc
      }, {})

      const analytics: CampaignAnalytics = {
        campaign_id: campaignId,
        total_clicks: totalClicks,
        total_spent: totalSpent,
        average_ctr: 0, // This would need impression data
        daily_stats: Object.values(dailyStats || {}),
        platform_stats: Object.values(platformStats || {}),
        hourly_stats: Object.values(hourlyStats || {})
      }

      return { data: analytics, error: null }
    } catch (error) {
      console.error('Get campaign analytics error:', error)
      return { data: null, error }
    }
  },

  // Bulk update campaigns
  bulkUpdateCampaigns: async (campaignIds: string[], updates: Partial<Campaign>) => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .in('id', campaignIds)
        .select()

      if (error) throw error
      return { data: data as Campaign[], error: null }
    } catch (error) {
      console.error('Bulk update campaigns error:', error)
      return { data: null, error }
    }
  },

  // Get campaign performance summary
  getCampaignsSummary: async (advertiserId: string) => {
    try {
      const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('status, total_budget, current_clicks, total_clicks_target')
        .eq('business_id', advertiserId)

      if (error) throw error

      const summary = campaigns?.reduce((acc, campaign) => {
        acc.total_campaigns += 1
        acc.total_budget += campaign.total_budget || 0
        acc.total_clicks += campaign.current_clicks || 0
        acc.total_target_clicks += campaign.total_clicks_target || 0

        if (campaign.status === 'active') {
          acc.active_campaigns += 1
        } else if (campaign.status === 'completed') {
          acc.completed_campaigns += 1
        }

        return acc
      }, {
        total_campaigns: 0,
        active_campaigns: 0,
        completed_campaigns: 0,
        total_budget: 0,
        total_clicks: 0,
        total_target_clicks: 0
      })

      return { data: summary, error: null }
    } catch (error) {
      console.error('Get campaigns summary error:', error)
      return { data: null, error }
    }
  }
}