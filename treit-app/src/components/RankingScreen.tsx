import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Progress } from './ui/progress';
import { 
  Trophy, 
  Crown, 
  Medal, 
  TrendingUp, 
  Clock, 
  ChevronLeft,
  Zap,
  Star,
  Award,
  Users,
  Target,
  Sparkles
} from 'lucide-react';
import {
  fetchWeeklyRankings,
  fetchMyRanking,
  fetchMyMileage,
  fetchLastWeekRanking,
  getCurrentWeekInfo,
  getRankEmoji,
  getRankChange,
  RANKING_REWARDS,
  type RankingUser,
  type MyRanking,
  type WeekInfo,
  type MileageInfo
} from '../lib/api/rankings';
import { useLevelStore } from '../lib/stores/levelStore';

interface RankingScreenProps {
  onBack: () => void;
}

export default function RankingScreen({ onBack }: RankingScreenProps) {
  const { userLevelInfo } = useLevelStore();
  const [rankings, setRankings] = useState<RankingUser[]>([]);
  const [myRanking, setMyRanking] = useState<MyRanking | null>(null);
  const [myMileage, setMyMileage] = useState<MileageInfo | null>(null);
  const [lastWeekRank, setLastWeekRank] = useState<number | null>(null);
  const [weekInfo, setWeekInfo] = useState<WeekInfo>(getCurrentWeekInfo());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('current');
  
  // 임시 유저 ID (실제로는 auth에서 가져와야 함)
  const userId = 'current-user-id';
  
  useEffect(() => {
    loadRankingData();
    
    // 1분마다 랭킹 업데이트
    const interval = setInterval(loadRankingData, 60000);
    
    // 주 정보 업데이트 (1시간마다)
    const weekInterval = setInterval(() => {
      setWeekInfo(getCurrentWeekInfo());
    }, 3600000);
    
    return () => {
      clearInterval(interval);
      clearInterval(weekInterval);
    };
  }, []);
  
  const loadRankingData = async () => {
    setLoading(true);
    try {
      const [rankingData, myRankData, mileageData, lastRankData] = await Promise.all([
        fetchWeeklyRankings(),
        fetchMyRanking(userId),
        fetchMyMileage(userId),
        fetchLastWeekRanking(userId)
      ]);
      
      setRankings(rankingData);
      setMyRanking(myRankData);
      setMyMileage(mileageData);
      setLastWeekRank(lastRankData);
    } catch (error) {
      console.error('Failed to load ranking data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const formatNumber = (num: number): string => {
    return num.toLocaleString('ko-KR');
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-yellow-900/90 to-yellow-600/90 backdrop-blur-lg border-b border-yellow-500/20">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onBack}
              className="text-white hover:bg-white/10"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-400" />
              <h1 className="text-xl font-bold text-white">주간 XP 랭킹</h1>
            </div>
          </div>
          <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/50">
            {weekInfo.days_remaining}일 {weekInfo.hours_remaining}시간 남음
          </Badge>
        </div>
      </div>
      
      {/* My Ranking Card */}
      {myRanking && (
        <div className="px-4 mt-4">
          <Card className="bg-gradient-to-br from-yellow-600/20 to-orange-600/20 border-yellow-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12 border-2 border-yellow-500">
                    <AvatarFallback className="bg-yellow-600 text-white font-bold">
                      {myRanking.rank <= 100 ? myRanking.rank : '100+'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">내 순위</span>
                      {getRankEmoji(myRanking.rank)}
                      {myRanking.is_new_user && (
                        <Badge className="bg-green-500/20 text-green-300 text-xs">
                          <Zap className="w-3 h-3 mr-1" />
                          {myRanking.boost_multiplier}x 부스트
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="font-bold text-lg text-yellow-400">
                        #{myRanking.rank}
                      </span>
                      {lastWeekRank && (
                        <Badge variant="outline" className="text-xs">
                          {getRankChange(myRanking.rank, lastWeekRank)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-yellow-400">
                    {formatNumber(myRanking.total_xp)} XP
                  </div>
                  <div className="text-xs text-gray-400">
                    상위 {100 - myRanking.percentile}%
                  </div>
                </div>
              </div>
              
              {/* 예상 보상 */}
              {myRanking.rank <= 10 && (
                <div className="mt-3 p-2 bg-yellow-500/10 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-yellow-300">예상 보상</span>
                    <span className="font-bold text-yellow-400">
                      {formatNumber(RANKING_REWARDS[myRanking.rank - 1]?.reward || 0)} 마일리지
                    </span>
                  </div>
                </div>
              )}
              
              {/* 다음 순위까지 */}
              {myRanking.rank > 1 && rankings.length > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-400">
                      {myRanking.rank - 1}위까지
                    </span>
                    <span className="text-gray-300">
                      {formatNumber(
                        (rankings[myRanking.rank - 2]?.total_xp || 0) - myRanking.total_xp
                      )} XP 필요
                    </span>
                  </div>
                  <Progress 
                    value={
                      (myRanking.total_xp / (rankings[myRanking.rank - 2]?.total_xp || 1)) * 100
                    }
                    className="h-2"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Mileage Info */}
      {myMileage && (
        <div className="px-4 mt-4">
          <Card className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-purple-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-purple-400" />
                  <span className="text-sm text-gray-300">내 마일리지</span>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-purple-400">
                    {formatNumber(myMileage.balance)} M
                  </div>
                  <div className="text-xs text-gray-400">
                    총 획득: {formatNumber(myMileage.total_earned)} M
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Tabs */}
      <div className="px-4 mt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full bg-gray-800/50 border border-gray-700">
            <TabsTrigger value="current" className="flex-1">
              <Trophy className="w-4 h-4 mr-2" />
              실시간 순위
            </TabsTrigger>
            <TabsTrigger value="rewards" className="flex-1">
              <Star className="w-4 h-4 mr-2" />
              보상 안내
            </TabsTrigger>
          </TabsList>
          
          {/* Current Rankings Tab */}
          <TabsContent value="current" className="mt-4 space-y-3">
            {/* Top 3 */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {rankings.slice(0, 3).map((user, index) => (
                <Card 
                  key={user.user_id}
                  className={`border-2 ${
                    index === 0 ? 'border-yellow-500 bg-yellow-500/10' :
                    index === 1 ? 'border-gray-400 bg-gray-400/10' :
                    'border-orange-600 bg-orange-600/10'
                  }`}
                >
                  <CardContent className="p-3 text-center">
                    <div className="text-3xl mb-1">{getRankEmoji(index + 1)}</div>
                    <div className="font-bold text-white text-sm truncate">
                      {user.username || `유저${user.user_id.slice(0, 4)}`}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Lv.{user.level}
                    </div>
                    <div className="font-bold text-yellow-400 mt-2">
                      {formatNumber(user.total_xp)}
                    </div>
                    <div className="text-xs text-gray-500">XP</div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {/* Rankings List */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  TOP 100 랭킹
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[400px]">
                  <div className="space-y-1 p-4">
                    {rankings.slice(3).map((user) => (
                      <div 
                        key={user.user_id}
                        className={`flex items-center justify-between p-3 rounded-lg bg-gray-900/50 border border-gray-700 
                          ${user.user_id === userId ? 'border-yellow-500 bg-yellow-500/5' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 text-center">
                            <span className="font-bold text-gray-400">
                              #{user.rank}
                            </span>
                          </div>
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs">
                              {user.username?.[0] || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-white">
                                {user.username || `유저${user.user_id.slice(0, 6)}`}
                              </span>
                              {user.is_new_user && (
                                <Badge className="bg-green-500/20 text-green-300 text-xs">
                                  <Sparkles className="w-3 h-3" />
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>Lv.{user.level}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-yellow-400">
                            {formatNumber(user.total_xp)}
                          </div>
                          <div className="text-xs text-gray-500">XP</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Rewards Tab */}
          <TabsContent value="rewards" className="mt-4">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  주간 보상 안내
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm font-medium text-yellow-300">
                      매주 월요일 00:00 자동 정산
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    주간 랭킹은 매주 초기화되며, TOP 10 유저에게 마일리지가 자동 지급됩니다.
                  </p>
                </div>
                
                <div className="space-y-2">
                  {RANKING_REWARDS.map((reward) => (
                    <div 
                      key={reward.rank}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-900/50 border border-gray-700"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{reward.emoji}</div>
                        <span className="font-medium text-white">
                          {reward.rank}위
                        </span>
                      </div>
                      <Badge className="bg-yellow-500/20 text-yellow-300">
                        {formatNumber(reward.reward)} 마일리지
                      </Badge>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-medium text-green-300">
                      신규 유저 부스트
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-gray-400">
                    <p>• 가입 첫 주: XP 2배 부스트</p>
                    <p>• 가입 2-4주: XP 1.5배 부스트</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}