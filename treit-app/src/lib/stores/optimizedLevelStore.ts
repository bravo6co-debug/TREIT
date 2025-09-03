import { create } from 'zustand'
import { persist, createJSONStorage, subscribeWithSelector } from 'zustand/middleware'
import { shallow } from 'zustand/shallow'
import { 
  calculateUserLevelInfo, 
  addXP, 
  createXPGainRecord,
  calculateStreakDays,
  type XPGainSource, 
  type LevelUpResult, 
  type UserLevelInfo 
} from '../api/xp'
import { 
  checkAchievements, 
  ACHIEVEMENTS,
  type Achievement, 
  type UserStats 
} from '../api/achievements'

// 기본 타입들
export interface DailyMission {
  id: string
  title: string
  description: string
  xpReward: number
  progress: number
  target: number
  completed: boolean
  completedAt?: Date
}

export interface MiniGame {
  id: string
  title: string
  description: string
  xpReward: number
  icon: string
  cooldownUntil?: Date
}

export interface DailyBonus {
  claimed: boolean
  claimDate?: Date
  streakDays: number
  xpReward: number
}

export interface ReferralInfo {
  code: string
  invitedFriends: number
  pendingInvites: number
  monthlyXpEarned: number
}

// 슬라이스별로 스토어 분할
interface UserSlice {
  totalXp: number
  userLevelInfo: UserLevelInfo
  userStats: UserStats
  setTotalXp: (xp: number) => void
  setUserLevelInfo: (info: UserLevelInfo) => void
  setUserStats: (stats: UserStats) => void
}

interface MissionSlice {
  dailyMissions: DailyMission[]
  miniGames: MiniGame[]
  setDailyMissions: (missions: DailyMission[]) => void
  setMiniGames: (games: MiniGame[]) => void
  updateMissionProgress: (missionId: string, progress: number) => void
  completeMission: (missionId: string) => boolean
}

interface BonusSlice {
  dailyBonus: DailyBonus
  loginDates: Date[]
  setDailyBonus: (bonus: DailyBonus) => void
  setLoginDates: (dates: Date[]) => void
  claimBonus: () => boolean
}

interface AchievementSlice {
  achievements: Achievement[]
  setAchievements: (achievements: Achievement[]) => void
  checkAndUpdateAchievements: (stats: UserStats) => Achievement[]
}

interface ReferralSlice {
  referralInfo: ReferralInfo
  setReferralInfo: (info: ReferralInfo) => void
}

interface HistorySlice {
  xpHistory: XPGainSource[]
  addXpHistory: (xpGain: XPGainSource) => void
  clearOldHistory: () => void
}

// 통합 스토어 타입
type OptimizedLevelStore = UserSlice & MissionSlice & BonusSlice & AchievementSlice & ReferralSlice & HistorySlice & {
  // 계산된 값들 (getter 스타일)
  getNextLevelProgress: () => number
  getCompletedDailyMissions: () => number
  getAvailableMiniGames: () => MiniGame[]
  getPendingAchievements: () => Achievement[]
  getEarnedAchievements: () => Achievement[]
  
  // 복합 액션들
  addXpToUser: (xpGain: XPGainSource) => LevelUpResult | null
  initializeUser: (initialData?: Partial<OptimizedLevelStore>) => void
  resetDailyContent: () => void
}

// 초기 데이터
const initialDailyMissions: DailyMission[] = [
  {
    id: 'sns_posting',
    title: 'SNS 포스팅 3회',
    description: '오늘 SNS에 홍보 포스팅 3회 완료하기',
    xpReward: 80,
    progress: 0,
    target: 3,
    completed: false
  },
  {
    id: 'link_clicks',
    title: '링크 클릭 10회 달성',
    description: '내가 올린 링크에 클릭 10회 받기',
    xpReward: 120,
    progress: 0,
    target: 10,
    completed: false
  },
  {
    id: 'project_apply',
    title: '새로운 프로젝트 1개 신청',
    description: '새로운 홍보 프로젝트에 신청하기',
    xpReward: 60,
    progress: 0,
    target: 1,
    completed: false
  },
  {
    id: 'revenue_goal',
    title: '수익 5,000원 달성',
    description: '오늘 CPC 수익 5,000원 달성하기',
    xpReward: 100,
    progress: 0,
    target: 5000,
    completed: false
  }
]

