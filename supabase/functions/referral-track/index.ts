import { serve } from "https://deno.land/std/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js'
import { validateUser } from '../_shared/auth.ts'
import { handleCors } from '../_shared/cors.ts'
import { createResponse, updateUserXP } from '../_shared/utils.ts'

interface ReferralTrackResult {
  success: boolean
  referral_code?: string
  referrer_user?: {
    id: string
    username: string
    level: number
  }
  rewards?: {
    referrer_reward: number
    referrer_xp: number
    new_user_reward: number
    new_user_xp: number
  }
  monthly_limit_reached?: boolean
  already_referred?: boolean
  message: string
}

interface ReferralStatsResult {
  total_referrals: number
  monthly_referrals: number
  monthly_xp_earned: number
  monthly_limit: number
  monthly_limit_reached: boolean
  pending_invites: number
  recent_referrals: Array<{
    id: string
    referred_user_username: string
    reward_amount: number
    xp_reward: number
    created_at: string
    status: string
  }>
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

    const method = req.method
    const url = new URL(req.url)
    const pathSegments = url.pathname.split('/').filter(Boolean)
    const action = pathSegments[pathSegments.length - 1]

    // Validate authentication for all actions
    const authHeader = req.headers.get('authorization')
    const { user } = await validateUser(authHeader)

    // GET /referral-track/stats - Get referral statistics
    if (method === 'GET' && action === 'stats') {
      return await getReferralStats(supabase, user.id)
    }

    // POST /referral-track/process - Process referral code during signup
    if (method === 'POST' && action === 'process') {
      const { referral_code, new_user_id } = await req.json()
      return await processReferral(supabase, referral_code, new_user_id || user.id)
    }

    // POST /referral-track/generate - Generate new referral code
    if (method === 'POST' && action === 'generate') {
      return await generateReferralCode(supabase, user.id)
    }

    // POST /referral-track/validate - Validate referral code
    if (method === 'POST' && action === 'validate') {
      const { referral_code } = await req.json()
      return await validateReferralCode(supabase, referral_code)
    }

    return createResponse(null, {
      code: 'INVALID_ACTION',
      message: 'Invalid action. Use /stats, /process, /generate, or /validate'
    }, 400)

  } catch (error) {
    console.error('Error in referral-track function:', error)
    
    return createResponse(null, {
      code: 'INTERNAL_ERROR',
      message: error.message || 'An unexpected error occurred'
    }, 500)
  }
})

async function getReferralStats(supabase: any, userId: string): Promise<Response> {
  // Get user's referral code
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('referral_code')
    .eq('id', userId)
    .single()

  if (userError) throw userError

  // Get referral statistics
  const { data: referralStats, error: statsError } = await supabase
    .from('referrals')
    .select(`
      id,
      reward_amount,
      xp_reward,
      created_at,
      status,
      referred_user_id,
      users!referrals_referred_user_id_fkey(username)
    `)
    .eq('referrer_user_id', userId)
    .order('created_at', { ascending: false })

  if (statsError) throw statsError

  // Calculate monthly stats
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  
  const monthlyReferrals = referralStats.filter(r => 
    new Date(r.created_at) >= startOfMonth
  )

  const monthlyXpEarned = monthlyReferrals.reduce((sum, r) => sum + (r.xp_reward || 0), 0)
  const monthlyLimit = 1500 // XP limit
  
  const result: ReferralStatsResult = {
    total_referrals: referralStats.length,
    monthly_referrals: monthlyReferrals.length,
    monthly_xp_earned: monthlyXpEarned,
    monthly_limit: monthlyLimit,
    monthly_limit_reached: monthlyXpEarned >= monthlyLimit,
    pending_invites: referralStats.filter(r => r.status === 'pending').length,
    recent_referrals: referralStats.slice(0, 10).map(r => ({
      id: r.id,
      referred_user_username: r.users?.username || 'Unknown',
      reward_amount: r.reward_amount || 0,
      xp_reward: r.xp_reward || 0,
      created_at: r.created_at,
      status: r.status
    }))
  }

  return createResponse(result)
}

