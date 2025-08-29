import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { validateUser } from '../_shared/auth.ts'
import { handleCors } from '../_shared/cors.ts'
import { 
  createResponse, 
  getRealIP, 
  detectBot,
  validateAndSanitizeInput,
  validateRequired,
  validateString
} from '../_shared/utils.ts'
import { queue, QueueChannels, MessageTypes } from '../_shared/queue.ts'
import { redis, CacheKeys, CacheInvalidation } from '../_shared/redis.ts'

/**
 * Optimized tracking-click API with async processing
 * Returns immediately after basic validation and queues heavy processing
 */
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

    // Get IP and User Agent for basic validation
    const ipAddress = await getRealIP(req)
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // Quick bot detection (return immediately if bot)
    const isBot = await detectBot(userAgent, ipAddress)
    if (isBot) {
      return createResponse(null, {
        code: 'BOT_DETECTED',
        message: 'Bot activity detected'
      }, 403)
    }

    // Quick campaign validation using cache first
    const campaignCacheKey = `campaign:tracking:${tracking_code}`
    let campaignData = await redis.get<any>(campaignCacheKey)

    if (!campaignData) {
      // Fetch from database if not in cache
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
            business_id
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

      campaignData = userCampaign
      // Cache for 1 minute
      await redis.set(campaignCacheKey, campaignData, { ttl: 60 })
    }

    const campaign = campaignData.campaigns

    // Quick campaign active check
    const now = new Date()
    const startDate = new Date(campaign.start_date)
    const endDate = campaign.end_date ? new Date(campaign.end_date) : null

    if (
      campaign.status !== 'active' ||
      startDate > now ||
      (endDate && endDate < now)
    ) {
      return createResponse(null, {
        code: 'CAMPAIGN_INACTIVE',
        message: 'Campaign is not currently active'
      }, 400)
    }

    // Check recent clicks cache for rate limiting
    const recentClickKey = `user:recent_click:${user.id}:${campaign.id}`
    const recentClick = await redis.get<string>(recentClickKey)
    
    if (recentClick) {
      return createResponse(null, {
        code: 'DUPLICATE_CLICK',
        message: 'Please wait before clicking again',
        details: {
          wait_seconds: 60
        }
      }, 429)
    }

    // Generate click ID
    const clickId = crypto.randomUUID()
    const clickTimestamp = now.toISOString()

    // Store initial click record (minimal data for fast response)
    const { error: clickError } = await supabase
      .from('click_events')
      .insert({
        id: clickId,
        user_campaign_id: campaignData.id,
        ip_address: ipAddress,
        user_agent: userAgent,
        referrer: referrer,
        session_id: session_id,
        metadata: {
          ...metadata,
          processing_status: 'queued'
        },
        is_valid: null, // Will be determined async
        commission_amount: 0, // Will be calculated async
        clicked_at: clickTimestamp
      })

    if (clickError) throw clickError

    // Set rate limit cache
    await redis.set(recentClickKey, clickTimestamp, { ttl: 60 })

    // Queue async processing tasks in parallel
    const queuePromises = [
      // Queue fraud detection
      queue.publish(QueueChannels.FRAUD_DETECTION, MessageTypes.FRAUD_CHECK_REQUEST, {
        click_id: clickId,
        user_id: user.id,
        campaign_id: campaign.id,
        ip_address: ipAddress,
        user_agent: userAgent,
        referrer: referrer,
        session_id: session_id
      }),

      // Queue earnings calculation
      queue.publish(QueueChannels.EARNINGS_CALCULATION, MessageTypes.CALCULATE_EARNINGS, {
        click_id: clickId,
        user_id: user.id,
        campaign_id: campaign.id,
        base_cpc: Number(campaign.cpc_rate),
        user_campaign_id: campaignData.id
      }),

      // Queue analytics update
      queue.publish(QueueChannels.ANALYTICS_UPDATE, MessageTypes.UPDATE_CAMPAIGN_ANALYTICS, {
        campaign_id: campaign.id,
        click_id: clickId,
        timestamp: clickTimestamp
      }),

      // Queue notification
      queue.publish(QueueChannels.NOTIFICATION, MessageTypes.SEND_CLICK_NOTIFICATION, {
        user_id: user.id,
        click_id: clickId,
        campaign_title: campaign.title,
        estimated_earnings: Number(campaign.cpc_rate)
      })
    ]

    // Fire and forget - don't wait for queue operations
    Promise.all(queuePromises).catch(error => {
      console.error('Failed to queue some tasks:', error)
    })

    // Invalidate relevant caches
    CacheInvalidation.invalidateCampaign(campaign.id).catch(() => {})
    CacheInvalidation.invalidateUser(user.id).catch(() => {})

    // Return immediate response
    return createResponse({
      click_id: clickId,
      status: 'processing',
      message: 'Click recorded and queued for processing',
      estimated_earnings: Number(campaign.cpc_rate),
      processing_time_estimate: '2-3 seconds'
    })

  } catch (error) {
    console.error('Error in tracking-click-async function:', error)
    
    return createResponse(null, {
      code: 'INTERNAL_ERROR',
      message: error.message || 'An unexpected error occurred'
    }, 500)
  }
})