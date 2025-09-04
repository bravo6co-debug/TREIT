import React, { memo } from 'react';
import { Shield, ChevronRight } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

interface SNSAccountBannerProps {
  onNavigateToSettings: () => void;
}

const SNSAccountBanner = memo(({ onNavigateToSettings }: SNSAccountBannerProps) => {
  return (
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
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-subheading text-slate-800">SNS 계정 등록</h3>
                <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-gray-900 border-0 shadow-md font-semibold text-xs">
                  인증 필수
                </Badge>
              </div>
              <p className="text-sm text-slate-600">크로스 체크 및 어뷰징 방지를 위한 계정 등록이 필요합니다</p>
            </div>
          </div>
          <div className="flex items-center">
            <ChevronRight size={20} className="text-gray-400" />
          </div>
        </div>
      </Card>
    </div>
  );
});

SNSAccountBanner.displayName = 'SNSAccountBanner';

export default SNSAccountBanner;