const initialMiniGames: MiniGame[] = [
  {
    id: 'marketing_quiz',
    title: '마케팅 퀴즈',
    description: 'SNS 마케팅 상식 맞추기',
    xpReward: 50,
    icon: '🧠'
  },
  {
    id: 'hashtag_match',
    title: '해시태그 매치',
    description: '적절한 해시태그 조합 찾기',
    xpReward: 40,
    icon: '📱'
  },
  {
    id: 'trend_prediction',
    title: '트렌드 예측',
    description: '인기 키워드 맞추기 게임',
    xpReward: 60,
    icon: '📈'
  },
  {
    id: 'branding_challenge',
    title: '브랜딩 챌린지',
    description: '브랜드 슬로건 만들기',
    xpReward: 80,
    icon: '🎨'
  }
]

const generateReferralCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// 메모이제이션된 셀렉터들
export const selectUserLevel = (state: OptimizedLevelStore) => ({
  level: state.userLevelInfo.level,
  grade: state.userLevelInfo.grade,
  gradeName: state.userLevelInfo.gradeName,
  cpcRate: state.userLevelInfo.cpcRate
})

export const selectMissionProgress = (state: OptimizedLevelStore) => ({
  completed: state.getCompletedDailyMissions(),
  total: state.dailyMissions.length,
  missions: state.dailyMissions
})

export const selectXPProgress = (state: OptimizedLevelStore) => ({
  currentXp: state.userLevelInfo.currentXp,
  nextLevelXp: state.userLevelInfo.nextLevelXp,
  totalXp: state.totalXp,
  progress: state.getNextLevelProgress()
})

