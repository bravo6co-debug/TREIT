import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { queue, QueueChannels, MessageTypes, QueueMessage } from '../_shared/queue.ts'
import { redis, CacheInvalidation } from '../_shared/redis.ts'
import { 
  calculateValidationScore,
  calculateLevelBonus,
  logFraudAttempt,
  calculateFraudScore
} from '../_shared/utils.ts'

/**
 * Worker function to process queued click events
 * Handles fraud detection and earnings calculation asynchronously
 */
serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  console.log('Click processor worker started')

  // Subscribe to fraud detection queue
  const unsubscribeFraud = await queue.subscribe(
    QueueChannels.FRAUD_DETECTION,
    async (message: QueueMessage) => {
      console.log(`Processing fraud check for click ${message.payload.click_id}`)
      
      try {
        const {
          click_id,
          user_id,
          campaign_id,
          ip_address,
          user_agent,
          referrer,
          session_id
        } = message.payload

        // Get user's recent click history for pattern analysis
        const { data: recentClicks } = await supabase
          .from('click_events')
          .select('id, clicked_at, ip_address, is_valid')
          .eq('user_campaigns.user_id', user_id)
          .gte('clicked_at', new Date(Date.now() - 3600000).toISOString())
          .order('clicked_at', { ascending: false })
          .limit(100)

        // Check for suspicious patterns
        const suspiciousPatterns = []
        
        // IP flooding check
        const sameIpClicks = recentClicks?.filter(c => c.ip_address === ip_address) || []
        if (sameIpClicks.length > 10) {
          suspiciousPatterns.push('ip_flooding')
        }

        // Rapid clicking check
        const recentMinuteClicks = recentClicks?.filter(c => 
          new Date(c.clicked_at).getTime() > Date.now() - 60000
        ) || []
        if (recentMinuteClicks.length > 5) {
          suspiciousPatterns.push('rapid_clicking')
        }

        // Calculate validation score
        const validationScore = await calculateValidationScore(
          supabase,
          {
            ipAddress: ip_address,
            userAgent: user_agent,
            referrer,
            userId: user_id,
            campaignId: campaign_id,
            sessionId: session_id
          }
        )

        // Calculate fraud score
        const fraudFactors = {
          ipReputation: sameIpClicks.length > 10 ? 0.8 : 0.2,
          clickPattern: recentMinuteClicks.length > 5 ? 0.9 : 0.1,
          deviceFingerprint: 0.3, // Simplified
          timePattern: 0.2, // Simplified
          geoConsistency: 0.3 // Simplified
        }

        const fraudScore = calculateFraudScore(fraudFactors)
        const isValid = validationScore >= 0.7 && fraudScore < 0.6

        // Update click event with validation results
        await supabase
          .from('click_events')
          .update({
            is_valid: isValid,
            metadata: supabase.rpc('jsonb_merge', {
              target: 'metadata',
              source: {
                validation_score: validationScore,
                fraud_score: fraudScore,
                suspicious_patterns: suspiciousPatterns,
                processing_status: 'fraud_checked'
              }
            })
          })
          .eq('id', click_id)

        // Log if fraud detected
        if (!isValid) {
          await logFraudAttempt(supabase, user_id, 'invalid_click', {
            click_id,
            validation_score: validationScore,
            fraud_score: fraudScore,
            patterns: suspiciousPatterns
          })
        }

        // Trigger earnings calculation only if valid
        if (isValid) {
          await queue.publish(
            QueueChannels.EARNINGS_CALCULATION,
            MessageTypes.CLICK_VALIDATED,
            {
              ...message.payload,
              validation_score: validationScore,
              is_valid: true
            }
          )
        }

        console.log(`Fraud check completed for click ${click_id}: ${isValid ? 'VALID' : 'INVALID'}`)

      } catch (error) {
        console.error('Error processing fraud check:', error)
        throw error
      }
    }
  )

  // Subscribe to earnings calculation queue
  const unsubscribeEarnings = await queue.subscribe(
    QueueChannels.EARNINGS_CALCULATION,
    async (message: QueueMessage) => {
      console.log(`Processing earnings for click ${message.payload.click_id}`)
      
      try {
        const {
          click_id,
          user_id,
          campaign_id,
          base_cpc,
          user_campaign_id,
          is_valid
        } = message.payload

        // Skip if not valid
        if (is_valid === false) {
          console.log(`Skipping earnings for invalid click ${click_id}`)
          return
        }

        // Get user level for bonus calculation
        const { data: userData } = await supabase
          .from('users')
          .select('level, xp')
          .eq('id', user_id)
          .single()

        const userLevel = userData?.level || 1
        const levelBonus = calculateLevelBonus(userLevel, base_cpc)
        const totalCommission = base_cpc + levelBonus

        // Calculate XP gain
        const xpGain = Math.floor(base_cpc / 10) // 1 XP per 10 won

        // Update click with commission amount
        await supabase
          .from('click_events')
          .update({
            commission_amount: totalCommission,
            metadata: supabase.rpc('jsonb_merge', {
              target: 'metadata',
              source: {
                level_bonus: levelBonus,
                base_commission: base_cpc,
                xp_gained: xpGain,
                processing_status: 'earnings_calculated'
              }
            })
          })
          .eq('id', click_id)

        // Update user earnings and XP using RPC function
        await supabase.rpc('update_user_earnings', {
          p_user_id: user_id,
          p_earnings_amount: totalCommission,
          p_xp_amount: xpGain
        })

        // Update campaign stats using RPC function
        await supabase.rpc('update_campaign_stats', {
          p_campaign_id: campaign_id,
          p_spent_amount: totalCommission,
          p_click_count: 1
        })

        // Invalidate caches
        await CacheInvalidation.invalidateUser(user_id)
        await CacheInvalidation.invalidateCampaign(campaign_id)

        // Send earnings notification
        await queue.publish(
          QueueChannels.NOTIFICATION,
          MessageTypes.SEND_EARNINGS_NOTIFICATION,
          {
            user_id,
            click_id,
            earnings: totalCommission,
            level_bonus: levelBonus,
            xp_gained: xpGain
          }
        )

        console.log(`Earnings processed for click ${click_id}: ${totalCommission} won`)

      } catch (error) {
        console.error('Error processing earnings:', error)
        throw error
      }
    }
  )

  // Subscribe to analytics update queue
  const unsubscribeAnalytics = await queue.subscribe(
    QueueChannels.ANALYTICS_UPDATE,
    async (message: QueueMessage) => {
      console.log(`Updating analytics for campaign ${message.payload.campaign_id}`)
      
      try {
        // Invalidate campaign analytics cache
        await CacheInvalidation.invalidateCampaign(message.payload.campaign_id)
        
        // Additional analytics processing can be added here
        console.log(`Analytics cache invalidated for campaign ${message.payload.campaign_id}`)
        
      } catch (error) {
        console.error('Error updating analytics:', error)
        throw error
      }
    }
  )

  // Keep the worker running
  return new Response('Click processor worker is running', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' }
  })
})