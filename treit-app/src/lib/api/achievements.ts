// Achievement system API
import { ACHIEVEMENT_XP } from './xp';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: 'PROJECTS' | 'ACTIVITY' | 'EARNINGS' | 'SOCIAL';
  xpReward: number;
  condition: {
    type: 'PROJECT_COUNT' | 'CONSECUTIVE_DAYS' | 'TOTAL_EARNINGS' | 'REFERRAL_COUNT';
    target: number;
    current?: number;
  };
  earned: boolean;
  earnedAt?: Date;
  icon: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_project',
    title: '첫 프로젝트 완료',
    description: '첫 번째 프로젝트를 성공적으로 완료했습니다',
    category: 'PROJECTS',
    xpReward: ACHIEVEMENT_XP.FIRST_PROJECT,
    condition: { type: 'PROJECT_COUNT', target: 1 },
    earned: false,
    icon: '🎯'
  },
  {
    id: 'consecutive_5_days',
    title: '연속 5일 활동',
    description: '5일 연속으로 활동했습니다',
    category: 'ACTIVITY',
    xpReward: ACHIEVEMENT_XP.CONSECUTIVE_5_DAYS,
    condition: { type: 'CONSECUTIVE_DAYS', target: 5 },
    earned: false,
    icon: '🔥'
  },
  {
    id: 'revenue_100k',
    title: '수익 10만원 달성',
    description: '누적 수익 10만원을 달성했습니다',
    category: 'EARNINGS',
    xpReward: ACHIEVEMENT_XP.REVENUE_100K,
    condition: { type: 'TOTAL_EARNINGS', target: 100000 },
    earned: false,
    icon: '💰'
  },
  {
    id: 'project_master',
    title: '프로젝트 마스터',
    description: '프로젝트 10개를 완료했습니다',
    category: 'PROJECTS',
    xpReward: ACHIEVEMENT_XP.PROJECT_MASTER,
    condition: { type: 'PROJECT_COUNT', target: 10 },
    earned: false,
    icon: '⭐'
  },
  {
    id: 'influencer_grade',
    title: '인플루언서 등급',
    description: '프로젝트 20개를 완료했습니다',
    category: 'PROJECTS',
    xpReward: ACHIEVEMENT_XP.INFLUENCER,
    condition: { type: 'PROJECT_COUNT', target: 20 },
    earned: false,
    icon: '👑'
  },
  {
    id: 'consecutive_10_days',
    title: '연속 10일 활동',
    description: '10일 연속으로 활동했습니다',
    category: 'ACTIVITY',
    xpReward: 400,
    condition: { type: 'CONSECUTIVE_DAYS', target: 10 },
    earned: false,
    icon: '⚡'
  },
  {
    id: 'revenue_500k',
    title: '수익 50만원 달성',
    description: '누적 수익 50만원을 달성했습니다',
    category: 'EARNINGS',
    xpReward: 800,
    condition: { type: 'TOTAL_EARNINGS', target: 500000 },
    earned: false,
    icon: '💎'
  },
  {
    id: 'revenue_1m',
    title: '수익 100만원 달성',
    description: '누적 수익 100만원을 달성했습니다',
    category: 'EARNINGS',
    xpReward: 1500,
    condition: { type: 'TOTAL_EARNINGS', target: 1000000 },
    earned: false,
    icon: '🏆'
  },
  {
    id: 'referral_master',
    title: '친구 초대 마스터',
    description: '친구 5명을 성공적으로 초대했습니다',
    category: 'SOCIAL',
    xpReward: 600,
    condition: { type: 'REFERRAL_COUNT', target: 5 },
    earned: false,
    icon: '🤝'
  },
  {
    id: 'project_expert',
    title: '프로젝트 전문가',
    description: '프로젝트 50개를 완료했습니다',
    category: 'PROJECTS',
    xpReward: 1200,
    condition: { type: 'PROJECT_COUNT', target: 50 },
    earned: false,
    icon: '🎖️'
  }
];

export interface UserStats {
  totalProjects: number;
  consecutiveDays: number;
  totalEarnings: number;
  referralCount: number;
  loginDates: Date[];
}

// 업적 체크 및 업데이트
export const checkAchievements = (
  currentAchievements: Achievement[],
  userStats: UserStats
): { 
  updatedAchievements: Achievement[];
  newlyEarnedAchievements: Achievement[];
} => {
  const updatedAchievements = [...currentAchievements];
  const newlyEarnedAchievements: Achievement[] = [];

  updatedAchievements.forEach((achievement, index) => {
    if (achievement.earned) return;

    let shouldEarn = false;
    let currentValue = 0;

    switch (achievement.condition.type) {
      case 'PROJECT_COUNT':
        currentValue = userStats.totalProjects;
        shouldEarn = userStats.totalProjects >= achievement.condition.target;
        break;
      case 'CONSECUTIVE_DAYS':
        currentValue = userStats.consecutiveDays;
        shouldEarn = userStats.consecutiveDays >= achievement.condition.target;
        break;
      case 'TOTAL_EARNINGS':
        currentValue = userStats.totalEarnings;
        shouldEarn = userStats.totalEarnings >= achievement.condition.target;
        break;
      case 'REFERRAL_COUNT':
        currentValue = userStats.referralCount;
        shouldEarn = userStats.referralCount >= achievement.condition.target;
        break;
    }

    // 현재 진행도 업데이트
    updatedAchievements[index] = {
      ...achievement,
      condition: {
        ...achievement.condition,
        current: currentValue
      }
    };

    // 업적 달성 체크
    if (shouldEarn) {
      updatedAchievements[index] = {
        ...updatedAchievements[index],
        earned: true,
        earnedAt: new Date()
      };
      newlyEarnedAchievements.push(updatedAchievements[index]);
    }
  });

  return {
    updatedAchievements,
    newlyEarnedAchievements
  };
};

// 카테고리별 업적 필터링
export const getAchievementsByCategory = (
  achievements: Achievement[],
  category: Achievement['category']
): Achievement[] => {
  return achievements.filter(achievement => achievement.category === category);
};

// 진행도 계산
export const calculateProgress = (achievement: Achievement): number => {
  const current = achievement.condition.current || 0;
  const target = achievement.condition.target;
  return Math.min((current / target) * 100, 100);
};

// 완료되지 않은 업적만 가져오기
export const getPendingAchievements = (achievements: Achievement[]): Achievement[] => {
  return achievements.filter(achievement => !achievement.earned);
};

// 완료된 업적만 가져오기
export const getEarnedAchievements = (achievements: Achievement[]): Achievement[] => {
  return achievements.filter(achievement => achievement.earned);
};

// 업적 통계
export const getAchievementStats = (achievements: Achievement[]) => {
  const total = achievements.length;
  const earned = achievements.filter(a => a.earned).length;
  const totalXp = achievements
    .filter(a => a.earned)
    .reduce((sum, a) => sum + a.xpReward, 0);

  return {
    total,
    earned,
    pending: total - earned,
    completionRate: (earned / total) * 100,
    totalXpEarned: totalXp
  };
};