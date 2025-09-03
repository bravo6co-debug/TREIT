// Deeplink related types
export interface Deeplink {
  id: string
  campaign_id: string
  original_url: string
  deeplink_url: string
  short_url?: string
  qr_code_url?: string
  title?: string
  description?: string
  click_count: number
  unique_clicks: number
  conversion_count: number
  status: 'active' | 'inactive' | 'expired'
  created_at: string
  updated_at: string
  expires_at?: string
  utm_parameters?: UtmParameters
  tracking_parameters?: TrackingParameters
}

export interface UtmParameters {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
}

export interface TrackingParameters {
  [key: string]: string
}

export interface DeeplinkFormData {
  original_url: string
  title?: string
  description?: string
  expires_at?: Date
  utm_parameters?: UtmParameters
  tracking_parameters?: TrackingParameters
  generate_qr?: boolean
  generate_short_url?: boolean
}

export interface DeeplinkAnalytics {
  deeplink_id: string
  total_clicks: number
  unique_clicks: number
  conversion_rate: number
  click_timeline: ClickTimelineData[]
  geographic_data: GeographicData[]
  device_data: DeviceData[]
  referrer_data: ReferrerData[]
  user_agent_data: UserAgentData[]
}

export interface ClickTimelineData {
  date: string
  hour?: number
  clicks: number
  unique_clicks: number
  conversions: number
}

export interface GeographicData {
  country: string
  region?: string
  city?: string
  clicks: number
  percentage: number
}

export interface DeviceData {
  device_type: 'desktop' | 'mobile' | 'tablet'
  os: string
  browser?: string
  clicks: number
  percentage: number
}

export interface ReferrerData {
  referrer_domain: string
  referrer_url?: string
  clicks: number
  percentage: number
}

export interface UserAgentData {
  user_agent: string
  clicks: number
  percentage: number
}

export interface DeeplinkClick {
  id: string
  deeplink_id: string
  campaign_id: string
  user_id?: string
  ip_address?: string
  user_agent?: string
  referrer?: string
  country?: string
  region?: string
  city?: string
  device_type?: 'desktop' | 'mobile' | 'tablet'
  os?: string
  browser?: string
  is_unique: boolean
  is_conversion: boolean
  conversion_value?: number
  clicked_at: string
}

export interface QRCodeOptions {
  size?: number
  error_correction?: 'L' | 'M' | 'Q' | 'H'
  background_color?: string
  foreground_color?: string
  logo_url?: string
  format?: 'png' | 'svg' | 'pdf'
}

export interface ShortUrlOptions {
  custom_slug?: string
  expires_at?: string
  password?: string
  max_clicks?: number
}

export interface DeeplinkValidationResult {
  is_valid: boolean
  is_reachable: boolean
  response_time_ms?: number
  status_code?: number
  title?: string
  description?: string
  image_url?: string
  canonical_url?: string
  errors?: string[]
  warnings?: string[]
}