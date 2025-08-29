import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState, useEffect } from 'react'
import { queryKeys } from '../lib/query-client'

// 최적화된 쿼리 훅
export function useOptimizedQuery<T>(
  queryKey: any[],
  queryFn: () => Promise<T>,
  options?: {
    enabled?: boolean
    staleTime?: number
    gcTime?: number
    refetchInterval?: number
  }
) {
  return useQuery({
    queryKey,
    queryFn,
    staleTime: options?.staleTime ?? 3 * 60 * 1000, // 광고주용은 3분
    gcTime: options?.gcTime ?? 10 * 60 * 1000,
    enabled: options?.enabled,
    refetchInterval: options?.refetchInterval,
  })
}

// 캐시 무효화 헬퍼 훅
export function useCacheInvalidation() {
  const queryClient = useQueryClient()

  const invalidateCampaigns = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.all })
  }, [queryClient])

  const invalidateBilling = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.billing.all })
  }, [queryClient])

  const invalidateTemplates = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.templates.all })
  }, [queryClient])

  const invalidateDeeplinks = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.deeplinks.all })
  }, [queryClient])

  const invalidateAnalytics = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all })
  }, [queryClient])

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries()
  }, [queryClient])

  return useMemo(() => ({
    invalidateCampaigns,
    invalidateBilling,
    invalidateTemplates,
    invalidateDeeplinks,
    invalidateAnalytics,
    invalidateAll,
  }), [invalidateCampaigns, invalidateBilling, invalidateTemplates, invalidateDeeplinks, invalidateAnalytics, invalidateAll])
}

// 프리페칭 훅
export function usePrefetchData() {
  const queryClient = useQueryClient()

  const prefetchCampaignList = useCallback((filters?: any) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.campaigns.list(filters),
      queryFn: () => import('../lib/api/campaigns').then(api => api.getCampaigns(filters)),
      staleTime: 3 * 60 * 1000,
    })
  }, [queryClient])

  const prefetchCampaignDetail = useCallback((campaignId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.campaigns.detail(campaignId),
      queryFn: () => import('../lib/api/campaigns').then(api => api.getCampaignDetail(campaignId)),
      staleTime: 3 * 60 * 1000,
    })
  }, [queryClient])

  const prefetchAnalytics = useCallback((campaignId: string, range?: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.campaigns.analytics(campaignId, range),
      queryFn: () => import('../lib/api/campaigns').then(api => api.getCampaignAnalytics(campaignId, range)),
      staleTime: 2 * 60 * 1000,
    })
  }, [queryClient])

  return useMemo(() => ({
    prefetchCampaignList,
    prefetchCampaignDetail,
    prefetchAnalytics,
  }), [prefetchCampaignList, prefetchCampaignDetail, prefetchAnalytics])
}

// 디바운싱된 검색 훅
export function useDebouncedSearch(
  searchTerm: string,
  delay: number = 300
) {
  const [debouncedValue, setDebouncedValue] = useState(searchTerm)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(searchTerm)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [searchTerm, delay])

  return debouncedValue
}

// 실시간 업데이트 훅
export function useRealTimeUpdates(campaignId?: string) {
  const queryClient = useQueryClient()

  const enableRealTimeUpdates = useCallback(() => {
    // 캠페인별 실시간 업데이트
    if (campaignId) {
      const interval = setInterval(() => {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.campaigns.analytics(campaignId),
          exact: false 
        })
      }, 30000) // 30초마다 갱신

      return () => clearInterval(interval)
    }

    // 전체 대시보드 업데이트
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.campaigns.stats(),
      })
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.billing.balance(),
      })
    }, 60000) // 1분마다 갱신

    return () => clearInterval(interval)
  }, [queryClient, campaignId])

  useEffect(() => {
    return enableRealTimeUpdates()
  }, [enableRealTimeUpdates])
}

// 캠페인 뮤테이션 훅
export function useCampaignMutations() {
  const queryClient = useQueryClient()

  const updateCampaignStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      // 실제 구현에서는 API 호출
      return { id, status }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.all })
    },
  })

  const createCampaign = useMutation({
    mutationFn: async (campaignData: any) => {
      // 실제 구현에서는 API 호출
      return campaignData
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.all })
    },
  })

  const updateCampaign = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      // 실제 구현에서는 API 호출
      return { id, ...data }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.all })
      queryClient.setQueryData(queryKeys.campaigns.detail(data.id), data)
    },
  })

  return {
    updateCampaignStatus,
    createCampaign,
    updateCampaign,
  }
}