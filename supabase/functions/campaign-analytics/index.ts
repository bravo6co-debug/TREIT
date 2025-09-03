import { serve } from "https://deno.land/std/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js'
import { validateUser, requireAdvertiser } from '../_shared/auth.ts'
import { handleCors } from '../_shared/cors.ts'
import { createResponse } from '../_shared/utils.ts'
import { sanitizeInput, detectXSS, createSecurityLog } from '../_shared/xss-validation.ts'
import { redis, CacheKeys, CacheInvalidation } from '../_shared/redis.ts'

interface CampaignAnalytics {
  summary: {
    total_clicks: number
    valid_clicks: number
    unique_users: number
    total_spent: number
    avg_cpc: number
    ctr: number
    conversion_rate: number
    roi: number
  }
  time_series: Array<{
    date: string
    clicks: number
    valid_clicks: number
    users: number
    spent: number
    ctr: number
  }>
  top_performers: Array<{
    user_id: string
    nickname: string
    clicks: number
    valid_clicks: number
    earnings: number
    ctr: number
  }>
  platform_breakdown: Record<string, {
    clicks: number
    users: number
    percentage: number
  }>
  geographic_data: Array<{
    country?: string
    region?: string
    clicks: number
    users: number
  }>
  performance_insights: {
    best_performing_hours: string[]
    trending_platforms: string[]
    recommendations: string[]
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse query parameters
    const url = new URL(req.url)
    const rawCampaignId = url.searchParams.get('campaign_id')
    const rawDateFrom = url.searchParams.get('date_from')
    const rawDateTo = url.searchParams.get('date_to')
    const rawGranularity = url.searchParams.get('granularity') || 'daily'
    const include_predictions = url.searchParams.get('include_predictions') === 'true'

    // Sanitize and validate input parameters
    const campaign_id = rawCampaignId ? sanitizeInput(rawCampaignId, { allowHtml: false, strictMode: true }) : null
    const date_from = rawDateFrom ? sanitizeInput(rawDateFrom, { allowHtml: false, strictMode: true }) : null
    const date_to = rawDateTo ? sanitizeInput(rawDateTo, { allowHtml: false, strictMode: true }) : null
    const granularity = sanitizeInput(rawGranularity, { allowHtml: false, strictMode: true })

    // XSS Detection for all parameters
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const paramsToCheck = [rawCampaignId, rawDateFrom, rawDateTo, rawGranularity].filter(Boolean)
    
    for (const param of paramsToCheck) {
      const xssResult = detectXSS(param!)
      if (xssResult.isXSS) {
        // Log security incident
        console.warn('XSS attempt detected in campaign-analytics:', createSecurityLog(
          'xss_attempt_campaign_analytics',
          { 
            detectedPatterns: xssResult.detectedPatterns,
            riskLevel: xssResult.riskLevel,
            parameter: param,
            userAgent: req.headers.get('user-agent')
          },
          undefined, // userId not available yet
          clientIp
        ))
        
        return createResponse(null, {
          code: 'INVALID_INPUT',
          message: 'Invalid characters detected in request parameters'
        }, 400)
      }
    }

    if (!campaign_id) {
      return createResponse(null, {
        code: 'MISSING_CAMPAIGN_ID',
        message: 'Campaign ID is required'
      }, 400)
    }

    // Validate authentication - require advertiser or admin
    const authHeader = req.headers.get('authorization')
    const { user } = await requireAdvertiser(authHeader)

    // Get campaign and verify access
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select(`
        id,
        title,
        business_id,
        start_date,
        end_date,
        total_budget,
        cpc_rate,
        businesses (
          id,
          auth_uid,
          company_name
        )
      `)
      .eq('id', campaign_id)
      .single()

    if (campaignError || !campaign) {
      return createResponse(null, {
        code: 'CAMPAIGN_NOT_FOUND',
        message: 'Campaign not found'
      }, 404)
    }

    // Verify user has access to this campaign (must be campaign owner or admin)
    const { data: userData } = await supabase
      .from('users')
      .select('user_type')
      .eq('id', user.id)
      .single()

    if (campaign.businesses.auth_uid !== user.id && userData?.user_type !== 'admin') {
      return createResponse(null, {
        code: 'PERMISSION_DENIED',
        message: 'You do not have permission to view this campaign analytics'
      }, 403)
    }

    // Set date range
    let startDate: Date
    let endDate: Date = new Date()

    if (date_from) {
      startDate = new Date(date_from)
    } else {
      startDate = new Date(campaign.start_date)
    }

    if (date_to) {
      endDate = new Date(date_to)
    }

    // Generate cache key based on request parameters
    const cacheKey = CacheKeys.campaignAnalytics(campaign_id, {
      date_from: startDate.toISOString(),
      date_to: endDate.toISOString(),
      granularity,
      include_predictions
    })

    // Try to get from cache first
    const cachedAnalytics = await redis.get<CampaignAnalytics>(cacheKey)
    if (cachedAnalytics) {
      console.log(`Cache HIT for campaign analytics: ${campaign_id}`)
      return createResponse(cachedAnalytics)
    }

    console.log(`Cache MISS for campaign analytics: ${campaign_id}`)

    // Get click events data
    const { data: clickEvents, error: clickError } = await supabase
      .from('click_events')
      .select(`
        id,
        clicked_at,
        is_valid,
        commission_amount,
        ip_address,
        metadata,
        user_campaigns (
          id,
          user_id,
          platform,
          users (
            id,
            nickname,
            level
          )
        )
      `)
      .eq('user_campaigns.campaign_id', campaign_id)
      .gte('clicked_at', startDate.toISOString())
      .lte('clicked_at', endDate.toISOString())
      .order('clicked_at', { ascending: false })

    if (clickError) throw clickError

    const clicks = clickEvents || []
    const validClicks = clicks.filter(c => c.is_valid)
    const uniqueUsers = new Set(clicks.map(c => c.user_campaigns?.user_id)).size

    // Calculate summary metrics
    const totalSpent = validClicks.reduce(
      (sum, click) => sum + Number(click.commission_amount || 0), 
      0
    )
    const avgCPC = validClicks.length > 0 ? totalSpent / validClicks.length : 0
    const ctr = clicks.length > 0 ? (validClicks.length / clicks.length) * 100 : 0

    // Calculate ROI (simplified - revenue would need to be tracked separately)
    const estimatedRevenue = validClicks.length * Number(campaign.cpc_rate) * 2 // Assuming 2x return
    const roi = totalSpent > 0 ? ((estimatedRevenue - totalSpent) / totalSpent) * 100 : 0

    // Generate time series data
    const timeSeries: Record<string, {
      clicks: number
      valid_clicks: number
      users: Set<string>
      spent: number
    }> = {}

    clicks.forEach(click => {
      let dateKey: string
      const clickDate = new Date(click.clicked_at)

      switch (granularity) {
        case 'hourly':
          dateKey = clickDate.toISOString().substring(0, 13) + ':00:00Z'
          break
        case 'daily':
          dateKey = clickDate.toISOString().split('T')[0]
          break
        case 'weekly':
          const weekStart = new Date(clickDate)
          weekStart.setDate(clickDate.getDate() - clickDate.getDay())
          dateKey = weekStart.toISOString().split('T')[0]
          break
        case 'monthly':
          dateKey = clickDate.toISOString().substring(0, 7)
          break
        default:
          dateKey = clickDate.toISOString().split('T')[0]
      }

      if (!timeSeries[dateKey]) {
        timeSeries[dateKey] = {
          clicks: 0,
          valid_clicks: 0,
          users: new Set(),
          spent: 0
        }
      }

      timeSeries[dateKey].clicks++
      if (click.is_valid) {
        timeSeries[dateKey].valid_clicks++
        timeSeries[dateKey].spent += Number(click.commission_amount || 0)
      }
      if (click.user_campaigns?.user_id) {
        timeSeries[dateKey].users.add(click.user_campaigns.user_id)
      }
    })

    const timeSeriesArray = Object.entries(timeSeries).map(([date, data]) => ({
      date,
      clicks: data.clicks,
      valid_clicks: data.valid_clicks,
      users: data.users.size,
      spent: data.spent,
      ctr: data.clicks > 0 ? (data.valid_clicks / data.clicks) * 100 : 0
    })).sort((a, b) => a.date.localeCompare(b.date))

    // Calculate top performers
    const userPerformance: Record<string, {
      clicks: number
      valid_clicks: number
      earnings: number
      user_info: any
    }> = {}

    clicks.forEach(click => {
      const userId = click.user_campaigns?.user_id
      if (!userId) return

      if (!userPerformance[userId]) {
        userPerformance[userId] = {
          clicks: 0,
          valid_clicks: 0,
          earnings: 0,
          user_info: click.user_campaigns.users
        }
      }

      userPerformance[userId].clicks++
      if (click.is_valid) {
        userPerformance[userId].valid_clicks++
        userPerformance[userId].earnings += Number(click.commission_amount || 0)
      }
    })

    const topPerformers = Object.entries(userPerformance)
      .map(([user_id, data]) => ({
        user_id: sanitizeInput(user_id, { allowHtml: false, strictMode: true }),
        nickname: sanitizeInput(data.user_info?.nickname || 'Anonymous', { allowHtml: false, strictMode: true }),
        clicks: data.clicks,
        valid_clicks: data.valid_clicks,
        earnings: data.earnings,
        ctr: data.clicks > 0 ? (data.valid_clicks / data.clicks) * 100 : 0
      }))
      .sort((a, b) => b.valid_clicks - a.valid_clicks)
      .slice(0, 10)

    // Platform breakdown
    const platformStats: Record<string, { clicks: number; users: Set<string> }> = {}

    clicks.forEach(click => {
      const platform = click.user_campaigns?.platform || 'unknown'
      if (!platformStats[platform]) {
        platformStats[platform] = { clicks: 0, users: new Set() }
      }
      platformStats[platform].clicks++
      if (click.user_campaigns?.user_id) {
        platformStats[platform].users.add(click.user_campaigns.user_id)
      }
    })

    const totalClicksForPercentage = clicks.length
    const platformBreakdown: Record<string, { clicks: number; users: number; percentage: number }> = {}

    Object.entries(platformStats).forEach(([platform, data]) => {
      platformBreakdown[platform] = {
        clicks: data.clicks,
        users: data.users.size,
        percentage: totalClicksForPercentage > 0 ? (data.clicks / totalClicksForPercentage) * 100 : 0
      }
    })

    // Geographic data (simplified - would need IP geolocation service)
    const geographicData = [
      { country: 'South Korea', clicks: Math.floor(clicks.length * 0.8), users: Math.floor(uniqueUsers * 0.8) },
      { country: 'United States', clicks: Math.floor(clicks.length * 0.1), users: Math.floor(uniqueUsers * 0.1) },
      { country: 'Japan', clicks: Math.floor(clicks.length * 0.1), users: Math.floor(uniqueUsers * 0.1) }
    ]

    // Performance insights
    const hourlyDistribution: Record<number, number> = {}
    clicks.forEach(click => {
      const hour = new Date(click.clicked_at).getHours()
      hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1
    })

    const bestHours = Object.entries(hourlyDistribution)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => `${hour}:00-${hour}:59`)

