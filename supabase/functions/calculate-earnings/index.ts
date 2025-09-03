import { serve } from "https://deno.land/std/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js'
import { validateUser } from '../_shared/auth.ts'
import { handleCors } from '../_shared/cors.ts'
import { 
  createResponse, 
  calculateLevelBonus,
  validateAndSanitizeInput,
  validateString,
  validateUUID 
} from '../_shared/utils.ts'

// 에러 처리 시스템 임포트 (Edge Functions용)
import { 
  safeEdgeFunctionHandler, 
  safeJsonParse, 
  EdgeFunctionErrorHandler 
} from '../../shared/error-handling/edge-function-error-handler.ts'

interface EarningsBreakdown {
  base_earnings: number
  level_bonus: number
  referral_bonus: number
  streak_bonus: number
  quality_bonus: number
  total: number
}

interface EarningsData {
  period: string
  earnings: EarningsBreakdown
  clicks: {
    total: number
    valid: number
    invalid: number
  }
  campaigns: {
    active: number
    completed: number
    total_participated: number
  }
  performance_metrics: {
    avg_ctr: number
    quality_score: number
    consistency_score: number
  }
  next_payout: string | null
  payout_available: boolean
  level_info: {
    current_level: number
    next_level_xp: number
    current_xp: number
    bonus_rate: number
  }
}

