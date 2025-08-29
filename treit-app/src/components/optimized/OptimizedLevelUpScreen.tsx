import React, { memo, useState, useCallback, useMemo, lazy, Suspense } from 'react'
import { Star, Target, CheckCircle, Clock, Gift, Tabs } from 'lucide-react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { Progress } from '../ui/progress'
import { Badge } from '../ui/badge'
import { 
  useUserLevel, 
  useMissionProgress, 
  useXPProgress, 
  useLevelActions,
  useOptimizedLevelStore 
} from '../../lib/stores/optimizedLevelStore'
import { createXPGainRecord } from '../../lib/api/xp'
import { useOptimisticMutations, useRealTimeUpdates } from '../../hooks/useOptimizedQuery'
import { toast } from 'sonner'

// 레이지 로드된 컴포넌트들
const LazyLevelProgress = lazy(() => import('../LevelProgress'))
const LazyXPBoosterGames = lazy(() => import('../XPBoosterGames'))
const LazyAchievementTracker = lazy(() => import('../AchievementTracker'))

// 탭 타입
type TabType = 'overview' | 'missions' | 'games' | 'achievements'

// 메모이제이션된 탭 버튼 컴포넌트
const TabButton = memo<{
  tabId: TabType
  label: string
  icon: React.ReactNode
  isActive: boolean
  onClick: (tab: TabType) => void
}>(({ tabId, label, icon, isActive, onClick }) => (
  <Button
    variant={isActive ? 'default' : 'ghost'}
    size="sm"
    onClick={() => onClick(tabId)}
    className={`flex-1 ${
      isActive 
        ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black shadow-lg' 
        : 'text-gray-600 hover:text-gray-900'
    }`}
  >
    <span className="mr-2">{icon}</span>
    {label}
  </Button>
))

TabButton.displayName = 'TabButton'

// 메모이제이션된 미션 카드 컴포넌트
const MissionCard = memo<{
  mission: any
  onMissionComplete: (missionId: string) => void
  onMissionProgress: (missionId: string, progress: number) => void
}>(({ mission, onMissionComplete, onMissionProgress }) => (
  <Card 
    className={`p-4 transition-all ${
      mission.completed 
        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' 
        : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md'
    }`}
  >
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center flex-1">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
          mission.completed 
            ? 'bg-green-500 text-white' 
            : 'bg-blue-100 text-blue-600 border-2 border-blue-300'
        }`}>
          {mission.completed ? <CheckCircle size={20} /> : <Target size={20} />}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`font-semibold truncate ${mission.completed ? 'text-green-900' : 'text-gray-900'}`}>
            {mission.title}
          </h4>
          <p className={`text-sm ${mission.completed ? 'text-green-700' : 'text-gray-600'}`}>
            {mission.description}
          </p>
        </div>
      </div>
      <Badge className={mission.completed ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
        {mission.completed ? '완료!' : `+${mission.xpReward} XP`}
      </Badge>
    </div>
    
    {/* Progress bar */}
    <div className="mb-3">
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>진행도</span>
        <span>{mission.progress}/{mission.target}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${
            mission.completed 
              ? 'bg-gradient-to-r from-green-400 to-emerald-500' 
              : 'bg-gradient-to-r from-blue-400 to-blue-600'
          }`}
          style={{ width: `${Math.min((mission.progress / mission.target) * 100, 100)}%` }}
        />
      </div>
    </div>
    
    {/* Action buttons */}
    {!mission.completed && mission.progress >= mission.target && (
      <Button 
        onClick={() => onMissionComplete(mission.id)}
        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
      >
        보상 받기
      </Button>
    )}
    
    {/* Demo buttons for testing */}
    {!mission.completed && mission.progress < mission.target && (
      <div className="grid grid-cols-2 gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => onMissionProgress(mission.id, Math.min(mission.progress + 1, mission.target))}
          className="text-blue-600 border-blue-200 hover:bg-blue-50"
        >
          진행 +1
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => onMissionProgress(mission.id, mission.target)}
          className="text-green-600 border-green-200 hover:bg-green-50"
        >
          완료하기
        </Button>
      </div>
    )}
  </Card>
))

MissionCard.displayName = 'MissionCard'

// 메모이제이션된 퀵 스탯 컴포넌트
const QuickStats = memo<{
  completedMissions: number
  totalMissions: number
  cpcRate: number
}>(({ completedMissions, totalMissions, cpcRate }) => (
  <div className="grid grid-cols-2 gap-4">
    <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
      <div className="text-center">
        <div className="text-2xl font-bold text-blue-900 mb-1">
          {completedMissions}/{totalMissions}
        </div>
        <div className="text-sm text-blue-700">오늘의 미션</div>
      </div>
    </Card>
    
    <Card className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200">
      <div className="text-center">
        <div className="text-2xl font-bold text-purple-900 mb-1">
          {cpcRate}원
        </div>
        <div className="text-sm text-purple-700">미션당 CPC</div>
      </div>
    </Card>
  </div>
))

