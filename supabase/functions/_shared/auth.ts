// 보안 강화된 Edge Function 인증 모듈
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { Database } from '../../../types/supabase.ts'

// 환경변수 검증 및 보안 확인
const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
}

// Service Role Key 형식 검증
if (!supabaseServiceKey.startsWith('eyJ')) {
  throw new Error('Invalid service role key format')
}

// 프로덕션에서 로컬 URL 사용 방지
if (Deno.env.get('DENO_DEPLOYMENT_ID') && supabaseUrl.includes('localhost')) {
  throw new Error('Local Supabase URL detected in production environment')
}

// 보안 강화된 관리자 클라이언트 생성
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        'x-edge-function': 'true',
        'x-service-version': '1.0.0'
      }
    }
  }
)

// 보안 감사 로그
export async function logSecurityEvent(
  event: string,
  details: Record<string, any>,
  severity: 'info' | 'warning' | 'error' = 'info'
) {
  try {
    await supabaseAdmin
      .from('security_logs')
      .insert({
        event,
        details,
        severity,
        source: 'edge_function',
        timestamp: new Date().toISOString()
      })
  } catch (error) {
    console.error('Failed to log security event:', error)
  }
}

export async function validateUser(authHeader: string | null) {
  if (!authHeader) {
    await logSecurityEvent('auth_missing_header', { ip: 'edge_function' }, 'warning')
    throw new Error('Authorization header is required')
  }

  // Bearer 토큰 형식 검증
  if (!authHeader.startsWith('Bearer ')) {
    await logSecurityEvent('auth_invalid_format', { header: authHeader.substring(0, 20) }, 'warning')
    throw new Error('Invalid authorization header format')
  }

  const token = authHeader.replace('Bearer ', '')
  
  // JWT 토큰 형식 기본 검증
  if (!token.includes('.') || token.split('.').length !== 3) {
    await logSecurityEvent('auth_invalid_token_format', {}, 'warning')
    throw new Error('Invalid token format')
  }

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

  if (authError || !user) {
    await logSecurityEvent('auth_validation_failed', {
      error: authError?.message,
      userId: user?.id
    }, 'warning')
    throw new Error('Invalid or expired token')
  }

  // 사용자 활성화 상태 확인
  const { data: userData, error: userError } = await supabaseAdmin
    .from('user_profiles')
    .select('is_active, role')
    .eq('id', user.id)
    .single()

  if (userError || !userData?.is_active) {
    await logSecurityEvent('auth_inactive_user', { userId: user.id }, 'warning')
    throw new Error('User account is inactive')
  }

  await logSecurityEvent('auth_success', { userId: user.id, role: userData.role }, 'info')

  return { user, supabaseClient: supabaseAdmin, userData }
}

export async function requireAdmin(authHeader: string | null) {
  const { user, supabaseClient, userData } = await validateUser(authHeader)

  if (!['admin', 'support'].includes(userData.role)) {
    await logSecurityEvent('auth_insufficient_privileges', {
      userId: user.id,
      requiredRole: 'admin',
      actualRole: userData.role
    }, 'warning')
    throw new Error('Admin privileges required')
  }

  await logSecurityEvent('admin_access_granted', { userId: user.id }, 'info')

  return { user, supabaseClient, userData }
}

export async function requireAdvertiser(authHeader: string | null) {
  const { user, supabaseClient, userData } = await validateUser(authHeader)

  if (!['advertiser', 'admin', 'support'].includes(userData.role)) {
    await logSecurityEvent('auth_insufficient_privileges', {
      userId: user.id,
      requiredRole: 'advertiser',
      actualRole: userData.role
    }, 'warning')
    throw new Error('Advertiser or Admin privileges required')
  }

  await logSecurityEvent('advertiser_access_granted', { userId: user.id }, 'info')

  return { user, supabaseClient, userData }
}

// Rate Limiting 보안 함수
export async function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  try {
    const windowStart = new Date(Date.now() - windowMs).toISOString()
    
    const { count, error } = await supabaseAdmin
      .from('rate_limit_logs')
      .select('*', { count: 'exact' })
      .eq('identifier', identifier)
      .gte('created_at', windowStart)
    
    if (error) {
      console.error('Rate limit check error:', error)
      return true // 에러 시 허용 (가용성 우선)
    }
    
    return (count || 0) < limit
  } catch (error) {
    console.error('Rate limit check error:', error)
    return true
  }
}

// Rate Limiting 로그 기록
export async function logRateLimit(identifier: string, action: string) {
  try {
    await supabaseAdmin
      .from('rate_limit_logs')
      .insert({
        identifier,
        action,
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Failed to log rate limit:', error)
  }
}