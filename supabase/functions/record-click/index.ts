import { serve } from "https://deno.land/std/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header from the request
    const authHeader = req.headers.get('authorization')
    
    // Check if auth header exists
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    // Get user from auth token
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const { campaignId, userAgent, ipAddress } = await req.json()

    if (!campaignId) {
      return new Response(
        JSON.stringify({ error: 'Campaign ID is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get campaign details to validate and get reward amount
    const { data: campaign, error: campaignError } = await supabaseClient
      .from('campaigns')
      .select('cost_per_click, status, start_date, end_date, max_daily_spend, total_spent')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      return new Response(
        JSON.stringify({ error: 'Campaign not found' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate campaign is active
    const now = new Date()
    const startDate = new Date(campaign.start_date)
    const endDate = campaign.end_date ? new Date(campaign.end_date) : null

    if (
      campaign.status !== 'active' ||
      startDate > now ||
      (endDate && endDate < now)
    ) {
      return new Response(
        JSON.stringify({ error: 'Campaign is not active' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check for duplicate clicks in last 24 hours
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const { data: existingClicks, error: clickCheckError } = await supabaseClient
      .from('clicks')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('user_id', user.id)
      .gte('clicked_at', twentyFourHoursAgo.toISOString())

    if (clickCheckError) {
      throw clickCheckError
    }

    if (existingClicks && existingClicks.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Already clicked this campaign today' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check daily budget
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const { data: todayClicks, error: budgetCheckError } = await supabaseClient
      .from('clicks')
      .select('reward_amount')
      .eq('campaign_id', campaignId)
      .eq('is_valid', true)
      .gte('clicked_at', todayStart.toISOString())
      .lte('clicked_at', todayEnd.toISOString())

    if (budgetCheckError) {
      throw budgetCheckError
    }

    const todaySpent = todayClicks?.reduce((sum, click) => sum + Number(click.reward_amount), 0) || 0
    
    if (todaySpent + Number(campaign.cost_per_click) > Number(campaign.max_daily_spend)) {
      return new Response(
        JSON.stringify({ error: 'Campaign daily budget exceeded' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Record the click
    const { data: clickData, error: insertError } = await supabaseClient
      .from('clicks')
      .insert({
        campaign_id: campaignId,
        user_id: user.id,
        ip_address: ipAddress || req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: userAgent || req.headers.get('user-agent') || 'unknown',
        reward_amount: campaign.cost_per_click,
        is_valid: true,
        clicked_at: now.toISOString()
      })
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    // The triggers in the database will automatically:
    // - Update campaign statistics
    // - Update user balance and experience
    // - Validate the click

    return new Response(
      JSON.stringify({ 
        success: true, 
        click: clickData,
        reward: campaign.cost_per_click
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in record-click function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})