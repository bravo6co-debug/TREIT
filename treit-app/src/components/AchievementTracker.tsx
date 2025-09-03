import React, { useState } from 'react';
import { Trophy, Star, Calendar, DollarSign, Users, Target, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Button } from './ui/button';
import { useLevelStore } from '../lib/stores/levelStore';
import { calculateProgress } from '../lib/api/achievements';

interface AchievementTrackerProps {
  showCompletedOnly?: boolean;
  compact?: boolean;
}

export default function AchievementTracker({ showCompletedOnly = false, compact = false }: AchievementTrackerProps) {
  const { achievements, userStats, getPendingAchievements, getEarnedAchievements } = useLevelStore();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const displayAchievements = showCompletedOnly 
    ? getEarnedAchievements()
    : showCompleted 
      ? achievements 
      : getPendingAchievements();

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'PROJECTS': return <Target size={20} className="text-blue-600" />;
      case 'ACTIVITY': return <Calendar size={20} className="text-green-600" />;
      case 'EARNINGS': return <DollarSign size={20} className="text-yellow-600" />;
      case 'SOCIAL': return <Users size={20} className="text-purple-600" />;
      default: return <Star size={20} className="text-gray-600" />;
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'PROJECTS': return '프로젝트';
      case 'ACTIVITY': return '활동';
      case 'EARNINGS': return '수익';
      case 'SOCIAL': return '소셜';
      default: return '기타';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'PROJECTS': return 'blue';
      case 'ACTIVITY': return 'green';
      case 'EARNINGS': return 'yellow';
      case 'SOCIAL': return 'purple';
      default: return 'gray';
    }
  };

  const groupedAchievements = displayAchievements.reduce((acc, achievement) => {
    if (!acc[achievement.category]) {
      acc[achievement.category] = [];
    }
    acc[achievement.category].push(achievement);
    return acc;
  }, {} as Record<string, typeof achievements>);

  const getAchievementStats = () => {
    const total = achievements.length;
    const earned = getEarnedAchievements().length;
    const totalXp = getEarnedAchievements().reduce((sum, a) => sum + a.xpReward, 0);
    
    return {
      total,
      earned,
      pending: total - earned,
      completionRate: (earned / total) * 100,
      totalXpEarned: totalXp
    };
  };

  const stats = getAchievementStats();

  if (compact) {
    return (
      <Card className="p-4 bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <Trophy size={20} className="text-amber-600 mr-2" />
            <span className="font-semibold text-amber-900">업적</span>
          </div>
          <Badge className="bg-amber-100 text-amber-800">
            {stats.earned}/{stats.total}
          </Badge>
        </div>
        
        <Progress value={stats.completionRate} className="mb-2" />
        <p className="text-xs text-amber-700">
          {stats.totalXpEarned} XP 획득 • {stats.completionRate.toFixed(1)}% 달성
        </p>
      </Card>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Trophy size={24} className="text-amber-600 mr-3" />
          <h3 className="text-lg font-semibold text-amber-900">업적</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCompleted(!showCompleted)}
          className="text-amber-700 border-amber-300 hover:bg-amber-50"
        >
          {showCompleted ? '진행중만' : '전체보기'}
        </Button>
      </div>

      {/* Achievement Statistics */}
      <Card className="p-4 mb-4 bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200">
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div className="text-center">
            <div className="text-xl font-bold text-amber-900">{stats.earned}</div>
            <div className="text-xs text-amber-700">달성한 업적</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-amber-900">{stats.totalXpEarned}</div>
            <div className="text-xs text-amber-700">획득한 XP</div>
          </div>
        </div>
        
        <div className="mb-2">
          <div className="flex justify-between text-xs text-amber-700 mb-1">
            <span>전체 진행도</span>
            <span>{stats.completionRate.toFixed(1)}%</span>
          </div>
          <Progress value={stats.completionRate} className="h-2" />
        </div>
      </Card>

      {/* Achievement Categories */}
      <div className="space-y-3">
        {Object.entries(groupedAchievements).map(([category, categoryAchievements]) => {
          const isExpanded = expandedCategory === category;
          const categoryColor = getCategoryColor(category);
          
          return (
            <Card key={category} className="overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedCategory(isExpanded ? null : category)}
              >
                <div className="flex items-center">
                  {getCategoryIcon(category)}
                  <span className="font-medium text-gray-900 ml-2">
                    {getCategoryName(category)}
                  </span>
                  <Badge variant="secondary" className="ml-2">
                    {categoryAchievements.length}
                  </Badge>
                </div>
                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-3">
                  {categoryAchievements.map((achievement) => {
                    const progress = calculateProgress(achievement);
                    
                    return (
                      <div
                        key={achievement.id}
                        className={`flex items-start p-3 rounded-lg border ${
                          achievement.earned 
                            ? `bg-${categoryColor}-50 border-${categoryColor}-200` 
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                          achievement.earned 
                            ? `bg-${categoryColor}-500 text-white` 
                            : 'bg-gray-300 text-gray-600'
                        }`}>
                          <span className="text-lg">{achievement.icon}</span>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-1">
                            <h4 className={`font-semibold text-sm ${
                              achievement.earned ? `text-${categoryColor}-900` : 'text-gray-700'
                            }`}>
                              {achievement.title}
                            </h4>
                            <Badge className={
                              achievement.earned 
                                ? `bg-${categoryColor}-100 text-${categoryColor}-800`
                                : 'bg-gray-200 text-gray-700'
                            }>
                              {achievement.earned ? '완료' : `+${achievement.xpReward} XP`}
                            </Badge>
                          </div>
                          
                          <p className={`text-xs mb-2 ${
                            achievement.earned ? `text-${categoryColor}-700` : 'text-gray-600'
                          }`}>
                            {achievement.description}
                          </p>
                          
                          {!achievement.earned && (
                            <div>
                              <div className="flex justify-between text-xs text-gray-600 mb-1">
                                <span>진행도</span>
                                <span>
                                  {achievement.condition.current || 0} / {achievement.condition.target}
                                </span>
                              </div>
                              <Progress value={progress} className="h-1.5" />
                            </div>
                          )}
                          
                          {achievement.earned && achievement.earnedAt && (
                            <div className={`text-xs text-${categoryColor}-600 mt-1`}>
                              달성일: {new Date(achievement.earnedAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* No achievements message */}
      {displayAchievements.length === 0 && (
        <Card className="p-8 text-center">
          <Trophy size={48} className="text-gray-300 mx-auto mb-3" />
          <h4 className="text-lg font-semibold text-gray-600 mb-2">
            {showCompleted ? '아직 달성한 업적이 없습니다' : '모든 업적을 달성했습니다!'}
          </h4>
          <p className="text-gray-500">
            {showCompleted 
              ? '활동을 통해 다양한 업적을 달성해보세요'
              : '정말 대단합니다! 새로운 업적이 추가될 때까지 기다려주세요'
            }
          </p>
        </Card>
      )}
    </div>
  );
}