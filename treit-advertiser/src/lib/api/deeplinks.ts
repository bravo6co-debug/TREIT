import { supabase } from '../supabase'
import type { 
  Deeplink, 
  DeeplinkFormData, 
  DeeplinkAnalytics, 
  DeeplinkClick,
  DeeplinkValidationResult,
  QRCodeOptions,
  ShortUrlOptions
} from '../../types/deeplink'

export const deeplinkApi = {
  // Validate URL before creating deeplink
  validateUrl: async (url: string): Promise<{data: DeeplinkValidationResult | null, error: any}> => {
    try {
      const startTime = Date.now()
      
      // Basic URL validation
      let parsedUrl
      try {
        parsedUrl = new URL(url)
      } catch {
        return {
          data: {
            is_valid: false,
            is_reachable: false,
            errors: ['유효하지 않은 URL 형식입니다.']
          },
          error: null
        }
      }

      // Check if URL is reachable (in real app, this would be done server-side)
      try {
        const response = await fetch(url, { 
          method: 'HEAD',
          mode: 'no-cors' // This limits what we can check, but avoids CORS issues
        })
        
        const responseTime = Date.now() - startTime

        return {
          data: {
            is_valid: true,
            is_reachable: true,
            response_time_ms: responseTime,
            canonical_url: parsedUrl.href,
            warnings: parsedUrl.protocol !== 'https:' ? ['보안을 위해 HTTPS URL을 권장합니다.'] : undefined
          },
          error: null
        }
      } catch (error) {
        return {
          data: {
            is_valid: true,
            is_reachable: false,
            canonical_url: parsedUrl.href,
            errors: ['URL에 접근할 수 없습니다. URL이 올바른지 확인해주세요.']
          },
          error: null
        }
      }
    } catch (error) {
      console.error('URL validation error:', error)
      return { data: null, error }
    }
  },

  // Create deeplink
  createDeeplink: async (campaignId: string, formData: DeeplinkFormData) => {
    try {
      // Generate deeplink URL (in real app, this would be done server-side)
      const deeplinkUrl = `https://treit.link/${campaignId}/${Date.now().toString(36)}`
      
      const deeplinkData = {
        campaign_id: campaignId,
        original_url: formData.original_url,
        deeplink_url: deeplinkUrl,
        title: formData.title,
        description: formData.description,
        click_count: 0,
        unique_clicks: 0,
        conversion_count: 0,
        status: 'active' as const,
        expires_at: formData.expires_at?.toISOString(),
        utm_parameters: formData.utm_parameters,
        tracking_parameters: formData.tracking_parameters
      }

      const { data, error } = await supabase
        .from('deeplinks')
        .insert(deeplinkData)
        .select()
        .single()

      if (error) throw error

      const deeplink = data as Deeplink

      // Generate short URL if requested
      if (formData.generate_short_url) {
        const shortUrl = await deeplinkApi.generateShortUrl(deeplink.id, {})
        if (shortUrl.data) {
          await supabase
            .from('deeplinks')
            .update({ short_url: shortUrl.data })
            .eq('id', deeplink.id)
          deeplink.short_url = shortUrl.data
        }
      }

      // Generate QR code if requested
      if (formData.generate_qr) {
        const qrCode = await deeplinkApi.generateQRCode(deeplink.deeplink_url, {})
        if (qrCode.data) {
          await supabase
            .from('deeplinks')
            .update({ qr_code_url: qrCode.data })
            .eq('id', deeplink.id)
          deeplink.qr_code_url = qrCode.data
        }
      }

      return { data: deeplink, error: null }
    } catch (error) {
      console.error('Create deeplink error:', error)
      return { data: null, error }
    }
  },

  // Get deeplink by ID
  getDeeplink: async (deeplinkId: string) => {
    try {
      const { data, error } = await supabase
        .from('deeplinks')
        .select(`
          *,
          campaigns(title, advertiser_id)
        `)
        .eq('id', deeplinkId)
        .single()

      if (error) throw error
      return { data: data as Deeplink, error: null }
    } catch (error) {
      console.error('Get deeplink error:', error)
      return { data: null, error }
    }
  },

  // Get deeplinks for campaign
  getCampaignDeeplinks: async (campaignId: string) => {
    try {
      const { data, error } = await supabase
        .from('deeplinks')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return { data: data as Deeplink[], error: null }
    } catch (error) {
      console.error('Get campaign deeplinks error:', error)
      return { data: null, error }
    }
  },

  // Update deeplink
  updateDeeplink: async (deeplinkId: string, updates: Partial<Deeplink>) => {
    try {
      const { data, error } = await supabase
        .from('deeplinks')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', deeplinkId)
        .select()
        .single()

      if (error) throw error
      return { data: data as Deeplink, error: null }
    } catch (error) {
      console.error('Update deeplink error:', error)
      return { data: null, error }
    }
  },

  // Delete deeplink
  deleteDeeplink: async (deeplinkId: string) => {
    try {
      const { error } = await supabase
        .from('deeplinks')
        .delete()
        .eq('id', deeplinkId)

      if (error) throw error
      return { error: null }
    } catch (error) {
      console.error('Delete deeplink error:', error)
      return { error }
    }
  },

  // Generate QR code for deeplink
  generateQRCode: async (url: string, options: QRCodeOptions = {}) => {
    try {
      // In a real application, this would call a QR code generation service
      // For now, we'll return a placeholder URL
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${options.size || 200}x${options.size || 200}&data=${encodeURIComponent(url)}`
      
      return { data: qrCodeUrl, error: null }
    } catch (error) {
      console.error('Generate QR code error:', error)
      return { data: null, error }
    }
  },

  // Generate short URL for deeplink
  generateShortUrl: async (deeplinkId: string, options: ShortUrlOptions = {}) => {
    try {
      // In a real application, this would use a URL shortening service
      // For now, we'll create a simple short URL
      const shortCode = options.custom_slug || Math.random().toString(36).substring(2, 8)
      const shortUrl = `https://t.treit/${shortCode}`
      
      return { data: shortUrl, error: null }
    } catch (error) {
      console.error('Generate short URL error:', error)
      return { data: null, error }
    }
  },

  // Record click on deeplink
  recordClick: async (deeplinkId: string, clickData: Partial<DeeplinkClick>) => {
    try {
      // Get deeplink info first
      const { data: deeplink, error: deeplinkError } = await deeplinkApi.getDeeplink(deeplinkId)
      if (deeplinkError || !deeplink) throw deeplinkError

      // Check if this is a unique click (simplified logic)
      const isUnique = !clickData.user_id || await deeplinkApi.isUniqueClick(deeplinkId, clickData.user_id, clickData.ip_address)

      const clickRecord = {
        deeplink_id: deeplinkId,
        campaign_id: deeplink.campaign_id,
        user_id: clickData.user_id,
        ip_address: clickData.ip_address,
        user_agent: clickData.user_agent,
        referrer: clickData.referrer,
        country: clickData.country,
        region: clickData.region,
        city: clickData.city,
        device_type: clickData.device_type,
        os: clickData.os,
        browser: clickData.browser,
        is_unique: isUnique,
        is_conversion: false, // Will be updated later if conversion happens
        clicked_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('deeplink_clicks')
        .insert(clickRecord)
        .select()
        .single()

      if (error) throw error

      // Update deeplink click counts
      const updateData: any = {
        click_count: deeplink.click_count + 1,
        updated_at: new Date().toISOString()
      }

      if (isUnique) {
        updateData.unique_clicks = deeplink.unique_clicks + 1
      }

      await supabase
        .from('deeplinks')
        .update(updateData)
        .eq('id', deeplinkId)

      return { data: data as DeeplinkClick, error: null }
    } catch (error) {
      console.error('Record click error:', error)
      return { data: null, error }
    }
  },

  // Check if click is unique
  isUniqueClick: async (deeplinkId: string, userId?: string, ipAddress?: string): Promise<boolean> => {
    try {
      let query = supabase
        .from('deeplink_clicks')
        .select('id')
        .eq('deeplink_id', deeplinkId)
        .limit(1)

      if (userId) {
        query = query.eq('user_id', userId)
      } else if (ipAddress) {
        query = query.eq('ip_address', ipAddress)
      } else {
        return true // If we have no identifier, consider it unique
      }

      const { data, error } = await query

      if (error) throw error
      return !data || data.length === 0
    } catch (error) {
      console.error('Check unique click error:', error)
      return true // Default to unique if there's an error
    }
  },

  // Get deeplink analytics
  getDeeplinkAnalytics: async (deeplinkId: string, startDate?: string, endDate?: string): Promise<{data: DeeplinkAnalytics | null, error: any}> => {
    try {
      // Get deeplink basic info
      const { data: deeplink, error: deeplinkError } = await deeplinkApi.getDeeplink(deeplinkId)
      if (deeplinkError || !deeplink) throw deeplinkError

      // Build clicks query
      let clicksQuery = supabase
        .from('deeplink_clicks')
        .select('*')
        .eq('deeplink_id', deeplinkId)

      if (startDate) {
        clicksQuery = clicksQuery.gte('clicked_at', startDate)
      }

      if (endDate) {
        clicksQuery = clicksQuery.lte('clicked_at', endDate)
      }

      const { data: clicks, error: clicksError } = await clicksQuery.order('clicked_at', { ascending: false })

      if (clicksError) throw clicksError

      // Process analytics data
      const totalClicks = clicks?.length || 0
      const uniqueClicks = clicks?.filter(click => click.is_unique)?.length || 0
      const conversions = clicks?.filter(click => click.is_conversion)?.length || 0
      const conversionRate = totalClicks > 0 ? (conversions / totalClicks) * 100 : 0

      // Group clicks by date and hour for timeline
      const clickTimeline = clicks?.reduce((acc: any, click: any) => {
        const date = new Date(click.clicked_at).toISOString().split('T')[0]
        const hour = new Date(click.clicked_at).getHours()
        const key = `${date}-${hour}`
        
        if (!acc[key]) {
          acc[key] = {
            date,
            hour,
            clicks: 0,
            unique_clicks: 0,
            conversions: 0
          }
        }
        
        acc[key].clicks += 1
        if (click.is_unique) acc[key].unique_clicks += 1
        if (click.is_conversion) acc[key].conversions += 1
        
        return acc
      }, {})

      // Group by geography
      const geographicData = clicks?.reduce((acc: any, click: any) => {
        const country = click.country || 'Unknown'
        if (!acc[country]) {
          acc[country] = { country, clicks: 0, percentage: 0 }
        }
        acc[country].clicks += 1
        return acc
      }, {})

      // Calculate percentages and sort
      Object.values(geographicData || {}).forEach((data: any) => {
        data.percentage = totalClicks > 0 ? (data.clicks / totalClicks) * 100 : 0
      })

      // Group by device type
      const deviceData = clicks?.reduce((acc: any, click: any) => {
        const deviceType = click.device_type || 'unknown'
        const os = click.os || 'Unknown'
        const key = `${deviceType}-${os}`
        
        if (!acc[key]) {
          acc[key] = {
            device_type: deviceType,
            os,
            clicks: 0,
            percentage: 0
          }
        }
        acc[key].clicks += 1
        return acc
      }, {})

      // Calculate device percentages
      Object.values(deviceData || {}).forEach((data: any) => {
        data.percentage = totalClicks > 0 ? (data.clicks / totalClicks) * 100 : 0
      })

      // Group by referrer
      const referrerData = clicks?.reduce((acc: any, click: any) => {
        if (!click.referrer) return acc
        
        const referrerDomain = new URL(click.referrer).hostname
        if (!acc[referrerDomain]) {
          acc[referrerDomain] = {
            referrer_domain: referrerDomain,
            referrer_url: click.referrer,
            clicks: 0,
            percentage: 0
          }
        }
        acc[referrerDomain].clicks += 1
        return acc
      }, {})

      // Calculate referrer percentages
      Object.values(referrerData || {}).forEach((data: any) => {
        data.percentage = totalClicks > 0 ? (data.clicks / totalClicks) * 100 : 0
      })

      const analytics: DeeplinkAnalytics = {
        deeplink_id: deeplinkId,
        total_clicks: totalClicks,
        unique_clicks: uniqueClicks,
        conversion_rate: conversionRate,
        click_timeline: Object.values(clickTimeline || {}),
        geographic_data: Object.values(geographicData || {}),
        device_data: Object.values(deviceData || {}),
        referrer_data: Object.values(referrerData || {}),
        user_agent_data: [] // Could be implemented similarly
      }

      return { data: analytics, error: null }
    } catch (error) {
      console.error('Get deeplink analytics error:', error)
      return { data: null, error }
    }
  },

  // Record conversion
  recordConversion: async (clickId: string, conversionValue?: number) => {
    try {
      const { data, error } = await supabase
        .from('deeplink_clicks')
        .update({
          is_conversion: true,
          conversion_value: conversionValue
        })
        .eq('id', clickId)
        .select()
        .single()

      if (error) throw error

      // Update deeplink conversion count using safe increment
      const click = data as DeeplinkClick
      const { data: currentDeeplink } = await supabase
        .from('deeplinks')
        .select('conversion_count')
        .eq('id', click.deeplink_id)
        .single()
      
      if (currentDeeplink) {
        await supabase
          .from('deeplinks')
          .update({
            conversion_count: (currentDeeplink.conversion_count || 0) + 1
          })
          .eq('id', click.deeplink_id)
      }

      return { data: data as DeeplinkClick, error: null }
    } catch (error) {
      console.error('Record conversion error:', error)
      return { data: null, error }
    }
  },

  // Bulk update deeplink status
  bulkUpdateStatus: async (deeplinkIds: string[], status: Deeplink['status']) => {
    try {
      const { data, error } = await supabase
        .from('deeplinks')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .in('id', deeplinkIds)
        .select()

      if (error) throw error
      return { data: data as Deeplink[], error: null }
    } catch (error) {
      console.error('Bulk update status error:', error)
      return { data: null, error }
    }
  }
}