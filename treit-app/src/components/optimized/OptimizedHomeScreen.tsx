import React, { memo, useMemo, useCallback, useState, lazy, Suspense } from 'react'
import { User, Target, CheckCircle, FileText, Zap, Star, ShoppingCart, ExternalLink, ArrowRight, Gift, Shield, Settings, ChevronRight, Calendar } from 'lucide-react'
import { Card } from '../ui/card'
import { Progress } from '../ui/progress'
import { Badge } from '../ui/badge'
import { ImageWithFallback } from '../figma/ImageWithFallback'
import { toast } from 'sonner'
import { createXPGainRecord } from '../../lib/api/xp'
import { 
  useUserLevel, 
  useMissionProgress, 
  useXPProgress, 
  useLevelActions,
  useOptimizedLevelStore 
} from '../../lib/stores/optimizedLevelStore'
import { useOptimizedQuery, useRealTimeUpdates, useOptimisticMutations } from '../../hooks/useOptimizedQuery'
import { queryKeys } from '../../lib/query-client'
import treItLogo from 'figma:asset/4d914e156bb643f84e4345ddcffa6614b97a1685.png'

// 레이지 로드된 컴포넌트들
const LazyDailyBonus = lazy(() => import('../DailyBonus'))
const LazyLevelProgress = lazy(() => import('../LevelProgress'))
const LazyAttendanceCalendar = lazy(() => import('../AttendanceCalendar'))
const LazyReferralSystem = lazy(() => import('../ReferralSystem'))

// 타입 정의
interface Mission {
  id: number
  title: string
  description: string
  completed: boolean
  xp: number
  reward: number
  url: string
  platform: string
  icon: string
}

interface OptimizedHomeScreenProps {
  onNavigateToPremium: () => void
  onNavigateToSettings: () => void
}