async function processReferral(supabase: any, referralCode: string, newUserId: string): Promise<Response> {
  if (!referralCode) {
    return createResponse<ReferralTrackResult>({
      success: false,
      message: 'No referral code provided'
    })
  }

  // Find referrer by code
  const { data: referrerData, error: referrerError } = await supabase
    .from('users')
    .select('id, username, level, referral_code')
    .eq('referral_code', referralCode)
    .eq('status', 'active')
    .single()

  if (referrerError || !referrerData) {
    return createResponse<ReferralTrackResult>({
      success: false,
      message: 'Invalid or expired referral code'
    })
  }

  // Check if user is trying to refer themselves
  if (referrerData.id === newUserId) {
    return createResponse<ReferralTrackResult>({
      success: false,
      message: 'You cannot refer yourself'
    })
  }

  // Check if this user has already been referred
  const { data: existingReferral, error: existingError } = await supabase
    .from('referrals')
    .select('id')
    .eq('referred_user_id', newUserId)
    .single()

  if (existingError && existingError.code !== 'PGRST116') {
    throw existingError
  }

  if (existingReferral) {
    return createResponse<ReferralTrackResult>({
      success: false,
      already_referred: true,
      message: 'This user has already been referred'
    })
  }

  // Check monthly limit for referrer
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const { data: monthlyReferrals, error: monthlyError } = await supabase
    .from('referrals')
    .select('xp_reward')
    .eq('referrer_user_id', referrerData.id)
    .gte('created_at', startOfMonth.toISOString())
    .lte('created_at', endOfMonth.toISOString())

  if (monthlyError) throw monthlyError

  const monthlyXpEarned = monthlyReferrals.reduce((sum: number, r: any) => sum + (r.xp_reward || 0), 0)
  const monthlyLimit = 1500

  if (monthlyXpEarned >= monthlyLimit) {
    return createResponse<ReferralTrackResult>({
      success: false,
      monthly_limit_reached: true,
      message: 'Monthly referral limit reached for this referrer'
    })
  }

  // Calculate rewards based on referrer level
  const baseReward = 200 // Base reward in won
  const baseXp = 200 // Base XP
  const levelMultiplier = 1 + (referrerData.level - 1) * 0.1 // 10% increase per level

  const referrerReward = Math.floor(baseReward * levelMultiplier)
  const referrerXp = Math.floor(baseXp * levelMultiplier)
  const newUserReward = baseReward // New user gets base reward
  const newUserXp = baseXp // New user gets base XP

  // Ensure we don't exceed monthly limit
  const remainingXpLimit = monthlyLimit - monthlyXpEarned
  const actualReferrerXp = Math.min(referrerXp, remainingXpLimit)

  // Create referral record
  const { data: referralRecord, error: insertError } = await supabase
    .from('referrals')
    .insert({
      referrer_user_id: referrerData.id,
      referred_user_id: newUserId,
      reward_amount: referrerReward,
      xp_reward: actualReferrerXp,
      new_user_reward: newUserReward,
      new_user_xp: newUserXp,
      status: 'completed',
      created_at: new Date().toISOString()
    })
    .select()
    .single()

  if (insertError) throw insertError

  // Update both users' balances and XP using secure RPC function
  const { error: rewardUpdateError } = await supabase
    .rpc('update_referral_rewards', {
      p_referrer_id: referrerData.id,
      p_new_user_id: newUserId,
      p_referrer_earnings: referrerReward,
      p_referrer_xp: actualReferrerXp,
      p_new_user_earnings: newUserReward,
      p_new_user_xp: newUserXp
    })

  if (rewardUpdateError) throw rewardUpdateError

  // Check for level ups
  await updateUserXP(supabase, referrerData.id, 0) // Just recalculate level
  await updateUserXP(supabase, newUserId, 0) // Just recalculate level

  const result: ReferralTrackResult = {
    success: true,
    referral_code: referralCode,
    referrer_user: {
      id: referrerData.id,
      username: referrerData.username,
      level: referrerData.level
    },
    rewards: {
      referrer_reward: referrerReward,
      referrer_xp: actualReferrerXp,
      new_user_reward: newUserReward,
      new_user_xp: newUserXp
    },
    monthly_limit_reached: actualReferrerXp < referrerXp,
    message: 'Referral processed successfully'
  }

  return createResponse(result)
}

async function generateReferralCode(supabase: any, userId: string): Promise<Response> {
  // Generate a new unique referral code
  let referralCode = ''
  let isUnique = false
  let attempts = 0
  
  while (!isUnique && attempts < 10) {
    referralCode = generateRandomCode()
    
    const { data: existingCode, error } = await supabase
      .from('users')
      .select('id')
      .eq('referral_code', referralCode)
      .single()

    if (error && error.code === 'PGRST116') {
      // No existing code found, this is unique
      isUnique = true
    }
    
    attempts++
  }

  if (!isUnique) {
    return createResponse(null, {
      code: 'CODE_GENERATION_FAILED',
      message: 'Failed to generate unique referral code'
    }, 500)
  }

  // Update user's referral code
  const { data: userData, error: updateError } = await supabase
    .from('users')
    .update({
      referral_code: referralCode,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select('referral_code')
    .single()

  if (updateError) throw updateError

  return createResponse({
    referral_code: referralCode,
    message: 'Referral code generated successfully'
  })
}

async function validateReferralCode(supabase: any, referralCode: string): Promise<Response> {
  if (!referralCode) {
    return createResponse({
      valid: false,
      message: 'Referral code is required'
    })
  }

  const { data: referrerData, error } = await supabase
    .from('users')
    .select('id, username, level, status')
    .eq('referral_code', referralCode)
    .single()

  if (error || !referrerData) {
    return createResponse({
      valid: false,
      message: 'Invalid referral code'
    })
  }

  if (referrerData.status !== 'active') {
    return createResponse({
      valid: false,
      message: 'Referral code is no longer active'
    })
  }

  return createResponse({
    valid: true,
    referrer: {
      username: referrerData.username,
      level: referrerData.level
    },
    message: 'Valid referral code'
  })
}

function generateRandomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}