import { createClient } from 'https://esm.sh/@supabase/supabase-js'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
}

// Input validation functions to prevent injection attacks
export interface ValidationError {
  field: string
  message: string
  value?: any
}

export function validateRequired(value: any, fieldName: string): ValidationError | null {
  if (value === null || value === undefined || value === '') {
    return { field: fieldName, message: `${fieldName} is required` }
  }
  return null
}

export function validateUUID(value: string, fieldName: string): ValidationError | null {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(value)) {
    return { field: fieldName, message: `${fieldName} must be a valid UUID`, value }
  }
  return null
}

export function validateString(value: any, fieldName: string, options: {
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  allowedValues?: string[]
} = {}): ValidationError | null {
  if (typeof value !== 'string') {
    return { field: fieldName, message: `${fieldName} must be a string`, value }
  }

  if (options.minLength && value.length < options.minLength) {
    return { field: fieldName, message: `${fieldName} must be at least ${options.minLength} characters`, value }
  }

  if (options.maxLength && value.length > options.maxLength) {
    return { field: fieldName, message: `${fieldName} must be no more than ${options.maxLength} characters`, value }
  }

  if (options.pattern && !options.pattern.test(value)) {
    return { field: fieldName, message: `${fieldName} format is invalid`, value }
  }

  if (options.allowedValues && !options.allowedValues.includes(value)) {
    return { field: fieldName, message: `${fieldName} must be one of: ${options.allowedValues.join(', ')}`, value }
  }

  return null
}

export function validateNumber(value: any, fieldName: string, options: {
  min?: number
  max?: number
  integer?: boolean
} = {}): ValidationError | null {
  const num = Number(value)
  
  if (isNaN(num) || !isFinite(num)) {
    return { field: fieldName, message: `${fieldName} must be a valid number`, value }
  }

  if (options.integer && !Number.isInteger(num)) {
    return { field: fieldName, message: `${fieldName} must be an integer`, value }
  }

  if (options.min !== undefined && num < options.min) {
    return { field: fieldName, message: `${fieldName} must be at least ${options.min}`, value }
  }

  if (options.max !== undefined && num > options.max) {
    return { field: fieldName, message: `${fieldName} must be no more than ${options.max}`, value }
  }

  return null
}

export function validateEmail(value: any, fieldName: string): ValidationError | null {
  if (typeof value !== 'string') {
    return { field: fieldName, message: `${fieldName} must be a string`, value }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(value)) {
    return { field: fieldName, message: `${fieldName} must be a valid email address`, value }
  }

  return null
}

export function validateUrl(value: any, fieldName: string, options: {
  allowedProtocols?: string[]
  allowedDomains?: string[]
} = {}): ValidationError | null {
  if (typeof value !== 'string') {
    return { field: fieldName, message: `${fieldName} must be a string`, value }
  }

  try {
    const url = new URL(value)
    
    if (options.allowedProtocols && !options.allowedProtocols.includes(url.protocol)) {
      return { field: fieldName, message: `${fieldName} protocol must be one of: ${options.allowedProtocols.join(', ')}`, value }
    }

    if (options.allowedDomains && !options.allowedDomains.some(domain => url.hostname.endsWith(domain))) {
      return { field: fieldName, message: `${fieldName} domain must be from allowed domains`, value }
    }

    return null
  } catch (error) {
    return { field: fieldName, message: `${fieldName} must be a valid URL`, value }
  }
}

export function sanitizeString(value: string): string {
  if (typeof value !== 'string') return ''
  
  // Remove potential SQL injection patterns
  return value
    .replace(/['";\\]/g, '') // Remove quotes and backslashes
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove block comment start
    .replace(/\*\//g, '') // Remove block comment end
    .replace(/\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b/gi, '') // Remove SQL keywords
    .trim()
}

export function sanitizeUserInput(input: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {}
  
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value)
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeUserInput(value)
    } else {
      sanitized[key] = value
    }
  }
  
  return sanitized
}

