// Campaign related types - aligned with database schema
export interface Campaign {
  id: string
  business_id: string  // Matches database schema
  title: string  // Matches database schema (was 'name' in frontend)
  description?: string
  category?: 'SHOPPING' | 'SERVICE' | 'EVENT' | 'BRAND' | 'APP' | 'OTHER'
  original_url: string  // Matches database schema (was 'destination_url' in frontend)
  landing_page_url?: string
  deeplink_code?: string
  tracking_params?: any
  cpc_rate: number
  total_budget: number  // Matches database schema (was 'budget' in frontend)
  spent_amount: number  // Matches database schema (was 'spent' in frontend)
  remaining_budget?: number  // Generated column in database
  target_clicks: number  // Now exists in database schema
  total_clicks: number  // Matches database schema (was 'current_clicks' in frontend)
  total_impressions: number
  unique_users: number
  conversion_count: number
  ctr?: number  // Generated column in database
  conversion_rate?: number  // Generated column in database
  is_active: boolean
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED'
  start_date: string
  end_date?: string
  created_at: string
  updated_at: string
  image_url?: string
  video_url?: string
  target_demographics?: any
  quality_score?: number
  max_clicks_per_user?: number
  click_cooldown_hours?: number
}

export interface CampaignFormData {
  title: string  // Matches database schema
  description?: string
  original_url: string  // Matches database schema
  cpc_rate: number
  total_budget: number  // Matches database schema
  daily_budget?: number  // Optional field for UI, stored separately
  target_clicks: number  // Now matches database schema
  start_date: Date | null
  end_date: Date | null
  image_url?: string
  hashtags: string[]  // Will be stored in templates table
  post_template: string  // Will be stored in templates table
  platform_targets?: ('instagram' | 'facebook' | 'twitter' | 'tiktok')[]
}

export interface CampaignAnalytics {
  campaign_id: string
  total_clicks: number
  total_spent: number
  average_ctr: number
  daily_stats: DailyStat[]
  platform_stats: PlatformStat[]
  hourly_stats: HourlyStat[]
}

export interface DailyStat {
  date: string
  clicks: number
  spent: number
  impressions?: number
}

export interface PlatformStat {
  platform: string
  clicks: number
  spent: number
  percentage: number
}

export interface HourlyStat {
  hour: number
  clicks: number
  spent: number
}

export interface CampaignFilters {
  status?: ('active' | 'paused' | 'completed' | 'draft')[]
  approval_status?: ('PENDING' | 'APPROVED' | 'REJECTED')[]
  start_date?: string
  end_date?: string
  min_budget?: number
  max_budget?: number
  platforms?: string[]
  search?: string
}