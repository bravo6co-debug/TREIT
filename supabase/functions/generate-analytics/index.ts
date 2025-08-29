import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AnalyticsData {
  totalUsers: number
  totalAdvertisers: number
  totalCampaigns: number
  totalClicks: number
  totalRevenue: number
  averageCPC: number
  topPerformingCampaigns: any[]
  userGrowth: any[]
  revenueGrowth: any[]
  clicksByDay: any[]
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header from the request
    const authHeader = req.headers.get('authorization')
    
    // Check if auth header exists
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    // Get user from auth token
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('user_type')
      .eq('id', user.id)
      .single()

    if (userError || userData?.user_type !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Access denied. Admin privileges required.' }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const { startDate, endDate, granularity = 'day' } = await req.json()

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const end = endDate ? new Date(endDate) : new Date()

    const analytics: AnalyticsData = {
      totalUsers: 0,
      totalAdvertisers: 0,
      totalCampaigns: 0,
      totalClicks: 0,
      totalRevenue: 0,
      averageCPC: 0,
      topPerformingCampaigns: [],
      userGrowth: [],
      revenueGrowth: [],
      clicksByDay: []
    }

    // Get total counts
    const [usersCount, advertisersCount, campaignsCount, clicksData] = await Promise.all([
      supabaseClient.from('users').select('id', { count: 'exact' }),
      supabaseClient.from('advertisers').select('id', { count: 'exact' }),
      supabaseClient.from('campaigns').select('id', { count: 'exact' }),
      supabaseClient
        .from('clicks')
        .select('reward_amount, clicked_at')
        .eq('is_valid', true)
        .gte('clicked_at', start.toISOString())
        .lte('clicked_at', end.toISOString())
    ])

    analytics.totalUsers = usersCount.count || 0
    analytics.totalAdvertisers = advertisersCount.count || 0
    analytics.totalCampaigns = campaignsCount.count || 0
    analytics.totalClicks = clicksData.data?.length || 0
    analytics.totalRevenue = clicksData.data?.reduce((sum, click) => sum + Number(click.reward_amount), 0) || 0
    analytics.averageCPC = analytics.totalClicks > 0 ? analytics.totalRevenue / analytics.totalClicks : 0

    // Get top performing campaigns
    const { data: topCampaigns, error: topCampaignsError } = await supabaseClient
      .from('campaigns')
      .select(`
        id, 
        title, 
        total_clicks, 
        total_spent, 
        conversion_rate,
        advertisers(company_name)
      `)
      .order('total_clicks', { ascending: false })
      .limit(10)

    if (!topCampaignsError && topCampaigns) {
      analytics.topPerformingCampaigns = topCampaigns
    }

    // Get user growth over time
    const { data: userGrowthData, error: userGrowthError } = await supabaseClient
      .from('users')
      .select('created_at')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: true })

    if (!userGrowthError && userGrowthData) {
      // Group users by day/week/month based on granularity
      const growthMap = new Map()
      
      userGrowthData.forEach(user => {
        const date = new Date(user.created_at)
        let key: string
        
        if (granularity === 'hour') {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`
        } else if (granularity === 'week') {
          const startOfWeek = new Date(date)
          startOfWeek.setDate(date.getDate() - date.getDay())
          key = startOfWeek.toISOString().split('T')[0]
        } else if (granularity === 'month') {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        } else {
          key = date.toISOString().split('T')[0]
        }
        
        growthMap.set(key, (growthMap.get(key) || 0) + 1)
      })
      
      analytics.userGrowth = Array.from(growthMap.entries()).map(([date, count]) => ({
        date,
        count
      }))
    }

    // Get revenue growth over time
    if (clicksData.data) {
      const revenueMap = new Map()
      
      clicksData.data.forEach(click => {
        const date = new Date(click.clicked_at)
        let key: string
        
        if (granularity === 'hour') {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`
        } else if (granularity === 'week') {
          const startOfWeek = new Date(date)
          startOfWeek.setDate(date.getDate() - date.getDay())
          key = startOfWeek.toISOString().split('T')[0]
        } else if (granularity === 'month') {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        } else {
          key = date.toISOString().split('T')[0]
        }
        
        const current = revenueMap.get(key) || { revenue: 0, clicks: 0 }
        current.revenue += Number(click.reward_amount)
        current.clicks += 1
        revenueMap.set(key, current)
      })
      
      analytics.revenueGrowth = Array.from(revenueMap.entries()).map(([date, data]) => ({
        date,
        revenue: data.revenue,
        clicks: data.clicks
      }))
      
      analytics.clicksByDay = analytics.revenueGrowth.map(item => ({
        date: item.date,
        clicks: item.clicks
      }))
    }

    // Get additional metrics
    const { data: campaignStats, error: campaignStatsError } = await supabaseClient
      .rpc('get_campaign_performance_stats', {
        start_date: start.toISOString(),
        end_date: end.toISOString()
      })

    // Cache the analytics data for faster subsequent requests
    const cacheKey = `analytics_${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}_${granularity}`
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: analytics,
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
          granularity
        },
        generated_at: new Date().toISOString()
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
        },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in generate-analytics function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})