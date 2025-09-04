import React, { useState } from 'react';
import { Star, Target, CheckCircle, Clock, Gift, Tabs, Trophy } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { useLevelStore } from '../lib/stores/levelStore';
import { createXPGainRecord } from '../lib/api/xp';
import LevelProgress from './LevelProgress';
import XPBoosterGames from './XPBoosterGames';
import AchievementTracker from './AchievementTracker';
import MyRankingCard from './MyRankingCard';
import RankingScreen from './RankingScreen';
import { toast } from 'sonner';

export default function LevelUpScreen() {
  const { 
    userLevelInfo,
    dailyMissions,
    completeDailyMission,
    getCompletedDailyMissions,
    addXpToUser
  } = useLevelStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'missions' | 'games' | 'achievements'>('overview');
  const [showRankingScreen, setShowRankingScreen] = useState(false);

  const handleDailyMissionComplete = (missionId: string) => {
    const success = completeDailyMission(missionId);
    
    if (success) {
      const mission = dailyMissions.find(m => m.id === missionId);
      if (mission) {
        toast.success(`데일리 미션 완료! +${mission.xpReward} XP 획득!`, {
          duration: 3000
        });
      }
    } else {
      toast.error('미션을 완료할 수 없습니다. 조건을 확인해주세요.');
    }
  };

  const handleMissionProgress = (missionId: string, progress: number) => {
    // This would typically be called from mission interaction
    // For demo purposes, we'll simulate progress updates
  };

  const renderTabButton = (tabId: typeof activeTab, label: string, icon: React.ReactNode) => (
    <Button
      variant={activeTab === tabId ? 'default' : 'ghost'}
      size="sm"
      onClick={() => setActiveTab(tabId)}
      className={`flex-1 ${
        activeTab === tabId 
          ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black shadow-lg' 
          : 'text-gray-600 hover:text-gray-900'
      }`}
    >
      <span className="mr-2">{icon}</span>
      {label}
    </Button>
  );

  // 랭킹 화면 표시 중이면 랭킹 화면 렌더링
  if (showRankingScreen) {
    return (
      <RankingScreen 
        onBack={() => setShowRankingScreen(false)} 
      />
    );
  }

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Level Progress */}
      <LevelProgress />

      {/* Ranking Card - 새로 추가 */}
      <MyRankingCard 
        onViewFullRanking={() => setShowRankingScreen(true)}
        compact={true}
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-900 mb-1">
              {getCompletedDailyMissions()}/4
            </div>
            <div className="text-sm text-blue-700">오늘의 미션</div>
          </div>
        </Card>
        
        <Card className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-900 mb-1">
              {userLevelInfo.cpcRate}원
            </div>
            <div className="text-sm text-purple-700">미션당 CPC</div>
          </div>
        </Card>
      </div>

      {/* Level Rewards Preview */}
      <Card className="p-6 bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200">
        <h3 className="flex items-center font-semibold text-amber-900 mb-4">
          <Gift size={18} className="mr-2" />
          다음 레벨 보상
        </h3>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-white/50 rounded-lg">
            <span className="text-amber-800">레벨 {userLevelInfo.level + 1} 달성</span>
            <Badge className="bg-green-100 text-green-800">+100원 보상</Badge>
          </div>
          
          {/* Next grade preview if applicable */}
          {userLevelInfo.level === 5 && (
            <div className="flex justify-between items-center p-3 bg-gradient-to-r from-gray-100 to-slate-100 rounded-lg border">
              <span className="text-gray-800">🥈 실버 등급 승급</span>
              <Badge className="bg-gray-500 text-white">+1,000원 특별보상</Badge>
            </div>
          )}
          {userLevelInfo.level === 10 && (
            <div className="flex justify-between items-center p-3 bg-gradient-to-r from-yellow-100 to-amber-100 rounded-lg border">
              <span className="text-yellow-800">🥇 골드 등급 승급</span>
              <Badge className="bg-yellow-500 text-white">+3,000원 특별보상</Badge>
            </div>
          )}
          {userLevelInfo.level === 20 && (
            <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg border">
              <span className="text-blue-800">💎 다이아 등급 승급</span>
              <Badge className="bg-blue-500 text-white">+8,000원 특별보상</Badge>
            </div>
          )}
          {userLevelInfo.level === 35 && (
            <div className="flex justify-between items-center p-3 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg border">
              <span className="text-purple-800">👑 플래티넘 등급 승급</span>
              <Badge className="bg-purple-500 text-white">+20,000원 특별보상</Badge>
            </div>
          )}
        </div>
      </Card>
    </div>
  );

  const renderMissionsTab = () => (
    <div className="space-y-4">
      <div className="flex items-center mb-4">
        <Target size={24} className="text-blue-600 mr-3" />
        <h3 className="text-lg font-semibold text-gray-900">데일리 미션</h3>
        <Badge variant="secondary" className="ml-auto">
          {getCompletedDailyMissions()}/4 완료
        </Badge>
      </div>
      
      <div className="space-y-3">
        {dailyMissions.map((mission) => (
          <Card 
            key={mission.id} 
            className={`p-4 transition-all ${
              mission.completed 
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' 
                : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                  mission.completed 
                    ? 'bg-green-500 text-white' 
                    : 'bg-blue-100 text-blue-600 border-2 border-blue-300'
                }`}>
                  {mission.completed ? <CheckCircle size={20} /> : <Target size={20} />}
                </div>
                <div className="flex-1">
                  <h4 className={`font-semibold ${mission.completed ? 'text-green-900' : 'text-gray-900'}`}>
                    {mission.title}
                  </h4>
                  <p className={`text-sm ${mission.completed ? 'text-green-700' : 'text-gray-600'}`}>
                    {mission.description}
                  </p>
                </div>
              </div>
              <Badge className={mission.completed ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                {mission.completed ? '완료!' : `+${mission.xpReward} XP`}
              </Badge>
            </div>
            
            {/* Progress bar */}
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>진행도</span>
                <span>{mission.progress}/{mission.target}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    mission.completed 
                      ? 'bg-gradient-to-r from-green-400 to-emerald-500' 
                      : 'bg-gradient-to-r from-blue-400 to-blue-600'
                  }`}
                  style={{ width: `${Math.min((mission.progress / mission.target) * 100, 100)}%` }}
                />
              </div>
            </div>
            
            {/* Action button */}
            {!mission.completed && mission.progress >= mission.target && (
              <Button 
                onClick={() => handleDailyMissionComplete(mission.id)}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
              >
                보상 받기
              </Button>
            )}
            
            {/* Demo buttons for testing */}
            {!mission.completed && mission.progress < mission.target && (
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleMissionProgress(mission.id, Math.min(mission.progress + 1, mission.target))}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  진행 +1
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleMissionProgress(mission.id, mission.target)}
                  className="text-green-600 border-green-200 hover:bg-green-50"
                >
                  완료하기
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );

  const renderGamesTab = () => (
    <XPBoosterGames 
      onGameComplete={(gameId, xpEarned) => {
      }}
    />
  );

  const renderAchievementsTab = () => (
    <AchievementTracker />
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white p-6 rounded-b-3xl shadow-xl">
        <h1 className="text-xl font-semibold text-center mb-2">레벨링 스퀘어</h1>
        <p className="text-center text-indigo-200 text-sm">경험치를 획득하고 레벨업하여 더 높은 보상을 받아보세요</p>
      </div>

      <div className="p-4 -mt-4">
        {/* Tab Navigation */}
        <Card className="p-2 mb-6 bg-white shadow-lg">
          <div className="grid grid-cols-4 gap-1">
            {renderTabButton('overview', '개요', <Star size={16} />)}
            {renderTabButton('missions', '미션', <Target size={16} />)}
            {renderTabButton('games', '게임', <Gift size={16} />)}
            {renderTabButton('achievements', '업적', <CheckCircle size={16} />)}
          </div>
        </Card>

        {/* Tab Content */}
        <div className="mb-20">
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'missions' && renderMissionsTab()}
          {activeTab === 'games' && renderGamesTab()}
          {activeTab === 'achievements' && renderAchievementsTab()}
        </div>
      </div>
    </div>
  );
}