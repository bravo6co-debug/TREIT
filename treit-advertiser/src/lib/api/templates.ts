import { supabase } from '../supabase'
import type { 
  Template, 
  TemplateFormData, 
  TemplateVariant, 
  TemplatePerformance, 
  TemplateCategory,
  TemplateFilters,
  ABTestTemplate
} from '../../types/template'

export const templateApi = {
  // Get all templates for an advertiser
  getTemplates: async (advertiserId: string, filters?: TemplateFilters) => {
    try {
      let query = supabase
        .from('campaign_templates')
        .select(`
          *,
          template_variants(*),
          template_categories(name, icon)
        `)
        .eq('advertiser_id', advertiserId)

      // Apply filters
      if (filters?.platform && filters.platform.length > 0) {
        query = query.in('platform', filters.platform)
      }

      if (filters?.category && filters.category.length > 0) {
        query = query.in('category', filters.category)
      }

      if (filters?.performance_min !== undefined) {
        query = query.gte('performance_score', filters.performance_min)
      }

      if (filters?.performance_max !== undefined) {
        query = query.lte('performance_score', filters.performance_max)
      }

      if (filters?.is_favorite !== undefined) {
        query = query.eq('is_favorite', filters.is_favorite)
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,content.ilike.%${filters.search}%`)
      }

      // Apply sorting
      if (filters?.sort_by) {
        const ascending = filters.sort_order === 'asc'
        query = query.order(filters.sort_by, { ascending })
      } else {
        query = query.order('created_at', { ascending: false })
      }

      const { data, error } = await query

      if (error) throw error
      return { data: data as Template[], error: null }
    } catch (error) {
      console.error('Get templates error:', error)
      return { data: null, error }
    }
  },

  // Get single template by ID
  getTemplate: async (templateId: string) => {
    try {
      const { data, error } = await supabase
        .from('campaign_templates')
        .select(`
          *,
          template_variants(*),
          template_categories(name, icon)
        `)
        .eq('id', templateId)
        .single()

      if (error) throw error
      return { data: data as Template, error: null }
    } catch (error) {
      console.error('Get template error:', error)
      return { data: null, error }
    }
  },

  // Create new template
  createTemplate: async (advertiserId: string, formData: TemplateFormData) => {
    try {
      const templateData = {
        advertiser_id: advertiserId,
        name: formData.name,
        content: formData.content,
        variables: formData.variables,
        hashtags: formData.hashtags,
        platform: formData.platform,
        category: formData.category,
        image_url: formData.image_url,
        performance_score: 0,
        usage_count: 0,
        is_favorite: false
      }

      const { data, error } = await supabase
        .from('campaign_templates')
        .insert(templateData)
        .select()
        .single()

      if (error) throw error
      return { data: data as Template, error: null }
    } catch (error) {
      console.error('Create template error:', error)
      return { data: null, error }
    }
  },

  // Update template
  updateTemplate: async (templateId: string, updates: Partial<Template>) => {
    try {
      const { data, error } = await supabase
        .from('campaign_templates')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', templateId)
        .select()
        .single()

      if (error) throw error
      return { data: data as Template, error: null }
    } catch (error) {
      console.error('Update template error:', error)
      return { data: null, error }
    }
  },

  // Delete template
  deleteTemplate: async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('campaign_templates')
        .delete()
        .eq('id', templateId)

      if (error) throw error
      return { error: null }
    } catch (error) {
      console.error('Delete template error:', error)
      return { error }
    }
  },

  // Toggle template favorite status
  toggleFavorite: async (templateId: string, isFavorite: boolean) => {
    try {
      const { data, error } = await supabase
        .from('campaign_templates')
        .update({ 
          is_favorite: isFavorite,
          updated_at: new Date().toISOString() 
        })
        .eq('id', templateId)
        .select()
        .single()

      if (error) throw error
      return { data: data as Template, error: null }
    } catch (error) {
      console.error('Toggle favorite error:', error)
      return { data: null, error }
    }
  },

  // Create template variant
  createVariant: async (templateId: string, variantData: Omit<TemplateVariant, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('template_variants')
        .insert({
          template_id: templateId,
          ...variantData
        })
        .select()
        .single()

      if (error) throw error
      return { data: data as TemplateVariant, error: null }
    } catch (error) {
      console.error('Create variant error:', error)
      return { data: null, error }
    }
  },

  // Get template variants
  getVariants: async (templateId: string) => {
    try {
      const { data, error } = await supabase
        .from('template_variants')
        .select('*')
        .eq('template_id', templateId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return { data: data as TemplateVariant[], error: null }
    } catch (error) {
      console.error('Get variants error:', error)
      return { data: null, error }
    }
  },

  // Update template variant
  updateVariant: async (variantId: string, updates: Partial<TemplateVariant>) => {
    try {
      const { data, error } = await supabase
        .from('template_variants')
        .update(updates)
        .eq('id', variantId)
        .select()
        .single()

      if (error) throw error
      return { data: data as TemplateVariant, error: null }
    } catch (error) {
      console.error('Update variant error:', error)
      return { data: null, error }
    }
  },

  // Delete template variant
  deleteVariant: async (variantId: string) => {
    try {
      const { error } = await supabase
        .from('template_variants')
        .delete()
        .eq('id', variantId)

      if (error) throw error
      return { error: null }
    } catch (error) {
      console.error('Delete variant error:', error)
      return { error }
    }
  },

  // Get template performance
  getTemplatePerformance: async (templateId: string): Promise<{data: TemplatePerformance | null, error: any}> => {
    try {
      // Get template usage from campaigns
      const { data: campaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select(`
          id,
          current_clicks,
          total_clicks_target,
          created_at,
          deeplinks(
            id,
            click_count,
            conversion_count
          )
        `)
        .eq('template_id', templateId)

      if (campaignsError) throw campaignsError

      const totalUsage = campaigns?.length || 0
      const totalClicks = campaigns?.reduce((sum, campaign) => sum + (campaign.current_clicks || 0), 0) || 0
      const totalConversions = campaigns?.reduce((sum, campaign) => 
        sum + (campaign.deeplinks?.reduce((deepSum: number, deeplink: any) => 
          deepSum + (deeplink.conversion_count || 0), 0) || 0), 0) || 0

      // Calculate last 30 days usage
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      const last30DaysUsage = campaigns?.filter(campaign => 
        new Date(campaign.created_at) >= thirtyDaysAgo
      ).length || 0

      const performance: TemplatePerformance = {
        template_id: templateId,
        total_usage: totalUsage,
        total_clicks: totalClicks,
        average_ctr: 0, // Would need impression data
        conversion_rate: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
        revenue_generated: totalConversions * 100, // Assume 100 won per conversion
        last_30_days_usage: last30DaysUsage,
        trend: last30DaysUsage > totalUsage / 2 ? 'up' : 
               last30DaysUsage < totalUsage / 4 ? 'down' : 'stable'
      }

      // Update template performance score
      const performanceScore = Math.min(100, 
        (performance.conversion_rate * 0.4) + 
        (Math.min(performance.total_usage, 100) * 0.3) +
        (performance.last_30_days_usage * 3) // Boost recent usage
      )

      await supabase
        .from('campaign_templates')
        .update({ performance_score: Math.round(performanceScore) })
        .eq('id', templateId)

      return { data: performance, error: null }
    } catch (error) {
      console.error('Get template performance error:', error)
      return { data: null, error }
    }
  },

  // Get template categories
  getCategories: async (advertiserId: string) => {
    try {
      const { data, error } = await supabase
        .from('template_categories')
        .select(`
          *,
          campaign_templates!inner(count)
        `)
        .eq('campaign_templates.advertiser_id', advertiserId)

      if (error) throw error
      return { data: data as TemplateCategory[], error: null }
    } catch (error) {
      console.error('Get categories error:', error)
      return { data: null, error }
    }
  },

  // Create A/B test
  createABTest: async (testData: Omit<ABTestTemplate, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('template_ab_tests')
        .insert(testData)
        .select()
        .single()

      if (error) throw error
      return { data: data as ABTestTemplate, error: null }
    } catch (error) {
      console.error('Create A/B test error:', error)
      return { data: null, error }
    }
  },

  // Get A/B tests for template
  getABTests: async (templateId: string) => {
    try {
      const { data, error } = await supabase
        .from('template_ab_tests')
        .select(`
          *,
          variant_a:template_variants!variant_a_id(*),
          variant_b:template_variants!variant_b_id(*)
        `)
        .eq('original_template_id', templateId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return { data: data as ABTestTemplate[], error: null }
    } catch (error) {
      console.error('Get A/B tests error:', error)
      return { data: null, error }
    }
  },

  // Update A/B test results
  updateABTestResults: async (testId: string, results: ABTestTemplate['results']) => {
    try {
      const { data, error } = await supabase
        .from('template_ab_tests')
        .update({
          results,
          updated_at: new Date().toISOString()
        })
        .eq('id', testId)
        .select()
        .single()

      if (error) throw error
      return { data: data as ABTestTemplate, error: null }
    } catch (error) {
      console.error('Update A/B test results error:', error)
      return { data: null, error }
    }
  },

  // Duplicate template
  duplicateTemplate: async (templateId: string, newName: string) => {
    try {
      // Get original template
      const { data: original, error: getError } = await templateApi.getTemplate(templateId)
      if (getError || !original) throw getError

      // Create duplicate
      const duplicateData: TemplateFormData = {
        name: newName,
        content: original.content,
        variables: original.variables,
        hashtags: original.hashtags,
        platform: original.platform,
        category: original.category,
        image_url: original.image_url
      }

      return await templateApi.createTemplate(original.advertiser_id, duplicateData)
    } catch (error) {
      console.error('Duplicate template error:', error)
      return { data: null, error }
    }
  }
}