import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { validateUser } from '../_shared/auth.ts'
import { handleCors } from '../_shared/cors.ts'
import { createResponse, checkDailyLimit, updateUserXP } from '../_shared/utils.ts'

interface DailyBonusResult {
  bonus_claimed: boolean
  bonus_amount: number
  streak_count: number
  streak_bonus: number
  total_reward: number
  xp_gained: number
  next_bonus_available: string
  streak_milestones: {
    next_milestone: number
    reward_preview: number
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

    // Validate authentication
    const authHeader = req.headers.get('authorization')
    const { user } = await validateUser(authHeader)

    // Parse request body
    const { 
      claim_bonus = true,
      check_only = false 
    } = await req.json().catch(() => ({ claim_bonus: true, check_only: false }))

    // Get user information
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        level,
        xp,
        total_earnings,
        status,
        created_at,
        last_login_at
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
        message: 'Your account is not active'
      }, 403)
    }

    // Check if user has already claimed today's bonus
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const { data: existingBonus, error: bonusCheckError } = await supabase
      .from('daily_bonuses')
      .select('*')
      .eq('user_id', user.id)
      .gte('claimed_at', today.toISOString())
      .lt('claimed_at', tomorrow.toISOString())
      .single()

    if (bonusCheckError && bonusCheckError.code !== 'PGRST116') {
      throw bonusCheckError
    }

    // If user already claimed today's bonus
    if (existingBonus) {
      return createResponse({
        bonus_claimed: false,
        bonus_amount: 0,
        streak_count: existingBonus.streak_count || 0,
        streak_bonus: 0,
        total_reward: 0,
        xp_gained: 0,
        next_bonus_available: tomorrow.toISOString(),
        message: 'Daily bonus already claimed today',
        last_claimed: existingBonus.claimed_at
      })
    }

    // If only checking availability
    if (check_only) {
      // Calculate what the bonus would be
      const { streak_count } = await calculateStreakCount(supabase, user.id)
      const bonusAmount = calculateBaseBonusAmount(userData.level)
      const streakBonus = calculateStreakBonus(streak_count + 1, bonusAmount)
      
      return createResponse({
        bonus_claimed: false,
        bonus_available: true,
        bonus_amount: bonusAmount,
        streak_count: streak_count,
        potential_streak_bonus: streakBonus,
        estimated_total_reward: bonusAmount + streakBonus,
        next_bonus_available: tomorrow.toISOString()
      })
    }

    // Don't claim bonus if claim_bonus is false
    if (!claim_bonus) {
      return createResponse(null, {
        code: 'BONUS_NOT_CLAIMED',
        message: 'Set claim_bonus to true to claim your daily bonus'
      }, 400)
    }

    // Calculate current streak
    const { streak_count, last_claim_date } = await calculateStreakCount(supabase, user.id)

    // Determine new streak count
    let newStreakCount = 1 // Default for new streak
    
    if (last_claim_date) {
      const lastClaimDate = new Date(last_claim_date)
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      
      // If last claim was yesterday, continue streak
      if (lastClaimDate >= yesterday && lastClaimDate < today) {
        newStreakCount = streak_count + 1
      }
      // If last claim was today (shouldn't happen due to earlier check)
      else if (lastClaimDate >= today) {
        return createResponse(null, {
          code: 'BONUS_ALREADY_CLAIMED',
          message: 'Daily bonus already claimed today'
        }, 409)
      }
      // Otherwise, streak is broken, start new streak
    }

    // Calculate bonus amounts
    const baseBonusAmount = calculateBaseBonusAmount(userData.level)
    const streakBonus = calculateStreakBonus(newStreakCount, baseBonusAmount)
    const totalReward = baseBonusAmount + streakBonus

    // Calculate XP reward
    const xpGained = Math.floor(totalReward / 100) + (newStreakCount >= 7 ? 50 : 0) // Bonus XP for weekly streaks

    // Record the daily bonus
    const { data: bonusRecord, error: insertError } = await supabase
      .from('daily_bonuses')
      .insert({
        user_id: user.id,
        bonus_amount: baseBonusAmount,
        streak_count: newStreakCount,
        streak_bonus: streakBonus,
        total_reward: totalReward,
        xp_reward: xpGained,
        claimed_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Update user balance and XP using secure RPC function
    const { error: updateError } = await supabase
      .rpc('update_daily_bonus_rewards', {
        p_user_id: user.id,
        p_earnings_amount: totalReward,
        p_xp_amount: xpGained
      })

    if (updateError) throw updateError

    // Update last login time separately (safe update)
    await supabase
      .from('users')
      .update({
        last_login_at: new Date().toISOString()
      })
      .eq('id', user.id)

    // Check for level up
    const { newLevel, levelUp } = await updateUserXP(supabase, user.id, 0) // Just recalculate level

    // Calculate next milestone information
    const nextMilestone = getNextStreakMilestone(newStreakCount)
    const nextMilestoneReward = calculateStreakBonus(nextMilestone, baseBonusAmount)

    const result: DailyBonusResult = {
      bonus_claimed: true,
      bonus_amount: baseBonusAmount,
      streak_count: newStreakCount,
      streak_bonus: streakBonus,
      total_reward: totalReward,
      xp_gained: xpGained,
      next_bonus_available: tomorrow.toISOString(),
      streak_milestones: {
        next_milestone: nextMilestone,
        reward_preview: nextMilestoneReward
      }
    }

    // Add level up information if applicable
    if (levelUp) {
      (result as any).level_up = {
        new_level: newLevel,
        level_bonus_unlocked: `${(newLevel - 1) * 1}% bonus on all earnings`
      }
    }

    // Add special streak messages
    if (newStreakCount === 7) {
      (result as any).special_message = 'Amazing! 7-day streak achieved! 🔥'
    } else if (newStreakCount === 30) {
      (result as any).special_message = 'Incredible! 30-day streak! You are unstoppable! 🏆'
    } else if (newStreakCount % 7 === 0) {
      (result as any).special_message = `${newStreakCount}-day streak! Keep the momentum going! ⚡`
    }

    return createResponse(result)

  } catch (error) {
    console.error('Error in daily-bonus function:', error)
    
    return createResponse(null, {
      code: 'INTERNAL_ERROR',
      message: error.message || 'An unexpected error occurred'
    }, 500)
  }
})