export function validateAndSanitizeInput(
  input: Record<string, any>,
  validations: Record<string, (value: any, fieldName: string) => ValidationError | null>
): { isValid: boolean; errors: ValidationError[]; sanitized: Record<string, any> } {
  const errors: ValidationError[] = []
  const sanitized = sanitizeUserInput(input)
  
  for (const [fieldName, validator] of Object.entries(validations)) {
    const value = sanitized[fieldName]
    const error = validator(value, fieldName)
    if (error) {
      errors.push(error)
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  }
}

export function createResponse<T>(
  data: T | null,
  error: { code: string; message: string; details?: any } | null,
  status: number = 200
): Response {
  const response: ApiResponse<T> = {
    success: !error,
    ...(data && { data }),
    ...(error && { error })
  }

  return new Response(JSON.stringify(response), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-real-ip, x-user-agent',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
    }
  })
}

export function generateTrackingCode(length: number = 16): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export async function getRealIP(request: Request): Promise<string> {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  
  return realIP || cfConnectingIP || forwardedFor?.split(',')[0]?.trim() || 'unknown'
}

export async function detectBot(userAgent: string, ip: string): Promise<boolean> {
  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /requests/i,
    /headless/i
  ]

  const isBotUA = botPatterns.some(pattern => pattern.test(userAgent))
  
  // Check for suspicious IP patterns
  const suspiciousIPs = ['127.0.0.1', '::1', 'localhost']
  const isSuspiciousIP = suspiciousIPs.includes(ip)

  return isBotUA || isSuspiciousIP
}

export async function validateClickTime(
  supabase: any,
  userId: string,
  campaignId: string,
  minInterval: number = 60000 // 1 minute in milliseconds
): Promise<boolean> {
  const { data: lastClick } = await supabase
    .from('click_events')
    .select('clicked_at')
    .eq('user_id', userId)
    .eq('campaign_id', campaignId)
    .order('clicked_at', { ascending: false })
    .limit(1)
    .single()

  if (!lastClick) return true

  const timeDiff = Date.now() - new Date(lastClick.clicked_at).getTime()
  return timeDiff >= minInterval
}

export function calculateLevelBonus(level: number, baseAmount: number): number {
  // Level bonus: (level - 1) * 1% of base amount
  const bonusRate = (level - 1) * 0.01
  return Math.floor(baseAmount * bonusRate)
}

export function calculateUserLevel(xp: number): number {
  // Each level requires exponentially more XP
  // Level 1: 0 XP, Level 2: 100 XP, Level 3: 300 XP, etc.
  let level = 1
  let requiredXP = 0
  
  while (xp >= requiredXP) {
    level++
    requiredXP += level * 100
  }
  
  return Math.min(level - 1, 100) // Max level is 100
}

