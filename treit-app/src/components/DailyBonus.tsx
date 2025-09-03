import React, { useEffect, useState } from 'react';
import { Gift, X, Calendar, Star, Zap, Sparkles } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useLevelStore } from '../lib/stores/levelStore';
import { toast } from 'sonner';
import AttendanceCalendar from './AttendanceCalendar';
import BonusAnimations from './BonusAnimations';

interface DailyBonusProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DailyBonus({ isOpen, onClose }: DailyBonusProps) {
  const { 
    dailyBonus, 
    claimDailyBonus, 
    userLevelInfo,
    loginDates 
  } = useLevelStore();
  
  const [showAnimation, setShowAnimation] = useState(false);
  const [celebrationAnimation, setCelebrationAnimation] = useState(false);
  const [claimingBonus, setClaimingBonus] = useState(false);
  const [showBonusAnimation, setShowBonusAnimation] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowAnimation(true);
      // Play entrance sound effect (웹에서는 음성 합성 대신 시각적 효과로 대체)
      playNotificationSound();
    }
  }, [isOpen]);

  const playNotificationSound = () => {
    // Web Audio API를 사용한 간단한 효과음 생성
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1200, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
    }
  };

  const playCelebrationSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator1 = audioContext.createOscillator();
      const oscillator2 = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator1.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
      oscillator1.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.2); // E5
      oscillator1.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.4); // G5
      
      oscillator2.frequency.setValueAtTime(261.63, audioContext.currentTime); // C4
      oscillator2.frequency.setValueAtTime(329.63, audioContext.currentTime + 0.2); // E4
      oscillator2.frequency.setValueAtTime(392, audioContext.currentTime + 0.4); // G4
      
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
      
      oscillator1.start(audioContext.currentTime);
      oscillator2.start(audioContext.currentTime);
      oscillator1.stop(audioContext.currentTime + 0.6);
      oscillator2.stop(audioContext.currentTime + 0.6);
    } catch (e) {
    }
  };

  const handleClaimBonus = () => {
    setClaimingBonus(true);
    
    setTimeout(() => {
      const success = claimDailyBonus();
      
      if (success) {
        setCelebrationAnimation(true);
        playCelebrationSound();
        
        // Show the bonus animation
        setShowBonusAnimation(true);
        
        toast.success(
          `🎉 일일 출석 보너스 획득! +${dailyBonus.xpReward} XP`, 
          { 
            duration: 4000,
            className: 'animate-pulse'
          }
        );
        
        // Show celebration animation
        setTimeout(() => {
          onClose();
          setCelebrationAnimation(false);
          setClaimingBonus(false);
        }, 3000);
      } else {
        toast.error('이미 오늘의 보너스를 받으셨습니다.');
        onClose();
        setClaimingBonus(false);
      }
    }, 800);
  };

  if (!isOpen) return null;

  const todayString = new Date().toDateString();
  const lastLoginString = loginDates[loginDates.length - 1]?.toDateString();
  const isNewDay = lastLoginString !== todayString;

  return (
    <>
      <BonusAnimations 
        type={dailyBonus.streakDays >= 7 ? 'streak' : 'daily'}
        show={showBonusAnimation}
        onComplete={() => setShowBonusAnimation(false)}
        title={dailyBonus.streakDays >= 7 ? `${dailyBonus.streakDays}일 연속 출석!` : '일일 출석 보너스!'}
        amount={dailyBonus.xpReward}
        streak={dailyBonus.streakDays}
      />
      
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      {/* Celebration particles */}
      {celebrationAnimation && (
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 20 }, (_, i) => (
            <div
              key={i}
              className="absolute animate-ping"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random() * 2}s`
              }}
            >
              <Sparkles
                size={16}
                className="text-yellow-400 animate-spin"
                style={{ animationDuration: '0.5s' }}
              />
            </div>
          ))}
        </div>
      )}
      
      <div 
        className={`w-full max-w-md transform transition-all duration-500 ${
          showAnimation ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        } ${celebrationAnimation ? 'animate-bounce' : ''}`}
      >
        <Card className="p-6 bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-300 shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mr-3 shadow-lg">
                <Gift size={24} className="text-black" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-yellow-900">일일 출석</h2>
                <p className="text-sm text-yellow-700">매일 첫 접속 보너스</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-yellow-700 hover:bg-yellow-100"
            >
              <X size={20} />
            </Button>
          </div>

          {/* Current User Info */}
          <div className="mb-6 p-4 bg-white/50 rounded-lg border border-yellow-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-yellow-700">현재 레벨</span>
              <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 text-black">
                {userLevelInfo.gradeEmoji} Lv.{userLevelInfo.level} {userLevelInfo.gradeName}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-yellow-700">연속 출석</span>
              <div className="flex items-center text-yellow-800">
                <Calendar size={16} className="mr-1" />
                <span className="font-semibold">{dailyBonus.streakDays}일</span>
              </div>
            </div>
          </div>

          {/* Bonus Content */}
          <div className="text-center mb-6">
            {!dailyBonus.claimed && isNewDay ? (
              <div>
                <div className="mb-4">
                  <div className={`w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg ${
                    claimingBonus ? 'animate-spin' : 'animate-pulse'
                  }`}>
                    <Star 
                      size={40} 
                      className={`text-black ${celebrationAnimation ? 'animate-bounce' : claimingBonus ? 'animate-ping' : 'animate-spin'}`} 
                      style={{ animationDuration: celebrationAnimation ? '0.5s' : '3s' }} 
                    />
                  </div>
                  <h3 className="text-2xl font-bold text-yellow-900 mb-2">
                    +{dailyBonus.xpReward} XP
                  </h3>
                  <p className="text-yellow-700">
                    {dailyBonus.streakDays}일 연속 출석 보너스
                  </p>
                </div>

                {/* Streak Bonuses */}
                {dailyBonus.streakDays >= 7 && (
                  <div className="mb-4 p-3 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg border border-purple-200">
                    <div className="flex items-center justify-center text-purple-800 mb-1">
                      <Zap size={16} className="mr-1" />
                      <span className="font-semibold">7일 연속 보너스!</span>
                    </div>
                    <p className="text-sm text-purple-700">추가로 +100 XP 획득!</p>
                  </div>
                )}

                {dailyBonus.streakDays >= 30 && (
                  <div className="mb-4 p-3 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-lg border border-emerald-200">
                    <div className="flex items-center justify-center text-emerald-800 mb-1">
                      <Star size={16} className="mr-1" />
                      <span className="font-semibold">30일 연속 보너스!</span>
                    </div>
                    <p className="text-sm text-emerald-700">추가로 +500 XP 획득!</p>
                  </div>
                )}

                <Button
                  onClick={handleClaimBonus}
                  disabled={claimingBonus}
                  className={`w-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-black hover:from-yellow-500 hover:to-yellow-700 font-semibold py-3 text-lg shadow-lg ${
                    claimingBonus ? 'animate-pulse cursor-not-allowed opacity-75' : ''
                  } ${celebrationAnimation ? 'animate-bounce' : ''}`}
                >
                  {claimingBonus ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black mr-2"></div>
                      받는 중...
                    </>
                  ) : celebrationAnimation ? (
                    <>
                      <Sparkles size={20} className="mr-2 animate-spin" />
                      받았어요! 🎉
                    </>
                  ) : (
                    <>
                      <Gift size={20} className="mr-2" />
                      보너스 받기
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div>
                <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Gift size={32} className="text-gray-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  {dailyBonus.claimed ? '오늘 보너스를 받았습니다!' : '이미 받은 보너스입니다'}
                </h3>
                <p className="text-gray-600 mb-4">
                  내일 다시 방문해서 보너스를 받아보세요
                </p>
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  닫기
                </Button>
              </div>
            )}
          </div>

          {/* Compact Attendance Calendar */}
          <div className="mt-6">
            <AttendanceCalendar compact={true} />
          </div>
        </Card>
      </div>
    </div>
    </>
  );
}