// Template related types
export interface Template {
  id: string
  advertiser_id: string
  name: string
  content: string
  variables: TemplateVariable[]
  hashtags: string[]
  platform: 'instagram' | 'facebook' | 'twitter' | 'tiktok' | 'universal'
  category: string
  performance_score?: number
  usage_count: number
  is_favorite: boolean
  created_at: string
  updated_at: string
  image_url?: string
}

export interface TemplateVariable {
  key: string
  label: string
  type: 'text' | 'url' | 'image' | 'number'
  required: boolean
  default_value?: string
  description?: string
}

export interface TemplateVariant {
  id: string
  template_id: string
  name: string
  content: string
  hashtags: string[]
  performance_score?: number
  usage_count: number
  created_at: string
}

export interface TemplateFormData {
  name: string
  content: string
  variables: TemplateVariable[]
  hashtags: string[]
  platform: 'instagram' | 'facebook' | 'twitter' | 'tiktok' | 'universal'
  category: string
  image_url?: string
}

export interface TemplatePerformance {
  template_id: string
  total_usage: number
  total_clicks: number
  average_ctr: number
  conversion_rate: number
  revenue_generated: number
  last_30_days_usage: number
  trend: 'up' | 'down' | 'stable'
}

export interface TemplateCategory {
  id: string
  name: string
  description?: string
  template_count: number
  icon?: string
}

export interface TemplateFilters {
  platform?: Template['platform'][]
  category?: string[]
  performance_min?: number
  performance_max?: number
  is_favorite?: boolean
  search?: string
  sort_by?: 'name' | 'performance' | 'usage' | 'created_at'
  sort_order?: 'asc' | 'desc'
}

export interface ABTestTemplate {
  id: string
  original_template_id: string
  variant_a_id: string
  variant_b_id: string
  test_name: string
  status: 'draft' | 'running' | 'completed' | 'paused'
  start_date: string
  end_date?: string
  traffic_split: number // percentage for variant A (variant B gets 100 - traffic_split)
  results?: {
    variant_a_clicks: number
    variant_b_clicks: number
    variant_a_ctr: number
    variant_b_ctr: number
    winner?: 'a' | 'b' | 'tie'
    confidence_level?: number
  }
  created_at: string
  updated_at: string
}