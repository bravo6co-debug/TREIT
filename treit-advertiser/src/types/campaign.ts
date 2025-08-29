// Campaign related types
export interface Campaign {
  id: string
  advertiser_id: string
  title: string
  description?: string
  original_url: string
  deeplink_url?: string
  cost_per_click: number
  total_budget: number
  daily_budget?: number
  total_clicks_target: number
  current_clicks: number
  remaining_clicks: number
  status: 'active' | 'paused' | 'completed' | 'draft'
  start_date: string
  end_date: string
  created_at: string
  updated_at: string
  template_id?: string
  image_url?: string
  hashtags: string[]
  post_template: string
  platform_targets?: ('instagram' | 'facebook' | 'twitter' | 'tiktok')[]
}

export interface CampaignFormData {
  title: string
  description?: string
  original_url: string
  cost_per_click: number
  total_budget: number
  daily_budget?: number
  total_clicks_target: number
  start_date: Date | null
  end_date: Date | null
  image_url?: string
  hashtags: string[]
  post_template: string
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
  status?: Campaign['status'][]
  start_date?: string
  end_date?: string
  min_budget?: number
  max_budget?: number
  platforms?: string[]
  search?: string
}