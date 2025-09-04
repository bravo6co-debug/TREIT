import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Check if this is a scheduled job or manual trigger
    const authHeader = req.headers.get('Authorization')
    if (!authHeader && req.headers.get('x-cron-signature') !== Deno.env.get('CRON_SECRET')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Starting weekly ranking settlement...')

    // Call the settlement function
    const { data, error } = await supabaseAdmin.rpc('settle_weekly_rankings')

    if (error) {
      console.error('Settlement error:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get settlement summary
    const lastMonday = new Date()
    lastMonday.setDate(lastMonday.getDate() - lastMonday.getDay() - 6)
    lastMonday.setHours(0, 0, 0, 0)
    const weekStart = lastMonday.toISOString().split('T')[0]

    const { data: summary } = await supabaseAdmin
      .from('weekly_xp_rankings')
      .select('user_id, rank, reward_amount')
      .eq('week_start', weekStart)
      .not('rank', 'is', null)
      .lte('rank', 10)
      .order('rank')

    console.log('Settlement completed. Rewards distributed:', summary?.length || 0)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Weekly settlement completed successfully',
        rewardsDistributed: summary?.length || 0,
        weekStart,
        summary
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})