// 최적화된 스토어 생성
export const useOptimizedLevelStore = create<OptimizedLevelStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // UserSlice
        totalXp: 750,
        userLevelInfo: calculateUserLevelInfo(750),
        userStats: {
          totalProjects: 12,
          consecutiveDays: 5,
          totalEarnings: 87500,
          referralCount: 3,
          loginDates: [
            new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
            new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
            new Date()
          ]
        },
        setTotalXp: (xp) => set((state) => ({ 
          ...state, 
          totalXp: xp,
          userLevelInfo: calculateUserLevelInfo(xp)
        })),
        setUserLevelInfo: (info) => set({ userLevelInfo: info }),
        setUserStats: (stats) => set({ userStats: stats }),

        // MissionSlice
        dailyMissions: initialDailyMissions,
        miniGames: initialMiniGames,
        setDailyMissions: (missions) => set({ dailyMissions: missions }),
        setMiniGames: (games) => set({ miniGames: games }),
        updateMissionProgress: (missionId, progress) => set((state) => ({
          dailyMissions: state.dailyMissions.map(m =>
            m.id === missionId ? { ...m, progress } : m
          )
        })),
        completeMission: (missionId) => {
          const state = get()
          const mission = state.dailyMissions.find(m => m.id === missionId)
          
          if (!mission || mission.completed || mission.progress < mission.target) {
            return false
          }
          
          const updatedMissions = state.dailyMissions.map(m =>
            m.id === missionId
              ? { ...m, completed: true, completedAt: new Date() }
              : m
          )
          
          set({ dailyMissions: updatedMissions })
          return true
        },

        // BonusSlice
        dailyBonus: {
          claimed: false,
          streakDays: 5,
          xpReward: 30
        },
        loginDates: [
          new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
          new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          new Date()
        ],
        setDailyBonus: (bonus) => set({ dailyBonus: bonus }),
        setLoginDates: (dates) => set({ loginDates: dates }),
        claimBonus: () => {
          const state = get()
          
          if (state.dailyBonus.claimed) {
            return false
          }
          
          const today = new Date().toDateString()
          const lastLoginDate = state.loginDates[state.loginDates.length - 1]
          const isNewDay = !lastLoginDate || new Date(lastLoginDate).toDateString() !== today
          
          if (!isNewDay) {
            return false
          }
          
          const updatedLoginDates = [...state.loginDates, new Date()]
          const streakDays = calculateStreakDays(updatedLoginDates)
          
          let bonusXp = 30
          if (streakDays === 7) bonusXp += 100
          if (streakDays === 30) bonusXp += 500
          
          set({
            dailyBonus: {
              claimed: true,
              claimDate: new Date(),
              streakDays,
              xpReward: bonusXp
            },
            loginDates: updatedLoginDates
          })
          
          return true
        },

        // AchievementSlice
        achievements: ACHIEVEMENTS,
        setAchievements: (achievements) => set({ achievements }),
        checkAndUpdateAchievements: (stats) => {
          const state = get()
          const result = checkAchievements(state.achievements, stats)
          
          set({ achievements: result.updatedAchievements })
          return result.newlyEarnedAchievements
        },

        // ReferralSlice
        referralInfo: {
          code: generateReferralCode(),
          invitedFriends: 3,
          pendingInvites: 2,
          monthlyXpEarned: 600
        },
        setReferralInfo: (info) => set({ referralInfo: info }),

        // HistorySlice
        xpHistory: [],
        addXpHistory: (xpGain) => set((state) => ({
          xpHistory: [xpGain, ...state.xpHistory.slice(0, 99)]
        })),
        clearOldHistory: () => set((state) => ({
          xpHistory: state.xpHistory.slice(0, 50) // 최근 50개만 유지
        })),

        // 계산된 값들 (메모이제이션됨)
        getNextLevelProgress: () => {
          const state = get()
          if (state.userLevelInfo.nextLevelXp === 0) return 100
          return (state.userLevelInfo.currentXp / state.userLevelInfo.nextLevelXp) * 100
        },
        
        getCompletedDailyMissions: () => {
          const state = get()
          return state.dailyMissions.filter(mission => mission.completed).length
        },
        
        getAvailableMiniGames: () => {
          const state = get()
          const now = new Date()
          return state.miniGames.filter(game => !game.cooldownUntil || now >= game.cooldownUntil)
        },
        
        getPendingAchievements: () => {
          const state = get()
          return state.achievements.filter(achievement => !achievement.earned)
        },
        
        getEarnedAchievements: () => {
          const state = get()
          return state.achievements.filter(achievement => achievement.earned)
        },

        // 복합 액션들
        addXpToUser: (xpGain) => {
          const state = get()
          const result = addXP(state.totalXp, xpGain)
          
          set({
            totalXp: result.newTotalXp,
            userLevelInfo: result.userLevelInfo,
            xpHistory: [xpGain, ...state.xpHistory.slice(0, 99)]
          })
          
          return result.levelUpResult || null
        },

        initializeUser: (initialData) => {
          if (initialData) {
            set((state) => ({
              ...state,
              ...initialData,
              userLevelInfo: calculateUserLevelInfo(initialData.totalXp || state.totalXp)
            }))
          }
        },

        resetDailyContent: () => {
          set((state) => ({
            dailyMissions: initialDailyMissions,
            dailyBonus: {
              claimed: false,
              streakDays: state.dailyBonus.streakDays,
              xpReward: 30
            },
            miniGames: state.miniGames.map(game => ({
              ...game,
              cooldownUntil: undefined
            }))
          }))
        }
      }),
      {
        name: 'treit-optimized-level-store',
        version: 2,
        storage: createJSONStorage(() => localStorage),
        // 성능 최적화: 특정 필드만 저장
        partialize: (state) => ({
          totalXp: state.totalXp,
          dailyMissions: state.dailyMissions,
          dailyBonus: state.dailyBonus,
          loginDates: state.loginDates,
          achievements: state.achievements,
          referralInfo: state.referralInfo,
          userStats: state.userStats,
          xpHistory: state.xpHistory.slice(0, 50), // 최근 50개만 저장
        }),
        // 마이그레이션 함수
        migrate: (persistedState: any, version: number) => {
          if (version < 2) {
            // v1에서 v2로 업그레이드 시 데이터 마이그레이션
            return {
              ...persistedState,
              // 새로운 필드 추가나 변경 사항 적용
            }
          }
          return persistedState
        }
      }
    )
  )
)

// 셀렉터 훅들 (컴포넌트 리렌더링 최적화)
export const useUserLevel = () => useOptimizedLevelStore(selectUserLevel, shallow)
export const useMissionProgress = () => useOptimizedLevelStore(selectMissionProgress, shallow)
export const useXPProgress = () => useOptimizedLevelStore(selectXPProgress, shallow)

// 액션만 필요한 경우의 훅
export const useLevelActions = () => useOptimizedLevelStore(
  (state) => ({
    addXpToUser: state.addXpToUser,
    completeMission: state.completeMission,
    claimBonus: state.claimBonus,
    updateMissionProgress: state.updateMissionProgress,
    setUserStats: state.setUserStats,
  }),
  shallow
)