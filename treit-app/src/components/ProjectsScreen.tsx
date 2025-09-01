import React, { useState, useEffect } from 'react';
import { Copy, Edit3, DollarSign, ExternalLink, Check, X, Sparkles, Clock, Target, TrendingUp } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import { useAuthStore } from '../lib/stores/authStore';
import { 
  getAvailableCampaigns, 
  getMyCampaigns, 
  participateInCampaign,
  generateTrackingUrl,
  type Campaign,
  type UserCampaign
} from '../lib/api/campaigns';

export default function ProjectsScreen() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [availableCampaigns, setAvailableCampaigns] = useState<Campaign[]>([]);
  const [myCampaigns, setMyCampaigns] = useState<UserCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'available' | 'participating'>('available');
  const [participatingIds, setParticipatingIds] = useState<string[]>([]);
  
  const { user } = useAuthStore();

  // 캠페인 데이터 로드
  useEffect(() => {
    if (user?.id) {
      loadCampaigns();
    }
  }, [user?.id]);

  const loadCampaigns = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const [available, participating] = await Promise.all([
        getAvailableCampaigns(user.id),
        getMyCampaigns(user.id)
      ]);
      
      setAvailableCampaigns(available);
      setMyCampaigns(participating);
      setParticipatingIds(participating.map(c => c.campaign_id));
    } catch (error) {
      console.error('Error loading campaigns:', error);
      toast.error('캠페인을 불러오는데 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  // 캠페인 참여하기
  const handleParticipate = async (campaignId: string) => {
    if (!user?.id) {
      toast.error('로그인이 필요합니다');
      return;
    }

    setParticipatingIds(prev => [...prev, campaignId]);
    
    const result = await participateInCampaign(user.id, campaignId);
    
    if (result) {
      toast.success('캠페인에 참여했습니다!');
      await loadCampaigns(); // 목록 새로고침
      setActiveTab('participating'); // 참여 중 탭으로 이동
    } else {
      setParticipatingIds(prev => prev.filter(id => id !== campaignId));
    }
  };

  // URL 복사하기
  const handleCopyUrl = (trackingCode: string) => {
    const url = generateTrackingUrl(trackingCode);
    navigator.clipboard.writeText(url);
    setCopiedId(trackingCode);
    toast.success('링크가 복사되었습니다!');
    
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  // 날짜 포맷
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // 남은 시간 계산
  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  // 등급별 색상
  const getGradeColor = (grade: string) => {
    switch(grade?.toUpperCase()) {
      case 'PLATINUM': return 'text-purple-600';
      case 'DIAMOND': return 'text-cyan-500';
      case 'GOLD': return 'text-yellow-500';
      case 'SILVER': return 'text-gray-400';
      default: return 'text-orange-600';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">💰 광고 캠페인</h1>
          <p className="text-gray-600">캠페인에 참여하고 수익을 창출하세요!</p>
          
          {/* 내 레벨 정보 */}
          {user && (
            <div className="mt-4 p-3 bg-white rounded-lg shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">내 레벨:</span>
                  <Badge className={getGradeColor(user.grade || 'BRONZE')}>
                    Lv.{user.level || 1} {user.grade || 'BRONZE'}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <TrendingUp className="w-4 h-4" />
                  <span>CPC 보너스 적용 중</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 탭 메뉴 */}
        <div className="flex gap-2 mb-4">
          <Button
            onClick={() => setActiveTab('available')}
            variant={activeTab === 'available' ? 'default' : 'outline'}
            className="flex-1"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            참여 가능 ({availableCampaigns.length})
          </Button>
          <Button
            onClick={() => setActiveTab('participating')}
            variant={activeTab === 'participating' ? 'default' : 'outline'}
            className="flex-1"
          >
            <Target className="w-4 h-4 mr-2" />
            참여 중 ({myCampaigns.length})
          </Button>
        </div>

        {/* 캠페인 목록 */}
        <div className="space-y-4">
          {activeTab === 'available' ? (
            // 참여 가능한 캠페인
            availableCampaigns.length > 0 ? (
              availableCampaigns.map((campaign) => (
                <Card key={campaign.id} className="p-4 hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-gray-900 mb-1">
                        {campaign.name}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <Badge variant="secondary">{campaign.category}</Badge>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {getDaysRemaining(campaign.end_date)}일 남음
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        ₩{campaign.effective_cpc?.toFixed(0) || campaign.cpc_rate}
                      </div>
                      <div className="text-xs text-gray-500">클릭당 수익</div>
                      {campaign.effective_cpc && campaign.effective_cpc > campaign.cpc_rate && (
                        <div className="text-xs text-green-600 mt-1">
                          +{((campaign.effective_cpc - campaign.cpc_rate) / campaign.cpc_rate * 100).toFixed(0)}% 보너스
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {campaign.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>목표: {campaign.target_clicks?.toLocaleString() || '무제한'} 클릭</span>
                      <span>잔여 예산: ₩{campaign.remaining_budget?.toLocaleString()}</span>
                    </div>
                    
                    <Button
                      onClick={() => handleParticipate(campaign.id)}
                      disabled={participatingIds.includes(campaign.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {participatingIds.includes(campaign.id) ? '참여 중...' : '참여하기'}
                    </Button>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-8 text-center">
                <p className="text-gray-500">현재 참여 가능한 캠페인이 없습니다</p>
                <p className="text-sm text-gray-400 mt-2">새로운 캠페인이 곧 등록될 예정입니다</p>
              </Card>
            )
          ) : (
            // 참여 중인 캠페인
            myCampaigns.length > 0 ? (
              myCampaigns.map((userCampaign) => (
                <Card key={userCampaign.id} className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-gray-900 mb-1">
                        {userCampaign.campaign?.name}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <Badge variant="secondary">{userCampaign.campaign?.category}</Badge>
                        <span>트래킹 코드: {userCampaign.tracking_code}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-blue-600">
                        ₩{userCampaign.total_earnings.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">총 수익</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-3 p-3 bg-gray-50 rounded">
                    <div className="text-center">
                      <div className="text-lg font-semibold">{userCampaign.total_clicks}</div>
                      <div className="text-xs text-gray-500">총 클릭</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold">₩{userCampaign.campaign?.cpc_rate}</div>
                      <div className="text-xs text-gray-500">클릭당 단가</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-green-600">활성</div>
                      <div className="text-xs text-gray-500">상태</div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleCopyUrl(userCampaign.tracking_code)}
                      variant="outline"
                      className="flex-1"
                    >
                      {copiedId === userCampaign.tracking_code ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          복사됨!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          링크 복사
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => window.open(userCampaign.campaign?.destination_url, '_blank')}
                      variant="outline"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-8 text-center">
                <p className="text-gray-500">아직 참여 중인 캠페인이 없습니다</p>
                <Button 
                  onClick={() => setActiveTab('available')}
                  className="mt-4"
                >
                  캠페인 둘러보기
                </Button>
              </Card>
            )
          )}
        </div>
      </div>
    </div>
  );
}