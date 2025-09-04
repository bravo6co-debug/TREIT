import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { 
  calculateUserLevelInfo, 
  addXP, 
  createXPGainRecord,
  calculateStreakDays,
  type XPGainSource, 
  type LevelUpResult, 
  type UserLevelInfo 
} from '../api/xp';
import { 
  checkAchievements, 
  ACHIEVEMENTS,
  type Achievement, 
  type UserStats 
} from '../api/achievements';

export interface DailyMission {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  progress: number;
  target: number;
  completed: boolean;
  completedAt?: Date;
}

export interface MiniGame {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  icon: string;
  cooldownUntil?: Date;
}

export interface DailyBonus {
  claimed: boolean;
  claimDate?: Date;
  streakDays: number;
  xpReward: number;
}

export interface ReferralInfo {
  code: string;
  invitedFriends: number;
  pendingInvites: number;
  monthlyXpEarned: number;
}

interface LevelStore {
  // User Level Data
  totalXp: number;
  userLevelInfo: UserLevelInfo;
  
  // Daily Systems
  dailyMissions: DailyMission[];
  miniGames: MiniGame[];
  dailyBonus: DailyBonus;
  loginDates: Date[];
  
  // Achievements
  achievements: Achievement[];
  
  // Referral System
  referralInfo: ReferralInfo;
  
  // User Stats for achievements
  userStats: UserStats;
  
  // XP History
  xpHistory: XPGainSource[];
  
  // Actions
  initializeUser: (initialData?: Partial<LevelStore>) => void;
  addXpToUser: (xpGain: XPGainSource) => LevelUpResult | null;
  completeDailyMission: (missionId: string) => boolean;
  playMiniGame: (gameId: string) => boolean;
  claimDailyBonus: () => boolean;
  updateUserStats: (stats: Partial<UserStats>) => void;
  resetDailyContent: () => void;
  clearBonusData: () => void;
  
  // Getters
  getNextLevelProgress: () => number;
  getCompletedDailyMissions: () => number;
  getAvailableMiniGames: () => MiniGame[];
  getPendingAchievements: () => Achievement[];
  getEarnedAchievements: () => Achievement[];
}

// Initial data
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
];

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
];

const generateReferralCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

// localStorage 데이터 마이그레이션 헬퍼
const migrateData = (state: any) => {
  // claimDate가 없으면 추가
  if (state.dailyBonus && !('claimDate' in state.dailyBonus)) {
    state.dailyBonus.claimDate = undefined;
  }
  return state;
};

