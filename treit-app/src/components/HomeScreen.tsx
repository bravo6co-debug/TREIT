import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { toast } from 'sonner';
import { useLevelStore } from '../lib/stores/levelStore';
import { createXPGainRecord } from '../lib/api/xp';
import DailyBonus from './DailyBonus';
import AttendanceCalendar from './AttendanceCalendar';
import ReferralSystem from './ReferralSystem';
import UserStatsCard from './UserStatsCard';
import TodayMissions from './TodayMissions';
import PremiumBanner from './PremiumBanner';
import SNSAccountBanner from './SNSAccountBanner';
import CoupangBanner from './CoupangBanner';
import QuickActions from './QuickActions';
import treItLogo from 'figma:asset/4d914e156bb643f84e4345ddcffa6614b97a1685.png';

interface HomeScreenProps {
  onNavigateToPremium: () => void;
  onNavigateToSettings: () => void;
}

const HomeScreen = memo(({ onNavigateToPremium, onNavigateToSettings }: HomeScreenProps) => {
  const { 
    userLevelInfo, 
    dailyBonus, 
    claimDailyBonus, 
    addXpToUser, 
    userStats,
    getNextLevelProgress
  } = useLevelStore();

  const [missions, setMissions] = useState([
    { 
      id: 1, 
      title: '인스타그램 스토리 포스팅', 
      description: '지정된 해시태그와 함께 제품 스토리 업로드',
      completed: false, 
      xp: userLevelInfo.cpcRate, // 등급별 차등 XP
      reward: userLevelInfo.cpcRate * 75, // CPC 기반 보상
      url: 'https://instagram.com',
      platform: 'Instagram',
      icon: '📱'
    },
  ]);

  const [showDailyBonus, setShowDailyBonus] = useState(false);
  const [levelUpAnimation, setLevelUpAnimation] = useState(false);

  // Check for daily bonus on component mount
  useEffect(() => {
    const today = new Date().toDateString();
    const lastClaimDate = dailyBonus.claimDate?.toDateString();
    const shouldShowBonus = !dailyBonus.claimed && lastClaimDate !== today;
    
    if (shouldShowBonus) {
      // Show daily bonus popup after a short delay
      setTimeout(() => {
        setShowDailyBonus(true);
      }, 1000);
    }
  }, [dailyBonus]);

  // Update mission rewards based on level changes
  useEffect(() => {
    setMissions(prev => prev.map(mission => ({
      ...mission,
      xp: userLevelInfo.cpcRate,
      reward: userLevelInfo.cpcRate * 75
    })));
  }, [userLevelInfo.cpcRate]);

  const handleMissionClick = useCallback((mission: any) => {
    if (!mission.completed) {
      window.open(mission.url, '_blank');
    }
  }, []);

  const handleMissionComplete = useCallback((missionId: number) => {
    const mission = missions.find(m => m.id === missionId);
    if (mission) {
      setMissions(prev => 
        prev.map(m => 
          m.id === missionId 
            ? { ...m, completed: true }
            : m
        )
      );

      // Add XP through store
      const xpGain = createXPGainRecord(
        'MISSION',
        mission.xp,
        `미션 완료: ${mission.title}`
      );
      
      const levelUpResult = addXpToUser(xpGain);
      
      // Show mission completion toast
      toast.success(`미션 완료! +${mission.xp} XP, ₩${mission.reward.toLocaleString()} 획득!`, {
        duration: 3000,
      });

      // Show level up celebration if applicable
      if (levelUpResult) {
        setLevelUpAnimation(true);
        setTimeout(() => {
          toast.success(
            `레벨업! 레벨 ${levelUpResult.newLevel} 달성! ${
              levelUpResult.gradeChanged 
                ? `🎉 ${levelUpResult.newGrade} 등급 승급! 🎉` 
                : ''
            }`, 
            { duration: 5000 }
          );
          setLevelUpAnimation(false);
        }, 1000);
      }
    }
  }, [missions, addXpToUser]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white p-6 rounded-3xl shadow-xl border border-yellow-400/20">

        <div className="flex items-center justify-center mb-4">
          <img 
            src={treItLogo} 
            alt="Tre-it Logo" 
            className="w-12 h-12 mr-3"
          />
          <h1 className="text-3xl text-logo tracking-tight text-yellow-400">Tre-it</h1>
        </div>
      </div>

      <UserStatsCard
        userLevelInfo={userLevelInfo}
        userStats={userStats}
        dailyBonus={dailyBonus}
        levelUpAnimation={levelUpAnimation}
        getNextLevelProgress={getNextLevelProgress}
      />

      <SNSAccountBanner onNavigateToSettings={onNavigateToSettings} />

      <TodayMissions
        missions={missions}
        onMissionClick={handleMissionClick}
        onMissionComplete={handleMissionComplete}
      />

      <PremiumBanner onNavigateToPremium={onNavigateToPremium} />

      <CoupangBanner />

      <div className="px-4 mb-6">
        <AttendanceCalendar compact={false} />
      </div>

      <div className="px-4 mb-6">
        <ReferralSystem compact={true} />
      </div>

      <QuickActions />

      <DailyBonus 
        isOpen={showDailyBonus} 
        onClose={() => setShowDailyBonus(false)} 
      />
    </div>
  );
});

HomeScreen.displayName = 'HomeScreen';

export default HomeScreen;