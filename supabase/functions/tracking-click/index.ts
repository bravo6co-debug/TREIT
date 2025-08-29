import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { validateUser } from '../_shared/auth.ts'
import { handleCors } from '../_shared/cors.ts'
import { 
  createResponse, 
  getRealIP, 
  detectBot, 
  validateClickTime, 
  updateUserXP,
  calculateLevelBonus,
  calculateValidationScore,
  logFraudAttempt,
  validateAndSanitizeInput,
  validateRequired,
  validateString,
  validateUUID
} from '../_shared/utils.ts'

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Validate authentication
    const authHeader = req.headers.get('authorization')
    const { user } = await validateUser(authHeader)

    // Parse and validate request body
    const requestBody = await req.json().catch(() => ({}))
    
    const { isValid, errors, sanitized } = validateAndSanitizeInput(requestBody, {
      tracking_code: (value, field) => validateRequired(value, field) || validateString(value, field, { 
        minLength: 8, 
        maxLength: 32, 
        pattern: /^[a-z0-9]+$/ 
      }),
      referrer: (value, field) => value ? validateString(value, field, { maxLength: 2000 }) : null,
      session_id: (value, field) => value ? validateString(value, field, { maxLength: 128 }) : null
    })

    if (!isValid) {
      return createResponse(null, {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input parameters',
        details: errors
      }, 400)
    }

    const { 
      tracking_code, 
      referrer, 
      session_id, 
      metadata = {} 
    } = sanitized

    // Get IP and User Agent for validation
    const ipAddress = await getRealIP(req)
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // Bot detection
    const isBot = await detectBot(userAgent, ipAddress)
    if (isBot) {
      await logFraudAttempt(supabase, user.id, 'bot_detection', {
        user_agent: userAgent,
        ip_address: ipAddress
      })
      
      return createResponse(null, {
        code: 'BOT_DETECTED',
        message: 'Bot activity detected'
      }, 403)
    }

    // Find user campaign by tracking code
    const { data: userCampaign, error: ucError } = await supabase
      .from('user_campaigns')
      .select(`
        id,
        user_id,
        campaign_id,
        status,
        campaigns (
          id,
          title,
          cpc_rate,
          status,
          start_date,
          end_date,
          daily_budget,
          total_budget,
          total_spent,
          business_id,
          businesses (
            id,
            status
          )
        )
      `)
      .eq('tracking_code', tracking_code)
      .eq('status', 'active')
      .single()

    if (ucError || !userCampaign) {
      return createResponse(null, {
        code: 'INVALID_TRACKING_CODE',
        message: 'Invalid or inactive tracking code'
      }, 404)
    }

    const campaign = userCampaign.campaigns as any

    // Validate campaign is active
    const now = new Date()
    const startDate = new Date(campaign.start_date)
    const endDate = campaign.end_date ? new Date(campaign.end_date) : null

    if (
      campaign.status !== 'active' ||
      campaign.businesses.status !== 'verified' ||
      startDate > now ||
      (endDate && endDate < now)
    ) {
      return createResponse(null, {
        code: 'CAMPAIGN_INACTIVE',
        message: 'Campaign is not currently active'
      }, 400)
    }

    // Check daily budget using secure RPC function
    const { data: budgetStatus, error: budgetError } = await supabase
      .rpc('get_campaign_budget_status', {
        p_campaign_id: campaign.id,
        p_cpc_rate: Number(campaign.cpc_rate)
      })

    if (budgetError) throw budgetError

    const budget = budgetStatus?.[0]
    if (!budget?.within_daily_budget || !budget?.within_total_budget) {
      return createResponse(null, {
        code: 'BUDGET_EXCEEDED',
        message: budget?.within_daily_budget 
          ? 'Campaign total budget exceeded' 
          : 'Campaign daily budget exceeded'
      }, 400)
    }

    // Validate click timing using secure RPC function
    const { data: isValidTiming, error: timingError } = await supabase
      .rpc('validate_click_timing', {
        p_user_id: user.id,
        p_campaign_id: campaign.id,
        p_min_interval_seconds: 60
      })

    if (timingError) throw timingError

    if (!isValidTiming) {
      return createResponse(null, {
        code: 'DUPLICATE_CLICK',
        message: 'Please wait before clicking again',
        details: {
          wait_seconds: 60
        }
      }, 429)
    }

    // Check for suspicious IP patterns
    const { data: recentClicks } = await supabase
      .from('click_events')
      .select('id')
      .eq('ip_address', ipAddress)
      .gte('clicked_at', new Date(Date.now() - 3600000).toISOString()) // Last hour

    if (recentClicks && recentClicks.length > 10) {
      await logFraudAttempt(supabase, user.id, 'ip_flooding', {
        ip_address: ipAddress,
        click_count: recentClicks.length
      })
      
      return createResponse(null, {
        code: 'SUSPICIOUS_ACTIVITY',
        message: 'Suspicious activity detected'
      }, 403)
    }

    // Get user level for bonus calculation
    const { data: userData } = await supabase
      .from('users')
      .select('level, xp')
      .eq('id', user.id)
      .single()

    const baseCommission = Number(campaign.cpc_rate)
    const levelBonus = calculateLevelBonus(userData?.level || 1, baseCommission)
    const totalCommission = baseCommission + levelBonus

    // Calculate validation score based on various factors
    const validationScore = await calculateValidationScore(
      supabase,
      {
        ipAddress,
        userAgent,
        referrer,
        userId: user.id,
        campaignId: campaign.id,
        sessionId: session_id
      }
    )

    // Record click event
    const { data: clickEvent, error: clickError } = await supabase
      .from('click_events')
      .insert({
        user_campaign_id: userCampaign.id,
        ip_address: ipAddress,
        user_agent: userAgent,
        referrer: referrer,
        session_id: session_id,
        metadata: {
          ...metadata,
          validation_score: validationScore,
          level_bonus: levelBonus,
          base_commission: baseCommission
        },
        is_valid: validationScore >= 0.7,
        commission_amount: totalCommission,
        clicked_at: now.toISOString()
      })
      .select()
      .single()

    if (clickError) throw clickError

    // Update user XP and earnings if valid click
    if (validationScore >= 0.7) {
      // Award XP for valid clicks
      const xpGain = Math.floor(baseCommission / 10) // 1 XP per 10 won
      
      // Update user earnings using secure RPC function
      const { error: userUpdateError } = await supabase
        .rpc('update_user_earnings', {
          p_user_id: user.id,
          p_earnings_amount: totalCommission,
          p_xp_amount: xpGain
        })

      if (userUpdateError) throw userUpdateError

      // Update campaign stats using secure RPC function
      const { error: campaignUpdateError } = await supabase
        .rpc('update_campaign_stats', {
          p_campaign_id: campaign.id,
          p_spent_amount: totalCommission,
          p_click_count: 1
        })

      if (campaignUpdateError) throw campaignUpdateError
    }

    return createResponse({
      click_id: clickEvent.id,
      is_valid: clickEvent.is_valid,
      commission: totalCommission,
      level_bonus: levelBonus,
      validation_score: validationScore,
      message: clickEvent.is_valid 
        ? 'Click successfully recorded and rewarded'
        : 'Click recorded but marked as invalid'
    })

  } catch (error) {
    console.error('Error in tracking-click function:', error)
    
    return createResponse(null, {
      code: 'INTERNAL_ERROR',
      message: error.message || 'An unexpected error occurred'
    }, 500)
  }
})