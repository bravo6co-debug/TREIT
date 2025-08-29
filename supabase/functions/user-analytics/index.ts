import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { validateUser } from '../_shared/auth.ts'
import { handleCors } from '../_shared/cors.ts'
import { createResponse } from '../_shared/utils.ts'
import { redis, CacheKeys, CacheInvalidation } from '../_shared/redis.ts'

interface UserAnalytics {
  user_metrics: {
    total_campaigns: number
    active_campaigns: number
    total_clicks: number
    valid_clicks: number
    total_earnings: number
    avg_ctr: number
    quality_score: number
    consistency_score: number
    level_progress: {
      current_level: number
      current_xp: number
      next_level_xp: number
      progress_percentage: number
    }
  }
  activity_timeline: Array<{
    date: string
    campaigns_joined: number
    clicks_generated: number
    earnings: number
  }>
  campaign_performance: Array<{
    campaign_id: string
    campaign_title: string
    platform: string
    clicks: number
    valid_clicks: number
    earnings: number
    ctr: number
    joined_at: string
  }>
  platform_insights: Record<string, {
    campaigns: number
    clicks: number
    earnings: number
    avg_ctr: number
  }>
  trend_data: {
    earnings_trend: string
    clicks_trend: string
    quality_trend: string
    activity_streak: number
  }
  recommendations: string[]
  achievements: Array<{
    id: string
    title: string
    description: string
    earned_at: string
    reward_xp: number
  }>
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
    const user_id = url.searchParams.get('user_id')
    const metric_type = url.searchParams.get('metric_type') || 'comprehensive'
    const period = url.searchParams.get('period') || '30d'

    // Validate authentication
    const authHeader = req.headers.get('authorization')
    const { user } = await validateUser(authHeader)

    // Determine target user ID (default to authenticated user)
    const targetUserId = user_id || user.id

    // Security check - users can only view their own analytics unless they're admin
    if (targetUserId !== user.id) {
      const { data: userData } = await supabase
        .from('users')
        .select('user_type')
        .eq('id', user.id)
        .single()

      if (userData?.user_type !== 'admin') {
        return createResponse(null, {
          code: 'PERMISSION_DENIED',
          message: 'You can only view your own analytics'
        }, 403)
      }
    }

