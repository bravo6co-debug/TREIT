import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState, useEffect } from 'react'
import { queryKeys } from '../lib/query-client'
import { useLevelStore } from '../lib/stores/levelStore'

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
    staleTime: options?.staleTime ?? 2 * 60 * 1000, // 2분
    gcTime: options?.gcTime ?? 10 * 60 * 1000,
    enabled: options?.enabled,
    refetchInterval: options?.refetchInterval,
  })
}

// 캐시 무효화 헬퍼 훅
export function useCacheInvalidation() {
  const queryClient = useQueryClient()

  const invalidateLevels = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.levels.all })
  }, [queryClient])

  const invalidateMissions = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.missions.all })
  }, [queryClient])

  const invalidateAchievements = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.achievements.all })
  }, [queryClient])

  const invalidateXP = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.xp.all })
  }, [queryClient])

  const invalidateProjects = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.all })
  }, [queryClient])

  const invalidateBonuses = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.bonuses.all })
  }, [queryClient])

  const invalidateReferrals = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.referrals.all })
  }, [queryClient])

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries()
  }, [queryClient])

  return useMemo(() => ({
    invalidateLevels,
    invalidateMissions,
    invalidateAchievements,
    invalidateXP,
    invalidateProjects,
    invalidateBonuses,
    invalidateReferrals,
    invalidateAll,
  }), [invalidateLevels, invalidateMissions, invalidateAchievements, invalidateXP, invalidateProjects, invalidateBonuses, invalidateReferrals, invalidateAll])
}

// 실시간 업데이트 훅
export function useRealTimeUpdates() {
  const queryClient = useQueryClient()
  const { userLevelInfo } = useLevelStore()

  useEffect(() => {
    // 레벨, 미션, XP 데이터를 30초마다 동기화
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.levels.userInfo(),
      })
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.missions.daily(),
      })
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.xp.stats(),
      })
    }, 30000)

    return () => clearInterval(interval)
  }, [queryClient])

  // 레벨 변경 시 관련 데이터 무효화
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.levels.all })
    queryClient.invalidateQueries({ queryKey: queryKeys.achievements.all })
  }, [userLevelInfo.level, queryClient])
}

// 옵티미스틱 업데이트를 위한 뮤테이션 훅
export function useOptimisticMutations() {
  const queryClient = useQueryClient()

  const completeMission = useMutation({
    mutationFn: async ({ missionId, xpGained }: { missionId: string; xpGained: number }) => {
      // 실제 API 호출 (시뮬레이션)
      await new Promise(resolve => setTimeout(resolve, 100))
      return { missionId, xpGained }
    },
    // 옵티미스틱 업데이트
    onMutate: async ({ missionId, xpGained }) => {
      // 관련 쿼리들 취소
      await queryClient.cancelQueries({ queryKey: queryKeys.missions.daily() })
      await queryClient.cancelQueries({ queryKey: queryKeys.xp.stats() })

      // 이전 데이터 백업
      const previousMissions = queryClient.getQueryData(queryKeys.missions.daily())
      const previousXP = queryClient.getQueryData(queryKeys.xp.stats())

      // 옵티미스틱 업데이트
      queryClient.setQueryData(queryKeys.missions.daily(), (old: any) => 
        old?.map((mission: any) => 
          mission.id === missionId 
            ? { ...mission, completed: true }
            : mission
        )
      )

      queryClient.setQueryData(queryKeys.xp.stats(), (old: any) => ({
        ...old,
        totalXP: (old?.totalXP || 0) + xpGained
      }))

      return { previousMissions, previousXP }
    },
    onError: (err, variables, context) => {
      // 에러 시 롤백
      if (context?.previousMissions) {
        queryClient.setQueryData(queryKeys.missions.daily(), context.previousMissions)
      }
      if (context?.previousXP) {
        queryClient.setQueryData(queryKeys.xp.stats(), context.previousXP)
      }
    },
    onSettled: () => {
      // 성공/실패와 관계없이 데이터 재페칭
      queryClient.invalidateQueries({ queryKey: queryKeys.missions.daily() })
      queryClient.invalidateQueries({ queryKey: queryKeys.xp.stats() })
    }
  })

  const claimDailyBonus = useMutation({
    mutationFn: async ({ bonusXP }: { bonusXP: number }) => {
      await new Promise(resolve => setTimeout(resolve, 200))
      return { bonusXP }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bonuses.daily() })
      queryClient.invalidateQueries({ queryKey: queryKeys.xp.stats() })
    }
  })

  const playMiniGame = useMutation({
    mutationFn: async ({ gameId, xpEarned }: { gameId: string; xpEarned: number }) => {
      await new Promise(resolve => setTimeout(resolve, 300))
      return { gameId, xpEarned }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.xp.all })
    }
  })

  return {
    completeMission,
    claimDailyBonus,
    playMiniGame,
  }
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

// 무한 스크롤 훅
export function useInfiniteScroll<T>(
  queryKey: any[],
  fetchFn: ({ pageParam }: { pageParam: number }) => Promise<{ data: T[]; nextPage?: number }>,
  options?: {
    initialPageParam?: number
    getNextPageParam?: (lastPage: any, pages: any[]) => number | undefined
  }
) {
  return useQuery({
    queryKey,
    queryFn: () => fetchFn({ pageParam: options?.initialPageParam ?? 0 }),
    staleTime: 2 * 60 * 1000,
  })
}

// 로컬 스토리지와 동기화하는 훅
export function useStorageSync(key: string, initialValue: any) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      return initialValue
    }
  })

  const setValue = useCallback((value: any) => {
    try {
      setStoredValue(value)
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
    }
  }, [key])

  return [storedValue, setValue]
}