// Helper function to calculate base bonus amount based on user level
function calculateBaseBonusAmount(userLevel: number): number {
  const baseAmount = 100 // 100 won base bonus
  const levelMultiplier = 1 + (userLevel - 1) * 0.1 // 10% increase per level
  return Math.floor(baseAmount * levelMultiplier)
}

// Helper function to calculate streak bonus
function calculateStreakBonus(streakCount: number, baseAmount: number): number {
  if (streakCount < 3) return 0
  
  // Bonus increases with streak length
  let bonusMultiplier = 0
  
  if (streakCount >= 3 && streakCount < 7) {
    bonusMultiplier = 0.5 // 50% bonus for 3-6 day streak
  } else if (streakCount >= 7 && streakCount < 14) {
    bonusMultiplier = 1.0 // 100% bonus for 7-13 day streak
  } else if (streakCount >= 14 && streakCount < 30) {
    bonusMultiplier = 1.5 // 150% bonus for 14-29 day streak
  } else if (streakCount >= 30) {
    bonusMultiplier = 2.0 // 200% bonus for 30+ day streak
  }
  
  return Math.floor(baseAmount * bonusMultiplier)
}

// Helper function to calculate current streak count
async function calculateStreakCount(supabase: any, userId: string): Promise<{
  streak_count: number
  last_claim_date: string | null
}> {
  // Get recent bonus claims in reverse chronological order
  const { data: recentBonuses, error } = await supabase
    .from('daily_bonuses')
    .select('claimed_at, streak_count')
    .eq('user_id', userId)
    .order('claimed_at', { ascending: false })
    .limit(30)

  if (error) throw error

  if (!recentBonuses || recentBonuses.length === 0) {
    return { streak_count: 0, last_claim_date: null }
  }

  const mostRecent = recentBonuses[0]
  return {
    streak_count: mostRecent.streak_count || 0,
    last_claim_date: mostRecent.claimed_at
  }
}

// Helper function to get next streak milestone
function getNextStreakMilestone(currentStreak: number): number {
  if (currentStreak < 3) return 3
  if (currentStreak < 7) return 7
  if (currentStreak < 14) return 14
  if (currentStreak < 30) return 30
  if (currentStreak < 60) return 60
  if (currentStreak < 100) return 100
  return Math.ceil(currentStreak / 50) * 50 // Every 50 days after 100
}