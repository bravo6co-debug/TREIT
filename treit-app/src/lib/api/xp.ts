// XP calculation and management API
import { getLevelByXP, getLevelConfig, getNextLevelConfig, getRemainingXP, getCurrentXP } from './levels';

export interface XPGainSource {
  type: 'MISSION' | 'DAILY_MISSION' | 'MINI_GAME' | 'ACHIEVEMENT' | 'DAILY_BONUS' | 'REFERRAL';
  amount: number;
  description: string;
  timestamp: Date;
}

export interface LevelUpResult {
  previousLevel: number;
  newLevel: number;
  gradeChanged: boolean;
  previousGrade: string;
  newGrade: string;
  bonusReward?: number;
}

export interface UserLevelInfo {
  level: number;
  grade: string;
  gradeName: string;
  gradeEmoji: string;
  totalXp: number;
  currentXp: number;
  nextLevelXp: number;
  remainingXp: number;
  cpcRate: number;
}

// 데일리 미션 XP 보상
export const DAILY_MISSION_XP = {
  SNS_POSTING: 80,      // SNS 포스팅 3회
  LINK_CLICKS: 120,     // 링크 클릭 10회 받기
  PROJECT_APPLY: 60,    // 새로운 프로젝트 1개 신청
  REVENUE_GOAL: 100     // 수익 5,000원 달성
};

// XP 부스터 미니게임 보상
export const MINI_GAME_XP = {
  MARKETING_QUIZ: 50,     // 마케팅 퀴즈
  HASHTAG_MATCH: 40,      // 해시태그 매치
  TREND_PREDICTION: 60,   // 트렌드 예측
  BRANDING_CHALLENGE: 80  // 브랜딩 챌린지
};

// 업적 XP 보상
export const ACHIEVEMENT_XP = {
  FIRST_PROJECT: 100,      // 첫 프로젝트 완료
  CONSECUTIVE_5_DAYS: 200, // 연속 5일 활동
  REVENUE_100K: 300,       // 수익 10만원 달성
  PROJECT_MASTER: 250,     // 프로젝트 10개 완료
  INFLUENCER: 500          // 프로젝트 20개 완료
};

// 일일 출석 보너스
export const DAILY_BONUS_XP = {
  DAILY_LOGIN: 30,       // 매일 첫 접속
  STREAK_7_DAYS: 100,    // 7일 연속 출석 보너스
  STREAK_30_DAYS: 500    // 30일 연속 출석 보너스
};

// 친구 초대 보너스
export const REFERRAL_XP = {
  FRIEND_SIGNUP: 200,     // 친구 가입
  FRIEND_FIRST_MISSION: 100, // 친구 첫 미션 완료
  MONTHLY_LIMIT: 1500     // 월간 최대 보너스
};

// 사용자 레벨 정보 계산
export const calculateUserLevelInfo = (totalXp: number): UserLevelInfo => {
  const levelConfig = getLevelByXP(totalXp);
  const nextLevelConfig = getNextLevelConfig(levelConfig.level);
  
  const currentXp = getCurrentXP(totalXp, levelConfig.level);
  const remainingXp = getRemainingXP(totalXp, levelConfig.level);
  const nextLevelXp = nextLevelConfig ? nextLevelConfig.requiredXp : 0;
  
  return {
    level: levelConfig.level,
    grade: levelConfig.grade,
    gradeName: levelConfig.gradeName,
    gradeEmoji: levelConfig.gradeEmoji,
    totalXp,
    currentXp,
    nextLevelXp,
    remainingXp,
    cpcRate: levelConfig.cpcRate
  };
};

// XP 추가 및 레벨업 체크
export const addXP = (currentTotalXp: number, xpGain: XPGainSource): {
  newTotalXp: number;
  levelUpResult?: LevelUpResult;
  userLevelInfo: UserLevelInfo;
} => {
  const previousLevelInfo = calculateUserLevelInfo(currentTotalXp);
  const newTotalXp = currentTotalXp + xpGain.amount;
  const newLevelInfo = calculateUserLevelInfo(newTotalXp);
  
  let levelUpResult: LevelUpResult | undefined;
  
  // 레벨업 체크
  if (newLevelInfo.level > previousLevelInfo.level) {
    const gradeChanged = newLevelInfo.grade !== previousLevelInfo.grade;
    
    levelUpResult = {
      previousLevel: previousLevelInfo.level,
      newLevel: newLevelInfo.level,
      gradeChanged,
      previousGrade: previousLevelInfo.grade,
      newGrade: newLevelInfo.grade,
      bonusReward: gradeChanged ? getGradeUpgradeReward(newLevelInfo.grade) : 100 // 레벨업 기본 보상 100원
    };
  }
  
  return {
    newTotalXp,
    levelUpResult,
    userLevelInfo: newLevelInfo
  };
};

// 등급별 승급 보상 계산
export const getGradeUpgradeReward = (grade: string): number => {
  switch (grade) {
    case 'SILVER': return 1000;
    case 'GOLD': return 3000;
    case 'DIAMOND': return 8000;
    case 'PLATINUM': return 20000;
    default: return 100; // 기본 레벨업 보상
  }
};

// 미션 XP 계산 (등급별 차등)
export const calculateMissionXP = (grade: string): number => {
  const levelConfig = getLevelConfig(1); // 임시로 레벨 1 config 사용
  if (!levelConfig) return 40;
  
  switch (grade) {
    case 'BRONZE': return 40;
    case 'SILVER': return 52;
    case 'GOLD': return 64;
    case 'DIAMOND': return 72;
    case 'PLATINUM': return 80;
    default: return 40;
  }
};

// XP 획득 기록 생성
export const createXPGainRecord = (
  type: XPGainSource['type'],
  amount: number,
  description: string
): XPGainSource => ({
  type,
  amount,
  description,
  timestamp: new Date()
});

// 출석 연속일 계산
export const calculateStreakDays = (loginDates: Date[]): number => {
  if (loginDates.length === 0) return 0;
  
  // 날짜를 정렬 (최신 순)
  const sortedDates = loginDates
    .map(date => new Date(date.toDateString()))
    .sort((a, b) => b.getTime() - a.getTime());
  
  let streakDays = 1;
  let currentDate = sortedDates[0];
  
  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(currentDate);
    prevDate.setDate(prevDate.getDate() - 1);
    
    if (sortedDates[i].getTime() === prevDate.getTime()) {
      streakDays++;
      currentDate = sortedDates[i];
    } else {
      break;
    }
  }
  
  return streakDays;
};