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
    staleTime: options?.staleTime ?? 5 * 60 * 1000,
    gcTime: options?.gcTime ?? 10 * 60 * 1000,
    enabled: options?.enabled,
    refetchInterval: options?.refetchInterval,
  })
}

// 무한 스크롤용 쿼리 훅
export function useInfiniteQuery<T>(
  queryKey: any[],
  queryFn: ({ pageParam }: { pageParam: number }) => Promise<T>,
  options?: {
    enabled?: boolean
    staleTime?: number
    initialPageParam?: number
  }
) {
  return useQuery({
    queryKey,
    queryFn: () => queryFn({ pageParam: options?.initialPageParam ?? 0 }),
    staleTime: options?.staleTime ?? 5 * 60 * 1000,
    enabled: options?.enabled,
  })
}

// 캐시 무효화 헬퍼 훅
export function useCacheInvalidation() {
  const queryClient = useQueryClient()

  const invalidateUsers = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
  }, [queryClient])

  const invalidateCampaigns = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.all })
  }, [queryClient])

  const invalidateSystem = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.system.all })
  }, [queryClient])

  const invalidateAnalytics = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all })
  }, [queryClient])

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries()
  }, [queryClient])

  return useMemo(() => ({
    invalidateUsers,
    invalidateCampaigns,
    invalidateSystem,
    invalidateAnalytics,
    invalidateAll,
  }), [invalidateUsers, invalidateCampaigns, invalidateSystem, invalidateAnalytics, invalidateAll])
}

// 프리페칭 훅
export function usePrefetchData() {
  const queryClient = useQueryClient()

  const prefetchUserList = useCallback((filters?: any) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.users.list(filters),
      queryFn: () => import('../lib/api/admin').then(api => api.getUsers(filters)),
      staleTime: 5 * 60 * 1000,
    })
  }, [queryClient])

  const prefetchUserDetail = useCallback((userId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.users.detail(userId),
      queryFn: () => import('../lib/api/admin').then(api => api.getUserDetail(userId)),
      staleTime: 5 * 60 * 1000,
    })
  }, [queryClient])

  return useMemo(() => ({
    prefetchUserList,
    prefetchUserDetail,
  }), [prefetchUserList, prefetchUserDetail])
}

// 디바운싱된 검색 훅
export function useDebouncedSearch(
  searchTerm: string,
  delay: number = 500
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