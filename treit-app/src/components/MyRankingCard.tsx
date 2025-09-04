import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  Trophy, 
  TrendingUp, 
  ChevronRight, 
  Zap,
  Clock,
  Award
} from 'lucide-react';
import {
  fetchMyRanking,
  getCurrentWeekInfo,
  getRankEmoji,
  type MyRanking,
  type WeekInfo
} from '../lib/api/rankings';

interface MyRankingCardProps {
  userId?: string;
  onViewFullRanking: () => void;
  compact?: boolean;
}

export default function MyRankingCard({ 
  userId = 'current-user-id', 
  onViewFullRanking,
  compact = false 
}: MyRankingCardProps) {
  const [myRanking, setMyRanking] = useState<MyRanking | null>(null);
  const [weekInfo, setWeekInfo] = useState<WeekInfo>(getCurrentWeekInfo());
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadMyRanking();
    
    // 5분마다 업데이트
    const interval = setInterval(loadMyRanking, 300000);
    
    // 주 정보 업데이트 (1시간마다)
    const weekInterval = setInterval(() => {
      setWeekInfo(getCurrentWeekInfo());
    }, 3600000);
    
    return () => {
      clearInterval(interval);
      clearInterval(weekInterval);
    };
  }, [userId]);
  
  const loadMyRanking = async () => {
    try {
      const data = await fetchMyRanking(userId);
      setMyRanking(data);
    } catch (error) {
      console.error('Failed to load my ranking:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const formatNumber = (num: number): string => {
    return num.toLocaleString('ko-KR');
  };
  
  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-yellow-600/20 to-orange-600/20 border-yellow-500/30">
        <CardContent className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-700 rounded w-1/3 mb-3"></div>
            <div className="h-8 bg-gray-700 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!myRanking) {
    return (
      <Card 
        className="bg-gradient-to-br from-gray-700/20 to-gray-800/20 border-gray-600/30 cursor-pointer hover:border-yellow-500/50 transition-all"
        onClick={onViewFullRanking}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-700/50 rounded-lg">
                <Trophy className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">주간 XP 랭킹</p>
                <p className="font-medium text-white">랭킹 참여하기</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (compact) {
    // 컴팩트 버전 (레벨업 화면용)
    return (
      <Card 
        className="bg-gradient-to-br from-yellow-600/20 to-orange-600/20 border-yellow-500/30 cursor-pointer hover:border-yellow-400/50 transition-all"
        onClick={onViewFullRanking}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-600/30 rounded-lg">
                <Trophy className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm text-yellow-300">주간 XP 랭킹</p>
                  {myRanking.is_new_user && (
                    <Badge className="bg-green-500/20 text-green-300 text-xs px-1 py-0">
                      <Zap className="w-3 h-3" />
                      {myRanking.boost_multiplier}x
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-white">
                    #{myRanking.rank}위
                  </span>
                  <span className="text-sm text-gray-400">
                    ({formatNumber(myRanking.total_xp)} XP)
                  </span>
                  {getRankEmoji(myRanking.rank) && (
                    <span className="text-lg">{getRankEmoji(myRanking.rank)}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              {myRanking.rank <= 10 && (
                <Badge className="bg-yellow-500/20 text-yellow-300 text-xs">
                  <Award className="w-3 h-3 mr-1" />
                  보상 대상
                </Badge>
              )}
              <ChevronRight className="w-5 h-5 text-yellow-400" />
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-yellow-500/20 flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              <span>{weekInfo.days_remaining}일 {weekInfo.hours_remaining}시간 남음</span>
            </div>
            <div className="text-xs text-yellow-300">
              상위 {100 - myRanking.percentile}%
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // 풀 버전
  return (
    <Card className="bg-gradient-to-br from-yellow-600/20 to-orange-600/20 border-yellow-500/30">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-400" />
            <h3 className="text-lg font-bold text-white">주간 XP 랭킹</h3>
          </div>
          <Badge className="bg-yellow-500/20 text-yellow-300">
            {weekInfo.days_remaining}일 {weekInfo.hours_remaining}시간 남음
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-3 bg-black/30 rounded-lg">
            <div className="text-3xl font-bold text-yellow-400 mb-1">
              #{myRanking.rank}
            </div>
            <div className="text-sm text-gray-400">현재 순위</div>
            {getRankEmoji(myRanking.rank) && (
              <div className="text-2xl mt-1">{getRankEmoji(myRanking.rank)}</div>
            )}
          </div>
          
          <div className="text-center p-3 bg-black/30 rounded-lg">
            <div className="text-2xl font-bold text-white mb-1">
              {formatNumber(myRanking.total_xp)}
            </div>
            <div className="text-sm text-gray-400">획득 XP</div>
            {myRanking.is_new_user && (
              <Badge className="bg-green-500/20 text-green-300 text-xs mt-1">
                <Zap className="w-3 h-3 mr-1" />
                {myRanking.boost_multiplier}x 부스트
              </Badge>
            )}
          </div>
        </div>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">상위 퍼센트</span>
            <span className="font-medium text-yellow-300">
              상위 {100 - myRanking.percentile}%
            </span>
          </div>
          
          {myRanking.rank <= 10 && (
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm text-yellow-300">보상 대상</span>
                </div>
                <span className="text-sm font-bold text-yellow-400">
                  TOP 10
                </span>
              </div>
            </div>
          )}
        </div>
        
        <Button 
          className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
          onClick={onViewFullRanking}
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          전체 랭킹 보기
        </Button>
      </CardContent>
    </Card>
  );
}