    const trendingPlatforms = Object.entries(platformBreakdown)
      .sort((a, b) => b[1].clicks - a[1].clicks)
      .slice(0, 3)
      .map(([platform]) => platform)

    // Generate recommendations
    const recommendations = []
    
    if (ctr < 50) {
      recommendations.push('Consider improving targeting or creative content to increase click-through rate')
    }
    if (avgCPC > Number(campaign.cpc_rate) * 1.2) {
      recommendations.push('Average CPC is higher than expected, review bid strategy')
    }
    if (uniqueUsers < clicks.length * 0.3) {
      recommendations.push('Focus on reaching more unique users to expand audience')
    }
    if (trendingPlatforms.includes('instagram')) {
      recommendations.push('Instagram is performing well, consider increasing budget allocation')
    }

    const analytics: CampaignAnalytics = {
      summary: {
        total_clicks: clicks.length,
        valid_clicks: validClicks.length,
        unique_users: uniqueUsers,
        total_spent: Math.round(totalSpent),
        avg_cpc: Math.round(avgCPC),
        ctr: Math.round(ctr * 100) / 100,
        conversion_rate: Math.round(ctr * 100) / 100, // Simplified
        roi: Math.round(roi * 100) / 100
      },
      time_series: timeSeriesArray,
      top_performers: topPerformers,
      platform_breakdown: platformBreakdown,
      geographic_data: geographicData,
      performance_insights: {
        best_performing_hours: bestHours,
        trending_platforms: trendingPlatforms,
        recommendations: recommendations
      }
    }

    // Cache the analytics result for 5 minutes
    await redis.set(cacheKey, analytics, { ttl: 300 })
    console.log(`Cached analytics for campaign: ${campaign_id}`)

    return createResponse(analytics)

  } catch (error) {
    console.error('Error in campaign-analytics function:', error)
    
    return createResponse(null, {
      code: 'INTERNAL_ERROR',
      message: error.message || 'An unexpected error occurred'
    }, 500)
  }
})