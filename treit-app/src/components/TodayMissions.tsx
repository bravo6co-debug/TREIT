import React, { memo, useCallback } from 'react';
import { Target, CheckCircle, ArrowRight, Gift } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

interface Mission {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  xp: number;
  reward: number;
  url: string;
  platform: string;
  icon: string;
}

interface TodayMissionsProps {
  missions: Mission[];
  onMissionClick: (mission: Mission) => void;
  onMissionComplete: (missionId: number) => void;
}

const TodayMissions = memo(({ 
  missions, 
  onMissionClick, 
  onMissionComplete 
}: TodayMissionsProps) => {
  const handleMissionClick = useCallback((mission: Mission) => {
    onMissionClick(mission);
  }, [onMissionClick]);

  const handleMissionComplete = useCallback((missionId: number) => {
    onMissionComplete(missionId);
  }, [onMissionComplete]);

  return (
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
            <div key={mission.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start flex-1">
                  <div className="text-2xl mr-3 mt-1">{mission.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center mb-1">
                      <h4 className={`font-semibold ${mission.completed ? 'line-through text-gray-500' : ''}`}>
                        {mission.title}
                      </h4>
                      {mission.completed && (
                        <CheckCircle size={16} className="text-green-500 ml-2" />
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
                      onClick={() => handleMissionClick(mission)}
                      className="flex-1 bg-gradient-to-r from-emerald-400 to-teal-500 text-white py-3 px-4 rounded-lg text-sm font-medium hover:from-emerald-500 hover:to-teal-600 hover:shadow-lg hover:shadow-emerald-400/30 transition-all duration-200 flex items-center justify-center shadow-md min-h-[44px]"
                    >
                      <span className="mr-2">시작하기</span>
                      <ArrowRight size={14} />
                    </button>
                    <button
                      onClick={() => handleMissionComplete(mission.id)}
                      className="bg-white border-2 border-yellow-400 text-yellow-600 py-3 px-4 rounded-lg text-sm font-medium hover:bg-yellow-50 hover:border-yellow-500 hover:text-yellow-700 transition-all duration-200 flex items-center shadow-md min-h-[44px]"
                    >
                      <CheckCircle size={14} className="mr-1" />
                      완료
                    </button>
                  </>
                ) : (
                  <div className="flex-1 bg-gradient-to-r from-yellow-50 to-amber-50 text-yellow-700 py-3 px-4 rounded-lg text-sm font-medium text-center flex items-center justify-center border border-yellow-200 min-h-[44px]">
                    <Gift size={14} className="mr-2 text-yellow-600" />
                    완료됨 - 보상 지급완료
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
});

TodayMissions.displayName = 'TodayMissions';

export default TodayMissions;