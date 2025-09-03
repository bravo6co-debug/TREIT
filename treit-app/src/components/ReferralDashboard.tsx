import React, { useState, useEffect } from 'react';
import { 
  Users, 
  TrendingUp, 
  Calendar, 
  Gift, 
  Star, 
  Trophy, 
  Target,
  ArrowUp,
  ArrowDown,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { useLevelStore } from '../lib/stores/levelStore';

interface ReferralStats {
  totalReferrals: number;
  monthlyReferrals: number;
  monthlyXpEarned: number;
  monthlyLimit: number;
  pendingInvites: number;
  recentReferrals: Array<{
    id: string;
    username: string;
    reward: number;
    xp: number;
    date: string;
    status: 'completed' | 'pending' | 'failed';
  }>;
  monthlyTrend: number; // percentage change from last month
}

export default function ReferralDashboard() {
  const { referralInfo } = useLevelStore();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Mock data for demonstration
  useEffect(() => {
    const mockStats: ReferralStats = {
      totalReferrals: referralInfo.invitedFriends || 0,
      monthlyReferrals: Math.min(referralInfo.invitedFriends, 5),
      monthlyXpEarned: referralInfo.monthlyXpEarned || 0,
      monthlyLimit: 1500,
      pendingInvites: 2,
      recentReferrals: [
        {
          id: '1',
          username: '김민수',
          reward: 300,
          xp: 300,
          date: '2024-01-15',
          status: 'completed'
        },
        {
          id: '2', 
          username: '이지은',
          reward: 200,
          xp: 200,
          date: '2024-01-14',
          status: 'completed'
        },
        {
          id: '3',
          username: '박준영',
          reward: 0,
          xp: 0,
          date: '2024-01-13',
          status: 'pending'
        }
      ],
      monthlyTrend: 25 // 25% increase from last month
    };

    setTimeout(() => {
      setStats(mockStats);
      setLoading(false);
    }, 1000);
  }, [referralInfo]);

  if (loading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-6">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-4 w-1/2"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const monthlyProgress = (stats.monthlyXpEarned / stats.monthlyLimit) * 100;
  const remainingInvites = Math.max(0, 5 - stats.monthlyReferrals);

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-blue-600">{stats.totalReferrals}</div>
              <div className="text-sm text-blue-700">총 초대</div>
            </div>
            <Users size={24} className="text-blue-500" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-green-600">{stats.monthlyReferrals}</div>
              <div className="text-sm text-green-700">이번 달</div>
            </div>
            <div className="flex items-center">
              <Calendar size={24} className="text-green-500" />
              {stats.monthlyTrend > 0 && (
                <div className="ml-1 flex items-center text-xs text-green-600">
                  <ArrowUp size={12} />
                  {stats.monthlyTrend}%
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-purple-600">{stats.monthlyXpEarned}</div>
              <div className="text-sm text-purple-700">월 XP</div>
            </div>
            <Star size={24} className="text-purple-500" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-orange-50 to-yellow-50 border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-orange-600">{stats.pendingInvites}</div>
              <div className="text-sm text-orange-700">대기 중</div>
            </div>
            <Clock size={24} className="text-orange-500" />
          </div>
        </Card>
      </div>

      {/* Monthly Progress */}
      <Card className="p-6 bg-gradient-to-br from-white to-gray-50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">월간 한도 진행률</h3>
          <Badge className={`${
            monthlyProgress >= 100 ? 'bg-red-100 text-red-800' :
            monthlyProgress >= 80 ? 'bg-orange-100 text-orange-800' :
            'bg-green-100 text-green-800'
          }`}>
            {remainingInvites}명 남음
          </Badge>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between text-sm text-gray-600">
            <span>XP 획득</span>
            <span>{stats.monthlyXpEarned} / {stats.monthlyLimit} XP</span>
          </div>
          <Progress 
            value={monthlyProgress} 
            className="h-3"
          />
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">
              {stats.monthlyReferrals}/5명 초대 완료
            </span>
            <span className={`${
              monthlyProgress >= 100 ? 'text-red-600' :
              monthlyProgress >= 80 ? 'text-orange-600' :
              'text-green-600'
            }`}>
              {monthlyProgress.toFixed(1)}%
            </span>
          </div>
        </div>

        {monthlyProgress >= 80 && (
          <div className="mt-4 p-3 bg-gradient-to-r from-orange-100 to-red-100 rounded-lg border border-orange-200">
            <div className="flex items-center text-orange-800">
              <Target size={16} className="mr-2" />
              <span className="text-sm font-medium">
                {monthlyProgress >= 100 
                  ? '이번 달 한도를 모두 사용했습니다!'
                  : '월간 한도에 근접했습니다. 계획적으로 사용하세요.'
                }
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Achievement Milestones */}
      <Card className="p-6 bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Trophy size={20} className="mr-2 text-yellow-600" />
          초대 마일스톤
        </h3>
        
        <div className="space-y-3">
          {[
            { milestone: 1, reward: '200 XP', completed: stats.totalReferrals >= 1 },
            { milestone: 5, reward: '500 XP + 특별 뱃지', completed: stats.totalReferrals >= 5 },
            { milestone: 10, reward: '1000 XP + 프리미엄 혜택', completed: stats.totalReferrals >= 10 },
            { milestone: 25, reward: '2500 XP + VIP 등급', completed: stats.totalReferrals >= 25 }
          ].map((item, index) => (
            <div 
              key={index}
              className={`flex items-center justify-between p-3 rounded-lg ${
                item.completed 
                  ? 'bg-green-100 border border-green-200' 
                  : 'bg-white border border-gray-200'
              }`}
            >
              <div className="flex items-center">
                {item.completed ? (
                  <CheckCircle size={20} className="text-green-600 mr-3" />
                ) : (
                  <div className="w-5 h-5 border-2 border-gray-300 rounded-full mr-3"></div>
                )}
                <div>
                  <div className={`font-medium ${
                    item.completed ? 'text-green-800' : 'text-gray-700'
                  }`}>
                    {item.milestone}명 초대 달성
                  </div>
                  <div className="text-sm text-gray-500">{item.reward}</div>
                </div>
              </div>
              <div className={`text-sm font-semibold ${
                item.completed ? 'text-green-600' : 'text-gray-400'
              }`}>
                {stats.totalReferrals}/{item.milestone}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent Referrals */}
      <Card className="p-6 bg-gradient-to-br from-white to-gray-50">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">최근 초대 현황</h3>
        
        {stats.recentReferrals.length > 0 ? (
          <div className="space-y-3">
            {stats.recentReferrals.map((referral) => (
              <div 
                key={referral.id}
                className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center mr-3">
                    <Users size={20} className="text-white" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{referral.username}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(referral.date).toLocaleDateString('ko-KR')}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  {referral.status === 'completed' && (
                    <div className="text-right">
                      <div className="font-semibold text-green-600">
                        +{referral.xp} XP
                      </div>
                      <div className="text-sm text-gray-500">
                        ₩{referral.reward.toLocaleString()}
                      </div>
                    </div>
                  )}
                  
                  <Badge className={
                    referral.status === 'completed' ? 'bg-green-100 text-green-800' :
                    referral.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }>
                    {referral.status === 'completed' ? '완료' :
                     referral.status === 'pending' ? '대기중' : '실패'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users size={48} className="text-gray-300 mx-auto mb-3" />
            <h4 className="text-lg font-semibold text-gray-500 mb-2">
              아직 초대 기록이 없습니다
            </h4>
            <p className="text-gray-400">
              친구들을 초대해서 함께 보너스를 받아보세요!
            </p>
          </div>
        )}
      </Card>

      {/* Tips and Tricks */}
      <Card className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200">
        <h3 className="text-lg font-semibold text-indigo-900 mb-4 flex items-center">
          <TrendingUp size={20} className="mr-2" />
          초대 팁
        </h3>
        
        <div className="space-y-3 text-sm">
          <div className="flex items-start">
            <div className="w-2 h-2 bg-indigo-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
            <div className="text-indigo-800">
              <strong>개인적인 메시지:</strong> 친구들에게 개인적으로 메시지를 보내는 것이 가장 효과적입니다.
            </div>
          </div>
          <div className="flex items-start">
            <div className="w-2 h-2 bg-indigo-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
            <div className="text-indigo-800">
              <strong>혜택 강조:</strong> 가입 시 받을 수 있는 보너스 XP를 강조하여 설명하세요.
            </div>
          </div>
          <div className="flex items-start">
            <div className="w-2 h-2 bg-indigo-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
            <div className="text-indigo-800">
              <strong>월간 한도:</strong> 매월 최대 5명까지만 초대 보너스를 받을 수 있으니 계획적으로 사용하세요.
            </div>
          </div>
          <div className="flex items-start">
            <div className="w-2 h-2 bg-indigo-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
            <div className="text-indigo-800">
              <strong>적극적인 참여:</strong> 초대한 친구가 첫 미션을 완료하면 추가 보너스를 받을 수 있습니다.
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}