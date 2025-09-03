import { serve } from "https://deno.land/std/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js'
import { validateUser } from '../_shared/auth.ts'
import { handleCors } from '../_shared/cors.ts'
import { 
  createResponse, 
  generateTrackingCode,
  generateDeeplink,
  addUTMParams 
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

    // Parse request body
    const { 
      advertiser_url,
      campaign_id,
      template_id,
      platform = 'web',
      utm_params = {},
      custom_params = {}
    } = await req.json()

    if (!advertiser_url || !campaign_id) {
      return createResponse(null, {
        code: 'MISSING_REQUIRED_FIELDS',
        message: 'Advertiser URL and campaign ID are required'
      }, 400)
    }

    // Validate URL format
    try {
      new URL(advertiser_url)
    } catch {
      return createResponse(null, {
        code: 'INVALID_URL',
        message: 'Invalid advertiser URL format'
      }, 400)
    }

    // Verify campaign exists and is active
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select(`
        id,
        title,
        status,
        start_date,
        end_date,
        landing_url,
        business_id,
        businesses (
          id,
          status,
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

    // Check if campaign is active
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

    // Check if user is already participating in this campaign
    const { data: existingParticipation } = await supabase
      .from('user_campaigns')
      .select('id, status, tracking_code')
      .eq('user_id', user.id)
      .eq('campaign_id', campaign_id)
      .single()

    let trackingCode: string
    let userCampaignId: string

    if (existingParticipation) {
      // User already participating - return existing tracking code
      if (existingParticipation.status === 'active') {
        trackingCode = existingParticipation.tracking_code
        userCampaignId = existingParticipation.id
      } else {
        // Reactivate participation
        trackingCode = generateTrackingCode()
        
        const { data: updatedUC, error: updateError } = await supabase
          .from('user_campaigns')
          .update({
            tracking_code: trackingCode,
            status: 'active',
            updated_at: now.toISOString()
          })
          .eq('id', existingParticipation.id)
          .select()
          .single()

        if (updateError) throw updateError
        userCampaignId = updatedUC.id
      }
    } else {
      // Create new participation
      trackingCode = generateTrackingCode()

      // Ensure tracking code is unique
      let isUnique = false
      let attempts = 0
      
      while (!isUnique && attempts < 10) {
        const { data: existing } = await supabase
          .from('user_campaigns')
          .select('id')
          .eq('tracking_code', trackingCode)
          .single()

        if (!existing) {
          isUnique = true
        } else {
          trackingCode = generateTrackingCode()
          attempts++
        }
      }

      if (!isUnique) {
        throw new Error('Unable to generate unique tracking code')
      }

      // Create user campaign participation
      const { data: newUserCampaign, error: ucError } = await supabase
        .from('user_campaigns')
        .insert({
          user_id: user.id,
          campaign_id: campaign_id,
          template_id: template_id,
          tracking_code: trackingCode,
          platform: platform,
          status: 'active',
          joined_at: now.toISOString()
        })
        .select()
        .single()

      if (ucError) throw ucError
      userCampaignId = newUserCampaign.id
    }

    // Generate deeplink URL
    const baseDeeplinkUrl = Deno.env.get('BASE_DEEPLINK_URL') || 'https://tre-it.com'
    const deeplink = `${baseDeeplinkUrl}/c/${trackingCode}` // Updated format as requested

    // Create UTM parameters for tracking
    const defaultUTMParams = {
      utm_source: 'treit',
      utm_medium: platform,
      utm_campaign: campaign.title.toLowerCase().replace(/\s+/g, '_'),
      utm_content: trackingCode,
      utm_term: campaign.businesses.company_name.toLowerCase().replace(/\s+/g, '_'),
      ...utm_params
    }

    // Add UTM parameters to the original advertiser URL
    const trackedAdvertiserUrl = addUTMParams(advertiser_url, defaultUTMParams)

    // Store the mapping for redirect handler
    const { error: mappingError } = await supabase
      .from('deeplink_mappings')
      .upsert({
        tracking_code: trackingCode,
        original_url: trackedAdvertiserUrl,
        user_campaign_id: userCampaignId,
        created_at: now.toISOString(),
        expires_at: endDate?.toISOString() || null
      }, {
        onConflict: 'tracking_code'
      })

    if (mappingError) throw mappingError

    // Get template content if specified
    let templateContent = null
    if (template_id) {
      const { data: template } = await supabase
        .from('templates')
        .select('content, preview_url')
        .eq('id', template_id)
        .eq('campaign_id', campaign_id)
        .single()

      templateContent = template
    }

    // Update campaign participation count using secure RPC function
    const { error: participantError } = await supabase
      .rpc('increment_campaign_participants', {
        p_campaign_id: campaign_id
      })

    if (participantError) throw participantError

    return createResponse({
      tracking_code: trackingCode,
      deeplink: deeplink,
      share_url: deeplink, // Alias for compatibility
      original_url: trackedAdvertiserUrl,
      campaign: {
        id: campaign.id,
        title: campaign.title,
        advertiser: campaign.businesses.company_name
      },
      template_content: templateContent,
      utm_params: defaultUTMParams,
      expires_at: endDate?.toISOString() || null,
      platform: platform
    })

  } catch (error) {
    console.error('Error in generate-deeplink function:', error)
    
    return createResponse(null, {
      code: 'INTERNAL_ERROR',
      message: error.message || 'An unexpected error occurred'
    }, 500)
  }
})