import React, { memo } from 'react';
import { User, Calendar } from 'lucide-react';
import { Card } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';

interface UserStatsCardProps {
  userLevelInfo: {
    level: number;
    grade: string;
    gradeName: string;
    gradeEmoji: string;
    cpcRate: number;
    totalXp: number;
    currentXp: number;
    nextLevelXp: number;
    remainingXp: number;
  };
  userStats: {
    totalEarnings: number;
    totalProjects: number;
  };
  dailyBonus: {
    streakDays: number;
  };
  levelUpAnimation: boolean;
  getNextLevelProgress: () => number;
}

const UserStatsCard = memo(({
  userLevelInfo,
  userStats,
  dailyBonus,
  levelUpAnimation,
  getNextLevelProgress
}: UserStatsCardProps) => {
  return (
    <div className="px-4 pt-4 mb-6">
      <Card className={`p-6 bg-gradient-to-br from-white to-slate-50 shadow-xl border-2 ${
        levelUpAnimation ? 'animate-pulse border-yellow-400 shadow-yellow-400/50' : 'border-gray-200'
      }`}>
        <div className="flex items-center mb-4">
          <div className={`w-16 h-16 bg-gradient-to-br ${
            userLevelInfo.grade === 'BRONZE' ? 'from-amber-400 to-amber-600' :
            userLevelInfo.grade === 'SILVER' ? 'from-gray-400 to-gray-600' :
            userLevelInfo.grade === 'GOLD' ? 'from-yellow-400 to-yellow-600' :
            userLevelInfo.grade === 'DIAMOND' ? 'from-blue-400 to-purple-600' :
            'from-purple-500 to-pink-600'
          } rounded-full flex items-center justify-center mr-4 shadow-lg border-2 ${
            userLevelInfo.grade === 'BRONZE' ? 'border-amber-300' :
            userLevelInfo.grade === 'SILVER' ? 'border-gray-300' :
            userLevelInfo.grade === 'GOLD' ? 'border-yellow-300' :
            userLevelInfo.grade === 'DIAMOND' ? 'border-blue-300' :
            'border-purple-300'
          } ${levelUpAnimation ? 'animate-bounce' : ''}`}>
            <User size={32} className="text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xl text-heading text-slate-800">철수</h2>
              <div className="flex items-center">
                <Calendar size={16} className="text-gray-500 mr-1" />
                <span className="text-sm text-gray-600">{dailyBonus.streakDays}일 연속</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={`bg-gradient-to-r ${
                userLevelInfo.grade === 'BRONZE' ? 'from-amber-400 to-amber-600' :
                userLevelInfo.grade === 'SILVER' ? 'from-gray-400 to-gray-600' :
                userLevelInfo.grade === 'GOLD' ? 'from-yellow-400 to-yellow-600' :
                userLevelInfo.grade === 'DIAMOND' ? 'from-blue-400 to-purple-600' :
                'from-purple-500 to-pink-600'
              } text-white border-0 shadow-md font-semibold`}>
                {userLevelInfo.gradeEmoji} Lv.{userLevelInfo.level} {userLevelInfo.gradeName}
              </Badge>
              <Badge className="bg-green-100 text-green-800 border-green-200">
                CPC {userLevelInfo.cpcRate}원
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
            <div className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              ₩{userStats.totalEarnings.toLocaleString()}
            </div>
            <div className="text-slate-600 text-sm">총 수익</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
            <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {userLevelInfo.totalXp.toLocaleString()}
            </div>
            <div className="text-slate-600 text-sm">총 XP</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200">
            <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {userStats.totalProjects}
            </div>
            <div className="text-slate-600 text-sm">완료 프로젝트</div>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2 text-gray-600">
            <span>{userLevelInfo.currentXp} XP</span>
            <span>{userLevelInfo.nextLevelXp || '최고'} XP</span>
          </div>
          <div className="relative">
            <Progress value={getNextLevelProgress()} className="h-3" />
            {levelUpAnimation && (
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-yellow-600 opacity-50 animate-ping rounded-full"></div>
            )}
          </div>
          <div className="text-center text-gray-600 text-sm mt-2">
            {userLevelInfo.nextLevelXp > 0 
              ? `다음 레벨까지 ${userLevelInfo.remainingXp} XP`
              : '최고 레벨 달성!'
            }
          </div>
        </div>
      </Card>
    </div>
  );
});

UserStatsCard.displayName = 'UserStatsCard';

export default UserStatsCard;