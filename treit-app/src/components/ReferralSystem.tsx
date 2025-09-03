import React, { useState } from 'react';
import { Users, Share, Copy, Gift, Star, UserPlus, Check, MessageCircle, Camera, Instagram } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { useLevelStore } from '../lib/stores/levelStore';
import { toast } from 'sonner';

interface ReferralSystemProps {
  compact?: boolean;
}

export default function ReferralSystem({ compact = false }: ReferralSystemProps) {
  const { referralInfo, userStats } = useLevelStore();
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(referralInfo.code);
      setCopied(true);
      toast.success('초대 코드가 클립보드에 복사되었습니다!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('클립보드 복사에 실패했습니다.');
    }
  };

  const shareText = `🚀 Treit에서 함께 부업을 시작해요! 

💰 SNS 포스팅만으로 수익 창출!
🎁 내 초대코드: ${referralInfo.code}

✨ 가입 시 둘 다 보너스 XP를 받을 수 있어요!
📱 지금 바로 시작: https://treit.app/invite/${referralInfo.code}

#부업 #SNS수익 #TreitApp`;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Treit 초대 - 함께 부업을 시작해요!',
        text: shareText,
        url: `https://treit.app/invite/${referralInfo.code}`
      });
    } else {
      // Fallback to copying to clipboard
      navigator.clipboard.writeText(shareText);
      toast.success('초대 메시지가 클립보드에 복사되었습니다!');
    }
  };

  const handleKakaoShare = () => {
    // 카카오톡 공유 (카카오 SDK 없이 URL 스킴 사용)
    const kakaoUrl = `https://story.kakao.com/share?url=${encodeURIComponent(`https://treit.app/invite/${referralInfo.code}`)}&text=${encodeURIComponent(shareText)}`;
    
    try {
      // 모바일에서 카카오톡 앱으로 직접 공유
      if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        window.location.href = `kakaolink://send?msg=${encodeURIComponent(shareText)}&url=${encodeURIComponent(`https://treit.app/invite/${referralInfo.code}`)}`;
      } else {
        // 데스크톱에서는 클립보드 복사 후 카카오톡 웹 열기
        navigator.clipboard.writeText(shareText);
        window.open('https://web.whatsapp.com/', '_blank');
        toast.success('메시지가 복사되었습니다! 카카오톡에서 붙여넣기 해주세요.');
      }
    } catch (error) {
      // 실패 시 클립보드 복사
      navigator.clipboard.writeText(shareText);
      toast.success('메시지가 복사되었습니다! 카카오톡에서 붙여넣기 해주세요.');
    }
  };

  const handleInstagramShare = () => {
    // 인스타그램 공유 (스토리 공유용 텍스트)
    const instagramText = `🚀 Treit에서 함께 부업을 시작해요!

💰 SNS 포스팅으로 수익 창출
🎁 초대코드: ${referralInfo.code}
✨ 가입 시 보너스 XP 지급!

링크: treit.app/invite/${referralInfo.code}

#부업 #SNS수익 #TreitApp #부업추천`;

    try {
      if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        // 모바일에서 인스타그램 앱으로 공유 시도
        const instagramUrl = `instagram://story-camera`;
        window.location.href = instagramUrl;
        
        // 클립보드에 텍스트 복사
        navigator.clipboard.writeText(instagramText);
        toast.success('인스타그램이 열렸습니다! 텍스트가 복사되어 스토리에 붙여넣기 할 수 있어요.');
      } else {
        // 데스크톱에서는 클립보드 복사 후 인스타그램 웹 열기
        navigator.clipboard.writeText(instagramText);
        window.open('https://www.instagram.com/', '_blank');
        toast.success('메시지가 복사되었습니다! 인스타그램에서 스토리에 올려주세요.');
      }
    } catch (error) {
      navigator.clipboard.writeText(instagramText);
      toast.success('메시지가 복사되었습니다! 인스타그램 스토리에 올려주세요.');
    }
  };

  const monthlyLimit = 1500; // REFERRAL_XP.MONTHLY_LIMIT
  const monthlyProgress = (referralInfo.monthlyXpEarned / monthlyLimit) * 100;

  if (compact) {
    return (
      <Card className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <Users size={20} className="text-purple-600 mr-2" />
            <span className="font-semibold text-purple-900">친구 초대</span>
          </div>
          <Badge className="bg-purple-100 text-purple-800">
            {referralInfo.invitedFriends}명 초대
          </Badge>
        </div>
        
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopyCode}
            className="flex-1 text-purple-700 border-purple-200 hover:bg-purple-50"
          >
            <Copy size={14} className="mr-1" />
            {referralInfo.code}
          </Button>
          <Button
            size="sm"
            onClick={handleKakaoShare}
            className="bg-yellow-400 hover:bg-yellow-500 text-black"
            title="카카오톡 공유"
          >
            <MessageCircle size={14} />
          </Button>
          <Button
            size="sm"
            onClick={handleInstagramShare}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
            title="인스타그램 공유"
          >
            <Camera size={14} />
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <div className="flex items-center mb-6">
        <Users size={24} className="text-purple-600 mr-3" />
        <h3 className="text-lg font-semibold text-purple-900">친구 초대 시스템</h3>
      </div>

      {/* Referral Stats */}
      <Card className="p-6 mb-6 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-4 bg-white/50 rounded-lg">
            <div className="text-2xl font-bold text-purple-900 mb-1">{referralInfo.invitedFriends}</div>
            <div className="text-sm text-purple-700">초대한 친구</div>
          </div>
          <div className="text-center p-4 bg-white/50 rounded-lg">
            <div className="text-2xl font-bold text-purple-900 mb-1">{referralInfo.monthlyXpEarned}</div>
            <div className="text-sm text-purple-700">이번달 XP</div>
          </div>
        </div>

        {/* Monthly Limit Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-purple-700 mb-2">
            <span>월간 한도</span>
            <span>{referralInfo.monthlyXpEarned} / {monthlyLimit} XP</span>
          </div>
          <Progress value={monthlyProgress} className="h-2" />
          <p className="text-xs text-purple-600 mt-1">
            월 최대 5명까지 초대 보너스를 받을 수 있습니다
          </p>
        </div>
      </Card>

      {/* Referral Code Card */}
      <Card className="p-6 mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
        <div className="text-center mb-4">
          <h4 className="text-lg font-semibold text-blue-900 mb-2">내 초대 코드</h4>
          <div className="bg-white p-4 rounded-lg border-2 border-dashed border-blue-300 mb-4">
            <div className="text-3xl font-bold text-blue-900 tracking-wider">
              {referralInfo.code}
            </div>
          </div>
          
          <div className="space-y-3">
            <Button
              onClick={handleCopyCode}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white"
              disabled={copied}
            >
              {copied ? (
                <>
                  <Check size={16} className="mr-2" />
                  복사됨!
                </>
              ) : (
                <>
                  <Copy size={16} className="mr-2" />
                  코드 복사
                </>
              )}
            </Button>
            
            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={handleKakaoShare}
                className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold"
              >
                <MessageCircle size={16} className="mr-1" />
                카카오톡
              </Button>
              <Button
                onClick={handleInstagramShare}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold"
              >
                <Camera size={16} className="mr-1" />
                인스타
              </Button>
              <Button
                onClick={handleShare}
                variant="outline"
                className="border-blue-300 text-blue-700 hover:bg-blue-50 font-semibold"
              >
                <Share size={16} className="mr-1" />
                기타
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Referral Benefits */}
      <Card className="p-6 mb-6 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
        <h4 className="flex items-center font-semibold text-green-900 mb-4">
          <Gift size={18} className="mr-2" />
          초대 혜택
        </h4>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-white/50 rounded-lg">
            <div className="flex items-center">
              <UserPlus size={16} className="text-green-600 mr-2" />
              <span className="text-green-800">친구가 가입할 때</span>
            </div>
            <Badge className="bg-green-100 text-green-800">+200 XP</Badge>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-white/50 rounded-lg">
            <div className="flex items-center">
              <Star size={16} className="text-green-600 mr-2" />
              <span className="text-green-800">친구가 첫 미션 완료시</span>
            </div>
            <Badge className="bg-green-100 text-green-800">+100 XP</Badge>
          </div>
          
          <div className="p-3 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-lg border border-yellow-200">
            <div className="text-center">
              <h5 className="font-semibold text-orange-900 mb-1">특별 혜택</h5>
              <p className="text-sm text-orange-800">
                초대받은 친구도 가입 시 <span className="font-semibold">+200 XP</span> 보너스!
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Invited Friends List (if any) */}
      {referralInfo.invitedFriends > 0 && (
        <Card className="p-6 bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-4">
            초대한 친구들 ({referralInfo.invitedFriends}명)
          </h4>
          
          {/* Mock data - replace with actual friends list */}
          <div className="space-y-2">
            {Array.from({ length: Math.min(referralInfo.invitedFriends, 3) }, (_, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                    <Users size={16} className="text-gray-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">친구 {i + 1}</div>
                    <div className="text-xs text-gray-500">
                      {i === 0 ? '활발히 활동중' : i === 1 ? '미션 진행중' : '가입 완료'}
                    </div>
                  </div>
                </div>
                <Badge variant={i === 0 ? 'default' : 'secondary'}>
                  {i === 0 ? '+300 XP' : i === 1 ? '+200 XP' : '+200 XP'}
                </Badge>
              </div>
            ))}
            
            {referralInfo.invitedFriends > 3 && (
              <div className="text-center text-sm text-gray-500 mt-3">
                +{referralInfo.invitedFriends - 3}명 더
              </div>
            )}
          </div>
        </Card>
      )}

      {/* No referrals yet */}
      {referralInfo.invitedFriends === 0 && (
        <Card className="p-8 text-center bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200">
          <Users size={48} className="text-gray-300 mx-auto mb-3" />
          <h4 className="text-lg font-semibold text-gray-600 mb-2">
            아직 초대한 친구가 없습니다
          </h4>
          <p className="text-gray-500 mb-4">
            친구들을 초대해서 함께 XP 보너스를 받아보세요!
          </p>
          <Button
            onClick={handleShare}
            className="bg-purple-500 hover:bg-purple-600 text-white"
          >
            <Share size={16} className="mr-2" />
            지금 친구 초대하기
          </Button>
        </Card>
      )}
    </div>
  );
}