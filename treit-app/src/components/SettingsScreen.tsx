import React, { useState } from 'react';
import AccountInfoScreen from './AccountInfoScreen';
import GiftShopScreen from './GiftShopScreen';
import SocialAccountManager from './SocialAccountManager';
import ReferralSystem from './ReferralSystem';
import ReferralDashboard from './ReferralDashboard';
import { 
  User, 
  Bell,
  LogOut, 
  ChevronRight, 
  CreditCard,
  Star,
  Gift,
  Building,
  Moon,
  Globe,
  HelpCircle,
  MessageSquare,
  Shield,
  Users
} from 'lucide-react';
import { Card } from './ui/card';
import { Switch } from './ui/switch';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useLevelStore } from '../lib/stores/levelStore';
import { useAuthStore } from '../lib/stores/authStore';

export default function SettingsScreen() {
  const { userLevelInfo, userStats, referralInfo } = useLevelStore();
  const { logout } = useAuthStore();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<'main' | 'account' | 'gift-shop' | 'referral'>('main');

  const userInfo = {
    name: '철수',
    email: 'chulsu@example.com',
    level: userLevelInfo.level,
    totalEarnings: userStats.totalEarnings,
    completedProjects: userStats.totalProjects,
    rating: 4.8
  };



  const handleItemClick = (item: any) => {
    if (item.id === 'bank-account' || item.id === 'tax-card') {
      setCurrentScreen('account');
    } else if (item.id === 'gift-shop') {
      setCurrentScreen('gift-shop');
    } else if (item.id === 'referral') {
      setCurrentScreen('referral');
    } else if (item.action === 'navigate') {
      // 실제 앱에서는 네비게이션 처리
    }
  };

  const handleLogout = async () => {
    if (confirm('정말 로그아웃하시겠습니까?')) {
      await logout();
    }
  };

  // Screen 라우팅
  if (currentScreen === 'account') {
    return <AccountInfoScreen onBack={() => setCurrentScreen('main')} />;
  }
  
  if (currentScreen === 'gift-shop') {
    return <GiftShopScreen onBack={() => setCurrentScreen('main')} userBalance={userInfo.totalEarnings} />;
  }

  if (currentScreen === 'referral') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white p-4 shadow-sm flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentScreen('main')}
            className="mr-3"
          >
            ←
          </Button>
          <h1 className="text-lg font-semibold">친구 초대</h1>
        </div>
        <div className="p-4 space-y-6">
          <ReferralSystem />
          <ReferralDashboard />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white p-4 shadow-sm">
        <h1 className="text-lg font-semibold">설정</h1>
      </div>

      {/* User Profile Card - Enhanced with Level System */}
      <div className="p-4">
        <Card className="p-6 mb-6 bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 shadow-lg">
          <div className="flex items-center mb-4">
            <div className={`w-16 h-16 bg-gradient-to-br ${
              userLevelInfo.grade === 'BRONZE' ? 'from-amber-400 to-amber-600' :
              userLevelInfo.grade === 'SILVER' ? 'from-gray-400 to-gray-600' :
              userLevelInfo.grade === 'GOLD' ? 'from-yellow-400 to-yellow-600' :
              userLevelInfo.grade === 'DIAMOND' ? 'from-blue-400 to-purple-600' :
              'from-purple-500 to-pink-600'
            } rounded-full flex items-center justify-center mr-4 shadow-lg border-2 border-white`}>
              <User size={32} className="text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">{userInfo.name}</h2>
              <p className="text-gray-600">{userInfo.email}</p>
              <div className="flex items-center mt-2 space-x-2">
                <Badge className={`bg-gradient-to-r ${
                  userLevelInfo.grade === 'BRONZE' ? 'from-amber-400 to-amber-600' :
                  userLevelInfo.grade === 'SILVER' ? 'from-gray-400 to-gray-600' :
                  userLevelInfo.grade === 'GOLD' ? 'from-yellow-400 to-yellow-600' :
                  userLevelInfo.grade === 'DIAMOND' ? 'from-blue-400 to-purple-600' :
                  'from-purple-500 to-pink-600'
                } text-white border-0 shadow-md font-semibold`}>
                  {userLevelInfo.gradeEmoji} Lv.{userInfo.level} {userLevelInfo.gradeName}
                </Badge>
                <div className="flex items-center">
                  <Star size={14} className="text-yellow-500 mr-1" />
                  <span className="text-sm text-gray-600">{userInfo.rating}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                ₩{userInfo.totalEarnings.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">총 수익</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">
                {userInfo.completedProjects}
              </div>
              <div className="text-sm text-gray-500">완료 프로젝트</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600">
                {userLevelInfo.totalXp.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">총 XP</div>
            </div>
          </div>
        </Card>

        {/* 알림 설정 */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-500 mb-3 px-2">
            알림
          </h3>
          <Card className="overflow-hidden">
            <div className="divide-y divide-gray-100">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center flex-1">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                    <Bell size={20} className="text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">푸시 알림</div>
                    <div className="text-sm text-gray-500">새 프로젝트 및 메시지 알림</div>
                  </div>
                </div>
                <Switch
                  checked={notifications}
                  onCheckedChange={setNotifications}
                />
              </div>
              

            </div>
          </Card>
        </div>

        {/* SNS Account Manager */}
        <SocialAccountManager />

        {/* 정산 관리 */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-500 mb-3 px-2">
            정산 관리
          </h3>
          <Card className="overflow-hidden">
            <div className="divide-y divide-gray-100">
              <div 
                className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => handleItemClick({ id: 'bank-account', title: '계좌 정보' })}
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                    <Building size={20} className="text-green-600" />
                  </div>
                  <div>
                    <div className="font-medium">계좌 정보</div>
                    <div className="text-sm text-gray-500">수익 정산용 은행계좌 등록</div>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </div>
              
              <div 
                className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => handleItemClick({ id: 'tax-card', title: '소득공제 카드' })}
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <CreditCard size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium">소득공제 카드 (3.3%)</div>
                    <div className="text-sm text-gray-500">세금계산서 발행용 카드 등록</div>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </div>
            </div>
          </Card>
        </div>

        {/* 친구 초대 */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-500 mb-3 px-2">
            친구 초대
          </h3>
          <Card className="overflow-hidden">
            <div 
              className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer"
              onClick={() => handleItemClick({ id: 'referral', title: '친구 초대' })}
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                  <Users size={20} className="text-purple-600" />
                </div>
                <div>
                  <div className="font-medium">친구 초대하기</div>
                  <div className="text-sm text-gray-500">친구 가입 시 둘 다 보너스 XP 획득</div>
                </div>
              </div>
              <div className="flex items-center">
                <div className="text-right mr-3">
                  <div className="font-semibold text-purple-600">{referralInfo.invitedFriends}명 초대</div>
                  <div className="text-xs text-gray-500">코드: {referralInfo.code}</div>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </div>
            </div>
          </Card>
        </div>

        {/* 디지털 상품권 구매샵 */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-500 mb-3 px-2">
            상품권 구매
          </h3>
          <Card className="overflow-hidden">
            <div 
              className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer"
              onClick={() => handleItemClick({ id: 'gift-shop', title: '상품권샵' })}
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                  <Gift size={20} className="text-indigo-600" />
                </div>
                <div>
                  <div className="font-medium">모바일 상품권샵</div>
                  <div className="text-sm text-gray-500">수익으로 디지털 상품권 구매</div>
                </div>
              </div>
              <div className="flex items-center">
                <div className="text-right mr-3">
                  <div className="font-semibold text-green-600">₩{userInfo.totalEarnings.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">사용 가능</div>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </div>
            </div>
          </Card>
        </div>

        {/* 앱 설정 */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-500 mb-3 px-2">
            앱 설정
          </h3>
          <Card className="overflow-hidden">
            <div className="divide-y divide-gray-100">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center flex-1">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                    <Moon size={20} className="text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">다크 모드</div>
                    <div className="text-sm text-gray-500">어두운 테마 사용</div>
                  </div>
                </div>
                <Switch
                  checked={darkMode}
                  onCheckedChange={setDarkMode}
                />
              </div>
              
              <div 
                className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => handleItemClick({ id: 'language', title: '언어' })}
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                    <Globe size={20} className="text-indigo-600" />
                  </div>
                  <div>
                    <div className="font-medium">언어</div>
                    <div className="text-sm text-gray-500">한국어</div>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </div>
            </div>
          </Card>
        </div>

        {/* 지원 */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-500 mb-3 px-2">
            지원
          </h3>
          <Card className="overflow-hidden">
            <div className="divide-y divide-gray-100">
              <div 
                className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => handleItemClick({ id: 'help', title: '도움말' })}
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                    <HelpCircle size={20} className="text-purple-600" />
                  </div>
                  <div>
                    <div className="font-medium">도움말</div>
                    <div className="text-sm text-gray-500">FAQ 및 사용 가이드</div>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </div>
              
              <div 
                className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => handleItemClick({ id: 'contact', title: '문의하기' })}
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center mr-3">
                    <MessageSquare size={20} className="text-teal-600" />
                  </div>
                  <div>
                    <div className="font-medium">문의하기</div>
                    <div className="text-sm text-gray-500">고객센터 및 피드백</div>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </div>
              
              <div 
                className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => handleItemClick({ id: 'rate', title: '앱 평가하기' })}
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center mr-3">
                    <Star size={20} className="text-pink-600" />
                  </div>
                  <div>
                    <div className="font-medium">앱 평가하기</div>
                    <div className="text-sm text-gray-500">앱스토어에서 평가 남기기</div>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </div>
              
              <div 
                className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => handleItemClick({ id: 'privacy', title: '개인정보 처리방침' })}
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                    <Shield size={20} className="text-red-600" />
                  </div>
                  <div>
                    <div className="font-medium">개인정보 처리방침</div>
                    <div className="text-sm text-gray-500">개인정보 보호 정책</div>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </div>
            </div>
          </Card>
        </div>

        {/* Logout Button */}
        <div className="mt-8 mb-20">
          <Button 
            variant="outline" 
            onClick={handleLogout}
            className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
          >
            <LogOut size={20} className="mr-2" />
            로그아웃
          </Button>
        </div>

        {/* App Version */}
        <div className="text-center text-sm text-gray-400 mb-4">
          버전 1.0.0
        </div>
      </div>
    </div>
  );
}