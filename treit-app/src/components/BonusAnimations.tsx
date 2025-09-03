import React, { useEffect, useState } from 'react';
import { Star, Sparkles, Trophy, Gift, Zap } from 'lucide-react';

interface BonusAnimationsProps {
  type: 'daily' | 'streak' | 'referral' | 'levelup' | 'achievement';
  show: boolean;
  onComplete: () => void;
  title?: string;
  amount?: number;
  streak?: number;
}

export default function BonusAnimations({ 
  type, 
  show, 
  onComplete, 
  title, 
  amount, 
  streak 
}: BonusAnimationsProps) {
  const [phase, setPhase] = useState<'appearing' | 'celebrating' | 'fading'>('appearing');
  
  useEffect(() => {
    if (show) {
      setPhase('appearing');
      
      const timer1 = setTimeout(() => setPhase('celebrating'), 500);
      const timer2 = setTimeout(() => setPhase('fading'), 2000);
      const timer3 = setTimeout(() => {
        onComplete();
        setPhase('appearing');
      }, 3000);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [show, onComplete]);

  if (!show) return null;

  const getIcon = () => {
    switch (type) {
      case 'daily':
        return <Gift size={60} className="text-yellow-400" />;
      case 'streak':
        return <Zap size={60} className="text-orange-400" />;
      case 'referral':
        return <Star size={60} className="text-purple-400" />;
      case 'levelup':
        return <Trophy size={60} className="text-gold-400" />;
      case 'achievement':
        return <Sparkles size={60} className="text-pink-400" />;
      default:
        return <Star size={60} className="text-yellow-400" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'daily':
        return { bg: 'from-yellow-400 to-orange-500', glow: 'shadow-yellow-400/50' };
      case 'streak':
        return { bg: 'from-orange-400 to-red-500', glow: 'shadow-orange-400/50' };
      case 'referral':
        return { bg: 'from-purple-400 to-pink-500', glow: 'shadow-purple-400/50' };
      case 'levelup':
        return { bg: 'from-yellow-300 to-yellow-600', glow: 'shadow-yellow-400/50' };
      case 'achievement':
        return { bg: 'from-pink-400 to-purple-500', glow: 'shadow-pink-400/50' };
      default:
        return { bg: 'from-yellow-400 to-orange-500', glow: 'shadow-yellow-400/50' };
    }
  };

  const colors = getColors();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
      {/* Background overlay with animation */}
      <div 
        className={`absolute inset-0 bg-black/40 transition-opacity duration-1000 ${
          phase === 'appearing' ? 'opacity-0' :
          phase === 'celebrating' ? 'opacity-100' :
          'opacity-0'
        }`} 
      />

      {/* Particle effects */}
      {phase === 'celebrating' && (
        <div className="absolute inset-0">
          {Array.from({ length: 30 }, (_, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                left: `${20 + Math.random() * 60}%`,
                top: `${20 + Math.random() * 60}%`,
                animation: `float ${2 + Math.random() * 3}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 2}s`
              }}
            >
              <Sparkles
                size={12 + Math.random() * 16}
                className={`${
                  type === 'daily' ? 'text-yellow-300' :
                  type === 'streak' ? 'text-orange-300' :
                  type === 'referral' ? 'text-purple-300' :
                  type === 'levelup' ? 'text-gold-300' :
                  'text-pink-300'
                } animate-pulse`}
              />
            </div>
          ))}
        </div>
      )}

      {/* Main content */}
      <div 
        className={`relative transform transition-all duration-1000 ${
          phase === 'appearing' ? 'scale-50 opacity-0 rotate-180' :
          phase === 'celebrating' ? 'scale-100 opacity-100 rotate-0' :
          'scale-150 opacity-0 rotate-0'
        }`}
      >
        {/* Glow effect */}
        <div 
          className={`absolute inset-0 bg-gradient-to-r ${colors.bg} rounded-full blur-3xl ${colors.glow} ${
            phase === 'celebrating' ? 'animate-pulse' : ''
          }`} 
        />

        {/* Main card */}
        <div className="relative bg-white rounded-3xl p-12 shadow-2xl border-4 border-white">
          {/* Icon container */}
          <div 
            className={`w-32 h-32 bg-gradient-to-br ${colors.bg} rounded-full flex items-center justify-center mx-auto mb-6 ${
              phase === 'celebrating' ? 'animate-bounce' : ''
            } ${colors.glow} shadow-2xl`}
          >
            {getIcon()}
          </div>

          {/* Title */}
          <h2 
            className={`text-3xl font-bold text-center mb-4 ${
              phase === 'celebrating' ? 'animate-pulse' : ''
            } bg-gradient-to-r ${colors.bg} bg-clip-text text-transparent`}
          >
            {title || (
              type === 'daily' ? '일일 보너스!' :
              type === 'streak' ? `${streak}일 연속 출석!` :
              type === 'referral' ? '친구 초대 성공!' :
              type === 'levelup' ? '레벨 업!' :
              '업적 달성!'
            )}
          </h2>

          {/* Amount */}
          {amount && (
            <div className="text-center">
              <div 
                className={`text-5xl font-bold mb-2 ${
                  phase === 'celebrating' ? 'animate-bounce' : ''
                } text-gray-800`}
              >
                +{amount} XP
              </div>
              {streak && streak >= 7 && (
                <div className="text-lg text-gray-600">
                  🔥 {streak}일 연속 달성!
                </div>
              )}
            </div>
          )}

          {/* Celebration message */}
          <div className="text-center text-gray-600 text-lg mt-4">
            {type === 'daily' && '매일 출석으로 더 많은 보너스를 받아보세요!'}
            {type === 'streak' && '연속 출석 보너스 획득! 내일도 잊지 마세요!'}
            {type === 'referral' && '친구와 함께 더 많은 혜택을 누려보세요!'}
            {type === 'levelup' && '새로운 레벨의 혜택을 확인해보세요!'}
            {type === 'achievement' && '새로운 업적을 달성했습니다!'}
          </div>
        </div>
      </div>

      {/* Confetti effect */}
      {phase === 'celebrating' && (
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 50 }, (_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 animate-ping"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random()}s`,
                backgroundColor: [
                  '#fbbf24', // yellow-400
                  '#f97316', // orange-500
                  '#a855f7', // purple-500
                  '#ec4899', // pink-500
                  '#ef4444', // red-500
                ][Math.floor(Math.random() * 5)]
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Add custom CSS for floating animation
const floatKeyframes = `
@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  25% { transform: translateY(-10px) rotate(5deg); }
  50% { transform: translateY(-5px) rotate(-5deg); }
  75% { transform: translateY(-15px) rotate(3deg); }
}
`;

// Inject CSS
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = floatKeyframes;
  document.head.appendChild(style);
}