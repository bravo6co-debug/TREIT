import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { validateUser, requireAdmin } from '../_shared/auth.ts'
import { handleCors } from '../_shared/cors.ts'
import { createResponse, calculateFraudScore, logFraudAttempt } from '../_shared/utils.ts'

interface FraudDetectionResult {
  fraud_score: number
  is_suspicious: boolean
  detection_reasons: Array<{
    type: string
    confidence: number
    description: string
    severity: 'low' | 'medium' | 'high'
  }>
  recommended_action: string
  auto_action_taken: boolean
  user_risk_profile: {
    total_clicks: number
    valid_click_rate: number
    account_age_days: number
    suspicious_patterns: string[]
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

    // Parse request body
    const { 
      user_id,
      campaign_id,
      check_type = 'comprehensive', // 'real_time', 'comprehensive', 'batch'
      evidence = {},
      auto_action = false
    } = await req.json()

    // For batch checking, allow admin access
    let authUser
    if (check_type === 'batch') {
      const authResult = await requireAdmin(req.headers.get('authorization'))
      authUser = authResult.user
    } else {
      const authResult = await validateUser(req.headers.get('authorization'))
      authUser = authResult.user
    }

    if (!user_id) {
      return createResponse(null, {
        code: 'MISSING_USER_ID',
        message: 'User ID is required'
      }, 400)
    }

    // Get user information
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        created_at,
        level,
        status,
        total_earnings,
        last_login_at,
        login_count
      `)
      .eq('id', user_id)
      .single()

    if (userError || !userData) {
      return createResponse(null, {
        code: 'USER_NOT_FOUND',
        message: 'User not found'
      }, 404)
    }

    const accountAgeDays = Math.floor(
      (Date.now() - new Date(userData.created_at).getTime()) / (1000 * 60 * 60 * 24)
    )

    // Initialize detection results
    const detectionReasons: Array<{
      type: string
      confidence: number
      description: string
      severity: 'low' | 'medium' | 'high'
    }> = []

    // Get user's click history
    const { data: clickHistory } = await supabase
      .from('click_events')
      .select(`
        id,
        clicked_at,
        ip_address,
        user_agent,
        is_valid,
        commission_amount,
        metadata,
        user_campaigns (
          campaign_id
        )
      `)
      .eq('user_campaigns.user_id', user_id)
      .order('clicked_at', { ascending: false })
      .limit(1000)

    const totalClicks = clickHistory?.length || 0
    const validClicks = clickHistory?.filter(c => c.is_valid) || []
    const validClickRate = totalClicks > 0 ? validClicks.length / totalClicks : 0

    // 1. IP Address Analysis
    if (evidence.ip_address || clickHistory?.length) {
      const uniqueIPs = new Set(clickHistory?.map(c => c.ip_address) || []).size
      const ipVariety = totalClicks > 0 ? uniqueIPs / totalClicks : 1

      // Too few unique IPs for the number of clicks
      if (totalClicks > 50 && ipVariety < 0.1) {
        detectionReasons.push({
          type: 'ip_concentration',
          confidence: 0.8,
          description: `Only ${uniqueIPs} unique IPs for ${totalClicks} clicks (${Math.round(ipVariety * 100)}% variety)`,
          severity: 'high'
        })
      }

      // Check for VPN/Proxy patterns (simplified)
      const suspiciousIPs = clickHistory?.filter(c => 
        c.ip_address?.startsWith('10.') || 
        c.ip_address?.startsWith('192.168.') ||
        c.ip_address === '127.0.0.1'
      ) || []

      if (suspiciousIPs.length > totalClicks * 0.3) {
        detectionReasons.push({
          type: 'suspicious_ip',
          confidence: 0.7,
          description: `${suspiciousIPs.length} clicks from suspicious IPs`,
          severity: 'medium'
        })
      }
    }

    // 2. Click Pattern Analysis
    if (clickHistory?.length && clickHistory.length > 10) {
      // Analyze time intervals between clicks
      const intervals: number[] = []
      for (let i = 1; i < clickHistory.length; i++) {
        const interval = new Date(clickHistory[i-1].clicked_at).getTime() - 
                        new Date(clickHistory[i].clicked_at).getTime()
        intervals.push(interval)
      }

      // Check for too regular intervals (bot-like behavior)
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
      const intervalVariance = intervals.reduce((sum, interval) => 
        sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length

      const coefficientOfVariation = Math.sqrt(intervalVariance) / avgInterval

      if (coefficientOfVariation < 0.2 && totalClicks > 20) {
        detectionReasons.push({
          type: 'regular_pattern',
          confidence: 0.9,
          description: `Highly regular click intervals (CV: ${coefficientOfVariation.toFixed(3)})`,
          severity: 'high'
        })
      }

      // Check for rapid clicking (more than 10 clicks in 1 minute)
      const rapidClicks = intervals.filter(interval => interval < 60000).length
      if (rapidClicks > 10) {
        detectionReasons.push({
          type: 'rapid_clicking',
          confidence: 0.8,
          description: `${rapidClicks} clicks within 1-minute intervals`,
          severity: 'high'
        })
      }
    }

    // 3. Device Fingerprint Analysis
    if (clickHistory?.length) {
      const userAgents = new Set(clickHistory.map(c => c.user_agent)).size
      const uaVariety = totalClicks > 0 ? userAgents / totalClicks : 1

      if (totalClicks > 20 && uaVariety < 0.05) {
        detectionReasons.push({
          type: 'device_fingerprint',
          confidence: 0.7,
          description: `Only ${userAgents} unique user agents for ${totalClicks} clicks`,
          severity: 'medium'
        })
      }
    }

    // 4. Geographic Consistency Analysis
    // (This would require IP geolocation service - simplified here)
    
    // 5. Account Behavior Analysis
    if (accountAgeDays < 7 && totalClicks > 100) {
      detectionReasons.push({
        type: 'new_account_high_activity',
        confidence: 0.8,
        description: `New account (${accountAgeDays} days) with ${totalClicks} clicks`,
        severity: 'high'
      })
    }

    // Low login count vs high click activity
    if (userData.login_count && totalClicks > userData.login_count * 50) {
      detectionReasons.push({
        type: 'low_engagement_high_clicks',
        confidence: 0.6,
        description: `${totalClicks} clicks vs ${userData.login_count} logins`,
        severity: 'medium'
      })
    }

    // 6. Campaign Diversity Analysis
    if (campaign_id && clickHistory?.length) {
      const campaignClicks = clickHistory.filter(c => 
        c.user_campaigns?.campaign_id === campaign_id
      ).length
      
      const campaignConcentration = campaignClicks / totalClicks

      if (campaignConcentration > 0.9 && totalClicks > 50) {
        detectionReasons.push({
          type: 'campaign_focus',
          confidence: 0.6,
          description: `${Math.round(campaignConcentration * 100)}% of clicks on single campaign`,
          severity: 'low'
        })
      }
    }

    // 7. Earnings vs Activity Ratio
    const earningsPerClick = totalClicks > 0 ? userData.total_earnings / totalClicks : 0
    const avgMarketRate = 100 // Assuming average 100 won per click

    if (earningsPerClick > avgMarketRate * 2) {
      detectionReasons.push({
        type: 'high_earnings_rate',
        confidence: 0.5,
        description: `${Math.round(earningsPerClick)} won per click (market avg: ${avgMarketRate})`,
        severity: 'low'
      })
    }

    // Calculate overall fraud score
    const factors = {
      ipReputation: detectionReasons.filter(r => r.type.includes('ip')).length > 0 ? 0.8 : 0.2,
      clickPattern: detectionReasons.filter(r => r.type.includes('pattern') || r.type.includes('rapid')).length > 0 ? 0.9 : 0.1,
      deviceFingerprint: detectionReasons.filter(r => r.type.includes('device')).length > 0 ? 0.7 : 0.2,
      timePattern: detectionReasons.filter(r => r.type.includes('regular')).length > 0 ? 0.8 : 0.2,
      geoConsistency: 0.3 // Simplified since we don't have full geo analysis
    }

    const fraudScore = calculateFraudScore(factors)
    const isSuspicious = fraudScore > 0.6

    // Determine recommended action
    let recommendedAction = 'none'
    let autoActionTaken = false

    if (fraudScore > 0.9) {
      recommendedAction = 'suspend_account'
      if (auto_action) {
        await supabase
          .from('users')
          .update({
            status: 'suspended',
            suspension_reason: 'Automated fraud detection',
            suspended_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          })
          .eq('id', user_id)
        autoActionTaken = true
      }
    } else if (fraudScore > 0.8) {
      recommendedAction = 'manual_review'
    } else if (fraudScore > 0.6) {
      recommendedAction = 'enhanced_monitoring'
    }

    // Log fraud detection attempt
    await logFraudAttempt(supabase, user_id, 'fraud_analysis', {
      fraud_score: fraudScore,
      detection_reasons: detectionReasons,
      recommended_action: recommendedAction,
      auto_action_taken: autoActionTaken,
      check_type: check_type
    })

    const suspiciousPatterns = detectionReasons.map(r => r.type)

    const result: FraudDetectionResult = {
      fraud_score: Math.round(fraudScore * 1000) / 1000,
      is_suspicious: isSuspicious,
      detection_reasons: detectionReasons,
      recommended_action: recommendedAction,
      auto_action_taken: autoActionTaken,
      user_risk_profile: {
        total_clicks: totalClicks,
        valid_click_rate: Math.round(validClickRate * 1000) / 1000,
        account_age_days: accountAgeDays,
        suspicious_patterns: suspiciousPatterns
      }
    }

    return createResponse(result)

  } catch (error) {
    console.error('Error in detect-fraud function:', error)
    
    return createResponse(null, {
      code: 'INTERNAL_ERROR',
      message: error.message || 'An unexpected error occurred'
    }, 500)
  }
})