// 에러 처리가 통합된 메인 핸들러
serve(async (req) => {
  return safeEdgeFunctionHandler('calculate-earnings', async (errorHandler, request) => {
    // Handle CORS preflight requests
    const corsResponse = handleCors(request)
    if (corsResponse) return corsResponse
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Validate authentication
    const authHeader = req.headers.get('authorization')
    const { user } = await validateUser(authHeader)

    // Parse and validate request body with safe JSON parsing
    const requestBody = await safeJsonParse(request, errorHandler) || {}
    
    const { isValid, errors, sanitized } = validateAndSanitizeInput(requestBody, {
      user_id: (value, field) => value ? validateUUID(value, field) : null,
      period: (value, field) => validateString(value, field, { 
        allowedValues: ['today', 'yesterday', 'current_week', 'last_week', 'current_month', 'last_month', 'all_time'] 
      }),
      include_pending: (value, field) => typeof value === 'boolean' ? null : { field, message: `${field} must be a boolean` },
      detailed: (value, field) => typeof value === 'boolean' ? null : { field, message: `${field} must be a boolean` }
    })

    if (!isValid) {
      const validationError = errorHandler.createValidationError(
        'request_body',
        requestBody,
        'validation_failed',
        user?.id
      )
      validationError.details = errors
      return errorHandler.createErrorResponse(validationError)
    }

    const { 
      user_id, 
      period = 'current_month',
      include_pending = true,
      detailed = false 
    } = sanitized

    // Use authenticated user's ID if no specific user_id provided
    const targetUserId = user_id || user.id

    // For security, only allow users to view their own earnings unless admin
    if (targetUserId !== user.id) {
      const { data: userData } = await supabase
        .from('users')
        .select('user_type')
        .eq('id', user.id)
        .single()

      if (userData?.user_type !== 'admin') {
        return createResponse(null, {
          code: 'PERMISSION_DENIED',
          message: 'You can only view your own earnings'
        }, 403)
      }
    }

    // Get user info
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('id, level, xp, total_earnings, status, created_at')
      .eq('id', targetUserId)
      .single()

    if (userError || !targetUser) {
      return createResponse(null, {
        code: 'USER_NOT_FOUND',
        message: 'User not found'
      }, 404)
    }

    // Calculate date range based on period
    let startDate: Date
    let endDate: Date = new Date()
    let periodLabel: string

    switch (period) {
      case 'today':
        startDate = new Date()
        startDate.setHours(0, 0, 0, 0)
        periodLabel = startDate.toISOString().split('T')[0]
        break
      
      case 'yesterday':
        startDate = new Date()
        startDate.setDate(startDate.getDate() - 1)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date(startDate)
        endDate.setHours(23, 59, 59, 999)
        periodLabel = startDate.toISOString().split('T')[0]
        break
      
      case 'current_week':
        startDate = new Date()
        startDate.setDate(startDate.getDate() - startDate.getDay())
        startDate.setHours(0, 0, 0, 0)
        periodLabel = `${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`
        break
      
      case 'last_week':
        endDate = new Date()
        endDate.setDate(endDate.getDate() - endDate.getDay() - 1)
        endDate.setHours(23, 59, 59, 999)
        startDate = new Date(endDate)
        startDate.setDate(startDate.getDate() - 6)
        startDate.setHours(0, 0, 0, 0)
        periodLabel = `${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`
        break
      
      case 'current_month':
        startDate = new Date()
        startDate.setDate(1)
        startDate.setHours(0, 0, 0, 0)
        periodLabel = startDate.toISOString().substring(0, 7)
        break
      
      case 'last_month':
        startDate = new Date()
        startDate.setMonth(startDate.getMonth() - 1)
        startDate.setDate(1)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date(startDate)
        endDate.setMonth(endDate.getMonth() + 1)
        endDate.setDate(0)
        endDate.setHours(23, 59, 59, 999)
        periodLabel = startDate.toISOString().substring(0, 7)
        break
      
      case 'all_time':
        startDate = new Date(targetUser.created_at)
        periodLabel = 'all_time'
        break
      
      default:
        return createResponse(null, {
          code: 'INVALID_PERIOD',
          message: 'Invalid period. Use: today, yesterday, current_week, last_week, current_month, last_month, all_time'
        }, 400)
    }

    // Get click events for the period
    let clickQuery = supabase
      .from('click_events')
      .select(`
        id,
        commission_amount,
        is_valid,
        clicked_at,
        metadata,
        user_campaigns (
          id,
          campaign_id,
          campaigns (
            id,
            title,
            category
          )
        )
      `)
      .eq('user_campaigns.user_id', targetUserId)
      .gte('clicked_at', startDate.toISOString())

    if (period !== 'all_time') {
      clickQuery = clickQuery.lte('clicked_at', endDate.toISOString())
    }

    if (!include_pending) {
      clickQuery = clickQuery.eq('is_valid', true)
    }

    const { data: clicks, error: clicksError } = await clickQuery

    if (clicksError) throw clicksError

    // Calculate earnings breakdown
    const validClicks = clicks?.filter(c => c.is_valid) || []
    const invalidClicks = clicks?.filter(c => !c.is_valid) || []

    const baseEarnings = validClicks.reduce(
      (sum, click) => sum + Number(click.commission_amount || 0), 
      0
    )

    // Calculate level bonus
    const levelBonus = calculateLevelBonus(targetUser.level, baseEarnings)

    // Calculate referral bonus (simplified - could be more complex)
    const { data: referralClicks } = await supabase
      .from('click_events')
      .select('commission_amount')
      .eq('user_campaigns.user_id', targetUserId)
      .eq('is_valid', true)
      .gte('clicked_at', startDate.toISOString())
      .lte('clicked_at', endDate.toISOString())
      .not('metadata->referral_id', 'is', null)

    const referralBonus = (referralClicks || []).reduce(
      (sum, click) => sum + (Number(click.commission_amount) * 0.05), // 5% referral bonus
      0
    )

    // Calculate streak bonus (for consecutive active days)
    let streakBonus = 0
    if (period === 'current_month' || period === 'all_time') {
      const { data: dailyActivity } = await supabase
        .from('click_events')
        .select('clicked_at')
        .eq('user_campaigns.user_id', targetUserId)
        .eq('is_valid', true)
        .gte('clicked_at', startDate.toISOString())
        .order('clicked_at', { ascending: false })

      // Calculate consecutive days (simplified)
      if (dailyActivity && dailyActivity.length > 0) {
        const activeDays = new Set(
          dailyActivity.map(a => a.clicked_at.split('T')[0])
        ).size

        if (activeDays >= 7) {
          streakBonus = baseEarnings * 0.1 // 10% bonus for 7+ active days
        } else if (activeDays >= 3) {
          streakBonus = baseEarnings * 0.05 // 5% bonus for 3+ active days
        }
      }
    }

    // Calculate quality bonus based on validation score
    const avgValidationScore = validClicks.length > 0 
      ? validClicks.reduce(
          (sum, click) => sum + (Number(click.metadata?.validation_score) || 0.5), 
          0
        ) / validClicks.length
      : 0

    const qualityBonus = avgValidationScore > 0.9 
      ? baseEarnings * 0.05 // 5% bonus for high quality
      : 0

    const earnings: EarningsBreakdown = {
      base_earnings: baseEarnings,
      level_bonus: levelBonus,
      referral_bonus: referralBonus,
      streak_bonus: streakBonus,
      quality_bonus: qualityBonus,
      total: baseEarnings + levelBonus + referralBonus + streakBonus + qualityBonus
    }

    // Get campaign participation data
    const { data: userCampaigns } = await supabase
      .from('user_campaigns')
      .select(`
        id,
        status,
        campaigns (
          id,
          status,
          end_date
        )
      `)
      .eq('user_id', targetUserId)

    const activeCampaigns = userCampaigns?.filter(uc => 
      uc.status === 'active' && uc.campaigns.status === 'active'
    ).length || 0

    const completedCampaigns = userCampaigns?.filter(uc => 
      uc.status === 'completed' || 
      (uc.campaigns.end_date && new Date(uc.campaigns.end_date) < new Date())
    ).length || 0

    // Calculate performance metrics
    const totalImpressions = clicks?.length || 0
    const avgCTR = totalImpressions > 0 ? (validClicks.length / totalImpressions) * 100 : 0
    const qualityScore = avgValidationScore * 100
    
    // Consistency score based on regular activity
    const consistencyScore = Math.min(100, activeCampaigns * 20)

    // Calculate next level XP requirement
    const nextLevelXP = (targetUser.level + 1) * 100
    const currentLevelXP = targetUser.level * 100
    const xpForNextLevel = nextLevelXP - targetUser.xp

    // Determine next payout date (simplified - usually end of month)
    const nextMonth = new Date()
    nextMonth.setMonth(nextMonth.getMonth() + 1, 1)
    nextMonth.setHours(0, 0, 0, 0)
    
    const payoutAvailable = earnings.total >= 10000 // Minimum 10,000 won for payout

    const result: EarningsData = {
      period: periodLabel,
      earnings,
      clicks: {
        total: clicks?.length || 0,
        valid: validClicks.length,
        invalid: invalidClicks.length
      },
      campaigns: {
        active: activeCampaigns,
        completed: completedCampaigns,
        total_participated: userCampaigns?.length || 0
      },
      performance_metrics: {
        avg_ctr: Math.round(avgCTR * 100) / 100,
        quality_score: Math.round(qualityScore * 100) / 100,
        consistency_score: Math.round(consistencyScore * 100) / 100
      },
      next_payout: nextMonth.toISOString().split('T')[0],
      payout_available: payoutAvailable,
      level_info: {
        current_level: targetUser.level,
        next_level_xp: xpForNextLevel,
        current_xp: targetUser.xp,
        bonus_rate: (targetUser.level - 1) * 1 // Percentage
      }
    }

    return createResponse(result)

  } catch (error) {
    console.error('Error in calculate-earnings function:', error)
    
    return createResponse(null, {
      code: 'INTERNAL_ERROR',
      message: error.message || 'An unexpected error occurred'
    }, 500)
  }
})