export const useLevelStore = create<LevelStore>()(
  persist(
    (set, get) => ({
      // Initial State
      totalXp: 750, // Starting with some XP for demo
      userLevelInfo: calculateUserLevelInfo(750),
      dailyMissions: initialDailyMissions,
      miniGames: initialMiniGames,
      dailyBonus: {
        claimed: false,
        claimDate: undefined,
        streakDays: 5, // Demo: 5-day streak
        xpReward: 30
      },
      loginDates: [
        new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
        new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago  
        new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // yesterday
        new Date() // today
      ],
      achievements: ACHIEVEMENTS,
      referralInfo: {
        code: generateReferralCode(),
        invitedFriends: 3, // Demo data
        pendingInvites: 2,
        monthlyXpEarned: 600 // Demo data
      },
      userStats: {
        totalProjects: 12,
        consecutiveDays: 5, // Match the streak days
        totalEarnings: 87500,
        referralCount: 3, // Match invitedFriends
        loginDates: [
          new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
          new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          new Date()
        ]
      },
      xpHistory: [],
      
      // Actions
      initializeUser: (initialData) => {
        if (initialData) {
          set((state) => ({
            ...state,
            ...initialData,
            userLevelInfo: calculateUserLevelInfo(initialData.totalXp || state.totalXp)
          }));
        }
      },
      
      addXpToUser: (xpGain) => {
        const state = get();
        const result = addXP(state.totalXp, xpGain);
        
        set((prevState) => ({
          ...prevState,
          totalXp: result.newTotalXp,
          userLevelInfo: result.userLevelInfo,
          xpHistory: [xpGain, ...prevState.xpHistory.slice(0, 99)] // Keep last 100 entries
        }));
        
        return result.levelUpResult || null;
      },
      
      completeDailyMission: (missionId) => {
        const state = get();
        const mission = state.dailyMissions.find(m => m.id === missionId);
        
        if (!mission || mission.completed || mission.progress < mission.target) {
          return false;
        }
        
        // Complete mission
        const updatedMissions = state.dailyMissions.map(m =>
          m.id === missionId
            ? { ...m, completed: true, completedAt: new Date() }
            : m
        );
        
        // Add XP
        const xpGain = createXPGainRecord(
          'DAILY_MISSION',
          mission.xpReward,
          `데일리 미션 완료: ${mission.title}`
        );
        
        const result = addXP(state.totalXp, xpGain);
        
        set({
          ...state,
          dailyMissions: updatedMissions,
          totalXp: result.newTotalXp,
          userLevelInfo: result.userLevelInfo,
          xpHistory: [xpGain, ...state.xpHistory.slice(0, 99)]
        });
        
        return true;
      },
      
      playMiniGame: (gameId) => {
        const state = get();
        const game = state.miniGames.find(g => g.id === gameId);
        
        if (!game || (game.cooldownUntil && new Date() < game.cooldownUntil)) {
          return false;
        }
        
        // Set cooldown (5 minutes)
        const cooldownUntil = new Date(Date.now() + 5 * 60 * 1000);
        const updatedGames = state.miniGames.map(g =>
          g.id === gameId ? { ...g, cooldownUntil } : g
        );
        
        // Add XP
        const xpGain = createXPGainRecord(
          'MINI_GAME',
          game.xpReward,
          `미니게임 완료: ${game.title}`
        );
        
        const result = addXP(state.totalXp, xpGain);
        
        set({
          ...state,
          miniGames: updatedGames,
          totalXp: result.newTotalXp,
          userLevelInfo: result.userLevelInfo,
          xpHistory: [xpGain, ...state.xpHistory.slice(0, 99)]
        });
        
        return true;
      },
      
      claimDailyBonus: () => {
        const state = get();
        
        const today = new Date().toDateString();
        const lastClaimDate = state.dailyBonus.claimDate ? new Date(state.dailyBonus.claimDate).toDateString() : null;
        
        // 이미 오늘 보너스를 받았는지 확인
        if (lastClaimDate === today) {
          return false;
        }
        
        // Calculate streak
        const updatedLoginDates = [...state.loginDates, new Date()];
        const streakDays = calculateStreakDays(updatedLoginDates);
        
        let bonusXp = 30; // Base daily bonus
        
        // Add streak bonuses
        if (streakDays === 7) bonusXp += 100; // 7-day streak
        if (streakDays === 30) bonusXp += 500; // 30-day streak
        
        const xpGain = createXPGainRecord(
          'DAILY_BONUS',
          bonusXp,
          `일일 출석 보너스 (${streakDays}일 연속)`
        );
        
        const result = addXP(state.totalXp, xpGain);
        
        set({
          ...state,
          dailyBonus: {
            claimed: true,
            claimDate: new Date(),
            streakDays,
            xpReward: bonusXp
          },
          loginDates: updatedLoginDates,
          totalXp: result.newTotalXp,
          userLevelInfo: result.userLevelInfo,
          userStats: {
            ...state.userStats,
            consecutiveDays: streakDays,
            loginDates: updatedLoginDates
          },
          xpHistory: [xpGain, ...state.xpHistory.slice(0, 99)]
        });
        
        return true;
      },
      
      updateUserStats: (stats) => {
        set((state) => {
          const updatedStats = { ...state.userStats, ...stats };
          const achievementResult = checkAchievements(state.achievements, updatedStats);
          
          // Add XP for newly earned achievements
          let totalXp = state.totalXp;
          let userLevelInfo = state.userLevelInfo;
          let xpHistory = [...state.xpHistory];
          
          achievementResult.newlyEarnedAchievements.forEach(achievement => {
            const xpGain = createXPGainRecord(
              'ACHIEVEMENT',
              achievement.xpReward,
              `업적 달성: ${achievement.title}`
            );
            
            const result = addXP(totalXp, xpGain);
            totalXp = result.newTotalXp;
            userLevelInfo = result.userLevelInfo;
            xpHistory = [xpGain, ...xpHistory.slice(0, 99)];
          });
          
          return {
            ...state,
            userStats: updatedStats,
            achievements: achievementResult.updatedAchievements,
            totalXp,
            userLevelInfo,
            xpHistory
          };
        });
      },
      
      resetDailyContent: () => {
        set((state) => {
          const today = new Date().toDateString();
          const lastClaimDate = state.dailyBonus.claimDate ? new Date(state.dailyBonus.claimDate).toDateString() : null;
          
          // 날짜가 바뀌었을 때만 리셋
          const shouldReset = lastClaimDate !== today;
          
          return {
            ...state,
            dailyMissions: initialDailyMissions,
            dailyBonus: {
              claimed: false,
              claimDate: shouldReset ? undefined : state.dailyBonus.claimDate,
              streakDays: state.dailyBonus.streakDays,
              xpReward: 30
            },
            miniGames: state.miniGames.map(game => ({
              ...game,
              cooldownUntil: undefined
            }))
          };
        });
      },
      
      clearBonusData: () => {
        set((state) => ({
          ...state,
          dailyBonus: {
            claimed: false,
            claimDate: undefined,
            streakDays: state.dailyBonus.streakDays,
            xpReward: 30
          }
        }));
      },
      
      // Getters
      getNextLevelProgress: () => {
        const state = get();
        if (state.userLevelInfo.nextLevelXp === 0) return 100;
        return (state.userLevelInfo.currentXp / state.userLevelInfo.nextLevelXp) * 100;
      },
      
      getCompletedDailyMissions: () => {
        const state = get();
        return state.dailyMissions.filter(mission => mission.completed).length;
      },
      
      getAvailableMiniGames: () => {
        const state = get();
        const now = new Date();
        return state.miniGames.filter(game => !game.cooldownUntil || now >= game.cooldownUntil);
      },
      
      getPendingAchievements: () => {
        const state = get();
        return state.achievements.filter(achievement => !achievement.earned);
      },
      
      getEarnedAchievements: () => {
        const state = get();
        return state.achievements.filter(achievement => achievement.earned);
      }
    }),
    {
      name: 'treit-level-store',
      version: 2, // 버전 업데이트로 기존 캐시 무효화
      storage: createJSONStorage(() => localStorage, {
        reviver: (key, value) => {
          // Date 문자열을 Date 객체로 변환
          if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
            return new Date(value);
          }
          return value;
        }
      }),
      migrate: (persistedState: any, version: number) => {
        if (version === 1) {
          // 버전 1에서 2로 마이그레이션
          return migrateData(persistedState);
        }
        return persistedState as any;
      }
    }
  )
);