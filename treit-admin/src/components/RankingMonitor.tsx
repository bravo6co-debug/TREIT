import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import {
  Trophy,
  TrendingUp,
  Users,
  Clock,
  Award,
  AlertCircle,
  RefreshCw,
  Calendar,
  DollarSign,
  Zap
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface RankingUser {
  user_id: string;
  username: string;
  level: number;
  total_xp: number;
  rank: number;
  is_new_user: boolean;
  reward_amount?: number;
}

interface WeeklyStats {
  totalParticipants: number;
  totalXpGenerated: number;
  totalRewardsDistributed: number;
  averageXpPerUser: number;
}

export function RankingMonitor() {
  const [topRankings, setTopRankings] = useState<RankingUser[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [weekInfo, setWeekInfo] = useState({ days: 0, hours: 0 });

  useEffect(() => {
    loadRankingData();
    calculateWeekInfo();

    // 5분마다 업데이트
    const interval = setInterval(() => {
      loadRankingData();
      calculateWeekInfo();
    }, 300000);

    return () => clearInterval(interval);
  }, []);

  const calculateWeekInfo = () => {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - now.getDay() + 1);
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    const msRemaining = sunday.getTime() - now.getTime();
    const days = Math.floor(msRemaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((msRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    setWeekInfo({ days, hours });
  };

  const loadRankingData = async () => {
    setLoading(true);
    try {
      // 현재 주 시작일 계산
      const monday = new Date();
      monday.setDate(monday.getDate() - monday.getDay() + 1);
      monday.setHours(0, 0, 0, 0);
      const weekStart = monday.toISOString().split('T')[0];

      // TOP 10 랭킹 조회
      const { data: rankings, error: rankingError } = await supabase
        .from('weekly_xp_rankings')
        .select(`
          *,
          users:user_id (
            nickname,
            level
          )
        `)
        .eq('week_start', weekStart)
        .order('total_xp', { ascending: false })
        .limit(10);

      if (!rankingError && rankings) {
        const formattedRankings = rankings.map((r, index) => ({
          user_id: r.user_id,
          username: r.users?.nickname || `User${r.user_id.slice(0, 6)}`,
          level: r.users?.level || 1,
          total_xp: r.total_xp,
          rank: index + 1,
          is_new_user: r.is_new_user,
          reward_amount: getRewardByRank(index + 1)
        }));
        setTopRankings(formattedRankings);
      }

      // 주간 통계 계산
      const { data: stats, error: statsError } = await supabase
        .from('weekly_xp_rankings')
        .select('total_xp')
        .eq('week_start', weekStart);

      if (!statsError && stats) {
        const totalParticipants = stats.length;
        const totalXp = stats.reduce((sum, s) => sum + s.total_xp, 0);
        const totalRewards = 10000 + 7000 + 5000 + 3000*2 + 2000*5; // TOP 10 보상 합계

        setWeeklyStats({
          totalParticipants,
          totalXpGenerated: totalXp,
          totalRewardsDistributed: totalRewards,
          averageXpPerUser: totalParticipants > 0 ? Math.floor(totalXp / totalParticipants) : 0
        });
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load ranking data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRewardByRank = (rank: number): number => {
    if (rank === 1) return 10000;
    if (rank === 2) return 7000;
    if (rank === 3) return 5000;
    if (rank <= 5) return 3000;
    if (rank <= 10) return 2000;
    return 0;
  };

  const getRankEmoji = (rank: number): string => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    if (rank <= 5) return '🏅';
    if (rank <= 10) return '🎖️';
    return '';
  };

  const handleManualSettle = async () => {
    if (confirm('주간 정산을 수동으로 실행하시겠습니까?')) {
      try {
        const { error } = await supabase.functions.invoke('weekly-settlement');
        if (error) {
          alert('정산 실행 중 오류가 발생했습니다.');
        } else {
          alert('정산이 성공적으로 완료되었습니다.');
          loadRankingData();
        }
      } catch (error) {
        console.error('Settlement error:', error);
        alert('정산 실행 중 오류가 발생했습니다.');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">참여 유저</p>
                <p className="text-xl font-bold">
                  {weeklyStats?.totalParticipants.toLocaleString() || 0}명
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Zap className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">총 획득 XP</p>
                <p className="text-xl font-bold">
                  {weeklyStats?.totalXpGenerated.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">예정 보상</p>
                <p className="text-xl font-bold">
                  {weeklyStats?.totalRewardsDistributed.toLocaleString() || 0} M
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">남은 시간</p>
                <p className="text-xl font-bold">
                  {weekInfo.days}일 {weekInfo.hours}시간
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top 10 Rankings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              실시간 TOP 10 랭킹
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                마지막 업데이트: {lastUpdated.toLocaleTimeString()}
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={loadRankingData}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {topRankings.map((user) => (
              <div 
                key={user.user_id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{getRankEmoji(user.rank)}</div>
                  <Avatar className="w-10 h-10">
                    <AvatarFallback>{user.username[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{user.username}</span>
                      <Badge variant="outline" className="text-xs">
                        Lv.{user.level}
                      </Badge>
                      {user.is_new_user && (
                        <Badge className="bg-green-100 text-green-700 text-xs">
                          신규
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {user.total_xp.toLocaleString()} XP
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className="bg-yellow-100 text-yellow-800">
                    {user.reward_amount?.toLocaleString()} M
                  </Badge>
                  <div className="text-xs text-muted-foreground mt-1">
                    예상 보상
                  </div>
                </div>
              </div>
            ))}
          </div>

          {topRankings.length === 0 && !loading && (
            <div className="text-center py-8 text-muted-foreground">
              아직 랭킹 데이터가 없습니다.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Settlement */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>
            주간 정산은 매주 월요일 00:00에 자동으로 실행됩니다.
          </span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleManualSettle}
          >
            <Calendar className="w-4 h-4 mr-2" />
            수동 정산 실행
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}