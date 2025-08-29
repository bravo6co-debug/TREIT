import { QueryClient } from '@tanstack/react-query'

// QueryClient 설정 with 성능 최적화
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 3 * 60 * 1000, // 3분 (광고주용이라 조금 더 자주 업데이트)
      gcTime: 10 * 60 * 1000, // 10분
      retry: (failureCount, error: any) => {
        // 특정 에러는 재시도하지 않음
        if (error?.status === 401 || error?.status === 403) {
          return false
        }
        return failureCount < 3
      },
      refetchOnWindowFocus: true, // 광고주는 포커스시 갱신 유용
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
  // 캠페인 관련
  campaigns: {
    all: ['campaigns'] as const,
    list: (filters?: any) => ['campaigns', 'list', filters] as const,
    detail: (id: string) => ['campaigns', 'detail', id] as const,
    stats: () => ['campaigns', 'stats'] as const,
    analytics: (id: string, range?: string) => ['campaigns', 'analytics', id, range] as const,
  },
  // 결제 관련
  billing: {
    all: ['billing'] as const,
    history: (page?: number) => ['billing', 'history', page] as const,
    balance: () => ['billing', 'balance'] as const,
  },
  // 템플릿 관련
  templates: {
    all: ['templates'] as const,
    list: (category?: string) => ['templates', 'list', category] as const,
    detail: (id: string) => ['templates', 'detail', id] as const,
  },
  // 딥링크 관련
  deeplinks: {
    all: ['deeplinks'] as const,
    list: (campaignId?: string) => ['deeplinks', 'list', campaignId] as const,
    detail: (id: string) => ['deeplinks', 'detail', id] as const,
  },
  // 분석 관련
  analytics: {
    all: ['analytics'] as const,
    dashboard: (range?: string) => ['analytics', 'dashboard', range] as const,
    performance: (campaignId: string, range?: string) => ['analytics', 'performance', campaignId, range] as const,
  },
} as const