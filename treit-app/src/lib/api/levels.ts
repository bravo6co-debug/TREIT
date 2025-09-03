// Level system API functions
export interface LevelConfig {
  level: number;
  grade: 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND' | 'PLATINUM';
  requiredXp: number;
  cumulativeXp: number;
  xpPerMission: number;
  cpcRate: number;
  gradeName: string;
  gradeEmoji: string;
}

export const LEVEL_CONFIGS: LevelConfig[] = [
  // 브론즈 등급 (Lv.1-5)
  { level: 1, grade: 'BRONZE', requiredXp: 120, cumulativeXp: 120, xpPerMission: 40, cpcRate: 40, gradeName: '브론즈', gradeEmoji: '🥉' },
  { level: 2, grade: 'BRONZE', requiredXp: 218, cumulativeXp: 338, xpPerMission: 40, cpcRate: 40, gradeName: '브론즈', gradeEmoji: '🥉' },
  { level: 3, grade: 'BRONZE', requiredXp: 339, cumulativeXp: 677, xpPerMission: 40, cpcRate: 40, gradeName: '브론즈', gradeEmoji: '🥉' },
  { level: 4, grade: 'BRONZE', requiredXp: 478, cumulativeXp: 1155, xpPerMission: 40, cpcRate: 40, gradeName: '브론즈', gradeEmoji: '🥉' },
  { level: 5, grade: 'BRONZE', requiredXp: 631, cumulativeXp: 1786, xpPerMission: 40, cpcRate: 40, gradeName: '브론즈', gradeEmoji: '🥉' },
  
  // 실버 등급 (Lv.6-10)
  { level: 6, grade: 'SILVER', requiredXp: 797, cumulativeXp: 2583, xpPerMission: 52, cpcRate: 52, gradeName: '실버', gradeEmoji: '🥈' },
  { level: 7, grade: 'SILVER', requiredXp: 975, cumulativeXp: 3558, xpPerMission: 52, cpcRate: 52, gradeName: '실버', gradeEmoji: '🥈' },
  { level: 8, grade: 'SILVER', requiredXp: 1163, cumulativeXp: 4721, xpPerMission: 52, cpcRate: 52, gradeName: '실버', gradeEmoji: '🥈' },
  { level: 9, grade: 'SILVER', requiredXp: 1360, cumulativeXp: 6081, xpPerMission: 52, cpcRate: 52, gradeName: '실버', gradeEmoji: '🥈' },
  { level: 10, grade: 'SILVER', requiredXp: 1567, cumulativeXp: 7648, xpPerMission: 52, cpcRate: 52, gradeName: '실버', gradeEmoji: '🥈' },
  
  // 골드 등급 (Lv.11-20)
  { level: 11, grade: 'GOLD', requiredXp: 1782, cumulativeXp: 9430, xpPerMission: 64, cpcRate: 64, gradeName: '골드', gradeEmoji: '🥇' },
  { level: 12, grade: 'GOLD', requiredXp: 2005, cumulativeXp: 11435, xpPerMission: 64, cpcRate: 64, gradeName: '골드', gradeEmoji: '🥇' },
  { level: 13, grade: 'GOLD', requiredXp: 2236, cumulativeXp: 13671, xpPerMission: 64, cpcRate: 64, gradeName: '골드', gradeEmoji: '🥇' },
  { level: 14, grade: 'GOLD', requiredXp: 2474, cumulativeXp: 16145, xpPerMission: 64, cpcRate: 64, gradeName: '골드', gradeEmoji: '🥇' },
  { level: 15, grade: 'GOLD', requiredXp: 2719, cumulativeXp: 18864, xpPerMission: 64, cpcRate: 64, gradeName: '골드', gradeEmoji: '🥇' },
  { level: 16, grade: 'GOLD', requiredXp: 2970, cumulativeXp: 21834, xpPerMission: 64, cpcRate: 64, gradeName: '골드', gradeEmoji: '🥇' },
  { level: 17, grade: 'GOLD', requiredXp: 3228, cumulativeXp: 25062, xpPerMission: 64, cpcRate: 64, gradeName: '골드', gradeEmoji: '🥇' },
  { level: 18, grade: 'GOLD', requiredXp: 3492, cumulativeXp: 28554, xpPerMission: 64, cpcRate: 64, gradeName: '골드', gradeEmoji: '🥇' },
  { level: 19, grade: 'GOLD', requiredXp: 3762, cumulativeXp: 32316, xpPerMission: 64, cpcRate: 64, gradeName: '골드', gradeEmoji: '🥇' },
  { level: 20, grade: 'GOLD', requiredXp: 4038, cumulativeXp: 36354, xpPerMission: 64, cpcRate: 64, gradeName: '골드', gradeEmoji: '🥇' },
  
  // 다이아 등급 (Lv.21-35)
  { level: 21, grade: 'DIAMOND', requiredXp: 4319, cumulativeXp: 40673, xpPerMission: 72, cpcRate: 72, gradeName: '다이아', gradeEmoji: '💎' },
  { level: 22, grade: 'DIAMOND', requiredXp: 4605, cumulativeXp: 45278, xpPerMission: 72, cpcRate: 72, gradeName: '다이아', gradeEmoji: '💎' },
  { level: 23, grade: 'DIAMOND', requiredXp: 4896, cumulativeXp: 50174, xpPerMission: 72, cpcRate: 72, gradeName: '다이아', gradeEmoji: '💎' },
  { level: 24, grade: 'DIAMOND', requiredXp: 5192, cumulativeXp: 55366, xpPerMission: 72, cpcRate: 72, gradeName: '다이아', gradeEmoji: '💎' },
  { level: 25, grade: 'DIAMOND', requiredXp: 5492, cumulativeXp: 60858, xpPerMission: 72, cpcRate: 72, gradeName: '다이아', gradeEmoji: '💎' },
  { level: 26, grade: 'DIAMOND', requiredXp: 5796, cumulativeXp: 66654, xpPerMission: 72, cpcRate: 72, gradeName: '다이아', gradeEmoji: '💎' },
  { level: 27, grade: 'DIAMOND', requiredXp: 6105, cumulativeXp: 72759, xpPerMission: 72, cpcRate: 72, gradeName: '다이아', gradeEmoji: '💎' },
  { level: 28, grade: 'DIAMOND', requiredXp: 6417, cumulativeXp: 79176, xpPerMission: 72, cpcRate: 72, gradeName: '다이아', gradeEmoji: '💎' },
  { level: 29, grade: 'DIAMOND', requiredXp: 6734, cumulativeXp: 85910, xpPerMission: 72, cpcRate: 72, gradeName: '다이아', gradeEmoji: '💎' },
  { level: 30, grade: 'DIAMOND', requiredXp: 7053, cumulativeXp: 92963, xpPerMission: 72, cpcRate: 72, gradeName: '다이아', gradeEmoji: '💎' },
  { level: 31, grade: 'DIAMOND', requiredXp: 7377, cumulativeXp: 100340, xpPerMission: 72, cpcRate: 72, gradeName: '다이아', gradeEmoji: '💎' },
  { level: 32, grade: 'DIAMOND', requiredXp: 7703, cumulativeXp: 108043, xpPerMission: 72, cpcRate: 72, gradeName: '다이아', gradeEmoji: '💎' },
  { level: 33, grade: 'DIAMOND', requiredXp: 8033, cumulativeXp: 116076, xpPerMission: 72, cpcRate: 72, gradeName: '다이아', gradeEmoji: '💎' },
  { level: 34, grade: 'DIAMOND', requiredXp: 8366, cumulativeXp: 124442, xpPerMission: 72, cpcRate: 72, gradeName: '다이아', gradeEmoji: '💎' },
  { level: 35, grade: 'DIAMOND', requiredXp: 8702, cumulativeXp: 133144, xpPerMission: 72, cpcRate: 72, gradeName: '다이아', gradeEmoji: '💎' },
  
  // 플래티넘 등급 (Lv.36-50)
  { level: 36, grade: 'PLATINUM', requiredXp: 9040, cumulativeXp: 142184, xpPerMission: 80, cpcRate: 80, gradeName: '플래티넘', gradeEmoji: '👑' },
  { level: 37, grade: 'PLATINUM', requiredXp: 9382, cumulativeXp: 151566, xpPerMission: 80, cpcRate: 80, gradeName: '플래티넘', gradeEmoji: '👑' },
  { level: 38, grade: 'PLATINUM', requiredXp: 9726, cumulativeXp: 161292, xpPerMission: 80, cpcRate: 80, gradeName: '플래티넘', gradeEmoji: '👑' },
  { level: 39, grade: 'PLATINUM', requiredXp: 10073, cumulativeXp: 171365, xpPerMission: 80, cpcRate: 80, gradeName: '플래티넘', gradeEmoji: '👑' },
  { level: 40, grade: 'PLATINUM', requiredXp: 10423, cumulativeXp: 181788, xpPerMission: 80, cpcRate: 80, gradeName: '플래티넘', gradeEmoji: '👑' },
  { level: 41, grade: 'PLATINUM', requiredXp: 10775, cumulativeXp: 192563, xpPerMission: 80, cpcRate: 80, gradeName: '플래티넘', gradeEmoji: '👑' },
  { level: 42, grade: 'PLATINUM', requiredXp: 11130, cumulativeXp: 203693, xpPerMission: 80, cpcRate: 80, gradeName: '플래티넘', gradeEmoji: '👑' },
  { level: 43, grade: 'PLATINUM', requiredXp: 11487, cumulativeXp: 215180, xpPerMission: 80, cpcRate: 80, gradeName: '플래티넘', gradeEmoji: '👑' },
  { level: 44, grade: 'PLATINUM', requiredXp: 11847, cumulativeXp: 227027, xpPerMission: 80, cpcRate: 80, gradeName: '플래티넘', gradeEmoji: '👑' },
  { level: 45, grade: 'PLATINUM', requiredXp: 12209, cumulativeXp: 239236, xpPerMission: 80, cpcRate: 80, gradeName: '플래티넘', gradeEmoji: '👑' },
  { level: 46, grade: 'PLATINUM', requiredXp: 12573, cumulativeXp: 251809, xpPerMission: 80, cpcRate: 80, gradeName: '플래티넘', gradeEmoji: '👑' },
  { level: 47, grade: 'PLATINUM', requiredXp: 12939, cumulativeXp: 264748, xpPerMission: 80, cpcRate: 80, gradeName: '플래티넘', gradeEmoji: '👑' },
  { level: 48, grade: 'PLATINUM', requiredXp: 13308, cumulativeXp: 278056, xpPerMission: 80, cpcRate: 80, gradeName: '플래티넘', gradeEmoji: '👑' },
  { level: 49, grade: 'PLATINUM', requiredXp: 14005, cumulativeXp: 294061, xpPerMission: 80, cpcRate: 80, gradeName: '플래티넘', gradeEmoji: '👑' },
  { level: 50, grade: 'PLATINUM', requiredXp: 0, cumulativeXp: 294061, xpPerMission: 80, cpcRate: 80, gradeName: '플래티넘', gradeEmoji: '👑' },
];