// 메모이제이션된 미션 카드 컴포넌트
const MissionCard = memo<{
  mission: Mission
  onMissionClick: (mission: Mission) => void
  onMissionComplete: (missionId: number) => void
}>(({ mission, onMissionClick, onMissionComplete }) => (
  <div className="border border-gray-200 rounded-lg p-4">
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-start flex-1">
        <div className="text-2xl mr-3 mt-1">{mission.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center mb-1">
            <h4 className={`font-semibold truncate ${mission.completed ? 'line-through text-gray-500' : ''}`}>
              {mission.title}
            </h4>
            {mission.completed && (
              <CheckCircle size={16} className="text-green-500 ml-2 flex-shrink-0" />
            )}
          </div>
          <p className="text-sm text-gray-600 mb-2">{mission.description}</p>
          <div className="flex items-center text-xs text-gray-500">
            <Badge variant="secondary" className="mr-2">
              {mission.platform}
            </Badge>
            <span>+{mission.xp} XP</span>
            <span className="mx-1">•</span>
            <span className="text-green-600 font-semibold">₩{mission.reward.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
    
    <div className="flex gap-2">
      {!mission.completed ? (
        <>
          <button
            onClick={() => onMissionClick(mission)}
            className="flex-1 bg-gradient-to-r from-emerald-400 to-teal-500 text-white py-2 px-4 rounded-lg text-sm font-medium hover:from-emerald-500 hover:to-teal-600 hover:shadow-lg hover:shadow-emerald-400/30 transition-all duration-200 flex items-center justify-center shadow-md"
          >
            <span className="mr-2">시작하기</span>
            <ArrowRight size={14} />
          </button>
          <button
            onClick={() => onMissionComplete(mission.id)}
            className="bg-white border-2 border-yellow-400 text-yellow-600 py-2 px-4 rounded-lg text-sm font-medium hover:bg-yellow-50 hover:border-yellow-500 hover:text-yellow-700 transition-all duration-200 flex items-center shadow-md"
          >
            <CheckCircle size={14} className="mr-1" />
            완료
          </button>
        </>
      ) : (
        <div className="flex-1 bg-gradient-to-r from-yellow-50 to-amber-50 text-yellow-700 py-2 px-4 rounded-lg text-sm font-medium text-center flex items-center justify-center border border-yellow-200">
          <Gift size={14} className="mr-2 text-yellow-600" />
          완료됨 - 보상 지급완료
        </div>
      )}
    </div>
  </div>
))

MissionCard.displayName = 'MissionCard'

// 메모이제이션된 사용자 통계 카드 컴포넌트
const UserStatsCard = memo<{
  userLevel: ReturnType<typeof useUserLevel>
  xpProgress: ReturnType<typeof useXPProgress>
  dailyBonus: any
  levelUpAnimation: boolean
  userStats: any
}>(({ userLevel, xpProgress, dailyBonus, levelUpAnimation, userStats }) => (
  <Card className={`p-6 bg-gradient-to-br from-white to-slate-50 shadow-xl border-2 ${
    levelUpAnimation ? 'animate-pulse border-yellow-400 shadow-yellow-400/50' : 'border-gray-200'
  }`}>
    <div className="flex items-center mb-4">
      <div className={`w-16 h-16 bg-gradient-to-br ${
        userLevel.grade === 'BRONZE' ? 'from-amber-400 to-amber-600' :
        userLevel.grade === 'SILVER' ? 'from-gray-400 to-gray-600' :
        userLevel.grade === 'GOLD' ? 'from-yellow-400 to-yellow-600' :
        userLevel.grade === 'DIAMOND' ? 'from-blue-400 to-purple-600' :
        'from-purple-500 to-pink-600'
      } rounded-full flex items-center justify-center mr-4 shadow-lg border-2 ${
        userLevel.grade === 'BRONZE' ? 'border-amber-300' :
        userLevel.grade === 'SILVER' ? 'border-gray-300' :
        userLevel.grade === 'GOLD' ? 'border-yellow-300' :
        userLevel.grade === 'DIAMOND' ? 'border-blue-300' :
        'border-purple-300'
      } ${levelUpAnimation ? 'animate-bounce' : ''}`}>
        <User size={32} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl text-heading text-slate-800 truncate">철수</h2>
          <div className="flex items-center flex-shrink-0">
            <Calendar size={16} className="text-gray-500 mr-1" />
            <span className="text-sm text-gray-600">{dailyBonus.streakDays}일 연속</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={`bg-gradient-to-r ${
            userLevel.grade === 'BRONZE' ? 'from-amber-400 to-amber-600' :
            userLevel.grade === 'SILVER' ? 'from-gray-400 to-gray-600' :
            userLevel.grade === 'GOLD' ? 'from-yellow-400 to-yellow-600' :
            userLevel.grade === 'DIAMOND' ? 'from-blue-400 to-purple-600' :
            'from-purple-500 to-pink-600'
          } text-white border-0 shadow-md font-semibold`}>
            Lv.{userLevel.level} {userLevel.gradeName}
          </Badge>
          <Badge className="bg-green-100 text-green-800 border-green-200">
            CPC {userLevel.cpcRate}원
          </Badge>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="text-center p-3 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
        <div className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
          ₩{userStats.totalEarnings.toLocaleString()}
        </div>
        <div className="text-slate-600 text-sm">총 수익</div>
      </div>
      <div className="text-center p-3 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
        <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          {xpProgress.totalXp.toLocaleString()}
        </div>
        <div className="text-slate-600 text-sm">총 XP</div>
      </div>
      <div className="text-center p-3 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200">
        <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          {userStats.totalProjects}
        </div>
        <div className="text-slate-600 text-sm">완료 프로젝트</div>
      </div>
    </div>

    <div className="mb-4">
      <div className="flex justify-between text-sm mb-2 text-gray-600">
        <span>{xpProgress.currentXp} XP</span>
        <span>{xpProgress.nextLevelXp || '최고'} XP</span>
      </div>
      <div className="relative">
        <Progress value={xpProgress.progress} className="h-3" />
        {levelUpAnimation && (
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-yellow-600 opacity-50 animate-ping rounded-full"></div>
        )}
      </div>
      <div className="text-center text-gray-600 text-sm mt-2">
        {xpProgress.nextLevelXp > 0 
          ? `다음 레벨까지 ${xpProgress.nextLevelXp - xpProgress.currentXp} XP`
          : '최고 레벨 달성!'
        }
      </div>
    </div>
  </Card>
))

UserStatsCard.displayName = 'UserStatsCard'

// 메인 최적화된 HomeScreen 컴포넌트
export const OptimizedHomeScreen = memo<OptimizedHomeScreenProps>(({ onNavigateToPremium, onNavigateToSettings }) => {
  const [showDailyBonus, setShowDailyBonus] = useState(false)
  const [levelUpAnimation, setLevelUpAnimation] = useState(false)

  // 선택적 구독을 통한 성능 최적화
  const userLevel = useUserLevel()
  const missionProgress = useMissionProgress()
  const xpProgress = useXPProgress()
  const { addXpToUser, completeMission } = useLevelActions()
  
  // 다른 상태들은 필요할 때만 가져오기
  const dailyBonus = useOptimizedLevelStore((state) => state.dailyBonus)
  const userStats = useOptimizedLevelStore((state) => state.userStats)

  // 실시간 업데이트 활성화
  useRealTimeUpdates()

  // 옵티미스틱 업데이트를 위한 뮤테이션
  const { completeMission: completeMissionMutation } = useOptimisticMutations()

  // 미션 데이터 (메모이제이션)
  const missions = useMemo<Mission[]>(() => [
    { 
      id: 1, 
      title: '인스타그램 스토리 포스팅', 
      description: '지정된 해시태그와 함께 제품 스토리 업로드',
      completed: false, 
      xp: userLevel.cpcRate,
      reward: userLevel.cpcRate * 75,
      url: 'https://instagram.com',
      platform: 'Instagram',
      icon: '📱'
    },
  ], [userLevel.cpcRate])

  // 미션 클릭 핸들러 (메모이제이션)
  const handleMissionClick = useCallback((mission: Mission) => {
    if (!mission.completed) {
      window.open(mission.url, '_blank')
    }
  }, [])

  // 미션 완료 핸들러 (메모이제이션 + 옵티미스틱 업데이트)
  const handleMissionComplete = useCallback(async (missionId: number) => {
    const mission = missions.find(m => m.id === missionId)
    if (!mission || mission.completed) return

    try {
      // 옵티미스틱 업데이트로 즉시 UI 반영
      await completeMissionMutation.mutateAsync({
        missionId: missionId.toString(),
        xpGained: mission.xp
      })

      // XP 추가 (로컬 상태)
      const xpGain = createXPGainRecord(
        'MISSION',
        mission.xp,
        `미션 완료: ${mission.title}`
      )
      
      const levelUpResult = addXpToUser(xpGain)
      
      // 성공 토스트
      toast.success(`미션 완료! +${mission.xp} XP, ₩${mission.reward.toLocaleString()} 획득!`, {
        duration: 3000,
      })

      // 레벨업 애니메이션 및 토스트
      if (levelUpResult) {
        setLevelUpAnimation(true)
        setTimeout(() => {
          toast.success(
            `레벨업! 레벨 ${levelUpResult.newLevel} 달성! ${
              levelUpResult.gradeChanged 
                ? `🎉 ${levelUpResult.newGrade} 등급 승급! 🎉` 
                : ''
            }`, 
            { duration: 5000 }
          )
          setLevelUpAnimation(false)
        }, 1000)
      }
    } catch (error) {
      toast.error('미션 완료 중 오류가 발생했습니다.')
    }
  }, [missions, completeMissionMutation, addXpToUser])

  // 쿠팡 쇼핑 배너 클릭 핸들러 (메모이제이션)
  const handleCoupangClick = useCallback(() => {
    window.open('https://www.coupang.com', '_blank')
  }, [])

  // 로딩 스켈레톤
  if (!userLevel) {
    return (
      <div className="min-h-screen">
        <div className="bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white p-6 rounded-3xl shadow-xl border border-yellow-400/20 animate-pulse">
          <div className="h-12 bg-gray-700 rounded mx-auto mb-4 w-32"></div>
        </div>
        <div className="px-4 pt-4 mb-6">
          <Card className="p-6 animate-pulse">
            <div className="h-20 bg-muted rounded mb-4"></div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded"></div>
              ))}
            </div>
            <div className="h-4 bg-muted rounded"></div>
          </Card>
        </div>
      </div>
    )
  }

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

      {/* User Stats Card - Enhanced with Level System */}
      <div className="px-4 pt-4 mb-6">
        <UserStatsCard 
          userLevel={userLevel}
          xpProgress={xpProgress}
          dailyBonus={dailyBonus}
          levelUpAnimation={levelUpAnimation}
          userStats={userStats}
        />
      </div>

      {/* SNS Account Registration Info Banner */}
      <div className="px-4 mb-6">
        <Card 
          className="p-4 bg-gradient-to-br from-white to-slate-50 shadow-lg border border-yellow-200 hover:shadow-xl hover:border-yellow-300 transition-all duration-300 cursor-pointer"
          onClick={onNavigateToSettings}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center flex-1">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center mr-3 shadow-lg border border-yellow-300">
                <Shield size={24} className="text-gray-900" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-subheading text-slate-800 mb-1">SNS 계정 등록</h3>
                <p className="text-sm text-slate-600">크로스 체크 및 어뷰징 방지를 위한 계정 등록이 필요합니다</p>
                <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-gray-900 border-0 shadow-md font-semibold text-xs mt-2">
                  인증 필수
                </Badge>
              </div>
            </div>
            <div className="flex items-center">
              <ChevronRight size={20} className="text-gray-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Today's Missions */}
      <div className="px-4 mb-6">
        <Card className="p-6 bg-gradient-to-br from-white to-slate-50 shadow-xl border-0">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center mr-3 shadow-lg border border-yellow-300">
              <Target size={24} className="text-gray-900" />
            </div>
            <h3 className="text-lg text-heading text-slate-800">오늘의 미션</h3>
          </div>

          <div className="space-y-4">
            {missions.map((mission) => (
              <MissionCard
                key={mission.id}
                mission={mission}
                onMissionClick={handleMissionClick}
                onMissionComplete={handleMissionComplete}
              />
            ))}
          </div>
        </Card>
      </div>

      {/* Premium Projects Banner */}
      <div className="px-4 mb-6">
        <Card 
          className="p-4 bg-gradient-to-r from-gray-900 via-black to-gray-800 text-white cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] border-2 border-yellow-400/30 shadow-lg hover:border-yellow-400/50"
          onClick={onNavigateToPremium}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <Zap size={20} className="mr-2 text-yellow-400" />
                <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 font-semibold border-0 shadow-md">
                  PREMIUM
                </Badge>
              </div>
              <h3 className="text-lg font-semibold mb-1">프리미엄 프로젝트</h3>
              <p className="text-gray-300 text-sm">최대 3배 높은 수익의 특별 미션</p>
              <div className="flex items-center mt-2 text-yellow-400">
                <Star size={14} className="mr-1" />
                <span className="text-xs">보너스 XP 추가 지급</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-yellow-400">₩2,500</div>
              <div className="text-xs text-gray-400">최대 수익</div>
            </div>
          </div>
        </Card>
      </div>

      {/* 쿠팡 쇼핑 배너 */}
      <div className="px-4 mb-6">
        <Card 
          className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02]"
          onClick={handleCoupangClick}
        >
          <div className="relative">
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1664455340023-214c33a9d0bd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvbmxpbmUlMjBzaG9wcGluZyUyMHBhY2thZ2VzJTIwZGVsaXZlcnl8ZW58MXx8fHwxNzU2Mzc0NDU3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
              alt="쿠팡 쇼핑"
              className="w-full h-32 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-600/90 to-slate-800/90 flex items-center">
              <div className="flex-1 p-4 text-white">
                <div className="flex items-center mb-2">
                  <ShoppingCart size={20} className="mr-2" />
                  <Badge className="bg-orange-500 text-white font-semibold">
                    쿠팡
                  </Badge>
                </div>
                <h3 className="text-lg font-semibold mb-1">쿠팡 쇼핑</h3>
                <p className="text-slate-100 text-sm mb-2">최대 적립금 구매금액의 2.2%</p>
                <div className="flex items-center text-orange-300">
                  <Star size={14} className="mr-1" />
                  <span className="text-xs">로켓 배송으로 빠른 배송</span>
                </div>
              </div>
              <div className="p-4 text-right text-white">
                <div className="text-2xl font-bold">2.2%</div>
                <div className="text-xs text-slate-200">최대 적립</div>
                <ExternalLink size={16} className="mt-2 ml-auto" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Lazy Loaded Components */}
      <div className="px-4 mb-6">
        <Suspense fallback={<div className="h-32 bg-muted animate-pulse rounded-lg" />}>
          <LazyAttendanceCalendar compact={false} />
        </Suspense>
      </div>

      <div className="px-4 mb-6">
        <Suspense fallback={<div className="h-24 bg-muted animate-pulse rounded-lg" />}>
          <LazyReferralSystem compact={true} />
        </Suspense>
      </div>

      {/* Quick Actions */}
      <div className="px-4 mb-20">
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-6 text-center bg-gradient-to-br from-white to-slate-50 shadow-lg border border-yellow-200 hover:shadow-xl hover:border-yellow-300 transition-all duration-300 cursor-pointer">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg border border-yellow-300">
              <FileText size={32} className="text-gray-900" />
            </div>
            <h4 className="font-semibold text-slate-800">프로젝트</h4>
          </Card>
          <Card className="p-6 text-center bg-gradient-to-br from-white to-slate-50 shadow-lg border border-gray-200 hover:shadow-xl hover:border-yellow-300 transition-all duration-300 cursor-pointer">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-700 to-gray-900 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg border border-gray-600">
              <Target size={32} className="text-white" />
            </div>
            <h4 className="font-semibold text-slate-800">레벨링 스퀘어</h4>
          </Card>
        </div>
      </div>

      {/* Daily Bonus Modal */}
      <Suspense fallback={null}>
        <LazyDailyBonus 
          isOpen={showDailyBonus} 
          onClose={() => setShowDailyBonus(false)} 
        />
      </Suspense>
    </div>
  )
})

OptimizedHomeScreen.displayName = 'OptimizedHomeScreen'