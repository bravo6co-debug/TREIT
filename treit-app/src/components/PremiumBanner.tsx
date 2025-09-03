import React, { memo } from 'react';
import { Zap, Star } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

interface PremiumBannerProps {
  onNavigateToPremium: () => void;
}

const PremiumBanner = memo(({ onNavigateToPremium }: PremiumBannerProps) => {
  return (
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
  );
});

PremiumBanner.displayName = 'PremiumBanner';

export default PremiumBanner;