    // Get target user information
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        nickname,
        level,
        xp,
        total_earnings,
        created_at,
        last_login_at,
        status
      `)
      .eq('id', targetUserId)
      .single()

    if (userError || !targetUser) {
      return createResponse(null, {
        code: 'USER_NOT_FOUND',
        message: 'User not found'
      }, 404)
    }

    // Generate cache key for user analytics
    const cacheKey = CacheKeys.userAnalytics(targetUserId, period)

    // Try to get from cache first
    const cachedAnalytics = await redis.get<UserAnalytics>(cacheKey)
    if (cachedAnalytics) {
      console.log(`Cache HIT for user analytics: ${targetUserId}`)
      return createResponse(cachedAnalytics)
    }

    console.log(`Cache MISS for user analytics: ${targetUserId}`)

    // Calculate date range based on period
    const endDate = new Date()
    let startDate = new Date()

    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7)
        break
      case '30d':
        startDate.setDate(endDate.getDate() - 30)
        break
      case '90d':
        startDate.setDate(endDate.getDate() - 90)
        break
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1)
        break
      default:
        startDate.setDate(endDate.getDate() - 30)
    }

    // Get user campaigns data
    const { data: userCampaigns, error: campaignError } = await supabase
      .from('user_campaigns')
      .select(`
        id,
        campaign_id,
        platform,
        status,
        joined_at,
        tracking_code,
        campaigns (
          id,
          title,
          category,
          cpc_rate,
          status
        )
      `)
      .eq('user_id', targetUserId)
      .gte('joined_at', startDate.toISOString())
      .order('joined_at', { ascending: false })

    if (campaignError) throw campaignError

    const campaigns = userCampaigns || []
    const activeCampaigns = campaigns.filter(c => c.status === 'active' && c.campaigns.status === 'active')

    // Get click events data
    const { data: clickEvents, error: clickError } = await supabase
      .from('click_events')
      .select(`
        id,
        clicked_at,
        is_valid,
        commission_amount,
        metadata,
        user_campaigns (
          id,
          campaign_id,
          platform,
          campaigns (
            title
          )
        )
      `)
      .eq('user_campaigns.user_id', targetUserId)
      .gte('clicked_at', startDate.toISOString())
      .order('clicked_at', { ascending: false })

    if (clickError) throw clickError

    const clicks = clickEvents || []
    const validClicks = clicks.filter(c => c.is_valid)

    // Calculate basic metrics
    const totalClicks = clicks.length
    const totalValidClicks = validClicks.length
    const totalEarnings = validClicks.reduce((sum, c) => sum + Number(c.commission_amount || 0), 0)
    const avgCTR = totalClicks > 0 ? (totalValidClicks / totalClicks) * 100 : 0

    // Calculate quality score based on various factors
    const validationScores = validClicks
      .map(c => Number(c.metadata?.validation_score) || 0.5)
      .filter(score => score > 0)
    
    const avgValidationScore = validationScores.length > 0 
      ? validationScores.reduce((sum, score) => sum + score, 0) / validationScores.length 
      : 0.5

    const qualityScore = avgValidationScore * 100

    // Calculate consistency score based on regular activity
    const dailyActivity: Record<string, number> = {}
    clicks.forEach(click => {
      const date = click.clicked_at.split('T')[0]
      dailyActivity[date] = (dailyActivity[date] || 0) + 1
    })

    const activeDays = Object.keys(dailyActivity).length
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const consistencyScore = totalDays > 0 ? (activeDays / totalDays) * 100 : 0

    // Calculate level progress
    const currentLevel = targetUser.level
    const currentXP = targetUser.xp
    const nextLevelXP = (currentLevel + 1) * 100
    const currentLevelXP = currentLevel * 100
    const progressXP = currentXP - currentLevelXP
    const neededXP = nextLevelXP - currentLevelXP
    const progressPercentage = neededXP > 0 ? (progressXP / neededXP) * 100 : 0

    // Generate activity timeline
    const timelineData: Record<string, {
      campaigns_joined: number
      clicks_generated: number
      earnings: number
    }> = {}

    campaigns.forEach(campaign => {
      const date = campaign.joined_at.split('T')[0]
      if (!timelineData[date]) {
        timelineData[date] = { campaigns_joined: 0, clicks_generated: 0, earnings: 0 }
      }
      timelineData[date].campaigns_joined++
    })

    validClicks.forEach(click => {
      const date = click.clicked_at.split('T')[0]
      if (!timelineData[date]) {
        timelineData[date] = { campaigns_joined: 0, clicks_generated: 0, earnings: 0 }
      }
      timelineData[date].clicks_generated++
      timelineData[date].earnings += Number(click.commission_amount || 0)
    })

    const activityTimeline = Object.entries(timelineData)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Generate campaign performance data
    const campaignPerformance: Record<string, {
      campaign_id: string
      campaign_title: string
      platform: string
      clicks: number
      valid_clicks: number
      earnings: number
      joined_at: string
    }> = {}

    campaigns.forEach(campaign => {
      if (!campaign.campaigns) return
      
      campaignPerformance[campaign.id] = {
        campaign_id: campaign.campaign_id,
        campaign_title: campaign.campaigns.title,
        platform: campaign.platform,
        clicks: 0,
        valid_clicks: 0,
        earnings: 0,
        joined_at: campaign.joined_at
      }
    })

    clicks.forEach(click => {
      const userCampaignId = click.user_campaigns?.id
      if (userCampaignId && campaignPerformance[userCampaignId]) {
        campaignPerformance[userCampaignId].clicks++
        if (click.is_valid) {
          campaignPerformance[userCampaignId].valid_clicks++
          campaignPerformance[userCampaignId].earnings += Number(click.commission_amount || 0)
        }
      }
    })

    const campaignPerformanceArray = Object.values(campaignPerformance)
      .map(perf => ({
        ...perf,
        ctr: perf.clicks > 0 ? (perf.valid_clicks / perf.clicks) * 100 : 0
      }))
      .sort((a, b) => b.valid_clicks - a.valid_clicks)

    // Platform insights
    const platformStats: Record<string, {
      campaigns: Set<string>
      clicks: number
      earnings: number
      valid_clicks: number
    }> = {}

    campaigns.forEach(campaign => {
      const platform = campaign.platform
      if (!platformStats[platform]) {
        platformStats[platform] = {
          campaigns: new Set(),
          clicks: 0,
          earnings: 0,
          valid_clicks: 0
        }
      }
      platformStats[platform].campaigns.add(campaign.id)
    })

    clicks.forEach(click => {
      const platform = click.user_campaigns?.platform || 'unknown'
      if (!platformStats[platform]) {
        platformStats[platform] = {
          campaigns: new Set(),
          clicks: 0,
          earnings: 0,
          valid_clicks: 0
        }
      }
      
      platformStats[platform].clicks++
      if (click.is_valid) {
        platformStats[platform].valid_clicks++
        platformStats[platform].earnings += Number(click.commission_amount || 0)
      }
    })

    const platformInsights = Object.fromEntries(
      Object.entries(platformStats).map(([platform, stats]) => [
        platform,
        {
          campaigns: stats.campaigns.size,
          clicks: stats.clicks,
          earnings: stats.earnings,
          avg_ctr: stats.clicks > 0 ? (stats.valid_clicks / stats.clicks) * 100 : 0
        }
      ])
    )

    // Calculate trends (simplified - compare with previous period)
    const previousPeriodStart = new Date(startDate)
    previousPeriodStart.setDate(previousPeriodStart.getDate() - (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

    const { data: previousClicks } = await supabase
      .from('click_events')
      .select('commission_amount, is_valid')
      .eq('user_campaigns.user_id', targetUserId)
      .gte('clicked_at', previousPeriodStart.toISOString())
      .lt('clicked_at', startDate.toISOString())

    const previousEarnings = (previousClicks || [])
      .filter(c => c.is_valid)
      .reduce((sum, c) => sum + Number(c.commission_amount || 0), 0)

    const earningsTrend = previousEarnings > 0 
      ? totalEarnings > previousEarnings ? '+' + Math.round(((totalEarnings - previousEarnings) / previousEarnings) * 100) + '%'
        : totalEarnings < previousEarnings ? Math.round(((totalEarnings - previousEarnings) / previousEarnings) * 100) + '%'
        : 'stable'
      : totalEarnings > 0 ? 'new_activity' : 'no_activity'

    // Calculate activity streak
    let activityStreak = 0
    const today = new Date()
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today)
      checkDate.setDate(today.getDate() - i)
      const dateStr = checkDate.toISOString().split('T')[0]
      
      if (dailyActivity[dateStr]) {
        activityStreak++
      } else {
        break
      }
    }

    // Generate recommendations
    const recommendations = []

    if (avgCTR < 30) {
      recommendations.push('Your click-through rate is low. Try posting at different times or improving your content quality.')
    }
    if (activeCampaigns.length < 3) {
      recommendations.push('Join more campaigns to increase your earning potential.')
    }
    if (qualityScore < 70) {
      recommendations.push('Focus on quality over quantity to improve your validation scores.')
    }
    if (consistencyScore < 50) {
      recommendations.push('Try to be more consistent with daily activity to build momentum.')
    }

    const bestPlatform = Object.entries(platformInsights)
      .sort((a, b) => b[1].avg_ctr - a[1].avg_ctr)[0]
    
    if (bestPlatform) {
      recommendations.push(`${bestPlatform[0]} is your best performing platform. Consider focusing more campaigns there.`)
    }

    // Mock achievements (would be more complex in real implementation)
    const achievements = [
      {
        id: 'first_campaign',
        title: 'Campaign Starter',
        description: 'Joined your first campaign',
        earned_at: campaigns[0]?.joined_at || new Date().toISOString(),
        reward_xp: 50
      }
    ]

    if (totalValidClicks >= 100) {
      achievements.push({
        id: 'click_master',
        title: 'Click Master',
        description: 'Generated 100 valid clicks',
        earned_at: validClicks[99]?.clicked_at || new Date().toISOString(),
        reward_xp: 200
      })
    }

    const analytics: UserAnalytics = {
      user_metrics: {
        total_campaigns: campaigns.length,
        active_campaigns: activeCampaigns.length,
        total_clicks: totalClicks,
        valid_clicks: totalValidClicks,
        total_earnings: Math.round(totalEarnings),
        avg_ctr: Math.round(avgCTR * 100) / 100,
        quality_score: Math.round(qualityScore * 100) / 100,
        consistency_score: Math.round(consistencyScore * 100) / 100,
        level_progress: {
          current_level: currentLevel,
          current_xp: currentXP,
          next_level_xp: nextLevelXP,
          progress_percentage: Math.round(progressPercentage * 100) / 100
        }
      },
      activity_timeline: activityTimeline,
      campaign_performance: campaignPerformanceArray,
      platform_insights: platformInsights,
      trend_data: {
        earnings_trend: earningsTrend,
        clicks_trend: 'stable', // Simplified
        quality_trend: 'improving', // Simplified
        activity_streak: activityStreak
      },
      recommendations: recommendations,
      achievements: achievements
    }

    // Cache the analytics result for 10 minutes
    await redis.set(cacheKey, analytics, { ttl: 600 })
    console.log(`Cached analytics for user: ${targetUserId}`)

    return createResponse(analytics)

  } catch (error) {
    console.error('Error in user-analytics function:', error)
    
    return createResponse(null, {
      code: 'INTERNAL_ERROR',
      message: error.message || 'An unexpected error occurred'
    }, 500)
  }
})