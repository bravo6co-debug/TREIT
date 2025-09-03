import { serve } from "https://deno.land/std/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js'
import { validateUser } from '../_shared/auth.ts'
import { handleCors } from '../_shared/cors.ts'
import { 
  createResponse, 
  generateTrackingCode,
  generateDeeplink 
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
      campaign_id,
      template_id,
      platform = 'web',
      platform_username 
    } = await req.json()

    if (!campaign_id) {
      return createResponse(null, {
        code: 'MISSING_CAMPAIGN_ID',
        message: 'Campaign ID is required'
      }, 400)
    }

    // Get user information and verify account status
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        nickname,
        level,
        status,
        social_accounts,
        created_at
      `)
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return createResponse(null, {
        code: 'USER_NOT_FOUND',
        message: 'User not found'
      }, 404)
    }

    // Check if user account is active
    if (userData.status !== 'active') {
      return createResponse(null, {
        code: 'ACCOUNT_INACTIVE',
        message: 'Your account is not active. Please contact support.'
      }, 403)
    }

    // Verify social account for platform if required
    if (platform !== 'web' && platform_username) {
      const socialAccounts = userData.social_accounts as any || {}
      const platformData = socialAccounts[platform]

      if (!platformData || !platformData.verified) {
        return createResponse(null, {
          code: 'SOCIAL_NOT_VERIFIED',
          message: `Please verify your ${platform} account first`
        }, 400)
      }

      // Check if platform username matches
      if (platformData.username && platformData.username !== platform_username) {
        return createResponse(null, {
          code: 'USERNAME_MISMATCH',
          message: `Platform username does not match verified account`
        }, 400)
      }
    }

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select(`
        id,
        title,
        description,
        landing_url,
        category,
        cpc_rate,
        daily_budget,
        total_budget,
        total_spent,
        status,
        start_date,
        end_date,
        max_participants,
        current_participants,
        min_level_requirement,
        target_platforms,
        business_id,
        businesses (
          id,
          company_name,
          status,
          credit_balance
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

    // Validate campaign is active and available
    const now = new Date()
    const startDate = new Date(campaign.start_date)
    const endDate = campaign.end_date ? new Date(campaign.end_date) : null

    if (campaign.status !== 'active') {
      return createResponse(null, {
        code: 'CAMPAIGN_INACTIVE',
        message: 'This campaign is not currently active'
      }, 400)
    }

    if (campaign.businesses.status !== 'verified') {
      return createResponse(null, {
        code: 'ADVERTISER_NOT_VERIFIED',
        message: 'Campaign advertiser is not verified'
      }, 400)
    }

    if (startDate > now) {
      return createResponse(null, {
        code: 'CAMPAIGN_NOT_STARTED',
        message: `Campaign starts on ${startDate.toISOString().split('T')[0]}`
      }, 400)
    }

    if (endDate && endDate < now) {
      return createResponse(null, {
        code: 'CAMPAIGN_EXPIRED',
        message: 'This campaign has expired'
      }, 400)
    }

    // Check participant limits
    if (campaign.max_participants && campaign.current_participants >= campaign.max_participants) {
      return createResponse(null, {
        code: 'CAMPAIGN_FULL',
        message: 'This campaign has reached its participant limit'
      }, 400)
    }

    // Check user level requirement
    if (campaign.min_level_requirement && userData.level < campaign.min_level_requirement) {
      return createResponse(null, {
        code: 'LEVEL_REQUIREMENT_NOT_MET',
        message: `This campaign requires level ${campaign.min_level_requirement} or higher`
      }, 400)
    }

    // Check platform compatibility
    const targetPlatforms = campaign.target_platforms as string[] || []
    if (targetPlatforms.length > 0 && !targetPlatforms.includes(platform)) {
      return createResponse(null, {
        code: 'PLATFORM_NOT_SUPPORTED',
        message: `This campaign does not support ${platform} platform`
      }, 400)
    }

    // Check budget availability
    const remainingBudget = Number(campaign.total_budget) - Number(campaign.total_spent || 0)
    if (remainingBudget < Number(campaign.cpc_rate)) {
      return createResponse(null, {
        code: 'BUDGET_EXCEEDED',
        message: 'Campaign budget has been exceeded'
      }, 400)
    }

    // Check if user already joined this campaign
    const { data: existingParticipation } = await supabase
      .from('user_campaigns')
      .select('id, status, tracking_code, created_at')
      .eq('user_id', user.id)
      .eq('campaign_id', campaign_id)
      .single()

    if (existingParticipation) {
      if (existingParticipation.status === 'active') {
        // User already participating - return existing data
        const baseDeeplinkUrl = Deno.env.get('BASE_DEEPLINK_URL') || 'https://tre-it.com'
        const shareUrl = generateDeeplink(baseDeeplinkUrl, existingParticipation.tracking_code)

        return createResponse({
          matching_id: existingParticipation.id,
          tracking_code: existingParticipation.tracking_code,
          share_url: shareUrl,
          message: 'You are already participating in this campaign',
          joined_at: existingParticipation.created_at
        })
      } else {
        return createResponse(null, {
          code: 'ALREADY_JOINED',
          message: 'You have already participated in this campaign'
        }, 409)
      }
    }

    // Get template information if specified
    let templateContent = null
    if (template_id) {
      const { data: template, error: templateError } = await supabase
        .from('templates')
        .select(`
          id,
          content,
          preview_url,
          usage_count,
          performance_score
        `)
        .eq('id', template_id)
        .eq('campaign_id', campaign_id)
        .single()

      if (!templateError && template) {
        templateContent = template
        
        // Increment template usage count
        await supabase
          .from('templates')
          .update({
            usage_count: (template.usage_count || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', template_id)
      }
    }

    // Generate unique tracking code
    let trackingCode = generateTrackingCode()
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
    const { data: userCampaign, error: ucError } = await supabase
      .from('user_campaigns')
      .insert({
        user_id: user.id,
        campaign_id: campaign_id,
        template_id: template_id,
        tracking_code: trackingCode,
        platform: platform,
        platform_username: platform_username,
        status: 'active',
        joined_at: now.toISOString()
      })
      .select()
      .single()

    if (ucError) throw ucError

    // Update campaign participant count
    await supabase
      .from('campaigns')
      .update({
        current_participants: (campaign.current_participants || 0) + 1,
        updated_at: now.toISOString()
      })
      .eq('id', campaign_id)

    // Generate share URL
    const baseDeeplinkUrl = Deno.env.get('BASE_DEEPLINK_URL') || 'https://tre-it.com'
    const shareUrl = generateDeeplink(baseDeeplinkUrl, trackingCode)

    // Create deeplink mapping for redirect handler
    await supabase
      .from('deeplink_mappings')
      .insert({
        tracking_code: trackingCode,
        original_url: campaign.landing_url,
        user_campaign_id: userCampaign.id,
        created_at: now.toISOString(),
        expires_at: endDate?.toISOString() || null
      })

    // Award participation XP using secure RPC function
    const participationXP = 10 + (userData.level * 2) // More XP for higher level users
    const { error: xpUpdateError } = await supabase
      .rpc('update_user_earnings', {
        p_user_id: user.id,
        p_earnings_amount: 0,
        p_xp_amount: participationXP
      })

    if (xpUpdateError) throw xpUpdateError

    return createResponse({
      matching_id: userCampaign.id,
      tracking_code: trackingCode,
      share_url: shareUrl,
      template_content: templateContent,
      campaign: {
        id: campaign.id,
        title: campaign.title,
        description: campaign.description,
        category: campaign.category,
        cpc_rate: campaign.cpc_rate,
        advertiser: campaign.businesses.company_name
      },
      participation_details: {
        platform: platform,
        platform_username: platform_username,
        joined_at: userCampaign.joined_at,
        xp_awarded: participationXP
      },
      sharing_info: {
        suggested_hashtags: [`#${campaign.category}`, '#treit', '#마케팅'],
        best_posting_times: ['14:00-16:00', '19:00-21:00'],
        performance_tips: [
          'Include relevant hashtags',
          'Post during peak hours',
          'Engage with your audience'
        ]
      }
    })

  } catch (error) {
    console.error('Error in matching-join function:', error)
    
    return createResponse(null, {
      code: 'INTERNAL_ERROR',
      message: error.message || 'An unexpected error occurred'
    }, 500)
  }
})