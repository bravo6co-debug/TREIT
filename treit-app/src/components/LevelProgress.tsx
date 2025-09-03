import React from 'react';
import { Star, Zap, Crown, Award } from 'lucide-react';
import { Card } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { useLevelStore } from '../lib/stores/levelStore';
import { getLevelConfig, getNextLevelConfig, LEVEL_CONFIGS } from '../lib/api/levels';

interface LevelProgressProps {
  showAllLevels?: boolean;
  compact?: boolean;
}

export default function LevelProgress({ showAllLevels = false, compact = false }: LevelProgressProps) {
  const { userLevelInfo, totalXp } = useLevelStore();

  const currentLevelConfig = getLevelConfig(userLevelInfo.level);
  const nextLevelConfig = getNextLevelConfig(userLevelInfo.level);

  const getGradeIcon = (grade: string) => {
    switch (grade) {
      case 'BRONZE': return '🥉';
      case 'SILVER': return '🥈';
      case 'GOLD': return '🥇';
      case 'DIAMOND': return '💎';
      case 'PLATINUM': return '👑';
      default: return '⭐';
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'BRONZE': return 'from-amber-400 to-amber-600';
      case 'SILVER': return 'from-gray-400 to-gray-600';
      case 'GOLD': return 'from-yellow-400 to-yellow-600';
      case 'DIAMOND': return 'from-blue-400 to-purple-600';
      case 'PLATINUM': return 'from-purple-500 to-pink-600';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  const getGradeBorderColor = (grade: string) => {
    switch (grade) {
      case 'BRONZE': return 'border-amber-300';
      case 'SILVER': return 'border-gray-300';
      case 'GOLD': return 'border-yellow-300';
      case 'DIAMOND': return 'border-blue-300';
      case 'PLATINUM': return 'border-purple-300';
      default: return 'border-gray-300';
    }
  };

  const progressPercentage = nextLevelConfig 
    ? (userLevelInfo.currentXp / userLevelInfo.nextLevelXp) * 100
    : 100;

  if (compact) {
    return (
      <Card className={`p-4 bg-gradient-to-br from-white to-gray-50 border-2 ${getGradeBorderColor(userLevelInfo.grade)} shadow-lg`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <div className={`w-12 h-12 bg-gradient-to-br ${getGradeColor(userLevelInfo.grade)} rounded-full flex items-center justify-center shadow-lg border-2 border-white`}>
              <Star size={24} className="text-white" />
            </div>
            <div className="ml-3">
              <h3 className="font-bold text-gray-900">
                레벨 {userLevelInfo.level}
              </h3>
              <p className="text-sm text-gray-600">
                {userLevelInfo.gradeEmoji} {userLevelInfo.gradeName}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-gray-800">
              {userLevelInfo.currentXp}/{userLevelInfo.nextLevelXp} XP
            </div>
            <div className="text-xs text-gray-500">
              {userLevelInfo.remainingXp} XP 남음
            </div>
          </div>
        </div>
        
        <Progress value={progressPercentage} className="h-2" />
      </Card>
    );
  }

  if (showAllLevels) {
    return (
      <div>
        <div className="flex items-center mb-6">
          <Star size={24} className="text-yellow-600 mr-3" />
          <h3 className="text-lg font-semibold text-gray-900">전체 레벨 시스템</h3>
        </div>

        <div className="space-y-4">
          {/* Grade Overview */}
          <div className="grid grid-cols-5 gap-2 mb-6">
            {['BRONZE', 'SILVER', 'GOLD', 'DIAMOND', 'PLATINUM'].map((grade) => {
              const gradeConfigs = LEVEL_CONFIGS.filter(config => config.grade === grade);
              const isCurrentGrade = userLevelInfo.grade === grade;
              const isPastGrade = LEVEL_CONFIGS.findIndex(c => c.grade === grade) < 
                                 LEVEL_CONFIGS.findIndex(c => c.grade === userLevelInfo.grade);
              
              return (
                <Card 
                  key={grade}
                  className={`p-3 text-center ${
                    isCurrentGrade 
                      ? `bg-gradient-to-br ${getGradeColor(grade)} text-white border-2 border-white shadow-lg` 
                      : isPastGrade
                        ? 'bg-gray-100 border-gray-200'
                        : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="text-2xl mb-1">{getGradeIcon(grade)}</div>
                  <div className={`text-xs font-semibold ${
                    isCurrentGrade ? 'text-white' : isPastGrade ? 'text-gray-700' : 'text-gray-500'
                  }`}>
                    {gradeConfigs[0]?.gradeName}
                  </div>
                  <div className={`text-xs ${
                    isCurrentGrade ? 'text-white/80' : 'text-gray-500'
                  }`}>
                    Lv.{gradeConfigs[0]?.level}-{gradeConfigs[gradeConfigs.length - 1]?.level}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Current Level Details */}
          <Card className={`p-6 bg-gradient-to-br from-white to-gray-50 border-2 ${getGradeBorderColor(userLevelInfo.grade)} shadow-xl`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className={`w-16 h-16 bg-gradient-to-br ${getGradeColor(userLevelInfo.grade)} rounded-full flex items-center justify-center shadow-lg border-2 border-white animate-pulse`}>
                  <Star size={32} className="text-white" />
                </div>
                <div className="ml-4">
                  <h2 className="text-2xl font-bold text-gray-900">
                    레벨 {userLevelInfo.level}
                  </h2>
                  <p className="text-lg text-gray-600">
                    {userLevelInfo.gradeEmoji} {userLevelInfo.gradeName} 등급
                  </p>
                </div>
              </div>
              <div className="text-right">
                <Badge className={`bg-gradient-to-r ${getGradeColor(userLevelInfo.grade)} text-white border-0 shadow-md font-semibold`}>
                  CPC {userLevelInfo.cpcRate}원
                </Badge>
              </div>
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2 text-gray-600">
                <span>{userLevelInfo.currentXp} XP</span>
                <span>{nextLevelConfig ? `다음: ${userLevelInfo.nextLevelXp} XP` : '최고 레벨!'}</span>
              </div>
              <div className="relative">
                <Progress value={progressPercentage} className="h-4" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-semibold text-white drop-shadow">
                    {progressPercentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
            
            {nextLevelConfig ? (
              <div className="text-center">
                <p className="text-gray-600">
                  다음 레벨까지 <span className="font-semibold text-gray-900">{userLevelInfo.remainingXp} XP</span> 남음
                </p>
                {nextLevelConfig.grade !== userLevelInfo.grade && (
                  <Badge className="mt-2 bg-gradient-to-r from-purple-400 to-pink-500 text-white border-0 shadow-md">
                    <Crown size={14} className="mr-1" />
                    등급 승급 예정!
                  </Badge>
                )}
              </div>
            ) : (
              <div className="text-center">
                <Badge className="bg-gradient-to-r from-purple-500 to-pink-600 text-white border-0 shadow-lg text-lg px-4 py-2">
                  <Crown size={16} className="mr-2" />
                  최고 레벨 달성!
                </Badge>
              </div>
            )}
          </Card>

          {/* Level Rewards Preview */}
          {nextLevelConfig && (
            <Card className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200">
              <h4 className="font-semibold text-purple-900 mb-3 flex items-center">
                <Award size={18} className="mr-2" />
                레벨업 보상 미리보기
              </h4>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-white/50 rounded">
                  <span className="text-sm text-purple-800">레벨 {nextLevelConfig.level} 달성 시</span>
                  <Badge className="bg-yellow-100 text-yellow-800">+100원 보상</Badge>
                </div>
                
                {nextLevelConfig.grade !== userLevelInfo.grade && (
                  <div className="flex justify-between items-center p-2 bg-white/50 rounded">
                    <span className="text-sm text-purple-800">
                      {nextLevelConfig.gradeEmoji} {nextLevelConfig.gradeName} 등급 승급
                    </span>
                    <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                      특별 보상!
                    </Badge>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Default view
  return (
    <Card className={`p-6 bg-gradient-to-br from-white to-gray-50 border-2 ${getGradeBorderColor(userLevelInfo.grade)} shadow-xl`}>
      <div className="text-center mb-4">
        <div className={`w-20 h-20 bg-gradient-to-br ${getGradeColor(userLevelInfo.grade)} rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg border-2 border-white animate-pulse`}>
          <Star size={40} className="text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">레벨 {userLevelInfo.level}</h2>
        <p className="text-lg text-gray-600">{userLevelInfo.gradeEmoji} {userLevelInfo.gradeName} 등급</p>
      </div>
      
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2 text-gray-600">
          <span>{userLevelInfo.currentXp} XP</span>
          <span>{nextLevelConfig ? userLevelInfo.nextLevelXp : '최고'} XP</span>
        </div>
        <div className="relative">
          <Progress value={progressPercentage} className="h-3" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-semibold text-white drop-shadow">
              {progressPercentage.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
      
      <div className="text-center">
        {nextLevelConfig ? (
          <>
            <p className="text-gray-600 mb-2">
              다음 레벨까지 <span className="font-semibold text-gray-900">{userLevelInfo.remainingXp} XP</span>
            </p>
            {nextLevelConfig.grade !== userLevelInfo.grade && (
              <Badge className="bg-gradient-to-r from-purple-400 to-pink-500 text-white border-0 shadow-md">
                <Crown size={14} className="mr-1" />
                다음은 {nextLevelConfig.gradeEmoji} {nextLevelConfig.gradeName} 등급!
              </Badge>
            )}
          </>
        ) : (
          <Badge className="bg-gradient-to-r from-purple-500 to-pink-600 text-white border-0 shadow-lg text-lg px-4 py-2">
            <Crown size={16} className="mr-2" />
            최고 레벨!
          </Badge>
        )}
      </div>
    </Card>
  );
}