export const getLevelConfig = (level: number): LevelConfig | null => {
  return LEVEL_CONFIGS.find(config => config.level === level) || null;
};

export const getLevelByXP = (totalXp: number): LevelConfig => {
  for (let i = LEVEL_CONFIGS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVEL_CONFIGS[i].cumulativeXp) {
      return LEVEL_CONFIGS[i];
    }
  }
  return LEVEL_CONFIGS[0]; // 기본값은 레벨 1
};

export const getNextLevelConfig = (currentLevel: number): LevelConfig | null => {
  return LEVEL_CONFIGS.find(config => config.level === currentLevel + 1) || null;
};

export const getRemainingXP = (totalXp: number, level: number): number => {
  const nextLevel = getNextLevelConfig(level);
  if (!nextLevel) return 0;
  return nextLevel.cumulativeXp - totalXp;
};

export const getCurrentXP = (totalXp: number, level: number): number => {
  const currentLevelConfig = getLevelConfig(level);
  if (!currentLevelConfig || level === 1) return totalXp;
  
  const previousLevelConfig = getLevelConfig(level - 1);
  if (!previousLevelConfig) return totalXp;
  
  return totalXp - previousLevelConfig.cumulativeXp;
};

export const getGradeUpgradeReward = (grade: string): number => {
  switch (grade) {
    case 'SILVER': return 1000;
    case 'GOLD': return 3000;
    case 'DIAMOND': return 8000;
    case 'PLATINUM': return 20000;
    default: return 0;
  }
};

export const getLevelUpReward = (): number => {
  return 100; // 모든 레벨업 시 100원 기본 보상
};