QuickStats.displayName = 'QuickStats'

// 메모이제이션된 레벨 보상 프리뷰 컴포넌트
const LevelRewardPreview = memo<{
  currentLevel: number
}>(({ currentLevel }) => {
  const nextLevelRewards = useMemo(() => {
    const rewards = []
    
    // 기본 레벨업 보상
    rewards.push({
      type: 'level',
      title: `레벨 ${currentLevel + 1} 달성`,
      reward: '+100원 보상',
      className: 'bg-white/50'
    })
    
    // 등급 승급 보상
    if (currentLevel === 5) {
      rewards.push({
        type: 'grade',
        title: '🥈 실버 등급 승급',
        reward: '+1,000원 특별보상',
        className: 'bg-gradient-to-r from-gray-100 to-slate-100 border'
      })
    } else if (currentLevel === 10) {
      rewards.push({
        type: 'grade',
        title: '🥇 골드 등급 승급',
        reward: '+3,000원 특별보상',
        className: 'bg-gradient-to-r from-yellow-100 to-amber-100 border'
      })
    } else if (currentLevel === 20) {
      rewards.push({
        type: 'grade',
        title: '💎 다이아 등급 승급',
        reward: '+8,000원 특별보상',
        className: 'bg-gradient-to-r from-blue-100 to-purple-100 border'
      })
    } else if (currentLevel === 35) {
      rewards.push({
        type: 'grade',
        title: '👑 플래티넘 등급 승급',
        reward: '+20,000원 특별보상',
        className: 'bg-gradient-to-r from-purple-100 to-pink-100 border'
      })
    }
    
    return rewards
  }, [currentLevel])

  return (
    <Card className="p-6 bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200">
      <h3 className="flex items-center font-semibold text-amber-900 mb-4">
        <Gift size={18} className="mr-2" />
        다음 레벨 보상
      </h3>
      
      <div className="space-y-3">
        {nextLevelRewards.map((reward, index) => (
          <div key={index} className={`flex justify-between items-center p-3 rounded-lg ${reward.className}`}>
            <span className={reward.type === 'grade' ? 'text-gray-800' : 'text-amber-800'}>
              {reward.title}
            </span>
            <Badge className={
              reward.type === 'grade' 
                ? reward.title.includes('실버') ? 'bg-gray-500 text-white'
                : reward.title.includes('골드') ? 'bg-yellow-500 text-white'
                : reward.title.includes('다이아') ? 'bg-blue-500 text-white'
                : 'bg-purple-500 text-white'
                : 'bg-green-100 text-green-800'
            }>
              {reward.reward}
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  )
})

LevelRewardPreview.displayName = 'LevelRewardPreview'

// 메인 최적화된 LevelUpScreen 컴포넌트
export const OptimizedLevelUpScreen = memo(() => {
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  // 선택적 구독을 통한 성능 최적화
  const userLevel = useUserLevel()
  const missionProgress = useMissionProgress()
  const xpProgress = useXPProgress()
  const { addXpToUser, updateMissionProgress } = useLevelActions()

  // 다른 상태들은 필요할 때만 가져오기
  const dailyMissions = useOptimizedLevelStore((state) => state.dailyMissions)
  
  // 실시간 업데이트 활성화
  useRealTimeUpdates()

  // 옵티미스틱 업데이트를 위한 뮤테이션
  const { completeMission: completeMissionMutation } = useOptimisticMutations()

  // 탭 변경 핸들러 (메모이제이션)
  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab)
  }, [])

  // 미션 완료 핸들러 (메모이제이션 + 옵티미스틱 업데이트)
  const handleDailyMissionComplete = useCallback(async (missionId: string) => {
    const mission = dailyMissions.find(m => m.id === missionId)
    if (!mission || mission.completed || mission.progress < mission.target) {
      toast.error('미션을 완료할 수 없습니다. 조건을 확인해주세요.')
      return
    }

    try {
      // 옵티미스틱 업데이트
      await completeMissionMutation.mutateAsync({
        missionId,
        xpGained: mission.xpReward
      })

      // 로컬 스토어 업데이트
      const xpGain = createXPGainRecord(
        'DAILY_MISSION',
        mission.xpReward,
        `데일리 미션 완료: ${mission.title}`
      )
      addXpToUser(xpGain)

      toast.success(`데일리 미션 완료! +${mission.xpReward} XP 획득!`, {
        duration: 3000
      })
    } catch (error) {
      toast.error('미션 완료 중 오류가 발생했습니다.')
    }
  }, [dailyMissions, completeMissionMutation, addXpToUser])

  // 미션 진행도 업데이트 핸들러 (메모이제이션)
  const handleMissionProgress = useCallback((missionId: string, progress: number) => {
    updateMissionProgress(missionId, progress)
  }, [updateMissionProgress])

  // 게임 완료 핸들러 (메모이제이션)
  const handleGameComplete = useCallback((gameId: string, xpEarned: number) => {
    const xpGain = createXPGainRecord(
      'MINI_GAME',
      xpEarned,
      `미니게임 완료: ${gameId}`
    )
    addXpToUser(xpGain)
    console.log(`Game ${gameId} completed, earned ${xpEarned} XP`)
  }, [addXpToUser])

  // 탭 렌더링 함수들 (메모이제이션)
  const renderOverviewTab = useMemo(() => (
    <div className="space-y-6">
      {/* Level Progress */}
      <Suspense fallback={<div className="h-32 bg-muted animate-pulse rounded-lg" />}>
        <LazyLevelProgress />
      </Suspense>

      {/* Quick Stats */}
      <QuickStats 
        completedMissions={missionProgress.completed}
        totalMissions={missionProgress.total}
        cpcRate={userLevel.cpcRate}
      />

      {/* Level Rewards Preview */}
      <LevelRewardPreview currentLevel={userLevel.level} />
    </div>
  ), [missionProgress.completed, missionProgress.total, userLevel.cpcRate, userLevel.level])

  const renderMissionsTab = useMemo(() => (
    <div className="space-y-4">
      <div className="flex items-center mb-4">
        <Target size={24} className="text-blue-600 mr-3" />
        <h3 className="text-lg font-semibold text-gray-900">데일리 미션</h3>
        <Badge variant="secondary" className="ml-auto">
          {missionProgress.completed}/{missionProgress.total} 완료
        </Badge>
      </div>
      
      <div className="space-y-3">
        {dailyMissions.map((mission) => (
          <MissionCard
            key={mission.id}
            mission={mission}
            onMissionComplete={handleDailyMissionComplete}
            onMissionProgress={handleMissionProgress}
          />
        ))}
      </div>
    </div>
  ), [dailyMissions, missionProgress.completed, missionProgress.total, handleDailyMissionComplete, handleMissionProgress])

  const renderGamesTab = useMemo(() => (
    <Suspense fallback={<div className="h-64 bg-muted animate-pulse rounded-lg" />}>
      <LazyXPBoosterGames onGameComplete={handleGameComplete} />
    </Suspense>
  ), [handleGameComplete])

  const renderAchievementsTab = useMemo(() => (
    <Suspense fallback={<div className="h-64 bg-muted animate-pulse rounded-lg" />}>
      <LazyAchievementTracker />
    </Suspense>
  ), [])

  // 로딩 상태
  if (!userLevel) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100">
        <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white p-6 rounded-b-3xl shadow-xl animate-pulse">
          <div className="h-6 bg-gray-700 rounded mx-auto mb-2 w-32"></div>
          <div className="h-4 bg-gray-700 rounded mx-auto w-48"></div>
        </div>
        <div className="p-4 -mt-4">
          <Card className="p-2 mb-6 animate-pulse">
            <div className="h-12 bg-muted rounded"></div>
          </Card>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="h-20 bg-muted rounded"></div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white p-6 rounded-b-3xl shadow-xl">
        <h1 className="text-xl font-semibold text-center mb-2">레벨링 스퀘어</h1>
        <p className="text-center text-indigo-200 text-sm">경험치를 획득하고 레벨업하여 더 높은 보상을 받아보세요</p>
      </div>

      <div className="p-4 -mt-4">
        {/* Tab Navigation */}
        <Card className="p-2 mb-6 bg-white shadow-lg">
          <div className="grid grid-cols-4 gap-1">
            <TabButton 
              tabId="overview" 
              label="개요" 
              icon={<Star size={16} />} 
              isActive={activeTab === 'overview'}
              onClick={handleTabChange}
            />
            <TabButton 
              tabId="missions" 
              label="미션" 
              icon={<Target size={16} />} 
              isActive={activeTab === 'missions'}
              onClick={handleTabChange}
            />
            <TabButton 
              tabId="games" 
              label="게임" 
              icon={<Gift size={16} />} 
              isActive={activeTab === 'games'}
              onClick={handleTabChange}
            />
            <TabButton 
              tabId="achievements" 
              label="업적" 
              icon={<CheckCircle size={16} />} 
              isActive={activeTab === 'achievements'}
              onClick={handleTabChange}
            />
          </div>
        </Card>

        {/* Tab Content */}
        <div className="mb-20">
          {activeTab === 'overview' && renderOverviewTab}
          {activeTab === 'missions' && renderMissionsTab}
          {activeTab === 'games' && renderGamesTab}
          {activeTab === 'achievements' && renderAchievementsTab}
        </div>
      </div>
    </div>
  )
})

OptimizedLevelUpScreen.displayName = 'OptimizedLevelUpScreen'