export async function updateUserXP(
  supabase: any,
  userId: string,
  xpGain: number
): Promise<{ newLevel: number; levelUp: boolean }> {
  const { data: user } = await supabase
    .from('users')
    .select('xp, level')
    .eq('id', userId)
    .single()

  if (!user) throw new Error('User not found')

  const newXP = user.xp + xpGain
  const newLevel = calculateUserLevel(newXP)
  const levelUp = newLevel > user.level

  await supabase
    .from('users')
    .update({
      xp: newXP,
      level: newLevel,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)

  return { newLevel, levelUp }
}

export function generateDeeplink(baseUrl: string, trackingCode: string): string {
  return `${baseUrl}/t/${trackingCode}`
}

export function addUTMParams(url: string, params: Record<string, string>): string {
  const urlObj = new URL(url)
  Object.entries(params).forEach(([key, value]) => {
    urlObj.searchParams.set(key, value)
  })
  return urlObj.toString()
}

export async function logFraudAttempt(
  supabase: any,
  userId: string,
  type: string,
  details: any
): Promise<void> {
  await supabase
    .from('fraud_detection_logs')
    .insert({
      user_id: userId,
      detection_type: type,
      details: details,
      severity: 'medium',
      created_at: new Date().toISOString()
    })
}

export function calculateFraudScore(factors: {
  ipReputation: number
  clickPattern: number
  deviceFingerprint: number
  timePattern: number
  geoConsistency: number
}): number {
  const weights = {
    ipReputation: 0.25,
    clickPattern: 0.30,
    deviceFingerprint: 0.20,
    timePattern: 0.15,
    geoConsistency: 0.10
  }

  return Object.entries(factors).reduce((score, [key, value]) => {
    return score + (value * weights[key as keyof typeof weights])
  }, 0)
}

export async function checkDailyLimit(
  supabase: any,
  userId: string,
  limitType: string,
  maxCount: number
): Promise<boolean> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  let table = ''
  let userField = 'user_id'
  
  switch (limitType) {
    case 'clicks':
      table = 'click_events'
      break
    case 'campaigns':
      table = 'user_campaigns'
      break
    case 'bonus':
      table = 'daily_bonuses'
      break
    default:
      throw new Error('Invalid limit type')
  }

  const { data, error } = await supabase
    .from(table)
    .select('id')
    .eq(userField, userId)
    .gte('created_at', today.toISOString())

  if (error) throw error

  return (data?.length || 0) < maxCount
}

export async function calculateValidationScore(
  supabase: any,
  factors: {
    ipAddress: string
    userAgent: string
    referrer: string
    userId: string
    campaignId: string
    sessionId?: string
  }
): Promise<number> {
  let score = 1.0

  // Check IP reputation
  const oneHourAgo = new Date(Date.now() - 3600000)
  const { data: recentIPClicks } = await supabase
    .from('click_events')
    .select('id')
    .eq('ip_address', factors.ipAddress)
    .gte('clicked_at', oneHourAgo.toISOString())

  // High click frequency from same IP reduces score
  if (recentIPClicks && recentIPClicks.length > 5) {
    score -= Math.min(0.4, recentIPClicks.length * 0.05)
  }

  // Check user agent patterns
  const suspiciousUA = /bot|crawler|spider|scraper|headless|phantomjs|selenium/i
  if (suspiciousUA.test(factors.userAgent)) {
    score -= 0.6
  }

  // Check referrer quality
  if (!factors.referrer || factors.referrer === 'direct') {
    score -= 0.1
  } else {
    try {
      const referrerUrl = new URL(factors.referrer)
      const knownSocialDomains = [
        'instagram.com', 'facebook.com', 'twitter.com', 'tiktok.com',
        'youtube.com', 'linkedin.com', 'telegram.org'
      ]
      
      if (knownSocialDomains.some(domain => referrerUrl.hostname.includes(domain))) {
        score += 0.1 // Bonus for social media traffic
      }
    } catch {
      score -= 0.05 // Invalid referrer URL
    }
  }

  // Check user behavior patterns
  const { data: userClicks } = await supabase
    .from('click_events')
    .select('clicked_at')
    .eq('user_campaigns.user_id', factors.userId)
    .eq('user_campaigns.campaign_id', factors.campaignId)
    .order('clicked_at', { ascending: false })
    .limit(10)

  if (userClicks && userClicks.length > 1) {
    // Check for too regular intervals (bot-like behavior)
    const intervals = []
    for (let i = 1; i < userClicks.length; i++) {
      const interval = new Date(userClicks[i-1].clicked_at).getTime() - 
                      new Date(userClicks[i].clicked_at).getTime()
      intervals.push(interval)
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
    const variance = intervals.reduce((sum, interval) => 
      sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length
    
    const coefficientOfVariation = Math.sqrt(variance) / avgInterval

    // Very regular patterns are suspicious
    if (coefficientOfVariation < 0.1) {
      score -= 0.3
    }
  }

  // Ensure score is between 0 and 1
  return Math.max(0, Math.min(1, score))
}