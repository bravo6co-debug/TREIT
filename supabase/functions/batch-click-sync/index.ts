import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { validateUser } from '../_shared/auth.ts'
import { handleCors } from '../_shared/cors.ts'
import { 
  createResponse,
  validateAndSanitizeInput,
  validateRequired,
  validateString,
  validateArray
} from '../_shared/utils.ts'
import { queue, QueueChannels, MessageTypes } from '../_shared/queue.ts'
import { redis, CacheInvalidation } from '../_shared/redis.ts'

interface BatchClickData {
  tracking_code: string
  clicked_at: string
  referrer?: string
  session_id?: string
  metadata?: Record<string, any>
  local_id?: string // Client-side generated ID for deduplication
}

interface BatchSyncResult {
  processed: number
  accepted: number
  rejected: number
  duplicates: number
  errors: Array<{
    local_id?: string
    tracking_code: string
    error: string
  }>
  click_ids: string[]
}

/**
 * Batch click sync API for offline support
 * Processes multiple clicks at once from offline queue
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
      clicks: (value, field) => {
        const arrayError = validateArray(value, field, { minLength: 1, maxLength: 100 })
        if (arrayError) return arrayError
        
        // Validate each click in the batch
        for (let i = 0; i < value.length; i++) {
          const click = value[i]
          if (!click.tracking_code || typeof click.tracking_code !== 'string') {
            return `${field}[${i}].tracking_code is required and must be a string`
          }
          if (!click.clicked_at || typeof click.clicked_at !== 'string') {
            return `${field}[${i}].clicked_at is required and must be a string`
          }
        }
        return null
      },
      device_id: (value, field) => value ? validateString(value, field, { maxLength: 128 }) : null,
      sync_token: (value, field) => value ? validateString(value, field, { maxLength: 256 }) : null
    })

    if (!isValid) {
      return createResponse(null, {
        code: 'VALIDATION_ERROR',
        message: 'Invalid batch data',
        details: errors
      }, 400)
    }

    const { clicks, device_id, sync_token } = sanitized as {
      clicks: BatchClickData[]
      device_id?: string
      sync_token?: string
    }

    const result: BatchSyncResult = {
      processed: 0,
      accepted: 0,
      rejected: 0,
      duplicates: 0,
      errors: [],
      click_ids: []
    }

    // Get IP and User Agent
    const ipAddress = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // Check for duplicate sync using sync_token
    if (sync_token) {
      const syncKey = `batch:sync:${sync_token}`
      const previousSync = await redis.get<BatchSyncResult>(syncKey)
      
      if (previousSync) {
        console.log(`Duplicate batch sync detected: ${sync_token}`)
        return createResponse({
          ...previousSync,
          duplicate_sync: true,
          message: 'This batch was already processed'
        })
      }
    }

    // Process each click in the batch
    const processPromises = clicks.map(async (clickData) => {
      result.processed++
      
      try {
        // Check for duplicate using local_id if provided
        if (clickData.local_id && device_id) {
          const dedupKey = `click:dedup:${device_id}:${clickData.local_id}`
          const exists = await redis.get<string>(dedupKey)
          
          if (exists) {
            result.duplicates++
            return null
          }
          
          // Set deduplication key (expires in 24 hours)
          await redis.set(dedupKey, 'processed', { ttl: 86400 })
        }

        // Validate tracking code and get campaign
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
              end_date
            )
          `)
          .eq('tracking_code', clickData.tracking_code)
          .eq('user_id', user.id)
          .single()

        if (ucError || !userCampaign) {
          result.rejected++
          result.errors.push({
            local_id: clickData.local_id,
            tracking_code: clickData.tracking_code,
            error: 'Invalid tracking code'
          })
          return null
        }

        const campaign = userCampaign.campaigns

        // Validate click timestamp
        const clickTime = new Date(clickData.clicked_at)
        const now = new Date()
        
        // Reject clicks older than 24 hours
        if (now.getTime() - clickTime.getTime() > 86400000) {
          result.rejected++
          result.errors.push({
            local_id: clickData.local_id,
            tracking_code: clickData.tracking_code,
            error: 'Click is too old (>24 hours)'
          })
          return null
        }

        // Reject future clicks
        if (clickTime > now) {
          result.rejected++
          result.errors.push({
            local_id: clickData.local_id,
            tracking_code: clickData.tracking_code,
            error: 'Click timestamp is in the future'
          })
          return null
        }

        // Check campaign was active at click time
        const startDate = new Date(campaign.start_date)
        const endDate = campaign.end_date ? new Date(campaign.end_date) : null
        
        if (
          campaign.status !== 'active' ||
          startDate > clickTime ||
          (endDate && endDate < clickTime)
        ) {
          result.rejected++
          result.errors.push({
            local_id: clickData.local_id,
            tracking_code: clickData.tracking_code,
            error: 'Campaign was not active at click time'
          })
          return null
        }

        // Check for duplicate clicks in the same timeframe
        const { data: existingClick } = await supabase
          .from('click_events')
          .select('id')
          .eq('user_campaign_id', userCampaign.id)
          .gte('clicked_at', new Date(clickTime.getTime() - 60000).toISOString())
          .lte('clicked_at', new Date(clickTime.getTime() + 60000).toISOString())
          .single()

        if (existingClick) {
          result.duplicates++
          return null
        }

        // Generate click ID
        const clickId = crypto.randomUUID()

        // Store click event
        const { error: clickError } = await supabase
          .from('click_events')
          .insert({
            id: clickId,
            user_campaign_id: userCampaign.id,
            ip_address: ipAddress,
            user_agent: userAgent,
            referrer: clickData.referrer,
            session_id: clickData.session_id,
            metadata: {
              ...clickData.metadata,
              batch_sync: true,
              device_id,
              local_id: clickData.local_id,
              sync_timestamp: now.toISOString(),
              original_timestamp: clickData.clicked_at
            },
            is_valid: null, // Will be determined by async processing
            commission_amount: 0, // Will be calculated async
            clicked_at: clickData.clicked_at
          })

        if (clickError) {
          result.rejected++
          result.errors.push({
            local_id: clickData.local_id,
            tracking_code: clickData.tracking_code,
            error: 'Failed to store click'
          })
          return null
        }

        // Queue for async processing
        await queue.publishBatch(QueueChannels.BATCH_SYNC, [
          {
            type: MessageTypes.FRAUD_CHECK_REQUEST,
            payload: {
              click_id: clickId,
              user_id: user.id,
              campaign_id: campaign.id,
              ip_address: ipAddress,
              user_agent: userAgent,
              batch_sync: true
            }
          },
          {
            type: MessageTypes.CALCULATE_EARNINGS,
            payload: {
              click_id: clickId,
              user_id: user.id,
              campaign_id: campaign.id,
              base_cpc: Number(campaign.cpc_rate),
              user_campaign_id: userCampaign.id,
              batch_sync: true
            }
          }
        ])

        result.accepted++
        result.click_ids.push(clickId)
        return clickId

      } catch (error) {
        console.error('Error processing batch click:', error)
        result.rejected++
        result.errors.push({
          local_id: clickData.local_id,
          tracking_code: clickData.tracking_code,
          error: 'Processing error'
        })
        return null
      }
    })

    // Wait for all clicks to be processed
    await Promise.all(processPromises)

    // Store sync result in cache if sync_token provided
    if (sync_token) {
      const syncKey = `batch:sync:${sync_token}`
      await redis.set(syncKey, result, { ttl: 86400 }) // Cache for 24 hours
    }

    // Invalidate user cache
    await CacheInvalidation.invalidateUser(user.id)

    // Send summary notification
    if (result.accepted > 0) {
      await queue.publish(
        QueueChannels.NOTIFICATION,
        MessageTypes.SEND_CLICK_NOTIFICATION,
        {
          user_id: user.id,
          type: 'batch_sync',
          title: 'Offline Clicks Synced',
          description: `${result.accepted} clicks synchronized successfully`,
          data: {
            accepted: result.accepted,
            rejected: result.rejected,
            duplicates: result.duplicates
          }
        }
      )
    }

    return createResponse({
      ...result,
      message: `Batch sync completed: ${result.accepted} accepted, ${result.rejected} rejected, ${result.duplicates} duplicates`,
      sync_token,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in batch-click-sync function:', error)
    
    return createResponse(null, {
      code: 'INTERNAL_ERROR',
      message: error.message || 'An unexpected error occurred'
    }, 500)
  }
})