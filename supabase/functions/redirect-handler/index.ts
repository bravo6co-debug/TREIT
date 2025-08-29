import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleCors } from '../_shared/cors.ts'
import { getRealIP, detectBot } from '../_shared/utils.ts'

function createErrorPage(title: string, message: string, status: number = 400): Response {
  return new Response(`
    <!DOCTYPE html>
    <html lang="ko">
      <head>
        <title>${title} - TreitMaster</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            margin: 0;
            padding: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .container {
            background: white;
            padding: 2rem;
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 400px;
            width: 90%;
          }
          .error-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
            color: #e74c3c;
          }
          h1 { 
            margin: 0 0 1rem 0;
            color: #2c3e50;
            font-size: 1.5rem;
          }
          p {
            margin: 0 0 2rem 0;
            color: #7f8c8d;
            line-height: 1.5;
          }
          .btn {
            display: inline-block;
            padding: 12px 24px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 500;
            transition: transform 0.2s;
          }
          .btn:hover {
            transform: translateY(-2px);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="error-icon">⚠️</div>
          <h1>${title}</h1>
          <p>${message}</p>
          <a href="https://tre-it.com" class="btn">TreitMaster 홈으로</a>
        </div>
      </body>
    </html>
  `, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  })
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

    // Extract tracking code from URL path
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const trackingCode = pathParts[pathParts.length - 1]

    if (!trackingCode || trackingCode.length < 10) {
      return createErrorPage('Invalid Link', 
        'The link you clicked is invalid or has expired.',
        400)
    }

    // Get visitor information
    const ipAddress = await getRealIP(req)
    const userAgent = req.headers.get('user-agent') || 'unknown'
    const referrer = req.headers.get('referer') || req.headers.get('referrer') || 'direct'

    // Find deeplink mapping
    const { data: mapping, error: mappingError } = await supabase
      .from('deeplink_mappings')
      .select(`
        tracking_code,
        original_url,
        user_campaign_id,
        expires_at,
        user_campaigns (
          id,
          user_id,
          campaign_id,
          status,
          campaigns (
            id,
            title,
            status,
            business_id
          )
        )
      `)
      .eq('tracking_code', trackingCode)
      .single()

    if (mappingError || !mapping) {
      return createErrorPage('링크를 찾을 수 없습니다', 
        '클릭하신 링크를 찾을 수 없거나 삭제되었습니다.',
        404)
    }

    // Check if link has expired
    if (mapping.expires_at && new Date(mapping.expires_at) < new Date()) {
      return createErrorPage('링크가 만료되었습니다', 
        '이 프로모션 링크가 만료되었습니다.',
        410)
    }

    const userCampaign = mapping.user_campaigns as any
    const campaign = userCampaign?.campaigns

    // Check if campaign is still active
    if (!campaign || campaign.status !== 'active' || userCampaign.status !== 'active') {
      return createErrorPage('캠페인이 비활성화됨', 
        '이 캠페인은 더 이상 활성화되어 있지 않습니다.',
        410)
    }

    // Detect bots (but still allow redirect for SEO crawlers)
    const isBot = await detectBot(userAgent, ipAddress)
    
    // Record click event for analytics (async, non-blocking)
    const recordClick = async () => {
      try {
        // Check for recent duplicate clicks from same IP
        const oneMinuteAgo = new Date(Date.now() - 60000)
        const { data: recentClicks } = await supabase
          .from('click_events')
          .select('id')
          .eq('user_campaign_id', mapping.user_campaign_id)
          .eq('ip_address', ipAddress)
          .gte('clicked_at', oneMinuteAgo.toISOString())

        // Skip recording if too many recent clicks
        if (recentClicks && recentClicks.length > 3) {
          return
        }

        // Record the click
        await supabase
          .from('click_events')
          .insert({
            user_campaign_id: mapping.user_campaign_id,
            ip_address: ipAddress,
            user_agent: userAgent,
            referrer: referrer,
            session_id: crypto.randomUUID(),
            metadata: {
              tracking_code: trackingCode,
              is_bot: isBot,
              redirect_type: 'deeplink'
            },
            is_valid: !isBot, // Bots marked as invalid
            commission_amount: isBot ? 0 : null, // Will be calculated by tracking-click if user clicks
            clicked_at: new Date().toISOString()
          })
      } catch (error) {
        console.error('Error recording click:', error)
        // Don't block redirect even if recording fails
      }
    }

    // Record click asynchronously
    recordClick()

    // Create redirect response with tracking
    const redirectResponse = new Response(null, {
      status: 302,
      headers: {
        'Location': mapping.original_url,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

    return redirectResponse

  } catch (error) {
    console.error('Error in redirect-handler function:', error)
    
    return createErrorPage('서버 오류', 
      '요청을 처리하는 중 오류가 발생했습니다.',
      500)
  }
})