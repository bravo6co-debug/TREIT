import { QueryClient } from '@tanstack/react-query'

// QueryClient 설정 with 성능 최적화
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2분 (사용자 앱이라 자주 갱신)
      gcTime: 10 * 60 * 1000, // 10분
      retry: (failureCount, error: any) => {
        // 특정 에러는 재시도하지 않음
        if (error?.status === 401 || error?.status === 403) {
          return false
        }
        return failureCount < 2 // 모바일 친화적으로 재시도 횟수 줄임
      },
      refetchOnWindowFocus: true, // 앱 포커스시 갱신
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
  // 사용자 레벨 관련
  levels: {
    all: ['levels'] as const,
    userInfo: () => ['levels', 'userInfo'] as const,
    progress: () => ['levels', 'progress'] as const,
    leaderboard: (period?: string) => ['levels', 'leaderboard', period] as const,
  },
  // 미션 관련
  missions: {
    all: ['missions'] as const,
    daily: () => ['missions', 'daily'] as const,
    available: () => ['missions', 'available'] as const,
    progress: (missionId: string) => ['missions', 'progress', missionId] as const,
  },
  // 업적 관련
  achievements: {
    all: ['achievements'] as const,
    earned: () => ['achievements', 'earned'] as const,
    pending: () => ['achievements', 'pending'] as const,
  },
  // XP 관련
  xp: {
    all: ['xp'] as const,
    history: (page?: number) => ['xp', 'history', page] as const,
    stats: () => ['xp', 'stats'] as const,
  },
  // 프로젝트 관련
  projects: {
    all: ['projects'] as const,
    available: () => ['projects', 'available'] as const,
    participated: () => ['projects', 'participated'] as const,
    detail: (id: string) => ['projects', 'detail', id] as const,
  },
  // 보너스 관련
  bonuses: {
    all: ['bonuses'] as const,
    daily: () => ['bonuses', 'daily'] as const,
    streak: () => ['bonuses', 'streak'] as const,
  },
  // 추천 관련
  referrals: {
    all: ['referrals'] as const,
    info: () => ['referrals', 'info'] as const,
    stats: () => ['referrals', 'stats'] as const,
  },
} as const