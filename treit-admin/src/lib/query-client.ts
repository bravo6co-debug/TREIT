import { QueryClient } from '@tanstack/react-query'

// QueryClient 설정 with 성능 최적화
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5분
      gcTime: 10 * 60 * 1000, // 10분
      retry: (failureCount, error: any) => {
        // 특정 에러는 재시도하지 않음
        if (error?.status === 401 || error?.status === 403) {
          return false
        }
        return failureCount < 3
      },
      refetchOnWindowFocus: false, // 성능을 위해 비활성화
      refetchOnMount: 'always',
      refetchOnReconnect: 'always',
    },
    mutations: {
      retry: 1,
    },
  },
})

// 쿼리 키 팩토리
export const queryKeys = {
  // 사용자 관련
  users: {
    all: ['users'] as const,
    list: (filters?: any) => ['users', 'list', filters] as const,
    detail: (id: string) => ['users', 'detail', id] as const,
    stats: () => ['users', 'stats'] as const,
  },
  // 캠페인 관련
  campaigns: {
    all: ['campaigns'] as const,
    list: (filters?: any) => ['campaigns', 'list', filters] as const,
    detail: (id: string) => ['campaigns', 'detail', id] as const,
    stats: () => ['campaigns', 'stats'] as const,
  },
  // 시스템 관련
  system: {
    all: ['system'] as const,
    health: () => ['system', 'health'] as const,
    stats: () => ['system', 'stats'] as const,
    activities: (page?: number) => ['system', 'activities', page] as const,
  },
  // 분석 관련
  analytics: {
    all: ['analytics'] as const,
    realtime: () => ['analytics', 'realtime'] as const,
    dashboard: (range?: string) => ['analytics', 'dashboard', range] as const,
  },
} as const