// Campaign related types
export interface Campaign {
  id: string
  business_id: string  // Changed from advertiser_id
  name: string  // Changed from title
  description?: string
  category?: 'SHOPPING' | 'SERVICE' | 'EVENT' | 'BRAND' | 'APP' | 'OTHER'
  destination_url: string  // Changed from original_url
  tracking_url?: string
  cpc_rate: number
  budget: number  // Changed from total_budget
  spent: number
  target_clicks: number  // Changed from total_clicks_target
  current_clicks: number
  is_active: boolean
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED'
  start_date: string
  end_date: string
  created_at: string
  updated_at: string
  image_url?: string
  video_url?: string
  target_demographics?: any
  target_regions?: any[]
  target_interests?: any[]
  performance_data?: any
  metadata?: any
}

export interface CampaignFormData {
  title: string  // Will be mapped to 'name' in API
  description?: string
  original_url: string  // Will be mapped to 'destination_url' in API
  cpc_rate: number
  total_budget: number  // Will be mapped to 'budget' in API
  daily_budget?: number  // Not in DB, but kept for UI
  total_clicks_target: number  // Will be mapped to 'target_clicks' in API
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